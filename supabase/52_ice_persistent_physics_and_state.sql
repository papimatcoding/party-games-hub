-- PATINAZO / 52: authoritative continuous positions, including member state.
create or replace function private.ice_simulate(p_match_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare
  m private.ice_matches%rowtype;
  ids uuid[]; angles double precision[];
  initial_x double precision[]; initial_y double precision[];
  px double precision[]:='{}'; py double precision[]:='{}';
  vx double precision[]:='{}'; vy double precision[]:='{}';
  active boolean[]:='{}';
  players_count integer; i integer; j integer; step_no integer;
  friction double precision;
  dx double precision; dy double precision; dist double precision;
  nx double precision; ny double precision; penetration double precision;
  closing double precision; impulse double precision;
  frame_players jsonb; frames jsonb:='[]'::jsonb;
begin
  select * into m from private.ice_matches where id=p_match_id for update;
  if not found or m.phase<>'planning' then return; end if;
  select array_agg(p.user_id order by p.corner_index),
         array_agg(p.pos_x order by p.corner_index),
         array_agg(p.pos_y order by p.corner_index),
         array_agg(s.angle::double precision order by p.corner_index)
   into ids,initial_x,initial_y,angles
  from private.ice_players p
  left join private.ice_moves s
    on s.match_id=p.match_id and s.user_id=p.user_id and s.round_no=m.round_no
  where p.match_id=m.id and p.alive;
  players_count:=coalesce(array_length(ids,1),0);
  if players_count=0 then
    update private.ice_matches set replay='[]'::jsonb where id=m.id;
    return;
  end if;
  friction:=exp(-0.88*0.04);
  for i in 1..players_count loop
    -- Continue from the player's ACTUAL last position, not the initial corner.
    px:=array_append(px,initial_x[i]);
    py:=array_append(py,initial_y[i]);
    active:=array_append(active,angles[i] is not null);
    vx:=array_append(vx,case when angles[i] is not null then 0.96*cos(angles[i]) else 0 end);
    vy:=array_append(vy,case when angles[i] is not null then 0.96*sin(angles[i]) else 0 end);
  end loop;

  for step_no in 0..96 loop
    if step_no>0 then
      for i in 1..players_count loop
        if active[i] then
          px[i]:=px[i]+vx[i]*0.04;
          py[i]:=py[i]+vy[i]*0.04;
          vx[i]:=vx[i]*friction;
          vy[i]:=vy[i]*friction;
        end if;
      end loop;

      -- Fixed-size avatar discs, equal mass, symmetric collision response.
      for i in 1..players_count loop
        if not active[i] then continue; end if;
        for j in i+1..players_count loop
          if not active[j] then continue; end if;
          dx:=px[j]-px[i]; dy:=py[j]-py[i];
          dist:=sqrt(dx*dx+dy*dy);
          if dist>=0.148 then continue; end if;
          if dist<0.000001 then
            nx:=cos((i+j)*2*pi()/17);ny:=sin((i+j)*2*pi()/17); dist:=0;
          else
            nx:=dx/dist;ny:=dy/dist;
          end if;
          penetration:=(0.148-dist)/2;
          px[i]:=px[i]-nx*penetration;py[i]:=py[i]-ny*penetration;
          px[j]:=px[j]+nx*penetration;py[j]:=py[j]+ny*penetration;
          closing:=(vx[i]-vx[j])*nx+(vy[i]-vy[j])*ny;
          if closing>0 then
            impulse:=((1+0.86)*closing)/2+0.12;
            vx[i]:=vx[i]-impulse*nx;
            vy[i]:=vy[i]-impulse*ny;
            vx[j]:=vx[j]+impulse*nx;
            vy[j]:=vy[j]+impulse*ny;
          end if;
        end loop;
      end loop;
      -- Judge against exact polygon edges, accounting for player radius.
      for i in 1..players_count loop
        if active[i] and not private.ice_inside(px[i],py[i],m.sides) then
          active[i]:=false;
          update private.ice_players
            set alive=false,eliminated_round=m.round_no
            where match_id=m.id and user_id=ids[i] and alive;
        end if;
      end loop;
    end if;

    -- 49 timestamped frames for smooth deterministic browser interpolation.
    if mod(step_no,2)=0 then
      frame_players:='[]'::jsonb;
      for i in 1..players_count loop
        frame_players:=frame_players||jsonb_build_array(jsonb_build_object(
          'user_id',ids[i],'x',round(px[i]::numeric,5),'y',round(py[i]::numeric,5),
          'alive',active[i]
        ));
      end loop;
      frames:=frames||jsonb_build_array(jsonb_build_object(
        't',round((step_no*0.04)::numeric,2),'players',frame_players
      ));
    end if;
  end loop;

  -- Commit the final positions before opening the next planning phase. This
  -- preserves momentum's displacement but not its velocity: every new round
  -- still gets the same fixed impulse chosen by the player's new heading.
  for i in 1..players_count loop
    update private.ice_players p
      set pos_x=px[i],pos_y=py[i]
    where p.match_id=m.id and p.user_id=ids[i];
  end loop;

  -- No submission: eliminated, no artificial default aim.
  update private.ice_players p
     set alive=false,eliminated_round=m.round_no
   where p.match_id=m.id and p.alive
     and not exists(
       select 1 from private.ice_moves s
       where s.match_id=p.match_id and s.user_id=p.user_id and s.round_no=m.round_no
     );
  update private.ice_matches
     set replay=frames,updated_at=now()
   where id=m.id;
end;
$fn$;
revoke all on function private.ice_simulate(uuid) from public,anon,authenticated;

create or replace function public.ice_state(p_room_id uuid)
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
        'corner',p.corner_index,'x',p.pos_x,'y',p.pos_y,
        'alive',p.alive,'eliminated_round',p.eliminated_round,
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
