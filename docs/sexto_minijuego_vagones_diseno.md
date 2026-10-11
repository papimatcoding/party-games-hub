# Sexto minijuego (propuesta): VAGONES — ficha de diseño
Estado: **Alpha jugable integrada** (primera versión servidor + cliente, pendiente QA real entre dispositivos).
El juego se integra como sexto título y entra en la selección aleatoria de cinco pruebas del Modo Fiesta.

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

## Reglas aprobadas e implementadas
- Los proyectiles **no siguen las vías**: viajan siempre en línea recta a 8,5 unidades/s durante un máximo de 1,6 segundos.
- **Únicamente** un impacto directo a la diana trasera resta vida. Los laterales y frontales consumen la bala y no hacen daño. El impacto se calcula en el servidor por barrido del segmento y ángulo de llegada.
- Dos impactos traseros eliminan a un vagón; recarga de 1,1 s.
- Los vagones atraviesan los cruces sin colisión corporal dañina; perder vida depende exclusivamente de acertar en la diana.
- Una partida dura como máximo 135 s. Victoria del último superviviente, o por más aciertos, vida restante y eliminaciones si se agota el tiempo.
- Los jugadores seleccionan el desvío en la **próxima** intersección. Los giros son siempre de 90°, sin diagonales.
- Móvil: tres botones de dirección grandes y disparo destacado; PC: A/D, W/S, flechas y espacio.

## Rendimiento y justicia
- Evitar usar una RPC pesada por cuadro. Primero prototipar el movimiento y la lectura de bifurcaciones en PC y móvil, después diseñar el transporte de eventos y estado autoritativo.
- Mantener simulación y adjudicación del resultado en el servidor, con suavizado visual local y corrección por marcas temporales.
- Probar a 2, 4, 8 y 12 jugadores. Si es difícil ver los desvíos en vertical, introducir interfaz de foco y minimapa sin alterar visibilidad de los otros participantes.

Publicado como Alpha para pruebas multijugador. El balance y la sincronización deben validarse jugando en dispositivos reales antes de declararlo pulido.
