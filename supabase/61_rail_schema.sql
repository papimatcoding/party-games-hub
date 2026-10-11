-- 61: ¡FIN DE LÍNEA! authoritative orthogonal rail-combat foundation.
-- World: 16x13, track intersections x in (2,5,8,11,14), y in (2,5,8,11).
-- Tracks are straight horizontal and vertical segments, forming loops and junctions.
create table private.rail_matches(
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null unique references public.rooms(id) on delete cascade,
 phase text not null default 'running' check(phase in ('running','finished')),
 last_tick timestamptz not null default clock_timestamp(),
 deadline timestamptz not null default clock_timestamp()+interval '135 seconds',
 winner_id uuid,
 elimination_count integer not null default 0,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);
create table private.rail_players(
 match_id uuid not null references private.rail_matches(id) on delete cascade,
 user_id uuid not null,
 display_name text not null,
 pos_x double precision not null,
 pos_y double precision not null,
 next_x double precision not null,
 next_y double precision not null,
 direction integer not null check(direction between 0 and 3),
 intent integer not null default 0 check(intent between -1 and 1),
 hp integer not null default 2 check(hp between 0 and 2),
 alive boolean not null default true,
 hits integer not null default 0,
 kills integer not null default 0,
 eliminated_order integer,
 last_shot_at timestamptz not null default clock_timestamp()-interval '10 seconds',
 primary key(match_id,user_id)
);
create table private.rail_projectiles(
 id bigint generated always as identity primary key,
 match_id uuid not null references private.rail_matches(id) on delete cascade,
 shooter_id uuid not null,
 x double precision not null,
 y double precision not null,
 vx double precision not null,
 vy double precision not null,
 expires_at timestamptz not null
);
create index rail_projectiles_match on private.rail_projectiles(match_id);
revoke all on private.rail_matches,private.rail_players,private.rail_projectiles from public,anon,authenticated;
alter table public.rooms drop constraint if exists rooms_game_id_check;
alter table public.rooms add constraint rooms_game_id_check
 check(game_id in ('lasers','no_repitas','patinazo','pongagono','lavalabras','fin_de_linea','pool','bomb','draw','trivia'));

-- Choose only on-axis edges. A direction is E=0 S=1 W=2 N=3.
create function private.rail_allowed(p_x integer,p_y integer,p_dir integer)
returns boolean language sql immutable set search_path=''
as $fn$
select case p_dir
when 0 then p_x<14
when 1 then p_y<11
when 2 then p_x>2
when 3 then p_y>2
else false end
and p_x between 2 and 14 and p_y between 2 and 11
and mod(p_x-2,3)=0 and mod(p_y-2,3)=0
$fn$;
revoke all on function private.rail_allowed(integer,integer,integer) from public,anon,authenticated;

create function private.rail_next_dir(p_x integer,p_y integer,p_current integer,p_intent integer)
returns integer language plpgsql immutable set search_path=''
as $fn$
declare desired integer;candidate integer;
begin
 desired:=mod(p_current+coalesce(p_intent,0)+4,4);
 if p_intent<>0 and private.rail_allowed(p_x,p_y,desired) then return desired;end if;
 if private.rail_allowed(p_x,p_y,p_current) then return p_current;end if;
 candidate:=mod(p_current+3,4);
 if private.rail_allowed(p_x,p_y,candidate) then return candidate;end if;
 candidate:=mod(p_current+1,4);
 if private.rail_allowed(p_x,p_y,candidate) then return candidate;end if;
 return mod(p_current+2,4);
end;
$fn$;
revoke all on function private.rail_next_dir(integer,integer,integer,integer) from public,anon,authenticated;

create function private.rail_init(p_room_id uuid,p_user_ids uuid[],p_names text[])
returns uuid language plpgsql security definer set search_path=''
as $fn$
declare mid uuid;n integer;i integer;spawn integer;xx integer;yy integer;dir integer;
 coords integer[];indices integer[]:='{}'; remaining integer[];
begin
 n:=coalesce(array_length(p_user_ids,1),0);
 if n<2 or n>12 or n<>coalesce(array_length(p_names,1),0) then raise exception 'NEED_TWO_PLAYERS';end if;
 delete from private.rail_matches where room_id=p_room_id;
 insert into private.rail_matches(room_id) values(p_room_id) returning id into mid;
 select array_agg(t.i order by random()) into indices from generate_series(0,19) t(i);
 for i in 1..n loop
  spawn:=indices[i];
  xx:=2+mod(spawn,5)*3;
  yy:=2+(spawn/5)*3;
  -- Fair mixed starting headings, guaranteed track-connected.
  dir:=mod(floor(random()*4)::integer,4);
  if not private.rail_allowed(xx,yy,dir) then
    dir:=private.rail_next_dir(xx,yy,dir,0);
  end if;
  insert into private.rail_players(match_id,user_id,display_name,
     pos_x,pos_y,next_x,next_y,direction)
  values(mid,p_user_ids[i],p_names[i],xx,yy,
   xx+(case dir when 0 then 3 when 2 then -3 else 0 end),
   yy+(case dir when 1 then 3 when 3 then -3 else 0 end),dir);
 end loop;
 return mid;
end;
$fn$;
revoke all on function private.rail_init(uuid,uuid[],text[]) from public,anon,authenticated;
