# PARTY HUB 🎉

Hub multijugador de minijuegos para navegador. **Fase actual: alpha 0.2.** Infraestructura social + primera versión jugable de **Lásers**, un combate simultáneo de posiciones secretas.

## Ya implementado
Interfaz responsive, salas privadas con códigos de 6 caracteres, creación y acceso como invitado, lista de miembros, anfitrión y transferencia de anfitrión, estados preparado/no preparado, selección de juego, inicio/reinicio de sesión, expulsión y chat. Realtime + sincronización de respaldo cada 8 segundos.

## Supabase
Party Hub ya utiliza una base de datos Supabase independiente de Troll Golf. Sus migraciones iniciales y las de Lásers están aplicadas en el proyecto Party Hub (París).

1. Crea un proyecto Supabase **nuevo**, dedicado a Party Hub.
2. En Authentication → Providers, habilita **Anonymous Sign-Ins**.
3. Ejecuta en el SQL Editor, uno por uno y en orden, los archivos:
   - supabase/01_schema.sql
   - supabase/02_room_membership.sql
   - supabase/03_room_controls.sql
   - supabase/04_chat.sql
   - supabase/05_permissions.sql
   - supabase/06_realtime.sql
   - supabase/07_modes.sql
   - supabase/08_laser_schema.sql
   - supabase/09_laser_start.sql
   - supabase/10_laser_engine.sql
   - supabase/11_laser_api.sql
   - supabase/07_modes.sql
4. En js/config.js escribe la URL del proyecto y su clave **publishable** (sb_publishable_...). Estas dos son públicas y aptas para navegador; NO pongas service_role, sb_secret_, contraseñas ni tokens privados.
5. GitHub Pages: https://papimatcoding.github.io/party-games-hub/
6. Prueba dos navegadores/sesiones distintas: uno crea sala, otro entra, ambos se preparan, chat y cambio de anfitrión.

La conexión pública ya está configurada en js/config.js. Si Auth Anonymous Sign-Ins está desactivado, los invitados no podrán acceder a salas.

## Desarrollo
- Servidor de desarrollo local: python -m http.server 8080
- Comprobaciones: npm test
- No hay bundler ni paquetes npm instalables; el SDK del navegador se importa desde esm.sh con versión fijada.
- Publicación automática con GitHub Actions, solo index.html, css/, js/ y assets/.

## Arquitectura
Cliente HTML/CSS/JS → Supabase Auth (invitado) → RPC PostgreSQL para acciones atómicas → RLS por membresía en tablas rooms, room_members y room_messages → Realtime Postgres Changes.

Las escrituras directas desde el cliente están prohibidas: el servidor valida membresía, anfitrión, aforo y condiciones de inicio. Los mensajes se limitan a 240 caracteres y 1 por segundo por usuario/sala.

## Lásers — primera alpha
- Juego libre: sala con 2–12 amigos, todos listos y anfitrión inicia la partida.
- Preparación secreta de **25 segundos**: pulsa o toca el hexágono para colocar tu avatar, arrastra para orientar el láser en 360° y confirma.
- Los otros jugadores **no reciben coordenadas ni ángulos** antes de la revelación. El servidor almacena sus movimientos en tablas privadas.
- Tras confirmar todos o llegar a cero, el servidor calcula los impactos **simultáneamente**; una víctima puede matar también a su atacante.
- Revelación durante 6 segundos y nueva preparación. Los anillos exteriores caen cada dos rondas, hasta el radio mínimo. La partida termina cuando queda uno o tras nueve rondas.
- Quien no confirme un movimiento a tiempo muere. Pueden darse empates si mueren todos o sobreviven varios al límite.
- El anfitrión devuelve al grupo al lobby después del resultado. Los minijuegos restantes los decidirá el creador.

## Limitaciones
El motor está implementado y sus tests estáticos y matemáticos han pasado, pero falta una partida end-to-end real con varios navegadores/dispositivos. Modo Party sigue en diseño. Los códigos son invitaciones, no contraseñas: quien conozca el código puede entrar mientras haya plazas y el estado sea lobby. Los invitados no recuperan su identidad si borran el almacenamiento local. Antes de un lanzamiento público necesitaríamos CAPTCHA, control de creación masiva de cuentas y salas, limpieza de salas abandonadas, moderación, tests E2E multiusuario y lógica de juego autoritativa.

Los SQL están diseñados para **una base de datos vacía**; no ejecutarlos de nuevo a ciegas.

## Visión de producto
Dos formas de entrar al arcade: **Juego libre** (minijuegos independientes) y **Modo Party** (un circuito original de minijuegos, retos y clasificaciones). El tipo de sesión ya se almacena en la base de datos y puede elegirse en el lobby; el circuito, puntuaciones y los minijuegos están por implementar. Véase docs/party-vision.md.
