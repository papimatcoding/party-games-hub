-- Laser game: private round state. Only server RPCs may access these tables.
create table private.laser_matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references public.rooms(id) on delete cascade,
  phase text not null default 'planning' check (phase in ('planning','reveal','finished')),
  round_no integer not null default 1 check (round_no between 1 and 9),
  radius numeric not null default 1,
  deadline timestamptz not null,
  winner_id uuid,
  updated_at timestamptz not null default now()
);
create table private.laser_players (
  match_id uuid not null references private.laser_matches(id) on delete cascade,
  user_id uuid not null,
  display_name text not null,
  alive boolean not null default true,
  killed_round integer,
  primary key (match_id,user_id)
);
create table private.laser_moves (
  match_id uuid not null references private.laser_matches(id) on delete cascade,
  round_no integer not null,
  user_id uuid not null,
  x numeric not null,
  y numeric not null,
  angle numeric not null,
  submitted_at timestamptz not null default now(),
  primary key(match_id,round_no,user_id),
  foreign key(match_id,user_id) references private.laser_players(match_id,user_id) on delete cascade
);
create index laser_moves_round_idx on private.laser_moves(match_id,round_no);
revoke all on private.laser_matches, private.laser_players, private.laser_moves from public,anon,authenticated;

-- Regular hex: vertices (r,0), (r/2, sqrt(3)*r/2), etc.
create function private.laser_inside(p_x numeric,p_y numeric,p_radius numeric)
returns boolean language sql immutable set search_path = ''
as $$
  select p_x is not null and p_y is not null and
         p_x between -1 and 1 and p_y between -1 and 1 and
         abs(p_y) <= (sqrt(3::numeric)/2)*(p_radius-0.075) and
         sqrt(3::numeric)*abs(p_x)+abs(p_y) <= sqrt(3::numeric)*(p_radius-0.075)
$$;

-- Infinite forward ray against another player's circular hitbox.
create function private.laser_hits(
  ax numeric, ay numeric, a_angle numeric,
  bx numeric, by numeric
) returns boolean language sql immutable set search_path = ''
as $$
  select ((bx-ax)*cos(a_angle::double precision)+(by-ay)*sin(a_angle::double precision)) > 0.001
  and abs((bx-ax)*sin(a_angle::double precision)-(by-ay)*cos(a_angle::double precision)) <= 0.055
$$;
revoke all on function private.laser_inside(numeric,numeric,numeric) from public,anon,authenticated;
revoke all on function private.laser_hits(numeric,numeric,numeric,numeric,numeric) from public,anon,authenticated;
