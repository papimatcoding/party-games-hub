-- 85: both precision minigames are full citizens of freeplay, Party and profile rewards.
alter table public.rooms drop constraint rooms_game_id_check;
alter table public.rooms add constraint rooms_game_id_check check(game_id in
 ('lasers','no_repitas','patinazo','pongagono','lavalabras','fin_de_linea',
  'puerta_o_nada','ya','aguanta','pool','bomb','draw','trivia'));
alter table private.party_slots drop constraint party_slots_game_id_check;
alter table private.party_slots add constraint party_slots_game_id_check check(game_id in
 ('lasers','no_repitas','patinazo','pongagono','lavalabras','fin_de_linea','puerta_o_nada','ya','aguanta'));
CREATE OR REPLACE FUNCTION public.party_prepare(p_room_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn$
declare r public.rooms%rowtype;sid uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.host_user_id<>auth.uid() then raise exception 'HOST_ONLY';end if;
 if r.status<>'lobby' then raise exception 'ROOM_NOT_IN_LOBBY';end if;
 if r.mode<>'party' then raise exception 'WRONG_MODE';end if;
 if exists(select 1 from private.party_sessions
   where room_id=p_room_id and status<>'configured') then
   raise exception 'CIRCUIT_ALREADY_STARTED';end if;
 delete from private.party_sessions where room_id=p_room_id;
 insert into private.party_sessions(room_id,set_size)
 values(p_room_id,5) returning id into sid;
 insert into private.party_slots(session_id,slot,game_id)
 select sid,row_number() over(order by random())::integer,chosen.game_id
 from (
    select src.game_id from unnest(array[
     'lasers','no_repitas','patinazo','pongagono','lavalabras','fin_de_linea','puerta_o_nada','ya','aguanta'
    ]) src(game_id) order by random() limit 5
 ) chosen;
 update public.room_members set is_ready=false where room_id=p_room_id;
 update public.rooms set updated_at=now() where id=p_room_id;
end;
$fn$;


CREATE OR REPLACE FUNCTION public.set_room_game(p_room_id uuid, p_game_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn$
declare r public.rooms%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.host_user_id<>auth.uid() then raise exception 'HOST_ONLY';end if;
 if r.status<>'lobby' then raise exception 'ROOM_NOT_IN_LOBBY';end if;
 if p_game_id is null or p_game_id not in
   ('lasers','no_repitas','patinazo','pongagono','lavalabras','fin_de_linea','puerta_o_nada','ya','aguanta')
 then raise exception 'GAME_NOT_AVAILABLE';end if;
 update public.rooms set game_id=p_game_id,updated_at=clock_timestamp() where id=p_room_id;
 update public.room_members set is_ready=false where room_id=p_room_id;
end;
$fn$;


CREATE OR REPLACE FUNCTION private.party_launch(p_session_id uuid, p_game text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn$
declare s private.party_sessions%rowtype; n integer; mid uuid; topic text; first_side integer;
begin
 select * into s from private.party_sessions where id=p_session_id for update;
 if not found or s.status<>'playing' then raise exception 'PARTY_NOT_RUNNING'; end if;
 if not exists(select 1 from private.party_slots sl
    where sl.session_id=s.id and sl.slot=s.current_slot and sl.game_id=p_game and sl.completed_at is null)
 then raise exception 'GAME_NOT_IN_CIRCUIT';end if;
 select count(*) into n from private.party_participants where session_id=s.id;
 if n<2 or n>12 then raise exception 'NEED_TWO_PLAYERS';end if;
 if p_game='lasers' then
   delete from private.laser_matches where room_id=s.room_id;
   insert into private.laser_matches(room_id,deadline)
    values(s.room_id,now()+interval '25 seconds') returning id into mid;
   insert into private.laser_players(match_id,user_id,display_name)
    select mid,user_id,display_name from private.party_participants where session_id=s.id;

 elsif p_game='no_repitas' then
   select t.id into topic from private.nr_topics t
   join private.nr_entries e on e.topic_id=t.id
   where t.active and n between t.min_players and t.max_players
   group by t.id
   having count(*)>=greatest(8,n*4)
   order by random() limit 1;
   if topic is null then raise exception 'NO_SUITABLE_TOPIC';end if;
   delete from private.nr_matches where room_id=s.room_id;
   insert into private.nr_matches(room_id,topic_id,deadline)
    values(s.room_id,topic,now()+interval '25 seconds') returning id into mid;
   insert into private.nr_players(match_id,user_id,display_name)
    select mid,user_id,display_name from private.party_participants where session_id=s.id;

 elsif p_game='patinazo' then
   delete from private.ice_matches where room_id=s.room_id;
   insert into private.ice_matches(room_id,sides,deadline)
    values(s.room_id,greatest(4,n),now()+interval '18 seconds') returning id into mid;
   with randomized_corners as (
     select pos,(row_number() over(order by random())-1)::integer ix
     from generate_series(0,greatest(4,n)-1) pos
   ), randomized_players as (
     select user_id,display_name,(row_number() over(order by random())-1)::integer ix
     from private.party_participants where session_id=s.id
   )
   insert into private.ice_players(match_id,user_id,display_name,corner_index)
   select mid,p.user_id,p.display_name,c.pos
   from randomized_players p join randomized_corners c on c.ix=p.ix;

 elsif p_game='pongagono' then
   delete from private.pong_matches where room_id=s.room_id;
   insert into private.pong_matches(room_id,sides,paddle_ratio)
    values(s.room_id,greatest(4,n),private.pong_paddle_ratio(greatest(4,n))) returning id into mid;
   first_side:=floor(random()*4)::integer;
   if n=2 then
     with p as (
       select user_id,display_name,row_number() over(order by random())-1 ix
       from private.party_participants where session_id=s.id
     )
     insert into private.pong_players(match_id,user_id,display_name,side_index)
     select mid,user_id,display_name,mod(first_side+ix::integer*2,4) from p;
   else
     with chosen_sides as (
       select pos,row_number() over(order by random())-1 ix
       from generate_series(0,greatest(4,n)-1) pos
     ), p as (
       select user_id,display_name,row_number() over(order by random())-1 ix
       from private.party_participants where session_id=s.id
     )
     insert into private.pong_players(match_id,user_id,display_name,side_index)
     select mid,p.user_id,p.display_name,c.pos from p join chosen_sides c on c.ix=p.ix;
   end if;
   perform private.pong_serve(mid,2.5);

 elsif p_game='lavalabras' then
   delete from private.lava_matches where room_id=s.room_id;
   insert into private.lava_matches(room_id,topic_id)
    values(s.room_id,'animales') returning id into mid;
   topic:=private.lava_choose_topic(mid,1);
   if topic is null then raise exception 'NO_SUITABLE_TOPIC';end if;
   update private.lava_matches set topic_id=topic where id=mid;
   insert into private.lava_rounds(match_id,round_no,topic_id,lava_before)
    values(mid,1,topic,0);
   insert into private.lava_players(match_id,user_id,display_name)
    select mid,user_id,display_name from private.party_participants where session_id=s.id;
 elsif p_game='fin_de_linea' then
   with players as (
     select array_agg(user_id order by display_name,user_id) as ids,
            array_agg(display_name order by display_name,user_id) as names
     from private.party_participants where session_id=s.id
   )
   select private.rail_init(s.room_id,players.ids,players.names) into mid
   from players;
 elsif p_game='puerta_o_nada' then
   with participants as (
     select array_agg(user_id order by display_name,user_id) ids,
            array_agg(display_name order by display_name,user_id) names
     from private.party_participants where session_id=s.id
   )
   select private.door_init(s.room_id,participants.ids,participants.names)
   into mid from participants;
 elsif p_game in ('ya','aguanta') then
   with participants as (
    select array_agg(user_id order by display_name,user_id) ids,
           array_agg(display_name order by display_name,user_id) names
    from private.party_participants where session_id=s.id)
   select private.timing_init(s.room_id,p_game,participants.ids,participants.names)
   into mid from participants;
 else
   raise exception 'GAME_NOT_AVAILABLE';
 end if;

 update public.rooms set game_id=p_game,status='playing',updated_at=clock_timestamp()
 where id=s.room_id;
 update private.party_sessions set
   slot_started_at=clock_timestamp(),transition_at=null,updated_at=clock_timestamp()
 where id=s.id;
end;
$fn$;


CREATE OR REPLACE FUNCTION private.party_tick(p_room_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn$
declare r public.rooms%rowtype;s private.party_sessions%rowtype;
 game text; completed timestamptz; v_phase text; next_game text;
begin
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.status<>'playing' or r.mode<>'party' then return;end if;
 select * into s from private.party_sessions where room_id=p_room_id for update;
 if not found or s.status<>'playing' then return;end if;
 select sl.game_id,sl.completed_at into game,completed
 from private.party_slots sl where sl.session_id=s.id and sl.slot=s.current_slot;
 if game is null then raise exception 'PARTY_SLOT_MISSING';end if;
 if completed is not null then
   if s.transition_at is not null and clock_timestamp()>=s.transition_at
     and (select count(*) from public.room_members where room_id=p_room_id)>0
     and (select count(*) from public.room_members where room_id=p_room_id)
      = (select count(*) from private.party_slot_ready pr
          join public.room_members rm on rm.user_id=pr.user_id and rm.room_id=p_room_id
          where pr.session_id=s.id and pr.slot=s.current_slot) then
     select sl.game_id into next_game from private.party_slots sl
     where sl.session_id=s.id and sl.slot=s.current_slot+1;
     if next_game is null then raise exception 'PARTY_NEXT_MISSING';end if;
     update private.party_sessions
       set current_slot=current_slot+1,transition_at=null,updated_at=clock_timestamp()
       where id=s.id;
     perform private.party_launch(s.id,next_game);
   end if;
   return;
 end if;

 if game='lasers' then
    perform private.laser_tick(p_room_id);
    select m.phase into v_phase from private.laser_matches m where m.room_id=p_room_id;
 elsif game='no_repitas' then
    perform private.nr_tick(p_room_id);
    select m.phase into v_phase from private.nr_matches m where m.room_id=p_room_id;
 elsif game='patinazo' then
    perform private.ice_tick(p_room_id);
    select m.phase into v_phase from private.ice_matches m where m.room_id=p_room_id;
 elsif game='pongagono' then
    perform private.pong_tick(p_room_id);
    -- Defensive time limit prevents one endless Pong match stalling the circuit.
    if private.game_is_live(p_room_id) and
      clock_timestamp()>=coalesce((
        select g.live_at from private.game_gates g where g.room_id=p_room_id
      ),s.slot_started_at)+interval '180 seconds' then
      update private.pong_matches set phase='finished',winner_id=null,
       updated_at=clock_timestamp()
      where room_id=p_room_id and phase<>'finished';
    end if;
    select m.phase into v_phase from private.pong_matches m where m.room_id=p_room_id;
 elsif game='lavalabras' then
    perform private.lava_tick(p_room_id);
    select m.phase into v_phase from private.lava_matches m where m.room_id=p_room_id;
 elsif game='fin_de_linea' then
    perform private.rail_tick(p_room_id);
    select m.phase into v_phase from private.rail_matches m where m.room_id=p_room_id;
 elsif game='puerta_o_nada' then
    perform private.door_tick(p_room_id);
    select m.phase into v_phase from private.door_matches m
    where m.room_id=p_room_id;
 elsif game in ('ya','aguanta') then
    perform private.timing_tick(p_room_id);
    select m.phase into v_phase from private.timing_matches m where m.room_id=p_room_id;
 else raise exception 'GAME_NOT_AVAILABLE';
 end if;

 if v_phase='finished' then
   -- Awards and advancing are protected by the same room/session row locks.
   perform private.party_award(s.id,s.current_slot,game,p_room_id);
   update private.party_slots set completed_at=clock_timestamp()
     where session_id=s.id and slot=s.current_slot and completed_at is null;
   if s.current_slot=s.set_size then
     update private.party_sessions set status='finished',
       finished_at=clock_timestamp(),transition_at=null,
       updated_at=clock_timestamp() where id=s.id;
   else
     update private.party_sessions
      set transition_at=clock_timestamp()+interval '8 seconds',
          updated_at=clock_timestamp() where id=s.id;
   end if;
   update public.rooms set updated_at=clock_timestamp() where id=p_room_id;
 end if;
end;
$fn$;


CREATE OR REPLACE FUNCTION private.party_award(p_session uuid, p_slot integer, p_game text, p_room_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn$
begin
 if p_game='lasers' then
   insert into private.party_medals(session_id,slot,user_id,rank)
   select p_session,p_slot,user_id,place from (
     select p.user_id,rank() over(order by p.alive desc,
       coalesce(p.killed_round,0) desc) as place
     from private.laser_players p
     join private.laser_matches m on m.id=p.match_id
     where m.room_id=p_room_id
   ) ranks where place<=3
   on conflict(session_id,slot,user_id) do nothing;
 elsif p_game='no_repitas' then
   insert into private.party_medals(session_id,slot,user_id,rank)
   select p_session,p_slot,user_id,place from (
     select p.user_id,rank() over(order by p.alive desc,
       coalesce(p.eliminated_round,0) desc) as place
     from private.nr_players p
     join private.nr_matches m on m.id=p.match_id
     where m.room_id=p_room_id
   ) ranks where place<=3
   on conflict(session_id,slot,user_id) do nothing;
 elsif p_game='patinazo' then
   insert into private.party_medals(session_id,slot,user_id,rank)
   select p_session,p_slot,user_id,place from (
     select p.user_id,rank() over(order by p.alive desc,
       coalesce(p.eliminated_round,0) desc) as place
     from private.ice_players p
     join private.ice_matches m on m.id=p.match_id
     where m.room_id=p_room_id
   ) ranks where place<=3
   on conflict(session_id,slot,user_id) do nothing;
 elsif p_game='pongagono' then
   insert into private.party_medals(session_id,slot,user_id,rank)
   select p_session,p_slot,user_id,place from (
     select p.user_id,rank() over(order by p.alive desc,
       coalesce(p.eliminated_order,0) desc) as place
     from private.pong_players p
     join private.pong_matches m on m.id=p.match_id
     where m.room_id=p_room_id
   ) ranks where place<=3
   on conflict(session_id,slot,user_id) do nothing;
 elsif p_game='lavalabras' then
   insert into private.party_medals(session_id,slot,user_id,rank)
   select p_session,p_slot,user_id,place from (
     select p.user_id,rank() over(order by p.alive desc,
       coalesce(p.eliminated_round,0) desc,p.height desc) as place
     from private.lava_players p
     join private.lava_matches m on m.id=p.match_id
     where m.room_id=p_room_id
   ) ranks where place<=3
   on conflict(session_id,slot,user_id) do nothing;
 elsif p_game='fin_de_linea' then
   insert into private.party_medals(session_id,slot,user_id,rank)
   select p_session,p_slot,user_id,place from (
     select p.user_id,rank() over(order by
       p.alive desc,coalesce(p.eliminated_order,0) desc,
       p.hits desc,p.hp desc,p.kills desc) as place
     from private.rail_players p
     join private.rail_matches m on m.id=p.match_id
     where m.room_id=p_room_id
   ) ranks where place<=3
   on conflict(session_id,slot,user_id) do nothing;
 elsif p_game='puerta_o_nada' then
   insert into private.party_medals(session_id,slot,user_id,rank)
   select p_session,p_slot,user_id,place from (
     select p.user_id,rank() over(order by
       p.alive desc,coalesce(p.eliminated_round,0) desc,
       p.risk_wins desc) place
     from private.door_players p
     join private.door_matches m on m.id=p.match_id
     where m.room_id=p_room_id
   ) ranks where place<=3
   on conflict(session_id,slot,user_id) do nothing;
 elsif p_game in ('ya','aguanta') then
   insert into private.party_medals(session_id,slot,user_id,rank)
   select p_session,p_slot,user_id,place from (
     select p.user_id,rank() over(order by p.crushed asc,p.error_ms asc) place
     from private.timing_players p
     join private.timing_matches m on m.id=p.match_id
     where m.room_id=p_room_id
   ) scored where place<=3
   on conflict(session_id,slot,user_id) do nothing;
 else raise exception 'GAME_NOT_AVAILABLE';
 end if;
end;
$fn$;


CREATE OR REPLACE FUNCTION private.avatar_finished_match()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $fn$
declare table_name text;person record;uid uuid;
begin
 if new.phase<>'finished' or old.phase='finished' then return new;end if;
 table_name:=case tg_table_name
 when 'laser_matches' then 'laser_players'
 when 'nr_matches' then 'nr_players'
 when 'ice_matches' then 'ice_players'
 when 'pong_matches' then 'pong_players'
 when 'lava_matches' then 'lava_players'
 when 'rail_matches' then 'rail_players'
 when 'door_matches' then 'door_players'
 when 'timing_matches' then 'timing_players'
 else null end;
 if table_name is null then return new;end if;
 for person in execute format('select user_id from private.%I where match_id=$1',table_name) using new.id loop
  perform private.avatar_reward(person.user_id,'match:'||tg_table_name||':'||new.id::text,
   70+case when person.user_id=new.winner_id then 35 else 0 end,
   12+case when person.user_id=new.winner_id then 8 else 0 end,
   true,person.user_id=new.winner_id,null);
 end loop;
 return new;
end;
$fn$;


create trigger avatar_timing_rewards after update of phase on private.timing_matches
for each row execute function private.avatar_finished_match();
revoke all on function public.party_prepare(uuid),public.set_room_game(uuid,text) from public,anon;
grant execute on function public.party_prepare(uuid),public.set_room_game(uuid,text) to authenticated;
revoke all on function private.party_launch(uuid,text),private.party_tick(uuid),
 private.party_award(uuid,integer,text,uuid),private.avatar_finished_match() from public,anon,authenticated;
