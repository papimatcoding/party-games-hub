-- PATINAZO / 31. Fixed-power low-friction physics, resolved only in PostgreSQL.
-- World: circumradius 1; spawn at 0.66 of its assigned vertex.
-- Identical launch speed 0.96 for every player and heading; viscous drag 0.88/s;
-- equal-mass collision impulse with restitution 0.86 and a small knockback bonus.
-- 96 simulation steps × 0.04 s. Client receives only a finalized replay.
create function private.ice_simulate(p_match_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare
  m private.ice_matches%rowtype;
  ids uuid[]; corners integer[]; angles double precision[];
  px double precision[]:='{}'; py double precision[]:='{}';
  vx double precision[]:='{}'; vy double precision[]:='{}';
  active boolean[]:='{}';
  players_count integer; i integer; j integer; step_no integer;
  base_angle double precision; vertex_angle double precision; friction double precision;
  dx double precision; dy double precision; dist double precision;
  nx double precision; ny double precision; penetration double precision;
  closing double precision; impulse double precision;
  frame_players jsonb; frames jsonb:='[]'::jsonb;
begin
  select * into m from private.ice_matches where id=p_match_id for update;
  if not found or m.phase<>'planning' then return; end if;
  select array_agg(p.user_id order by p.corner_index),
         array_agg(p.corner_index order by p.corner_index),
         array_agg(s.angle::double precision order by p.corner_index)
   into ids,corners,angles
  from private.ice_players p
  left join private.ice_moves s
    on s.match_id=p.match_id and s.user_id=p.user_id and s.round_no=m.round_no
  where p.match_id=m.id and p.alive;
  players_count:=coalesce(array_length(ids,1),0);
  if players_count=0 then
    update private.ice_matches set replay='[]'::jsonb where id=m.id;
    return;
  end if;
  base_angle:=case when m.sides=4 then pi()/4 else -pi()/2 end;
  friction:=exp(-0.88*0.04);
  for i in 1..players_count loop
    vertex_angle:=base_angle+corners[i]*2*pi()/m.sides;
    px:=array_append(px,0.66*cos(vertex_angle));
    py:=array_append(py,0.66*sin(vertex_angle));
    active:=array_append(active,angles[i] is not null);
    vx:=array_append(vx,case when angles[i] is not null then 0.96*cos(angles[i]) else 0 end);
    vy:=array_append(vy,case when angles[i] is not null then 0.96*sin(angles[i]) else 0 end);
  end loop;

  for step_no in 0..96 loop
    if step_no>0 then
      for i in 1..players_count loop
        if active[i] then
          px[i]:=px[i]+vx[i]*0.04;
          py[i]:=py[i]+vy[i]*0.04;
          vx[i]:=vx[i]*friction;
          vy[i]:=vy[i]*friction;
        end if;
      end loop;

      -- Fixed-size avatar discs, equal mass, symmetric collision response.
      for i in 1..players_count loop
        if not active[i] then continue; end if;
        for j in i+1..players_count loop
          if not active[j] then continue; end if;
          dx:=px[j]-px[i]; dy:=py[j]-py[i];
          dist:=sqrt(dx*dx+dy*dy);
          if dist>=0.148 then continue; end if;
          if dist<0.000001 then
            nx:=cos((i+j)*2*pi()/17);ny:=sin((i+j)*2*pi()/17); dist:=0;
          else
            nx:=dx/dist;ny:=dy/dist;
          end if;
          penetration:=(0.148-dist)/2;
          px[i]:=px[i]-nx*penetration;py[i]:=py[i]-ny*penetration;
          px[j]:=px[j]+nx*penetration;py[j]:=py[j]+ny*penetration;
          closing:=(vx[i]-vx[j])*nx+(vy[i]-vy[j])*ny;
          if closing>0 then
            impulse:=((1+0.86)*closing)/2+0.12;
            vx[i]:=vx[i]-impulse*nx;
            vy[i]:=vy[i]-impulse*ny;
            vx[j]:=vx[j]+impulse*nx;
            vy[j]:=vy[j]+impulse*ny;
          end if;
        end loop;
      end loop;
      -- Judge against exact polygon edges, accounting for player radius.
      for i in 1..players_count loop
        if active[i] and not private.ice_inside(px[i],py[i],m.sides) then
          active[i]:=false;
          update private.ice_players
            set alive=false,eliminated_round=m.round_no
            where match_id=m.id and user_id=ids[i] and alive;
        end if;
      end loop;
    end if;

    -- 49 timestamped frames for smooth deterministic browser interpolation.
    if mod(step_no,2)=0 then
      frame_players:='[]'::jsonb;
      for i in 1..players_count loop
        frame_players:=frame_players||jsonb_build_array(jsonb_build_object(
          'user_id',ids[i],'x',round(px[i]::numeric,5),'y',round(py[i]::numeric,5),
          'alive',active[i]
        ));
      end loop;
      frames:=frames||jsonb_build_array(jsonb_build_object(
        't',round((step_no*0.04)::numeric,2),'players',frame_players
      ));
    end if;
  end loop;

  -- No submission: eliminated, no artificial default aim.
  update private.ice_players p
     set alive=false,eliminated_round=m.round_no
   where p.match_id=m.id and p.alive
     and not exists(
       select 1 from private.ice_moves s
       where s.match_id=p.match_id and s.user_id=p.user_id and s.round_no=m.round_no
     );
  update private.ice_matches
     set replay=frames,updated_at=now()
   where id=m.id;
end;
$fn$;
revoke all on function private.ice_simulate(uuid) from public,anon,authenticated;

create function private.ice_tick(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare room public.rooms%rowtype; m private.ice_matches%rowtype;
        alive_count integer; submissions integer; winner uuid;
begin
  select * into room from public.rooms where id=p_room_id for update;
  if not found or room.status<>'playing' or room.game_id<>'patinazo' then return; end if;
  select * into m from private.ice_matches where room_id=p_room_id for update;
  if not found or m.phase='finished' then return; end if;
  if m.phase='planning' then
    select count(*) into alive_count
     from private.ice_players where match_id=m.id and alive;
    select count(*) into submissions
     from private.ice_moves s
     join private.ice_players p on p.match_id=s.match_id and p.user_id=s.user_id
     where s.match_id=m.id and s.round_no=m.round_no and p.alive;
    if now()<m.deadline and submissions<alive_count then return; end if;

    perform private.ice_simulate(m.id);
    select count(*) into alive_count
      from private.ice_players where match_id=m.id and alive;
    select user_id into winner
      from private.ice_players where match_id=m.id and alive order by user_id limit 1;
    update private.ice_matches set phase='reveal',revealed_at=now(),
      deadline=now()+interval '6 seconds',
      terminal=(alive_count<=1 or m.round_no>=10),
      winner_id=case when alive_count=1 then winner else null end,
      updated_at=now()
    where id=m.id;
    update public.rooms set updated_at=now() where id=p_room_id;
  elsif m.phase='reveal' and now()>=m.deadline then
    if m.terminal then
      update private.ice_matches set phase='finished',updated_at=now() where id=m.id;
    else
      update private.ice_matches set phase='planning',round_no=m.round_no+1,
        replay=null,revealed_at=null,deadline=now()+interval '18 seconds',
        updated_at=now() where id=m.id;
    end if;
    update public.rooms set updated_at=now() where id=p_room_id;
  end if;
end;
$fn$;
revoke all on function private.ice_tick(uuid) from public,anon,authenticated;
