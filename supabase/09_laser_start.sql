-- Make Lasers the first playable game in freeplay rooms.
alter table public.rooms drop constraint if exists rooms_game_id_check;
alter table public.rooms add constraint rooms_game_id_check
  check(game_id in ('lasers','pool','bomb','draw','trivia'));
alter table public.rooms alter column game_id set default 'lasers';

create or replace function public.set_room_game(p_room_id uuid,p_game_id text)
returns void language plpgsql security definer set search_path = ''
as $fn$
declare v_room public.rooms%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id=p_room_id for update;
  if not found or v_room.host_user_id<>auth.uid() then raise exception 'HOST_ONLY'; end if;
  if v_room.status <> 'lobby' then raise exception 'ROOM_NOT_IN_LOBBY'; end if;
  if p_game_id is null or p_game_id not in ('lasers','pool','bomb','draw','trivia') then
    raise exception 'GAME_INVALID';
  end if;
  update public.rooms set game_id=p_game_id,updated_at=now() where id=p_room_id;
  update public.room_members set is_ready=false where room_id=p_room_id;
end;
$fn$;

-- Prevent bypassing the server-controlled Laser match flow.
create or replace function public.start_room(p_room_id uuid)
returns void language plpgsql security definer set search_path = ''
as $fn$
declare v_room public.rooms%rowtype; v_count integer; v_unready integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id=p_room_id for update;
  if not found or v_room.host_user_id<>auth.uid() then raise exception 'HOST_ONLY'; end if;
  if v_room.status <> 'lobby' then raise exception 'ROOM_NOT_IN_LOBBY'; end if;
  if v_room.mode='party' then raise exception 'PARTY_COMING_SOON'; end if;
  if v_room.game_id='lasers' then raise exception 'USE_LASER_START'; end if;
  select count(*),count(*) filter (where not is_ready)
    into v_count,v_unready from public.room_members where room_id=p_room_id;
  if v_count<2 then raise exception 'NEED_TWO_PLAYERS'; end if;
  if v_unready>0 then raise exception 'NOT_ALL_READY'; end if;
  update public.rooms set status='playing',updated_at=now() where id=p_room_id;
end;
$fn$;

create function public.start_lasers(p_room_id uuid)
returns void language plpgsql security definer set search_path = ''
as $fn$
declare v_room public.rooms%rowtype; v_match uuid; v_count integer; v_unready integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id=p_room_id for update;
  if not found or v_room.host_user_id<>auth.uid() then raise exception 'HOST_ONLY'; end if;
  if v_room.status<>'lobby' then raise exception 'ROOM_NOT_IN_LOBBY'; end if;
  if v_room.mode<>'freeplay' or v_room.game_id<>'lasers' then raise exception 'WRONG_GAME'; end if;
  select count(*),count(*) filter (where not is_ready)
    into v_count,v_unready from public.room_members where room_id=p_room_id;
  if v_count<2 then raise exception 'NEED_TWO_PLAYERS'; end if;
  if v_unready>0 then raise exception 'NOT_ALL_READY'; end if;
  delete from private.laser_matches where room_id=p_room_id;
  insert into private.laser_matches(room_id,deadline)
    values(p_room_id,now()+interval '25 seconds') returning id into v_match;
  insert into private.laser_players(match_id,user_id,display_name)
    select v_match,user_id,display_name from public.room_members where room_id=p_room_id;
  update public.rooms set status='playing',updated_at=now() where id=p_room_id;
end;
$fn$;
revoke all on function public.set_room_game(uuid,text) from public,anon;
revoke all on function public.start_room(uuid) from public,anon;
revoke all on function public.start_lasers(uuid) from public,anon;
grant execute on function public.start_lasers(uuid) to authenticated;
