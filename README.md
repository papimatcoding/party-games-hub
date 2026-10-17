# PARTY HUB 🎉 — Alpha 0.16.0

Arcade multijugador original para navegador con salas compartidas y dos modos jugables: **Juego libre** (partidas independientes) y **Modo Fiesta** (circuito de cinco minijuegos seleccionados entre siete, con medallas).

## Juegos disponibles
- **🚪 PUERTA O NADA** — supervivencia de **azar puro**, sin pistas ni patrones. En cada ronda todos escogen simultáneamente puertas numeradas, el servidor sortea aleatoriamente el conjunto seguro y lo revela después. **Más puertas:** salas de 2–3 tienen 6 puertas/4 seguras; salas de 4–7 tienen 8/5; salas de 8–12 tienen 9/6. **¡DOBLE O NADA!** es opcional: seleccionar dos puertas distintas y sobrevivir solo si **ambas** son seguras. Si lo consigues, ganas ⭐ utilizada exclusivamente para desempatar a jugadores con idéntico progreso; la supervivencia sigue siendo prioritaria. Cinco rondas como máximo, 12 s para escoger y 4 s de revelación, pantalla adaptada a móvil (tres puertas por fila) y PC (máximo cinco por fila). Teclas 1–9; toda elección y resolución se hace en Supabase.
- **🚂 ¡FIN DE LÍNEA!** — duelo ferroviario para 2–12 jugadores en una red **rectangular de vías exclusivamente horizontales y verticales**, con bifurcaciones. Los vagones se desplazan automáticamente (2,25 unidades/s); cada jugador indica izquierda, recto o derecha para el próximo cruce, y dispara en línea recta (8,5 unidades/s, 1,1 s de recarga). El cañón está delante; **solamente cuenta un impacto directo a la diana trasera**, de frente o de lado no hace daño. Cada vagón aguanta dos aciertos. El juego dura un máximo de 135 s; si se agota el tiempo, se desempata por impactos y puntos de vida (y después eliminaciones). Controles con A/D, W/S, flechas y espacio en PC, y botones grandes para móvil. Movimiento, colisiones de proyectiles y ganador decididos exclusivamente por Supabase; el canvas hace predicción temporal suave sin poder inventar aciertos.
- **🌋 LAVALABRAS** — categorías nuevas cada ronda, 24 segundos para escribir en secreto una respuesta del tema. El servidor compara con el catálogo curado de ¡NO REPITAS! y sus variantes. Cada letra de la respuesta válida añade un bloque a tu torre acumulada (espacios, números y puntuación no suman; cuenta la palabra realmente escrita). La lava sube 6 bloques en la primera ronda, 8 en la segunda, 10 en la tercera y así sucesivamente. Quien tenga la torre a la misma altura o por debajo de la lava queda eliminado. La última persona en pie gana, con máximo 12 rondas y empate si no queda un superviviente único. Se permiten respuestas iguales entre jugadores.
- **🏓 PONGÁGONO** — Pong en un polígono de 4 a 12 lados. La pala de cada jugador se mueve únicamente a lo largo de su propio lado; cada navegador rota la arena para mostrar su pala abajo. Una pelota común rebota en palas y paredes. Fallar significa eliminación: ese borde se vuelve pared sólida, sin cambiar la geometría. Los lados nunca ocupados también son paredes. La pelota acelera +0,030 unidades/s por rebote (tope 1,38) y **reinicia a 0,66** inmediatamente después de cada eliminación, con 1,6 s antes del siguiente saque. Los tamaños de pala se adaptan al número de jugadores.
- **⚡ Lásers** — movimiento libre en un hexágono, apuntado a 360°, preparación oculta, disparos simultáneos y reducción de anillos.
- **🧊 ¡PATINAZO!** — todos comienzan en esquinas distintas, sorteadas una vez por partida. Para 2–4 jugadores el ring es cuadrado; para 5–12 tiene el mismo número de lados que jugadores. Cada ronda se apunta solo una dirección secreta y el servidor aplica un impulso idéntico (0,96 unidades/s), fricción de hielo, choques elásticos con empuje y caídas fuera del borde. Se muestra una repetición simultánea de cada ronda. 18 segundos de preparación + 6 segundos de repetición, máximo 10 rondas; empate si todos caen o nadie gana al límite.
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
2. En Juego libre el anfitrión puede escoger Lásers, ¡NO REPITAS!, ¡PATINAZO!, PONGÁGONO o LAVALABRAS e iniciar la sesión.
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
Ampliar catálogos, revisar reglas de respuestas ambiguas, añadir CAPTCHA y límites de creación de salas, limpieza de partidas, herramientas de moderación y tests de navegador con redes reales. El Modo Fiesta ya está implementado, pero su experiencia con varios navegadores reales aún requiere pruebas de jugabilidad y latencia.

## Balance inicial de ¡PATINAZO!
- Dirección libre 360°, **sin selector de fuerza**. Impulso para todos: 0,96 unidades/s, frenado 0,88/s, choque con restitución 0,86 y pequeño extra 0,12 al impactar.
- Generación y cálculo en Supabase; el navegador no puede decidir su resultado. Se guardan 49 fotogramas por ronda y se reproducen en todos los dispositivos.
- Cada patinador comienza al 66% del radio hacia una esquina (no literalmente sobre el borde, para que un mínimo contacto no lo elimine de inmediato).
- **Las esquinas se usan exclusivamente en la primera ronda.** Tras resolver cada desplazamiento, el servidor conserva las coordenadas exactas de los supervivientes. La siguiente ronda empieza desde esas mismas posiciones, sin teletransporte al punto inicial; se aplica un nuevo impulso de fuerza fija sin conservar la velocidad anterior. Se aplica igualmente en Juego libre y Modo Fiesta.
- El diseño precisa pruebas reales con 2–12 usuarios y ajustes de fuerza, porque los resultados de la simulación no equivalen a equilibrio percibido.

## Balance y límites de PONGÁGONO (alpha)
- **2–4 jugadores:** pista cuadrada; para 2, las palas están en lados opuestos y los otros dos son paredes. Para 3, un lado libre también actúa como pared.
- **5–12 jugadores:** cada persona tiene su propio lado de un polígono regular.
- Proporción de pala del lado: **38 %** en cuadrado, creciendo hasta **64 %** con 12 lados. El agujero sin proteger es menor en una arena con muchos jugadores.
- Velocidad inicial: **0,66 unidades/s**, +**0,030** por rebote, máximo **1,38**. Tras una eliminación se reinicia la bola desde el centro con la velocidad inicial. Pala: **1,04 unidades de mundo por segundo**, sin ventaja de movimiento izquierda/derecha.
- Puedes mover tu pala arrastrando sobre el canvas, usando la barra táctil o con A/D y ←/→. Cada jugador siempre ve su propia pala abajo. La posición que manda se valida y limita en Supabase.
- El servidor realiza simulación en intervalos aproximados de 12 ms; los clientes consultan un estado oficial aproximadamente cuatro veces por segundo y extrapolan visualmente los instantes intermedios. La apariencia puede corregirse si hay latencia; las eliminaciones y velocidades proceden de PostgreSQL.
- Requiere prueba manual en dos o más dispositivos y afinación de sensibilidad, latencia y dificultad antes de considerarlo listo para público general. No hay protección anticheat integral ni emparejamiento público.

## Modo Fiesta — cinco juegos aleatorios entre siete (Alpha 0.11)
- El anfitrión selecciona **Modo Fiesta** en el lobby. Se eligen **cinco títulos distintos entre los siete minijuegos disponibles** y se ordenan aleatoriamente. El anfitrión puede mezclarla de nuevo; esto reinicia los estados de «Listo» para que todos confirmen el nuevo circuito.
- Con 2–12 jugadores listos, pulsa **«Empezar fiesta de 5 pruebas»**. El servidor crea una lista congelada de participantes e inicia el primer minijuego. Cada participante juega desde su navegador con los mismos controles de Juego libre.
- Al terminar una prueba, el motor de PostgreSQL calcula las posiciones según quién sobrevivió y cuándo cayó: los supervivientes quedan por delante, y quienes caen más tarde superan a quienes caen antes. Lava usa la altura final como desempate para caídas en la misma ronda. **PONGÁGONO** usa el orden real de eliminación, no un orden aleatorio.
- Se entregan las medallas del podio automáticamente: **🥇 oro = 3 puntos, 🥈 plata = 2 y 🥉 bronce = 1**. En empates de posición, se comparten medallas y se aplica la numeración de puestos de competición (dos primeros empatados hacen que el siguiente sea tercero).
- Después de cada juego se muestra una **pantalla de podio, clasificación general y próximo minijuego** durante un mínimo de 8 segundos. **Nunca se salta solo:** todos los jugadores presentes deben marcar «Listo para la siguiente prueba». El siguiente minijuego también espera el «Estoy listo» individual y comienza con una cuenta atrás común de 3 segundos. Las medallas se registran una sola vez.
- Tras los cinco juegos aparece la **clasificación final**. Se ordena por puntos, después oros, platas y bronces. Si todo empata, hay campeones compartidos.
- El anfitrión puede cancelar el circuito o, tras el final, volver al lobby para preparar una fiesta nueva. Se borran partidas antiguas y la sesión anterior al reiniciar.
- **PONGÁGONO** tiene un límite especial de 180 segundos por prueba dentro del circuito para evitar un partido interminable; al alcanzarlo, los supervivientes empatan por su posición.
- El diseño de datos contempla formatos de 10, 15 o 20 juegos, **aún bloqueados** hasta disponer de más minijuegos diferentes. Juego libre permanece independiente.
- **Comprobación:** se ha ejecutado un circuito completo de cinco juegos mediante las API reales de cada juego en transacciones SQL, además de pruebas de empate, doble consulta, host-only, cancelación y medallas. Falta validar la sensación de juego y transiciones con 2+ navegadores/dispositivos reales.

## Mejoras de juego en la Alpha 0.9.1
- **Versiones:** los clientes verifican el protocolo 0.9.1 con el manifiesto de despliegue y Supabase. El servidor exige un registro compatible antes de marcar «Listo» o iniciar una sala. Al cambiar el protocolo deben actualizarse juntos js/release.js, release.json y la configuración privada. Se verifica compatibilidad del protocolo, no integridad criptográfica de los archivos.
- **Preparación:** cada juego espera explícitamente «Todos listos» antes de iniciar una cuenta atrás sincronizada de tres segundos. El servidor pausa simulaciones y rechaza jugadas anticipadas.
- **Pongágono:** mantiene instantáneas oficiales a unos 250 ms por RPC; ahora extrapola visualmente rebotes contra paredes y usa tiempo corregido del servidor. Sigue siendo una primera mejora: a latencias altas o con rebotes de pala pueden aparecer correcciones de posición.
- **Patinazo:** cronómetro y repetición adaptados al desfase de reloj observado con Supabase, sin cambiar el resultado autoritativo de las trayectorias.
- **Lavalabras:** solo admite respuestas exactas del catálogo y sus alias registrados, tras normalizar acentos y mayúsculas. No tolera erratas de un carácter; esa tolerancia se conserva únicamente en ¡NO REPITAS!
- **Modo Fiesta:** el podio permanece al menos ocho segundos y hasta que todos estén listos para avanzar. Cada nuevo juego tiene su propia confirmación y cuenta atrás.
- **Pendiente:** medir partidas reales en dos dispositivos, ampliar diccionarios, comprobar latencia de Pong y mejorar networking en siguientes pases. No se ha sustituido el sistema actual por un motor WebSocket de alta frecuencia.

## Sexto juego y conexión multijugador — Alpha 0.10
- Se ha incorporado ¡FIN DE LÍNEA! tanto al selector de Juego libre como al repertorio del Modo Fiesta, que mantiene cinco pruebas por sesión sin repetición. La clasificación incluye las eliminaciones del circuito ferroviario y los aciertos al desempatar.
- El servidor controla por completo posiciones, cruces, salud, disparos y colisiones mediante la posición de entrada de la bala contra cada vagón. Golpes frontales o laterales simplemente consumen el proyectil. El cliente solo puede enviar un desvío válido y/o la orden de disparo.
- Primera configuración para balance: vagón 2,25 u/s; proyectil 8,5 u/s (3,8 veces más rápido); recarga 1,1 s; vida del proyectil 1,6 s; dos impactos traseros para eliminar; límite 135 s.
- Una colisión entre dos vagones no elimina a ninguno: en esta versión pueden cruzarse cuando comparten raíles. Solo las dianas traseras reciben daño.
- Simulación servidora en pasos pequeños y actualizaciones periódicas; predicción local en PC/móvil. Pruebas de transacciones con 2 y 12 jugadores, impactos frontal/lateral/trasero, segundas eliminaciones y medallas del Modo Fiesta superadas. **Pendiente** una partida manual con varios móviles y PC para medir latencia y sensibilidad real.

## PUERTA O NADA — Alpha 0.11.0
- Juego libre y Modo Fiesta. El repertorio suma siete minijuegos, pero cada fiesta sigue teniendo cinco pruebas **sin repetición**.
- No hay pistas ni trucos: las puertas seguras se sortean en privado al principio de cada ronda, con independencia de las decisiones de los jugadores. El servidor solo publica los números seguros al revelar el resultado; durante la elección solo se muestra el propio número seleccionado y quién ha confirmado.
- Partidas con tiempo limitado por ronda, cinco rondas máximo y un resultado por supervivencia (empates permitidos). Los jugadores ausentes que no escogen ninguna puerta durante el plazo caen, sin paralizar el circuito.
- Interfaz responsive con puertas grandes y controles de teclado del 1 al 5; la elección se envía mediante RPC autenticada y puede corregirse mientras la ronda está abierta. Las tablas privadas no conceden lectura a clientes.
- Test de transacción sobre Supabase: elección sellada, puerta segura frente a peligrosa, expulsión por no respuesta, varios supervivientes en quinta ronda, 12 jugadores, medallas del Modo Fiesta y transición manual tras el podio. Pruebas automáticas en GitHub Actions.
- **Pendiente** prueba manual en móviles reales y PC, especialmente accesibilidad de botones en pantallas pequeñas y conexión lenta.

## Alpha 0.12.0 — sincronización y FPS
- Renderizado desacoplado del transporte: **PONGÁGONO** y **¡FIN DE LÍNEA!** usan requestAnimationFrame a la frecuencia que soporta el navegador/pantalla y actualizan posiciones oficiales mediante consultas adaptativas a Supabase. **No garantiza FPS mínimos:** se muestran métricas medidas de FPS y RTT para probar dispositivos reales.
- El módulo NetworkClock estima el desfase con el servidor según el punto medio de cada petición y amortigua muestras tardías.
- Intervalos de red adaptados al RTT medido de inicio a inicio, sin acumular consultas ni sobrecargar pestañas ocultas. La física sigue siendo autoritativa en el servidor.
- PONGÁGONO hace rebotes visuales analíticos en el polígono, fondo prerenderizado, normales geométricas memoizadas y suavizado de palas rivales.
- ¡FIN DE LÍNEA! prerenderiza una vez las vías estáticas y actualiza únicamente vagones y proyectiles; evita modificar textos DOM cuando no cambian.
- PATINAZO dibuja cada cuadro de la repetición al ritmo del dispositivo, mientras las pantallas estáticas solo se regeneran al cambiar su contenido.
- PUERTA O NADA usa CSS para animaciones y actualiza el reloj cada 100ms; las transiciones pueden anticiparse por eventos Realtime de la sala manteniendo polling como respaldo.
- **Limitación:** los FPS visuales no equivalen a un servidor de simulación de 120Hz. El estado físico se actualiza mediante PostgreSQL y RPC periódicas. Un servidor dedicado con reloj de física fijo y transporte de baja latencia sería necesario para eliminar las últimas correcciones de posición en partidas de acción.

## Alpha 0.14.0 — Avatar Studio, Tickets y progresión
- **Estilo chibi original vectorial.** Los avatares se dibujan en SVG por capas, en alta resolución y con la misma silueta y hitbox para todos. Incluye 8 pieles, 12 peinados, 8 ojos, 8 expresiones, 10 colores de pelo y 10 colores de outfit. Se pueden randomizar y guardar.
- **42 cosméticos:** 10 outfits completos, 12 artículos de cabeza, 8 accesorios faciales, 6 complementos de espalda y 6 emotes. Editor, armario y tienda integrados en un estudio accesible desde «MI AVATAR», tanto en el menú como en el lobby.
- **Progresión fiable:** cada partida realmente finalizada concede 70 XP y 12 Tickets por participante; quien gane recibe 35 XP y 8 Tickets adicionales. Las medallas de Fiesta conceden bonificaciones adicionales de XP y Tickets. Los logros por partidas completadas, victorias y medallas entregan recompensas una única vez.
- **Niveles:** nivel=1+floor(sqrt(XP/125)), con recompensas y artículos de tienda que requieren nivel mínimo. Las 42 fichas tienen precio y rareza autorizados desde una tabla privada; el servidor valida propiedad, nivel, logros, saldo y equipamiento. No se puede modificar el saldo desde el navegador ni utilizar los cosméticos para obtener ventaja.
- **Integración:** avatar visible en salas, listados de los siete minijuegos, podios, ranking de Fiesta y en tu editor personal. Se cachean los SVG procesados para reducir el trabajo durante la sincronización.
- **Historial:** la migración 76 recupera idempotentemente partidas terminadas y medallas aún almacenadas antes del lanzamiento del sistema de perfiles.
- **Persistencia:** el progreso está ligado al ID de usuario autenticado anónimo de Supabase; se conserva si ese navegador mantiene su sesión. **No existe aún vinculación entre distintos dispositivos o recuperación de cuenta si se eliminan datos del navegador**. Añadir inicio de sesión opcional será una fase posterior.
- **Limitaciones visuales:** se ha implementado una colección original de personajes vectoriales y animaciones cortas, pero la calidad y ergonomía finales deben revisarse con capturas reales de PC y móvil antes de considerarlas definitivas.

## Alpha 0.14.0 — avatar art pass
- Rig nuevo con anclajes anatómicos compartidos: orejas detrás de la cara, pelo posterior y flequillo separados y sombreros alineados.
- Rehechos los cascos, coronas, orejas de gato, gorros, pez y accesorios de espalda para que realmente se vean. Trajes con más detalle y siluetas diferentes.
- Miniaturas enfocadas en la parte que se vende, no un cuerpo completo diminuto. Mejores animaciones de emote con brazos independientes y efectos de lágrimas/confeti.
- Premio gratuito por logro (Corona del caos) desbloqueado automáticamente; se elimina el checkout de coste cero. Conserva los desbloqueos y compras anteriores.
- Emotes visibles al marcarse listo y en el podio del Modo Fiesta. Evita redibujar continuamente el podio idéntico para no reiniciar animaciones.
- Pruebas de seguridad del checkout, orden de capas, variantes visuales únicas y regresiones de juegos. Pendiente repaso estético con capturas de PC/móvil.

## Alpha 0.15.0 — Halloween, precios y tienda renovada
- **11 cosméticos nuevos** de terror caricaturesco original: cuatro cabezas (calabaza, máscara de hockey, bruja, fantasma), tres conjuntos (esqueleto, hechicería, vampiro), dos cosméticos faciales (mirada maldita, sonrisa cosida), murciélagos y emote «¡Buuu!».
- **Cabezas completas**: sombreros y cascos poseen modos de cobertura del pelo (mostrar, ocultar flequillo, ocultar todo, sustituir la cabeza). Las máscaras integrales ocultan la cara anterior y las orejas; no se superponen capas incompatibles. Boca abierta suavizada.
- **Tienda intuitiva**: separar «Puedes comprar», «Bloqueados» y «Ya tienes», con búsqueda, filtros de tipo, temática y ordenación. Pestaña de temporada propia y tarjetas de cada cosmético con previsualización. Nada de comprar objetos bloqueados sin saber por qué.
- **Halloween 2026**: evento desde el 17 de octubre al 8 de noviembre de 2026 incluidos. Pack «La noche más larga»: 11 artículos por **1.080 Tickets**, en lugar de **1.580 Tickets** individuales (500 Tickets de ahorro al empezar de cero). Si ya posees artículos del lote, el pack reduce el precio de manera proporcional, sin volver a cobrar por ellos; la transacción es atómica y solo autorizada por Supabase. Los cosméticos adquiridos se conservan para siempre tras el evento. Ningún pago real ni ventajas competitivas.
- **Economía revisada**: precios anteriores rebajados por nivel de rareza y **compensación automática de la diferencia** a quienes habían comprado artículos ahora más baratos. Los precios del cliente son informativos y el servidor determina los saldos y cobros finales.
- **Emotes**: animaciones más legibles, con efectos especiales para Halloween. La cosmética permanece puramente visual y no cambia las hitboxes.
- **Pase de temporada**: no implementado; análisis disponible en `docs/pase_temporada_propuesta.md`. Se recomienda comenzar con un pase corto gratuito de 20 niveles, tras probar el sistema de economía y diversidad de partidas.
- **Verificación**: tests automáticos de cobertura del pelo, arte Halloween, filtros UI, integridad del catálogo y paquete con descuento, más pruebas transaccionales de Supabase. Pendiente evaluación visual manual PC/móvil.


## Alpha 0.16.0 — Visual overhaul + 9 juegos
- **¿YA?**: objetivo entre 8–16 s, contador oculto hacia los 3 s. Cada jugador pulsa una vez. Clasificación por error absoluto en milisegundos y resultados conjuntos al terminar.
- **¡AGUANTA!**: peso y avatar chibi, caída cuadrática única para todos los jugadores y control de parada manual. Hay que pararlo antes del impacto; si todos quedan aplastados, no se conceden medallas.
- Ambos modos usan inicio sincronizado de 3 s desde la misma puerta de salida, latencia compensada con reloj de servidor y verificación de pulsación contra su hora de recepción; las diferencias demasiado grandes se rechazan. **La precisión contra manipulación sigue limitada por la latencia HTTP; no es un antitrampas infalible.**
- Ambos disponibles en Juego libre y Modo Fiesta: cada circuito selecciona cinco juegos distintos de nueve. La cuenta muestra XP y las medallas auténticas se asignan en el servidor.
- **Una única confirmación de Listo**: en lobby o antes de la siguiente prueba. Tras cargar, la puerta de inicio se confirma automáticamente y conserva la cuenta atrás común. Los resultados del juego recién terminado permanecen visibles 6,5 s antes de pasar al podio.
- **PONGÁGONO**: cadencia de lecturas ajustada, seguimiento visual con pequeñas correcciones suavizadas sin falsear los rebotes oficiales, medidor de FPS/latencia. Aún utiliza física RPC/Pg, por lo que no equivale a tener un servidor competitivo dedicado.
- **Palabras**: ¡NO REPITAS! acepta hasta dos pequeñas erratas en palabras suficientemente largas y LAVALABRAS una errata para palabras largas; siempre exige una coincidencia única del catálogo validado. Los términos ambiguos o ajenos al diccionario siguen rechazados.
- **Pantallas**: nueva capa CSS responsive que prioriza espacio de juego y controles visibles para todos, especialmente ¡FIN DE LÍNEA! en PC de poca altura y móvil. El editor de avatar aprovecha el alto de pantalla en escritorio y mantiene scroll accesible en móvil.
- **Avatares**: doce peinados más centrados, cabezas grandes que sustituyen al peinado base y coronas con pelo integrado específico. Las capas faciales dejan de dibujar ojos/bocas incompatibles debajo de ciertos accesorios.
- **Halloween ampliado**: 14 cosméticos disponibles individualmente o en pack «La noche más larga». Nuevos rostro espectral original, niebla fantasmal y risa siniestra. Precios: **2.020 Tickets** comprando los 14 por separado frente a **1.320 Tickets** por el pack (antes de descuentos por artículos ya poseídos). Compras existentes preservadas.
- **Validación**: regresión automática JS/SQL y partidas simuladas de 2 jugadores en ¿YA? y ¡AGUANTA!, y una prueba Fiesta con premios. Queda pendiente un QA presencial PC+móvil sobre tamaños de pantalla, sensación de respuesta y arte.
