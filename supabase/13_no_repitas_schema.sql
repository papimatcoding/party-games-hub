-- NO REPITAS! / 13. Server-owned categories and answer catalogs.
-- No client can query these tables: RLS in public is unchanged.
create table private.nr_topics(
 id text primary key check(id ~ '^[a-z_]+$'),
 title text not null,
 hint text not null,
 min_players integer not null default 2,
 max_players integer not null default 12,
 active boolean not null default true,
 check(min_players between 2 and 12 and max_players between min_players and 12)
);
create table private.nr_entries(
 id bigint generated always as identity primary key,
 topic_id text not null references private.nr_topics(id) on delete cascade,
 label text not null,
 entry_key text not null,
 unique(topic_id,entry_key),
 unique(topic_id,id)
);
create table private.nr_aliases(
 topic_id text not null references private.nr_topics(id) on delete cascade,
 alias_key text not null,
 entry_id bigint not null,
 primary key(topic_id,alias_key),
 foreign key(topic_id,entry_id) references private.nr_entries(topic_id,id) on delete cascade
);

create function private.nr_normalize(p_text text)
returns text language sql immutable set search_path=''
as $$
 select btrim(regexp_replace(
   translate(lower(btrim(coalesce(p_text,''))),
     'áàäâéèëêíìïîóòöôúùüûñç',
     'aaaaeeeeiiiioooouuuunc'),
   '[^[:alnum:]]+', ' ', 'g'))
$$;
revoke all on function private.nr_normalize(text) from public,anon,authenticated;

create table private.nr_matches(
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null unique references public.rooms(id) on delete cascade,
 topic_id text not null references private.nr_topics(id),
 phase text not null default 'writing' check (phase in ('writing','reveal','finished')),
 round_no integer not null default 1 check (round_no between 1 and 12),
 deadline timestamptz not null,
 winner_id uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table private.nr_players(
 match_id uuid not null references private.nr_matches(id) on delete cascade,
 user_id uuid not null,
 display_name text not null,
 alive boolean not null default true,
 eliminated_round integer,
 primary key(match_id,user_id)
);
create table private.nr_responses(
 match_id uuid not null references private.nr_matches(id) on delete cascade,
 round_no integer not null,
 user_id uuid not null,
 raw_answer text not null check(char_length(raw_answer) between 1 and 65),
 answer_key text not null,
 entry_id bigint,
 verdict text,
 submitted_at timestamptz not null default now(),
 primary key(match_id,round_no,user_id),
 foreign key(match_id,user_id) references private.nr_players(match_id,user_id) on delete cascade
);
create index nr_responses_history on private.nr_responses(match_id,round_no,answer_key);

-- Only trusted server functions operate on these objects.
revoke all on private.nr_topics,private.nr_entries,private.nr_aliases,private.nr_matches,private.nr_players,private.nr_responses
 from public,anon,authenticated;
