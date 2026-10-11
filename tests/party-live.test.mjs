import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("The host starts an immutable five-game party, not a freeplay game",()=>{
 const sql=source("supabase/46_party_game_launch.sql");
 const app=source("js/app.js");
 for(const id of ["lasers","no_repitas","patinazo","pongagono","lavalabras"]){
   assert.ok(sql.includes("p_game='"+id+"'"),"Party launch missing "+id);
   assert.ok(app.includes('room.game_id === "'+id+'"'),"Party route missing "+id);
 }
 assert.match(sql,/r\.host_user_id<>auth\.uid\(\)/);
 assert.match(sql,/r\.mode<>'party'/);
 assert.match(sql,/v_unready|unready>0/);
 assert.match(sql,/insert into private\.party_participants/);
 assert.match(app,/rpc\("start_party"/);
});

test("Party transitions are based only on server results and happen once",()=>{
 const sql=source("supabase/47_party_medals_and_handoff.sql");
 assert.match(sql,/perform private\.party_award/);
 assert.match(sql,/where session_id=s\.id and slot=s\.current_slot and completed_at is null/);
 assert.match(source("supabase/54_party_podium_ready.sql"),/set transition_at=clock_timestamp\(\)\+interval '8 seconds'/);
 assert.match(source("supabase/54_party_podium_ready.sql"),/create function public\.party_next_ready/);
 assert.match(sql,/perform private\.party_launch\(s\.id,next_game\)/);
 assert.match(sql,/on conflict\(session_id,slot,user_id\) do nothing/g);
 assert.match(sql,/private\.pong_tick\(p_room_id\)/);
 assert.match(sql,/interval '180 seconds'/);
 assert.doesNotMatch(source("js/app.js"),/insert into private\.party_medals/);
});

test("All five results are ranked by real survival and game-specific tiebreakers",()=>{
 const sql=source("supabase/47_party_medals_and_handoff.sql");
 for(const kind of ["laser_players","nr_players","ice_players","pong_players","lava_players"])
   assert.ok(sql.includes("private."+kind),"not in podium "+kind);
 assert.match(sql,/coalesce\(p\.killed_round,0\) desc/);
 assert.match(sql,/coalesce\(p\.eliminated_order,0\) desc/);
 assert.match(sql,/coalesce\(p\.eliminated_round,0\) desc,p\.height desc/);
 assert.match(sql,/rank\(\) over/);
 assert.match(sql,/score desc,totals\.g desc,totals\.s desc,totals\.b desc/);
 assert.match(source("supabase/45_party_result_order_fixes.sql"),/eliminated_order=/);
});

test("Member-only scoreboard and host-only cancellation are not bypassable",()=>{
 const api=source("supabase/47_party_medals_and_handoff.sql");
 const exit=source("supabase/49_party_exit_cleanup.sql");
 const guard=source("supabase/48_party_safe_exit.sql");
 assert.match(api,/auth\.uid\(\) is null or not private\.is_room_member\(p_room_id\)/);
 assert.match(exit,/r\.host_user_id<>auth\.uid\(\)/);
 for(const name of ["laser_matches","nr_matches","ice_matches","pong_matches","lava_matches"])
  assert.match(exit,new RegExp("delete from private\\."+name));
 assert.match(guard,/PARTY_USE_CANCEL/);
 assert.match(exit,/perform public\.party_prepare/);
});

test("The browser presents all five handoffs, medals, standings and final ceremony",()=>{
 const app=source("js/app.js");
 const html=source("index.html");
 const css=source("css/party.css");
 for(const selector of ["party-live-screen","party-hud","party-live-standings",
   "party-live-schedule","party-podium","party-return","party-cancel"])
  assert.match(html,new RegExp('id="'+selector+'"'));
 for(const name of ["syncParty","renderPartyPresentation","party_state","start_party","party_exit"])
  assert.ok(app.includes(name),"missing "+name);
 assert.match(app,/partyData\?\.phase/);
 assert.match(app,/d\.phase==="intermission"/);
 assert.match(app,/¡EMPATE EN LA FIESTA!/);
 assert.match(css,/party-active #laser-reset/);
 assert.match(css,/#lava-reset/);
});
