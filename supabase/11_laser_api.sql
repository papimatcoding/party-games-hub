-- Only the owner may submit a placement. Other players' moves live in private schema.
create function public.submit_laser_move(
  p_room_id uuid,p_x numeric,p_y numeric,p_angle numeric
) returns void language plpgsql security definer set search_path = ''
as $fn$
declare v_match private.laser_matches%rowtype;
begin
  if auth.uid() is null or not private.is_room_member(p_room_id) then raise exception 'NOT_A_MEMBER'; end if;
  perform private.laser_tick(p_room_id);
  select * into v_match from private.laser_matches where room_id=p_room_id for update;
  if not found or v_match.phase<>'planning' or now()>=v_match.deadline then
    raise exception 'PLANNING_CLOSED';
  end if;
  if not private.laser_inside(p_x,p_y,v_match.radius) then
    raise exception 'OUTSIDE_HEX';
  end if;
  if p_angle is null or p_angle<0 or p_angle>=6.283185307180 then
    raise exception 'ANGLE_INVALID';
  end if;
  if not exists(select 1 from private.laser_players
                where match_id=v_match.id and user_id=auth.uid() and alive) then
    raise exception 'ELIMINATED';
  end if;
  insert into private.laser_moves(match_id,round_no,user_id,x,y,angle)
    values(v_match.id,v_match.round_no,auth.uid(),p_x,p_y,p_angle)
    on conflict(match_id,round_no,user_id) do update
      set x=excluded.x,y=excluded.y,angle=excluded.angle,submitted_at=now();
  perform private.laser_tick(p_room_id);
end;
$fn$;

create function public.laser_state(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare v_match private.laser_matches%rowtype;
begin
  if auth.uid() is null or not private.is_room_member(p_room_id) then
    raise exception 'NOT_A_MEMBER';
  end if;
  perform private.laser_tick(p_room_id);
  select * into v_match from private.laser_matches where room_id=p_room_id;
  if not found then return null; end if;
  return jsonb_build_object(
    'phase',v_match.phase,
    'round',v_match.round_no,
    'radius',v_match.radius,
    'deadline',v_match.deadline,
    'server_time',now(),
    'winner_id',v_match.winner_id,
    'players',coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id',p.user_id,'name',p.display_name,
        'alive',p.alive,'killed_round',p.killed_round,
        'submitted',exists(
          select 1 from private.laser_moves m
          where m.match_id=p.match_id and m.user_id=p.user_id and m.round_no=v_match.round_no
        )
      ) order by p.display_name)
      from private.laser_players p where p.match_id=v_match.id
    ),'[]'::jsonb),
    'my_move',(
      select jsonb_build_object('x',m.x,'y',m.y,'angle',m.angle)
      from private.laser_moves m
      where m.match_id=v_match.id and m.round_no=v_match.round_no and m.user_id=auth.uid()
    ),
    -- No opponent position/angle is returned during planning, even in RPC JSON.
    'shots',case when v_match.phase in ('reveal','finished') then
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'user_id',m.user_id,'x',m.x,'y',m.y,'angle',m.angle
        ))
        from private.laser_moves m
        where m.match_id=v_match.id and m.round_no=v_match.round_no
      ),'[]'::jsonb)
      else '[]'::jsonb
    end
  );
end;
$fn$;
revoke all on function public.submit_laser_move(uuid,numeric,numeric,numeric) from public,anon;
revoke all on function public.laser_state(uuid) from public,anon;
grant execute on function public.submit_laser_move(uuid,numeric,numeric,numeric) to authenticated;
grant execute on function public.laser_state(uuid) to authenticated;
