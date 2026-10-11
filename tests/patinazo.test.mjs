import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {arenaSides,arenaBase,iceVertices,cornerPosition,ICE_POWER} from "../js/patinazo.js";
const src=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("2–4 players always have four square corners",()=>{
  for(const count of [2,3,4]){
    const sides=arenaSides(count),vertices=iceVertices(sides);
    assert.equal(sides,4);
    assert.equal(vertices.length,4);
    assert.equal(vertices[0].x,Math.cos(Math.PI/4));
    for(let k=0;k<4;k++){
      const a=cornerPosition(4,k),b=cornerPosition(4,(k+1)%4);
      assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>.7);
    }
  }
});

test("5 to 12 players have precisely that many sides",()=>{
  for(let count=5;count<=12;count++){
    const vertices=iceVertices(arenaSides(count));
    assert.equal(vertices.length,count);
    for(const v of vertices)assert.ok(Math.abs(Math.hypot(v.x,v.y)-1)<1e-10);
  }
});

test("Power is fixed; clients only submit an angle to the server",()=>{
  assert.equal(ICE_POWER,.96);
  const browser=src("js/patinazo.js"),server=src("supabase/31_patinazo_physics.sql");
  assert.match(browser,/p_angle:Number\(this\.angle\.toFixed\(8\)\)/);
  assert.doesNotMatch(browser,/p_power|p_speed|p_force/);
  assert.match(server,/0\.96\*cos\(angles\[i\]\)/);
  assert.match(server,/0\.96\*sin\(angles\[i\]\)/);
  assert.match(server,/friction:=exp\(-0\.88\*0\.04\)/);
  assert.match(server,/impulse:=\(\(1\+0\.86\)\*closing\)\/2\+0\.12/);
});

test("Corners are sampled without replacement and selection is private",()=>{
  const schema=src("supabase/30_patinazo_schema_start.sql");
  const api=src("supabase/32_patinazo_api.sql");
  assert.match(schema,/greatest\(4,v_count\)/);
  assert.match(schema,/randomized_corners/);
  assert.match(schema,/unique\(match_id,corner_index\)/);
  assert.match(api,/private\.is_room_member\(p_room_id\)/);
  assert.match(api,/s\.user_id=auth\.uid\(\)/);
  assert.match(api,/case when m\.phase in \('reveal','finished'\)/);
  assert.match(api,/else '\[\]'::jsonb end/);
});

test("Collisions, falls and match results are decided only by server",()=>{
  const server=src("supabase/31_patinazo_physics.sql");
  const api=src("supabase/32_patinazo_api.sql");
  assert.match(server,/private\.ice_inside\(px\[i\],py\[i\],m\.sides\)/);
  assert.match(server,/set alive=false,eliminated_round=m\.round_no/);
  assert.match(server,/phase='finished'/);
  assert.match(server,/replay=frames/);
  assert.match(api,/private\.ice_tick\(p_room_id\)/);
  assert.match(src("js/app.js"),/start_patinazo/);
  assert.match(src("index.html"),/id="ice-canvas"/);
});
