import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {avatarMarkup,SKINS,HAIR_COLORS,CLOTH_COLORS,STYLE_OPTIONS} from "../js/avatar-art.js";
const file=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Handcrafted chibi avatar art has consistent vector geometry and complete palette",()=>{
 assert.equal(SKINS.length,8);
 assert.equal(HAIR_COLORS.length,10);
 assert.equal(CLOTH_COLORS.length,10);
 assert.deepEqual(STYLE_OPTIONS,{skin:8,hair:12,eyes:8,mouth:8,hair_color:10,outfit_color:10});
 const base=avatarMarkup({skin:0,hair:0});
 const styled=avatarMarkup({skin:7,hair:11,eyes:7,mouth:7,hair_color:9,
  outfit_color:9,outfit:"outfit_space",head:"head_helmet",face:"face_sun",back:"back_wings"});
 assert.match(base,/<svg/);
 assert.match(styled,/viewBox="0 0 180 205"/);
 assert.match(styled,/#583a33/);
 assert.match(styled,/Alas|path/);
 assert.notEqual(base,styled);
 for(let hair=0;hair<12;hair++)assert.notEqual(avatarMarkup({hair}),avatarMarkup({hair:(hair+1)%12}));
});
test("Untrusted avatar fields cannot inject markup or arbitrary SVG attributes",()=>{
 const evil="<script>alert('xss')</script>";
 const html=avatarMarkup({outfit:evil,head:evil,face:evil,back:evil,skin:evil,hair_color:evil});
 assert.doesNotMatch(html,/<script/);
 assert.doesNotMatch(html,/onload=/);
 assert.doesNotMatch(html,/alert\(/);
 assert.match(html,/<svg/);
});
test("Shop uses server-authorized prices/ownership and cosmetics never alter hitboxes",()=>{
 const db=file("supabase/75_avatar_studio_progression.sql");
 assert.match(db,/create table private\.avatar_profiles/);
 assert.match(db,/create table private\.avatar_items/);
 assert.match(db,/create table private\.avatar_owned/);
 assert.match(db,/create function public\.avatar_buy/);
 assert.match(db,/select \* into p from private\.avatar_profiles where user_id=auth\.uid\(\) for update/);
 assert.match(db,/if p\.tickets<item\.price then raise exception 'NOT_ENOUGH_TICKETS'/);
 assert.match(db,/if private\.avatar_level\(p\.total_xp\)<item\.min_level/);
 assert.match(db,/if not item\.is_starter and not exists/);
 assert.match(db,/revoke all on private\.avatar_items,private\.avatar_profiles,private\.avatar_owned/);
 assert.doesNotMatch(db,/alter table private\.(?:pong|laser|rail|door)_players.*hitbox/i);
});
test("Server awards XP and Tickets exactly once on real game finishes and medals",()=>{
 const sql=file("supabase/75_avatar_studio_progression.sql");
 for(const game of ["lasers","nr","ice","pong","lava","rail","doors"]){
  assert.match(sql,new RegExp("create trigger reward_"+game+" after update"));
 }
 assert.match(sql,/create trigger reward_party_medals after insert/);
 assert.match(sql,/create table private\.avatar_reward_events/);
 assert.match(sql,/on conflict do nothing;\s*get diagnostics inserted=row_count/);
 assert.match(sql,/games_played=games_played\+/);
 assert.match(sql,/create table private\.avatar_achievements/);
});
test("Editor, preview, wardrobe, Tickets, shop and achievements are wired in UI",()=>{
 const html=file("index.html"),app=file("js/app.js"),studio=file("js/avatar-studio.js");
 for(const id of ["avatar-open","avatar-overlay","avatar-preview-figure","avatar-save",
  "avatar-tab-look","avatar-tab-closet","avatar-tab-shop","avatar-tab-achievements"]){
  assert.ok(html.includes('id="'+id+'"'),id+" missing");
 }
 assert.match(app,/new AvatarStudio/);
 assert.match(app,/avatar_room_styles/);
 assert.match(app,/makeAvatar\(avatarFor\(player\.user_id\)/);
 assert.match(app,/ph-podium-avatar/);
 assert.match(studio,/avatar_customize/);
 assert.match(studio,/avatar_buy/);
 assert.match(studio,/avatar_equip/);
 assert.match(studio,/makeAvatar\(this\.appearance/);
 assert.match(file("css/avatar-studio.css"),/prefers-reduced-motion/);
});
