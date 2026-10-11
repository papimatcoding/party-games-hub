-- LAVALABRAS / 39. Fifth arcade mode with secret validated answers and rising lava.
alter table public.rooms drop constraint if exists rooms_game_id_check;
alter table public.rooms add constraint rooms_game_id_check
 check(game_id in ('lasers','no_repitas','patinazo','pongagono','lavalabras','pool','bomb','draw','trivia'));

create table private.lava_matches (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null unique references public.rooms(id) on delete cascade,
 phase text not null default 'writing' check(phase in ('writing','reveal','finished')),
 round_no integer not null default 1 check(round_no between 1 and 12),
 topic_id text not null references private.nr_topics(id),
 lava_height integer not null default 0 check(lava_height>=0),
 deadline timestamptz not null default now()+interval '24 seconds',
 winner_id uuid,
 updated_at timestamptz not null default now()
);
create table private.lava_players (
 match_id uuid not null references private.lava_matches(id) on delete cascade,
 user_id uuid not null,
 display_name text not null,
 height integer not null default 0 check(height>=0),
 alive boolean not null default true,
 eliminated_round integer,
 primary key(match_id,user_id)
);
create table private.lava_rounds (
 match_id uuid not null references private.lava_matches(id) on delete cascade,
 round_no integer not null check(round_no between 1 and 12),
 topic_id text not null references private.nr_topics(id),
 lava_before integer not null,
 lava_after integer,
 primary key(match_id,round_no)
);
create table private.lava_answers (
 match_id uuid not null,
 round_no integer not null,
 user_id uuid not null,
 raw_answer text not null check(char_length(raw_answer) between 1 and 65),
 answer_key text not null,
 entry_id bigint,
 gain integer,
 verdict text check(verdict in ('valid','invalid')),
 submitted_at timestamptz not null default now(),
 primary key(match_id,round_no,user_id),
 foreign key(match_id,user_id) references private.lava_players(match_id,user_id) on delete cascade,
 foreign key(match_id,round_no) references private.lava_rounds(match_id,round_no) on delete cascade
);
revoke all on private.lava_matches,private.lava_players,private.lava_rounds,private.lava_answers
 from public,anon,authenticated;

-- Only broad, curated answer banks with at least 40 entries are used here.
-- Multiword proper names are accepted as terms; spaces/punctuation add zero blocks.
create function private.lava_choose_topic(p_match_id uuid,p_round integer)
returns text language plpgsql volatile set search_path=''
as $fn$
declare v_topic text;
begin
 select t.id into v_topic from private.nr_topics t
 join private.nr_entries e on e.topic_id=t.id
 where t.active and t.id in ('animales','paises','elementos','pokemon_kanto',
    'instrumentos','marcas_coches','barca','provincias_es')
 and (p_round=1 or t.id<>(
    select prev.topic_id from private.lava_rounds prev
    where prev.match_id=p_match_id and prev.round_no=p_round-1
 ))
 group by t.id
 having count(*)>=40
 order by
    -- Prefer unused topics; after the eight categories are played, recycle.
    (select count(*) from private.lava_rounds prev
     where prev.match_id=p_match_id and prev.topic_id=t.id),
    random()
 limit 1;
 return v_topic;
end;
$fn$;
revoke all on function private.lava_choose_topic(uuid,integer) from public,anon,authenticated;

create or replace function public.set_room_game(p_room_id uuid,p_game_id text)
returns void language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.host_user_id<>auth.uid() then raise exception 'HOST_ONLY'; end if;
 if r.status<>'lobby' then raise exception 'ROOM_NOT_IN_LOBBY'; end if;
 if p_game_id is null or p_game_id not in
   ('lasers','no_repitas','patinazo','pongagono','lavalabras') then
   raise exception 'GAME_NOT_AVAILABLE'; end if;
 update public.rooms set game_id=p_game_id,updated_at=now() where id=p_room_id;
 update public.room_members set is_ready=false where room_id=p_room_id;
end;
$fn$;
revoke all on function public.set_room_game(uuid,text) from public,anon;

create function public.start_lavalabras(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype; v_count integer; v_unready integer;
        v_match uuid; v_topic text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.host_user_id<>auth.uid() then raise exception 'HOST_ONLY'; end if;
 if r.status<>'lobby' then raise exception 'ROOM_NOT_IN_LOBBY'; end if;
 if r.mode<>'freeplay' or r.game_id<>'lavalabras' then raise exception 'WRONG_GAME'; end if;
 select count(*),count(*) filter(where not is_ready) into v_count,v_unready
 from public.room_members where room_id=p_room_id;
 if v_count<2 or v_count>12 then raise exception 'NEED_TWO_PLAYERS'; end if;
 if v_unready>0 then raise exception 'NOT_ALL_READY'; end if;
 delete from private.lava_matches where room_id=p_room_id;
 insert into private.lava_matches(room_id,topic_id)
 values(p_room_id,'animales') returning id into v_match;
 v_topic:=private.lava_choose_topic(v_match,1);
 if v_topic is null then raise exception 'NO_SUITABLE_TOPIC'; end if;
 update private.lava_matches set topic_id=v_topic where id=v_match;
 insert into private.lava_rounds(match_id,round_no,topic_id,lava_before)
 values(v_match,1,v_topic,0);
 insert into private.lava_players(match_id,user_id,display_name)
 select v_match,user_id,display_name from public.room_members where room_id=p_room_id;
 update public.rooms set status='playing',updated_at=now() where id=p_room_id;
end;
$fn$;
revoke all on function public.start_lavalabras(uuid) from public,anon;
grant execute on function public.start_lavalabras(uuid) to authenticated;
