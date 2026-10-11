-- Party Hub / 01: schema + read-only access for members.
-- Execute in a NEW, dedicated Supabase project, not Troll Golf.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[0-9A-F]{6}$'),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby', 'playing')),
  game_id text not null default 'pool' check (game_id in ('pool','bomb','draw','trivia')),
  max_players integer not null default 8 check (max_players between 2 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 20),
  is_ready boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id,user_id)
);
create index room_members_user_idx on public.room_members(user_id);

create table public.room_messages (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 240),
  created_at timestamptz not null default now()
);
create index room_messages_recent_idx on public.room_messages(room_id,created_at desc);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_messages enable row level security;

-- Direct writes are not exposed: clients must use the checked RPC API.
revoke all on public.rooms, public.room_members, public.room_messages from anon, authenticated;
grant select on public.rooms, public.room_members, public.room_messages to authenticated;

create function private.is_room_member(p_room_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $fn$
  select (select auth.uid()) is not null and exists (
    select 1 from public.room_members m
    where m.room_id=p_room_id and m.user_id=(select auth.uid())
  );
$fn$;
revoke all on function private.is_room_member(uuid) from public, anon;
grant execute on function private.is_room_member(uuid) to authenticated;

create policy "Only room members can see room" on public.rooms
  for select to authenticated using (private.is_room_member(id));
create policy "Only room members can see roster" on public.room_members
  for select to authenticated using (private.is_room_member(room_id));
create policy "Only room members can read chat" on public.room_messages
  for select to authenticated using (private.is_room_member(room_id));
