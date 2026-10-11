# Sexto minijuego (propuesta): VAGONES — ficha de diseño
Estado: **preproducción / no programado**. Requiere aprobar el comportamiento del disparo y el daño antes de tocar el motor.
La prioridad es estabilizar sincronización y controles de los cinco juegos existentes.

## Fantasía principal
Todos viajan en vagones por una red común de vías. Cada vagón lleva un cañón en el frontal y una diana vulnerable detrás. La habilidad está en perseguir, esquivar, elegir bifurcaciones y disparar al rival cuando se presenta su retaguardia.

## Mapa
- **Rectángulo en vista cenital**, inicialmente unas 14 × 9 celdas para mantener una cámara común.
- Vías **exclusivamente horizontales o verticales**; giros solo de 90 grados, jamás segmentos diagonales.
- Circuitos conectados con **bifurcaciones**, conexiones paralelas, cruces legibles y atajos. No colocar fondos de saco inevitables ni vías exclusivas para un jugador.
- Todos ven el mismo mapa completo: no hay ventajas por campo de visión en pantallas distintas.
- Varias conexiones que permiten recuperar terreno sin formar un único carrusel donde todos se persiguen sin alcanzarse.
- Generación de pistas validadas por conectividad antes de jugar.

## Controles propuestos (a confirmar)
- Movimiento hacia delante automático a velocidad compartida; los jugadores solo escogen el desvío en la próxima bifurcación.
- **PC:** A/D o ←/→ para seleccionar rama; Espacio o clic para disparar.
- **Móvil:** dos botones táctiles grandes para dirección y uno destacado para disparo; inputs grandes, sin joystick delicado.
- Indicador anticipado que muestra a qué rama se dirigirá el vagón y hace evidente cuándo el jugador podrá cambiarla.
- El cañón apunta siempre hacia el frente del vagón y la diana siempre hacia atrás.

## Pendiente de decisión humana
- ¿Las balas siguen las vías por los giros o vuelan en línea recta sin seguirlas? Cambia enormemente la estrategia.
- ¿Una diana recibe un golpe para eliminar o hay varias vidas/escudos?
- ¿Cómo resolver los choques entre vagones en cruces y puntos de encuentro?
- ¿Partidas por rondas o límite de supervivientes/tiempo?

## Rendimiento y justicia
- Evitar usar una RPC pesada por cuadro. Primero prototipar el movimiento y la lectura de bifurcaciones en PC y móvil, después diseñar el transporte de eventos y estado autoritativo.
- Mantener simulación y adjudicación del resultado en el servidor, con suavizado visual local y corrección por marcas temporales.
- Probar a 2, 4, 8 y 12 jugadores. Si es difícil ver los desvíos en vertical, introducir interfaz de foco y minimapa sin alterar visibilidad de los otros participantes.

No añadir al selector público ni al Modo Fiesta hasta disponer de controles, sincronización y reglas validadas.
