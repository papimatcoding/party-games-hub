-- PARTY MODE / 42. Extensible medal circuit and locked-in schedules.
-- This release scaffolds the FIVE-game circuit. Automatic game handoff and
-- authoritative medal assignment are intentionally not active yet.
create table private.party_sessions (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null unique references public.rooms(id) on delete cascade,
 set_size integer not null default 5 check(set_size in (5,10,15,20)),
 status text not null default 'configured'
   check(status in ('configured','playing','finished')),
 current_slot integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table private.party_slots (
 session_id uuid not null references private.party_sessions(id) on delete cascade,
 slot integer not null check(slot between 1 and 20),
 game_id text not null check(game_id in
 ('lasers','no_repitas','patinazo','pongagono','lavalabras')),
 completed_at timestamptz,
 primary key(session_id,slot)
);
create table private.party_medals (
 session_id uuid not null,
 slot integer not null,
 user_id uuid not null,
 rank integer not null check(rank between 1 and 3),
 awarded_at timestamptz not null default now(),
 primary key(session_id,slot,user_id),
 foreign key(session_id,slot) references private.party_slots(session_id,slot)
   on delete cascade
);
create index party_medals_user on private.party_medals(session_id,user_id);
revoke all on private.party_sessions,private.party_slots,private.party_medals
 from public,anon,authenticated;

-- Ranking uses medal POINTS (gold=3, silver=2, bronze=1); when equal, compare
-- counts of gold, then silver, then bronze medals.
create function private.party_medal_score(p_gold integer,p_silver integer,p_bronze integer)
returns integer language sql immutable set search_path=''
as $fn$ select coalesce(p_gold,0)*3+coalesce(p_silver,0)*2+coalesce(p_bronze,0) $fn$;
revoke all on function private.party_medal_score(integer,integer,integer)
 from public,anon,authenticated;

create function public.party_prepare(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype;sid uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.host_user_id<>auth.uid() then raise exception 'HOST_ONLY';end if;
 if r.status<>'lobby' then raise exception 'ROOM_NOT_IN_LOBBY';end if;
 if r.mode<>'party' then raise exception 'WRONG_MODE';end if;
 if exists(select 1 from private.party_sessions
   where room_id=p_room_id and status<>'configured') then
   raise exception 'CIRCUIT_ALREADY_STARTED';end if;
 delete from private.party_sessions where room_id=p_room_id;
 insert into private.party_sessions(room_id,set_size)
 values(p_room_id,5) returning id into sid;
 insert into private.party_slots(session_id,slot,game_id)
 select sid,row_number() over(order by random())::integer,game_id
 from unnest(array['lasers','no_repitas','patinazo','pongagono','lavalabras']) as game_id;
 update public.room_members set is_ready=false where room_id=p_room_id;
 update public.rooms set updated_at=now() where id=p_room_id;
end;
$fn$;

create function public.party_state(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_session private.party_sessions%rowtype;
begin
 if auth.uid() is null or not private.is_room_member(p_room_id) then
   raise exception 'NOT_A_MEMBER';end if;
 select * into v_session from private.party_sessions where room_id=p_room_id;
 return jsonb_build_object(
  'enabled',v_session.id is not null,
  'length',coalesce(v_session.set_size,5),
  'status',coalesce(v_session.status,'not_prepared'),
  'current_slot',coalesce(v_session.current_slot,1),
  'future_formats',jsonb_build_array(10,15,20),
  'scores',coalesce((
   select jsonb_agg(jsonb_build_object(
      'user_id',p.user_id,'name',p.display_name,
      'gold',s.g,'silver',s.s,'bronze',s.b,
      'score',private.party_medal_score(s.g,s.s,s.b)
   ) order by private.party_medal_score(s.g,s.s,s.b) desc,s.g desc,s.s desc,s.b desc,p.display_name)
   from public.room_members p
   cross join lateral (
     select count(*) filter(where rank=1) as g,
            count(*) filter(where rank=2) as s,
            count(*) filter(where rank=3) as b
     from private.party_medals a
     where a.session_id=v_session.id and a.user_id=p.user_id
   ) s
   where p.room_id=p_room_id
  ),'[]'::jsonb),
  'schedule',coalesce((
   select jsonb_agg(jsonb_build_object(
    'slot',s.slot,'game',s.game_id,'completed',s.completed_at is not null
   ) order by s.slot)
   from private.party_slots s where s.session_id=v_session.id
  ),'[]'::jsonb)
 );
end;
$fn$;

revoke all on function public.party_prepare(uuid) from public,anon;
revoke all on function public.party_state(uuid) from public,anon;
grant execute on function public.party_prepare(uuid) to authenticated;
grant execute on function public.party_state(uuid) to authenticated;
