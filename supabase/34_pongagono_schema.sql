-- PONGÁGONO / 34: fourth free-play mode. Never expose simulation tables.
alter table public.rooms drop constraint if exists rooms_game_id_check;
alter table public.rooms add constraint rooms_game_id_check
 check(game_id in ('lasers','no_repitas','patinazo','pongagono','pool','bomb','draw','trivia'));

create table private.pong_matches (
 id uuid primary key default gen_random_uuid(),
 room_id uuid unique not null references public.rooms(id) on delete cascade,
 sides integer not null check(sides between 4 and 12),
 phase text not null default 'serve' check(phase in ('serve','live','finished')),
 ball_x double precision not null default 0,
 ball_y double precision not null default 0,
 ball_vx double precision not null default 0,
 ball_vy double precision not null default 0,
 ball_speed double precision not null default 0.66,
 bounce_count integer not null default 0,
 paddle_ratio double precision not null,
 ball_radius double precision not null default 0.039,
 last_tick timestamptz not null default clock_timestamp(),
 serve_until timestamptz not null default clock_timestamp() + interval '2.5 seconds',
 winner_id uuid,
 elimination_count integer not null default 0,
 last_eliminated_name text,
 updated_at timestamptz not null default now()
);
create table private.pong_players (
 match_id uuid not null references private.pong_matches(id) on delete cascade,
 user_id uuid not null,
 display_name text not null,
 side_index integer not null,
 paddle_u double precision not null default 0.5 check(paddle_u between 0 and 1),
 target_u double precision not null default 0.5 check(target_u between 0 and 1),
 last_input timestamptz,
 alive boolean not null default true,
 primary key(match_id,user_id),
 unique(match_id,side_index)
);
revoke all on private.pong_matches,private.pong_players from public,anon,authenticated;

create function private.pong_paddle_ratio(p_sides integer)
returns double precision language sql immutable set search_path=''
as $fn$
 select case when p_sides<=4 then 0.38 else least(0.64,0.41+(p_sides-4)*0.033) end
$fn$;
revoke all on function private.pong_paddle_ratio(integer) from public,anon,authenticated;

create or replace function public.set_room_game(p_room_id uuid,p_game_id text)
returns void language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.host_user_id<>auth.uid() then raise exception 'HOST_ONLY'; end if;
 if r.status<>'lobby' then raise exception 'ROOM_NOT_IN_LOBBY'; end if;
 if p_game_id is null or p_game_id not in ('lasers','no_repitas','patinazo','pongagono') then
   raise exception 'GAME_NOT_AVAILABLE'; end if;
 update public.rooms set game_id=p_game_id,updated_at=now() where id=p_room_id;
 update public.room_members set is_ready=false where room_id=p_room_id;
end;
$fn$;
revoke all on function public.set_room_game(uuid,text) from public,anon;

create function public.start_pongagono(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype; v_count integer; v_unready integer;
        v_match uuid; v_sides integer; first_side integer;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.host_user_id<>auth.uid() then raise exception 'HOST_ONLY'; end if;
 if r.status<>'lobby' then raise exception 'ROOM_NOT_IN_LOBBY'; end if;
 if r.mode<>'freeplay' or r.game_id<>'pongagono' then raise exception 'WRONG_GAME'; end if;
 select count(*),count(*) filter(where not is_ready)
 into v_count,v_unready from public.room_members where room_id=p_room_id;
 if v_count<2 or v_count>12 then raise exception 'NEED_TWO_PLAYERS'; end if;
 if v_unready>0 then raise exception 'NOT_ALL_READY'; end if;
 v_sides:=greatest(4,v_count);
 delete from private.pong_matches where room_id=p_room_id;
 insert into private.pong_matches(room_id,sides,paddle_ratio)
 values(p_room_id,v_sides,private.pong_paddle_ratio(v_sides))
 returning id into v_match;
 first_side:=floor(random()*4)::integer;
 if v_count=2 then
   -- Opposite goals are fairer than neighboring goals in a 1v1 square.
   with p as (
     select user_id,display_name,row_number() over(order by random())-1 as ix
       from public.room_members where room_id=p_room_id
   )
   insert into private.pong_players(match_id,user_id,display_name,side_index)
     select v_match,user_id,display_name,mod(first_side+ix::integer*2,4) from p;
 else
   with randomized_sides as (
     select n,row_number() over(order by random())-1 as ix
       from generate_series(0,v_sides-1) as n
   ), randomized_players as (
     select user_id,display_name,row_number() over(order by random())-1 as ix
       from public.room_members where room_id=p_room_id
   )
   insert into private.pong_players(match_id,user_id,display_name,side_index)
     select v_match,p.user_id,p.display_name,s.n
     from randomized_players p join randomized_sides s on p.ix=s.ix;
 end if;
 -- A randomized first serve favors an active goal; the direction is authoritative.
 perform private.pong_serve(v_match,2.5);
 update public.rooms set status='playing',updated_at=now() where id=p_room_id;
end;
$fn$;
revoke all on function public.start_pongagono(uuid) from public,anon;
grant execute on function public.start_pongagono(uuid) to authenticated;
