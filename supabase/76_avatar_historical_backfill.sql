-- 76 / AVATARS: idempotent catch-up from previously completed games and Party medals.
-- Historical data exists in private tables; this never modifies game results.
do $backfill$
declare source record;finished record;player record;medal record;
begin
 for source in
   select * from (values
     ('laser_matches','laser_players'),
     ('nr_matches','nr_players'),
     ('ice_matches','ice_players'),
     ('pong_matches','pong_players'),
     ('lava_matches','lava_players'),
     ('rail_matches','rail_players'),
     ('door_matches','door_players')
   ) as types(match_table,player_table)
 loop
  for finished in execute format(
   'select id,winner_id from private.%I where phase=''finished''',source.match_table)
  loop
   for player in execute format(
     'select user_id from private.%I where match_id=$1',source.player_table)
     using finished.id
   loop
    if exists(select 1 from auth.users where id=player.user_id) then
      perform private.avatar_reward(player.user_id,
       'match:'||source.match_table||':'||finished.id::text,
       70+case when player.user_id=finished.winner_id then 35 else 0 end,
       12+case when player.user_id=finished.winner_id then 8 else 0 end,
       true,player.user_id=finished.winner_id,null);
    end if;
   end loop;
  end loop;
 end loop;
 for medal in select session_id,slot,user_id,rank from private.party_medals loop
  if exists(select 1 from auth.users where id=medal.user_id) then
   perform private.avatar_reward(medal.user_id,
     'party:'||medal.session_id::text||':'||medal.slot::text,
     case medal.rank when 1 then 35 when 2 then 25 when 3 then 15 else 0 end,
     case medal.rank when 1 then 20 when 2 then 14 when 3 then 8 else 0 end,
     false,false,medal.rank);
  end if;
 end loop;
end;
$backfill$;
