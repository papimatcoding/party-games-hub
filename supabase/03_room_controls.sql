-- Party Hub / 03: readiness, host-only room controls.
create function public.set_room_ready(p_room_id uuid, p_ready boolean)
returns void language plpgsql security definer set search_path = ''
as $fn$
declare v_status text;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  select status into v_status from public.rooms where id=p_room_id for update;
  if v_status is distinct from 'lobby' then raise exception 'ROOM_NOT_IN_LOBBY'; end if;
  update public.room_members set is_ready=coalesce(p_ready,false)
    where room_id=p_room_id and user_id=(select auth.uid());
  if not found then raise exception 'NOT_A_MEMBER'; end if;
end;
$fn$;

create function public.set_room_game(p_room_id uuid, p_game_id text)
returns void language plpgsql security definer set search_path = ''
as $fn$
declare v_room public.rooms%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id=p_room_id for update;
  if not found or v_room.host_user_id<>(select auth.uid()) then raise exception 'HOST_ONLY'; end if;
  if v_room.status <> 'lobby' then raise exception 'ROOM_NOT_IN_LOBBY'; end if;
  if p_game_id is null or p_game_id not in ('pool','bomb','draw','trivia') then
    raise exception 'GAME_INVALID';
  end if;
  update public.rooms set game_id=p_game_id,updated_at=now() where id=p_room_id;
  update public.room_members set is_ready=false where room_id=p_room_id;
end;
$fn$;

create function public.start_room(p_room_id uuid)
returns void language plpgsql security definer set search_path = ''
as $fn$
declare v_room public.rooms%rowtype; v_count integer; v_unready integer;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id=p_room_id for update;
  if not found or v_room.host_user_id<>(select auth.uid()) then raise exception 'HOST_ONLY'; end if;
  if v_room.status <> 'lobby' then raise exception 'ROOM_NOT_IN_LOBBY'; end if;
  select count(*),count(*) filter (where not is_ready)
    into v_count,v_unready from public.room_members where room_id=p_room_id;
  if v_count < 2 then raise exception 'NEED_TWO_PLAYERS'; end if;
  if v_unready > 0 then raise exception 'NOT_ALL_READY'; end if;
  update public.rooms set status='playing',updated_at=now() where id=p_room_id;
end;
$fn$;

create function public.reset_room(p_room_id uuid)
returns void language plpgsql security definer set search_path = ''
as $fn$
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  perform 1 from public.rooms where id=p_room_id and host_user_id=(select auth.uid()) for update;
  if not found then raise exception 'HOST_ONLY'; end if;
  update public.rooms set status='lobby',updated_at=now() where id=p_room_id;
  update public.room_members set is_ready=false where room_id=p_room_id;
end;
$fn$;

create function public.kick_room_member(p_room_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $fn$
declare v_room public.rooms%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id=p_room_id for update;
  if not found or v_room.host_user_id<>(select auth.uid()) then raise exception 'HOST_ONLY'; end if;
  if p_user_id is null or p_user_id=v_room.host_user_id then raise exception 'CANNOT_KICK_HOST'; end if;
  delete from public.room_members where room_id=p_room_id and user_id=p_user_id;
  update public.rooms set status='lobby',updated_at=now() where id=p_room_id;
  update public.room_members set is_ready=false where room_id=p_room_id;
end;
$fn$;
