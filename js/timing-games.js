import {NetworkClock} from "./netcode.js?v=0.15.0";
import {makeAvatar} from "./avatar-art.js?v=0.15.0";
const $=id=>document.getElementById(id);
const elem=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;};
export const fallProgress=(elapsed,total)=>Math.max(0,Math.min(1,(elapsed/Math.max(1,total))**2));
export const formatMs=ms=>(Math.max(0,ms)/1000).toFixed(3)+" s";
export class TimingGame{
 constructor({rpc,notify,leave,reset,avatarFor=()=>({})}){
  Object.assign(this,{rpc,notify,leave,reset,avatarFor});
  this.live=false;this.roomId=null;this.mode=null;this.data=null;this.net=new NetworkClock();
  this.loading=false;this.frame=0;this.timer=null;this.pressed=false;this.busy=false;
  this.lastText="";this.lastPhase="";this.lastRoster="";this.localStopped=null;
  $("timing-stop").addEventListener("click",()=>void this.stop());
  $("timing-exit").addEventListener("click",()=>void this.leave());
  $("timing-reset").addEventListener("click",()=>void this.reset());
  document.addEventListener("keydown",e=>{
   if(!this.live||e.repeat||e.code!=="Space"||
     /^(INPUT|TEXTAREA|BUTTON|SELECT)$/.test(document.activeElement?.tagName||""))return;
   e.preventDefault();void this.stop();
  });
 }
 enter(roomId,userId,code,hostId,mode){
  if(this.live&&this.roomId===roomId&&this.mode===mode){this.hostId=hostId;return;}
  this.exit();this.live=true;this.roomId=roomId;this.userId=userId;
  this.code=code;this.hostId=hostId;this.mode=mode;
  this.net=new NetworkClock();this.pressed=false;this.localStopped=null;this.lastText="";this.lastPhase="";this.lastRoster="";
  $("timing-screen").hidden=false;
  $("timing-screen").dataset.game=mode;
  $("timing-name").textContent=mode==="ya"?"¿YA?":"¡AGUANTA!";
  $("timing-icon").textContent=mode==="ya"?"⏱️":"🏋️";
  $("timing-guide").textContent=mode==="ya"?
    "El cronómetro se ocultará cerca de los 3 segundos. Deténlo lo más cerca del objetivo.":
    "El peso cae igual para todos. Frénalo justo antes de que te aplaste.";
  $("timing-stage").classList.toggle("timing-weight-game",mode==="aguanta");
  $("timing-stage").classList.toggle("timing-watch-game",mode==="ya");
  this.updateAvatar();
  void this.refresh();
  this.timer=setInterval(()=>void this.refresh(),360);
  const draw=()=>{if(!this.live)return;this.renderFrame();this.frame=requestAnimationFrame(draw);};
  this.frame=requestAnimationFrame(draw);
 }
 exit(){
  this.live=false;clearInterval(this.timer);this.timer=null;
  cancelAnimationFrame(this.frame);this.frame=0;this.roomId=null;this.data=null;
  this.loading=false;this.busy=false;this.pressed=false;this.localStopped=null;
  $("timing-screen").hidden=true;
 }
 get me(){return this.data?.players?.find(p=>p.user_id===this.userId);}
 updateAvatar(){
  $("timing-character").replaceChildren(makeAvatar(this.avatarFor(this.userId),"timing-avatar"));
 }
 async refresh(){
  if(!this.live||this.loading)return;
  this.loading=true;const id=this.roomId,mode=this.mode;
  try{
   const start=Date.now();
   const d=await this.rpc("timing_state",{p_room_id:id});
   const end=Date.now();
   if(!this.live||id!==this.roomId||mode!==this.mode)return;
   this.net.sample(d.server_time,start,end);
   this.data=d;
   if(d.phase==="finished"){this.pressed=true;$("timing-results").hidden=false;}
   this.renderHud();
  }catch(e){console.warn("Tiempo:",e);}
  finally{this.loading=false;}
 }
 elapsed(){
  const start=Date.parse(this.data?.start_at);
  if(!this.data||!Number.isFinite(start)||!this.net.valid)return -1;
  return Math.max(-3000,this.net.now()-start);
 }
 async stop(){
  const d=this.data,elapsed=this.elapsed();
  if(!this.live||!d||d.phase!=="running"||this.pressed||this.busy||elapsed<0)return;
  this.pressed=true;this.busy=true;
  const clicked=Math.max(0,Math.round(elapsed));this.localStopped=clicked;
  $("timing-stop").disabled=true;
  $("timing-result-message").textContent="✓ ¡Registrado! Esperando al grupo...";
  try{
   await this.rpc("timing_stop",{p_room_id:this.roomId,p_elapsed_ms:clicked});
   await this.refresh();
  }catch(e){
   if(this.live){
    // If response was dropped but the server stored the press, do not allow a second
    // fake submission; refresh the authoritative record first.
    await this.refresh();
    if(!this.me?.submitted){
     this.pressed=false;this.localStopped=null;
     this.notify("No se registró la pulsación: "+(e.message||e));
    }
   }
  }finally{this.busy=false;this.renderHud();}
 }
 renderFrame(){
  const d=this.data;
  if(!d)return;
  const time=this.elapsed(),running=d.phase==="running"&&time>=0;
  const clock=$("timing-clock"),button=$("timing-stop");
  const done=this.pressed||this.me?.submitted;
  const total=d.game==="ya"?d.target_ms:d.fall_ms;
  const over=d.game==="aguanta"&&time>=total;
  button.disabled=!running||done||over||this.busy;
  const label=d.phase==="waiting"?"SINCRONIZANDO...":
    d.phase==="finished"?"PARTIDA TERMINADA":
    time<0?"EMPEZAMOS EN "+Math.ceil(-time/1000):
    done?"PULSACIÓN REGISTRADA":over?"💥 ¡APLASTADO!":"✋ ¡PARAR!";
  if(button.textContent!==label)button.textContent=label;
  if(d.game==="ya"){
   const visible=time>=0&&time<d.hide_ms&&d.phase!=="finished"&&!done;
   const display=d.phase==="waiting"?"0.000 s":time<0?"0.000 s":
       visible?formatMs(time):"?.??? s";
   if(this.lastText!==display){clock.textContent=display;this.lastText=display;}
   $("timing-watch").classList.toggle("concealed",!visible&&time>=0);
  }else{
   clock.textContent=d.phase==="finished"?"FINAL":time<0?"PREPARADOS":over?"¡IMPACTO!":"¡CAÍDA!";
   const stopAt=this.me?.stopped_ms??this.localStopped;
   const progress=fallProgress(Math.max(0,stopAt??time),d.fall_ms);
   const stage=$("timing-stage"),weight=$("timing-weight"),character=$("timing-character");
   // The collision plane is relative to the real responsive stage, not a
   // hard-coded desktop position that misses the head on mobile.
   const travel=Math.max(10,stage.clientHeight-14-character.offsetHeight-4-weight.offsetHeight);
   weight.style.transform="translate3d(0,"+(progress*travel).toFixed(2)+"px,0)";
   $("timing-stage").classList.toggle("timing-crushed",over&&!done);
   $("timing-stage").classList.toggle("timing-saved",done);
  }
  if(this.me?.submitted&&!this.pressed)this.pressed=true;
 }
 renderHud(){
  const d=this.data;if(!d)return;
  $("timing-target").textContent=d.game==="ya"?formatMs(d.target_ms):"FRENA ANTES DEL IMPACTO";
  $("timing-mode").textContent=d.game==="ya"?"CRONÓMETRO OCULTO":"REFLEJOS";
  $("timing-phase").textContent=d.phase==="finished"?"RESULTADOS":d.phase==="waiting"?"PREPARACIÓN":"EN DIRECTO";
  $("timing-reset").hidden=d.phase!=="finished"||this.userId!==this.hostId;
  const members=d.players||[];
  const signature=JSON.stringify([d.phase,members.map(p=>[p.user_id,p.submitted,p.stopped_ms,p.error_ms,p.place,p.crushed])]);
  if(signature===this.lastRoster)return;
  this.lastRoster=signature;
  const list=$("timing-roster"),results=$("timing-results-list");list.replaceChildren();results.replaceChildren();
  const ordered=[...members].sort((a,b)=>d.phase==="finished"?(a.place||99)-(b.place||99):a.name.localeCompare(b.name,"es"));
  for(const p of ordered){
   const row=elem("div","timing-player"+(p.crushed?" timing-dead":""));
   row.append(makeAvatar(this.avatarFor(p.user_id),"timing-roster-avatar"),
    elem("strong","",p.name+(p.user_id===this.userId?" (tú)":"")),
    elem("span","",d.phase==="finished"?(p.crushed?"💥":(p.place||"–")+"º"):
      p.submitted?"✓ PARADO":"⌛"));
   list.append(row);
   if(d.phase==="finished"){
    const result=elem("div","timing-result"+(p.crushed?" timing-result-crushed":""));
    result.append(elem("b","",p.place+"º"),makeAvatar(this.avatarFor(p.user_id),"timing-result-avatar"),
      elem("strong","",p.name),elem("span","",p.crushed?"💥 APLASTADO":d.game==="ya"?
      formatMs(p.stopped_ms)+" · ±"+p.error_ms+" ms":
      (p.error_ms+" ms del impacto")));
    results.append(result);
   }
  }
  $("timing-results").hidden=d.phase!=="finished";
  if(d.phase==="finished"){
   const win=members.find(p=>p.user_id===d.winner_id);
   $("timing-result-message").textContent=win?"🏆 "+win.name+" ha ganado. ¡Mira los tiempos!":"¡Empate! Mira los resultados.";
   $("timing-watch").classList.remove("concealed");
   $("timing-clock").textContent=d.game==="ya"?formatMs(d.target_ms):"RESULTADOS";
   this.updateAvatar();
  }
 }
}
