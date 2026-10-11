-- PARTY / 49: cancel/reset clears private game state as well as medals.
create or replace function public.party_exit(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.host_user_id<>auth.uid() then raise exception 'HOST_ONLY';end if;
 if r.mode<>'party' then raise exception 'WRONG_MODE';end if;
 delete from private.party_sessions where room_id=p_room_id;
 -- Remove old private matches, answers and moves by cascade so no submitted
 -- action can mutate a stale game after the party has been cancelled.
 delete from private.laser_matches where room_id=p_room_id;
 delete from private.nr_matches where room_id=p_room_id;
 delete from private.ice_matches where room_id=p_room_id;
 delete from private.pong_matches where room_id=p_room_id;
 delete from private.lava_matches where room_id=p_room_id;
 update public.rooms set status='lobby',updated_at=clock_timestamp()
 where id=p_room_id;
 update public.room_members set is_ready=false where room_id=p_room_id;
 -- Prepare a fresh shuffled five-game circuit so the host can replay.
 perform public.party_prepare(p_room_id);
end;
$fn$;
revoke all on function public.party_exit(uuid) from public,anon;
grant execute on function public.party_exit(uuid) to authenticated;
