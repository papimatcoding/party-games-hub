-- PARTY / 58: Pong timeout starts when all players are ready, not in lobby.
create or replace function private.party_tick(p_room_id uuid)
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
revoke all on function private.party_tick(uuid) from public,anon,authenticated;
