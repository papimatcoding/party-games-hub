import {makeAvatar} from "./avatar-art.js?v=0.15.0";
// PUERTA O NADA — responsive pure-chance survival, authoritative Supabase rounds.
const $=id=>document.getElementById(id);
export const MAX_DOOR_ROUNDS=5;
export function doorBalance(players){
 if(players<=3)return {doors:6,safe:4};
 if(players<=7)return {doors:8,safe:5};
 return {doors:9,safe:6};
}
export function doorStatus(door,safeDoors,phase){
 if(phase==="choosing")return "hidden";
 if(!Array.isArray(safeDoors))return "hidden";
 return safeDoors.includes(door)?"safe":"trap";
}
function makeEl(tag,cls,text){
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(text!==undefined)el.textContent=String(text);
 return el;
}
export class PuertaONadaGame{
 constructor({rpc,notify,leave,reset,avatarFor=()=>({})}){
  Object.assign(this,{rpc,notify,leave,reset,avatarFor});
  this.active=false;this.roomId=null;this.userId=null;this.data=null;
  this.timer=null;this.frame=null;this.loading=false;this.pending=false;
  this.offset=0;this.hasClock=false;this.lastRound=null;
  this.riskMode=false;this.localPick=[];this.uiSignature="";this.lastClockText="";
  this.keyboard=e=>{
   if(!this.active||e.altKey||e.ctrlKey||e.metaKey||e.repeat||
      ["INPUT","TEXTAREA","SELECT"].includes(e.target?.tagName))return;
   const digit=Number(e.key);
   if(Number.isInteger(digit)&&digit>=1&&digit<=9&&digit<=this.data?.door_count){
    e.preventDefault();void this.choose(digit);
   }
  };
  $("door-double").addEventListener("click",()=>{
   if(!this.canChoose)return;
   this.riskMode=!this.riskMode;this.localPick=[];this.uiSignature="";
   this.render();
  });
  $("door-exit").addEventListener("click",()=>void this.leave());
  $("door-reset").addEventListener("click",()=>void this.reset());
 }
 get me(){return this.data?.players?.find(p=>p.user_id===this.userId);}
 serverNow(){return Date.now()+this.offset;}
 get canChoose(){
  return this.active&&this.data?.phase==="choosing"&&this.me?.alive
    &&this.serverNow()<Date.parse(this.data.deadline);
 }
 enter(roomId,userId,code,hostId){
  if(this.active&&this.roomId===roomId){this.hostId=hostId;return;}
  this.exit();
  this.active=true;this.roomId=roomId;this.userId=userId;this.code=code;this.hostId=hostId;
  this.offset=0;this.hasClock=false;this.lastRound=null;this.data=null;this.riskMode=false;this.localPick=[];this.uiSignature="";
  $("door-screen").hidden=false;
  $("door-code").textContent=code;
  document.addEventListener("keydown",this.keyboard);
  void this.refresh();
  this.timer=setInterval(()=>void this.refresh(),750);
  // The DOM game has no per-frame animation; CSS runs on the compositor.
  // A 100ms clock avoids a pointless 120 DOM writes/second on fast screens.
  this.frame=setInterval(()=>this.clock(),100);
 }
 exit(){
  this.active=false;clearInterval(this.timer);clearInterval(this.frame);
  this.timer=null;this.frame=null;this.roomId=null;this.data=null;
  this.pending=false;this.lastRound=null;this.localPick=[];this.riskMode=false;this.uiSignature="";
  document.removeEventListener("keydown",this.keyboard);
  $("door-screen").hidden=true;
 }
 async choose(door){
  if(!this.canChoose||this.pending||door>this.data.door_count)return;
  if(this.riskMode){
   if(this.localPick.length===0||this.localPick.length===2){
    this.localPick=[door];this.uiSignature="";this.render();return;
   }
   if(this.localPick[0]===door)return;
   this.localPick=[this.localPick[0],door];
  }else this.localPick=[door];
  const roomId=this.roomId;
  this.pending=true;this.uiSignature="";this.render();
  try{
   if(this.riskMode){
    await this.rpc("door_pick_double",{
     p_room_id:roomId,p_first:this.localPick[0],p_second:this.localPick[1]
    });
   }else await this.rpc("door_pick",{p_room_id:roomId,p_door:door});
   await this.refresh();
  }catch(e){
   if(this.active&&roomId===this.roomId)
     this.notify("No se ha podido elegir puerta: "+(e.message||e));
  }finally{this.pending=false;this.uiSignature="";this.render();}
 }

 async refresh(){
  if(!this.active||this.loading)return;
  const roomId=this.roomId;this.loading=true;
  try{
   const sent=Date.now();
   const data=await this.rpc("door_state",{p_room_id:roomId});
   const received=Date.now();
   if(!this.active||roomId!==this.roomId||!data)return;
   const correction=Date.parse(data.server_time)-(sent+received)/2;
   this.offset=this.hasClock?this.offset*.75+correction*.25:correction;
   this.hasClock=true;
   if(data.round!==this.lastRound){
    this.lastRound=data.round;this.riskMode=false;this.localPick=[];
   }
   if(data.my_choice!==null&&data.my_choice!==undefined){
    const serverPicks=[Number(data.my_choice)];
    if(data.my_second_choice!==null&&data.my_second_choice!==undefined){
      serverPicks.push(Number(data.my_second_choice));this.riskMode=true;
    }
    if(!this.pending&&!(this.riskMode&&this.localPick.length===1))this.localPick=serverPicks;
   }
   this.data=data;
   this.render();
  }catch(e){
   if(this.active&&roomId===this.roomId)console.warn("Puerta o Nada sync:",e);
  }finally{this.loading=false;}
 }
 clock(){
  if(!this.data)return;
  const left=Math.max(0,Math.ceil((Date.parse(this.data.deadline)-this.serverNow())/1000));
  const label=this.data.phase==="finished"?"FINAL":left+"s";
  if(label!==this.lastClockText){$("door-clock").textContent=label;this.lastClockText=label;}
 }
 render(){
  const d=this.data;
  if(!this.active||!d)return;
  const me=this.me,phase=d.phase;
  const fingerprint=JSON.stringify({
   phase:d.phase,round:d.round,choice:d.my_choice,second:d.my_second_choice,
   risk:this.riskMode,picks:this.localPick,pending:this.pending,
   safe:d.safe_doors,players:d.players.map(p=>[p.user_id,p.alive,p.eliminated_round,
     p.submitted,p.choice,p.second_choice,p.risk_wins])
  });
  if(fingerprint===this.uiSignature)return;
  this.uiSignature=fingerprint;
  const isPicking=phase==="choosing",isReveal=phase==="reveal";
  $("door-round").textContent="RONDA "+d.round+" / "+d.max_rounds;
  $("door-phase").textContent=isPicking?"ELIGE PUERTA":isReveal?"¡ABRIENDO PUERTAS!":"PARTIDA TERMINADA";
  const alive=d.players.filter(p=>p.alive);
  $("door-alive").textContent=alive.length+" de "+d.players.length+" supervivientes";
  $("door-detail").textContent=d.safe_count+" puertas seguras de "+d.door_count+" posibles";
  $("door-reset").hidden=phase!=="finished"||this.hostId!==this.userId;
  $("door-double").hidden=phase!=="choosing"||!me?.alive;
  $("door-double").disabled=!this.canChoose;
  $("door-double").classList.toggle("door-bonus-on",this.riskMode);
  $("door-double").textContent=this.riskMode?"🔥 DOBLE O NADA ACTIVADO":"🔥 ACTIVAR DOBLE O NADA";
  $("door-risk-label").textContent=this.riskMode?
     "Elige dos puertas diferentes: necesitas acertar AMBAS para sumar ⭐ en desempates.":
     "Normal: sobrevive con una puerta. Riesgo: dos seguras para ganar ⭐.";

  $("door-hint").textContent=isPicking?
     "No hay pistas. Ninguna puerta es más segura que otra. Elige tu número.":
     isReveal?"Las puertas se han abierto. Las verdes permiten avanzar; las rojas eliminan.":
     "Todas las puertas han quedado resueltas.";
  let message;
  if(phase==="finished"){
    const winning=d.players.find(p=>p.user_id===d.winner_id);
    if(winning)message="🏆 ¡"+winning.name+" gana PUERTA O NADA!";
    else if(alive.length===1)message="🏆 ¡"+alive[0].name+" gana PUERTA O NADA!";
    else if(alive.length>1)message="🏆 ¡Empate! "+alive.length+" jugadores han llegado vivos al final.";
    else message="💥 ¡No queda nadie! Ganan empatados los que más rondas resistieron.";
  }else if(!me?.alive){
    message="💀 Te ha tocado una puerta peligrosa. Mira cómo termina la partida.";
  }else if(isReveal){
    message="🎉 ¡Has sobrevivido! Prepárate para la siguiente ronda.";
  }else if(this.riskMode&&this.localPick.length===1){
    message="🔥 Primera puerta: "+this.localPick[0]+". Selecciona una SEGUNDA distinta.";
  }else if(d.my_choice!==null&&d.my_choice!==undefined){
    message="✓ "+(d.my_second_choice!==null&&d.my_second_choice!==undefined?
     "Doble: "+d.my_choice+" y "+d.my_second_choice:
     "Puerta "+d.my_choice)+" elegida. Puedes cambiar hasta que todos decidan.";
  }else message="Elige una puerta antes de que termine el tiempo. ¡Que la suerte decida!";
  $("door-message").textContent=message;
  this.renderDoors();
  this.renderRoster();
 }
 renderDoors(){
  const d=this.data,container=$("door-doors");
  const safe=Array.isArray(d.safe_doors)?d.safe_doors:null;
  container.style.setProperty("--door-count",String(d.door_count));
  container.replaceChildren();
  for(let n=1;n<=d.door_count;n++){
   const status=doorStatus(n,safe,d.phase);
   const chosen=this.localPick.includes(n)||(d.my_choice===n&&!this.localPick.length);
   const button=makeEl("button","door-gate",undefined);
   button.type="button";
   button.classList.toggle("door-chosen",chosen);
   button.classList.toggle("door-safe",status==="safe");
   button.classList.toggle("door-trap",status==="trap");
   button.setAttribute("aria-label","Puerta "+n+(status!=="hidden"?", "+(status==="safe"?"segura":"peligrosa"):""));
   button.setAttribute("aria-pressed",String(chosen));
   button.disabled=!this.canChoose||this.pending;
   const plaque=makeEl("span","door-plaque","PUERTA "+n);
   const body=makeEl("span","door-art");
   body.appendChild(makeEl("span","door-knob","●"));
   body.appendChild(makeEl("span","door-number",String(n)));
   const bottom=makeEl("span","door-caption",
       status==="safe"?"✓ SEGURA":status==="trap"?"✕ TRAMPA":
       chosen?(this.riskMode?"🔥 DOBLE":"✓ ELEGIDA"):"ELEGIR");
   button.append(plaque,body,bottom);
   button.addEventListener("click",()=>void this.choose(n));
   container.appendChild(button);
  }
  const summary=$("door-pick-status");
  if(d.phase==="choosing"){
   const count=d.players.filter(p=>p.alive&&p.submitted).length;
   const total=d.players.filter(p=>p.alive).length;
   summary.textContent="⏳ "+count+" / "+total+" jugadores han elegido";
  }else{
   const picks=d.players.filter(p=>p.choice!==null&&p.choice!==undefined);
   summary.textContent=picks.length+" elecciones reveladas · "+
      d.players.filter(p=>p.alive).length+" supervivientes";
  }
 }
 renderRoster(){
  const d=this.data,list=$("door-players");
  list.replaceChildren();
  const ordered=[...d.players].sort((a,b)=>
    Number(b.alive)-Number(a.alive)||
    (b.eliminated_round||0)-(a.eliminated_round||0)||
    (b.risk_wins||0)-(a.risk_wins||0)||
    a.name.localeCompare(b.name));
  for(const p of ordered){
   const row=makeEl("div","door-player"+(p.alive?"":" door-player-out"));
   row.appendChild(makeAvatar(this.avatarFor(p.user_id),"ph-game-avatar"));
   row.appendChild(makeEl("strong","",p.name+(p.user_id===this.userId?" (tú)":"")));
   let status=p.alive?
       (d.phase==="choosing"?(p.submitted?"✓ Elegida":"… Esperando"):"✓ En pie"):
       ("Cayó en R"+p.eliminated_round);
   if(d.phase!=="choosing"&&p.choice!==null&&p.choice!==undefined)
      status="🚪"+p.choice+(p.second_choice?"+"+p.second_choice:"")+" · "+status;
   if(p.risk_wins)status+=" · ⭐"+p.risk_wins;
   row.appendChild(makeEl("span","door-player-state",status));
   list.appendChild(row);
  }
 }
}
