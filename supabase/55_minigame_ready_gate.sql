-- PARTY HUB / 55: per-minigame in-game ready gate and shared 3s start signal.
-- Host entering a match no longer starts its countdown before players can load.
alter table public.room_members
 add column game_ready boolean not null default false;

create table private.game_gates(
 room_id uuid primary key references public.rooms(id) on delete cascade,
 game_id text not null,
 created_at timestamptz not null default clock_timestamp(),
 live_at timestamptz
);
revoke all on private.game_gates from public,anon,authenticated;

create function private.game_is_live(p_room_id uuid)
returns boolean language sql stable security definer set search_path=''
as $fn$
 select coalesce((select g.live_at is not null and clock_timestamp()>=g.live_at
   from private.game_gates g where g.room_id=p_room_id),true)
$fn$;
revoke all on function private.game_is_live(uuid) from public,anon,authenticated;

create function private.require_game_running(p_room_id uuid)
returns void language plpgsql stable security definer set search_path=''
as $fn$
begin
 if not private.game_is_live(p_room_id) then
   raise exception 'WAITING_FOR_ALL_PLAYERS';
 end if;
end;
$fn$;
revoke all on function private.require_game_running(uuid) from public,anon,authenticated;

create function private.game_gate_reset()
returns trigger language plpgsql security definer set search_path=''
as $fn$
begin
 if new.status='playing' and
    (old.status is distinct from new.status or old.game_id is distinct from new.game_id) then
   insert into private.game_gates(room_id,game_id,live_at,created_at)
     values(new.id,new.game_id,null,clock_timestamp())
   on conflict(room_id) do update
     set game_id=excluded.game_id,live_at=null,created_at=excluded.created_at;
   update public.room_members set game_ready=false where room_id=new.id;
 end if;
 return null;
end;
$fn$;
revoke all on function private.game_gate_reset() from public,anon,authenticated;
create trigger reset_game_gate_on_match_start
 after update of status,game_id on public.rooms
 for each row execute function private.game_gate_reset();

create function public.game_gate_state(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype;g private.game_gates%rowtype;
 needed text;
begin
 if auth.uid() is null or not private.is_room_member(p_room_id) then
   raise exception 'NOT_A_MEMBER';end if;
 select * into r from public.rooms where id=p_room_id;
 select * into g from private.game_gates where room_id=p_room_id;
 select required_build into needed from private.client_protocol where singleton;
 return jsonb_build_object(
  'active',r.status='playing' and g.room_id is not null,
  'game_id',r.game_id,'live_at',g.live_at,'required_build',needed,
  'my_ready',coalesce((select rm.game_ready from public.room_members rm
    where rm.room_id=p_room_id and rm.user_id=auth.uid()),false),
  'ready_count',(select count(*) from public.room_members rm
    where rm.room_id=p_room_id and rm.game_ready),
  'ready_total',(select count(*) from public.room_members rm where rm.room_id=p_room_id),
  'server_time',clock_timestamp()
 );
end;
$fn$;
revoke all on function public.game_gate_state(uuid) from public,anon;
grant execute on function public.game_gate_state(uuid) to authenticated;

create function public.game_gate_ready(p_room_id uuid,p_ready boolean default true)
returns void language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype;g private.game_gates%rowtype;needed text;
 pending integer;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.status<>'playing' or not private.is_room_member(p_room_id) then
  raise exception 'MATCH_NOT_AVAILABLE';end if;
 select * into g from private.game_gates where room_id=p_room_id for update;
 if not found then raise exception 'GAME_GATE_MISSING';end if;
 if g.live_at is not null then return;end if;
 select required_build into needed from private.client_protocol where singleton;
 update public.room_members set game_ready=coalesce(p_ready,true)
 where room_id=p_room_id and user_id=auth.uid() and client_build=needed;
 if not found then raise exception 'CLIENT_VERSION_OUTDATED';end if;

 select count(*) into pending from public.room_members rm where rm.room_id=p_room_id
   and (not rm.game_ready or rm.client_build is distinct from needed);
 if pending=0 and (select count(*) from public.room_members where room_id=p_room_id)>=2 then
   update private.game_gates set live_at=clock_timestamp()+interval '3 seconds'
     where room_id=p_room_id;
   -- Every deadline is reset by the SERVER when players have opted in.
   if r.game_id='lasers' then
     update private.laser_matches set deadline=clock_timestamp()+interval '28 seconds'
       where room_id=p_room_id and phase='planning';
   elsif r.game_id='no_repitas' then
     update private.nr_matches set deadline=clock_timestamp()+interval '28 seconds'
       where room_id=p_room_id and phase='writing';
   elsif r.game_id='patinazo' then
     update private.ice_matches set deadline=clock_timestamp()+interval '21 seconds'
       where room_id=p_room_id and phase='planning';
   elsif r.game_id='pongagono' then
     update private.pong_matches set last_tick=clock_timestamp()+interval '3 seconds',
       serve_until=clock_timestamp()+interval '5.5 seconds'
       where room_id=p_room_id and phase='serve';
   elsif r.game_id='lavalabras' then
     update private.lava_matches set deadline=clock_timestamp()+interval '27 seconds'
       where room_id=p_room_id and phase='writing';
   end if;
   update public.rooms set updated_at=clock_timestamp() where id=p_room_id;
 end if;
end;
$fn$;
revoke all on function public.game_gate_ready(uuid,boolean) from public,anon;
grant execute on function public.game_gate_ready(uuid,boolean) to authenticated;
