// PONGÁGONO: responsive Pong on a regular polygon.
// The database alone decides paddle catches, wall collisions, acceleration and KOs.
// This canvas only presents the latest authoritative state with short prediction.
const $=id=>document.getElementById(id);
const TAU=2*Math.PI,CENTER=350,SCALE=288;
const COLORS=["#ffc56c","#ff8fad","#8ce8df","#b29aff","#b8eb81","#86bcff",
 "#ffe28c","#f8adf8","#90eeaf","#ffae7b","#ccbdff","#7bd5f1"];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function pongSides(players){return Math.max(4,players);}
export function pongPaddleRatio(sides){return sides<=4?.38:Math.min(.64,.41+(sides-4)*.033);}
export function pongVertices(sides){
 const base=sides===4?Math.PI/4:-Math.PI/2;
 return Array.from({length:sides},(_,i)=>({
  x:Math.cos(base+i*TAU/sides),y:Math.sin(base+i*TAU/sides)
 }));
}
export function pongEdge(sides,side){
 const base=sides===4?Math.PI/4:-Math.PI/2;
 const phi=base+(side+.5)*TAU/sides;
 return {normal:{x:Math.cos(phi),y:Math.sin(phi)},
   tangent:{x:Math.sin(phi),y:-Math.cos(phi)},
   apothem:Math.cos(Math.PI/sides),
   halfside:Math.sin(Math.PI/sides)};
}
export function pongPaddleEnds(sides,side,u,ratio=pongPaddleRatio(sides)){
 const edge=pongEdge(sides,side);
 const halfPaddle=edge.halfside*ratio;
 const centerSpan=edge.halfside-halfPaddle;
 const offset=(clamp(u,0,1)-.5)*2*centerSpan;
 const cx=edge.normal.x*edge.apothem,cy=edge.normal.y*edge.apothem;
 const make=t=>({x:cx+edge.tangent.x*t,y:cy+edge.tangent.y*t});
 return {a:make(offset-halfPaddle),b:make(offset+halfPaddle)};
}
function el(tag,cls,content){
 const x=document.createElement(tag);if(cls)x.className=cls;
 if(content!==undefined)x.textContent=String(content);
 return x;
}
export class PongagonoGame {
 constructor({rpc,notify,leave,reset}){
  Object.assign(this,{rpc,notify,leave,reset});
  this.canvas=$("pong-canvas");this.ctx=this.canvas.getContext("2d");
  this.live=false;this.roomId=null;this.data=null;this.tickHandle=null;this.frame=null;
  this.loading=false;this.sending=false;this.pending=false;this.lastSend=0;this.lastRender=0;
  this.target=.5;this.visualU=null;this.dragging=false;this.holdLeft=false;this.holdRight=false;
  this.receivedAt=0;this.clockOffset=0;this.lastEliminations=null;
  this.canvas.addEventListener("pointerdown",e=>this.point(e,true));
  this.canvas.addEventListener("pointermove",e=>this.point(e,false));
  this.canvas.addEventListener("pointerup",e=>this.end(e));
  this.canvas.addEventListener("pointercancel",e=>this.end(e));
  $("pong-slider").addEventListener("input",e=>{
   if(!this.canMove)return;
   this.setTarget(Number(e.target.value)/100);
  });
  document.addEventListener("keydown",e=>this.key(e,true));
  document.addEventListener("keyup",e=>this.key(e,false));
  window.addEventListener("blur",()=>{this.holdLeft=false;this.holdRight=false;});
  $("pong-exit").addEventListener("click",()=>void this.leave());
  $("pong-reset").addEventListener("click",()=>void this.reset());
 }
 enter(roomId,userId,code,hostId){
  if(this.live&&this.roomId===roomId){this.hostId=hostId;return;}
  this.exit();
  this.roomId=roomId;this.userId=userId;this.code=code;this.hostId=hostId;
  this.live=true;$("pong-screen").hidden=false;
  void this.refresh();
  // 4 authoritative snapshots/sec + local prediction between packets.
  this.tickHandle=setInterval(()=>void this.refresh(),250);
  this.lastRender=performance.now();
  const render=timestamp=>{
   if(!this.live)return;
   const dt=Math.min(.06,Math.max(0,(timestamp-this.lastRender)/1000));
   this.lastRender=timestamp;
   this.stepInput(dt);this.paint(timestamp);this.clock();
   this.frame=requestAnimationFrame(render);
  };
  this.frame=requestAnimationFrame(render);
 }
 exit(){
  this.live=false;clearInterval(this.tickHandle);cancelAnimationFrame(this.frame);
  this.tickHandle=null;this.frame=null;this.roomId=null;this.data=null;
  this.dragging=false;this.holdLeft=false;this.holdRight=false;
  this.target=.5;this.visualU=null;this.lastEliminations=null;this.pending=false;
  $("pong-screen").hidden=true;
 }
 get self(){return this.data?.players?.find(p=>p.user_id===this.userId);}
 get canMove(){return this.live&&this.data?.phase!=="finished"&&this.self?.alive;}
 key(e,down){
  if(!this.live)return;
  if(!["ArrowLeft","ArrowRight","a","A","d","D"].includes(e.key))return;
  if(/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||""))return;
  if(!this.canMove&&down)return;
  e.preventDefault();
  if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")this.holdLeft=down;
  if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")this.holdRight=down;
 }
 point(e,down){
  if(!this.canMove)return;
  if(down){
   this.dragging=true;this.canvas.setPointerCapture?.(e.pointerId);
  }
  if(!this.dragging)return;
  e.preventDefault();
  const box=this.canvas.getBoundingClientRect();
  const px=(e.clientX-box.left)/box.width;
  const edge=pongEdge(this.data.sides,this.self.side);
  const centerSpan=edge.halfside*(1-this.data.paddle_ratio);
  const t=(px-.5)*(700/SCALE);
  this.setTarget(.5+t/(2*centerSpan));
 }
 end(e){
  if(!this.dragging)return;
  this.point(e,false);this.dragging=false;
  try{this.canvas.releasePointerCapture?.(e.pointerId);}catch{}
 }
 setTarget(value){
  this.target=clamp(value,0,1);
  this.pending=true;
  const slider=$("pong-slider");
  if(Math.abs(Number(slider.value)-this.target*100)>.6)slider.value=String(Math.round(this.target*100));
  this.send();
 }
 stepInput(dt){
  if(!this.canMove)return;
  const direction=Number(this.holdRight)-Number(this.holdLeft);
  if(direction){
   const e=pongEdge(this.data.sides,this.self.side);
   const span=e.halfside*(1-this.data.paddle_ratio);
   this.target=clamp(this.target+direction*1.04*dt/(2*span),0,1);
   $("pong-slider").value=String(Math.round(this.target*100));
   this.pending=true;
  }
  if(this.pending)this.send();
  if(this.visualU===null)this.visualU=Number(this.self.u);
  const e=pongEdge(this.data.sides,this.self.side);
  const maxRate=1.04/(2*e.halfside*(1-this.data.paddle_ratio));
  this.visualU+=clamp(this.target-this.visualU,-maxRate*dt,maxRate*dt);
 }
 async send(){
  const now=Date.now();
  if(!this.canMove||this.sending||now-this.lastSend<125)return;
  this.sending=true;this.pending=false;this.lastSend=now;const id=this.roomId;
  try{
   await this.rpc("pongagono_move",{p_room_id:id,p_position:Number(this.target.toFixed(4))});
  }catch(e){
   if(this.live&&id===this.roomId&&e.message!=="MATCH_FINISHED")
    console.warn("No se pudo mover la pala:",e.message);
  }finally{
   this.sending=false;
  }
 }
 async refresh(){
  if(!this.live||this.loading)return;
  this.loading=true;const id=this.roomId;
  try{
   const data=await this.rpc("pongagono_state",{p_room_id:id});
   if(!this.live||id!==this.roomId)return;
   if(!data)return;
   this.clockOffset=Date.parse(data.server_time)-Date.now();
   this.receivedAt=performance.now();
   if(!this.data){
    const me=data.players?.find(p=>p.user_id===this.userId);
    if(me){this.target=Number(me.u);this.visualU=Number(me.u);}
   }
   if(this.lastEliminations!==null&&data.eliminations>this.lastEliminations){
    this.notify("💥 "+(data.last_eliminated||"Un jugador")+" ha sido eliminado. ¡La velocidad vuelve al inicio!");
   }
   this.lastEliminations=data.eliminations;
   this.data=data;this.hud();
  }catch(e){
   console.error(e);
   // A transient network fault must not immediately end a game.
  }finally{this.loading=false;}
 }
 hud(){
  const d=this.data;if(!d)return;
  $("pong-shape").textContent=d.sides===4?"RING CUADRADO":d.sides+" LADOS";
  $("pong-code").textContent=this.code;
  $("pong-alive").textContent=d.players.filter(p=>p.alive).length+" de "+d.players.length+" vivos";
  $("pong-speed").textContent=Number(d.ball.speed).toFixed(2)+"×";
  $("pong-bounces").textContent=d.bounce_count+" rebotes";
  $("pong-phase").textContent=d.phase==="finished"?"FINAL":d.phase==="serve"?"SAQUE":"¡EN JUEGO!";
  const me=this.self;
  $("pong-slider").disabled=!this.canMove;
  if(me&&this.visualU===null)this.visualU=Number(me.u);
  let message;
  if(d.phase==="finished"){
   const winner=d.players.find(p=>p.user_id===d.winner_id);
   message=winner?"🏆 ¡"+winner.name+" gana PONGÁGONO!":"Partida finalizada sin ganador.";
  }else if(!me?.alive){
   message="💀 Tu lado se ha convertido en una pared. Mira cómo acaba.";
  }else if(d.phase==="serve"){
   message="🏓 Prepárate: saque al centro. Usa A/D, ←/→ o arrastra la pala horizontalmente.";
  }else{
   message="¡Defiende tu lado! Los rebotes aumentan la velocidad; al eliminar a alguien se reinicia.";
  }
  $("pong-message").textContent=message;
  $("pong-reset").hidden=d.phase!=="finished"||this.userId!==this.hostId;
  const list=$("pong-roster");list.replaceChildren();
  d.players.forEach((p,i)=>{
   const row=el("div","pong-member"+(p.alive?"":" pong-member-out"));
   const dot=el("span","pong-dot","●");dot.style.color=COLORS[i%COLORS.length];
   row.append(dot,el("strong","",p.name+(p.user_id===this.userId?" (tú)":"")),
    el("span","pong-member-state",p.alive?"PALA":"PARED"));
   list.append(row);
  });
 }
 clock(){
  if(!this.data)return;
  const seconds=Math.max(0,Math.ceil((Date.parse(this.data.serve_until)-Date.now()-this.clockOffset)/1000));
  $("pong-clock").textContent=this.data.phase==="serve"?"SAQUE EN "+seconds+"s":this.data.phase==="finished"?"🏆":"";
 }
 paint(now){
  const c=this.ctx,d=this.data;
  c.clearRect(0,0,700,700);
  const backdrop=c.createRadialGradient(350,350,40,350,350,470);
  backdrop.addColorStop(0,"#242954");backdrop.addColorStop(1,"#0b1025");
  c.fillStyle=backdrop;c.fillRect(0,0,700,700);
  if(!d)return;
  const sides=d.sides,vertices=pongVertices(sides);
  const mySide=this.self?.side??0;
  const myNormal=pongEdge(sides,mySide).normal;
  const angle=Math.PI/2-Math.atan2(myNormal.y,myNormal.x);
  const players=new Map(d.players.map((p,i)=>[p.side,{...p,color:COLORS[i%COLORS.length]}]));
  const scale=SCALE;
  c.save();c.translate(CENTER,CENTER);c.rotate(angle);c.scale(scale,scale);
  // Court fill / clipped faint grid.
  c.beginPath();vertices.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath();
  const surface=c.createRadialGradient(0,0,0,0,0,1.3);
  surface.addColorStop(0,"#273a6c");surface.addColorStop(1,"#142444");
  c.fillStyle=surface;c.fill();
  c.save();c.clip();c.lineWidth=.0025;c.strokeStyle="#8ac5ef1d";
  for(let k=-1.6;k<=1.6;k+=.11){
   c.beginPath();c.moveTo(k,-1.3);c.lineTo(k,1.3);c.stroke();
   c.beginPath();c.moveTo(-1.3,k);c.lineTo(1.3,k);c.stroke();
  }
  c.restore();
  c.beginPath();c.arc(0,0,.20,0,TAU);c.lineWidth=.006;c.strokeStyle="#6dc6f466";c.stroke();
  // The boundary is solid only on unused or eliminated sides.
  for(let i=0;i<sides;i++){
   const a=vertices[i],b=vertices[(i+1)%sides],player=players.get(i);
   c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);
   if(!player?.alive){
    c.strokeStyle="#89a6c9";c.lineWidth=.042;c.shadowColor="#779bd6";c.shadowBlur=14;
    c.stroke();c.shadowBlur=0;
   }else{
    c.strokeStyle=player.color+"4a";c.lineWidth=.012;c.setLineDash([.03,.018]);
    c.stroke();c.setLineDash([]);
   }
  }
  for(const [side,p] of players){
   if(!p.alive)continue;
   const u=side===mySide&&this.visualU!==null?this.visualU:Number(p.u);
   const ends=pongPaddleEnds(sides,side,u,d.paddle_ratio);
   c.lineCap="round";c.beginPath();c.moveTo(ends.a.x,ends.a.y);c.lineTo(ends.b.x,ends.b.y);
   c.lineWidth=.075;c.strokeStyle=p.color;c.shadowColor=p.color;c.shadowBlur=19;c.stroke();c.shadowBlur=0;
   c.beginPath();c.moveTo(ends.a.x,ends.a.y);c.lineTo(ends.b.x,ends.b.y);
   c.lineWidth=.014;c.strokeStyle="#fff";c.stroke();
   const edge=pongEdge(sides,side);
   c.save();c.translate(edge.normal.x*edge.apothem*1.14,edge.normal.y*edge.apothem*1.14);
   c.rotate(Math.atan2(edge.tangent.y,edge.tangent.x));
   c.scale(1/scale,1/scale);c.textAlign="center";
   c.font="bold 12px sans-serif";c.fillStyle=side===mySide?"#ffe5aa":"#cbdaf2";
   c.fillText(side===mySide?"TÚ":p.name.slice(0,11),0,0);
   c.restore();
  }
  // Render limited ball prediction for smoother movement between server samples.
  const b=d.ball;
  let x=Number(b.x),y=Number(b.y);
  if(d.phase==="live"){
   const ahead=clamp((now-this.receivedAt)/1000,0,.22);
   x+=Number(b.vx)*ahead;y+=Number(b.vy)*ahead;
   // Local prediction is visual only; prevent travelling outside the walls.
   const aperture=Math.cos(Math.PI/sides)-Number(b.r);
   for(let k=0;k<sides;k++){
    const n=pongEdge(sides,k).normal;
    const over=x*n.x+y*n.y-aperture;
    if(over>0){x-=over*n.x;y-=over*n.y;}
   }
  }
  c.beginPath();c.arc(x,y,Number(b.r)*2.25,0,TAU);
  c.fillStyle="#e5f8ff37";c.fill();
  c.beginPath();c.arc(x,y,Number(b.r),0,TAU);
  c.fillStyle="#fffdf2";c.shadowColor="#ffffff";c.shadowBlur=22;c.fill();c.shadowBlur=0;
  c.restore();
 }
}
