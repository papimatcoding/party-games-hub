-- 68 / PUERTA O NADA: private RNG + simultaneous door choices.
-- All doors are pure chance: no colors, patterns, hints or deterministic tells.
alter table public.rooms drop constraint if exists rooms_game_id_check;
alter table public.rooms add constraint rooms_game_id_check check(game_id in
 ('lasers','no_repitas','patinazo','pongagono','lavalabras','fin_de_linea','puerta_o_nada','pool','bomb','draw','trivia'));

create table private.door_matches(
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null unique references public.rooms(id) on delete cascade,
 phase text not null default 'choosing' check(phase in ('choosing','reveal','finished')),
 round_no integer not null default 1 check(round_no between 1 and 5),
 door_count integer not null check(door_count between 3 and 5),
 safe_count integer not null check(safe_count>=1 and safe_count<=door_count),
 safe_doors integer[] not null,
 deadline timestamptz not null default clock_timestamp()+interval '12 seconds',
 winner_id uuid,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);
create table private.door_players(
 match_id uuid not null references private.door_matches(id) on delete cascade,
 user_id uuid not null,
 display_name text not null,
 alive boolean not null default true,
 eliminated_round integer,
 primary key(match_id,user_id)
);
create table private.door_choices(
 match_id uuid not null references private.door_matches(id) on delete cascade,
 round_no integer not null check(round_no between 1 and 5),
 user_id uuid not null,
 door integer not null check(door between 1 and 5),
 submitted_at timestamptz not null default clock_timestamp(),
 primary key(match_id,round_no,user_id),
 foreign key(match_id,user_id) references private.door_players(match_id,user_id) on delete cascade
);
create index door_choices_round on private.door_choices(match_id,round_no);
revoke all on private.door_matches,private.door_players,private.door_choices
 from public,anon,authenticated;

create function private.door_roll(p_count integer,p_safe integer)
returns integer[] language sql volatile set search_path=''
as $fn$
 select coalesce(array_agg(selected.door order by selected.door),'{}'::integer[])
 from (
   select g as door from generate_series(1,p_count) g order by random() limit p_safe
 ) selected
$fn$;
revoke all on function private.door_roll(integer,integer) from public,anon,authenticated;

create function private.door_init(p_room_id uuid,p_user_ids uuid[],p_names text[])
returns uuid language plpgsql security definer set search_path=''
as $fn$
declare v_match uuid; n integer;v_doors integer;v_safe integer;i integer;
begin
 n:=coalesce(array_length(p_user_ids,1),0);
 if n<2 or n>12 or n is distinct from array_length(p_names,1)
 then raise exception 'NEED_TWO_PLAYERS';end if;
 -- 2-3: 2/3 safe; 4-7: 3/4 safe; 8-12: 3/5 safe.
 -- Five rounds keeps even small-group matches short.
 v_doors:=case when n<=3 then 3 when n<=7 then 4 else 5 end;
 v_safe:=case when n<=3 then 2 else 3 end;
 delete from private.door_matches where room_id=p_room_id;
 insert into private.door_matches(room_id,door_count,safe_count,safe_doors)
 values(p_room_id,v_doors,v_safe,private.door_roll(v_doors,v_safe))
 returning id into v_match;
 for i in 1..n loop
   insert into private.door_players(match_id,user_id,display_name)
   values(v_match,p_user_ids[i],p_names[i]);
 end loop;
 return v_match;
end;
$fn$;
revoke all on function private.door_init(uuid,uuid[],text[]) from public,anon,authenticated;
