import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const file = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
test("Live frontend is Party Hub", () => {
  assert.match(file("index.html"), /PARTY HUB/);
  assert.doesNotMatch(file("index.html"), /futbin|sbc|packVerse|card_data/i);
});
test("Browser config is limited to publishable values", () => {
  assert.match(file("js/config.js"), /SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(file("js/config.js"), /sb_secret_[A-Za-z0-9]{8}/);
});
test("Every social mutation uses a server RPC", () => {
  const app = file("js/app.js") + file("js/lasers.js") + file("js/no-repitas.js") + file("js/patinazo.js") + file("js/pongagono.js");
  const allSql = ["02_room_membership.sql","03_room_controls.sql","04_chat.sql","07_modes.sql","09_laser_start.sql","11_laser_api.sql","16_no_repitas_start.sql","18_no_repitas_api.sql","30_patinazo_schema_start.sql","32_patinazo_api.sql","34_pongagono_schema.sql","36_pongagono_api.sql"].map((n)=>file("supabase/"+n)).join("\n");
  for (const fn of ["create_room","join_room","leave_room","set_room_ready","set_room_game","start_lasers","reset_room","kick_room_member","send_room_message","set_room_mode","submit_laser_move","laser_state","start_no_repitas","submit_nr_answer","nr_state","start_patinazo","submit_ice_direction","ice_state","start_pongagono","pongagono_move","pongagono_state"]) {
    assert.ok(app.includes(fn), "frontend uses "+fn);
    assert.ok(allSql.includes("function public."+fn), "server defines "+fn);
  }
});
test("All exposed tables have RLS enabled", () => {
  const sql=file("supabase/01_schema.sql");
  for(const t of ["rooms","room_members","room_messages"]){
    assert.ok(sql.includes("alter table public."+t+" enable row level security"));
  }
});