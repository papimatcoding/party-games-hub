import {makeAvatar,makeCosmeticThumbnail,SKINS,HAIR_COLORS,CLOTH_COLORS,STYLE_OPTIONS} from "./avatar-art.js?v=0.14.0";

const $=id=>document.getElementById(id);
const el=(tag,cls,content)=>{
 const node=document.createElement(tag);if(cls)node.className=cls;
 if(content!==undefined)node.textContent=String(content);
 return node;
};
const GROUPS=[["skin","Piel"],["hair","Peinado"],["hair_color","Color de pelo"],
 ["eyes","Ojos"],["mouth","Expresión"],["outfit_color","Color principal"]];
const SLOTS=[["outfit","Ropa"],["head","Cabeza"],["face","Cara"],
 ["back","Espalda"],["emote","Emotes"]];
const RARITY={common:"COMÚN",rare:"RARO",epic:"ÉPICO",legendary:"LEGENDARIO"};
const fallback={skin:3,hair:0,eyes:0,mouth:0,hair_color:1,outfit_color:0,
 outfit:"outfit_hoodie",head:"head_none",face:"face_none",back:"back_none",emote:"emote_wave"};
const COLOR_FIELDS={skin:SKINS,hair_color:HAIR_COLORS,outfit_color:CLOTH_COLORS};

export class AvatarStudio{
 constructor({rpc,notify,ensureUser,onSaved,nameProvider}){
  Object.assign(this,{rpc,notify,ensureUser,onSaved,nameProvider});
  this.profile=null;this.preview={...fallback};this.tab="look";
  this.slot="outfit";this.shopSlot="all";this.selectedItem=null;
  this.loading=false;this.busy=false;this.opened=false;this.dirty=false;
  $("avatar-open").addEventListener("click",()=>void this.open());
  $("avatar-close").addEventListener("click",()=>this.close());
  $("avatar-overlay").addEventListener("click",e=>{
   if(e.target===$("avatar-overlay"))this.close();
  });
  document.addEventListener("keydown",e=>{
   if(this.opened&&e.key==="Escape"){e.stopPropagation();this.close();}
  });
  for(const tab of ["look","closet","shop","achievements"]){
   $("avatar-tab-"+tab).addEventListener("click",()=>{this.tab=tab;this.selectedItem=null;this.render();});
  }
  $("avatar-save").addEventListener("click",()=>void this.save());
  $("avatar-random").addEventListener("click",()=>this.randomize());
  $("avatar-emote-demo").addEventListener("click",()=>this.emote());
  $("avatar-go-shop").addEventListener("click",()=>{
    this.tab="shop";this.selectedItem=null;this.render();
  });
 }
 async open(){
  if(this.loading||this.opened)return;
  this.opened=true;
  $("avatar-overlay").hidden=false;
  document.body.classList.add("avatar-modal-open");
  $("avatar-main-content").replaceChildren(el("p","avatar-empty","Conectando tu perfil..."));
  this.loading=true;
  try{
   await this.ensureUser();
   await this.load();
  }catch(e){
   this.notify("No se pudo abrir el estudio: "+(e.message||e));
   this.close();
  }finally{this.loading=false;}
 }
 close(){
  this.opened=false;$("avatar-overlay").hidden=true;
  document.body.classList.remove("avatar-modal-open");
 }
 async load(){
  this.profile=await this.rpc("avatar_profile",{});
  this.preview={...this.profile.appearance};
  this.dirty=false;this.selectedItem=null;
  this.render();this.onSaved?.(this.preview);
 }
 get items(){return this.profile?.items||[];}
 get owned(){return new Set(this.profile?.owned||[]);}
 get level(){return this.profile?.level||1;}
 isOwned(item){
  // Achievement rewards are granted when earned, not via a zero-ticket checkout.
  return item.is_starter||this.owned.has(item.code)||
   (item.price===0&&Boolean(item.achievement)&&
    this.profile.achievements.some(a=>a.code===item.achievement&&a.unlocked));
 }
 get appearance(){
  const out={...this.preview};
  const item=this.items.find(i=>i.code===this.selectedItem);
  if(item)out[item.slot]=item.code;
  return out;
 }
 async exec(job){
  if(this.busy)return;
  this.busy=true;this.render();
  const unsaved=this.dirty?{...this.preview}:null;
  try{
   await job();await this.load();
   if(unsaved){Object.assign(this.preview,unsaved);this.dirty=true;}
  }catch(e){this.notify(e.message||String(e));}
  finally{this.busy=false;this.render();}
 }
 async save(){
  if(!this.dirty||this.busy)return;
  const p=this.preview;
  await this.exec(async()=>{
   await this.rpc("avatar_customize",{
    p_skin:p.skin,p_hair:p.hair,p_eyes:p.eyes,p_mouth:p.mouth,
    p_hair_color:p.hair_color,p_outfit_color:p.outfit_color
   });
   this.notify("¡Tu nuevo look está guardado!");
  });
 }
 randomize(){
  for(const key of Object.keys(STYLE_OPTIONS)){
   this.preview[key]=Math.floor(Math.random()*STYLE_OPTIONS[key]);
  }
  this.dirty=true;this.render();
 }
 async buy(code){
  if(this.busy)return;
  const item=this.items.find(i=>i.code===code);
  if(!item)return;
  await this.exec(async()=>{
   await this.rpc("avatar_buy",{p_code:code});
   await this.rpc("avatar_equip",{p_slot:item.slot,p_code:item.code});
   this.notify("¡"+item.title+" añadido a tu armario!");
  });
 }
 async equip(code){
  if(this.busy)return;
  const item=this.items.find(i=>i.code===code);
  if(!item)return;
  await this.exec(async()=>{
   await this.rpc("avatar_equip",{p_slot:item.slot,p_code:item.code});
   this.notify("¡"+item.title+" equipado!");
  });
 }
 emote(){
  const node=$("avatar-preview-figure");
  node.classList.remove("ph-anim-wave","ph-anim-laugh","ph-anim-cry",
    "ph-anim-flex","ph-anim-dance","ph-anim-confetti");
  void node.offsetWidth;
  const selected=this.appearance.emote||"emote_wave";
  node.classList.add("ph-anim-"+selected.slice(6));
 }
 setStyle(key,index){
  if(this.busy)return;
  this.preview[key]=index;this.dirty=true;this.render();
 }
 selectItem(code){
  this.selectedItem=code;
  this.render();
  const item=this.items.find(i=>i.code===code);
  if(item?.slot==="emote")this.emote();
 }
 render(){
  if(!this.opened||!this.profile)return;
  const p=this.profile;
  $("avatar-title-name").textContent=this.nameProvider?.()||"Party Player";
  $("avatar-level").textContent="NIVEL "+this.level;
  $("avatar-tickets").textContent=p.tickets.toLocaleString("es-ES")+" Tickets";
  $("avatar-xp-number").textContent=p.total_xp.toLocaleString("es-ES")+" XP";
  const floorXP=125*(this.level-1)*(this.level-1);
  const nextXP=125*this.level*this.level;
  const progress=Math.max(0,Math.min(100,100*(p.total_xp-floorXP)/Math.max(1,nextXP-floorXP)));
  $("avatar-xp-bar").style.width=progress+"%";
  $("avatar-xp-next").textContent="Siguiente nivel: "+nextXP.toLocaleString("es-ES")+" XP";
  $("avatar-stat-games").textContent=String(p.games_played);
  $("avatar-stat-wins").textContent=String(p.wins);
  $("avatar-stat-medals").textContent=String(p.gold+p.silver+p.bronze);
  $("avatar-preview-figure").replaceChildren(makeAvatar(this.appearance,"ph-avatar-large"));
  $("avatar-preview-figure").className="avatar-preview-figure";
  $("avatar-dirty").hidden=!this.dirty;
  $("avatar-save").disabled=this.busy||!this.dirty;
  $("avatar-save").textContent=this.busy?"Guardando...":"Guardar apariencia";
  const count=this.items.filter(i=>this.isOwned(i)).length;
  $("avatar-collection-count").textContent=count+" / "+this.items.length+" cosméticos";
  for(const tab of ["look","closet","shop","achievements"]){
   const button=$("avatar-tab-"+tab);
   button.classList.toggle("is-current",tab===this.tab);
   button.setAttribute("aria-selected",String(tab===this.tab));
  }
  $("avatar-save").hidden=this.tab!=="look";
  $("avatar-random").hidden=this.tab!=="look";
  $("avatar-go-shop").hidden=this.tab!=="closet";
  const pane=$("avatar-main-content");pane.replaceChildren();
  if(this.tab==="look")this.renderLook(pane);
  if(this.tab==="closet")this.renderCloset(pane);
  if(this.tab==="shop")this.renderShop(pane);
  if(this.tab==="achievements")this.renderAchievements(pane);
 }
 renderLook(pane){
  pane.append(el("h3","avatar-pane-title","Tu personaje, tus reglas"),
    el("p","avatar-pane-sub","Mezcla rasgos, prueba colores y guarda tu propia identidad."));
  for(const [key,label] of GROUPS){
   const group=el("section","avatar-edit-group");
   const heading=el("div","avatar-edit-heading");
   heading.append(el("strong","",label),el("span","",String(this.preview[key]+1)+" / "+STYLE_OPTIONS[key]));
   group.append(heading);
   const choices=el("div","avatar-swatch-row"+(COLOR_FIELDS[key]?"":" avatar-style-row"));
   for(let i=0;i<STYLE_OPTIONS[key];i++){
    const btn=el("button","avatar-option"+(this.preview[key]===i?" selected":""),"");
    btn.type="button";btn.title=label+" "+(i+1);
    btn.setAttribute("aria-label",label+" "+(i+1));
    btn.setAttribute("aria-pressed",String(this.preview[key]===i));
    if(COLOR_FIELDS[key]){
     const dot=el("span","avatar-palette-dot");
     dot.style.background=COLOR_FIELDS[key][i];btn.append(dot);
    }else{
     const art={...this.preview,[key]:i};
     btn.append(makeAvatar(art,"avatar-thumbnail"));
    }
    btn.addEventListener("click",()=>this.setStyle(key,i));
    choices.append(btn);
   }
   group.append(choices);pane.append(group);
  }
 }
 slotButtons(pane,filterName,key,items){
  const tabs=el("div","avatar-category-tabs");
  for(const [slot,label] of items){
   const btn=el("button","avatar-category"+(this[key]===slot?" active":""),label);
   btn.type="button";
   btn.addEventListener("click",()=>{this[key]=slot;this.selectedItem=null;this.render();});
   tabs.append(btn);
  }
  pane.append(tabs);
 }
 itemCard(item,isShop){
  const owned=this.isOwned(item);
  const equipped=this.profile.appearance[item.slot]===item.code;
  const achieved=!item.achievement||this.profile.achievements.some(a=>a.code===item.achievement&&a.unlocked);
  const levelReady=this.level>=item.min_level,afford=this.profile.tickets>=item.price;
  const card=el("article","avatar-item-card"+(this.selectedItem===item.code?" previewing":""));
  const badge=el("div","avatar-item-icon avatar-rarity-"+item.rarity);
  const mini=makeCosmeticThumbnail({...this.preview,[item.slot]:item.code},item.slot);
  if(item.slot==="emote"){
   badge.classList.add("avatar-emote-card");
   const symbol={emote_wave:"✋",emote_laugh:"✦",emote_cry:"◕",emote_flex:"★",emote_dance:"♫",emote_confetti:"✺"}[item.code]||"✦";
   badge.append(el("span","avatar-emote-symbol",symbol));
   badge.title="Emote animado: haz clic en Ver para reproducirlo";
  }
  badge.append(mini);
  const meta=el("div","avatar-item-meta");
  meta.append(el("strong","",item.title),
    el("span","avatar-item-rarity",RARITY[item.rarity]||"COMÚN"));
  card.append(badge,meta);
  const priceLabel=equipped?"EQUIPADO":owned?"EN TU ARMARIO":
    !achieved?"LOGRO REQUERIDO":
    !levelReady?"NIVEL "+item.min_level:
    item.price===0&&item.achievement?"RECOMPENSA DE LOGRO":"🎟 "+item.price;
  card.append(el("span","avatar-item-price",priceLabel));
  const controls=el("div","avatar-item-actions");
  const look=el("button","avatar-preview-btn","Ver");
  look.type="button";look.addEventListener("click",()=>this.selectItem(item.code));
  controls.append(look);
  if(owned&&!equipped){
   const use=el("button","avatar-action-btn","Equipar");
   use.type="button";use.disabled=this.busy;use.addEventListener("click",()=>void this.equip(item.code));
   controls.append(use);
  }else if(!owned&&levelReady&&achieved){
   const buy=el("button","avatar-action-btn","Comprar");
   buy.type="button";buy.disabled=this.busy||!afford;
   buy.addEventListener("click",()=>void this.buy(item.code));
   controls.append(buy);
  }
  card.append(controls);
  return card;
 }
 renderCloset(pane){
  pane.append(el("h3","avatar-pane-title","Tu armario"),
    el("p","avatar-pane-sub","Prueba prendas y accesorios. Todos los cambios son puramente estéticos."));
  this.slotButtons(pane,"slot","slot",SLOTS);
  const list=el("div","avatar-items-grid");
  const mine=this.items.filter(i=>i.slot===this.slot&&this.isOwned(i));
  for(const item of mine)list.append(this.itemCard(item,false));
  pane.append(list);
 }
 renderShop(pane){
  pane.append(el("h3","avatar-pane-title","La tienda del caos"),
    el("p","avatar-pane-sub","Consigue Tickets jugando. Sin pagos reales ni ventajas competitivas."));
  this.slotButtons(pane,"shopSlot","shopSlot",[["all","Todos"],...SLOTS]);
  const list=el("div","avatar-items-grid");
  const items=this.items.filter(i=>!i.is_starter&&(this.shopSlot==="all"||i.slot===this.shopSlot));
  for(const item of items)list.append(this.itemCard(item,true));
  pane.append(list);
 }
 renderAchievements(pane){
  pane.append(el("h3","avatar-pane-title","Logros de la fiesta"),
    el("p","avatar-pane-sub","Juega, gana y acumula medallas para desbloquear recompensas."));
  const list=el("div","avatar-achievements");
  const p=this.profile;
  for(const a of p.achievements){
   const row=el("div","avatar-achievement"+(a.unlocked?" completed":""));
   const icon=el("span","avatar-achievement-icon",a.unlocked?"✓":"◇");
   const info=el("div","avatar-achievement-copy");
   info.append(el("strong","",a.title),el("span","",a.description));
   const amount=el("span","avatar-achievement-reward",
     a.unlocked?"CONSEGUIDO":"+"+a.xp+" XP · "+a.tickets+" 🎟");
   row.append(icon,info,amount);
   list.append(row);
  }
  pane.append(list);
 }
}
