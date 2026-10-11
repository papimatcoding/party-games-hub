import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const $ = (id) => document.getElementById(id);
const GAMES = [
  { id: "pool", emoji: "🎱", name: "Pool" },
  { id: "bomb", emoji: "💣", name: "Bomb" },
  { id: "draw", emoji: "🎨", name: "Draw" },
  { id: "trivia", emoji: "❓", name: "Trivia" }
];
const state = { client: null, user: null, roomId: null, room: null, members: [], messages: [], channel: null, poll: null, busy: false, syncing: false };
let toastTimeout;

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
  MESSAGE_INVALID: "El mensaje debe tener entre 1 y 240 caracteres."
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
  clearInterval(state.poll);
  state.poll = null;
  if (state.channel && state.client) state.client.removeChannel(state.channel);
  state.channel = null;
  state.roomId = null;
  state.room = null;
  state.members = [];
  state.messages = [];
  $("lobby-screen").hidden = true;
  $("home-screen").hidden = false;
  $("catalog").hidden = false;
  setRoute(null);
  if (message) notify(message);
}
function watchRoom(id) {
  if (state.channel) state.client.removeChannel(state.channel);
  const refresh = () => { void syncRoom(); };
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
}
async function enterRoom(id) {
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
function renderGames() {
  const container = $("game-options");
  container.replaceChildren();
  const isHost = state.room.host_user_id === state.user.id;
  const canChange = isHost && state.room.status === "lobby";
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
  const isHost = room.host_user_id === state.user.id;
  const self = state.members.find((m) => m.user_id === state.user.id);
  $("room-code").textContent = room.code;
  $("player-count").textContent = state.members.length + "/" + room.max_players;
  $("room-state-pill").textContent = room.status === "playing" ? "EN PARTIDA" : "EN ESPERA";
  $("lobby-status").textContent = room.status === "playing"
    ? "La sesión ha comenzado. El minijuego llegará próximamente."
    : "Comparte el código y prepara a tu equipo.";
  $("ready-btn").hidden = room.status !== "lobby";
  $("ready-btn").textContent = self?.is_ready ? "✓ Estoy preparado" : "Estoy listo ✓";
  $("ready-btn").disabled = room.status !== "lobby";
  $("start-btn").hidden = !isHost || room.status !== "lobby";
  $("start-btn").disabled = state.members.length < 2 || state.members.some((m) => !m.is_ready);
  $("reset-btn").hidden = !isHost || room.status !== "playing";
  renderPlayers();
  renderGames();
  renderChat();
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
  $("create-btn").addEventListener("click", () => void action(createRoom, $("create-btn")));
  $("join-btn").addEventListener("click", () => void action(joinRoom, $("join-btn")));
  $("join-code").addEventListener("input", () => { $("join-code").value = $("join-code").value.toUpperCase().replace(/[^0-9A-F]/g, ""); });
  $("join-code").addEventListener("keydown", (event) => { if (event.key === "Enter") $("join-btn").click(); });
  $("ready-btn").addEventListener("click", () => void action(async () => {
    const self = state.members.find((m) => m.user_id === state.user.id);
    await rpc("set_room_ready", { p_room_id: state.roomId, p_ready: !self?.is_ready });
    await syncRoom();
  }, $("ready-btn")));
  $("start-btn").addEventListener("click", () => void action(async () => {
    await rpc("start_room", { p_room_id: state.roomId });
    await syncRoom();
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
