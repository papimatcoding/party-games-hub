import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fallProgress,formatMs} from "../js/timing-games.js";
import {avatarMarkup,headHairMode} from "../js/avatar-art.js";
const file=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("¿YA? and ¡AGUANTA! share fair, bounded timer mechanics",()=>{
 assert.equal(fallProgress(0,5000),0);
 assert.equal(fallProgress(2500,5000),.25);
 assert.equal(fallProgress(5000,5000),1);
 assert.equal(fallProgress(9000,5000),1);
 assert.equal(formatMs(10001),"10.001 s");
 const sql=file("supabase/84_timing_games.sql");
 assert.match(sql,/8000\+floor\(random\(\)\*8001\)/);
 assert.match(sql,/2800\+floor\(random\(\)\*401\)/);
 assert.match(sql,/4500\+floor\(random\(\)\*1501\)/);
 assert.match(sql,/p_elapsed_ms<server_elapsed-450/);
 assert.match(sql,/p_elapsed_ms>server_elapsed\+90/);
 assert.match(sql,/p\.stopped_ms is not null/);
 assert.match(sql,/create function public\.timing_stop/);
 assert.match(sql,/create function public\.timing_state/);
 assert.match(sql,/perform private\.require_game_running\(p_room_id\)/);
 assert.match(sql,/case when m\.phase='finished' or p\.user_id=auth\.uid\(\) then p\.stopped_ms else null/);
});

test("Two new games work in freeplay and the five-of-nine Party circuit",()=>{
 const db=file("supabase/85_timing_party_integration.sql"),app=file("js/app.js");
 assert.match(db,/'puerta_o_nada','ya','aguanta'/);
 assert.match(db,/random\(\) limit 5/);
 assert.match(db,/private\.timing_init\(s\.room_id,p_game/);
 assert.match(db,/private\.timing_tick\(p_room_id\)/);
 assert.match(db,/private\.avatar_finished_match\(\)/);
 assert.match(db,/create trigger avatar_timing_rewards/);
 assert.match(app,/new TimingGame/);
 assert.match(app,/start_timing/);
 assert.match(app,/timingGame\?\.enter/);
 assert.match(app,/id: "ya"/);
 assert.match(app,/id: "aguanta"/);
 assert.match(file("index.html"),/id="timing-stage"/);
 assert.match(file("index.html"),/id="timing-results-list"/);
});
test("Only safe stopped AGUANTA players can receive medals",()=>{
 const db=file("supabase/87_aguanta_no_medal_for_crush.sql");
 assert.match(db,/p\.crushed asc,p\.error_ms asc/);
 assert.match(db,/where m\.room_id=p_room_id and not p\.crushed/);
});

test("One Ready gesture, six-second game result visibility, responsive nine-game layout",()=>{
 const app=file("js/app.js");
 assert.match(app,/game_gate_ready/);
 assert.match(app,/if\(data\?\.active&&!data\.my_ready/);
 assert.match(app,/resultHoldUntil=Date\.now\(\)\+6500/);
 assert.match(app,/Date\.now\(\)<resultHoldUntil/);
 assert.match(app,/button\.hidden=true/);
 const styles=file("css/viewport-games.css");
 assert.match(styles,/\.rail-grid/);
 assert.match(styles,/max-height:calc\(100dvh - 265px\)/);
 assert.match(styles,/@media\(max-width:500px\)/);
});

test("Hat replacement suppresses hair while bespoke crowns keep integrated hair",()=>{
 for(const hat of ["head_cat","head_party","head_witch","head_pirate","head_beanie","head_cap","head_helmet"])
  assert.equal(headHairMode(hat),"hide_all");
 for(const mask of ["head_pumpkin","head_ghost","head_hockey","head_spectral"])
  assert.equal(headHairMode(mask),"replace");
 for(const crown of ["head_crown","head_champion"])assert.equal(headHairMode(crown),"integrated");
 const masked=avatarMarkup({head:"head_spectral",hair:11});
 assert.match(masked,/data-hair-coverage="replace"/);
 assert.match(masked,/data-layer="face" style="display:none"/);
 const crowned=avatarMarkup({head:"head_champion",hair:2});
 assert.match(crowned,/data-hair-coverage="integrated"/);
 assert.notEqual(avatarMarkup({hair:0}),avatarMarkup({hair:11}));
});

test("Halloween's 14-item bundle expands safely without removing past purchases",()=>{
 const sql=file("supabase/86_halloween_visual_collection.sql");
 assert.match(sql,/head_spectral/);
 assert.match(sql,/back_smoke/);
 assert.match(sql,/emote_evil/);
 assert.match(sql,/on conflict\(code\) do nothing/);
 assert.match(sql,/on conflict do nothing/);
 assert.match(sql,/base_price=1320/);
 const client=file("js/avatar-studio.js");
 assert.match(client,/head:items\.some\(i=>i\.code==="head_spectral"\)/);
 assert.match(client,/reúne "\+items\.length\+" cosméticos exclusivos/);
 assert.match(client,/emote_evil/);
 assert.match(file("css/visual-overhaul.css"),/max-height:calc\(100dvh - 18px\)/);
});
