import {makeAvatar} from "./avatar-art.js?v=0.16.0";
// NO REPITAS! — server-authoritative hidden-answer survival game.
// Submitted texts are never checked in the browser against the private catalog.
const $=id=>document.getElementById(id);
const VERDICTS={
 valid:["✓","Sobrevive","nr-ok"],
 duplicate:["✕","Coincidencia","nr-bad"],
 reused:["↻","Ya estaba en lista negra","nr-bad"],
 invalid:["?","No figura en el catálogo","nr-bad"],
 timeout:["⌛","No respondió","nr-bad"]
};
function node(tag,klass,value){
 const n=document.createElement(tag);
 if(klass)n.className=klass;
 if(value!==undefined)n.textContent=String(value);
 return n;
}
export class NoRepitasGame{
 constructor({rpc,notify,leave,reset,avatarFor=()=>({})}){
   Object.assign(this,{rpc,notify,leave,reset,avatarFor});
   this.live=false;this.inFlight=false;this.busy=false;this.timer=null;this.round=null;
   this.data=null;this.id=null;
   $("nr-answer-form").addEventListener("submit",event=>{event.preventDefault();void this.submit();});
   $("nr-exit").addEventListener("click",()=>void this.leave());
   $("nr-reset").addEventListener("click",()=>void this.reset());
 }
 enter(roomId,userId,code,hostId){
   if(this.live&&this.id===roomId){this.hostId=hostId;return;}
   this.exit();
   this.live=true;this.id=roomId;this.userId=userId;this.hostId=hostId;this.code=code;
   $("nr-screen").hidden=false;
   this.refresh();
   this.timer=setInterval(()=>{
     this.clock();
     void this.refresh();
   },1100);
 }
 exit(){
   this.live=false;
   clearInterval(this.timer);this.timer=null;
   this.data=null;this.id=null;this.round=null;
   $("nr-screen").hidden=true;
 }
 get me(){return this.data?.players?.find(player=>player.user_id===this.userId);}
 get canWrite(){return this.data?.phase==="writing"&&this.me?.alive&&Date.now()<Date.parse(this.data.deadline);}
 async refresh(){
   if(!this.live||this.inFlight)return;
   this.inFlight=true;const id=this.id;
   try{
     const data=await this.rpc("nr_state",{p_room_id:id});
     if(!this.live||id!==this.id)return;
     if(!data){this.notify("La partida no está disponible.");return;}
     if(this.round!==data.round){
       this.round=data.round;
       $("nr-answer").value=data.my_answer||"";
     }else if(data.my_answer&&document.activeElement!==$("nr-answer")&&!$("nr-answer").value){
       $("nr-answer").value=data.my_answer;
     }
     this.data=data;this.render();
   }catch(error){console.error(error);this.notify("No se pudo sincronizar ¡NO REPITAS!: "+error.message);}
   finally{this.inFlight=false;}
 }
 async submit(){
   if(!this.canWrite||this.busy)return;
   const answer=$("nr-answer").value.trim();
   if(!answer||answer.length>65){this.notify("Escribe una respuesta de 1 a 65 caracteres.");return;}
   this.busy=true;$("nr-send").disabled=true;
   try{
     await this.rpc("submit_nr_answer",{p_room_id:this.id,p_answer:answer});
     this.notify("¡Respuesta guardada! Nadie puede verla todavía.");
     await this.refresh();
   }catch(error){this.notify("No se pudo enviar: "+error.message);}
   finally{this.busy=false;this.render();}
 }
 clock(){
   const target=$("nr-clock");
   if(!this.data){target.textContent="--";return;}
   if(this.data.phase==="finished"){target.textContent="★";return;}
   const n=Math.max(0,Math.ceil((Date.parse(this.data.deadline)-Date.now())/1000));
   target.textContent=String(n).padStart(2,"0")+"s";
   if(this.data.phase==="writing"&&n===0)$("nr-send").disabled=true;
 }
 render(){
   const d=this.data;
   if(!d)return;
   $("nr-topic").textContent=d.topic;
   $("nr-hint").textContent=d.hint;
   $("nr-round").textContent="RONDA "+d.round+" / 12";
   $("nr-phase").textContent=d.phase==="writing"?"RESPUESTAS SECRETAS":d.phase==="reveal"?"REVELACIÓN":"FINAL";
   $("nr-count").textContent=d.players.filter(p=>p.alive).length+" de "+d.players.length+" vivos";
   $("nr-code").textContent=this.code;
   const form=$("nr-answer-form"), info=$("nr-message"), send=$("nr-send");
   form.hidden=d.phase!=="writing"||!this.me?.alive;
   send.disabled=this.busy||!this.canWrite;
   send.textContent=d.my_answer?"↻ Cambiar respuesta":"Enviar respuesta →";
   if(d.phase==="finished"){
     const winner=d.players.find(p=>p.user_id===d.winner_id);
     info.textContent=winner?"🏆 ¡"+winner.name+" gana!":"💀 Nadie se ha quedado como único superviviente. Empate.";
   }else if(d.phase==="reveal")info.textContent="💥 Revelación simultánea. ¡Comprueba quién ha sobrevivido!";
   else if(!this.me?.alive)info.textContent="💀 Has sido eliminado. Mira cómo se las arregla el resto.";
   else if(d.my_answer)info.textContent="✓ Respuesta guardada. Puedes editarla mientras haya tiempo.";
   else info.textContent="Piensa una respuesta que nadie más vaya a elegir. ¡No repitas ninguna anterior!";
   const list=$("nr-roster");list.replaceChildren();
   for(const p of d.players){
     const row=node("div","nr-player"+(p.alive?"":" dead"));
     const dot=node("span","nr-player-dot",p.alive?"●":"✕");
     const name=node("span","nr-player-name",p.name+(p.user_id===this.userId?" (tú)":""));
     const stat=node("span","nr-player-status",!p.alive?"ELIMINADO":d.phase==="writing"?(p.submitted?"✓ ENVIADO":"ESCRIBIENDO"):"VIVO");
     row.append(dot,makeAvatar(this.avatarFor(p.user_id),"ph-game-avatar"),name,stat);list.append(row);
   }
   const results=$("nr-results"), entries=$("nr-result-list");
   results.hidden=d.phase==="writing";
   entries.replaceChildren();
   for(const r of d.results||[]){
     const meta=VERDICTS[r.verdict]||VERDICTS.invalid;
     const card=node("div","nr-result "+meta[2]);
     const title=node("div","nr-result-title");
     title.append(node("strong","",r.name),node("span","",r.answer||"Sin respuesta"));
     const status=node("span","nr-result-verdict",meta[0]+" "+meta[1]);
     card.append(title,status);
     if(r.user_id===this.userId && r.verdict==="invalid"){
       const report=node("button","nr-report-button",
         d.reported_invalid ? "✓ Enviada para revisión" : "⚑ Creo que era válida");
       report.type="button";
       report.disabled=Boolean(d.reported_invalid);
       report.addEventListener("click",async()=>{
         report.disabled=true;
         try{
           await this.rpc("nr_report_rejected_answer",{p_room_id:this.id,p_round_no:d.round});
           this.notify("Anotada para revisión del catálogo. No cambia esta partida.");
           await this.refresh();
         }catch(error){
           this.notify("No se pudo enviar la revisión: "+error.message);
           report.disabled=false;
         }
       });
       card.append(report);
     }
     entries.append(card);
   }
   $("nr-reset").hidden=d.phase!=="finished"||this.hostId!==this.userId;
   this.clock();
 }
}
