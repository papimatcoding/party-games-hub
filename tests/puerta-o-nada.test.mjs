import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {doorBalance,doorStatus,MAX_DOOR_ROUNDS} from "../js/puerta-o-nada.js";
const file=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Pure-chance door balance scales from 2 to 12 players",()=>{
 assert.deepEqual(doorBalance(2),{doors:6,safe:4});
 assert.deepEqual(doorBalance(3),{doors:6,safe:4});
 assert.deepEqual(doorBalance(4),{doors:8,safe:5});
 assert.deepEqual(doorBalance(7),{doors:8,safe:5});
 assert.deepEqual(doorBalance(8),{doors:9,safe:6});
 assert.deepEqual(doorBalance(12),{doors:9,safe:6});
 assert.equal(MAX_DOOR_ROUNDS,5);
 const schema=file("supabase/72_door_risk_expansion.sql");
 assert.match(file("supabase/68_door_schema.sql"),/order by random\(\) limit p_safe/);
 assert.match(schema,/n<=3 then 6 when n<=7 then 8 else 9/);
 assert.match(schema,/n<=3 then 4 when n<=7 then 5 else 6/);
 assert.doesNotMatch(schema,/create table private\.door_hints/);
});

test("Doors stay sealed while choosing, then show true safe/trap status",()=>{
 assert.equal(doorStatus(2,[2,3],"choosing"),"hidden");
 assert.equal(doorStatus(2,null,"choosing"),"hidden");
 assert.equal(doorStatus(2,[2,3],"reveal"),"safe");
 assert.equal(doorStatus(1,[2,3],"reveal"),"trap");
 assert.equal(doorStatus(1,[2,3],"finished"),"trap");
 const rpc=file("supabase/69_door_engine_api.sql");
 assert.match(rpc,/case when m\.phase in \('reveal','finished'\)\s*then to_jsonb\(m\.safe_doors\) else null end/);
 assert.match(rpc,/case when m\.phase in \('reveal','finished'\)\s*then \(select c\.door/);
 assert.match(rpc,/private\.is_room_member\(p_room_id\)/);
 assert.match(rpc,/p_door<1 or p_door>m\.door_count/);
});

test("Game resolves all simultaneous choices only on server, no client-selected safe doors",()=>{
 const engine=file("supabase/69_door_engine_api.sql");
 const browser=file("js/puerta-o-nada.js");
 assert.match(engine,/create function private\.door_tick/);
 assert.match(engine,/perform private\.require_game_running\(p_room_id\)/);
 assert.match(engine,/not exists\(\s*select 1 from private\.door_choices/);
 assert.match(engine,/c\.door=any\(v_match\.safe_doors\)/);
 assert.match(engine,/clock_timestamp\(\)\+interval '4 seconds'/);
 assert.match(engine,/clock_timestamp\(\)\+interval '12 seconds'/);
 assert.match(engine,/m\.phase<>'choosing'/);
 assert.match(browser,/rpc\("door_pick"/);
 assert.doesNotMatch(browser,/Math\.random\(\)/);
 assert.doesNotMatch(browser,/localStorage/);
});

test("Knockouts are ranked by survival round, not arbitrary identity",()=>{
 const integration=file("supabase/70_door_party_integration.sql");
 assert.match(integration,/elsif p_game='puerta_o_nada' then/);
 assert.match(integration,/elsif game='puerta_o_nada' then/);
 assert.match(integration,/perform private\.door_tick\(p_room_id\)/);
 assert.match(integration,/p\.alive desc,coalesce\(p\.eliminated_round,0\) desc/);
 assert.match(integration,/select src\.game_id from unnest\(array\[/);
 assert.match(integration,/order by random\(\) limit 5/);
 assert.match(integration,/delete from private\.door_matches where room_id=p_room_id/);
 assert.match(integration,/r\.game_id='puerta_o_nada'/);
});

test("The seventh game is responsive and can only start after all-ready check",()=>{
 const html=file("index.html"),js=file("js/app.js");
 assert.match(html,/id="door-screen"/);
 assert.match(html,/id="door-doors"/);
 assert.match(html,/id="door-reset"/);
 assert.match(html,/puerta-o-nada\.css/);
 assert.match(js,/PuertaONadaGame/);
 assert.match(js,/start_puerta_o_nada/);
 assert.match(js,/puertaONada\?\.enter/);
 assert.match(file("css/party.css"),/#door-reset/);
 const engine=file("supabase/69_door_engine_api.sql");
 assert.match(engine,/if missing>0 then raise exception 'NOT_ALL_READY'/);
 assert.match(engine,/if not private\.game_is_live\(p_room_id\) then return/);
});

test("Double-or-nothing is voluntary, fully secret, and only breaks survival ties",()=>{
 const migration=file("supabase/72_door_risk_expansion.sql");
 const resolving=file("supabase/73_door_gamble_tie_resolution.sql");
 const browser=file("js/puerta-o-nada.js");
 assert.match(migration,/create function public\.door_pick_double/);
 assert.match(migration,/p_first=p_second/);
 assert.match(migration,/c\.second_door=any\(v_match\.safe_doors\)/);
 assert.match(migration,/risk_wins=p\.risk_wins\+1/);
 assert.match(migration,/p\.alive desc,coalesce\(p\.eliminated_round,0\) desc,[\s\n]*p\.risk_wins desc/);
 assert.match(resolving,/p\.risk_wins>0/);
 assert.match(browser,/door_pick_double/);
 assert.doesNotMatch(browser,/Math\.random/);
 assert.match(file("index.html"),/id="door-double"/);
 assert.match(file("css\/puerta-o-nada.css"),/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});
