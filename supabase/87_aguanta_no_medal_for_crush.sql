-- 87: all-crushed AGUANTA rounds have no winners and award no medals.
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
     where m.room_id=p_room_id and not p.crushed
   ) scored where place<=3
   on conflict(session_id,slot,user_id) do nothing;
 else raise exception 'GAME_NOT_AVAILABLE';
 end if;
end;
$fn$;
revoke all on function private.party_award(uuid,integer,text,uuid) from public,anon,authenticated;