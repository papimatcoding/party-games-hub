-- 72: Door upgrade, 6/8/9 hidden doors and optional double-or-nothing.
-- Chance is still uniform; risk stars break ties only at equal survival rounds.
alter table private.door_matches drop constraint door_matches_door_count_check;
alter table private.door_matches add constraint door_matches_door_count_check
 check(door_count between 3 and 9);
alter table private.door_choices drop constraint door_choices_door_check;
alter table private.door_choices add constraint door_choices_door_check
 check(door between 1 and 9);
alter table private.door_choices add column second_door integer;
alter table private.door_choices add constraint door_second_distinct_check
 check(second_door is null or (second_door between 1 and 9 and second_door<>door));
alter table private.door_players add column risk_wins integer not null default 0
 check(risk_wins between 0 and 5);

create or replace function private.door_init(p_room_id uuid,p_user_ids uuid[],p_names text[])
returns uuid language plpgsql security definer set search_path=''
as $fn$
declare v_match uuid; n integer;v_doors integer;v_safe integer;i integer;
begin
 n:=coalesce(array_length(p_user_ids,1),0);
 if n<2 or n>12 or n is distinct from array_length(p_names,1)
 then raise exception 'NEED_TWO_PLAYERS';end if;
 -- 2-3: 2/3 safe; 4-7: 3/4 safe; 8-12: 3/5 safe.
 -- Five rounds keeps even small-group matches short.
 v_doors:=case when n<=3 then 6 when n<=7 then 8 else 9 end;
 v_safe:=case when n<=3 then 4 when n<=7 then 5 else 6 end;
 delete from private.door_matches where room_id=p_room_id;
 insert into private.door_matches(room_id,door_count,safe_count,safe_doors)
 values(p_room_id,v_doors,v_safe,private.door_roll(v_doors,v_safe))
 returning id into v_match;
 for i in 1..n loop
   insert into private.door_players(match_id,user_id,display_name)
   values(v_match,p_user_ids[i],p_names[i]);
 end loop;
 return v_match;
end;
$fn$;
revoke all on function private.door_init(uuid,uuid[],text[]) from public,anon,authenticated;
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
create or replace function public.door_pick(p_room_id uuid,p_door integer)
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
   set door=excluded.door,second_door=null,submitted_at=clock_timestamp();
 perform private.door_tick(p_room_id);
end;
$fn$;
revoke all on function public.door_pick(uuid,integer) from public,anon;
grant execute on function public.door_pick(uuid,integer) to authenticated;

create function public.door_pick_double(p_room_id uuid,p_first integer,p_second integer)
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
 perform private.door_tick(p_room_id);
 select * into m from private.door_matches where room_id=p_room_id for update;
 if not found or m.phase<>'choosing' or clock_timestamp()>=m.deadline
 then raise exception 'DOORS_CLOSED';end if;
 if p_first is null or p_second is null or
    p_first<1 or p_first>m.door_count or
    p_second<1 or p_second>m.door_count or p_first=p_second
 then raise exception 'DOOR_INVALID';end if;
 if not exists(select 1 from private.door_players
    where match_id=m.id and user_id=auth.uid() and alive)
 then raise exception 'ELIMINATED';end if;
 insert into private.door_choices(match_id,round_no,user_id,door,second_door)
 values(m.id,m.round_no,auth.uid(),p_first,p_second)
 on conflict(match_id,round_no,user_id) do update
 set door=excluded.door,second_door=excluded.second_door,
   submitted_at=clock_timestamp();
 perform private.door_tick(p_room_id);
end;
$fn$;
revoke all on function public.door_pick_double(uuid,integer,integer) from public,anon;
grant execute on function public.door_pick_double(uuid,integer,integer) to authenticated;

create or replace function public.door_state(p_room_id uuid)
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
  'my_second_choice',(select c.second_door from private.door_choices c
    where c.match_id=m.id and c.round_no=m.round_no and c.user_id=auth.uid()),
  'my_choice',(select c.door from private.door_choices c
    where c.match_id=m.id and c.round_no=m.round_no and c.user_id=auth.uid()),
  'players',coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id',p.user_id,'name',p.display_name,
      'alive',p.alive,'eliminated_round',p.eliminated_round,
      'risk_wins',p.risk_wins,
      'submitted',exists(select 1 from private.door_choices c
        where c.match_id=p.match_id and c.round_no=m.round_no and c.user_id=p.user_id),
      'second_choice',case when m.phase in ('reveal','finished')
        then (select c.second_door from private.door_choices c
          where c.match_id=p.match_id and c.round_no=m.round_no and c.user_id=p.user_id)
        else null end,
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
create or replace function private.party_award(p_session uuid,p_slot integer,p_game text,p_room_id uuid)
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
 else raise exception 'GAME_NOT_AVAILABLE';
 end if;
end;
$fn$;
revoke all on function private.party_award(uuid,integer,text,uuid) from public,anon,authenticated;
