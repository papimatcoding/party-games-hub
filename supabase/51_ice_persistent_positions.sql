-- PATINAZO / 51: positions persist between rounds. A corner is only a spawn,
-- not a checkpoint to which survivors return after each slide.
alter table private.ice_players
  add column pos_x double precision,
  add column pos_y double precision;

-- Existing matches: recover final positions from their last replay whenever
-- available; otherwise use the original spawn as the best known position.
update private.ice_players p
set pos_x=coalesce(
  (select (frame->>'x')::double precision
   from jsonb_array_elements(coalesce(m.replay->-1->'players','[]'::jsonb)) frame
   where frame->>'user_id'=p.user_id::text limit 1),
  0.66*cos(
    (case when m.sides=4 then pi()/4 else -pi()/2 end)
    +p.corner_index*2*pi()/m.sides)),
    pos_y=coalesce(
  (select (frame->>'y')::double precision
   from jsonb_array_elements(coalesce(m.replay->-1->'players','[]'::jsonb)) frame
   where frame->>'user_id'=p.user_id::text limit 1),
  0.66*sin(
    (case when m.sides=4 then pi()/4 else -pi()/2 end)
    +p.corner_index*2*pi()/m.sides))
from private.ice_matches m where m.id=p.match_id;

alter table private.ice_players
  alter column pos_x set not null,
  alter column pos_y set not null;

-- One trigger covers both freeplay start_patinazo and the Party launch
-- branch, including any future server-authoritative match launch.
create function private.ice_spawn_position()
returns trigger language plpgsql security definer set search_path=''
as $fn$
declare sides integer;angle double precision;
begin
  select m.sides into sides from private.ice_matches m where m.id=new.match_id;
  if sides is null then raise exception 'MISSING_ICE_MATCH';end if;
  if new.pos_x is null or new.pos_y is null then
    angle:=(case when sides=4 then pi()/4 else -pi()/2 end)
       +new.corner_index*2*pi()/sides;
    new.pos_x:=0.66*cos(angle);
    new.pos_y:=0.66*sin(angle);
  end if;
  return new;
end;
$fn$;
revoke all on function private.ice_spawn_position() from public,anon,authenticated;
create trigger ice_spawn_position_on_join
before insert on private.ice_players
for each row execute function private.ice_spawn_position();
