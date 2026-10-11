import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {pongSides,pongPaddleRatio,pongVertices,pongEdge,pongPaddleEnds} from "../js/pongagono.js";
const file=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("The arena stays square for 2–4 players and grows to 5–12 sides",()=>{
 for(let n=2;n<=12;n++){
  const sides=pongSides(n),v=pongVertices(sides);
  assert.equal(sides,n<=4?4:n);
  assert.equal(v.length,sides);
  for(const point of v)assert.ok(Math.abs(Math.hypot(point.x,point.y)-1)<1e-9);
 }
});
test("Paddles adapt to side length: exposed opening shrinks dramatically",()=>{
 const openings=[];
 for(let n=4;n<=12;n++){
  const ratio=pongPaddleRatio(n), edge=pongEdge(n,0);
  const opening=2*edge.halfside*(1-ratio);
  openings.push(opening);
  assert.ok(ratio>.3&&ratio<.7);
  const e0=pongPaddleEnds(n,0,0,ratio),e1=pongPaddleEnds(n,0,1,ratio);
  for(const p of [e0.a,e0.b,e1.a,e1.b]){
   assert.ok(Math.abs(p.x*edge.normal.x+p.y*edge.normal.y-edge.apothem)<1e-8);
   assert.ok(Math.abs(p.x*edge.tangent.x+p.y*edge.tangent.y)<edge.halfside+1e-8);
  }
 }
 for(let i=1;i<openings.length;i++)assert.ok(openings[i]<openings[i-1]);
 assert.ok(openings[8]<openings[0]*.3);
});
test("Two players receive opposing square sides instead of adjacent positions",()=>{
 const schema=file("supabase/34_pongagono_schema.sql");
 assert.match(schema,/first_side\+ix::integer\*2/);
 assert.match(schema,/p_game_id not in \('lasers','no_repitas','patinazo','pongagono'\)/);
 assert.match(schema,/revoke all on private\.pong_matches,private\.pong_players/);
});
test("Continuous physics lives on server; KOs turn to walls and speed resets",()=>{
 const sql=file("supabase/38_pongagono_winner_fix.sql");
 assert.match(sql,/if sides\[i\]=collision_edge and alive_flags\[i\]/);
 assert.match(sql,/set alive=false/);
 assert.match(sql,/perform private\.pong_serve\(m\.id,1\.6\)/);
 assert.match(sql,/speed:=least\(1\.38,0\.66\+bounces\*\.030\)/);
 assert.match(file("supabase/35_pongagono_physics.sql"),/ball_speed=0\.66/);
});
test("Paddle control is single-axis, input server-clamped, and membership protected",()=>{
 const api=file("supabase/36_pongagono_api.sql"),js=file("js/pongagono.js");
 assert.match(api,/p_position<0 or p_position>1/);
 assert.match(api,/private\.is_room_member\(p_room_id\)/);
 assert.match(api,/last_input>=interval '80 milliseconds'/);
 assert.match(js,/pongagono_move/);
 assert.match(js,/pongagono_state/);
 assert.doesNotMatch(js,/start_pongagono|set alive=false/);
 assert.match(js,/Math\.PI\/2-Math\.atan2\(myNormal\.y,myNormal\.x\)/);
});
test("Lobby and browser expose the four chosen games without touching others",()=>{
 const app=file("js/app.js"),index=file("index.html");
 for(const name of ["lasers","no_repitas","patinazo","pongagono"])
  assert.ok(app.includes(name),"missing "+name);
 assert.match(index,/id="pong-canvas"/);
 assert.match(index,/id="pong-slider"/);
});
