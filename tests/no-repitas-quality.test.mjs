import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Seven new categories are seeded with explicit player limits",()=>{
 const data=src("supabase/20_nr_more_topics.sql");
 const expected=["provincias_es","autonomias_es","pokemon_kanto","campeones_mundial","star_wars","marcas_coches","instrumentos"];
 for(const id of expected)assert.ok(data.includes(id),id);
 assert.match(data,/Bulbasaur\|Ivysaur\|Venusaur/);
 assert.match(data,/Articuno\|Zapdos\|Moltres/);
 assert.match(data,/Álava\|Albacete\|Alicante/);
});
test("Lamine Yamal is recognized through official catalog and familiar nicknames",()=>{
 const initial=src("supabase/14_no_repitas_catalog.sql");
 const more=src("supabase/20_nr_more_topics.sql");
 assert.match(initial,/Lamine Yamal/);
 assert.match(more,/Lamine Yamal Nasraoui Ebana/);
 assert.match(more,/Yamal/);
});
test("Conservative typos are disambiguated on the server",()=>{
 const fixes=src("supabase/21_nr_validation_polish.sql");
 const tick=src("supabase/22_nr_engine_typo_fix.sql");
 assert.match(fixes,/levenshtein_less_equal/);
 assert.match(fixes,/if v_count=1 then return v_entry/);
 assert.match(fixes,/char_length\(p_key\)<6/);
 assert.match(fixes,/Nidoran♀/);
 assert.match(fixes,/Nidoran♂/);
 assert.match(tick,/private\.nr_resolve_key/);
});
test("Host topic choice is validated against room size at the server",()=>{
 const server=src("supabase/23_nr_topic_choice.sql");
 const start=src("supabase/24_nr_start_topic_choice.sql");
 const app=src("js/app.js");
 const html=src("index.html");
 assert.match(server,/private\.is_room_member/);
 assert.match(server,/v_players between t\.min_players and t\.max_players/);
 assert.match(server,/v_room\.host_user_id<>auth\.uid\(\)/);
 assert.match(start,/v_room\.nr_topic_id is null or t\.id=v_room\.nr_topic_id/);
 assert.match(app,/nr_list_topics/);
 assert.match(app,/nr_set_topic/);
 assert.match(html,/nr-topic-select/);
});
test("Rejected-answer reports cannot override game outcomes and survive reset",()=>{
 const submission=src("supabase/25_nr_answer_review.sql");
 const persistence=src("supabase/28_nr_persistent_editorial_queue.sql");
 const display=src("js/no-repitas.js");
 assert.match(submission,/r\.verdict='invalid'/);
 assert.match(persistence,/create table private\.nr_editorial_feedback/);
 assert.match(persistence,/on conflict\(topic_id,answer_key,reporter_user_id\) do nothing/);
 assert.doesNotMatch(persistence,/update private\.nr_players/);
 assert.match(display,/nr_report_rejected_answer/);
 assert.match(display,/No figura en el catálogo/);
});
