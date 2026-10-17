import {makeAvatar} from "./avatar-art.js?v=0.16.0";
// ¡FIN DE LÍNEA! — PC + touch client. No hit detection or movement authority here.
import {NetworkClock,makeAdaptivePoller,FrameMeter} from "./netcode.js?v=0.16.0";
const $=id=>document.getElementById(id);
const COLOR=["#ffcc76","#80e9f5","#f3a0cc","#b2a0ff","#afec90","#fa8e81",
 "#fee993","#83b7ff","#a9f4c3","#dea5fb","#f6ae81","#a3f1ef"];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const RAIL_X=[2,5,8,11,14],RAIL_Y=[2,5,8,11];
export const RAIL_WIDTH=16,RAIL_HEIGHT=13;
export const DIRS=[[1,0],[0,1],[-1,0],[0,-1]];
export const WAGON_SPEED=2.25,SHOT_SPEED=8.5;
export function railAllowed(x,y,dir){
 const [dx,dy]=DIRS[dir]||[0,0];
 return Number.isInteger(dir)&&dir>=0&&dir<=3&&
  Number.isInteger(x)&&Number.isInteger(y)&&RAIL_X.includes(x)&&RAIL_Y.includes(y)&&
  x+dx*3>=2&&x+dx*3<=14&&y+dy*3>=2&&y+dy*3<=11;
}
export function nextRailDirection(x,y,current,intent=0){
 const requested=(current+intent+4)%4;
 if(intent!==0&&railAllowed(x,y,requested))return requested;
 if(railAllowed(x,y,current))return current;
 if(railAllowed(x,y,(current+3)%4))return (current+3)%4;
 if(railAllowed(x,y,(current+1)%4))return (current+1)%4;
 return (current+2)%4;
}
export function predictWagon(p,seconds){
 let x=Number(p.x),y=Number(p.y),tx=Number(p.next_x),ty=Number(p.next_y);
 let direction=Number(p.direction),intent=Number(p.intent)||0;
 let remaining=clamp(seconds,0,.5)*WAGON_SPEED;
 if(!p.alive)return {x,y,direction,intent};
 for(let loops=0;remaining>0&&loops<3;loops++){
  const dist=Math.abs(tx-x)+Math.abs(ty-y);
  if(dist>remaining){x+=DIRS[direction][0]*remaining;y+=DIRS[direction][1]*remaining;break;}
  x=tx;y=ty;remaining-=dist;
  direction=nextRailDirection(Math.round(x),Math.round(y),direction,intent);
  intent=0;tx=x+DIRS[direction][0]*3;ty=y+DIRS[direction][1]*3;
 }
 return {x,y,direction,intent};
}
function elem(tag,cls,content){
 const out=document.createElement(tag);if(cls)out.className=cls;
 if(content!==undefined)out.textContent=String(content);
 return out;
}
export class FinDeLineaGame{
 constructor({rpc,notify,leave,reset,avatarFor=()=>({})}){
  Object.assign(this,{rpc,notify,leave,reset,avatarFor});
  this.canvas=$("rail-canvas");
  this.c=this.canvas.getContext("2d");
  this.active=false;this.roomId=null;this.snapshot=null;
  this.poll=null;this.frame=null;this.loading=false;this.lastAt=0;
  this.timeOffset=0;this.hasClock=false;this.net=new NetworkClock();this.poller=null;this.meter=new FrameMeter();this.backdrop=null;this.lastClockText="";this.lastFireText="";this.smooth=new Map();
  this.nextFireLocal=0;this.intentLocal=0;this.actions=new Set();
  this.onKey=e=>{
   if(!this.active||e.target instanceof HTMLInputElement||
     e.target instanceof HTMLTextAreaElement||e.altKey||e.ctrlKey||e.metaKey)return;
   const key=e.key.toLowerCase();
   if(["a","arrowleft"].includes(key)){e.preventDefault();if(!e.repeat)void this.choose(-1);}
   else if(["d","arrowright"].includes(key)){e.preventDefault();if(!e.repeat)void this.choose(1);}
   else if(["w","arrowup","s","arrowdown"].includes(key)){e.preventDefault();if(!e.repeat)void this.choose(0);}
   else if(key===" "){e.preventDefault();if(!e.repeat)void this.fire();}
  };
  for(const [id,turn] of [["rail-left",-1],["rail-straight",0],["rail-right",1]]){
   $(id).addEventListener("click",()=>void this.choose(turn));
  }
  $("rail-fire").addEventListener("click",()=>void this.fire());
  $("rail-leave").addEventListener("click",()=>void this.leave());
  $("rail-reset").addEventListener("click",()=>void this.reset());
 }
 get me(){return this.snapshot?.players?.find(p=>p.user_id===this.userId);}
 get canPlay(){return this.active&&this.snapshot?.phase==="running"&&this.me?.alive;}
 enter(roomId,userId,code,hostId){
  if(this.active&&this.roomId===roomId){this.hostId=hostId;return;}
  this.exit();this.active=true;this.roomId=roomId;this.userId=userId;
  this.hostId=hostId;this.code=code;
  $("rail-screen").hidden=false;
  document.addEventListener("keydown",this.onKey);
  void this.refresh();
  this.poller=makeAdaptivePoller(()=>this.refresh(),{
   active:()=>this.active,visible:()=>!document.hidden,fast:190,slow:650,hidden:1800
  });
  this.poller.start();
  const draw=timestamp=>{
   if(!this.active)return;
   const dt=clamp((timestamp-(this.lastAt||timestamp))/1000,0,.06);this.lastAt=timestamp;
   this.render(dt);this.clock();
   if(this.meter.tick(timestamp))$("rail-perf").textContent=
     "🎞 "+this.meter.fps+" FPS · 🌐 "+this.net.latencyLabel;
   this.frame=requestAnimationFrame(draw);
  };
  this.frame=requestAnimationFrame(draw);
 }
 exit(){
  this.active=false;clearInterval(this.poll);this.poller?.stop();this.poller=null;cancelAnimationFrame(this.frame);
  document.removeEventListener("keydown",this.onKey);
  this.poll=null;this.frame=null;this.roomId=null;this.snapshot=null;
  this.smooth.clear();this.actions.clear();this.lastAt=0;
  this.timeOffset=0;this.hasClock=false;this.net=new NetworkClock();this.meter=new FrameMeter();this.intentLocal=0;this.lastClockText="";this.lastFireText="";
  $("rail-screen").hidden=true;
 }
 async choose(turn){
  if(!this.canPlay)return;
  this.intentLocal=turn;this.updateChoiceButtons();
  const roomId=this.roomId;
  try{
   await this.rpc("rail_action",{p_room_id:roomId,p_intent:turn,p_fire:false});
  }catch(err){if(this.active&&roomId===this.roomId) this.notify("Desvío: "+err.message);}
 }
 async fire(){
  if(!this.canPlay||Date.now()<this.nextFireLocal)return;
  const roomId=this.roomId;
  this.nextFireLocal=Date.now()+260; // debounce button; server enforces actual 1.1s reload
  try{
   const result=await this.rpc("rail_action",{p_room_id:roomId,p_intent:null,p_fire:true});
   if(result?.shot)this.nextFireLocal=Date.parse(result.at)+1060-this.timeOffset;
   else this.nextFireLocal=Date.now()+300;
  }catch(err){if(this.active&&roomId===this.roomId)this.notify("Disparo: "+err.message);}
 }
 async refresh(){
  if(!this.active||this.loading)return;
  const id=this.roomId;this.loading=true;
  try{
   const before=Date.now();
   const next=await this.rpc("rail_state",{p_room_id:id});
   const after=Date.now();
   if(!this.active||this.roomId!==id||!next)return;
   this.net.sample(next.server_time,before,after);
   this.timeOffset=this.net.offset;this.hasClock=this.net.valid;
   this.snapshot=next;this.hud();
  }catch(err){
   if(this.active&&this.roomId===id)console.warn("Rail sync:",err.message);
  }finally{this.loading=false;}
 }
 clock(){
  const s=this.snapshot;if(!s)return;
  const left=Math.max(0,Math.ceil((Date.parse(s.deadline)-Date.now()-this.timeOffset)/1000));
  const label=s.phase==="finished"?"FINAL":left+" s";
  if(label!==this.lastClockText){$("rail-clock").textContent=label;this.lastClockText=label;}
  const me=this.me;
  if(me){
   const fireReady=Math.max(0,(Date.parse(me.cooldown_until)-Date.now()-this.timeOffset)/1000);
   $("rail-fire").disabled=!this.canPlay;
   const fireLabel=fireReady>.1?"RECARGA "+fireReady.toFixed(1)+"s":"💥 DISPARAR";
   if(fireLabel!==this.lastFireText){$("rail-fire").textContent=fireLabel;this.lastFireText=fireLabel;}
  }
 }
 updateChoiceButtons(){
  for(const [id,turn] of [["rail-left",-1],["rail-straight",0],["rail-right",1]]){
   $(id).classList.toggle("rail-active",turn===this.intentLocal);
   $(id).disabled=!this.canPlay;
  }
 }
 hud(){
  const s=this.snapshot;if(!s)return;
  const me=this.me;
  $("rail-code").textContent=this.code;
  $("rail-live").textContent=s.players.filter(p=>p.alive).length+" / "+s.players.length+" vagones";
  $("rail-hits").textContent=(me?.hits??0)+" aciertos";
  $("rail-phase").textContent=s.phase==="finished"?"FINAL":"¡PERSECUCIÓN!";
  if(me)this.intentLocal=Number(me.intent);
  this.updateChoiceButtons();
  $("rail-fire").disabled=!this.canPlay;
  const board=$("rail-players");board.replaceChildren();
  s.players.forEach((p,i)=>{
   const item=elem("div","rail-player"+(p.alive?"":" rail-out"));
   const dot=elem("span","rail-dot","●");dot.style.color=COLOR[i%COLOR.length];
   item.append(dot,makeAvatar(this.avatarFor(p.user_id),"ph-game-avatar"),elem("strong","",p.name+(p.user_id===this.userId?" (tú)":"")),
     elem("span","",p.alive?"❤️".repeat(p.hp)+" · 🎯"+p.hits:"💀"));
   board.append(item);
  });
  let msg="Escoge izquierda, recto o derecha ANTES de la próxima bifurcación. Dispara solo a la diana trasera.";
  if(s.phase==="finished"){
   const win=s.players.find(p=>p.user_id===s.winner_id);
   msg=win?"🏆 ¡"+win.name+" llega a la última parada!":"🏆 Empate: nadie ha ganado en solitario.";
  }else if(!me?.alive)msg="💀 Te han alcanzado dos veces por detrás. Observa quién sobrevive.";
  $("rail-message").textContent=msg;
  $("rail-reset").hidden=s.phase!=="finished"||this.hostId!==this.userId;
 }
 prepareBackdrop(){
  const bgCanvas=document.createElement("canvas");
  bgCanvas.width=900;bgCanvas.height=720;
  const c=bgCanvas.getContext("2d"),W=900,H=720;
  c.clearRect(0,0,W,H);
  const bg=c.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,"#171e37");bg.addColorStop(1,"#25233b");
  c.fillStyle=bg;c.fillRect(0,0,W,H);
  const scale=Math.min((W-80)/16,(H-58)/13);
  c.save();c.translate((W-scale*16)/2,(H-scale*13)/2);c.scale(scale,scale);
  // Asphalt backdrop, road markings and glowing track structure.
  c.fillStyle="#26304b";c.fillRect(.6,.7,14.8,11.6);
  c.strokeStyle="#354864";c.lineWidth=.015;
  for(let x=0;x<=16;x+=1)c.beginPath(),c.moveTo(x,0),c.lineTo(x,13),c.stroke();
  for(let y=0;y<=13;y+=1)c.beginPath(),c.moveTo(0,y),c.lineTo(16,y),c.stroke();
  const track=(x1,y1,x2,y2)=>{
   c.lineCap="round";
   c.strokeStyle="#111829";c.lineWidth=.55;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();
   c.strokeStyle="#8f9fbe";c.lineWidth=.035;
   for(const offset of [-.13,.13]){
    c.beginPath();if(y1===y2)c.moveTo(x1,y1+offset),c.lineTo(x2,y2+offset);
    else c.moveTo(x1+offset,y1),c.lineTo(x2+offset,y2);
    c.stroke();
   }
   c.strokeStyle="#63718a";c.lineWidth=.035;
   const len=Math.hypot(x2-x1,y2-y1),dx=(x2-x1)/len,dy=(y2-y1)/len;
   for(let s=0;s<=len;s+=.36){
    const x=x1+dx*s,y=y1+dy*s;
    c.beginPath();c.moveTo(x-dy*.26,y+dx*.26);c.lineTo(x+dy*.26,y-dx*.26);c.stroke();
   }
  };
  RAIL_Y.forEach(y=>track(2,y,14,y));
  RAIL_X.forEach(x=>track(x,2,x,11));
  for(const x of RAIL_X)for(const y of RAIL_Y){
   c.fillStyle="#547492";c.fillRect(x-.17,y-.17,.34,.34);
   c.fillStyle="#e6d88c";c.beginPath();c.arc(x,y,.048,0,Math.PI*2);c.fill();
  }
  c.restore();
  this.backdrop=bgCanvas;
 }
 render(dt){
  if(!this.backdrop)this.prepareBackdrop();
  const c=this.c,W=900,H=720;
  c.clearRect(0,0,W,H);
  c.drawImage(this.backdrop,0,0);
  const scale=Math.min((W-80)/16,(H-58)/13);
  c.save();c.translate((W-scale*16)/2,(H-scale*13)/2);c.scale(scale,scale);
  const s=this.snapshot;
  if(!s){c.restore();return;}
  const age=this.net.age(s.last_tick,.65);
  const positions=new Map();
  s.players.forEach((p,i)=>{
   const projected=predictWagon(p,s.phase==="running"?age:0);
   const old=this.smooth.get(p.user_id);
   const smoothT=1-Math.exp(-17*dt);
   const smooth=old
     ?{x:old.x+(projected.x-old.x)*smoothT,y:old.y+(projected.y-old.y)*smoothT}
     :{x:projected.x,y:projected.y};
   this.smooth.set(p.user_id,smooth);
   positions.set(p.user_id,{...smooth,direction:projected.direction});
  });
  const byId=new Map(s.players.map((p,i)=>[p.user_id,i]));
  for(const b of s.projectiles||[]){
   const sx=Number(b.x)+Number(b.vx)*age,sy=Number(b.y)+Number(b.vy)*age;
   if(sx<1||sx>15||sy<1||sy>12)continue;
   const color=COLOR[(byId.get(b.shooter)||0)%COLOR.length];
   c.strokeStyle=color;c.lineWidth=.06;c.shadowBlur=.28;c.shadowColor=color;
   const norm=Math.hypot(b.vx,b.vy)||1;
   c.beginPath();c.moveTo(sx-b.vx/norm*.29,sy-b.vy/norm*.29);c.lineTo(sx,sy);c.stroke();
   c.shadowBlur=0;c.fillStyle="#fff9d6";c.beginPath();c.arc(sx,sy,.10,0,Math.PI*2);c.fill();
  }
  for(const [i,p] of s.players.entries()){
   const pos=positions.get(p.user_id);if(!pos)continue;
   const color=COLOR[i%COLOR.length];
   c.save();c.translate(pos.x,pos.y);c.rotate(pos.direction*Math.PI/2);
   c.globalAlpha=p.alive?1:.3;
   // Forward direction is positive X; cannon at nose, target at rear.
   c.fillStyle="#0d1322";c.fillRect(-.30,-.28,.65,.56);
   c.fillStyle=color;c.fillRect(-.24,-.25,.48,.50);
   c.fillStyle="#253049";c.fillRect(-.06,-.20,.27,.40);
   c.fillStyle="#ecedf8";c.fillRect(.21,-.085,.37,.17); // front gun
   c.fillStyle="#fe4b98";c.beginPath();c.arc(-.34,0,.175,0,Math.PI*2);c.fill();
   c.fillStyle="#fff6db";c.beginPath();c.arc(-.34,0,.085,0,Math.PI*2);c.fill();
   c.fillStyle="#1e2536";
   for(const y of [-.3,.29]){
    for(const x of [-.2,.22]){c.beginPath();c.arc(x,y,.085,0,Math.PI*2);c.fill();}
   }
   c.restore();
   c.globalAlpha=1;
   const name=p.user_id===this.userId?"TÚ":p.name.slice(0,11);
   c.textAlign="center";c.font="800 .20px sans-serif";
   c.fillStyle=p.alive?"#fff":"#93a0ad";c.fillText(name,pos.x,pos.y-.48);
   if(p.user_id===this.userId&&p.alive){
    c.strokeStyle="#fff0a5";c.lineWidth=.044;c.beginPath();c.arc(pos.x,pos.y,.52,0,Math.PI*2);c.stroke();
   }
  }
  // Next planned branch highlighted on the local wagon's HUD.
  if(this.me?.alive){
   const me=this.me;
   const atX=Number(me.next_x),atY=Number(me.next_y);
   const dir=nextRailDirection(Math.round(atX),Math.round(atY),me.direction,this.intentLocal);
   c.strokeStyle="#e9ec84";c.lineWidth=.08;c.setLineDash([.14,.12]);
   c.beginPath();c.moveTo(atX,atY);c.lineTo(atX+DIRS[dir][0]*.9,atY+DIRS[dir][1]*.9);c.stroke();
   c.setLineDash([]);
  }
  c.restore();
 }
}
