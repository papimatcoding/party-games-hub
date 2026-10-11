// Clock compensation and adaptive snapshot delivery.
// Render loops remain requestAnimationFrame-driven at the device refresh rate.
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class NetworkClock{
 constructor(){this.offset=0;this.rtt=0;this.jitter=0;this.valid=false;this.samples=0;}
 sample(serverTime,sentAt,receivedAt){
  const serverMs=Date.parse(serverTime);
  if(!Number.isFinite(serverMs)||!Number.isFinite(sentAt)||!Number.isFinite(receivedAt))return false;
  const rtt=Math.max(0,receivedAt-sentAt);
  const candidate=serverMs-(sentAt+receivedAt)*.5;
  if(!this.valid){this.offset=candidate;this.rtt=rtt;this.jitter=0;this.valid=true;}
  else{
    const shock=Math.abs(candidate-this.offset);
    this.jitter=this.jitter*.8+shock*.2;
    // Large delayed packets must not suddenly rewind all visuals.
    const weight=rtt<this.rtt*1.35?.24:.045;
    this.offset+=clamp(candidate-this.offset,-100,100)*weight;
    this.rtt=this.rtt*.8+rtt*.2;
  }
  this.samples++;
  return true;
 }
 now(){return Date.now()+this.offset;}
 age(serverTime,maxSeconds=.75){
  const stamped=Date.parse(serverTime);
  return Number.isFinite(stamped)?clamp((this.now()-stamped)/1000,0,maxSeconds):0;
 }
 get latencyLabel(){return this.valid?Math.round(this.rtt)+"ms":"--";}
}
export function makeAdaptivePoller(fetchSnapshot,{active=()=>true,visible=()=>true,
  fast=220,slow=850,hidden=1800,onLatency=()=>{}}={}){
 let timer=null,stopped=false,inFlight=false;
 async function run(){
  if(stopped||!active()||inFlight)return;
  inFlight=true;
  const start=Date.now();
  let bad=false;
  try{await fetchSnapshot();}
  catch(e){bad=true;console.warn("Snapshot fetch:",e);}
  finally{
   inFlight=false;
   if(stopped||!active())return;
   const latency=Date.now()-start;
   onLatency(latency);
   // At high RTT, avoid stacking pending snapshots in PostgreSQL.
   // Do not throttle the frame loop: only transport cadence changes.
   const base=!visible()?hidden:latency>400?slow:fast;
   const pause=bad?Math.max(slow,base):base;
   timer=setTimeout(run,pause);
  }
 }
 return {
  start(){if(stopped)return;void run();},
  stop(){stopped=true;clearTimeout(timer);timer=null;},
  poke(){if(stopped||inFlight)return;clearTimeout(timer);timer=null;void run();}
 };
}
