import test from "node:test";
import assert from "node:assert/strict";
import {FrameMeter,NetworkClock} from "../js/netcode.js";
import {predictPongBall,pongEdge} from "../js/pongagono.js";
import {predictWagon} from "../js/fin-de-linea.js";

test("Server clock accepts normal RTT but dampens delayed time spikes",()=>{
 const net=new NetworkClock();
 const server=new Date(1750000000100).toISOString();
 assert.equal(net.sample(server,1750000000000,1750000000200),true);
 assert.equal(net.offset,0);
 assert.equal(net.rtt,200);
 const lateServer=new Date(1750000000500).toISOString();
 net.sample(lateServer,1750000000000,1750000001000);
 assert.ok(Math.abs(net.offset)<12, "long RTT should not jitter clock");
 assert.ok(net.jitter>=0);
 assert.equal(net.valid,true);
});
test("Frame meter works for 60 Hz and high-refresh 120 Hz loops",()=>{
 for(const fps of [60,120]){
  const meter=new FrameMeter();
  let reported=false;
  for(let frame=0;frame<=fps+1;frame++){
   reported=meter.tick(frame*1000/fps)||reported;
  }
  assert.ok(reported);
  assert.ok(Math.abs(meter.fps-fps)<=2,"report "+meter.fps+" for "+fps+"Hz");
 }
});
test("Pong collision prediction is continuous and bounded without 120 steps per frame",()=>{
 const n=pongEdge(4,0).normal;
 const initial={x:n.x*.5,y:n.y*.5,vx:n.x*1.35,vy:n.y*1.35,r:.035};
 const path=[.10,.15,.20,.35,.5].map(t=>predictPongBall(initial,4,t));
 for(const p of path){
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
  for(let side=0;side<4;side++){
   const edge=pongEdge(4,side);
   const projection=p.x*edge.normal.x+p.y*edge.normal.y;
   assert.ok(projection<=edge.apothem-initial.r+.001);
  }
 }
 assert.equal(pongEdge(6,2),pongEdge(6,2),"geometry cached");
});
test("Rail prediction stays axis-aligned after turn and never invents off-track travel",()=>{
 const p={x:4.94,y:5,next_x:5,next_y:5,direction:0,intent:1,alive:true};
 const next=predictWagon(p,.2);
 assert.ok(Math.abs(next.x-5)<1e-8);
 assert.ok(next.y>5);
 assert.equal(next.direction,1);
});
