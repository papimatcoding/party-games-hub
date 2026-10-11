import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {predictPongBall,pongEdge} from "../js/pongagono.js";
const src=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("Both sides of deployment use exactly the same protocol build",()=>{
 const release=src("js/release.js"),manifest=JSON.parse(src("release.json"));
 const sql=src("supabase/67_release_010.sql");
 assert.equal(manifest.build,"0.10.0");
 assert.match(release,/APP_BUILD = "0\.10\.0"/);
 assert.match(sql,/set required_build='0\.10\.0'/);
 assert.match(src(".github/workflows/pages.yml"),/cp index\.html release\.json site\//);
});
test("A stale client cannot mark ready or start matches without current protocol",()=>{
 const sql=src("supabase/53_client_compatibility.sql");
 assert.match(sql,/create function public\.client_checkin/);
 assert.match(sql,/p_build is distinct from needed/);
 assert.match(sql,/CLIENT_VERSION_OUTDATED/);
 assert.match(sql,/create trigger room_compatible_launch/);
 assert.match(sql,/old\.status is distinct from 'playing'/);
 const app=src("js/app.js");
 assert.match(app,/await validateRelease\(\)/);
 assert.match(app,/await rpc\("client_checkin"/);
 assert.match(app,/version-overlay/);
});
test("All five games have a readiness barrier that prevents early moves",()=>{
 const gate=src("supabase/55_minigame_ready_gate.sql");
 const moves=src("supabase/56_gate_simulation_and_inputs.sql");
 for(const game of ["lasers","no_repitas","patinazo","pongagono","lavalabras"]){
   assert.ok(gate.includes("r.game_id='"+game+"'"),"no gated timeout for "+game);
 }
 for(const name of ["laser_tick","nr_tick","ice_tick","pong_tick","lava_tick"]){
   assert.match(moves,new RegExp("function private\\."+name));
 }
 const count=(moves.match(/perform private\.require_game_running\(p_room_id\)/g)||[]).length;
 assert.equal(count,5);
 assert.match(gate,/interval '3 seconds'/);
 assert.match(src("index.html"),/id="game-ready-overlay"/);
});
test("The Party podium waits for everyone, not an arbitrary countdown",()=>{
 const sql=src("supabase/54_party_podium_ready.sql");
 assert.match(sql,/create function public\.party_next_ready/);
 assert.match(sql,/from private\.party_slot_ready pr/);
 assert.match(sql,/transition_at=clock_timestamp\(\)\+interval '8 seconds'/);
 assert.match(src("js/app.js"),/rpc\("party_next_ready"/);
 assert.match(src("index.html"),/id="party-next-ready"/);
});
test("Lava uses exact catalog aliases while NO REPITAS preserves tolerance",()=>{
 const sql=src("supabase/57_lavalabras_strict_words.sql");
 assert.match(sql,/function private\.nr_resolve_exact_key/);
 assert.match(sql,/private\.nr_resolve_exact_key\(m\.topic_id,a\.answer_key\)/);
 assert.doesNotMatch(sql,/levenshtein/);
 assert.match(src("supabase/22_nr_engine_typo_fix.sql"),/private\.nr_resolve_key/);
});
test("Client-side Pong prediction continues through wall reflections",()=>{
 const e=pongEdge(4,0),n=e.normal;
 // Begin near the boundary and move directly outwards; reflection keeps it in.
 const ball={x:n.x*.6,y:n.y*.6,vx:n.x*.9,vy:n.y*.9,r:.039};
 const first=predictPongBall(ball,4,.4);
 const radius=Math.cos(Math.PI/4)-.039;
 assert.ok(first.x*n.x+first.y*n.y<=radius+1e-5);
 const second=predictPongBall(ball,4,.5);
 assert.ok(second.x*n.x+second.y*n.y<first.x*n.x+first.y*n.y);
 const browser=src("js/pongagono.js");
 assert.match(browser,/this\.clockOffset\*\.78\+offset\*\.22/);
 assert.match(browser,/predictPongBall\(b,sides,age\)/);
});
test("Patinazo replay and countdown are tied to server time",()=>{
 const js=src("js/patinazo.js");
 assert.match(js,/this\.serverNow\(\)-Date\.parse\(d\.revealed_at\)/);
 assert.match(js,/this\.serverOffset=this\.hasServerClock/);
 assert.match(js,/this\.serverNow\(\)>=Date\.parse\(d\.deadline\)/);
});
