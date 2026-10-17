import {makeAvatar} from "./avatar-art.js?v=0.13.0";
// LAVALABRAS — server-validated vocabulary survival above rising lava.
// Submitted answers/validity stay hidden until the server resolves a round.
const $=id=>document.getElementById(id);
const PALETTE=["#ffd37c","#85e8e1","#f5a9d4","#b6a0ff","#a9e477","#ffa58f",
 "#7db7f4","#fce597","#d6a3ea","#9fecbd","#f9ae71","#c3d6fa"];
const lerp=(a,b,t)=>a+(b-a)*t;
export const lavaRise=round=>4+2*round;
export function countedLetters(term){
 // Mirrored for informative UI only: authoritative validation/count happens in SQL.
 return [...String(term).normalize("NFD").replace(/[\u0300-\u036f]/g,"")].filter(x=>/\p{L}/u.test(x)).length;
}
export class LavalabrasGame{
 constructor({rpc,notify,leave,reset,avatarFor=()=>({})}){
  Object.assign(this,{rpc,notify,leave,reset,avatarFor});
  this.canvas=$("lava-canvas");this.ctx=this.canvas.getContext("2d");
  this.live=false;this.roomId=null;this.data=null;this.timer=null;this.frame=null;
  this.loading=false;this.busy=false;this.round=null;this.visualLava=0;this.visualHeights=new Map();
  $("lava-form").addEventListener("submit",e=>{e.preventDefault();void this.submit();});
  $("lava-leave").addEventListener("click",()=>void this.leave());
  $("lava-reset").addEventListener("click",()=>void this.reset());
  $("lava-input").addEventListener("input",()=>this.preview());
 }
 enter(roomId,userId,code,hostId){
  if(this.live&&this.roomId===roomId){this.hostId=hostId;return;}
  this.exit();this.live=true;this.roomId=roomId;this.userId=userId;this.code=code;this.hostId=hostId;
  $("lava-screen").hidden=false;void this.refresh();
  this.timer=setInterval(()=>void this.refresh(),1100);
  const draw=()=>{if(!this.live)return;this.draw();this.clock();this.frame=requestAnimationFrame(draw);};
  this.frame=requestAnimationFrame(draw);
 }
 exit(){
  this.live=false;clearInterval(this.timer);cancelAnimationFrame(this.frame);
  this.timer=null;this.frame=null;this.roomId=null;this.data=null;
  this.round=null;this.visualLava=0;this.visualHeights.clear();
  $("lava-screen").hidden=true;
 }
 get self(){return this.data?.players?.find(p=>p.user_id===this.userId);}
 get canAnswer(){return this.data?.phase==="writing"&&this.self?.alive&&Date.now()<Date.parse(this.data.deadline);}
 async refresh(){
  if(!this.live||this.loading)return;this.loading=true;const id=this.roomId;
  try{
   const data=await this.rpc("lava_state",{p_room_id:id});
   if(!this.live||id!==this.roomId)return;
   if(!data)return;
   if(this.round!==data.round){
    this.round=data.round;$("lava-input").value=data.my_answer||"";
   }else if(data.my_answer&&document.activeElement!==$("lava-input")&&!$("lava-input").value){
    $("lava-input").value=data.my_answer;
   }
   this.data=data;this.render();
  }catch(e){console.error(e);this.notify("No se pudo sincronizar LAVALABRAS: "+e.message);}
  finally{this.loading=false;}
 }
 async submit(){
  if(!this.canAnswer||this.busy)return;
  const raw=$("lava-input").value.trim();
  if(!raw||raw.length>65){this.notify("Escribe una respuesta de 1 a 65 caracteres.");return;}
  this.busy=true;$("lava-send").disabled=true;
  try{
   await this.rpc("submit_lava_word",{p_room_id:this.roomId,p_answer:raw});
   this.notify("¡Palabra enviada! La validación se revelará al final de la ronda.");
   await this.refresh();
  }catch(e){this.notify("No se pudo enviar: "+e.message);}
  finally{this.busy=false;this.render();}
 }
 preview(){
  const text=$("lava-input").value.trim();
  $("lava-letters").textContent=text?countedLetters(text)+" letras (si es válida)":"0 letras";
 }
 clock(){
  if(!this.data)return;
  const seconds=Math.max(0,Math.ceil((Date.parse(this.data.deadline)-Date.now())/1000));
  $("lava-clock").textContent=this.data.phase==="finished"?"🏆":seconds+"s";
  if(this.data.phase==="writing"&&seconds===0)$("lava-send").disabled=true;
 }
 render(){
  const d=this.data;if(!d)return;
  $("lava-round").textContent="RONDA "+d.round+" / 12";
  $("lava-topic").textContent=d.topic;
  $("lava-hint").textContent=d.hint;
  $("lava-code").textContent=this.code;
  $("lava-phase").textContent=d.phase==="writing"?"PALABRAS SECRETAS":d.phase==="reveal"?"¡SUBE LA LAVA!":"RESULTADOS";
  $("lava-height").textContent="LAVA: "+d.lava+" BLOQUES";
  $("lava-next").textContent="Próxima crecida: +"+lavaRise(d.round)+" bloques";
  $("lava-live").textContent=d.players.filter(x=>x.alive).length+" / "+d.players.length+" vivos";
  const form=$("lava-form");
  form.hidden=d.phase!=="writing"||!this.self?.alive;
  const send=$("lava-send");send.disabled=!this.canAnswer||this.busy;
  send.textContent=d.my_answer?"↻ Cambiar respuesta":"Enviar palabra ↑";
  this.preview();
  const msg=$("lava-message");
  if(d.phase==="finished"){
   const winner=d.players.find(p=>p.user_id===d.winner_id);
   msg.textContent=winner?"🏆 ¡"+winner.name+" es la última persona en pie!":"💀 La lava se ha llevado a todos o no hay un único superviviente. Empate.";
  }else if(d.phase==="reveal")msg.textContent="🔥 La lava acaba de subir. Mira qué palabras han salvado a cada jugador.";
  else if(!this.self?.alive)msg.textContent="💀 La lava te ha eliminado. Puedes ver cómo acaba.";
  else if(d.my_answer)msg.textContent="✓ Palabra guardada. Puedes editarla mientras quede tiempo.";
  else msg.textContent="Escribe la respuesta válida MÁS LARGA que se te ocurra. ¡No hace falta que sea distinta de las de tus amigos!";
  $("lava-reset").hidden=d.phase!=="finished"||this.userId!==this.hostId;
  const roster=$("lava-roster");roster.replaceChildren();
  d.players.forEach((p,i)=>{
   const item=document.createElement("div");item.className="lava-roster-player"+(p.alive?"":" lava-lost");
   const col=document.createElement("span");col.className="lava-player-dot";col.style.backgroundColor=PALETTE[i%PALETTE.length];
   const name=document.createElement("strong");name.textContent=p.name+(p.user_id===this.userId?" (tú)":"");
   const height=document.createElement("span");
   height.textContent=p.height+" 🧱"+(p.alive?"":" 💀");
   item.append(col,makeAvatar(this.avatarFor(p.user_id),"ph-game-avatar"),name,height);roster.append(item);
  });
  const results=$("lava-results"),list=$("lava-results-list");
  results.hidden=d.phase==="writing";list.replaceChildren();
  for(const r of d.results||[]){
   const row=document.createElement("div");row.className="lava-result"+(r.alive?"":" lava-result-dead");
   const n=document.createElement("strong");n.textContent=r.name;
   const word=document.createElement("span");word.textContent=r.answer||"No respondió";
   const status=document.createElement("span");status.textContent=
     (r.verdict==="valid"?"+"+r.gain+" 🧱":r.verdict==="invalid"?"✕ No reconocida":"⌛ Sin respuesta")+
     (!r.alive?" · ELIMINADO":"");
   row.append(n,word,status);list.append(row);
  }
  this.clock();
 }
 draw(){
  const d=this.data,c=this.ctx,w=700,h=500;
  c.clearRect(0,0,w,h);
  const bg=c.createLinearGradient(0,0,0,h);
  bg.addColorStop(0,"#222447");bg.addColorStop(1,"#12152b");
  c.fillStyle=bg;c.fillRect(0,0,w,h);
  if(!d)return;
  const targetLava=Number(d.lava)||0;
  this.visualLava+= (targetLava-this.visualLava)*.075;
  const players=d.players;
  let highest=targetLava+12;
  for(const p of players){
   const current=this.visualHeights.get(p.user_id)??0;
   const next=lerp(current,Number(p.height),.085);
   this.visualHeights.set(p.user_id,next);
   highest=Math.max(highest,next+6);
  }
  highest=Math.max(23,highest);
  const floor=453,usable=398,unit=usable/highest;
  const xMargin=42,colWidth=(w-2*xMargin)/players.length;
  const towerWidth=Math.min(62,colWidth*.66);
  const lavaY=floor-this.visualLava*unit;
  // Towers are stacks of clearly separated individual square bricks.
  players.forEach((p,i)=>{
   const center=xMargin+colWidth*(i+.5),height=this.visualHeights.get(p.user_id)||0;
   const blocks=Math.max(0,Math.floor(height));
   for(let j=0;j<blocks;j++){
    const y=floor-(j+1)*unit+1;
    const tall=Math.max(1,unit-2);
    c.fillStyle=PALETTE[i%PALETTE.length];
    c.globalAlpha=p.alive?1:.50;
    c.fillRect(center-towerWidth/2,y,towerWidth,tall);
    c.fillStyle="#ffffff32";
    c.fillRect(center-towerWidth/2+3,y+2,towerWidth-6,Math.min(2,tall));
   }
   c.globalAlpha=1;
   const label=(p.user_id===this.userId?"TÚ":p.name).slice(0,11);
   c.font="800 12px sans-serif";c.textAlign="center";
   c.fillStyle=p.alive?"#fff":"#b5a8bb";
   c.fillText(label,center,Math.max(25,floor-height*unit-20));
   c.font="900 13px sans-serif";c.fillStyle="#ffebcc";
   c.fillText(p.height+"",center,Math.max(42,floor-height*unit-5));
  });
  // Lava overlays towers that no longer reach safety.
  const lavaGrad=c.createLinearGradient(0,lavaY,0,floor);
  lavaGrad.addColorStop(0,"#ffc156");lavaGrad.addColorStop(.16,"#ff702d");lavaGrad.addColorStop(1,"#bd1b31");
  c.fillStyle=lavaGrad;c.globalAlpha=.91;
  c.fillRect(0,lavaY,w,h-lavaY);c.globalAlpha=1;
  c.beginPath();c.moveTo(0,lavaY);
  for(let x=0;x<=w;x+=9)c.lineTo(x,lavaY+Math.sin(x*.033+performance.now()*.0027)*4);
  c.strokeStyle="#ffe796";c.lineWidth=4;c.stroke();
  c.font="900 14px sans-serif";c.textAlign="left";
  c.fillStyle="#fff4d6";c.fillText("🔥 LAVA "+d.lava,12,Math.max(20,lavaY-12));
  c.fillStyle="#546184";c.fillRect(0,floor,w,4);
 }
}
