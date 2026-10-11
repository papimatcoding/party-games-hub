import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js?v=0.11.0";
import { LaserGame } from "./lasers.js?v=0.11.0";
import { NoRepitasGame } from "./no-repitas.js?v=0.11.0";
import { PatinazoGame } from "./patinazo.js?v=0.11.0";
import { PongagonoGame } from "./pongagono.js?v=0.11.0";
import { LavalabrasGame } from "./lavalabras.js?v=0.11.0";
import { FinDeLineaGame } from "./fin-de-linea.js?v=0.11.0";
import { PuertaONadaGame } from "./puerta-o-nada.js?v=0.11.0";

import { APP_BUILD } from "./release.js?v=0.11.0";
const $ = (id) => document.getElementById(id);
const GAMES = [
  { id: "lasers", emoji: "⚡", name: "Lásers" },
  { id: "no_repitas", emoji: "🧠", name: "¡NO REPITAS!" },
  { id: "patinazo", emoji: "🧊", name: "¡PATINAZO!" },
  { id: "pongagono", emoji: "🏓", name: "PONGÁGONO" },
  { id: "lavalabras", emoji: "🌋", name: "LAVALABRAS" },
  { id: "fin_de_linea", emoji: "🚂", name: "¡FIN DE LÍNEA!" },
  { id: "puerta_o_nada", emoji: "🚪", name: "PUERTA O NADA" }
];
const state = { client: null, user: null, roomId: null, room: null, members: [], messages: [], channel: null, poll: null, busy: false, syncing: false };
let toastTimeout;
let lasers = null;
let noRepitas = null;
let patinazo = null;
let pongagono = null;
let lavalabras = null;
let finDeLinea = null;
let puertaONada = null;
let partyCache = { signature: null, loading: false, data: null };
let partyData = null;
let partyPoll = null;
let partyBusy = false;
let gameGateData=null;
let gameGatePoll=null;
let releasePoll=null;
let gateBusy=false;
let versionBlocked=false;

let nrTopicsCache = { signature: null, items: [], loading: false };
function renderNrTopicSettings() {
  const box = $("nr-topic-settings");
  if (!box || !state.room) return;
  const room = state.room;
  const enabled = room.mode === "freeplay" && room.game_id === "no_repitas" && room.status === "lobby";
  box.hidden = !enabled;
  if (!enabled) return;
  const signature = state.roomId + ":" + state.members.length;
  const select = $("nr-topic-select");
  const renderOptions = () => {
    if (box.hidden || !state.room || state.roomId + ":" + state.members.length !== signature) return;
    const selected = state.room.nr_topic_id || "";
    select.replaceChildren();
    const random = element("option", "", "🎲 Aleatorio (sorpresa)");
    random.value = "";
    select.appendChild(random);
    for (const item of nrTopicsCache.items) {
      const option = element("option", "", item.title + " (" + item.answer_count + ")");
      option.value = item.id;
      select.appendChild(option);
    }
    if (selected && !nrTopicsCache.items.some(t => t.id === selected)) {
      const invalid = element("option", "", "⚠ Tema ya no apto para este grupo");
      invalid.value = selected;
      invalid.disabled = true;
      select.appendChild(invalid);
    }
    select.value = selected;
    select.disabled = room.host_user_id !== state.user.id || nrTopicsCache.loading;
    const chosen = nrTopicsCache.items.find(t => t.id === selected);
    $("nr-topic-help").textContent = chosen
      ? chosen.hint
      : selected ? "El grupo ha cambiado. Elige un tema válido."
      : "🎲 Se anunciará una categoría sorpresa al comenzar la partida.";
  };
  if (nrTopicsCache.signature !== signature) {
    nrTopicsCache.signature = signature;
    nrTopicsCache.items = [];
    nrTopicsCache.loading = true;
    void rpc("nr_list_topics", { p_room_id: state.roomId })
      .then((topics) => {
        if (nrTopicsCache.signature !== signature) return;
        nrTopicsCache.items = Array.isArray(topics) ? topics : [];
      })
      .catch(error => notify("No se pudieron cargar los temas: " + friendlyError(error)))
      .finally(() => {
        if (nrTopicsCache.signature !== signature) return;
        nrTopicsCache.loading = false;
        renderOptions();
      });
  }
  renderOptions();
}


function renderPartyPreview() {
  const section=$("party-preview-panel");
  if(!section||!state.room)return;
  section.hidden=state.room.mode!=="party"||state.room.status!=="lobby";
  if(section.hidden)return;
  const signature=state.roomId+":"+state.room.updated_at+":"+state.members.length;
  const show=()=>{
    if(section.hidden)return;
    const list=$("party-list"),scores=$("party-score-list");
    list.replaceChildren();scores.replaceChildren();
    const d=partyCache.data;
    if(!d||!d.enabled){
      list.append(element("p","muted",partyCache.loading?"Consultando el circuito...":"El anfitrión puede preparar el circuito de cinco minijuegos."));
    }else{
      for(const game of d.schedule||[]){
        const info=GAMES.find(g=>g.id===game.game);
        const line=element("div","party-list-row");
        line.append(element("span","party-num",game.slot+"."),
          element("strong","",info?.emoji+" "+info?.name||game.game),
          element("span","",game.completed?"✅":"—"));
        list.append(line);
      }
      for(const player of d.scores||[]){
        const line=element("div","party-score-row");
        line.append(element("strong","",player.name),
          element("span","party-medals","🥇"+player.gold+" 🥈"+player.silver+" 🥉"+player.bronze),
          element("span","party-points",player.score+" pts"));
        scores.append(line);
      }
    }
    $("party-shuffle").hidden=state.room.host_user_id!==state.user.id;
  };
  if(partyCache.signature!==signature){
    partyCache={ signature, loading:true, data:null };
    void rpc("party_state",{p_room_id:state.roomId})
      .then(d=>{if(partyCache.signature===signature)partyCache.data=d;})
      .catch(e=>notify("No se pudo consultar el circuito: "+friendlyError(e)))
      .finally(()=>{if(partyCache.signature===signature){partyCache.loading=false;show();}});
  }
  show();
}


const medals={1:"🥇",2:"🥈",3:"🥉"};
function partyGameLabel(gameId) {
  const g=GAMES.find(x=>x.id===gameId);
  return g ? g.emoji+" "+g.name : gameId;
}
function renderPartyPresentation() {
  const r=state.room, d=partyData;
  const enabled=r?.mode==="party"&&r.status==="playing";
  const between=enabled&&d&&d.current_game===r.game_id&&
    (d.phase==="intermission"||d.phase==="finished");
  document.body.classList.toggle("party-active",Boolean(enabled));
  $("party-live-screen").hidden=!between;
  $("party-hud").hidden=!enabled||Boolean(between);
  if(!enabled||!d)return;
  const scores=Array.isArray(d.scores)?d.scores:[];
  const slot=(d.schedule||[]).find(x=>x.slot===d.current_slot);
  const isHost=r.host_user_id===state.user?.id;
  $("party-hud-label").textContent="🏅 PRUEBA "+d.current_slot+" DE "+d.length+" · "+partyGameLabel(d.current_game);
  const self=scores.find(x=>x.user_id===state.user?.id);
  $("party-hud-score").textContent=self
    ? "Tus medallas: 🥇 "+self.gold+" · 🥈 "+self.silver+" · 🥉 "+self.bronze+" · "+self.score+" pts"
    : "Las medallas se entregan al acabar cada prueba";
  $("party-cancel").hidden=!isHost||d.phase==="finished";
  if(!between)return;
  lasers?.exit();noRepitas?.exit();patinazo?.exit();pongagono?.exit();lavalabras?.exit();finDeLinea?.exit();puertaONada?.exit();
  $("lobby-screen").hidden=true;
  $("game-ready-overlay").hidden=true;
  const isFinal=d.phase==="finished";
  const champions=scores.filter(x=>x.place===1);
  $("party-live-title").textContent=isFinal
    ? (champions.length===1?"🏆 ¡"+champions[0].name+" GANA LA FIESTA!":"🏆 ¡EMPATE EN LA FIESTA!")
    : "🏅 ¡PRUEBA "+d.current_slot+" SUPERADA!";
  const next=d.schedule?.find(x=>x.slot===d.current_slot+1);
  $("party-live-subtitle").textContent=isFinal
    ? "Circuito completado. La clasificación definitiva se decide por puntos, oros y platas."
    : "Siguiente prueba: "+partyGameLabel(next?.game||"")+". Todos debéis marcar «Listo» para continuar.";
  const remaining=Math.max(0,Math.ceil((Date.parse(d.transition_at)-Date.now())/1000));
  $("party-live-clock").textContent=isFinal?"🎉 CIRCUITO TERMINADO":
    remaining>0?"🏅 Podio · al menos "+remaining+"s más":"🏅 Podio · esperaremos a todos";
  $("party-podium-title").textContent=isFinal?"🏅 Podio de la quinta prueba":"🏅 Medallas de la prueba "+d.current_slot;
  const podium=$("party-podium");podium.replaceChildren();
  if(slot?.podium?.length){
    for(const entry of slot.podium){
      const line=element("div","party-live-medal-row");
      line.append(element("span","party-live-medal-icon",medals[entry.rank]||"🏅"),
        element("strong","",entry.name),
        element("span","",entry.rank===1?"ORO · +3":entry.rank===2?"PLATA · +2":"BRONCE · +1"));
      podium.append(line);
    }
  }else podium.append(element("p","muted","Nadie ha conseguido medalla en esta prueba."));
  const standings=$("party-live-standings");standings.replaceChildren();
  for(const player of scores){
    const line=element("div","party-live-rank");
    line.append(element("span","",String(player.place||"–")+"º"),
      element("strong","",player.name+(player.user_id===state.user?.id?" (tú)":"")),
      element("span","","🥇"+player.gold+" 🥈"+player.silver+" 🥉"+player.bronze),
      element("span","party-live-points",player.score+" pts"));
    standings.append(line);
  }
  const schedule=$("party-live-schedule");schedule.replaceChildren();
  for(const item of d.schedule||[]){
    const line=element("div","party-live-schedule-row");
    line.append(element("span","",item.slot+"."),
      element("strong","",partyGameLabel(item.game)),
      element("span",item.completed?"✓ Completado":item.slot===d.current_slot?"En curso":"Pendiente"));
    if(item.completed)line.lastChild.className="party-live-done";
    schedule.append(line);
  }
  const nextPanel=$("party-next-panel"),nextReady=$("party-next-ready");
  nextPanel.hidden=isFinal;
  if(!isFinal){
    $("party-next-status").textContent=(d.ready_count||0)+" / "+(d.ready_total||0)+
      " listos para la siguiente prueba"+(remaining>0?" · podio "+remaining+"s":"");
    nextReady.disabled=Boolean(d.my_ready);
    nextReady.textContent=d.my_ready?"✓ Preparado · esperando al grupo":"✓ Listo para la siguiente prueba";
  }
  const back=$("party-return");
  back.hidden=false;
  back.textContent=isHost
    ? (isFinal?"↩ Volver al lobby y preparar otra fiesta":"Cancelar el circuito")
    : "← Abandonar la sala";
}
async function syncParty() {
  const room=state.room,roomId=state.roomId;
  if(!roomId||!room||room.mode!=="party"||room.status!=="playing"||partyBusy)return;
  partyBusy=true;
  try{
    const next=await rpc("party_state",{p_room_id:roomId});
    if(roomId!==state.roomId||state.room?.mode!=="party")return;
    const old=partyData;
    partyData=next;
    renderPartyPresentation();
    // A server tick may finish a minigame or start the next game.
    if(state.room.game_id!==next.current_game||
      !old||old.phase!==next.phase||old.current_slot!==next.current_slot){
      await syncRoom();
    }
  }catch(e){console.error("Modo Fiesta:",e); }
  finally{partyBusy=false;}
}
async function leavePartyCircuit() {
  if(state.room?.host_user_id!==state.user?.id){
    await rpc("leave_room",{p_room_id:state.roomId});
    showHome("Has abandonado el Modo Fiesta.");
    return;
  }
  if(partyData?.phase!=="finished"&&!confirm("¿Cancelar toda la fiesta? Se perderán las medallas de esta sesión."))return;
  await rpc("party_exit",{p_room_id:state.roomId});
  partyData=null;
  partyCache={signature:null,loading:false,data:null};
  await syncRoom();
}


function blockOldVersion(reason) {
  versionBlocked=true;
  $("version-message").textContent=reason||"La versión instalada no coincide con la requerida por el servidor.";
  $("version-overlay").hidden=false;
  $("game-ready-overlay").hidden=true;
}
async function validateRelease() {
  const resp=await fetch("./release.json?check="+Date.now(),{cache:"no-store"});
  if(!resp.ok)throw new Error("No se pudo comprobar la versión publicada.");
  const published=await resp.json();
  const backend=await rpc("required_client_build",{});
  if(published.build!==APP_BUILD||backend!==APP_BUILD){
    blockOldVersion("Versión local "+APP_BUILD+" · versión requerida "+backend+". Todos necesitáis actualizar.");
    throw new Error("CLIENT_VERSION_OUTDATED");
  }
  return true;
}
function renderGameGate() {
  const r=state.room, d=gameGateData;
  if(versionBlocked){$("game-ready-overlay").hidden=true;return;}
  if(!r||r.status!=="playing"||
    (r.mode==="party"&&partyData&&partyData.current_game===r.game_id
      &&["intermission","finished"].includes(partyData.phase))){
    $("game-ready-overlay").hidden=true;return;
  }
  if(d?.game_id===r.game_id&&d.active===false){
    // A legacy match already underway before deployment has no ready gate.
    $("game-ready-overlay").hidden=true;return;
  }
  const known=d?.game_id===r.game_id&&d.active;
  const when=known&&d.live_at?Date.parse(d.live_at):null;
  const remain=when===null?null:Math.max(0,Math.ceil((when-Date.now())/1000));
  if(known&&when!==null&&remain===0){
    $("game-ready-overlay").hidden=true;return;
  }
  $("game-ready-overlay").hidden=false;
  const button=$("game-ready-confirm");
  if(!known){
    $("game-ready-heading").textContent="Cargando la partida...";
    $("game-ready-description").textContent="Sincronizando jugadores y versión.";
    $("game-ready-counter").textContent="Comprobando...";
    button.disabled=true;button.hidden=false;
  }else if(when!==null){
    $("game-ready-heading").textContent="¡Todos preparados!";
    $("game-ready-description").textContent="La partida empieza para todos a la vez.";
    $("game-ready-counter").textContent="🏁 "+remain+" · "+(d.ready_count||0)+"/"+(d.ready_total||0)+" listos";
    button.hidden=true;
  }else{
    $("game-ready-heading").textContent="¿Listos para "+(GAMES.find(x=>x.id===r.game_id)?.name||"jugar")+"?";
    $("game-ready-description").textContent="Tu juego ya está cargado. La cuenta atrás no arrancará hasta que todos pulséis Listo.";
    $("game-ready-counter").textContent=d.ready_count+" / "+d.ready_total+" jugadores listos";
    button.hidden=false;button.disabled=Boolean(d.my_ready);
    button.textContent=d.my_ready?"✓ Ya estás listo":"✓ Estoy listo, empezar";
  }
}
async function syncGameGate() {
  const room=state.room,roomId=state.roomId;
  if(!room||!roomId||room.status!=="playing"||versionBlocked||gateBusy)return;
  // After the agreed start, the game engines own their state. No need for
  // another 1.25 RPCs/second/player for the gate during the entire match.
  if(gameGateData?.active&&gameGateData.game_id===room.game_id&&
    gameGateData.live_at&&Date.now()>Date.parse(gameGateData.live_at)+4000)return;
  gateBusy=true;
  try{
    const data=await rpc("game_gate_state",{p_room_id:roomId});
    if(roomId!==state.roomId||state.room?.status!=="playing")return;
    gameGateData=data;
    renderGameGate();
  }catch(e){console.error("Preparación:",e);}
  finally{gateBusy=false;}
}

function notify(message) {
  const el = $("toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { el.hidden = true; }, 5000);
}
const errors = {
  AUTH_REQUIRED: "Necesitas una sesión de invitado.",
  NAME_INVALID: "Escribe un apodo de 2 a 20 caracteres.",
  CODE_INVALID: "El código debe tener seis letras o números.",
  ROOM_NOT_FOUND: "No encontramos esa sala. Revisa el código.",
  ROOM_FULL: "La sala está completa.",
  ROOM_ALREADY_STARTED: "Esa sala ya ha comenzado.",
  NOT_A_MEMBER: "Ya no formas parte de esta sala.",
  ROOM_NOT_IN_LOBBY: "La sala ya ha empezado.",
  HOST_ONLY: "Esto solo puede hacerlo el anfitrión.",
  NEED_TWO_PLAYERS: "Hace falta al menos otro jugador.",
  NOT_ALL_READY: "Todos los jugadores deben estar preparados.",
  SLOW_DOWN: "¡Un mensaje por segundo, máquina!",
  MESSAGE_INVALID: "El mensaje debe tener entre 1 y 240 caracteres.",
  OUTSIDE_HEX: "¡Elige una posición dentro del hexágono!",
  ANGLE_INVALID: "El ángulo del láser no es válido.",
  PLANNING_CLOSED: "Se agotó el tiempo. Espera la revelación.",
  ELIMINATED: "Ya has sido eliminado.",
  PARTY_COMING_SOON: "El Modo Party todavía no está disponible.",
  USE_LASER_START: "Esta sala tiene que iniciar Lásers.",
  WRONG_GAME: "Elige un minijuego disponible en Juego libre.",
  WRITING_CLOSED: "El tiempo de esta ronda ya ha terminado.",
  ANSWER_INVALID_LENGTH: "Escribe una respuesta de entre 1 y 65 caracteres.",
  GAME_NOT_AVAILABLE: "Ese minijuego todavía no está disponible.",
  NO_SUITABLE_TOPIC: "No hay suficientes temas para ese tamaño de grupo."
};
function friendlyError(error) {
  const msg = error?.message || String(error);
  if (error?.code === "anonymous_provider_disabled" || /anonymous sign.ins are disabled/i.test(msg)) {
    return "Activa Authentication → Providers → Anonymous Sign-Ins en el proyecto Supabase de Party Hub.";
  }
  const found = Object.keys(errors).find((key) => msg.includes(key));
  return found ? errors[found] : msg;
}
async function action(fn, button) {
  if (state.busy) return;
  state.busy = true;
  if (button) button.disabled = true;
  try { await fn(); }
  catch (error) { console.error(error); notify(friendlyError(error)); }
  finally { state.busy = false; if (button) button.disabled = false; }
}
function requireName() {
  const name = $("player-name").value.trim();
  if (name.length < 2 || name.length > 20) throw new Error("NAME_INVALID");
  try { localStorage.setItem("partyhub_name", name); } catch {}
  return name;
}
function requireClient() {
  if (!state.client) throw new Error("La base de datos todavía no está conectada.");
  return state.client;
}
async function ensureGuest() {
  const sb = requireClient();
  const { data: existing, error: existingError } = await sb.auth.getUser();
  if (existingError && existingError.status !== 401 && existingError.status !== 403) {
    console.warn("Existing session invalid:", existingError.message);
  }
  if (existing?.user) { state.user = existing.user; return existing.user; }
  const { data, error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  state.user = data.user;
  return data.user;
}
async function rpc(name, params) {
  const { data, error } = await requireClient().rpc(name, params);
  if (error) throw error;
  return data;
}
function setRoute(code) {
  const url = new URL(window.location.href);
  if (code) url.searchParams.set("room", code);
  else url.searchParams.delete("room");
  history.replaceState(null, "", url.pathname + url.search + url.hash);
}
function showHome(message) {
  lasers?.exit();
  noRepitas?.exit();
  patinazo?.exit();
  pongagono?.exit();
  lavalabras?.exit();
  finDeLinea?.exit();
  puertaONada?.exit();
  clearInterval(partyPoll);partyPoll=null;partyData=null;
  clearInterval(gameGatePoll);gameGatePoll=null;gameGateData=null;
  clearInterval(releasePoll);releasePoll=null;
  $("game-ready-overlay").hidden=true;
  document.body.classList.remove("party-active");
  $("party-live-screen").hidden=true;$("party-hud").hidden=true;
  clearInterval(state.poll);
  state.poll = null;
  if (state.channel && state.client) state.client.removeChannel(state.channel);
  state.channel = null;
  state.roomId = null;
  state.room = null;
  state.members = [];
  state.messages = [];
  nrTopicsCache = { signature: null, items: [], loading: false };
  partyCache = { signature: null, loading: false, data: null };
  $("lobby-screen").hidden = true;
  $("home-screen").hidden = false;
  $("catalog").hidden = false;
  setRoute(null);
  if (message) notify(message);
}
function watchRoom(id) {
  if (state.channel) state.client.removeChannel(state.channel);
  const refresh = () => {
    void syncRoom();
    // Door phase changes update public.rooms; don't wait for the 750ms
    // safety poll when all picks are resolved and the reveal is ready.
    if(state.room?.game_id==="puerta_o_nada")void puertaONada?.refresh();
  };
  state.channel = state.client.channel("party-room-" + id)
    .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: "id=eq." + id }, refresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: "room_id=eq." + id }, refresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "room_messages", filter: "room_id=eq." + id }, refresh)
    .subscribe((status) => {
      $("connection-label").textContent = status === "SUBSCRIBED" ? "Sala sincronizada" : "Reconectando...";
    });
  clearInterval(state.poll);
  // Polling is a safety net for missed DELETE events and reconnects.
  state.poll = setInterval(refresh, 8000);
  clearInterval(partyPoll);
  partyPoll = setInterval(()=>void syncParty(),1300);
  clearInterval(gameGatePoll);
  gameGatePoll = setInterval(()=>void syncGameGate(),800);
  clearInterval(releasePoll);
  releasePoll = setInterval(()=>void validateRelease().catch(e=>console.warn("Release check:",e.message)),18000);
}
async function enterRoom(id) {
  await validateRelease();
  await rpc("client_checkin",{p_room_id:id,p_build:APP_BUILD});
  versionBlocked=false;$("version-overlay").hidden=true;
  state.roomId = id;
  $("home-screen").hidden = true;
  $("catalog").hidden = true;
  $("lobby-screen").hidden = false;
  watchRoom(id);
  await syncRoom();
}
async function syncRoom() {
  const id = state.roomId;
  if (!id || state.syncing || !state.client) return;
  state.syncing = true;
  try {
    const sb = state.client;
    const [roomResult, memberResult, messageResult] = await Promise.all([
      sb.from("rooms").select("*").eq("id", id).single(),
      sb.from("room_members").select("user_id,display_name,is_ready,joined_at").eq("room_id", id).order("joined_at"),
      sb.from("room_messages").select("id,author_user_id,body,created_at").eq("room_id", id).order("created_at", { ascending: false }).limit(60)
    ]);
    if (id !== state.roomId) return;
    if (roomResult.error || memberResult.error || messageResult.error) {
      if (roomResult.error?.code === "PGRST116" || roomResult.error?.code === "42501") {
        showHome("La sala se ha cerrado o has salido de ella.");
        return;
      }
      throw roomResult.error || memberResult.error || messageResult.error;
    }
    state.room = roomResult.data;
    state.members = memberResult.data || [];
    state.messages = (messageResult.data || []).reverse();
    if (!state.members.some((m) => m.user_id === state.user?.id)) {
      showHome("Ya no formas parte de esa sala.");
      return;
    }
    setRoute(state.room.code);
    renderRoom();
  } catch (error) { console.error(error); notify("No se pudo sincronizar: " + friendlyError(error)); }
  finally { state.syncing = false; }
}
function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = String(text);
  return el;
}
function renderPlayers() {
  const list = $("player-list");
  list.replaceChildren();
  const hostId = state.room.host_user_id;
  const isHost = hostId === state.user.id;
  state.members.forEach((player) => {
    const row = element("div", "player");
    row.appendChild(element("div", "avatar", player.display_name.slice(0, 1).toUpperCase()));
    const meta = element("div", "player-meta");
    const displayName = player.display_name + (player.user_id === state.user.id ? " (tú)" : "");
    meta.appendChild(element("span", "player-name", displayName));
    meta.appendChild(element("span", "player-role", player.user_id === hostId ? "👑 Anfitrión" : "Invitado"));
    row.appendChild(meta);
    const ready = element("span", "ready-status" + (player.is_ready ? "" : " waiting"), player.is_ready ? "✓ Listo" : "● Esperando");
    row.appendChild(ready);
    if (isHost && player.user_id !== state.user.id) {
      const kick = element("button", "kick", "Expulsar");
      kick.type = "button";
      kick.addEventListener("click", () => {
        if (!confirm("¿Expulsar a " + player.display_name + " de la sala?")) return;
        void action(async () => { await rpc("kick_room_member", { p_room_id: state.roomId, p_user_id: player.user_id }); await syncRoom(); }, kick);
      });
      row.appendChild(kick);
    }
    list.appendChild(row);
  });
}
function renderModes() {
  const container = $("mode-options");
  if (!container) return;
  container.replaceChildren();
  const isHost = state.room.host_user_id === state.user.id;
  for (const mode of [
    {id:"freeplay",name:"🎮 Juego libre",desc:"Elige un minijuego y juega partidas sueltas."},
    {id:"party",name:"🏅 Modo Fiesta",desc:"Cinco pruebas seguidas, podios automáticos y clasificación por medallas."}
  ]) {
    const b=element("button","game-option"+(state.room.mode===mode.id?" selected":""));
    b.type="button";b.disabled=!isHost||state.room.status!=="lobby";
    b.style.textAlign="left";
    const title=element("strong","",mode.name);
    const desc=element("small","",mode.desc);
    desc.style.display="block";desc.style.marginTop="6px";desc.style.opacity=".7";
    b.append(title,desc);
    b.addEventListener("click",()=>void action(async()=>{
      await rpc("set_room_mode",{p_room_id:state.roomId,p_mode:mode.id});
      if(mode.id==="party")await rpc("party_prepare",{p_room_id:state.roomId});
      await syncRoom();
    },b));
    container.appendChild(b);
  }
}
function renderGames() {
  const container = $("game-options");
  container.replaceChildren();
  const isHost = state.room.host_user_id === state.user.id;
  const canChange = isHost && state.room.status === "lobby" && state.room.mode === "freeplay";
  GAMES.forEach((game) => {
    const button = element("button", "game-option" + (game.id === state.room.game_id ? " selected" : ""));
    button.type = "button";
    button.disabled = !canChange;
    button.appendChild(element("span", "", game.emoji));
    button.appendChild(element("strong", "", game.name));
    button.addEventListener("click", () => void action(async () => {
      await rpc("set_room_game", { p_room_id: state.roomId, p_game_id: game.id });
      await syncRoom();
    }, button));
    container.appendChild(button);
  });
}
function renderChat() {
  const container = $("chat-messages");
  const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 40;
  container.replaceChildren();
  if (!state.messages.length) container.appendChild(element("p", "muted", "Todavía no hay mensajes. Rompe el hielo."));
  const byId = new Map(state.members.map((m) => [m.user_id, m.display_name]));
  state.messages.forEach((message) => {
    const line = element("div", "chat-line");
    line.appendChild(element("strong", "", byId.get(message.author_user_id) || "Invitado"));
    line.appendChild(element("span", "", message.body));
    container.appendChild(line);
  });
  if (atBottom) container.scrollTop = container.scrollHeight;
}
function renderRoom() {
  const room = state.room;
  if(room.status==="lobby")gameGateData=null;
  const isHost = room.host_user_id === state.user.id;
  const self = state.members.find((m) => m.user_id === state.user.id);
  $("room-code").textContent = room.code;
  $("player-count").textContent = state.members.length + "/" + room.max_players;
  $("room-state-pill").textContent = room.status === "playing" ? "EN PARTIDA" : "EN ESPERA";
  $("lobby-status").textContent = room.status === "playing"
    ? "Partida en curso."
    : (room.mode === "party" ? "Circuito de cinco juegos con medallas automáticas." : "Comparte el código y prepara a tu equipo.");
  $("ready-btn").hidden = room.status !== "lobby";
  $("ready-btn").textContent = self?.is_ready ? "✓ Estoy preparado" : "Estoy listo ✓";
  $("ready-btn").disabled = room.status !== "lobby";
  $("start-btn").hidden = !isHost || room.status !== "lobby";
  $("start-btn").disabled = !["freeplay","party"].includes(room.mode) || (room.mode==="freeplay" && !["lasers","no_repitas","patinazo","pongagono","lavalabras","fin_de_linea","puerta_o_nada"].includes(room.game_id)) ||
    state.members.length < 2 || state.members.some((m) => !m.is_ready);
  $("start-btn").textContent = room.mode==="party" ? "🏅 ¡Empezar fiesta de 5 pruebas!" :
    room.game_id==="no_repitas" ? "🧠 Jugar ¡NO REPITAS!" : room.game_id==="patinazo" ? "🧊 Jugar ¡PATINAZO!" : room.game_id==="pongagono" ? "🏓 Jugar PONGÁGONO" : room.game_id==="lavalabras" ? "🌋 Jugar LAVALABRAS" : room.game_id==="fin_de_linea" ? "🚂 Jugar ¡FIN DE LÍNEA!" : room.game_id==="puerta_o_nada" ? "🚪 Jugar PUERTA O NADA" : "⚡ Jugar Lásers";
  $("reset-btn").hidden = !isHost || room.status !== "playing";
  renderPlayers();
  renderModes();
  renderGames();
  renderNrTopicSettings();
  renderPartyPreview();
  renderChat();
  const showPartyBoard=room.mode==="party"&&room.status==="playing"&&partyData&&
    partyData.current_game===room.game_id&&["intermission","finished"].includes(partyData.phase);
  if(showPartyBoard){
    lasers?.exit();noRepitas?.exit();patinazo?.exit();pongagono?.exit();lavalabras?.exit();finDeLinea?.exit();puertaONada?.exit();
    $("lobby-screen").hidden=true;
  } else if (room.status === "playing" && ["freeplay","party"].includes(room.mode) && room.game_id === "lasers") {
    $("lobby-screen").hidden = true;
    noRepitas?.exit();
    patinazo?.exit();
    pongagono?.exit();
    lavalabras?.exit();
    finDeLinea?.exit();
    puertaONada?.exit();
    lasers?.enter(state.roomId,state.user.id,room.code,room.host_user_id);
  } else if (room.status === "playing" && ["freeplay","party"].includes(room.mode) && room.game_id === "no_repitas") {
    $("lobby-screen").hidden = true;
    lasers?.exit();
    patinazo?.exit();
    pongagono?.exit();
    lavalabras?.exit();
    finDeLinea?.exit();
    puertaONada?.exit();
    noRepitas?.enter(state.roomId,state.user.id,room.code,room.host_user_id);
  } else if (room.status === "playing" && ["freeplay","party"].includes(room.mode) && room.game_id === "patinazo") {
    $("lobby-screen").hidden = true;
    lasers?.exit();
    noRepitas?.exit();
    pongagono?.exit();
    lavalabras?.exit();
    finDeLinea?.exit();
    puertaONada?.exit();
    patinazo?.enter(state.roomId,state.user.id,room.code,room.host_user_id);
  } else if (room.status === "playing" && ["freeplay","party"].includes(room.mode) && room.game_id === "pongagono") {
    $("lobby-screen").hidden = true;
    lasers?.exit();
    noRepitas?.exit();
    patinazo?.exit();
    lavalabras?.exit();
    finDeLinea?.exit();
    puertaONada?.exit();
    pongagono?.enter(state.roomId,state.user.id,room.code,room.host_user_id);
  } else if (room.status === "playing" && ["freeplay","party"].includes(room.mode) && room.game_id === "lavalabras") {
    $("lobby-screen").hidden = true;
    lasers?.exit();
    noRepitas?.exit();
    patinazo?.exit();
    pongagono?.exit();
    finDeLinea?.exit();
    puertaONada?.exit();
    lavalabras?.enter(state.roomId,state.user.id,room.code,room.host_user_id);
  } else if (room.status === "playing" && ["freeplay","party"].includes(room.mode) && room.game_id === "fin_de_linea") {
    $("lobby-screen").hidden = true;
    lasers?.exit();noRepitas?.exit();patinazo?.exit();pongagono?.exit();lavalabras?.exit();
    puertaONada?.exit();
    finDeLinea?.enter(state.roomId,state.user.id,room.code,room.host_user_id);
  } else if (room.status === "playing" && ["freeplay","party"].includes(room.mode) && room.game_id === "puerta_o_nada") {
    $("lobby-screen").hidden = true;
    lasers?.exit();noRepitas?.exit();patinazo?.exit();pongagono?.exit();lavalabras?.exit();finDeLinea?.exit();
    puertaONada?.enter(state.roomId,state.user.id,room.code,room.host_user_id);
  } else {
    lasers?.exit();
    noRepitas?.exit();
    patinazo?.exit();
    pongagono?.exit();
    lavalabras?.exit();
    finDeLinea?.exit();
    puertaONada?.exit();
    $("lobby-screen").hidden = false;
  }
  renderPartyPresentation();
  renderGameGate();
}
async function copyText(value) {
  try { await navigator.clipboard.writeText(value); }
  catch {
    const field = document.createElement("textarea");
    field.value = value;
    document.body.appendChild(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
  notify("¡Copiado! Envíalo al grupo.");
}
async function createRoom() {
  const name = requireName();
  await ensureGuest();
  const result = await rpc("create_room", { p_name: name, p_max_players: Number($("capacity").value) });
  const first = result?.[0];
  if (!first?.room_id) throw new Error("No se pudo crear la sala.");
  await enterRoom(first.room_id);
}
async function joinRoom() {
  const name = requireName();
  const code = $("join-code").value.trim().toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(code)) throw new Error("CODE_INVALID");
  await ensureGuest();
  const id = await rpc("join_room", { p_code: code, p_name: name });
  await enterRoom(id);
}
function registerEvents() {
  $("party-return").addEventListener("click",()=>void action(leavePartyCircuit,$("party-return")));
  $("party-cancel").addEventListener("click",()=>void action(leavePartyCircuit,$("party-cancel")));
  $("party-next-ready").addEventListener("click",()=>void action(async()=>{
    await rpc("party_next_ready",{p_room_id:state.roomId,p_ready:true});
    await syncParty();
  },$("party-next-ready")));
  $("game-ready-leave").addEventListener("click",()=>void action(async()=>{
    await rpc("leave_room",{p_room_id:state.roomId});
    showHome("Has salido de la sala.");
  },$("game-ready-leave")));
  $("game-ready-confirm").addEventListener("click",()=>void action(async()=>{
    await validateRelease();
    await rpc("game_gate_ready",{p_room_id:state.roomId,p_ready:true});
    await syncGameGate();
  },$("game-ready-confirm")));
  $("version-reload").addEventListener("click",()=>{
    const url=new URL(window.location.href);
    url.searchParams.set("reload",String(Date.now()));
    window.location.replace(url.href);
  });
  $("create-btn").addEventListener("click", () => void action(createRoom, $("create-btn")));
  $("party-shuffle").addEventListener("click",()=>void action(async()=>{
    await rpc("party_prepare",{p_room_id:state.roomId});
    await syncRoom();
  },$("party-shuffle")));
  $("nr-topic-select").addEventListener("change", () => void action(async () => {
    await rpc("nr_set_topic", {
      p_room_id: state.roomId,
      p_topic_id: $("nr-topic-select").value || null
    });
    await syncRoom();
  }, $("nr-topic-select")));
  $("join-btn").addEventListener("click", () => void action(joinRoom, $("join-btn")));
  $("join-code").addEventListener("input", () => { $("join-code").value = $("join-code").value.toUpperCase().replace(/[^0-9A-F]/g, ""); });
  $("join-code").addEventListener("keydown", (event) => { if (event.key === "Enter") $("join-btn").click(); });
  $("ready-btn").addEventListener("click", () => void action(async () => {
    const self = state.members.find((m) => m.user_id === state.user.id);
    await rpc("set_room_ready", { p_room_id: state.roomId, p_ready: !self?.is_ready });
    await syncRoom();
  }, $("ready-btn")));
  $("start-btn").addEventListener("click", () => void action(async () => {
    if(state.room.mode==="party"){
      await rpc("start_party",{p_room_id:state.roomId});
      partyData=null;
      await syncRoom();
      await syncParty();
    }else{
      if (!["lasers","no_repitas","patinazo","pongagono","lavalabras","fin_de_linea","puerta_o_nada"].includes(state.room.game_id)) throw new Error("GAME_NOT_AVAILABLE");
      await rpc(state.room.game_id==="no_repitas" ? "start_no_repitas" : state.room.game_id==="patinazo" ? "start_patinazo" : state.room.game_id==="pongagono" ? "start_pongagono" : state.room.game_id==="lavalabras" ? "start_lavalabras" : state.room.game_id==="fin_de_linea" ? "start_fin_de_linea" : state.room.game_id==="puerta_o_nada" ? "start_puerta_o_nada" : "start_lasers", { p_room_id: state.roomId });
      await syncRoom();
    }
  }, $("start-btn")));
  $("reset-btn").addEventListener("click", () => void action(async () => {
    await rpc("reset_room", { p_room_id: state.roomId });
    await syncRoom();
  }, $("reset-btn")));
  $("leave-btn").addEventListener("click", () => void action(async () => {
    await rpc("leave_room", { p_room_id: state.roomId });
    showHome("Has salido de la sala.");
  }, $("leave-btn")));
  $("chat-form").addEventListener("submit", (event) => {
    event.preventDefault();
    void action(async () => {
      const message = $("chat-input").value.trim();
      if (!message) return;
      await rpc("send_room_message", { p_room_id: state.roomId, p_body: message });
      $("chat-input").value = "";
      await syncRoom();
    }, $("chat-form").querySelector("button"));
  });
  $("copy-code-btn").addEventListener("click", () => void copyText(state.room.code));
  $("share-btn").addEventListener("click", () => {
    const link = new URL(window.location.href).href;
    if (navigator.share) void navigator.share({ title: "Entra en mi sala Party Hub", url: link }).catch(() => {});
    else void copyText(link);
  });
}
async function init() {
  puertaONada = new PuertaONadaGame({
    rpc,notify,
    leave:()=>void action(async()=>{await rpc("leave_room",{p_room_id:state.roomId});showHome("Has salido de PUERTA O NADA.");}),
    reset:()=>void action(async()=>{await rpc("reset_room",{p_room_id:state.roomId});await syncRoom();})
  });
  finDeLinea = new FinDeLineaGame({
    rpc,notify,
    leave:()=>void action(async()=>{await rpc("leave_room",{p_room_id:state.roomId});showHome("Has salido de ¡FIN DE LÍNEA!.");}),
    reset:()=>void action(async()=>{await rpc("reset_room",{p_room_id:state.roomId});await syncRoom();})
  });
  lavalabras = new LavalabrasGame({
    rpc,notify,
    leave:()=>void action(async()=>{await rpc("leave_room",{p_room_id:state.roomId});showHome("Has salido de LAVALABRAS.");}),
    reset:()=>void action(async()=>{await rpc("reset_room",{p_room_id:state.roomId});await syncRoom();})
  });
  pongagono = new PongagonoGame({
    rpc,notify,
    leave:()=>void action(async()=>{await rpc("leave_room",{p_room_id:state.roomId});showHome("Has salido de PONGÁGONO.");}),
    reset:()=>void action(async()=>{await rpc("reset_room",{p_room_id:state.roomId});await syncRoom();})
  });
  patinazo = new PatinazoGame({
    rpc,notify,
    leave:()=>void action(async()=>{await rpc("leave_room",{p_room_id:state.roomId});showHome("Has salido de ¡PATINAZO!.");}),
    reset:()=>void action(async()=>{await rpc("reset_room",{p_room_id:state.roomId});await syncRoom();})
  });
  noRepitas = new NoRepitasGame({
    rpc,notify,
    leave:()=>void action(async()=>{await rpc("leave_room",{p_room_id:state.roomId});showHome("Has salido de ¡NO REPITAS!.");}),
    reset:()=>void action(async()=>{await rpc("reset_room",{p_room_id:state.roomId});await syncRoom();})
  });
  lasers = new LaserGame({
    rpc,notify,
    leave:()=>void action(async()=>{await rpc("leave_room",{p_room_id:state.roomId});showHome("Has salido de Lásers.");}),
    reset:()=>void action(async()=>{await rpc("reset_room",{p_room_id:state.roomId});await syncRoom();})
  });
  registerEvents();
  try { $("player-name").value = localStorage.getItem("partyhub_name") || ""; } catch {}
  const code = new URLSearchParams(window.location.search).get("room");
  if (code) { $("join-code").value = code.toUpperCase().slice(0, 6); notify("Introduce tu apodo y pulsa Entrar para unirte."); }
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    $("setup-warning").hidden = false;
    $("connection-label").textContent = "Pendiente de configurar";
    $("create-btn").disabled = true;
    $("join-btn").disabled = true;
    return;
  }
  try {
    // Import only after configuration exists; static previews need no CDN access.
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.58.0");
    state.client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    $("connection-label").textContent = "Online · Salas privadas";
  } catch (error) {
    console.error(error);
    $("setup-warning").hidden = false;
    $("setup-warning").textContent = "No ha sido posible conectar con Supabase. Comprueba la configuración y la conexión.";
    $("create-btn").disabled = true;
    $("join-btn").disabled = true;
  }
}
// The previous Pack Opener was a PWA. Unregister its root-scoped worker so
// legacy cached files cannot unexpectedly replace the new Party Hub.
async function cleanLegacyServiceWorker() {
  try {
    if ("serviceWorker" in navigator) {
      const scope = new URL("./", window.location.href).href;
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.filter((item) => item.scope === scope).map((item) => item.unregister()));
    }
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith("packverse27-")).map((name) => caches.delete(name)));
    }
  } catch (error) {
    console.warn("Legacy cache cleanup skipped", error);
  }
}
void cleanLegacyServiceWorker();
void init();
