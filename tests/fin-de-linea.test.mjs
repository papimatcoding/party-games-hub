import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {RAIL_X,RAIL_Y,DIRS,railAllowed,nextRailDirection,predictWagon,WAGON_SPEED,SHOT_SPEED} from "../js/fin-de-linea.js";
const file=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Track is a connected orthogonal rectangular network with multiple switchable branches",()=>{
 assert.deepEqual(RAIL_X,[2,5,8,11,14]);
 assert.deepEqual(RAIL_Y,[2,5,8,11]);
 assert.equal(RAIL_X.length*RAIL_Y.length,20);
 for(const [dx,dy] of DIRS)assert.equal(Math.abs(dx)+Math.abs(dy),1);
 assert.equal(railAllowed(5,5,0),true);
 assert.equal(railAllowed(5,5,1),true);
 assert.equal(railAllowed(5,5,2),true);
 assert.equal(railAllowed(5,5,3),true);
 assert.equal(railAllowed(14,2,0),false);
 assert.equal(railAllowed(2,2,3),false);
 assert.equal(nextRailDirection(5,5,0,-1),3); // east -> north
 assert.equal(nextRailDirection(5,5,0,1),1);  // east -> south
 assert.equal(nextRailDirection(14,2,0,0),1); // turn at top-right corner
});
test("Local wagon prediction follows tracks and changes headings at orthogonal junctions",()=>{
 const start={x:4.9,y:5,next_x:5,next_y:5,direction:0,intent:1,alive:true};
 const r=predictWagon(start,.4);
 assert.ok(Math.abs(r.x-5)<1e-9);
 assert.ok(r.y>5 && r.y<6);
 assert.equal(r.direction,1);
 assert.ok(WAGON_SPEED>0);
 assert.ok(SHOT_SPEED/WAGON_SPEED>3&&SHOT_SPEED/WAGON_SPEED<5);
});
test("Authoritative collision requires direct REAR contact; front and side do no damage",()=>{
 const e=file("supabase/64_rail_engine_variable_fix.sql");
 assert.match(e,/-- Any impact consumes the projectile. Side\/front shots NEVER reduce HP/);
 assert.match(e,/aligned>=\.94 and rear>=\.20 and crossdist<=\.22/);
 assert.match(e,/health\[i\]:=health\[i\]-1/);
 assert.match(e,/health\[i\]<=0/);
 assert.match(e,/private\.rail_next_dir/);
 assert.match(e,/newx:=oldx\+dx/);
 assert.match(e,/newy:=oldy\+dy/);
 assert.doesNotMatch(e,/newx:=oldx\+bvx\[j\]\*cos/);
});
test("Players cannot send fake coordinates or hits; only a queued turn or fire",()=>{
 const a=file("supabase/63_rail_api.sql");
 assert.match(a,/create function public\.rail_action\(p_room_id uuid,p_intent integer default null,p_fire boolean default false\)/);
 assert.match(a,/where match_id=m\.id and user_id=auth\.uid\(\)/);
 assert.match(a,/perform private\.require_game_running\(p_room_id\)/);
 assert.match(a,/interval '1100 milliseconds'/);
 assert.match(a,/create function public\.rail_state/);
 assert.match(a,/private\.is_room_member\(p_room_id\)/);
 const s=file("supabase/61_rail_schema.sql");
 assert.match(s,/revoke all on private\.rail_matches,private\.rail_players,private\.rail_projectiles/);
});
test("Sixth game is playable in freeplay and Party's five randomly sampled slots",()=>{
 const app=file("js/app.js"),html=file("index.html"),sql=file("supabase/65_rail_party_integration.sql");
 assert.match(app,/start_fin_de_linea/);
 assert.match(app,/FinDeLineaGame/);
 assert.match(html,/id="rail-screen"/);
 assert.match(html,/id="rail-canvas"/);
 assert.match(html,/id="rail-fire"/);
 assert.match(html,/id="rail-left"/);
 assert.match(sql,/limit 5/);
 assert.match(sql,/fin_de_linea/);
 assert.match(sql,/private\.rail_tick\(p_room_id\)/);
 assert.match(sql,/private\.rail_matches m/);
 assert.match(sql,/private\.party_medals/);
 assert.match(sql,/r\.game_id='fin_de_linea'/);
});
