import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {insideHex,rayHits} from "../js/lasers.js";
const sql=(name)=>readFileSync(new URL("../supabase/"+name,import.meta.url),"utf8");

test("hex allows any free continuous position but blocks the edge",()=>{
  assert.equal(insideHex(0,0,1),true);
  assert.equal(insideHex(.4,.3,1),true);
  assert.equal(insideHex(.95,0,1),false);
  assert.equal(insideHex(0,.9,1),false);
  assert.equal(insideHex(Number.NaN,0,1),false);
  assert.equal(insideHex(.8,.4,.55),false);
});
test("laser ray uses unlimited heading and front-only hitboxes",()=>{
  assert.equal(rayHits(0,0,0,.4,0),true);
  assert.equal(rayHits(0,0,0,-.4,0),false);
  assert.equal(rayHits(0,0,0,.4,.3),false);
  assert.equal(rayHits(0,0,0,.4,.05),true);
  assert.equal(rayHits(0,0,Math.PI/2,0,.4),true);
  assert.equal(rayHits(0,0,Math.PI/2,0,-.4),false);
  assert.equal(rayHits(0,0,Math.PI/4,.3,.3),true);
});
test("server keeps movements private until reveal",()=>{
  const state=sql("11_laser_api.sql");
  const schema=sql("08_laser_schema.sql");
  assert.match(schema,/create table private\.laser_moves/);
  assert.match(state,/m\.user_id=auth\.uid\(\)/);
  assert.match(state,/when v_match\.phase in \('reveal','finished'\)/);
  assert.match(state,/private\.laser_inside/);
});
test("server resolves all victims simultaneously",()=>{
  const code=sql("10_laser_engine.sql");
  assert.match(code,/victims as materialized/);
  assert.match(code,/private\.laser_hits/);
  assert.match(code,/v_match\.round_no\/2\.0/);
  assert.match(code,/phase='finished'/);
});
