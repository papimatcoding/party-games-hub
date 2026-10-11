-- PostgreSQL does not expose isfinite(double precision); bound-check is
-- sufficient for the finite physical arena and rejects NaN/infinity.
create or replace function private.ice_inside(p_x double precision,p_y double precision,p_sides integer)
returns boolean language plpgsql immutable set search_path=''
as $fn$
declare k integer; edge_angle double precision; theta double precision;
begin
  if p_sides is null or p_sides<4 or p_sides>12
    or p_x is null or p_y is null
    or abs(p_x)>2.0 or abs(p_y)>2.0 then return false; end if;
  theta:=case when p_sides=4 then pi()/4 else -pi()/2 end;
  for k in 0..p_sides-1 loop
    edge_angle:=theta+(k+0.5)*2*pi()/p_sides;
    if p_x*cos(edge_angle)+p_y*sin(edge_angle)>cos(pi()/p_sides)-0.074 then
      return false;
    end if;
  end loop;
  return true;
end;
$fn$;
revoke all on function private.ice_inside(double precision,double precision,integer)
from public,anon,authenticated;