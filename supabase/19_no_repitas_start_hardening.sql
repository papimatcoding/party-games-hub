-- Prevent legacy generic start_room from skipping the authoritative game start.
-- Only start_lasers and start_no_repitas may start their respective games.
create or replace function public.start_room(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare v_room public.rooms%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_room from public.rooms where id=p_room_id for update;
 if not found or v_room.host_user_id<>auth.uid() then
   raise exception 'HOST_ONLY';
 end if;
 if v_room.status<>'lobby' then raise exception 'ROOM_NOT_IN_LOBBY'; end if;
 raise exception 'USE_GAME_START';
end;
$fn$;
revoke all on function public.start_room(uuid) from public,anon;
