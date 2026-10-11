-- PATINAZO / 32: never reveal opponent headings until the authoritative shot resolves.
create function public.submit_ice_direction(p_room_id uuid,p_angle numeric)
returns void language plpgsql security definer set search_path=''
as $fn$
declare m private.ice_matches%rowtype;
begin
  if auth.uid() is null or not private.is_room_member(p_room_id) then
    raise exception 'NOT_A_MEMBER';
  end if;
  perform private.ice_tick(p_room_id);
  select * into m from private.ice_matches where room_id=p_room_id for update;
  if not found or m.phase<>'planning' or now()>=m.deadline then
    raise exception 'PLANNING_CLOSED';
  end if;
  if p_angle is null or p_angle<0 or p_angle>=6.283185307180 then
    raise exception 'ANGLE_INVALID';
  end if;
  if not exists(select 1 from private.ice_players p
    where p.match_id=m.id and p.user_id=auth.uid() and p.alive) then
    raise exception 'ELIMINATED';
  end if;
  insert into private.ice_moves(match_id,round_no,user_id,angle)
    values(m.id,m.round_no,auth.uid(),p_angle)
  on conflict(match_id,round_no,user_id) do update
    set angle=excluded.angle,submitted_at=now();
  perform private.ice_tick(p_room_id);
end;
$fn$;
revoke all on function public.submit_ice_direction(uuid,numeric) from public,anon;
grant execute on function public.submit_ice_direction(uuid,numeric) to authenticated;

create function public.ice_state(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare m private.ice_matches%rowtype;
begin
  if auth.uid() is null or not private.is_room_member(p_room_id) then
    raise exception 'NOT_A_MEMBER';
  end if;
  perform private.ice_tick(p_room_id);
  select * into m from private.ice_matches where room_id=p_room_id;
  if not found then return null; end if;
  return jsonb_build_object(
    'phase',m.phase,'round',m.round_no,'sides',m.sides,
    'deadline',m.deadline,'server_time',now(),'revealed_at',m.revealed_at,
    'winner_id',m.winner_id,'terminal',m.terminal,
    'players',coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id',p.user_id,'name',p.display_name,
        'corner',p.corner_index,'alive',p.alive,'eliminated_round',p.eliminated_round,
        'submitted',exists(select 1 from private.ice_moves s
          where s.match_id=p.match_id and s.user_id=p.user_id and s.round_no=m.round_no)
      ) order by p.corner_index)
      from private.ice_players p where p.match_id=m.id
    ),'[]'::jsonb),
    'my_direction',(
      select s.angle from private.ice_moves s
      where s.match_id=m.id and s.round_no=m.round_no and s.user_id=auth.uid()
    ),
    'replay',case when m.phase in ('reveal','finished') then coalesce(m.replay,'[]'::jsonb)
      else '[]'::jsonb end
  );
end;
$fn$;
revoke all on function public.ice_state(uuid) from public,anon;
grant execute on function public.ice_state(uuid) to authenticated;
