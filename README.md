# PARTY HUB 🎉

Hub multijugador de minijuegos para navegador. **Fase actual: infraestructura social 0.1**, sin minijuegos jugables todavía.

## Ya implementado
Interfaz responsive, salas privadas con códigos de 6 caracteres, creación y acceso como invitado, lista de miembros, anfitrión y transferencia de anfitrión, estados preparado/no preparado, selección de juego, inicio/reinicio de sesión, expulsión y chat. Realtime + sincronización de respaldo cada 8 segundos.

## Activación: Supabase independiente
No reutilices la base de datos de Troll Golf.

1. Crea un proyecto Supabase **nuevo**, dedicado a Party Hub.
2. En Authentication → Providers, habilita **Anonymous Sign-Ins**.
3. Ejecuta en el SQL Editor, uno por uno y en orden, los archivos:
   - supabase/01_schema.sql
   - supabase/02_room_membership.sql
   - supabase/03_room_controls.sql
   - supabase/04_chat.sql
   - supabase/05_permissions.sql
   - supabase/06_realtime.sql
4. En js/config.js escribe la URL del proyecto y su clave **publishable** (sb_publishable_...). Estas dos son públicas y aptas para navegador; NO pongas service_role, sb_secret_, contraseñas ni tokens privados.
5. GitHub Pages: https://papimatcoding.github.io/party-games-hub/
6. Prueba dos navegadores/sesiones distintas: uno crea sala, otro entra, ambos se preparan, chat y cambio de anfitrión.

Sin configurar Supabase, el frontend es una vista previa y los botones online están deshabilitados.

## Desarrollo
- Servidor de desarrollo local: python -m http.server 8080
- Comprobaciones: npm test
- No hay bundler ni paquetes npm instalables; el SDK del navegador se importa desde esm.sh con versión fijada.
- Publicación automática con GitHub Actions, solo index.html, css/, js/ y assets/.

## Arquitectura
Cliente HTML/CSS/JS → Supabase Auth (invitado) → RPC PostgreSQL para acciones atómicas → RLS por membresía en tablas rooms, room_members y room_messages → Realtime Postgres Changes.

Las escrituras directas desde el cliente están prohibidas: el servidor valida membresía, anfitrión, aforo y condiciones de inicio. Los mensajes se limitan a 240 caracteres y 1 por segundo por usuario/sala.

## Limitaciones
Los juegos son tarjetas placeholder; pulsar 'Iniciar sesión' solo cambia el estado compartido a playing. Los códigos son invitaciones, no contraseñas: quien conozca el código puede entrar mientras haya plazas y el estado sea lobby. Los invitados no recuperan su identidad si borran el almacenamiento local. Antes de un lanzamiento público necesitaríamos CAPTCHA, control de creación masiva de cuentas y salas, limpieza de salas abandonadas, moderación, tests E2E multiusuario y lógica de juego autoritativa.

Los SQL están diseñados para **una base de datos vacía**; no ejecutarlos de nuevo a ciegas.
