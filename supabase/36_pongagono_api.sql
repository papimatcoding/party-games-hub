-- PONGÁGONO / 36: authenticated, rate-constrained paddle control and live state.
-- Opponent input targets remain private; the client sees actual paddle positions.
create function public.pongagono_move(p_room_id uuid,p_position double precision)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare m private.pong_matches%rowtype; p private.pong_players%rowtype; moment timestamptz;
begin
 if auth.uid() is null or not private.is_room_member(p_room_id) then
   raise exception 'NOT_A_MEMBER';
 end if;
 if p_position is null or p_position='NaN'::double precision or
    p_position<0 or p_position>1 then raise exception 'POSITION_INVALID';end if;
 perform private.pong_tick(p_room_id);
 select * into m from private.pong_matches where room_id=p_room_id;
 if not found or m.phase='finished' then raise exception 'MATCH_FINISHED';end if;
 select * into p from private.pong_players
   where match_id=m.id and user_id=auth.uid() for update;
 if not found or not p.alive then raise exception 'ELIMINATED';end if;
 moment:=clock_timestamp();
 -- Client sends at ~120 ms; additional floods cannot move a paddle faster.
 if p.last_input is null or moment-p.last_input>=interval '80 milliseconds' then
   update private.pong_players set target_u=p_position,last_input=moment
   where match_id=m.id and user_id=auth.uid();
 end if;
 return jsonb_build_object('ok',true);
end;
$fn$;

create function public.pongagono_state(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare m private.pong_matches%rowtype; v_time timestamptz;
begin
 if auth.uid() is null or not private.is_room_member(p_room_id) then
   raise exception 'NOT_A_MEMBER';
 end if;
 perform private.pong_tick(p_room_id);
 select * into m from private.pong_matches where room_id=p_room_id;
 if not found then return null;end if;
 v_time:=clock_timestamp();
 return jsonb_build_object(
  'phase',m.phase,'server_time',v_time,'sides',m.sides,
  'ball',jsonb_build_object('x',m.ball_x,'y',m.ball_y,
     'vx',m.ball_vx,'vy',m.ball_vy,'r',m.ball_radius,
     'speed',m.ball_speed),
  'paddle_ratio',m.paddle_ratio,
  'serve_until',m.serve_until,
  'bounce_count',m.bounce_count,
  'eliminations',m.elimination_count,
  'last_eliminated',m.last_eliminated_name,
  'winner_id',m.winner_id,
  'players',coalesce((
     select jsonb_agg(jsonb_build_object(
       'user_id',p.user_id,'name',p.display_name,'side',p.side_index,
       'alive',p.alive,'u',p.paddle_u
     ) order by p.side_index)
     from private.pong_players p where p.match_id=m.id
   ),'[]'::jsonb)
 );
end;
$fn$;
revoke all on function public.pongagono_move(uuid,double precision) from public,anon;
revoke all on function public.pongagono_state(uuid) from public,anon;
grant execute on function public.pongagono_move(uuid,double precision) to authenticated;
grant execute on function public.pongagono_state(uuid) to authenticated;
