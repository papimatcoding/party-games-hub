// Cosmetic merchandising and safe inventory helpers.
// Rotations are stable for every player and use Europe/Madrid calendar days.
export const DEFAULT_COSMETIC = Object.freeze({
  outfit: "outfit_hoodie",
  head: "head_none",
  face: "face_none",
  back: "back_none",
  emote: "emote_wave"
});

// Only approved, finished artwork goes on sale. Retired pieces remain owned and equipable.
const EDITORIAL_CODES = [
  "outfit_suit","outfit_space","outfit_ninja","outfit_royal","outfit_galaxy",
  "head_beanie","head_crown","head_cat","head_helmet","head_pirate",
  "face_sun","face_patch","face_mask",
  "back_cape","back_wings","back_jetpack",
  "emote_flex","emote_dance","emote_confetti"
];
export const CURATED_CODES = new Set(EDITORIAL_CODES);

export function isStarterItem(item) {
  // SQL avatar_profile uses "starter"; older client fixtures use "is_starter".
  return item?.starter === true || item?.is_starter === true;
}
export function isCuratedForShop(item) {
  return !!item && CURATED_CODES.has(item.code) && !item.season &&
    !item.achievement && !isStarterItem(item) && item.price > 0;
}

const DAY_MS = 86400000;
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone:"Europe/Madrid", year:"numeric",month:"2-digit",day:"2-digit"
});
export function madridRotationKeys(date = new Date()) {
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(date).filter(p => p.type !== "literal").map(p => [p.type,p.value])
  );
  const y=Number(parts.year), m=Number(parts.month), d=Number(parts.day);
  const day=Math.floor(Date.UTC(y,m-1,d)/DAY_MS);
  const mondayOffset=(day+3)%7; // 1970-01-01 was Thursday.
  return {
    day, week:Math.floor((day-mondayOffset)/7),
    label:`${parts.day}/${parts.month}/${parts.year}`
  };
}
function hash(input) {
  let value=2166136261;
  for(let i=0;i<input.length;i++){
    value=Math.imul(value^input.charCodeAt(i),16777619);
  }
  return value>>>0;
}
function draw(items, count, key) {
  const ranked=[...items].sort((a,b)=>
    hash(key+"|"+a.code)-hash(key+"|"+b.code) || a.code.localeCompare(b.code));
  const chosen=[], seenSlots=new Set();
  for(const item of ranked){
    if(chosen.length===count)break;
    if(!seenSlots.has(item.slot)){chosen.push(item);seenSlots.add(item.slot);}
  }
  for(const item of ranked){
    if(chosen.length===count)break;
    if(!chosen.includes(item))chosen.push(item);
  }
  return chosen;
}
export function getShopRotation(items, date=new Date()) {
  const keys=madridRotationKeys(date);
  const eligible=(items||[]).filter(isCuratedForShop);
  // Weekly selection is chosen first so it stays stable for the ENTIRE week.
  const weekly=draw(eligible,6,"weekly:"+keys.week);
  const weeklyCodes=new Set(weekly.map(i=>i.code));
  const daily=draw(eligible.filter(i=>!weeklyCodes.has(i.code)),4,"daily:"+keys.day);
  return {weekly,daily,keys};
}
