-- Atomic server-side deadline/reveal engine. Callers never decide who dies.
create or replace function private.laser_tick(p_room_id uuid)
returns void language plpgsql security definer set search_path = ''
as $fn$
declare
  v_room public.rooms%rowtype;
  v_match private.laser_matches%rowtype;
  v_alive integer;
  v_submitted integer;
  v_winner uuid;
begin
  select * into v_room from public.rooms where id=p_room_id for update;
  if not found or v_room.status<>'playing' or v_room.game_id<>'lasers' then return; end if;
  select * into v_match from private.laser_matches where room_id=p_room_id for update;
  if not found or v_match.phase='finished' then return; end if;

  if v_match.phase='planning' then
    select count(*) into v_alive from private.laser_players
      where match_id=v_match.id and alive;
    select count(*) into v_submitted from private.laser_moves m
      join private.laser_players p on p.match_id=m.match_id and p.user_id=m.user_id
      where m.match_id=v_match.id and m.round_no=v_match.round_no and p.alive;
    if now()<v_match.deadline and v_submitted<v_alive then return; end if;

    -- No placement before deadline = eliminated. Never fabricate a shot.
    update private.laser_players p
       set alive=false,killed_round=v_match.round_no
     where p.match_id=v_match.id and p.alive
       and not exists(
          select 1 from private.laser_moves m
          where m.match_id=p.match_id and m.user_id=p.user_id and m.round_no=v_match.round_no
       );

    -- Materialize all victims from the SAME pre-update snapshot:
    -- a player who is shot can still eliminate someone in this round.
    with victims as materialized (
      select distinct target.user_id
        from private.laser_players shooter
        join private.laser_moves shot
          on shot.match_id=shooter.match_id and shot.user_id=shooter.user_id
         and shot.round_no=v_match.round_no
        join private.laser_players target
          on target.match_id=shooter.match_id
         and target.user_id<>shooter.user_id and target.alive
        join private.laser_moves placement
          on placement.match_id=target.match_id and placement.user_id=target.user_id
         and placement.round_no=v_match.round_no
       where shooter.match_id=v_match.id and shooter.alive
         and private.laser_hits(shot.x,shot.y,shot.angle,placement.x,placement.y)
    )
    update private.laser_players p
       set alive=false,killed_round=v_match.round_no
     where p.match_id=v_match.id and p.alive
       and p.user_id in (select user_id from victims);

    select count(*) into v_alive
      from private.laser_players where match_id=v_match.id and alive;
    select user_id into v_winner
      from private.laser_players where match_id=v_match.id and alive
      order by user_id limit 1;

    if v_alive<=1 or v_match.round_no>=9 then
      update private.laser_matches
      set phase='finished',winner_id=case when v_alive=1 then v_winner else null end,
          deadline=now(),updated_at=now()
      where id=v_match.id;
    else
      update private.laser_matches
      set phase='reveal',deadline=now()+interval '6 seconds',updated_at=now()
      where id=v_match.id;
    end if;
    update public.rooms set updated_at=now() where id=p_room_id;
  elsif v_match.phase='reveal' and now()>=v_match.deadline then
    update private.laser_matches
       set phase='planning',round_no=v_match.round_no+1,
           radius=greatest(0.40::numeric,1.0::numeric-0.15::numeric*floor(v_match.round_no/2.0)),
           deadline=now()+interval '25 seconds',updated_at=now()
     where id=v_match.id;
    update public.rooms set updated_at=now() where id=p_room_id;
  end if;
end;
$fn$;
revoke all on function private.laser_tick(uuid) from public,anon,authenticated;
