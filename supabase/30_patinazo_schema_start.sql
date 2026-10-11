-- PATINAZO / 30. Secret directions and authoritative replay.
alter table public.rooms drop constraint if exists rooms_game_id_check;
alter table public.rooms add constraint rooms_game_id_check
  check(game_id in ('lasers','no_repitas','patinazo','pool','bomb','draw','trivia'));

create table private.ice_matches(
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references public.rooms(id) on delete cascade,
  sides integer not null check(sides between 4 and 12),
  round_no integer not null default 1 check(round_no between 1 and 10),
  phase text not null default 'planning' check(phase in ('planning','reveal','finished')),
  deadline timestamptz not null,
  revealed_at timestamptz,
  replay jsonb,
  terminal boolean not null default false,
  winner_id uuid,
  updated_at timestamptz not null default now()
);
create table private.ice_players(
  match_id uuid not null references private.ice_matches(id) on delete cascade,
  user_id uuid not null,
  display_name text not null,
  corner_index integer not null,
  alive boolean not null default true,
  eliminated_round integer,
  primary key(match_id,user_id),
  unique(match_id,corner_index)
);
create table private.ice_moves(
  match_id uuid not null,
  round_no integer not null,
  user_id uuid not null,
  angle numeric not null,
  submitted_at timestamptz not null default now(),
  primary key(match_id,round_no,user_id),
  foreign key(match_id,user_id) references private.ice_players(match_id,user_id) on delete cascade
);
create index ice_moves_match_round on private.ice_moves(match_id,round_no);
revoke all on private.ice_matches,private.ice_players,private.ice_moves from public,anon,authenticated;

create function private.ice_inside(p_x double precision,p_y double precision,p_sides integer)
returns boolean language plpgsql immutable set search_path=''
as $fn$
declare k integer; edge_angle double precision; theta double precision;
begin
  if p_sides<4 or p_sides>12 or not isfinite(p_x) or not isfinite(p_y) then return false; end if;
  theta:=case when p_sides=4 then pi()/4 else -pi()/2 end;
  for k in 0..p_sides-1 loop
    edge_angle:=theta+(k+0.5)*2*pi()/p_sides;
    -- Center of the avatar must be 0.074 world units inside the edge.
    if p_x*cos(edge_angle)+p_y*sin(edge_angle)>cos(pi()/p_sides)-0.074 then
      return false;
    end if;
  end loop;
  return true;
end;
$fn$;
revoke all on function private.ice_inside(double precision,double precision,integer) from public,anon,authenticated;

create or replace function public.set_room_game(p_room_id uuid,p_game_id text)
returns void language plpgsql security definer set search_path=''
as $fn$
declare v_room public.rooms%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id=p_room_id for update;
  if not found or v_room.host_user_id<>auth.uid() then raise exception 'HOST_ONLY'; end if;
  if v_room.status<>'lobby' then raise exception 'ROOM_NOT_IN_LOBBY'; end if;
  if p_game_id is null or p_game_id not in ('lasers','no_repitas','patinazo') then
    raise exception 'GAME_NOT_AVAILABLE';
  end if;
  update public.rooms set game_id=p_game_id,updated_at=now() where id=p_room_id;
  update public.room_members set is_ready=false where room_id=p_room_id;
end;
$fn$;
revoke all on function public.set_room_game(uuid,text) from public,anon;

create function public.start_patinazo(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare v_room public.rooms%rowtype; v_count integer; v_unready integer; v_match uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id=p_room_id for update;
  if not found or v_room.host_user_id<>auth.uid() then raise exception 'HOST_ONLY'; end if;
  if v_room.status<>'lobby' then raise exception 'ROOM_NOT_IN_LOBBY'; end if;
  if v_room.mode<>'freeplay' or v_room.game_id<>'patinazo' then raise exception 'WRONG_GAME'; end if;
  select count(*),count(*) filter(where not is_ready)
    into v_count,v_unready from public.room_members where room_id=p_room_id;
  if v_count<2 or v_count>12 then raise exception 'NEED_TWO_PLAYERS'; end if;
  if v_unready>0 then raise exception 'NOT_ALL_READY'; end if;
  delete from private.ice_matches where room_id=p_room_id;
  insert into private.ice_matches(room_id,sides,deadline)
    values(p_room_id,greatest(4,v_count),now()+interval '18 seconds')
    returning id into v_match;
  -- Sample distinct polygon vertices without replacement, randomized per match.
  with randomized_corners as (
    select pos,(row_number() over(order by random())-1)::integer rank
    from generate_series(0,greatest(4,v_count)-1) as pos
  ), randomized_players as (
    select user_id,display_name,(row_number() over(order by random())-1)::integer rank
    from public.room_members where room_id=p_room_id
  )
  insert into private.ice_players(match_id,user_id,display_name,corner_index)
  select v_match,p.user_id,p.display_name,c.pos
  from randomized_players p join randomized_corners c on c.rank=p.rank;
  update public.rooms set status='playing',updated_at=now() where id=p_room_id;
end;
$fn$;
revoke all on function public.start_patinazo(uuid) from public,anon;
grant execute on function public.start_patinazo(uuid) to authenticated;
