// ¡PATINAZO! — fixed-power ice arena. Decisions are secret until the server
// resolves all trajectories and returns a synchronized, authoritative replay.
const $=id=>document.getElementById(id);
const TAU=2*Math.PI;
const CX=360,CY=360,SCALE=286,SPAWN=.66;
const COLORS=["#ffda83","#ff98bd","#86edda","#b69eff","#ffd0a0","#97b5ff","#c7ec93","#f5a5ff","#ffd5fc","#7dc9ff","#eaf6a6","#ffb799"];
export const ICE_POWER=0.96; // Presentation only. The server is authoritative.
export function arenaSides(count){return Math.max(4,count);}
export function arenaBase(sides){return sides===4?Math.PI/4:-Math.PI/2;}
export function iceVertices(sides,radius=1){
 const base=arenaBase(sides);
 return Array.from({length:sides},(_,i)=>({
   x:radius*Math.cos(base+i*TAU/sides),
   y:radius*Math.sin(base+i*TAU/sides)
 }));
}
export function cornerPosition(sides,corner){
 const base=arenaBase(sides);
 return {x:SPAWN*Math.cos(base+corner*TAU/sides),y:SPAWN*Math.sin(base+corner*TAU/sides)};
}
// The server now transmits each survivor's live position. Never reconstruct
// it from the originally allotted corner after the opening round.
export function currentIcePosition(player){
  return {x:Number(player.x),y:Number(player.y)};
}
function el(tag,cls,value){
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(value!==undefined)n.textContent=String(value);
 return n;
}
export class PatinazoGame{
 constructor({rpc,notify,leave,reset}){
   Object.assign(this,{rpc,notify,leave,reset});
   this.canvas=$("ice-canvas");this.ctx=this.canvas.getContext("2d");
   this.live=false;this.id=null;this.data=null;this.timer=null;this.frame=null;
   this.busy=false;this.inFlight=false;this.angle=null;this.dragging=false;this.lastRound=null;
   this.serverOffset=0;this.hasServerClock=false;
   this.canvas.addEventListener("pointerdown",e=>this.point(e,true));
   this.canvas.addEventListener("pointermove",e=>this.point(e,false));
   this.canvas.addEventListener("pointerup",e=>this.end(e));
   this.canvas.addEventListener("pointercancel",e=>this.end(e));
   this.canvas.addEventListener("keydown",e=>this.key(e));
   $("ice-confirm").addEventListener("click",()=>void this.submit());
   $("ice-exit").addEventListener("click",()=>void this.leave());
   $("ice-reset").addEventListener("click",()=>void this.reset());
 }
 enter(roomId,userId,code,hostId){
   if(this.live&&this.id===roomId){this.hostId=hostId;return;}
   this.exit();
   this.id=roomId;this.userId=userId;this.code=code;this.hostId=hostId;
   this.live=true;
   $("ice-screen").hidden=false;
   void this.refresh();
   this.timer=setInterval(()=>void this.refresh(),1100);
   const draw=()=>{
     if(!this.live)return;
     this.paint();
     this.clock();
     this.frame=requestAnimationFrame(draw);
   };
   this.frame=requestAnimationFrame(draw);
 }
 exit(){
   this.live=false;clearInterval(this.timer);cancelAnimationFrame(this.frame);
   this.timer=null;this.frame=null;this.id=null;this.data=null;this.angle=null;
   this.dragging=false;this.lastRound=null;this.serverOffset=0;this.hasServerClock=false;
   $("ice-screen").hidden=true;
 }
 get self(){return this.data?.players?.find(p=>p.user_id===this.userId);}
 get canAim(){return this.data?.phase==="planning"&&this.self?.alive&&this.serverNow()<Date.parse(this.data.deadline);}
 serverNow(){return Date.now()+this.serverOffset;}
 coords(e){
   const r=this.canvas.getBoundingClientRect();
   return{x:((e.clientX-r.left)/r.width*720-CX)/SCALE,
     y:((e.clientY-r.top)/r.height*720-CY)/SCALE};
 }
 point(e,start){
   if(!this.canAim)return;
   if(start){this.dragging=true;this.canvas.setPointerCapture?.(e.pointerId);}
   if(!this.dragging)return;
   const p=this.coords(e),home=currentIcePosition(this.self);
   if(Math.hypot(p.x-home.x,p.y-home.y)<.025)return;
   this.angle=(Math.atan2(p.y-home.y,p.x-home.x)+TAU)%TAU;
   e.preventDefault();
   this.hud();
 }
 end(e){
   if(!this.dragging)return;
   this.point(e,false);
   this.dragging=false;
   try{this.canvas.releasePointerCapture?.(e.pointerId);}catch{}
 }
 key(e){
   if(!this.canAim||!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key))return;
   e.preventDefault();
   if(this.angle===null)this.angle=0;
   const step=Math.PI/18;
   if(e.key==="ArrowLeft")this.angle=(this.angle-step+TAU)%TAU;
   if(e.key==="ArrowRight")this.angle=(this.angle+step)%TAU;
   if(e.key==="ArrowUp")this.angle=3*Math.PI/2;
   if(e.key==="ArrowDown")this.angle=Math.PI/2;
   this.hud();
 }
 async submit(){
   if(!this.canAim||this.angle===null||this.busy)return;
   this.busy=true;$("ice-confirm").disabled=true;
   try{
     await this.rpc("submit_ice_direction",{
       p_room_id:this.id,p_angle:Number(this.angle.toFixed(8))
     });
     this.notify("¡Trayectoria guardada! Los demás aún no la ven.");
     await this.refresh();
   }catch(e){this.notify("No se pudo guardar: "+e.message);}
   finally{this.busy=false;this.hud();}
 }
 async refresh(){
   if(!this.live||this.inFlight)return;
   this.inFlight=true;const id=this.id;
   try{
     const sentAt=Date.now();
     const d=await this.rpc("ice_state",{p_room_id:id});
     const doneAt=Date.now();
     if(!this.live||id!==this.id)return;
     if(!d){this.notify("No hay partida activa.");return;}
     const offset=Date.parse(d.server_time)-(sentAt+doneAt)/2;
     this.serverOffset=this.hasServerClock?this.serverOffset*.78+offset*.22:offset;
     this.hasServerClock=true;
     if(d.round!==this.lastRound){this.lastRound=d.round;this.angle=null;}
     if(this.angle===null&&d.my_direction!==null&&d.my_direction!==undefined&&d.phase==="planning"){
       this.angle=Number(d.my_direction);
     }
     this.data=d;this.hud();
   }catch(e){console.error(e);this.notify("Sincronización de ¡PATINAZO!: "+e.message);}
   finally{this.inFlight=false;}
 }
 clock(){
   const d=this.data;
   if(!d){$("ice-clock").textContent="--";return;}
   $("ice-clock").textContent=d.phase==="finished"?"★":
     String(Math.max(0,Math.ceil((Date.parse(d.deadline)-this.serverNow())/1000)))+"s";
   if(d.phase==="planning"&&this.serverNow()>=Date.parse(d.deadline))$("ice-confirm").disabled=true;
 }
 hud(){
   const d=this.data;if(!d)return;
   $("ice-round").textContent="RONDA "+d.round+" / 10";
   $("ice-phase").textContent=d.phase==="planning"?"DIRECCIÓN SECRETA":d.phase==="reveal"?"¡DESLIZANDO!":"FINAL";
   $("ice-count").textContent=d.players.filter(p=>p.alive).length+" / "+d.players.length+" en pie";
   $("ice-sides").textContent=d.sides===4?"CUADRADO":d.sides+" LADOS";
   $("ice-code").textContent=this.code;
   const button=$("ice-confirm");button.hidden=d.phase!=="planning"||!this.self?.alive;
   button.disabled=this.busy||!this.canAim||this.angle===null;
   button.textContent=d.my_direction===null||d.my_direction===undefined?"❄ Confirmar dirección":"↻ Cambiar dirección";
   const msg=$("ice-message");
   if(d.phase==="finished"){
     const winner=d.players.find(p=>p.user_id===d.winner_id);
     msg.textContent=winner?"🏆 ¡"+winner.name+" se lleva la victoria!":"🧊 Empate: nadie consiguió quedar como único superviviente.";
   }else if(d.phase==="reveal")msg.textContent="💥 ¡Choques y caídas! Nadie puede corregir su trayectoria.";
   else if(!this.self?.alive)msg.textContent="💀 Has caído del hielo. Puedes seguir observando.";
   else if(d.my_direction!==null&&d.my_direction!==undefined)msg.textContent="✓ Dirección preparada. Puedes cambiarla hasta que acabe el tiempo.";
   else msg.textContent="Apunta desde tu posición actual. La potencia es igual para todos y al terminar seguirás ahí la siguiente ronda.";
   $("ice-reset").hidden=d.phase!=="finished"||this.hostId!==this.userId;
   const list=$("ice-roster");list.replaceChildren();
   d.players.forEach((p,i)=>{
     const row=el("div","ice-player"+(p.alive?"":" ice-dead"));
     const dot=el("span","ice-player-dot","●");dot.style.color=COLORS[i%COLORS.length];
     const name=el("span","ice-player-name",p.name+(p.user_id===this.userId?" (tú)":""));
     const status=el("span","ice-player-status",!p.alive?"💀":d.phase==="planning"?(p.submitted?"✓":"…"):"●");
     row.append(dot,name,status);list.append(row);
   });
   this.clock();
 }
 path(vertices){
   const c=this.ctx;c.beginPath();
   vertices.forEach((v,i)=>i?c.lineTo(CX+v.x*SCALE,CY+v.y*SCALE):c.moveTo(CX+v.x*SCALE,CY+v.y*SCALE));
   c.closePath();
 }
 drawArena(sides){
   const c=this.ctx;c.clearRect(0,0,720,720);
   const bg=c.createRadialGradient(CX,CY,70,CX,CY,460);
   bg.addColorStop(0,"#132e46");bg.addColorStop(1,"#091021");
   c.fillStyle=bg;c.fillRect(0,0,720,720);
   const verts=iceVertices(sides);
   this.path(verts);
   const ice=c.createLinearGradient(100,100,600,600);
   ice.addColorStop(0,"#7ccee3");ice.addColorStop(.5,"#c8f5ff");ice.addColorStop(1,"#4c9fbf");
   c.shadowColor="#5cdefa";c.shadowBlur=40;c.fillStyle=ice;c.fill();c.shadowBlur=0;
   c.save();this.path(verts);c.clip();
   // Low-cost texture: translucent diagonal frozen striations.
   for(let i=-800;i<1300;i+=27){
     c.beginPath();c.moveTo(i,-50);c.lineTo(i+530,770);
     c.lineWidth=i%2?1:2;c.strokeStyle="#effdff3b";c.stroke();
   }
   for(let i=0;i<22;i++){
     const ax=80+(i*127)%550,ay=80+(i*179)%550;
     c.beginPath();c.moveTo(ax,ay);c.lineTo(ax+20+(i%4)*12,ay+8);
     c.lineTo(ax+37+(i%3)*19,ay-11);
     c.lineWidth=1.6;c.strokeStyle="#246e9842";c.stroke();
   }
   c.restore();
   this.path(verts);c.lineWidth=7;c.strokeStyle="#e3fcff";
   c.shadowColor="#58dbff";c.shadowBlur=15;c.stroke();c.shadowBlur=0;
   verts.forEach(v=>{
     const x=CX+v.x*SCALE,y=CY+v.y*SCALE;
     c.beginPath();c.arc(x,y,5,0,TAU);c.fillStyle="#fff";c.fill();
   });
 }
 person(p,color,name,alive=true){
   const c=this.ctx,x=CX+Number(p.x)*SCALE,y=CY+Number(p.y)*SCALE;
   c.globalAlpha=alive?1:.23;
   c.beginPath();c.arc(x,y,21,0,TAU);c.fillStyle="#0e294d8a";c.fill();
   c.beginPath();c.arc(x,y,16,0,TAU);
   c.fillStyle=color;c.shadowColor=color;c.shadowBlur=17;c.fill();c.shadowBlur=0;
   c.lineWidth=3;c.strokeStyle="#fff";c.stroke();
   c.font="800 13px sans-serif";c.fillStyle="#0c2d45";c.textAlign="center";c.fillText("❄",x,y+5);
   c.font="bold 14px sans-serif";c.fillStyle="#fff";c.strokeStyle="#143549";c.lineWidth=3;
   c.strokeText(name.slice(0,12),x,y-24);c.fillText(name.slice(0,12),x,y-24);
   c.globalAlpha=1;
 }
 arrow(pos,angle,color){
   const c=this.ctx,x=CX+pos.x*SCALE,y=CY+pos.y*SCALE;
   const ex=x+Math.cos(angle)*125,ey=y+Math.sin(angle)*125;
   c.strokeStyle=color;c.lineWidth=6;c.lineCap="round";
   c.shadowBlur=13;c.shadowColor=color;c.beginPath();c.moveTo(x,y);c.lineTo(ex,ey);c.stroke();c.shadowBlur=0;
   c.beginPath();c.moveTo(ex,ey);c.lineTo(ex-Math.cos(angle-.55)*22,ey-Math.sin(angle-.55)*22);
   c.moveTo(ex,ey);c.lineTo(ex-Math.cos(angle+.55)*22,ey-Math.sin(angle+.55)*22);c.stroke();
 }
 paint(){
   const d=this.data;
   this.drawArena(d?.sides||4);
   if(!d)return;
   const col=id=>COLORS[Math.max(0,d.players.findIndex(p=>p.user_id===id))%COLORS.length];
   if(d.phase==="planning"){
     d.players.forEach(p=>{
       if(!p.alive)return;
       this.person(currentIcePosition(p),col(p.user_id),p.user_id===this.userId?"TÚ":p.name,true);
     });
     if(this.angle!==null&&this.self?.alive){
       this.arrow(currentIcePosition(this.self),this.angle,col(this.userId));
     }
   }else{
     const frames=d.replay||[];
     if(!frames.length)return;
     let t=Math.max(0,(this.serverNow()-Date.parse(d.revealed_at))/1000);
     if(!Number.isFinite(t))t=0;
     const index=Math.min(frames.length-1,Math.floor(t/.08));
     const left=frames[index],right=frames[Math.min(index+1,frames.length-1)];
     const fraction=Math.max(0,Math.min(1,(t-Number(left.t))/.08));
     // Short motion trails reveal direction and build readable ice collisions.
     for(let k=Math.max(0,index-5);k<index;k++){
       const f=frames[k],next=frames[k+1];
       for(const p of f.players){
         const q=next.players.find(q=>q.user_id===p.user_id);
         if(!q||!p.alive)continue;
         const c=this.ctx;c.beginPath();c.moveTo(CX+Number(p.x)*SCALE,CY+Number(p.y)*SCALE);
         c.lineTo(CX+Number(q.x)*SCALE,CY+Number(q.y)*SCALE);
         c.globalAlpha=.10+(k-index+5)*.06;c.strokeStyle=col(p.user_id);c.lineWidth=5;c.stroke();c.globalAlpha=1;
       }
     }
     for(const p of left.players){
       const q=right.players.find(q=>q.user_id===p.user_id)||p;
       const show={x:Number(p.x)+(Number(q.x)-Number(p.x))*fraction,
         y:Number(p.y)+(Number(q.y)-Number(p.y))*fraction};
       this.person(show,col(p.user_id),d.players.find(x=>x.user_id===p.user_id)?.name||"",
         p.alive&&q.alive);
     }
   }
 }
}
