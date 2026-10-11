-- PARTY HUB / 56: a waiting game must not advance or accept secret actions.
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
  if not private.game_is_live(p_room_id) then return;end if;
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

create or replace function private.nr_tick(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare v_room public.rooms%rowtype; v_match private.nr_matches%rowtype;
        v_alive integer; v_submitted integer; v_winner uuid;
begin
  if not private.game_is_live(p_room_id) then return;end if;
 select * into v_room from public.rooms where id=p_room_id for update;
 if not found or v_room.status<>'playing' or v_room.game_id<>'no_repitas' then return; end if;
 select * into v_match from private.nr_matches where room_id=p_room_id for update;
 if not found or v_match.phase='finished' then return; end if;

 if v_match.phase='writing' then
   select count(*) into v_alive from private.nr_players
     where match_id=v_match.id and alive;
   select count(*) into v_submitted
     from private.nr_responses r
     join private.nr_players p on p.match_id=r.match_id and p.user_id=r.user_id
     where r.match_id=v_match.id and r.round_no=v_match.round_no and p.alive;
   if now()<v_match.deadline and v_submitted<v_alive then return; end if;

   -- Only after the submission window closes, resolve aliases and validate.
   update private.nr_responses r
      set entry_id=private.nr_resolve_key(v_match.topic_id,r.answer_key)
    where r.match_id=v_match.id and r.round_no=v_match.round_no;

   update private.nr_responses r set verdict=
      case
        when exists(
          select 1 from private.nr_responses old
          where old.match_id=r.match_id and old.round_no<r.round_no
            and (old.answer_key=r.answer_key or
                 (r.entry_id is not null and old.entry_id=r.entry_id))
        ) then 'reused'
        when exists(
          select 1 from private.nr_responses other
          where other.match_id=r.match_id and other.round_no=r.round_no
            and other.user_id<>r.user_id
            and (other.answer_key=r.answer_key or
                 (r.entry_id is not null and other.entry_id=r.entry_id))
        ) then 'duplicate'
        when r.entry_id is null then 'invalid'
        else 'valid'
      end
    where r.match_id=v_match.id and r.round_no=v_match.round_no;

   update private.nr_players p
      set alive=false, eliminated_round=v_match.round_no
    where p.match_id=v_match.id and p.alive
      and not exists(
        select 1 from private.nr_responses r
        where r.match_id=p.match_id and r.round_no=v_match.round_no
          and r.user_id=p.user_id and r.verdict='valid'
      );

   select count(*) into v_alive from private.nr_players
    where match_id=v_match.id and alive;
   select user_id into v_winner from private.nr_players
    where match_id=v_match.id and alive order by user_id limit 1;

   if v_alive<=1 or v_match.round_no>=12 then
     update private.nr_matches
     set phase='finished',
         winner_id=case when v_alive=1 then v_winner else null end,
         deadline=now(),updated_at=now()
     where id=v_match.id;
   else
     update private.nr_matches
     set phase='reveal', deadline=now()+interval '7 seconds',updated_at=now()
     where id=v_match.id;
   end if;
   update public.rooms set updated_at=now() where id=p_room_id;

 elsif v_match.phase='reveal' and now()>=v_match.deadline then
   update private.nr_matches set phase='writing', round_no=v_match.round_no+1,
     deadline=now()+interval '25 seconds',updated_at=now()
   where id=v_match.id;
   update public.rooms set updated_at=now() where id=p_room_id;
 end if;
end;
$fn$;
revoke all on function private.nr_tick(uuid) from public,anon,authenticated;

create or replace function private.ice_tick(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare room public.rooms%rowtype; m private.ice_matches%rowtype;
        alive_count integer; submissions integer; winner uuid;
begin
  if not private.game_is_live(p_room_id) then return;end if;
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

create or replace function private.pong_tick(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype; m private.pong_matches%rowtype;
begin
  if not private.game_is_live(p_room_id) then return;end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.status<>'playing' or r.game_id<>'pongagono' then return; end if;
 select * into m from private.pong_matches where room_id=p_room_id for update;
 if not found or m.phase='finished' then return;end if;
 perform private.pong_step(m.id);
end;
$fn$;
revoke all on function private.pong_tick(uuid) from public,anon,authenticated;

create or replace function private.lava_tick(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype; m private.lava_matches%rowtype;
 v_alive integer; v_submitted integer; v_new_lava integer;
 v_winner uuid; v_topic text;
begin
  if not private.game_is_live(p_room_id) then return;end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.status<>'playing' or r.game_id<>'lavalabras' then return; end if;
 select * into m from private.lava_matches where room_id=p_room_id for update;
 if not found or m.phase='finished' then return; end if;
 if m.phase='writing' then
   select count(*) into v_alive from private.lava_players
     where match_id=m.id and alive;
   select count(*) into v_submitted from private.lava_answers a
     join private.lava_players p on p.match_id=a.match_id and p.user_id=a.user_id
     where a.match_id=m.id and a.round_no=m.round_no and p.alive;
   if clock_timestamp()<m.deadline and v_submitted<v_alive then return; end if;

   -- Do not expose answer validity until the writing phase has closed.
   update private.lava_answers a set
     entry_id=private.nr_resolve_key(m.topic_id,a.answer_key)
   where a.match_id=m.id and a.round_no=m.round_no;

   update private.lava_answers a set
     verdict=case when a.entry_id is null then 'invalid' else 'valid' end,
     gain=case when a.entry_id is null then 0
       else least(65,char_length(regexp_replace(
         private.nr_normalize(a.raw_answer),'[^[:alpha:]]','','g')))
     end
   where a.match_id=m.id and a.round_no=m.round_no;

   update private.lava_players p
   set height=p.height+coalesce((
     select a.gain from private.lava_answers a
     where a.match_id=p.match_id and a.user_id=p.user_id
       and a.round_no=m.round_no
   ),0)
   where p.match_id=m.id and p.alive;

   v_new_lava:=m.lava_height+4+2*m.round_no;
   -- A tower exactly as high as the lava is swallowed.
   update private.lava_players p
   set alive=false,eliminated_round=m.round_no
   where p.match_id=m.id and p.alive and p.height<=v_new_lava;

   update private.lava_rounds set lava_after=v_new_lava
   where match_id=m.id and round_no=m.round_no;

   select count(*) into v_alive from private.lava_players
   where match_id=m.id and alive;
   select user_id into v_winner from private.lava_players
   where match_id=m.id and alive order by user_id limit 1;

   update private.lava_matches
     set lava_height=v_new_lava,phase='reveal',
     deadline=clock_timestamp()+interval '7 seconds',
     winner_id=case when v_alive=1 then v_winner else null end,
     updated_at=now()
   where id=m.id;
   update public.rooms set updated_at=now() where id=p_room_id;
 elsif m.phase='reveal' and clock_timestamp()>=m.deadline then
   select count(*) into v_alive from private.lava_players
   where match_id=m.id and alive;
   if v_alive<=1 or m.round_no=12 then
     update private.lava_matches
       set phase='finished',updated_at=now()
     where id=m.id;
   else
     v_topic:=private.lava_choose_topic(m.id,m.round_no+1);
     if v_topic is null then raise exception 'NO_SUITABLE_TOPIC';end if;
     insert into private.lava_rounds(match_id,round_no,topic_id,lava_before)
     values(m.id,m.round_no+1,v_topic,m.lava_height);
     update private.lava_matches set
       round_no=round_no+1,topic_id=v_topic,phase='writing',
       deadline=clock_timestamp()+interval '24 seconds',updated_at=now()
     where id=m.id;
   end if;
   update public.rooms set updated_at=now() where id=p_room_id;
 end if;
end;
$fn$;
revoke all on function private.lava_tick(uuid) from public,anon,authenticated;

create or replace function public.submit_laser_move(
  p_room_id uuid,p_x numeric,p_y numeric,p_angle numeric
) returns void language plpgsql security definer set search_path = ''
as $fn$
declare v_match private.laser_matches%rowtype;
begin
  perform private.require_game_running(p_room_id);
  if auth.uid() is null or not private.is_room_member(p_room_id) then raise exception 'NOT_A_MEMBER'; end if;
  perform private.laser_tick(p_room_id);
  select * into v_match from private.laser_matches where room_id=p_room_id for update;
  if not found or v_match.phase<>'planning' or now()>=v_match.deadline then
    raise exception 'PLANNING_CLOSED';
  end if;
  if not private.laser_inside(p_x,p_y,v_match.radius) then
    raise exception 'OUTSIDE_HEX';
  end if;
  if p_angle is null or p_angle<0 or p_angle>=6.283185307180 then
    raise exception 'ANGLE_INVALID';
  end if;
  if not exists(select 1 from private.laser_players
                where match_id=v_match.id and user_id=auth.uid() and alive) then
    raise exception 'ELIMINATED';
  end if;
  insert into private.laser_moves(match_id,round_no,user_id,x,y,angle)
    values(v_match.id,v_match.round_no,auth.uid(),p_x,p_y,p_angle)
    on conflict(match_id,round_no,user_id) do update
      set x=excluded.x,y=excluded.y,angle=excluded.angle,submitted_at=now();
  perform private.laser_tick(p_room_id);
end;
$fn$;
revoke all on function public.submit_laser_move(uuid,numeric,numeric,numeric) from public,anon;
grant execute on function public.submit_laser_move(uuid,numeric,numeric,numeric) to authenticated;

create or replace function public.submit_nr_answer(p_room_id uuid,p_answer text)
returns void language plpgsql security definer set search_path=''
as $fn$
declare v_match private.nr_matches%rowtype; v_key text;
begin
  perform private.require_game_running(p_room_id);
 if auth.uid() is null or not private.is_room_member(p_room_id) then
   raise exception 'NOT_A_MEMBER';
 end if;
 perform private.nr_tick(p_room_id);
 select * into v_match from private.nr_matches where room_id=p_room_id for update;
 if not found or v_match.phase<>'writing' or now()>=v_match.deadline then
   raise exception 'WRITING_CLOSED';
 end if;
 if p_answer is null or char_length(btrim(p_answer)) not between 1 and 65 then
   raise exception 'ANSWER_INVALID_LENGTH';
 end if;
 v_key:=private.nr_normalize(p_answer);
 if v_key='' then raise exception 'ANSWER_INVALID_LENGTH'; end if;
 if not exists(select 1 from private.nr_players p
   where p.match_id=v_match.id and p.user_id=auth.uid() and p.alive) then
   raise exception 'ELIMINATED';
 end if;
 -- No validity hints at submission time.
 insert into private.nr_responses(match_id,round_no,user_id,raw_answer,answer_key)
 values(v_match.id,v_match.round_no,auth.uid(),btrim(p_answer),v_key)
 on conflict(match_id,round_no,user_id) do update
 set raw_answer=excluded.raw_answer,answer_key=excluded.answer_key,
     entry_id=null,verdict=null,submitted_at=now();
 perform private.nr_tick(p_room_id);
end;
$fn$;
revoke all on function public.submit_nr_answer(uuid,text) from public,anon;
grant execute on function public.submit_nr_answer(uuid,text) to authenticated;

create or replace function public.submit_ice_direction(p_room_id uuid,p_angle numeric)
returns void language plpgsql security definer set search_path=''
as $fn$
declare m private.ice_matches%rowtype;
begin
  perform private.require_game_running(p_room_id);
  if auth.uid() is null or not private.is_room_member(p_room_id) then
    raise exception 'NOT_A_MEMBER';
  end if;
  perform private.ice_tick(p_room_id);
  select * into m from private.ice_matches where room_id=p_room_id for update;
  if not found or m.phase<>'planning' or now()>=m.deadline then
    raise exception 'PLANNING_CLOSED';
  end if;
  if p_angle is null or p_angle<0 or p_angle>=6.283185307180 then
    raise exception 'ANGLE_INVALID';
  end if;
  if not exists(select 1 from private.ice_players p
    where p.match_id=m.id and p.user_id=auth.uid() and p.alive) then
    raise exception 'ELIMINATED';
  end if;
  insert into private.ice_moves(match_id,round_no,user_id,angle)
    values(m.id,m.round_no,auth.uid(),p_angle)
  on conflict(match_id,round_no,user_id) do update
    set angle=excluded.angle,submitted_at=now();
  perform private.ice_tick(p_room_id);
end;
$fn$;
revoke all on function public.submit_ice_direction(uuid,numeric) from public,anon;
grant execute on function public.submit_ice_direction(uuid,numeric) to authenticated;

create or replace function public.pongagono_move(p_room_id uuid,p_position double precision)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare m private.pong_matches%rowtype; p private.pong_players%rowtype; moment timestamptz;
begin
  perform private.require_game_running(p_room_id);
 if auth.uid() is null or not private.is_room_member(p_room_id) then
   raise exception 'NOT_A_MEMBER';
 end if;
 if p_position is null or p_position='NaN'::double precision or
    p_position<0 or p_position>1 then raise exception 'POSITION_INVALID';end if;
 perform private.pong_tick(p_room_id);
 select * into m from private.pong_matches where room_id=p_room_id;
 if not found or m.phase='finished' then raise exception 'MATCH_FINISHED';end if;
 select * into p from private.pong_players
   where match_id=m.id and user_id=auth.uid() for update;
 if not found or not p.alive then raise exception 'ELIMINATED';end if;
 moment:=clock_timestamp();
 -- Client sends at ~120 ms; additional floods cannot move a paddle faster.
 if p.last_input is null or moment-p.last_input>=interval '80 milliseconds' then
   update private.pong_players set target_u=p_position,last_input=moment
   where match_id=m.id and user_id=auth.uid();
 end if;
 return jsonb_build_object('ok',true);
end;
$fn$;
revoke all on function public.pongagono_move(uuid,double precision) from public,anon;
grant execute on function public.pongagono_move(uuid,double precision) to authenticated;

create or replace function public.submit_lava_word(p_room_id uuid,p_answer text)
returns void language plpgsql security definer set search_path=''
as $fn$
declare m private.lava_matches%rowtype; v_answer text;
begin
  perform private.require_game_running(p_room_id);
 if auth.uid() is null or not private.is_room_member(p_room_id) then
   raise exception 'NOT_A_MEMBER';end if;
 perform private.lava_tick(p_room_id);
 select * into m from private.lava_matches where room_id=p_room_id for update;
 if not found or m.phase<>'writing' or clock_timestamp()>=m.deadline then
   raise exception 'WRITING_CLOSED';end if;
 if not exists(select 1 from private.lava_players
   where match_id=m.id and user_id=auth.uid() and alive) then
   raise exception 'ELIMINATED';end if;
 v_answer:=btrim(coalesce(p_answer,''));
 if char_length(v_answer)<1 or char_length(v_answer)>65
   or private.nr_normalize(v_answer)='' then
   raise exception 'ANSWER_INVALID_LENGTH';end if;
 insert into private.lava_answers(match_id,round_no,user_id,raw_answer,answer_key)
 values(m.id,m.round_no,auth.uid(),v_answer,private.nr_normalize(v_answer))
 on conflict(match_id,round_no,user_id)
 do update set raw_answer=excluded.raw_answer,answer_key=excluded.answer_key,
   submitted_at=now(),entry_id=null,gain=null,verdict=null;
 perform private.lava_tick(p_room_id);
end;
$fn$;
revoke all on function public.submit_lava_word(uuid,text) from public,anon;
grant execute on function public.submit_lava_word(uuid,text) to authenticated;

