-- Party Hub / 02: atomic create, join, leave.
create function public.create_room(p_name text, p_max_players integer default 8)
returns table (room_id uuid, room_code text)
language plpgsql security definer set search_path = ''
as $fn$
declare v_id uuid; v_code text; v_attempt integer;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_name is null or char_length(btrim(p_name)) not between 2 and 20 then
    raise exception 'NAME_INVALID';
  end if;
  if p_max_players is null or p_max_players not between 2 and 12 then
    raise exception 'CAPACITY_INVALID';
  end if;
  for v_attempt in 1..15 loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      insert into public.rooms (code, host_user_id, max_players)
        values (v_code, (select auth.uid()), p_max_players)
        returning id into v_id;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  if v_id is null then raise exception 'CODE_UNAVAILABLE'; end if;
  insert into public.room_members(room_id, user_id, display_name)
    values(v_id, (select auth.uid()), btrim(p_name));
  return query select v_id, v_code;
end;
$fn$;

create function public.join_room(p_code text, p_name text)
returns uuid language plpgsql security definer set search_path = ''
as $fn$
declare v_room public.rooms%rowtype; v_code text;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_name is null or char_length(btrim(p_name)) not between 2 and 20 then
    raise exception 'NAME_INVALID';
  end if;
  v_code := upper(btrim(coalesce(p_code, '')));
  if v_code !~ '^[0-9A-F]{6}$' then raise exception 'CODE_INVALID'; end if;
  select * into v_room from public.rooms where code=v_code for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if exists(select 1 from public.room_members
            where room_id=v_room.id and user_id=(select auth.uid())) then
    return v_room.id;
  end if;
  if v_room.status <> 'lobby' then raise exception 'ROOM_ALREADY_STARTED'; end if;
  if (select count(*) from public.room_members where room_id=v_room.id) >= v_room.max_players then
    raise exception 'ROOM_FULL';
  end if;
  insert into public.room_members(room_id,user_id,display_name)
    values(v_room.id,(select auth.uid()),btrim(p_name));
  update public.rooms set updated_at=now() where id=v_room.id;
  return v_room.id;
end;
$fn$;

create function public.leave_room(p_room_id uuid)
returns void language plpgsql security definer set search_path = ''
as $fn$
declare v_room public.rooms%rowtype; v_next uuid;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id=p_room_id for update;
  if not found then return; end if;
  if not private.is_room_member(p_room_id) then raise exception 'NOT_A_MEMBER'; end if;
  delete from public.room_members
    where room_id=p_room_id and user_id=(select auth.uid());
  select user_id into v_next from public.room_members
    where room_id=p_room_id order by joined_at,user_id limit 1;
  if v_next is null then
    delete from public.rooms where id=p_room_id;
  elsif v_room.host_user_id=(select auth.uid()) then
    update public.rooms set host_user_id=v_next,status='lobby',updated_at=now()
      where id=p_room_id;
    update public.room_members set is_ready=false where room_id=p_room_id;
  else
    update public.rooms set updated_at=now() where id=p_room_id;
  end if;
end;
$fn$;
