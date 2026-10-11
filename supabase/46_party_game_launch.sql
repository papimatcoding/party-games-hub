-- PARTY / 46: launch any of the five independent engines without impersonation,
-- changing auth claims or allowing the browser to choose the next game.
create function private.party_launch(p_session_id uuid,p_game text)
returns void language plpgsql security definer set search_path=''
as $fn$
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
revoke all on function private.party_launch(uuid,text) from public,anon,authenticated;

create function public.start_party(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype; s private.party_sessions%rowtype;
 n integer; unready integer; initial_game text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.host_user_id<>auth.uid() then raise exception 'HOST_ONLY';end if;
 if r.status<>'lobby' or r.mode<>'party' then raise exception 'WRONG_MODE';end if;
 select count(*),count(*) filter(where not is_ready) into n,unready
 from public.room_members where room_id=p_room_id;
 if n<2 or n>12 then raise exception 'NEED_TWO_PLAYERS';end if;
 if unready>0 then raise exception 'NOT_ALL_READY';end if;
 select * into s from private.party_sessions where room_id=p_room_id for update;
 if not found or s.status<>'configured' then raise exception 'CIRCUIT_NOT_PREPARED';end if;
 if (select count(*) from private.party_slots where session_id=s.id)<>s.set_size
 then raise exception 'CIRCUIT_NOT_PREPARED';end if;
 delete from private.party_participants where session_id=s.id;
 insert into private.party_participants(session_id,user_id,display_name)
 select s.id,user_id,display_name from public.room_members where room_id=p_room_id;
 delete from private.party_medals where session_id=s.id;
 update private.party_slots set completed_at=null where session_id=s.id;
 update private.party_sessions
  set status='playing',current_slot=1,transition_at=null,
      slot_started_at=null,finished_at=null,updated_at=clock_timestamp()
  where id=s.id;
 select game_id into initial_game from private.party_slots
 where session_id=s.id and slot=1;
 perform private.party_launch(s.id,initial_game);
end;
$fn$;
revoke all on function public.start_party(uuid) from public,anon;
grant execute on function public.start_party(uuid) to authenticated;
