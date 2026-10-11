-- 73: unique successful double-or-nothing player wins ties among final survivors.
create or replace function private.door_tick(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare v_room public.rooms%rowtype;v_match private.door_matches%rowtype;
 v_alive integer;v_chosen integer;v_winner uuid;v_next integer[];
begin
 if not private.game_is_live(p_room_id) then return;end if;
 select * into v_room from public.rooms where id=p_room_id for update;
 if not found or v_room.status<>'playing' or v_room.game_id<>'puerta_o_nada'
 then return;end if;
 select * into v_match from private.door_matches where room_id=p_room_id for update;
 if not found or v_match.phase='finished' then return;end if;

 if v_match.phase='choosing' then
   select count(*) into v_alive from private.door_players
     where match_id=v_match.id and alive;
   select count(*) into v_chosen
   from private.door_choices c
   join private.door_players p on p.match_id=c.match_id and p.user_id=c.user_id
   where c.match_id=v_match.id and c.round_no=v_match.round_no and p.alive;
   if clock_timestamp()<v_match.deadline and v_chosen<v_alive then return;end if;

   -- The safe set is NEVER sent to the client during 'choosing'.
   -- No submitted choice counts as elimination; this prevents stalling.
   update private.door_players p
   set alive=false,eliminated_round=v_match.round_no
   where p.match_id=v_match.id and p.alive
     and not exists(
       select 1 from private.door_choices c
       where c.match_id=v_match.id and c.round_no=v_match.round_no
        and c.user_id=p.user_id and c.door=any(v_match.safe_doors)
        and (c.second_door is null or c.second_door=any(v_match.safe_doors))
     );
   -- Double-or-nothing: one bonus star only if BOTH selected doors are safe.
   update private.door_players p set risk_wins=p.risk_wins+1
   from private.door_choices c
   where c.match_id=p.match_id and c.user_id=p.user_id
     and c.round_no=v_match.round_no and p.match_id=v_match.id
     and p.alive and c.second_door is not null
     and c.door=any(v_match.safe_doors)
     and c.second_door=any(v_match.safe_doors);
   update private.door_matches
    set phase='reveal',deadline=clock_timestamp()+interval '4 seconds',
        updated_at=clock_timestamp()
    where id=v_match.id;
   update public.rooms set updated_at=clock_timestamp() where id=p_room_id;

 elsif v_match.phase='reveal' and clock_timestamp()>=v_match.deadline then
   select count(*) into v_alive from private.door_players
      where match_id=v_match.id and alive;
   if v_alive<=1 or v_match.round_no>=5 then
     v_winner:=null;
     if v_alive=1 then
       select user_id into v_winner from private.door_players
        where match_id=v_match.id and alive limit 1;
     elsif v_alive>1 then
       -- Risk stars can break a tie among people surviving the final round.
       select p.user_id into v_winner
       from private.door_players p where p.match_id=v_match.id and p.alive
         and p.risk_wins>0
         and p.risk_wins=(select max(q.risk_wins) from private.door_players q
                          where q.match_id=v_match.id and q.alive)
         and (select count(*) from private.door_players q
              where q.match_id=v_match.id and q.alive and
                q.risk_wins=p.risk_wins)=1
       limit 1;
     end if;
     update private.door_matches
      set phase='finished',winner_id=v_winner,updated_at=clock_timestamp()
      where id=v_match.id;
   else
     v_next:=private.door_roll(v_match.door_count,v_match.safe_count);
     update private.door_matches
      set phase='choosing',round_no=v_match.round_no+1,
          safe_doors=v_next,deadline=clock_timestamp()+interval '12 seconds',
          updated_at=clock_timestamp()
      where id=v_match.id;
   end if;
   update public.rooms set updated_at=clock_timestamp() where id=p_room_id;
 end if;
end;
$fn$;
revoke all on function private.door_tick(uuid) from public,anon,authenticated;
