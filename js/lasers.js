import {makeAvatar} from "./avatar-art.js?v=0.16.0";
// Secret-placement Lásers: only own move is visible until server reveal.
export const HEX_SIZE=700;
const CENTER=350,SCALE=290,TAU=2*Math.PI;
const COLORS=["#ffdc77","#9be6e4","#ffa2ba","#bda6ff","#ff9e77","#b8dd8b","#91baff","#ffd295","#eaaaff","#8ce8ff","#f7d388","#aaffaf"];
export function insideHex(x,y,r){
  const safe=r-.075;
  return Number.isFinite(x)&&Number.isFinite(y)&&
    Math.abs(y)<=Math.sqrt(3)*safe/2&&
    Math.sqrt(3)*Math.abs(x)+Math.abs(y)<=Math.sqrt(3)*safe;
}
export function rayHits(ax,ay,angle,bx,by){
  const dx=bx-ax,dy=by-ay;
  return dx*Math.cos(angle)+dy*Math.sin(angle)>.001&&
    Math.abs(dx*Math.sin(angle)-dy*Math.cos(angle))<=.055;
}
function vertices(r){return Array.from({length:6},(_,i)=>({x:r*Math.cos(i*Math.PI/3),y:r*Math.sin(i*Math.PI/3)}));}
function endOfRay(x,y,angle,r){
  const dx=Math.cos(angle),dy=Math.sin(angle),verts=vertices(r);
  let distance=8;
  for(let i=0;i<6;i++){
    const a=verts[i],b=verts[(i+1)%6],sx=b.x-a.x,sy=b.y-a.y;
    const det=dx*sy-dy*sx;
    if(Math.abs(det)<1e-9)continue;
    const qx=a.x-x,qy=a.y-y,t=(qx*sy-qy*sx)/det,u=(qx*dy-qy*dx)/det;
    if(t>=0&&u>=0&&u<=1)distance=Math.min(distance,t);
  }
  return{x:x+dx*distance,y:y+dy*distance};
}
const $=id=>document.getElementById(id);
export class LaserGame{
  constructor({rpc,notify,leave,reset,avatarFor=()=>({})}){
    Object.assign(this,{rpc,notify,leave,reset,avatarFor});
    this.canvas=$("laser-canvas");this.ctx=this.canvas.getContext("2d");
    this.live=false;this.inFlight=false;this.timer=null;this.frame=null;this.lastRound=null;
    this.data=null;this.placement=null;this.dragging=false;
    this.canvas.addEventListener("pointerdown",e=>this.down(e));
    this.canvas.addEventListener("pointermove",e=>this.move(e));
    this.canvas.addEventListener("pointerup",e=>this.up(e));
    this.canvas.addEventListener("pointercancel",e=>this.up(e));
    $("laser-submit").addEventListener("click",()=>void this.submit());
    $("laser-exit").addEventListener("click",()=>void this.leave());
    $("laser-reset").addEventListener("click",()=>void this.reset());
  }
  enter(id,userId,code,hostId){
    if(this.live&&this.id===id){this.hostId=hostId;return;}
    this.exit();this.live=true;this.id=id;this.userId=userId;this.code=code;this.hostId=hostId;
    $("laser-screen").hidden=false;
    void this.refresh();
    this.timer=setInterval(()=>void this.refresh(),1100);
    const tick=()=>{
      if(!this.live)return;
      this.paint();
      if(this.data){
        $("laser-clock").textContent=this.data.phase==="finished"?"★":String(Math.max(0,Math.ceil((Date.parse(this.data.deadline)-Date.now())/1000)))+"s";
      }
      this.frame=requestAnimationFrame(tick);
    };
    this.frame=requestAnimationFrame(tick);
  }
  exit(){
    this.live=false;clearInterval(this.timer);cancelAnimationFrame(this.frame);
    this.data=null;this.id=null;this.placement=null;this.lastRound=null;
    $("laser-screen").hidden=true;
  }
  async refresh(){
    if(!this.live||this.inFlight)return;
    this.inFlight=true;const id=this.id;
    try{
      const d=await this.rpc("laser_state",{p_room_id:id});
      if(!this.live||id!==this.id)return;
      if(!d){this.notify("No existe una partida activa.");return;}
      if(d.round!==this.lastRound){this.lastRound=d.round;this.placement=null;}
      if(d.my_move&&!this.placement&&d.phase==="planning"){
        this.placement={x:Number(d.my_move.x),y:Number(d.my_move.y),angle:Number(d.my_move.angle)};
      }
      this.data=d;this.hud();
    }catch(e){console.error(e);this.notify("Error de conexión en Lásers: "+e.message);}
    finally{this.inFlight=false;}
  }
  get self(){return this.data?.players?.find(p=>p.user_id===this.userId);}
  get canAim(){return this.data?.phase==="planning"&&this.self?.alive&&Date.now()<Date.parse(this.data.deadline);}
  coords(event){
    const r=this.canvas.getBoundingClientRect();
    return{x:((event.clientX-r.left)/r.width*700-350)/SCALE,y:((event.clientY-r.top)/r.height*700-350)/SCALE};
  }
  down(e){
    if(!this.canAim)return;
    const p=this.coords(e);
    if(!insideHex(p.x,p.y,Number(this.data.radius)))return;
    this.placement={x:p.x,y:p.y,angle:this.placement?.angle??0};
    this.dragging=true;this.canvas.setPointerCapture?.(e.pointerId);e.preventDefault();
  }
  move(e){
    if(!this.dragging||!this.placement)return;
    const p=this.coords(e),v=this.placement;
    if(Math.hypot(p.x-v.x,p.y-v.y)<.025)return;
    v.angle=(Math.atan2(p.y-v.y,p.x-v.x)+TAU)%TAU;
    e.preventDefault();
  }
  up(e){
    if(!this.dragging)return;
    this.move(e);this.dragging=false;
    try{this.canvas.releasePointerCapture?.(e.pointerId);}catch{}
    this.hud();
  }
  async submit(){
    if(!this.canAim||!this.placement)return;
    const b=$("laser-submit");b.disabled=true;
    try{
      const p=this.placement;
      await this.rpc("submit_laser_move",{
        p_room_id:this.id,p_x:Number(p.x.toFixed(5)),p_y:Number(p.y.toFixed(5)),p_angle:Number(p.angle.toFixed(8))
      });
      this.notify("¡Disparo oculto guardado!");
      await this.refresh();
    }catch(e){this.notify("No se pudo guardar: "+e.message);}
    finally{this.hud();}
  }
  hud(){
    const d=this.data;if(!d)return;
    $("laser-round").textContent="RONDA "+d.round+" / 9";
    $("laser-phase").textContent=d.phase==="planning"?"PREPARACIÓN":d.phase==="reveal"?"REVELACIÓN":"FINAL";
    $("laser-code").textContent=this.code;
    $("laser-alive").textContent=d.players.filter(p=>p.alive).length+" de "+d.players.length+" vivos";
    const mine=this.self,msg=$("laser-message");
    if(d.phase==="finished"){
      const winner=d.players.find(p=>p.user_id===d.winner_id);
      msg.textContent=winner?"🏆 "+winner.name+" gana la partida.":"💀 Empate: no quedó un único superviviente.";
    }else if(d.phase==="reveal")msg.textContent="⚡ ¡Todos los disparos se ejecutaron a la vez!";
    else if(!mine?.alive)msg.textContent="💀 Eliminado. Observa a los supervivientes.";
    else if(d.my_move)msg.textContent="✓ Movimiento oculto enviado. Puedes cambiarlo mientras quede tiempo.";
    else msg.textContent="Pulsa para colocarte y arrastra hacia la dirección del disparo.";
    const b=$("laser-submit");
    b.hidden=d.phase!=="planning"||!mine?.alive;
    b.disabled=!this.placement||!this.canAim;
    b.textContent=d.my_move?"↻ Cambiar disparo":"⚡ Confirmar disparo";
    $("laser-reset").hidden=d.phase!=="finished"||this.hostId!==this.userId;
    const list=$("laser-players");list.replaceChildren();
    d.players.forEach((p,i)=>{
      const item=document.createElement("div");item.className="laser-member"+(p.alive?"":" eliminated");
      const circle=document.createElement("span");circle.className="laser-member-dot";circle.style.background=COLORS[i%COLORS.length];
      const name=document.createElement("span");name.textContent=p.name+(p.user_id===this.userId?" (tú)":"");
      const status=document.createElement("b");status.textContent=!p.alive?"💀":d.phase==="planning"?(p.submitted?"✓":"…"):"●";
      item.append(circle,makeAvatar(this.avatarFor(p.user_id),"ph-game-avatar"),name,status);list.append(item);
    });
  }
  path(radius){
    const c=this.ctx,v=vertices(radius);c.beginPath();
    v.forEach((p,i)=>{const x=CENTER+p.x*SCALE,y=CENTER+p.y*SCALE;i?c.lineTo(x,y):c.moveTo(x,y);});c.closePath();
  }
  beam(shot,r,color){
    const c=this.ctx,x=Number(shot.x),y=Number(shot.y),a=Number(shot.angle);
    const end=endOfRay(x,y,a,r);
    c.beginPath();c.moveTo(CENTER+x*SCALE,CENTER+y*SCALE);
    c.lineTo(CENTER+end.x*SCALE,CENTER+end.y*SCALE);
    c.strokeStyle=color;c.lineWidth=4;c.shadowColor=color;c.shadowBlur=19;c.stroke();c.shadowBlur=0;
  }
  person(shot,name,color,dead){
    const c=this.ctx,px=CENTER+Number(shot.x)*SCALE,py=CENTER+Number(shot.y)*SCALE;
    c.fillStyle=dead?"#677087":color;c.strokeStyle="#fff";c.lineWidth=3;
    c.beginPath();c.arc(px,py,14,0,TAU);c.fill();c.stroke();
    if(dead){c.beginPath();c.moveTo(px-5,py-5);c.lineTo(px+5,py+5);c.moveTo(px+5,py-5);c.lineTo(px-5,py+5);c.stroke();}
    c.font="bold 14px sans-serif";c.textAlign="center";c.fillStyle="#fff";c.fillText((name||"").slice(0,14),px,py-24);
  }
  paint(){
    const c=this.ctx,d=this.data,r=Number(d?.radius??1),v=vertices(r);
    const gradient=c.createRadialGradient(350,350,60,350,350,480);
    gradient.addColorStop(0,"#263653");gradient.addColorStop(1,"#0b1023");
    c.fillStyle=gradient;c.fillRect(0,0,700,700);
    for(let outline=1;outline>r+.01;outline-=.15){
      this.path(outline);c.strokeStyle="#f1786b66";c.lineWidth=3;c.setLineDash([12,14]);c.stroke();
    }
    c.setLineDash([]);
    this.path(r);c.fillStyle="#34486c";c.fill();
    c.save();this.path(r);c.clip();c.strokeStyle="#ffffff15";c.lineWidth=1;
    for(let i=0;i<=700;i+=36){
      c.beginPath();c.moveTo(i,0);c.lineTo(i,700);c.stroke();
      c.beginPath();c.moveTo(0,i);c.lineTo(700,i);c.stroke();
    }
    c.restore();
    this.path(r);c.strokeStyle="#9aebff";c.lineWidth=6;c.shadowBlur=20;c.shadowColor="#5fe6ff";c.stroke();c.shadowBlur=0;
    if(!d)return;
    const color=id=>COLORS[Math.max(0,d.players.findIndex(p=>p.user_id===id))%COLORS.length];
    if(d.phase==="planning"){
      if(this.placement&&this.self?.alive){
        this.beam(this.placement,r,color(this.userId));
        this.person(this.placement,"TÚ",color(this.userId),false);
      }
    }else{
      for(const shot of d.shots||[])this.beam(shot,r,color(shot.user_id));
      for(const shot of d.shots||[]){
        const player=d.players.find(p=>p.user_id===shot.user_id);
        this.person(shot,player?.name,color(shot.user_id),!player?.alive&&player?.killed_round===d.round);
      }
    }
  }
}
