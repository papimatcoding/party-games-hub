# PARTY HUB 🎉 — Alpha 0.4.1

Arcade multijugador original para navegador con salas compartidas y dos modos: **Juego libre** y **Modo Party** (este último aún en diseño).

## Juegos disponibles
- **⚡ Lásers** — movimiento libre en un hexágono, apuntado a 360°, preparación oculta, disparos simultáneos y reducción de anillos.
- **🧠 ¡NO REPITAS!** — tema aleatorio o seleccionado por el anfitrión, respuestas secretas, eliminación por duplicadas, usadas en rondas anteriores o inválidas. **Toda respuesta revelada, incluso si es inválida, pasa a la lista negra secreta de esa partida.** Los jugadores ven únicamente los resultados de la ronda actual durante la revelación; el historial de respuestas anteriores no aparece en pantalla ni en la respuesta del servidor, así que deben recordarlo. Las respuestas rechazadas pueden marcarse para revisión editorial sin alterar los resultados.

## Despliegue y base de datos
- Web: https://papimatcoding.github.io/party-games-hub/
- Backend: Supabase «Party Hub» (eu-west-3), independiente de Troll Golf.
- La URL y la clave publishable ya están en js/config.js. Nunca escribir service_role ni sb_secret_ en el frontend.
- Ya se aplicaron las migraciones numeradas de supabase/. **No volver a ejecutarlas a ciegas sobre el proyecto existente.**
- Supabase Auth: comprueba que Authentication → Providers → Anonymous Sign-Ins esté activo para que entren invitados sin correo.
- Las salas, el chat, las eliminaciones, la selección de tema y la lista negra se gestionan con RPC y PostgreSQL. Ningún navegador puede consultar las respuestas ocultas de los rivales ni las tablas privadas de validación.

## Primeras partidas
1. Abre la web desde dos navegadores o dispositivos distintos. Crea una sala, únete con el código y marca ambos jugadores como preparados.
2. En Juego libre el anfitrión puede escoger Lásers o ¡NO REPITAS! e iniciar la sesión.
3. En ¡NO REPITAS!, hay 25 segundos para escribir y 7 de revelación. Quien no responde también queda eliminado. Gana el último superviviente, o hay empate si sobreviven varios al límite o todos mueren a la vez.
4. Prueba con Messi frente a Leo Messi, con una respuesta inválida y con otra reutilizada en una segunda ronda.

## Validación de respuestas y temas
- El servidor normaliza mayúsculas, espacios, tildes y puntuación; usa catálogos privados de respuestas canónicas y alias. Las coincidencias se resuelven antes de eliminar simultáneamente.
- **12 temas** adaptados al tamaño de sala: planetas (2); selecciones campeonas del Mundial masculino (2); películas I–IX de Star Wars (2); comunidades autónomas españolas (2–3); provincias de España (2–8); futbolistas del Barça masculino (2–7); marcas de coches e instrumentos (2–10); Pokémon de Kanto, animales, países y elementos químicos (2–12).
- El anfitrión puede elegir tema en el lobby o mantener la opción **Aleatorio (sorpresa)**. Solo se muestran opciones adecuadas al número actual de participantes.
- **País Valencià** y **País Valenciano** son respuestas válidas como nombres alternativos de **Comunitat Valenciana**. Todas esas denominaciones comparten identidad y se bloquean mutuamente en rondas posteriores.
- El catálogo incluye los 151 Pokémon de Kanto, las 50 provincias españolas y una selección de 302 animales. Se ha ampliado el Barça con leyendas y miembros de la plantilla 2026/27. **Lamine Yamal**, Lamine, Yamal y variantes próximas se reconocen como un mismo jugador.
- Las erratas de **un solo carácter** se toleran únicamente si el resultado se puede atribuir sin ambigüedad a una sola respuesta y tiene al menos seis caracteres. Esto evita dar por válidos nombres cercanos pero distintos.
- Las respuestas rechazadas pueden reportarse para que el equipo editorial revise omisiones; los informes quedan en una cola privada persistente. La revisión no corrige automáticamente la ronda ya jugada.
- **Límite importante:** animales, marcas e instrumentos siguen siendo categorías abiertas; sus listas no pueden garantizar cobertura completa. Una respuesta correcta ausente podría ser rechazada, aunque ahora puede reportarse para revisión. Aún hay que ampliar y auditar estas categorías antes de un lanzamiento público.
- **Wikidata:** no se consulta en vivo durante las rondas. Un script de revisión editorial (scripts/preview-wikidata-barca.mjs) permite obtener candidatos según P54 y FC Barcelona Q7156, pero nunca los publica automáticamente. Documentación del servicio: https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual/es

## Desarrollo y pruebas
- Servidor local: python -m http.server 8080
- Tests: npm test
- GitHub Pages publica únicamente index.html, css/, js/ y assets/. Los scripts SQL no se suben a la web.
- Los tests unitarios y las pruebas SQL con varios usuarios simulados pasan. Aún falta una partida real extremo a extremo con varios navegadores o móviles.

## Antes de abrir al público
Ampliar catálogos, revisar reglas de respuestas ambiguas, añadir CAPTCHA y límites de creación de salas, limpieza de partidas, herramientas de moderación y tests de navegador con redes reales. Las reglas del Modo Party siguen pendientes.
