import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src = p => readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Hub offers both user-selected minigames",()=>{
 const html=src("index.html"), app=src("js/app.js");
 assert.match(html,/¡NO REPITAS!/);
 assert.match(html,/LÁSERS/);
 assert.match(app,/no_repitas/);
 assert.match(app,/start_no_repitas/);
 assert.match(app,/NoRepitasGame/);
});
test("Private answers, server-only validation and alias-based duplicates",()=>{
 const schema=src("supabase/13_no_repitas_schema.sql");
 const resolver=src("supabase/17_no_repitas_engine.sql");
 const api=src("supabase/18_no_repitas_api.sql");
 assert.match(schema,/create table private\.nr_responses/);
 assert.match(schema,/create table private\.nr_aliases/);
 assert.match(resolver,/old\.round_no<r\.round_no/);
 assert.match(resolver,/other\.entry_id=r\.entry_id/);
 assert.match(resolver,/when r\.entry_id is null then 'invalid'/);
 assert.match(api,/v_match\.phase in \('reveal','finished'\)/);
 assert.match(api,/and r\.user_id=auth\.uid\(\)/);
});
test("Every submitted text is persisted, including duplicates and invalid",()=>{
 const api=src("supabase/18_no_repitas_api.sql");
 assert.match(api,/insert into private\.nr_responses/);
 assert.match(api,/set raw_answer=excluded\.raw_answer/);
 assert.match(api,/h\.round_no<v_match\.round_no/);
 assert.match(api,/h\.raw_answer/);
});
test("Topic selection is adaptive and supports multiple round outcomes",()=>{
 const start=src("supabase/16_no_repitas_start.sql");
 const engine=src("supabase/17_no_repitas_engine.sql");
 assert.match(start,/v_count between t\.min_players and t\.max_players/);
 assert.match(start,/v_count\*4/);
 for(const term of ["duplicate","reused","invalid","valid"])assert.ok(engine.includes("'"+term+"'"));
});
