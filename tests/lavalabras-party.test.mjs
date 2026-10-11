import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {lavaRise,countedLetters} from "../js/lavalabras.js";
const file=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("Lava speeds up each round and valid letters are counted, not punctuation",()=>{
 assert.equal(lavaRise(1),6);
 assert.equal(lavaRise(2),8);
 assert.equal(lavaRise(3),10);
 assert.equal(countedLetters("País Valencià"),12);
 assert.equal(countedLetters("Mr. Mime"),6);
 assert.equal(countedLetters("A-123"),1);
});
test("Private answer bank and topic rotation are reused without leaking answers",()=>{
 const schema=file("supabase/39_lavalabras_schema.sql");
 const engine=file("supabase/40_lavalabras_engine.sql");
 const api=file("supabase/41_lavalabras_api.sql");
 assert.match(schema,/create table private\.lava_answers/);
 assert.match(schema,/private\.lava_choose_topic/);
 assert.match(schema,/t\.id<>/);
 assert.match(schema,/('animales','paises','elementos','pokemon_kanto')/);
 assert.match(engine,/private\.nr_resolve_key\(m\.topic_id,a\.answer_key\)/);
 assert.match(engine,/v_new_lava:=m\.lava_height\+4\+2\*m\.round_no/);
 assert.match(engine,/p\.height<=v_new_lava/);
 assert.match(api,/private\.is_room_member\(p_room_id\)/);
 assert.match(api,/case when m\.phase in \('reveal','finished'\)/);
 assert.match(api,/where a\.match_id=m\.id and a\.round_no=m\.round_no and a\.user_id=auth\.uid\(\)/);
});
test("Only one answer per round, changeable until the deadline; no duplicate penalty",()=>{
 const api=file("supabase/41_lavalabras_api.sql");
 assert.match(api,/on conflict\(match_id,round_no,user_id\)/);
 assert.match(api,/set raw_answer=excluded\.raw_answer/);
 assert.doesNotMatch(file("supabase/40_lavalabras_engine.sql"),/verdict='duplicate'/);
});
test("Five-game medal circuit is configured, not falsely playable yet",()=>{
 const sql=file("supabase/42_party_mode_foundation.sql");
 const app=file("js/app.js");
 assert.match(sql,/set_size integer not null default 5 check\(set_size in \(5,10,15,20\)\)/);
 assert.match(sql,/create table private\.party_medals/);
 assert.match(sql,/create function public\.party_prepare/);
 assert.match(sql,/create function public\.party_state/);
 assert.match(sql,/status text not null default 'configured'/);
 assert.match(app,/party_prepare/);
 assert.match(app,/party_state/);
 assert.match(app,/Modo Fiesta/);
 assert.match(app,/room\.mode !== "freeplay"/);
});
test("Fifth game appears on site and can start only in freeplay",()=>{
 const app=file("js/app.js"),html=file("index.html");
 assert.match(app,/start_lavalabras/);
 assert.match(html,/id="lava-canvas"/);
 assert.match(html,/id="lava-form"/);
 assert.match(html,/id="party-preview-panel"/);
 assert.match(file("supabase/39_lavalabras_schema.sql"),/r\.mode<>'freeplay'/);
});
