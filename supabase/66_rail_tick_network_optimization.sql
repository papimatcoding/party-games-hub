-- 66: rail simulation batching and timestamp-correct bullet expiry.
create or replace function private.rail_tick(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare m private.rail_matches%rowtype;
 ids uuid[];xs double precision[];ys double precision[];
 nextxs double precision[];nextys double precision[];dirs integer[];
 intents integer[];life integer[];health integer[];hit_counts integer[];
 kill_counts integer[];ranks integer[];
 bids bigint[];owners uuid[]; bx double precision[];bullet_y double precision[];
 bvx double precision[];vel_y double precision[];expires timestamptz[]; bactive boolean[];
 np integer;nb integer;i integer;j integer;k integer;steps integer;
 elapsed double precision;dt double precision;travel double precision;distance double precision;
 curdir integer;newdir integer;hx integer;hy integer;
 oldx double precision;oldy double precision;newx double precision;newy double precision;
 dx double precision;dy double precision;relx double precision;rely double precision;
 qa double precision;qb double precision;qc double precision;disc double precision;
 impact_t double precision;contact_x double precision;contact_y double precision;
 aligned double precision;rear double precision;crossdist double precision;
 n_alive integer;win uuid;elapsed_deadline boolean;elim_count integer;
 top_score integer;top_hp integer;top_kills integer;n_top integer;shooter_idx integer;
begin
 if not private.game_is_live(p_room_id) then return; end if;
 select * into m from private.rail_matches where room_id=p_room_id for update;
 if not found or m.phase='finished' then return;end if;
 -- Skip redundant snapshots while other clients have just advanced physics.
 if clock_timestamp()<m.last_tick+interval '25 milliseconds'
   and clock_timestamp()<m.deadline then return;end if;
 select array_agg(p.user_id order by p.user_id),
        array_agg(p.pos_x order by p.user_id),
        array_agg(p.pos_y order by p.user_id),
        array_agg(p.next_x order by p.user_id),
        array_agg(p.next_y order by p.user_id),
        array_agg(p.direction order by p.user_id),
        array_agg(p.intent order by p.user_id),
        array_agg(p.alive::integer order by p.user_id),
        array_agg(p.hp order by p.user_id),
        array_agg(p.hits order by p.user_id),
        array_agg(p.kills order by p.user_id),
        array_agg(coalesce(p.eliminated_order,0) order by p.user_id)
 into ids,xs,ys,nextxs,nextys,dirs,intents,life,health,hit_counts,kill_counts,ranks
 from private.rail_players p where p.match_id=m.id;
 np:=coalesce(array_length(ids,1),0);
 if np=0 then return;end if;
 select array_agg(b.id order by b.id),array_agg(b.shooter_id order by b.id),
        array_agg(b.x order by b.id),array_agg(b.y order by b.id),
        array_agg(b.vx order by b.id),array_agg(b.vy order by b.id),
        array_agg(b.expires_at order by b.id)
 into bids,owners,bx,bullet_y,bvx,vel_y,expires
 from private.rail_projectiles b where b.match_id=m.id;
 nb:=coalesce(array_length(bids,1),0);
 for j in 1..nb loop bactive:=array_append(bactive,true);end loop;
 elapsed:=least(.55,greatest(0,extract(epoch from clock_timestamp()-m.last_tick)));
 steps:=greatest(1,ceil(elapsed/.025)::integer);
 dt:=elapsed/steps;
 elim_count:=m.elimination_count;

 for k in 1..steps loop
   -- Every rail junction has an exact integer position. No diagonal movement.
   for i in 1..np loop
     if life[i]=0 then continue;end if;
     distance:=abs(nextxs[i]-xs[i])+abs(nextys[i]-ys[i]);
     travel:=2.25*dt;
     if distance<=travel+.0000001 then
       xs[i]:=nextxs[i];ys[i]:=nextys[i];
       curdir:=dirs[i];
       newdir:=private.rail_next_dir(xs[i]::integer,ys[i]::integer,curdir,intents[i]);
       dirs[i]:=newdir;
       intents[i]:=0;
       nextxs[i]:=xs[i]+(case newdir when 0 then 3 when 2 then -3 else 0 end);
       nextys[i]:=ys[i]+(case newdir when 1 then 3 when 3 then -3 else 0 end);
     else
       xs[i]:=xs[i]+(case dirs[i] when 0 then travel when 2 then -travel else 0 end);
       ys[i]:=ys[i]+(case dirs[i] when 1 then travel when 3 then -travel else 0 end);
     end if;
   end loop;

   for j in 1..nb loop
     if not bactive[j] then continue;end if;
     if expires[j]<=m.last_tick+(k*dt)*interval '1 second' then bactive[j]:=false;continue;end if;
     oldx:=bx[j];oldy:=bullet_y[j];
     dx:=bvx[j]*dt;dy:=vel_y[j]*dt;
     newx:=oldx+dx;newy:=oldy+dy;
     bx[j]:=newx;bullet_y[j]:=newy;
     if newx<1.1 or newx>14.9 or newy<1.1 or newy>11.9 then
       bactive[j]:=false;continue;
     end if;
     qa:=dx*dx+dy*dy;
     if qa<.00000001 then continue;end if;

     for i in 1..np loop
       if life[i]=0 or ids[i]=owners[j] then continue;end if;
       -- Swept segment vs cart collision circle radius .38.
       relx:=oldx-xs[i];rely:=oldy-ys[i];
       qb:=2*(relx*dx+rely*dy);
       qc:=relx*relx+rely*rely-.38*.38;
       disc:=qb*qb-4*qa*qc;
       if disc<0 then continue;end if;
       if qc<=0 then impact_t:=0;
       else impact_t:=(-qb-sqrt(disc))/(2*qa);end if;
       if impact_t<0 or impact_t>1 then continue;end if;

       -- Any impact consumes the projectile. Side/front shots NEVER reduce HP.
       bactive[j]:=false;
       contact_x:=oldx+dx*impact_t;contact_y:=oldy+dy*impact_t;
       hx:=case dirs[i] when 0 then 1 when 2 then -1 else 0 end;
       hy:=case dirs[i] when 1 then 1 when 3 then -1 else 0 end;
       aligned:=(bvx[j]*hx+vel_y[j]*hy)/8.5;
       rear:=-((contact_x-xs[i])*hx+(contact_y-ys[i])*hy);
       crossdist:=abs((contact_x-xs[i])*hy-(contact_y-ys[i])*hx);
       if aligned>=.94 and rear>=.20 and crossdist<=.22 then
         health[i]:=health[i]-1;
         for shooter_idx in 1..np loop
           if ids[shooter_idx]=owners[j] then
             hit_counts[shooter_idx]:=hit_counts[shooter_idx]+1;
             if health[i]<=0 then kill_counts[shooter_idx]:=kill_counts[shooter_idx]+1;end if;
             exit;
           end if;
         end loop;
         if health[i]<=0 then
           life[i]:=0;
           elim_count:=elim_count+1;
           ranks[i]:=elim_count;
         end if;
       end if;
       exit;
     end loop;
   end loop;
 end loop;

 -- Persist one row per wagon/bullet per authoritative snapshot, not per frame.
 for i in 1..np loop
   update private.rail_players set pos_x=xs[i],pos_y=ys[i],
     next_x=nextxs[i],next_y=nextys[i],direction=dirs[i],intent=intents[i],
     alive=(life[i]=1),hp=greatest(0,health[i]),hits=hit_counts[i],kills=kill_counts[i],
     eliminated_order=nullif(ranks[i],0)
   where match_id=m.id and user_id=ids[i];
 end loop;
 for j in 1..nb loop
   if not bactive[j] then
     delete from private.rail_projectiles where id=bids[j];
   else
     update private.rail_projectiles set x=bx[j],y=bullet_y[j] where id=bids[j];
   end if;
 end loop;
 select count(*) into n_alive from private.rail_players
 where match_id=m.id and alive;
 elapsed_deadline:=clock_timestamp()>=m.deadline;
 if n_alive<=1 or elapsed_deadline then
   win:=null;
   if n_alive=1 then
     select user_id into win from private.rail_players
       where match_id=m.id and alive limit 1;
   elsif n_alive>1 then
     select p.hits,p.hp,p.kills into top_score,top_hp,top_kills
     from private.rail_players p where p.match_id=m.id and p.alive
     order by p.hits desc,p.hp desc,p.kills desc limit 1;
     select count(*) into n_top from private.rail_players p
     where p.match_id=m.id and p.alive
       and p.hits=top_score and p.hp=top_hp and p.kills=top_kills;
     if n_top=1 then
       select user_id into win from private.rail_players
       where match_id=m.id and alive and hits=top_score
         and hp=top_hp and kills=top_kills limit 1;
     end if;
   end if;
   update private.rail_matches set phase='finished',
     winner_id=win,last_tick=clock_timestamp(),
     elimination_count=elim_count,updated_at=clock_timestamp()
   where id=m.id;
 else
   update private.rail_matches set last_tick=clock_timestamp(),
     elimination_count=elim_count,updated_at=clock_timestamp()
   where id=m.id;
 end if;
end;
$fn$;
revoke all on function private.rail_tick(uuid) from public,anon,authenticated;
