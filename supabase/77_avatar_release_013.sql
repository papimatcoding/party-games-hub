-- 77: Alpha 0.13.0 adds persistent profile, avatar cosmetic economy and UI.
-- Old browser builds cannot ready any upcoming party match.
update private.client_protocol set required_build='0.13.0' where singleton;
update public.room_members rm
set client_build=null,client_checked_at=null,is_ready=false,game_ready=false
from public.rooms r
where rm.room_id=r.id and
 (r.status='lobby' or (r.status='playing' and exists(
   select 1 from private.game_gates g where g.room_id=r.id and g.live_at is null
  )));
