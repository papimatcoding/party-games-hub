-- Party Hub / 05: revoke implicit PUBLIC function execution; expose to authenticated guests only.
revoke all on function public.create_room(text,integer) from public, anon;
revoke all on function public.join_room(text,text) from public, anon;
revoke all on function public.leave_room(uuid) from public, anon;
revoke all on function public.set_room_ready(uuid,boolean) from public, anon;
revoke all on function public.set_room_game(uuid,text) from public, anon;
revoke all on function public.start_room(uuid) from public, anon;
revoke all on function public.reset_room(uuid) from public, anon;
revoke all on function public.kick_room_member(uuid,uuid) from public, anon;
revoke all on function public.send_room_message(uuid,text) from public, anon;

grant execute on function public.create_room(text,integer) to authenticated;
grant execute on function public.join_room(text,text) to authenticated;
grant execute on function public.leave_room(uuid) to authenticated;
grant execute on function public.set_room_ready(uuid,boolean) to authenticated;
grant execute on function public.set_room_game(uuid,text) to authenticated;
grant execute on function public.start_room(uuid) to authenticated;
grant execute on function public.reset_room(uuid) to authenticated;
grant execute on function public.kick_room_member(uuid,uuid) to authenticated;
grant execute on function public.send_room_message(uuid,text) to authenticated;
