import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("País Valencià is a Valencian Community alias, not an additional community",()=>{
 const sql=source("supabase/29_nr_hidden_history_valencian_alias.sql");
 assert.match(sql,/País Valencià/);
 assert.match(sql,/País Valenciano/);
 assert.match(sql,/private\.nr_normalize\('Comunitat Valenciana'\)/);
 assert.match(sql,/insert into private\.nr_aliases/);
 assert.doesNotMatch(sql,/insert into private\.nr_entries/);
});

test("History is absent from both user UI and current server response",()=>{
 const html=source("index.html");
 const js=source("js/no-repitas.js");
 const sql=source("supabase/29_nr_hidden_history_valencian_alias.sql");
 assert.doesNotMatch(html,/id="nr-blacklist"|id="nr-used"/);
 assert.doesNotMatch(js,/nr-blacklist|nr-used/);
 assert.doesNotMatch(sql,/'blacklist'\s*,/);
 assert.match(sql,/'results',case when v_match\.phase in \('reveal','finished'\)/);
 assert.match(sql,/private\.nr_tick\(p_room_id\)/);
});

test("Earlier responses still count as reused and all submitted texts are kept server-side",()=>{
 const engine=source("supabase/22_nr_engine_typo_fix.sql");
 assert.match(engine,/old\.round_no<r\.round_no/);
 assert.match(engine,/old\.answer_key=r\.answer_key/);
 assert.match(engine,/old\.entry_id=r\.entry_id/);
 assert.match(engine,/when r\.entry_id is null then 'invalid'/);
});
