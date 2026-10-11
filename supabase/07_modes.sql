-- Party Hub / 07: One shared lobby, two session types.
-- 'freeplay' = choose a single minigame; 'party' = multi-round experience.
-- No minigame mechanics are included in this release.
alter table public.rooms
  add column mode text not null default 'freeplay'
  check (mode in ('freeplay', 'party'));

create function public.set_room_mode(p_room_id uuid, p_mode text)
returns void language plpgsql security definer set search_path = ''
as $fn$
declare v_room public.rooms%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id=p_room_id for update;
  if not found or v_room.host_user_id<>(select auth.uid()) then
    raise exception 'HOST_ONLY';
  end if;
  if v_room.status <> 'lobby' then raise exception 'ROOM_NOT_IN_LOBBY'; end if;
  if p_mode is null or p_mode not in ('freeplay','party') then
    raise exception 'MODE_INVALID';
  end if;
  update public.rooms set mode=p_mode, updated_at=now() where id=p_room_id;
  update public.room_members set is_ready=false where room_id=p_room_id;
end;
$fn$;

revoke all on function public.set_room_mode(uuid,text) from public, anon;
grant execute on function public.set_room_mode(uuid,text) to authenticated;
