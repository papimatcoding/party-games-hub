-- 69 / PUERTA O NADA: synchronized secret choices and pure RNG resolution.
create function private.door_tick(p_room_id uuid)
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
     );
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

create function public.start_puerta_o_nada(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype;n integer;missing integer;ids uuid[];names text[];
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.host_user_id<>auth.uid() then raise exception 'HOST_ONLY';end if;
 if r.status<>'lobby' or r.mode<>'freeplay' or r.game_id<>'puerta_o_nada'
 then raise exception 'WRONG_GAME';end if;
 select count(*),count(*) filter(where not is_ready) into n,missing
 from public.room_members where room_id=p_room_id;
 if n<2 or n>12 then raise exception 'NEED_TWO_PLAYERS';end if;
 if missing>0 then raise exception 'NOT_ALL_READY';end if;
 select array_agg(user_id order by joined_at,user_id),
        array_agg(display_name order by joined_at,user_id)
 into ids,names from public.room_members where room_id=p_room_id;
 perform private.door_init(p_room_id,ids,names);
 update public.rooms set status='playing',updated_at=clock_timestamp()
 where id=p_room_id;
end;
$fn$;
revoke all on function public.start_puerta_o_nada(uuid) from public,anon;
grant execute on function public.start_puerta_o_nada(uuid) to authenticated;

create function public.door_pick(p_room_id uuid,p_door integer)
returns void language plpgsql security definer set search_path=''
as $fn$
declare m private.door_matches%rowtype;r public.rooms%rowtype;
begin
 if auth.uid() is null or not private.is_room_member(p_room_id)
 then raise exception 'NOT_A_MEMBER';end if;
 perform private.require_game_running(p_room_id);
 select * into r from public.rooms where id=p_room_id;
 if not found or r.status<>'playing' or r.game_id<>'puerta_o_nada'
 then raise exception 'WRONG_GAME';end if;
 -- Serialize choices with resolution under a single room row lock.
 perform private.door_tick(p_room_id);
 select * into m from private.door_matches where room_id=p_room_id for update;
 if not found or m.phase<>'choosing' or clock_timestamp()>=m.deadline
 then raise exception 'DOORS_CLOSED';end if;
 if p_door is null or p_door<1 or p_door>m.door_count
 then raise exception 'DOOR_INVALID';end if;
 if not exists(select 1 from private.door_players
  where match_id=m.id and user_id=auth.uid() and alive)
 then raise exception 'ELIMINATED';end if;
 insert into private.door_choices(match_id,round_no,user_id,door)
 values(m.id,m.round_no,auth.uid(),p_door)
 on conflict(match_id,round_no,user_id) do update
   set door=excluded.door,submitted_at=clock_timestamp();
 perform private.door_tick(p_room_id);
end;
$fn$;
revoke all on function public.door_pick(uuid,integer) from public,anon;
grant execute on function public.door_pick(uuid,integer) to authenticated;

create function public.door_state(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare m private.door_matches%rowtype;
begin
 if auth.uid() is null or not private.is_room_member(p_room_id)
 then raise exception 'NOT_A_MEMBER';end if;
 perform private.door_tick(p_room_id);
 select * into m from private.door_matches where room_id=p_room_id;
 if not found then return null;end if;
 return jsonb_build_object(
  'phase',m.phase,'round',m.round_no,'max_rounds',5,
  'door_count',m.door_count,'safe_count',m.safe_count,
  'deadline',m.deadline,'server_time',clock_timestamp(),
  'winner_id',m.winner_id,
  'safe_doors',case when m.phase in ('reveal','finished')
    then to_jsonb(m.safe_doors) else null end,
  'my_choice',(select c.door from private.door_choices c
    where c.match_id=m.id and c.round_no=m.round_no and c.user_id=auth.uid()),
  'players',coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id',p.user_id,'name',p.display_name,
      'alive',p.alive,'eliminated_round',p.eliminated_round,
      'submitted',exists(select 1 from private.door_choices c
        where c.match_id=p.match_id and c.round_no=m.round_no and c.user_id=p.user_id),
      'choice',case when m.phase in ('reveal','finished')
        then (select c.door from private.door_choices c
          where c.match_id=p.match_id and c.round_no=m.round_no and c.user_id=p.user_id)
        else null end
    ) order by p.display_name,p.user_id)
    from private.door_players p where p.match_id=m.id
  ),'[]'::jsonb)
 );
end;
$fn$;
revoke all on function public.door_state(uuid) from public,anon;
grant execute on function public.door_state(uuid) to authenticated;
