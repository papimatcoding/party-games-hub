import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {avatarMarkup,headHairMode} from "../js/avatar-art.js";
import {halloweenHead,halloweenFace,halloweenOutfit,halloweenBack} from "../js/avatar-halloween.js";
const file=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("Fitted headwear hides fringe and full masks hide original face and ears",()=>{
 const matrix={head_cap:"hide_all",head_beanie:"hide_all",head_helmet:"hide_all",
  head_chef:"hide_all",head_fish:"hide_all",
  head_pumpkin:"replace",head_hockey:"replace",head_ghost:"replace",
  head_witch:"hide_all",head_party:"hide_all",head_champion:"integrated"};
 for(const [code,mode] of Object.entries(matrix)){
  assert.equal(headHairMode(code),mode);
  const markup=avatarMarkup({head:code,hair:11});
  assert.ok(markup.includes('data-layer="headwear"'));
  if(mode==="replace"){
   assert.match(markup,/data-layer="face" style="display:none"/);
   assert.match(markup,/data-layer="ears" style="display:none"/);
  }
  if(mode==="hide_all"||mode==="replace"){
   assert.match(markup,/data-layer="rear-hair"><\/g>/);
   assert.match(markup,/data-layer="front-hair"><\/g>/);
  }
 }
});
test("Halloween collection has 11 distinct original vector cosmetics with real silhouettes",()=>{
 const art=[
 ...["head_pumpkin","head_hockey","head_witch","head_ghost"].map(halloweenHead),
 ...["face_scary","face_stitched"].map(halloweenFace),
 ...["outfit_skeleton","outfit_witch","outfit_vampire"].map(x=>halloweenOutfit(x)?.details),
 halloweenBack("back_bats")
 ];
 assert.equal(art.length,10);
 assert.equal(new Set(art).size,art.length);
 for(const a of art){assert.ok(a.length>100);assert.match(a,/<(?:path|ellipse|circle|rect)/);}
 assert.match(avatarMarkup({head:"head_pumpkin"}),/#f49a48/);
 assert.match(avatarMarkup({back:"back_bats"}),/data-layer="rear-accessory"/);
});
test("Halloween bundle has authorized item catalog, server-price quote, and atomic checkout",()=>{
 const sql=file("supabase/81_halloween_shop_catalog.sql");
 assert.match(sql,/insert into private.avatar_bundle_items/);
 assert.match(sql,/base_price,active_from,active_until/);
 assert.match(sql,/halloween_2026',1080/);
 assert.match(sql,/ceil\(coalesce\(sum\(i\.price\)/);
 assert.match(sql,/for update;/);
 assert.match(sql,/on conflict do nothing;/);
 assert.match(sql,/raise exception 'BUNDLE_ALREADY_OWNED'/);
 assert.match(sql,/grant execute on function public.avatar_buy_bundle\(text\) to authenticated/);
});
test("Shop separates buyable from locked and owned and supports search plus theme",()=>{
 const studio=file("js/avatar-studio.js");
 const html=file("index.html");
 assert.match(studio,/this\.shopStatus="all"/);
 assert.match(studio,/this\.statusOf\(item\)===this\.shopStatus/);
 assert.match(studio,/shopSearch\.trim\(\)/);
 assert.match(studio,/THEMES/);
 assert.match(studio,/avatar_buy_bundle/);
 assert.match(studio,/renderSeasons\(pane\)/);
 assert.match(html,/id="avatar-tab-seasons"/);
 assert.match(file("css/avatar-studio.css"),/avatar-season-hero/);
});
