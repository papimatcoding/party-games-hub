-- PARTY HUB / 53: reject outdated clients BEFORE lobby readiness or match start.
-- Version is a gameplay protocol version; bump with incompatible code changes.
create table private.client_protocol(
 singleton boolean primary key default true check(singleton),
 required_build text not null
);
insert into private.client_protocol(singleton,required_build)
values(true,'0.9.0');
revoke all on private.client_protocol from public,anon,authenticated;

alter table public.room_members add column client_build text;
alter table public.room_members add column client_checked_at timestamptz;

create function public.client_checkin(p_room_id uuid,p_build text)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare needed text; r public.rooms%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or not private.is_room_member(p_room_id) then raise exception 'NOT_A_MEMBER';end if;
 select required_build into needed from private.client_protocol where singleton;
 if p_build is distinct from needed then
   update public.room_members set client_build=null,client_checked_at=null,is_ready=false
   where room_id=p_room_id and user_id=auth.uid();
   raise exception 'VERSION_MISMATCH expected % got %',needed,coalesce(p_build,'none');
 end if;
 update public.room_members
 set client_build=needed,client_checked_at=clock_timestamp()
 where room_id=p_room_id and user_id=auth.uid();
 return jsonb_build_object('build',needed,'valid',true);
end;
$fn$;
revoke all on function public.client_checkin(uuid,text) from public,anon;
grant execute on function public.client_checkin(uuid,text) to authenticated;

create function public.required_client_build()
returns text language sql stable security definer set search_path=''
as $fn$ select required_build from private.client_protocol where singleton $fn$;
revoke all on function public.required_client_build() from public,anon;
grant execute on function public.required_client_build() to authenticated;

create or replace function public.set_room_ready(p_room_id uuid,p_ready boolean)
returns void language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype;needed text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.status<>'lobby' then raise exception 'ROOM_NOT_IN_LOBBY';end if;
 select required_build into needed from private.client_protocol where singleton;
 update public.room_members
 set is_ready=coalesce(p_ready,false)
 where room_id=p_room_id and user_id=auth.uid()
  and client_build=needed and client_checked_at is not null;
 if not found then raise exception 'CLIENT_VERSION_OUTDATED';end if;
end;
$fn$;
revoke all on function public.set_room_ready(uuid,boolean) from public,anon;
grant execute on function public.set_room_ready(uuid,boolean) to authenticated;

create function private.require_compatible_room_launch()
returns trigger language plpgsql security definer set search_path=''
as $fn$
declare needed text;
begin
 if new.status='playing' and old.status is distinct from 'playing' then
   select required_build into needed from private.client_protocol where singleton;
   if exists(select 1 from public.room_members p where p.room_id=new.id
     and (p.client_build is distinct from needed or p.client_checked_at is null)) then
     raise exception 'ROOM_HAS_OUTDATED_CLIENT';
   end if;
 end if;
 return new;
end;
$fn$;
revoke all on function private.require_compatible_room_launch() from public,anon,authenticated;
create trigger room_compatible_launch before update of status
on public.rooms for each row execute function private.require_compatible_room_launch();

-- Old lobby-ready flags are invalidated immediately on a new incompatible build.
update public.room_members p set is_ready=false
from public.rooms r where r.id=p.room_id and r.status='lobby';
