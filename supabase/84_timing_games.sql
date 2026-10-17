-- 84: Two timing games sharing one authoritative, room-scoped engine.
create table private.timing_matches(
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null unique references public.rooms(id) on delete cascade,
 game_id text not null check(game_id in ('ya','aguanta')),
 target_ms integer not null check(target_ms between 6000 and 18000),
 hide_ms integer not null check(hide_ms between 2600 and 3400),
 fall_ms integer not null check(fall_ms between 3500 and 7500),
 phase text not null default 'running' check(phase in ('running','finished')),
 winner_id uuid,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);
create table private.timing_players(
 match_id uuid not null references private.timing_matches(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null,
 stopped_ms integer,
 error_ms integer,
 crushed boolean not null default false,
 submitted_at timestamptz,
 primary key(match_id,user_id),
 check(stopped_ms is null or stopped_ms>=0),
 check(error_ms is null or error_ms>=0)
);
create index on private.timing_players(match_id,submitted_at);
revoke all on private.timing_matches,private.timing_players from public,anon,authenticated;

create function private.timing_init(p_room uuid,p_game text,p_ids uuid[],p_names text[])
returns uuid language plpgsql security definer set search_path=''
as $fn$
declare mid uuid;i int;
begin
 if p_game not in ('ya','aguanta') or array_length(p_ids,1) is null or
    array_length(p_ids,1)<2 or array_length(p_ids,1)>12 or
    array_length(p_ids,1)<>array_length(p_names,1)
 then raise exception 'TIMING_INVALID_START';end if;
 delete from private.timing_matches where room_id=p_room;
 insert into private.timing_matches(room_id,game_id,target_ms,hide_ms,fall_ms)
 values(p_room,p_game,
   8000+floor(random()*8001)::integer,
   2800+floor(random()*401)::integer,
   4500+floor(random()*1501)::integer)
 returning id into mid;
 for i in 1..array_length(p_ids,1) loop
  insert into private.timing_players(match_id,user_id,display_name)
  values(mid,p_ids[i],p_names[i]);
 end loop;
 return mid;
end;
$fn$;
revoke all on function private.timing_init(uuid,text,uuid[],text[]) from public,anon,authenticated;

create function private.timing_tick(p_room uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare m private.timing_matches%rowtype; g private.game_gates%rowtype;
 end_at timestamptz; total int; submitted int; first_user uuid;
begin
 select * into m from private.timing_matches where room_id=p_room for update;
 if not found or m.phase='finished' then return;end if;
 select * into g from private.game_gates where room_id=p_room;
 if g.live_at is null or clock_timestamp()<g.live_at then return;end if;
 select count(*),count(*) filter(where stopped_ms is not null) into total,submitted
 from private.timing_players where match_id=m.id;
 end_at:=g.live_at+((case when m.game_id='ya' then m.target_ms+3000
                      else m.fall_ms+350 end)*interval '1 millisecond');
 if submitted<total and clock_timestamp()<end_at then return;end if;
 -- Absent players receive a loss, not an artificial perfect zero.
 update private.timing_players
 set stopped_ms=case when m.game_id='ya' then m.target_ms+3000 else m.fall_ms+350 end,
     error_ms=case when m.game_id='ya' then 3000 else 100000 end,
     crushed=(m.game_id='aguanta'),submitted_at=clock_timestamp()
 where match_id=m.id and stopped_ms is null;
 select user_id into first_user from private.timing_players
 where match_id=m.id and not crushed
 order by error_ms,user_id limit 1;
 update private.timing_matches set phase='finished',winner_id=first_user,
    updated_at=clock_timestamp() where id=m.id;
 update public.rooms set updated_at=clock_timestamp() where id=p_room;
end;
$fn$;
revoke all on function private.timing_tick(uuid) from public,anon,authenticated;

create function public.timing_stop(p_room_id uuid,p_elapsed_ms integer)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare m private.timing_matches%rowtype;g private.game_gates%rowtype;
 server_elapsed int;value_ms int;crushed_now boolean;error_value int;
begin
 if auth.uid() is null or not private.is_room_member(p_room_id) then raise exception 'NOT_A_MEMBER';end if;
 perform private.require_game_running(p_room_id);
 select * into m from private.timing_matches where room_id=p_room_id for update;
 if not found or m.phase<>'running' then raise exception 'MATCH_FINISHED';end if;
 select * into g from private.game_gates where room_id=p_room_id;
 if g.live_at is null or clock_timestamp()<g.live_at then raise exception 'NOT_STARTED';end if;
 if exists(select 1 from private.timing_players where match_id=m.id and user_id=auth.uid()
  and stopped_ms is not null) then raise exception 'ALREADY_STOPPED';end if;
 server_elapsed:=floor(extract(epoch from clock_timestamp()-g.live_at)*1000)::int;
 if p_elapsed_ms is null or p_elapsed_ms<0 or p_elapsed_ms>22000
   or p_elapsed_ms>server_elapsed+90 or p_elapsed_ms<server_elapsed-450
 then raise exception 'TIMING_CLOCK_MISMATCH';end if;
 value_ms:=p_elapsed_ms;
 if m.game_id='ya' then
  crushed_now:=false;
  error_value:=abs(value_ms-m.target_ms);
 else
  crushed_now:=value_ms>=m.fall_ms;
  error_value:=case when crushed_now then 100000+value_ms-m.fall_ms
   else m.fall_ms-value_ms end;
 end if;
 update private.timing_players
 set stopped_ms=value_ms,error_ms=error_value,crushed=crushed_now,
     submitted_at=clock_timestamp()
 where match_id=m.id and user_id=auth.uid();
 if not found then raise exception 'NOT_A_MEMBER';end if;
 perform private.timing_tick(p_room_id);
 return jsonb_build_object('accepted',true,'stopped_ms',value_ms,'crushed',crushed_now);
end;
$fn$;
revoke all on function public.timing_stop(uuid,integer) from public,anon;
grant execute on function public.timing_stop(uuid,integer) to authenticated;

create function public.timing_state(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare m private.timing_matches%rowtype;g private.game_gates%rowtype;
begin
 if auth.uid() is null or not private.is_room_member(p_room_id) then raise exception 'NOT_A_MEMBER';end if;
 perform private.timing_tick(p_room_id);
 select * into m from private.timing_matches where room_id=p_room_id;
 if not found then raise exception 'MATCH_NOT_AVAILABLE';end if;
 select * into g from private.game_gates where room_id=p_room_id;
 return jsonb_build_object('game',m.game_id,'phase',
 case when g.live_at is null or clock_timestamp()<g.live_at then 'waiting' else m.phase end,
 'server_time',clock_timestamp(),'start_at',g.live_at,'target_ms',m.target_ms,
 'hide_ms',m.hide_ms,'fall_ms',m.fall_ms,'winner_id',m.winner_id,
 'players',coalesce((
 select jsonb_agg(jsonb_build_object(
  'user_id',p.user_id,'name',p.display_name,'submitted',p.stopped_ms is not null,
  'stopped_ms',case when m.phase='finished' or p.user_id=auth.uid() then p.stopped_ms else null end,
  'error_ms',case when m.phase='finished' then p.error_ms else null end,
  'crushed',case when m.phase='finished' then p.crushed else null end,
  'place',case when m.phase='finished' then (
    select 1+count(*) from private.timing_players other
    where other.match_id=m.id and (other.crushed,other.error_ms,other.user_id)
      < (p.crushed,p.error_ms,p.user_id)
  ) else null end
 ) order by p.display_name,p.user_id)
 from private.timing_players p where p.match_id=m.id),'[]'::jsonb)
 );
end;
$fn$;
revoke all on function public.timing_state(uuid) from public,anon;
grant execute on function public.timing_state(uuid) to authenticated;

create function public.start_timing(p_room_id uuid,p_game text)
returns void language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype;n integer;pending integer;uids uuid[];names text[];
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.host_user_id<>auth.uid() then raise exception 'HOST_ONLY';end if;
 if r.status<>'lobby' or r.mode<>'freeplay' or r.game_id<>p_game or p_game not in ('ya','aguanta')
 then raise exception 'WRONG_GAME';end if;
 select count(*),count(*) filter(where not is_ready) into n,pending
 from public.room_members where room_id=p_room_id;
 if n<2 or n>12 then raise exception 'NEED_TWO_PLAYERS';end if;
 if pending>0 then raise exception 'NOT_ALL_READY';end if;
 select array_agg(user_id order by joined_at,user_id),
        array_agg(display_name order by joined_at,user_id) into uids,names
 from public.room_members where room_id=p_room_id;
 perform private.timing_init(p_room_id,p_game,uids,names);
 update public.rooms set status='playing',updated_at=clock_timestamp() where id=p_room_id;
end;
$fn$;
revoke all on function public.start_timing(uuid,text) from public,anon;
grant execute on function public.start_timing(uuid,text) to authenticated;
