import test from "node:test";
import assert from "node:assert/strict";
import {AvatarStudio} from "../js/avatar-studio.js";
import {CURATED_CODES,DEFAULT_COSMETIC,isStarterItem,isCuratedForShop,
  madridRotationKeys,getShopRotation} from "../js/avatar-shop.js";
import {readFileSync} from "node:fs";

const list=[...CURATED_CODES].map((code,index)=>({
  code,slot:code.split("_")[0],price:80+index*10,theme:"fantasy",
  rarity:"rare",starter:false,season:null,achievement:null
}));

test("Starter items use the actual profile payload field, and clearing head is free",async()=>{
  assert.equal(isStarterItem({starter:true}),true);
  assert.equal(isStarterItem({is_starter:true}),true);
  assert.equal(isStarterItem({starter:false,is_starter:false}),false);
  const owned=AvatarStudio.prototype.isOwned.call({
    owned:new Set(),profile:{achievements:[]}
  },{code:"head_none",slot:"head",starter:true,price:0});
  assert.equal(owned,true,"free head_none must always be owned");
  const calls=[];
  const ctx={
    busy:false,profile:{appearance:{head:"head_witch"}},
    selectedItem:"head_witch",render(){},notify(message){calls.push(message);},
    async rpc(name,params){calls.push({name,params});},
    async exec(job){await job();}
  };
  await AvatarStudio.prototype.clearSlot.call(ctx,"head");
  assert.deepEqual(calls.find(v=>typeof v==="object"),{
    name:"avatar_equip",params:{p_slot:"head",p_code:"head_none"}
  });
  assert.equal(DEFAULT_COSMETIC.outfit,"outfit_hoodie");
});

test("Saving appearance clears the draft instead of restoring it",async()=>{
  let options;
  const ctx={
    dirty:true,busy:false,preview:{
      skin:1,hair:2,eyes:3,mouth:4,hair_color:5,outfit_color:6
    },
    async exec(job,opts){options=opts;await job();},
    async rpc(name,args){assert.equal(name,"avatar_customize");assert.equal(args.p_hair,2);},
    notify(){}
  };
  await AvatarStudio.prototype.save.call(ctx);
  assert.deepEqual(options,{preserveDraft:false});
});

test("Madrid time zone sets the shop day; week changes only on Monday",()=>{
  const sunday=madridRotationKeys(new Date("2026-10-18T21:50:00Z"));
  const monday=madridRotationKeys(new Date("2026-10-18T22:10:00Z"));
  assert.equal(sunday.label,"18/10/2026");
  assert.equal(monday.label,"19/10/2026");
  assert.notEqual(sunday.day,monday.day);
  assert.notEqual(sunday.week,monday.week);
});

test("Weekly offers stay fixed all week; daily offers rotate and never duplicate weekly",()=>{
  const a=getShopRotation(list,new Date("2026-10-19T12:00:00Z"));
  const b=getShopRotation([...list].reverse(),new Date("2026-10-20T12:00:00Z"));
  assert.deepEqual(a.weekly.map(i=>i.code),b.weekly.map(i=>i.code));
  assert.equal(a.weekly.length,6);
  assert.equal(a.daily.length,4);
  assert.equal(new Set([...a.weekly,...a.daily].map(i=>i.code)).size,10);
  assert.notDeepEqual(a.daily.map(i=>i.code),b.daily.map(i=>i.code));
});

test("Shop shows only quality-approved paid items; owned retired art is not erased",()=>{
  assert.equal(isCuratedForShop({code:"head_fish",price:150}),false);
  assert.equal(isCuratedForShop({code:"head_witch",price:115,season:"halloween_2026"}),false);
  assert.equal(isCuratedForShop({code:"head_crown",price:180,starter:true}),false);
  assert.equal(isCuratedForShop({code:"head_crown",price:180,achievement:"boss"}),false);
  assert.equal(isCuratedForShop({code:"head_crown",price:180}),true);
  const shop=readFileSync(new URL("../js/avatar-studio.js",import.meta.url),"utf8");
  assert.match(shop,/this\.items\.filter\(item=>item\.slot===this\.slot&&this\.isOwned\(item\)\)/);
  assert.match(shop,/getShopRotation\(this\.items,new Date\(\)\)/);
  assert.match(shop,/this\.clearSlot\(this\.slot\)/);
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  assert.match(html,/id="avatar-preview-state"/);
});
