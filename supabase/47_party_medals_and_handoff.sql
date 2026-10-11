-- PARTY / 47: server-controlled transitions, podium placement and medals.
-- All players in a tied position receive the same medal. Competition ranking:
-- a 1st-place tie of two skips silver and awards bronze to the next player.
create function private.party_award(p_session uuid,p_slot integer,p_game text,p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
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
 else raise exception 'GAME_NOT_AVAILABLE';
 end if;
end;
$fn$;
revoke all on function private.party_award(uuid,integer,text,uuid)
 from public,anon,authenticated;

create function private.party_tick(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
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
   if s.transition_at is not null and clock_timestamp()>=s.transition_at then
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
    if clock_timestamp()>=s.slot_started_at+interval '180 seconds' then
      update private.pong_matches set phase='finished',winner_id=null,
       updated_at=clock_timestamp()
      where room_id=p_room_id and phase<>'finished';
    end if;
    select m.phase into v_phase from private.pong_matches m where m.room_id=p_room_id;
 elsif game='lavalabras' then
    perform private.lava_tick(p_room_id);
    select m.phase into v_phase from private.lava_matches m where m.room_id=p_room_id;
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
      set transition_at=clock_timestamp()+interval '9 seconds',
          updated_at=clock_timestamp() where id=s.id;
   end if;
   update public.rooms set updated_at=clock_timestamp() where id=p_room_id;
 end if;
end;
$fn$;
revoke all on function private.party_tick(uuid) from public,anon,authenticated;

create or replace function public.party_state(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare s private.party_sessions%rowtype;current_game text;
begin
 if auth.uid() is null or not private.is_room_member(p_room_id) then
   raise exception 'NOT_A_MEMBER';end if;
 perform private.party_tick(p_room_id);
 select * into s from private.party_sessions where room_id=p_room_id;
 if not found then
   return jsonb_build_object('enabled',false,'status','not_prepared',
      'phase','configured','scores','[]'::jsonb,'schedule','[]'::jsonb);
 end if;
 select sl.game_id into current_game from private.party_slots sl
 where sl.session_id=s.id and sl.slot=s.current_slot;
 return jsonb_build_object(
   'enabled',true,'length',s.set_size,'status',s.status,
   'phase',case when s.status='finished' then 'finished'
     when s.status='configured' then 'configured'
     when s.transition_at is not null then 'intermission' else 'playing' end,
   'current_slot',s.current_slot,'current_game',current_game,
   'transition_at',s.transition_at,'server_time',clock_timestamp(),
   'future_formats',jsonb_build_array(10,15,20),
   'scores',coalesce((
     select jsonb_agg(jsonb_build_object(
      'user_id',ranked.user_id,'name',ranked.name,
      'place',ranked.place,'gold',ranked.g,'silver',ranked.s,'bronze',ranked.b,
      'score',ranked.score
     ) order by ranked.place,ranked.name)
     from (
       select totals.*,rank() over(
         order by totals.score desc,totals.g desc,totals.s desc,totals.b desc
       ) as place
       from (
         select p.user_id,p.display_name as name,
            count(a.user_id) filter(where a.rank=1) as g,
            count(a.user_id) filter(where a.rank=2) as s,
            count(a.user_id) filter(where a.rank=3) as b,
            private.party_medal_score(
              count(a.user_id) filter(where a.rank=1),
              count(a.user_id) filter(where a.rank=2),
              count(a.user_id) filter(where a.rank=3)) as score
         from private.party_participants p
         left join private.party_medals a on a.session_id=p.session_id
           and a.user_id=p.user_id
         where p.session_id=s.id
         group by p.user_id,p.display_name
       ) totals
     ) ranked
   ),(
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id',p.user_id,'name',p.display_name,
        'place',null,'gold',0,'silver',0,'bronze',0,'score',0
      ) order by p.display_name),'[]'::jsonb)
      from public.room_members p where p.room_id=p_room_id
   )),
   'schedule',coalesce((
     select jsonb_agg(jsonb_build_object(
       'slot',sl.slot,'game',sl.game_id,'completed',sl.completed_at is not null,
       'podium',coalesce((
         select jsonb_agg(jsonb_build_object(
            'user_id',p.user_id,'name',p.display_name,'rank',a.rank
         ) order by a.rank,p.display_name)
         from private.party_medals a
         join private.party_participants p on p.session_id=a.session_id and p.user_id=a.user_id
         where a.session_id=sl.session_id and a.slot=sl.slot
       ),'[]'::jsonb)
     ) order by sl.slot)
     from private.party_slots sl where sl.session_id=s.id
   ),'[]'::jsonb)
 );
end;
$fn$;
revoke all on function public.party_state(uuid) from public,anon;
grant execute on function public.party_state(uuid) to authenticated;
