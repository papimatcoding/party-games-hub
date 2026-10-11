-- Party Hub / 04: chat uses server-validated room membership.
create function public.send_room_message(p_room_id uuid, p_body text)
returns void language plpgsql security definer set search_path = ''
as $fn$
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 240 then
    raise exception 'MESSAGE_INVALID';
  end if;
  perform 1 from public.rooms where id=p_room_id for update;
  if not found or not private.is_room_member(p_room_id) then
    raise exception 'NOT_A_MEMBER';
  end if;
  if exists(select 1 from public.room_messages
    where room_id=p_room_id and author_user_id=(select auth.uid())
      and created_at > now()-interval '1 second') then
    raise exception 'SLOW_DOWN';
  end if;
  insert into public.room_messages(room_id,author_user_id,body)
    values(p_room_id,(select auth.uid()),btrim(p_body));
end;
$fn$;
