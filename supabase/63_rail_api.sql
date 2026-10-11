-- 63: authenticated game RPCs; clients never submit coordinates or hit claims.
create function public.start_fin_de_linea(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype;n integer;pending integer;uids uuid[];names text[];
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.host_user_id<>auth.uid() then raise exception 'HOST_ONLY';end if;
 if r.status<>'lobby' or r.mode<>'freeplay' or r.game_id<>'fin_de_linea'
 then raise exception 'WRONG_GAME';end if;
 select count(*),count(*) filter(where not is_ready) into n,pending
 from public.room_members where room_id=p_room_id;
 if n<2 or n>12 then raise exception 'NEED_TWO_PLAYERS';end if;
 if pending>0 then raise exception 'NOT_ALL_READY';end if;
 select array_agg(user_id order by joined_at,user_id),
        array_agg(display_name order by joined_at,user_id)
 into uids,names from public.room_members where room_id=p_room_id;
 perform private.rail_init(p_room_id,uids,names);
 update public.rooms set status='playing',updated_at=clock_timestamp() where id=p_room_id;
end;
$fn$;
revoke all on function public.start_fin_de_linea(uuid) from public,anon;
grant execute on function public.start_fin_de_linea(uuid) to authenticated;

create function public.rail_action(p_room_id uuid,p_intent integer default null,p_fire boolean default false)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype;m private.rail_matches%rowtype;
 p private.rail_players%rowtype;moment timestamptz:=clock_timestamp();
 hx integer;hy integer;shot boolean:=false;
begin
 if auth.uid() is null or not private.is_room_member(p_room_id) then
   raise exception 'NOT_A_MEMBER';end if;
 perform private.require_game_running(p_room_id);
 select * into r from public.rooms where id=p_room_id;
 if not found or r.status<>'playing' or r.game_id<>'fin_de_linea'
 then raise exception 'WRONG_GAME';end if;
 if p_intent is not null and p_intent not between -1 and 1 then
   raise exception 'INVALID_TURN';end if;
 perform private.rail_tick(p_room_id);
 select * into m from private.rail_matches where room_id=p_room_id for update;
 if not found or m.phase<>'running' then raise exception 'MATCH_FINISHED';end if;
 select * into p from private.rail_players
 where match_id=m.id and user_id=auth.uid() for update;
 if not found or not p.alive then raise exception 'ELIMINATED';end if;
 if p_intent is not null then
  update private.rail_players set intent=p_intent
  where match_id=m.id and user_id=p.user_id;
 end if;
 if coalesce(p_fire,false) and moment-p.last_shot_at>=interval '1100 milliseconds' then
   hx:=case p.direction when 0 then 1 when 2 then -1 else 0 end;
   hy:=case p.direction when 1 then 1 when 3 then -1 else 0 end;
   insert into private.rail_projectiles(match_id,shooter_id,x,y,vx,vy,expires_at)
   values(m.id,p.user_id,p.pos_x+hx*.51,p.pos_y+hy*.51,
     hx*8.5,hy*8.5,moment+interval '1600 milliseconds');
   update private.rail_players set last_shot_at=moment
   where match_id=m.id and user_id=p.user_id;
   shot:=true;
 end if;
 return jsonb_build_object('shot',shot,'turn',coalesce(p_intent,p.intent),'at',moment);
end;
$fn$;
revoke all on function public.rail_action(uuid,integer,boolean) from public,anon;
grant execute on function public.rail_action(uuid,integer,boolean) to authenticated;

create function public.rail_state(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare m private.rail_matches%rowtype;
begin
 if auth.uid() is null or not private.is_room_member(p_room_id)
 then raise exception 'NOT_A_MEMBER';end if;
 perform private.rail_tick(p_room_id);
 select * into m from private.rail_matches where room_id=p_room_id;
 if not found then return null;end if;
 return jsonb_build_object(
  'phase',m.phase,'deadline',m.deadline,'winner_id',m.winner_id,
  'last_tick',m.last_tick,'server_time',clock_timestamp(),
  'eliminations',m.elimination_count,'speed',2.25,'projectile_speed',8.5,
  'players',coalesce((
   select jsonb_agg(jsonb_build_object(
    'user_id',p.user_id,'name',p.display_name,
    'x',p.pos_x,'y',p.pos_y,'next_x',p.next_x,'next_y',p.next_y,
    'direction',p.direction,'intent',p.intent,'hp',p.hp,'alive',p.alive,
    'hits',p.hits,'kills',p.kills,'eliminated_order',p.eliminated_order,
    'cooldown_until',p.last_shot_at+interval '1100 milliseconds'
   ) order by p.display_name,p.user_id)
   from private.rail_players p where p.match_id=m.id
  ),'[]'::jsonb),
  'projectiles',coalesce((
   select jsonb_agg(jsonb_build_object(
     'id',b.id,'shooter',b.shooter_id,'x',b.x,'y',b.y,
     'vx',b.vx,'vy',b.vy
   ) order by b.id)
   from private.rail_projectiles b where b.match_id=m.id
  ),'[]'::jsonb)
 );
end;
$fn$;
revoke all on function public.rail_state(uuid) from public,anon;
grant execute on function public.rail_state(uuid) to authenticated;

create or replace function public.set_room_game(p_room_id uuid,p_game_id text)
returns void language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.host_user_id<>auth.uid() then raise exception 'HOST_ONLY';end if;
 if r.status<>'lobby' then raise exception 'ROOM_NOT_IN_LOBBY';end if;
 if p_game_id is null or p_game_id not in
   ('lasers','no_repitas','patinazo','pongagono','lavalabras','fin_de_linea')
 then raise exception 'GAME_NOT_AVAILABLE';end if;
 update public.rooms set game_id=p_game_id,updated_at=clock_timestamp() where id=p_room_id;
 update public.room_members set is_ready=false where room_id=p_room_id;
end;
$fn$;
revoke all on function public.set_room_game(uuid,text) from public,anon;
grant execute on function public.set_room_game(uuid,text) to authenticated;
