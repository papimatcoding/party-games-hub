-- PARTY / 45: proper chronological placement for Pong and valid winner UUID
-- for Lasers (PostgreSQL does not implement min(uuid)).
-- Atomic server-side deadline/reveal engine. Callers never decide who dies.
create or replace function private.laser_tick(p_room_id uuid)
returns void language plpgsql security definer set search_path = ''
as $fn$
declare
  v_room public.rooms%rowtype;
  v_match private.laser_matches%rowtype;
  v_alive integer;
  v_submitted integer;
  v_winner uuid;
begin
  select * into v_room from public.rooms where id=p_room_id for update;
  if not found or v_room.status<>'playing' or v_room.game_id<>'lasers' then return; end if;
  select * into v_match from private.laser_matches where room_id=p_room_id for update;
  if not found or v_match.phase='finished' then return; end if;

  if v_match.phase='planning' then
    select count(*) into v_alive from private.laser_players
      where match_id=v_match.id and alive;
    select count(*) into v_submitted from private.laser_moves m
      join private.laser_players p on p.match_id=m.match_id and p.user_id=m.user_id
      where m.match_id=v_match.id and m.round_no=v_match.round_no and p.alive;
    if now()<v_match.deadline and v_submitted<v_alive then return; end if;

    -- No placement before deadline = eliminated. Never fabricate a shot.
    update private.laser_players p
       set alive=false,killed_round=v_match.round_no
     where p.match_id=v_match.id and p.alive
       and not exists(
          select 1 from private.laser_moves m
          where m.match_id=p.match_id and m.user_id=p.user_id and m.round_no=v_match.round_no
       );

    -- Materialize all victims from the SAME pre-update snapshot:
    -- a player who is shot can still eliminate someone in this round.
    with victims as materialized (
      select distinct target.user_id
        from private.laser_players shooter
        join private.laser_moves shot
          on shot.match_id=shooter.match_id and shot.user_id=shooter.user_id
         and shot.round_no=v_match.round_no
        join private.laser_players target
          on target.match_id=shooter.match_id
         and target.user_id<>shooter.user_id and target.alive
        join private.laser_moves placement
          on placement.match_id=target.match_id and placement.user_id=target.user_id
         and placement.round_no=v_match.round_no
       where shooter.match_id=v_match.id and shooter.alive
         and private.laser_hits(shot.x,shot.y,shot.angle,placement.x,placement.y)
    )
    update private.laser_players p
       set alive=false,killed_round=v_match.round_no
     where p.match_id=v_match.id and p.alive
       and p.user_id in (select user_id from victims);

    select count(*) into v_alive
      from private.laser_players where match_id=v_match.id and alive;
    select user_id into v_winner
      from private.laser_players where match_id=v_match.id and alive
      order by user_id limit 1;

    if v_alive<=1 or v_match.round_no>=9 then
      update private.laser_matches
      set phase='finished',winner_id=case when v_alive=1 then v_winner else null end,
          deadline=now(),updated_at=now()
      where id=v_match.id;
    else
      update private.laser_matches
      set phase='reveal',deadline=now()+interval '6 seconds',updated_at=now()
      where id=v_match.id;
    end if;
    update public.rooms set updated_at=now() where id=p_room_id;
  elsif v_match.phase='reveal' and now()>=v_match.deadline then
    update private.laser_matches
       set phase='planning',round_no=v_match.round_no+1,
           radius=greatest(0.40::numeric,1.0::numeric-0.15::numeric*floor(v_match.round_no/2.0)),
           deadline=now()+interval '25 seconds',updated_at=now()
     where id=v_match.id;
    update public.rooms set updated_at=now() where id=p_room_id;
  end if;
end;
$fn$;
revoke all on function private.laser_tick(uuid) from public,anon,authenticated;
create or replace function private.pong_step(p_match_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare
 m private.pong_matches%rowtype;
 ids uuid[]; sides integer[]; paddles double precision[]; targets double precision[]; alive_flags boolean[];
 n integer; i integer; edge integer; j integer;
 elapsed double precision; dt double precision; iterations integer; ix integer;
 px double precision; py double precision; vx double precision; vy double precision;
 speed double precision; bounces integer;
 phi double precision; theta double precision; nx double precision; ny double precision;
 tx double precision; ty double precision; apothem double precision; half_side double precision;
 half_paddle double precision; center_span double precision; u_rate double precision;
 signed_distance double precision; penetration double precision; worst double precision;
 collision_edge integer; impact_t double precision; projected double precision;
 contact_offset double precision; tangent_component double precision; inward double precision;
 norm double precision; who integer; survivors integer; winner uuid;
begin
 select * into m from private.pong_matches where id=p_match_id for update;
 if not found or m.phase='finished' then return; end if;
 select array_agg(user_id order by side_index),
        array_agg(side_index order by side_index),
        array_agg(paddle_u order by side_index),
        array_agg(target_u order by side_index),
        array_agg(alive order by side_index)
 into ids,sides,paddles,targets,alive_flags
 from private.pong_players where match_id=m.id;
 n:=coalesce(array_length(ids,1),0);
 if n=0 then return; end if;

 elapsed:=least(.34,greatest(0,extract(epoch from clock_timestamp()-m.last_tick)));
 if elapsed<.002 then return; end if;
 iterations:=greatest(1,ceil(elapsed/.012)::integer);
 dt:=elapsed/iterations;
 theta:=case when m.sides=4 then pi()/4 else -pi()/2 end;
 apothem:=cos(pi()/m.sides);
 half_side:=sin(pi()/m.sides);
 half_paddle:=half_side*m.paddle_ratio;
 center_span:=half_side-half_paddle;
 -- Real paddle speed is identical across all arenas (world units/s).
 u_rate:=1.04/(2*center_span);

 px:=m.ball_x;py:=m.ball_y;vx:=m.ball_vx;vy:=m.ball_vy;
 speed:=m.ball_speed;bounces:=m.bounce_count;
 for ix in 1..iterations loop
   for i in 1..n loop
     if alive_flags[i] then
       -- The paddle moves at the same world-space speed in either direction.
       paddles[i]:=least(1,greatest(0,
         paddles[i]+least(u_rate*dt,greatest(-u_rate*dt,targets[i]-paddles[i]))
       ));
     end if;
   end loop;
   if m.phase='serve' or clock_timestamp()<m.serve_until then continue; end if;
   px:=px+vx*dt;py:=py+vy*dt;
   -- Deepest-edge collision is deterministic for near-corner contacts.
   collision_edge:=-1;worst:=0;
   for edge in 0..m.sides-1 loop
     phi:=theta+(edge+0.5)*2*pi()/m.sides;
     signed_distance:=px*cos(phi)+py*sin(phi);
     penetration:=signed_distance-(apothem-m.ball_radius);
     if penetration>worst then
       worst:=penetration;collision_edge:=edge;
     end if;
   end loop;
   if collision_edge<0 then continue;end if;
   phi:=theta+(collision_edge+0.5)*2*pi()/m.sides;
   nx:=cos(phi);ny:=sin(phi);
   tx:=sin(phi);ty:=-cos(phi);
   projected:=vx*nx+vy*ny;
   -- Snap the ball to the actual polygon collision plane.
   px:=px-(worst+.0002)*nx;py:=py-(worst+.0002)*ny;
   if projected<=0 then continue;end if;
   who:=0;
   for i in 1..n loop
     if sides[i]=collision_edge and alive_flags[i] then
       who:=i;exit;
     end if;
   end loop;
   if who>0 then
     impact_t:=px*tx+py*ty;
     contact_offset:=(paddles[who]-.5)*2*center_span;
     if abs(impact_t-contact_offset)>half_paddle+m.ball_radius*.7 then
       -- Failed return: the former opening immediately becomes a solid wall.
       alive_flags[who]:=false;
       update private.pong_players set alive=false,
          eliminated_order=(select elimination_count+1 from private.pong_matches where id=m.id)
       where match_id=m.id and user_id=ids[who];
       update private.pong_matches set
         elimination_count=elimination_count+1,
         last_eliminated_name=(
           select display_name from private.pong_players
           where match_id=m.id and user_id=ids[who]
         )
       where id=m.id;
       select count(*) into survivors
       from private.pong_players where match_id=m.id and alive;
       select user_id into winner from private.pong_players
       where match_id=m.id and alive order by user_id limit 1;
       for i in 1..n loop
         update private.pong_players set paddle_u=paddles[i]
         where match_id=m.id and user_id=ids[i];
       end loop;
       if survivors<=1 then
         update private.pong_matches set
          phase='finished',ball_x=px,ball_y=py,
          ball_vx=0,ball_vy=0,
          winner_id=case when survivors=1 then winner else null end,
          last_tick=clock_timestamp(),updated_at=now() where id=m.id;
       else
         perform private.pong_serve(m.id,1.6);
       end if;
       return;
     end if;
     -- Where the ball lands on a paddle changes its angle, not its basic speed.
     contact_offset:=greatest(-1,least(1,
       (impact_t-contact_offset)/half_paddle));
     tangent_component:=(vx*tx+vy*ty)/greatest(.001,speed);
     vx:=-nx*(0.96-abs(contact_offset)*.22)
        +tx*(contact_offset*.52+tangent_component*.22);
     vy:=-ny*(0.96-abs(contact_offset)*.22)
        +ty*(contact_offset*.52+tangent_component*.22);
   else
     -- Inactive/unused side: perfectly solid bouncing wall.
     vx:=vx-2*projected*nx;
     vy:=vy-2*projected*ny;
   end if;
   bounces:=bounces+1;
   speed:=least(1.38,0.66+bounces*.030);
   norm:=greatest(.000001,sqrt(vx*vx+vy*vy));
   vx:=vx/norm*speed;vy:=vy/norm*speed;
 end loop;

 for i in 1..n loop
   update private.pong_players set paddle_u=paddles[i]
   where match_id=m.id and user_id=ids[i];
 end loop;
 update private.pong_matches set ball_x=px,ball_y=py,
   ball_vx=vx,ball_vy=vy,ball_speed=speed,bounce_count=bounces,
   phase=case when phase='serve' and clock_timestamp()>=serve_until then 'live' else phase end,
   last_tick=clock_timestamp(),updated_at=now()
 where id=m.id;
end;
$fn$;

revoke all on function private.pong_step(uuid) from public,anon,authenticated;
