-- PARTY / 50: host departure cannot orphan a half-played circuit.
create or replace function public.leave_room(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype; v_next uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found then return;end if;
 if not private.is_room_member(p_room_id) then raise exception 'NOT_A_MEMBER';end if;
 if r.mode='party' and r.status='playing' and r.host_user_id=auth.uid() then
    -- Host departure ends the event for everyone and returns them to the lobby.
    perform public.party_exit(p_room_id);
 end if;
 delete from public.room_members where room_id=p_room_id and user_id=auth.uid();
 select user_id into v_next from public.room_members
 where room_id=p_room_id order by joined_at,user_id limit 1;
 if v_next is null then
   delete from public.rooms where id=p_room_id;
 elsif r.host_user_id=auth.uid() then
   update public.rooms set host_user_id=v_next,status='lobby',updated_at=clock_timestamp()
   where id=p_room_id;
   update public.room_members set is_ready=false where room_id=p_room_id;
 else
   update public.rooms set updated_at=clock_timestamp() where id=p_room_id;
 end if;
end;
$fn$;
revoke all on function public.leave_room(uuid) from public,anon;
grant execute on function public.leave_room(uuid) to authenticated;

create or replace function public.kick_room_member(p_room_id uuid,p_user_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.host_user_id<>auth.uid() then raise exception 'HOST_ONLY';end if;
 if r.status='playing' and r.mode='party' then raise exception 'PARTY_USE_CANCEL';end if;
 if p_user_id is null or p_user_id=r.host_user_id then raise exception 'CANNOT_KICK_HOST';end if;
 delete from public.room_members where room_id=p_room_id and user_id=p_user_id;
 update public.rooms set status='lobby',updated_at=clock_timestamp() where id=p_room_id;
 update public.room_members set is_ready=false where room_id=p_room_id;
end;
$fn$;
revoke all on function public.kick_room_member(uuid,uuid) from public,anon;
grant execute on function public.kick_room_member(uuid,uuid) to authenticated;
