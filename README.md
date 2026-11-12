# Proyecto: Doomy plays DOOM

- Fecha inicio 05-11-2026 
- Estado [**Finalizado**]

<br>

---

<br>

## 1. Contexto

En el año 2014 en la plataforma Twitch, se realizó un directo todos quienes observaban la transmisión podían jugar, este evento se llamó "[_Twitch Plays Pokemon_](https://www.twitch.tv/twitchplayspokemon/videos)". Es decir que miles de personas controlaban la misma partida y al mismo personaje a la vez, esto fue posible ya que mediante la escritura de comandes en el chat de Twitch un _script_ lo interpretaba y realizaba las acciones en el videojuego.

Esto fue tomado como punto de partida para que al momento de jugar DOOM con tus amigos, cada quien controle un elemento de la partida, teniendo que coordinarse para poder terminar el juego

<br>

## 2. Objetivos

### **Objetivo Principal:**

En este proyecto el objetivo es desarrollar una web que permita a diversas personas conectarse mediante un servidor MQTT y poder controlar en tiempo real lo que ocurre en la página

En este caso, cada persona involucrada controlará un elemento de la partida, es decir que alguien solo podrá mover al personaje, otra persona dispara y así consecutivamente.

### Restricciones y Alcance

para la IA. Define los límites para evitar alucinaciones o respuestas genéricas.*

- **Qué incluye el proyecto:** Se busca realizar una web GitHub Pages, por ende debe funcionar mediante un `index.html`, `style.css` y `main.js`. Además de funcionar con un servidor MQTT

- **Formato de salida exigido:** 3 archivos: un `html`, `css` y `js`

## Insumos y Variables 

- **Datos iniciales:** Se tomará como referencia el siguiente repositorio de GitHub <https://github.com/Estrabismx/DOOM>, el consta de una web en la que se puede jugar DOOM de manera nativa en un navegador (Solo en PC)

> El repositorio se ubica localmente en: `C:\Users\Hp\Documents\GitHub\DOOM`

### 🤖 Instrucciones de Arquitectura MQTT para Asistentes de IA

Al analizar, depurar o generar código para este proyecto, debes tener en cuenta que el sistema de mensajería (broker EMQX) opera bajo una **arquitectura estricta de lista blanca (whitelist)**. Por defecto, existe una regla global que deniega todo el tráfico no reconocido. Por lo tanto, cualquier dispositivo, script o cliente web debe autenticarse obligatoriamente con credenciales de usuario específicas (ej. usuario `dommy`) definidas en el archivo `config.js`, y conectarse exclusivamente a través de WebSockets Seguros (`wss://` por el puerto `8084`) o TLS nativo. Además, los permisos están limitados por usuario; asume siempre que los clientes solo tienen acceso de lectura y escritura (`Publish & Subscribe`) restringido a la jerarquía de temas del proyecto (ej. `tacto/#`). No debes sugerir el uso de brokers públicos, ni conexiones sin cifrar, y debes asegurar que todas las funciones de publicación o suscripción apunten estrictamente a los temas autorizados para evitar que el broker rechace silenciosamente la conexión.

---

## Registro de Ejecución e Iteraciones

### Que debe ocurrir

Es importante en el desarrollo que los siguientes elementos funcionen o cumplan una lógica similar

- Antes de inicar el juego exista un "_lobby_", en este se debe poder configurar que va a realizar cada usuario, además de que elementos se van a poder controlar:

  - Moverse y girar
  - Disparar
  - Abrir puertas, usar
  - Correr
  - Desplazarse lateralmente
  - Cambiar arma
  - Mapa
  - Menú

> Los usuarios deben poder elegir que elementos controlar en su celular, además de como, por ejemplo: `giroscopio`, `acelerometro`, `sensor de luz`, `pantalla touch`
>>
>> <br>
>> El `sensor de luz` tuvo que ser eliminado, ya que no todos los dispositivos lo incluyen, es por esto que su implementación iba a traer problemas
>>
>> <br>
>> Se añadio el `microfono`

- La web PC debe centrar el videjouego `DOOM`, al extremo derecho deben haber de 1 a 7 columnas, en las que se visualice la acción ejecutada según los sensores seleccionados, esto con el fin de tener "_feedback_" del control

### Que **NO** debe ocurrir

- No deben existir un usuario con controles que interfieran
- Que la interfaz movil sea desplazable, debe ser un `canva` único adaptable
- La versión PC solo debe mostrar la partida y poder controlar el `menú`, debe ser jugable únicamente mediante el uso de "_celulares_"
- En dispositivos moviles, la web debe versé lo más "_limpia_", es decir que se deben reducir la cantidad de elementos en ella a los mínimos necesarias 

---

<br>

---

## Indicaciones Claude

### Contexto y Propósito

- **Idea en una frase:** Multiples personas juegan de manera simultanea la misma partida y con el mismo personaje

- **¿Qué/quién es "Doomy"?:** Es un juego de palabras con "dumie" y el evento "Twitch Plays Pokemon"

- **Experiencia que se busca:** La idea es que estas personas deban coordinarse para poder jugar de manera normal DOOM, al cada una controlar elementos diferentes, se hace algo más complejo

- **Público objetivo / Usuario final:** Personas de entre 18 a 30 años

<br>

### Objetivos y Entregables

- **Objetivo principal:** La idea es que los jugadores mediante el uso de los sensores de sus dispositivos móviles controlen al personaje del videojuego

- **Tipo de juego/género:** corresponde al videojuego DOOM, ubicado en `./doom`

- **Modalidad multijugador:**
  - Rol del smartphone: manipular la partida, ya sea el movimiento del personaje, abrir el menú, correr, etc... Esto mediante el uso de los sensores, por ejemplo rotar el celular en el eje x hace que se desplace lateralmente
  - ¿Hay pantalla principal compartida (PC/TV)?: El PC debe mostrarse la partida en tiempo real, en los celulares solamente los indicadores asociados a cada sensor
  - Nº de jugadores (mín–máx): un mínimo de 1 jugador hasta 5 jugadores
  - Modo: Es un modo cooperativo, ya que todos juegan la misma partida, solo que controlan elementos especificos
  - Conexión: Mediante el MQTT
- **Cómo se une un jugador:** Debe escanear un QR
- **Mecánicas mínimas (MVP):** Que los usuarios puedan elegir que controlar y como hacerlo, no puede haber ningún control que no se seleccione
- **Mecánicas deseables (después):** La idea es definir de mejor manera como atribuir los controlos a los usuarios
- **Entregables esperados:**
  1. El index.html, style.css, main.js y los archivos necesarios
  2. Agregar un INSTRUCCIONES.md
  3. Una sección de comentarios en README.md de Claude (## Comentarios Claude) que indique que elementod mejorar para otras versiones  

<br>

### Restricciones y Alcance

- **Tecnologías permitidas/obligatorias:** Seccionar los archivos de la web (un html, un css, un js, etc)

- **¿Se permite servidor/backend?:** nose, lo que claude recomiende

- **Hosting:** GitHub Pages

- **Dispositivos objetivo:** Navegador de PC

- **Qué INCLUYE:** Almacenar el progreso en el navegador

- **Qué EXCLUYE:** sin base de datos

- **Idioma de la interfaz:** Español

- **Tono y estilo visual:** Estética web de principios de los 2000 (Y2K) definida en `design_system_2000s.json` y aplicada en `style.css` (paleta oscura, barras naranja/rojo, Roboto Mono, Space Mono y VT323)

<br>

### Insumos y Variables

- **Assets propios:** utiliza como referencia la carpeta `/doom`

- **Reglas del juego:** referencia `/doom`

- **Controles:** utilizar los sensores como el giroscopio, el acelerometro, la pantalla táctil

---

## Tabla de mapeo de sensores (provisoria)

> Actualizada en v03 según el código. Los valores son los **valores por defecto**: cada celular los puede cambiar en la pestaña _Ajustes_ (lobby y pausa general) o en la fase de calibración. El código está en `comun.js` (descripciones, teclas, gestos y valores por defecto) y `control.js` (cálculo).
>
> "Moverse lateralmente" usa los gestos de desplazamiento lateral, pero **en el juego gira** (teclas ← →). Por eso "Girar" no existe como control aparte.

### Sensor Giroscopio

| # | Control | Gesto | Comportamiento |
| - | ------- | ----- | -------------- |
| 1 | Moverse / Avanzar - retroceder | Inclinar el teléfono hacia adelante o atrás | Utiliza el eje X del dispositivo (beta) / Avanzar y retroceder si supera ±15° (_n0_) |
| 2 | Moverse lateralmente (gira) | Inclinar el teléfono hacia los lados | Utiliza el ladeo del dispositivo (gamma) / gira a la izquierda o derecha si supera ±15° (_n0_) |
| 3 | Girar | Reemplazado por _Moverse lateralmente_ | Reemplazado por _Moverse lateralmente_ |
| 4 | Disparar | Hacer un giro rápido y breve hacia los lados | Giro rápido en los ejes Z o Y (> 250 °/s) + una aceleración > 4 m/s² en el último segundo (acelerómetro). Dispara 400 ms |
| 5 | Abrir puertas / Usar | Hacer un giro rápido y breve hacia adelante y/o atrás | Giro rápido en el eje X (> 250 °/s) + una aceleración > 4 m/s² en el último segundo (acelerómetro). Usa 200 ms |
| 6 | Correr | Inclinar ampliamente el teléfono hacia adelante | Si la inclinación del teléfono es >= 35° (_n1_) |
| 7 | Cambiar arma | No disponible con giroscopio | No disponible con giroscopio |
| 8 | Mapa | No disponible con giroscopio | No disponible con giroscopio |

<br>

### Sensor Acelerómetro

| # | Control | Gesto | Comportamiento |
| - | ------- | ----- | -------------- |
| 1 | Moverse / Avanzar - retroceder | Inclinar el teléfono hacia adelante o atrás | Inclinación calculada con la gravedad / Avanzar y retroceder si supera ±15° (_n2_) |
| 2 | Moverse lateralmente (gira) | Inclinar el teléfono hacia los lados | Ladeo calculado con la gravedad / gira a la izquierda o derecha si supera ±15° (_n2_) |
| 3 | Girar | Reemplazado por _Moverse lateralmente_ | Reemplazado por _Moverse lateralmente_ |
| 4 | Disparar | Hacer un movimiento rápido | Al detectar una aceleración > 12 m/s² (_n3_). Dispara 400 ms |
| 5 | Abrir puertas / Usar | Mover el teléfono rápido hacia adelante o atrás | Al detectar una aceleración > 12 m/s² en el eje Z del dispositivo (perpendicular a la pantalla). Usa 200 ms |
| 6 | Correr | Inclinar ampliamente el teléfono hacia adelante | Si la inclinación del teléfono es >= 35° (_n4_) |
| 7 | Cambiar arma | No disponible con acelerómetro | No disponible con acelerómetro |
| 8 | Mapa | No disponible con acelerómetro | No disponible con acelerómetro |

<br>

### Sensor Touch

| # | Control | Gesto | Comportamiento |
| - | ------- | ----- | -------------- |
| 1 | Moverse / Avanzar - retroceder | Deslizar hacia adelante / atrás | Deslizar el dedo<sup>1</sup> (zona muerta 30 px) |
| 2 | Moverse lateralmente (gira) | Deslizar hacia izquierda / derecha | Deslizar el dedo<sup>1</sup> (zona muerta 30 px) |
| 3 | Girar | Reemplazado por _Moverse lateralmente_ | Reemplazado por _Moverse lateralmente_ |
| 4 | Disparar | Apoyar un dedo (que no sea el del joystick) | Cada dedo nuevo dispara al instante y se sigue disparando mientras quede apoyado<sup>2</sup> |
| 5 | Abrir puertas / Usar | Hacer doble toque | 2 toques cortos en menos de 0,9 s y a menos de 50 px entre sí<sup>3</sup> |
| 6 | Correr | Deslizar hacia adelante con 2 dedos | Al detectar 2 dedos deslizándose juntos hacia arriba corre<sup>4</sup> |
| 7 | Cambiar arma | Menú con flecha <br> ◀ ▶ | Funciona como un carrusel<sup>5</sup> |
| 8 | Mapa | Botón Mapa | Un botón exclusivo para abrir / cerrar el mapa<sup>6</sup> |

<sup><strong>1</strong></sup> Simula un _joystick_ virtual, no posee una ubicación determinada, funciona donde se coloque el primer dedo

<sup><strong>2</strong></sup> Si se está desplazando con el joystick y se apoya otro dedo, dispara sin detener el movimiento: ambos se ejecutan a la vez. Sin joystick táctil, el primer dedo también dispara. Si ya se está disparando, un dedo nuevo vuelve a presionar la tecla (sin esperar)

<sup><strong>3</strong></sup> Este _doble toque_ no es restrictivo con el _joystick virtual_. Disparar táctil y Usar táctil solo pueden estar en el mismo celular si este también tiene el joystick (Moverse o Lateral táctil); si no, el doble toque también dispararía

<sup><strong>4</strong></sup> Correr táctil y Disparar táctil no pueden estar en el mismo celular: al apoyar el 2º dedo para correr también se dispararía

<sup><strong>5</strong></sup> Se visualiza ◀ [Arma seleccionada] ▶

<sup><strong>6</strong></sup> Ubicado en la esquina inferior izquierda, funciona como un _push button_ (cada pulsación abre o cierra el mapa)

<br>

### Sensor Micrófono

> Un celular solo puede tener **un** control con micrófono: un mismo sonido activaría a la vez los controles por volumen y por frecuencia. Los dB son relativos al micrófono de cada celular (0 dB = saturado).

| # | Control | Gesto | Comportamiento |
| - | ------- | ----- | -------------- |
| 1 | Moverse / Avanzar - retroceder | Frecuencia de sonidos | Sonido entre 250 y 800 Hz avanza; fuera de ese rango retrocede; en silencio (< −50 dB) se detiene |
| 2 | Moverse lateralmente (gira) | Sonidos altos o bajos | Sobre −30 dB gira a la derecha; entre −50 dB (ruido de fondo) y −30 dB gira a la izquierda; en silencio no gira |
| 3 | Girar | Reemplazado por _Moverse lateralmente_ | Reemplazado por _Moverse lateralmente_ |
| 4 | Disparar | Sonido de altos decibeles (grito) | Dispara mientras el sonido supere −12 dB |
| 5 | Abrir puertas / Usar | Sonido de bajos dB | Sonido entre −50 dB (ruido de fondo) y −12 dB (umbral de _Disparar_); como máximo un "usar" cada 0,6 s |
| 6 | Correr | Sonidos altos dB | Corre mientras el sonido supere −20 dB |
| 7 | Cambiar arma | No disponible con micrófono | No disponible con micrófono |
| 8 | Mapa | Sonido bajo en Hz (grave) | Un sonido bajo 150 Hz abre / cierra el mapa (como máximo una vez por segundo) |

<br>

### Notas

- El sensor touch es el único que muestra información en pantalla: durante la partida, el celular solo muestra los elementos táctiles (joystick, botón Mapa y carrusel de armas)
- Entre dos sacudidas o giros bruscos hay una pausa mínima de 450 ms.
- La posición neutral se calibra en la **fase de calibración**, que se abre al presionar "Estoy listo" (botón "Recalibrar" para repetirla). El jugador queda listo al presionar "Confirmar calibración"
- En el lobby y en la _pausa general_, la pestaña _Ajustes_ permite "Recalibrar", "Invertir dirección", modificar los umbrales (con la lectura en vivo del sensor) y volver a los valores por defecto
- No se pueden elegir en el mismo dispositivo 2 controles que se activen con un gesto similar o igual (ver la tabla de gestos en `INSTRUCCIONES.md`)

---

<br>

## Comentarios Claude

<details>
<summary><b>Click acá</b></summary>

Elementos a mejorar en próximas versiones:

### v01

1. **Calibrar umbrales con celulares reales.** Los valores (15°, 5 m/s², 14 m/s², 300 °/s) son provisorios y no se han probado en dispositivos; conviene ajustarlos o hacerlos configurables desde el lobby.
2. **Conflictos de sensores en un mismo celular.** Si un jugador maneja dos controles con el mismo gesto (por ejemplo Disparar y Usar con sacudida), una sacudida activa ambos. Se podría advertir en el lobby o impedir esa combinación.
3. **Girar con giroscopio sostenido en vertical.** Con el celular muy vertical, el ladeo (gamma) es inestable en algunos equipos; se recomienda sostenerlo a unos 45° o evaluar otra forma de girar.
4. **Desplazamiento lateral con giroscopio.** Usa la orientación alpha, que en algunos Android sin brújula no se entrega; en esos equipos conviene elegir otro sensor.
5. **Movimiento digital.** DOOM recibe teclas (todo o nada); un giro proporcional a la inclinación (simulando el mouse) haría el control más fino.
6. **Menú compartido.** Las flechas del menú de DOOM son las mismas del movimiento, por lo que quien controla "Moverse" también mueve el cursor del menú cuando está abierto.
7. **Reasignación automática.** Hoy los controles de quien se desconecta pasan al jugador con menos controles en pantalla táctil; se podría permitir que los jugadores los tomen o cambien el sensor durante la partida.
8. **Volver al lobby sin recargar.** Para reiniciar hay que recargar la página del PC (los celulares se reconectan solos, pero la asignación se pierde).
9. **Seguridad.** La contraseña del broker está en `config.js`, que es público en GitHub Pages; cualquiera podría publicar en `tacto/#`. Una alternativa es un usuario de solo los temas `tacto/doomy/#` o credenciales por sala.
10. **Latencia.** Los inputs viajan con QoS 0 por el broker en la nube; si se nota retraso, evaluar un broker más cercano.
11. **Estilos.** `style.css` es básico y provisorio.

#### soluciones

1. Debe existir un _pausa general_ en la web PC que al entrar, cada dispositivo puede configurar la sensibilidad y umbrales de sus sensores. Este se abre presionando _`enter`_
2. Esto se soluciona bloqueando la opción de que 2 elementos sean elegibles por el mismo usuario 
3. Pendiente
4. Habilitarlo solo si el dispositivo lo permite
5. El giro está deshabilitado por el momento
6. El menú debe ser controlado desde el PC con flechas o WASD, este debe habilitarse presionando _`esc`_
7. Al desconectarse un jugador, debe abrirse el _`pausa general`_ permitiendo que los jugadores restantes elijan que otros elementos controlar
8. Añade en la WEB PC una opción de `volver al lobby`
9. Si es posible de hacerlo automático, realizalo
10. Ignorar
11. Ignorar
12. Debe ser posible un máximo de 9 jugadores ahora

### v02

Cambios aplicados respecto de v01: 7 controles (Girar se reemplazó por "Moverse lateralmente", que gira), máximo 7 jugadores, menú de DOOM desde el PC (Esc + flechas/WASD), pausa general con Espacio (también se abre sola si alguien se desconecta), ajustes de sensibilidad por celular en la pausa, bloqueo de gestos iguales en un mismo celular, sensores ocultos si el celular no los tiene, micrófono como cuarto sensor, nuevos gestos táctiles, indicadores de teclas en el celular, volver al lobby con autoguardado y opción de continuar. Los valores por defecto están en `INSTRUCCIONES.md`.

Elementos a mejorar:

1. **Motor recompilado (Emscripten 6.0.13).** Se probó en Edge que `doomy_web.c` detecta el menú, la escritura del nombre de partida y la partida en curso; que la pausa detiene el juego; y que el autoguardado se escribe y se carga con "Continuar partida guardada". Si se cambia el código C hay que volver a compilar con `doom/build-web.sh`.
2. **Probar en celulares reales.** La lógica de sala, lobby, conflictos, inputs y pausa se probó con el broker real en un navegador simulado, pero los sensores, el micrófono y los gestos táctiles no se han probado en dispositivos; los valores por defecto son estimaciones.
3. **Tablas del README desactualizadas.** Las tablas de mapeo siguen diciendo "desplazamiento lateral" y "Girar: no habilitado"; en el juego, "Moverse lateralmente" ahora gira. Conviene ajustar el texto, y los valores _n0_–_n4_ ya están definidos en `INSTRUCCIONES.md`.
4. **Micrófono.** Los dB son relativos al micrófono de cada celular (no dB reales), la frecuencia se estima con el pico del espectro (la voz tiene armónicos y puede fallar) y "usar" se activa con cualquier sonido suave cada 0,6 s. Además, la regla de gestos permite en un mismo celular un control por volumen y otro por frecuencia, que reaccionan al mismo sonido.
5. **Ajustes solo en la pausa.** La primera vez hay que iniciar la partida y pausar para calibrar umbrales; se podrían mostrar también en el lobby. Además, algunos umbrales se comparten entre controles (por ejemplo, la inclinación de Moverse y Lateral).
6. **Disparar táctil exige 2 dedos** aunque el jugador no tenga el joystick; en ese caso podría bastar un dedo. Si el mismo celular tiene Correr táctil, el disparo espera 150 ms para distinguirlo del deslizamiento.
7. **Autoguardado en la ranura 6.** Sobrescribe lo que los jugadores hayan guardado en esa ranura del menú de DOOM.
8. **Volver al lobby recarga el PC.** Los celulares ven "sala cerrada" un momento y se reconectan solos; si se cierra la pestaña del PC en vez de usar el botón, no hay autoguardado.
9. **Jugadores que entran a mitad de partida** quedan sin controles hasta la próxima pausa general; el PC solo lo muestra en el registro.
10. **Modo aproximado del menú.** Si alguien publica un `doom.js` sin `doomy_web.c`, la página adivina si el menú está abierto contando los Esc y puede desincronizarse; conviene mantener siempre el motor recompilado.
11. **"Qué NO debe ocurrir"** sigue vacío en el README; completarlo ayudaría a definir pruebas.

### Soluciones

1. Ignorar
2. Fue probado y de momento funciona
3. Actualiza estos elementos del README
4. Explica y detalla mejor el problema
5. Tener una fase de calibración previa en el `Lobby`
6. El disparo táctil debe ser al sumar un dedo en la pantalla, es decir que si hay 3 puntos presionados, al haber 4 debe ejecutarse. De esta manera se disminuye el `delay`
7. Ignorar
8. Ignorar
9. Ignorar
10. Explica y detalla mejor el problema
11. 

### v03

Cambios aplicados respecto de v02:

- **Tablas de mapeo actualizadas** (solución 3): "Moverse lateralmente" figura como el control que gira, "Girar" figura como reemplazado y los valores _n0_–_n4_ están escritos en cada tabla.
- **Fase de calibración** (solución 5): al tocar "Estoy listo" (en el lobby o en la pausa general) se piden los permisos y se abre la pantalla _Calibración_: fija la posición neutral, muestra la lectura en vivo de cada sensor junto a sus umbrales y tiene los botones "Recalibrar" y "Valores por defecto". El jugador queda listo al tocar "Confirmar calibración" ("Volver" regresa sin quedar listo). Además, la pestaña _Ajustes_ ahora también está en el lobby.
- **Disparo táctil sin delay** (solución 6): cada dedo nuevo que no sea el del joystick dispara al instante, aunque ya se esté disparando, y se sigue disparando mientras quede apoyado alguno de esos dedos. Se quitó la espera de 150 ms. Sin joystick táctil, el primer dedo también dispara.
- **Controles que interfieren** ("Qué NO debe ocurrir"): ahora también se bloquean en un mismo celular:
  - Disparar táctil + Correr táctil (el 2º dedo para correr también dispararía).
  - Disparar táctil + Usar táctil sin joystick táctil (el doble toque también dispararía). Tampoco se puede soltar el joystick ni cambiarle el sensor si deja esa combinación.
  - Más de un control con micrófono (ver el detalle del punto 4).
- **PC**: durante la partida solo se ve DOOM, centrado, y a la derecha una columna por jugador (1 a 7) con sus controles; la acción que está ejecutando cada uno se resalta en vivo. Se quitaron el botón "Pantalla completa", el código de sala, la ayuda del teclado y el registro (el registro va a la consola del navegador). La ayuda del teclado quedó en una línea del lobby.
- **Celular**: todas las vistas (unirse, lobby, calibración, ajustes y partida) ocupan exactamente la pantalla, sin scroll. Durante la partida solo se ven los elementos táctiles (joystick, botón Mapa y carrusel de armas); se quitaron los indicadores de teclas, las tarjetas de los controles con sensores y los textos de ayuda.

Detalle de los problemas pedidos en las soluciones 4 y 10:

**4. Micrófono.** El micrófono tenía cuatro problemas. El último ya está resuelto en v03; los otros tres siguen:

- **Los dB no son decibeles reales.** El navegador entrega el audio como muestras entre −1 y 1. Se calcula su potencia promedio (RMS) y se pasa a dB respecto del máximo que puede registrar el micrófono: 0 dB es el micrófono saturado y todo sonido real es negativo (por ejemplo, −50 dB es una sala en silencio y −12 dB, un grito). Cada celular tiene un micrófono de distinta sensibilidad, y algunos sistemas aplican ganancia aunque se pida desactivarla. Por eso un mismo grito puede medir −10 dB en un celular y −25 dB en otro, y los umbrales por defecto (−50, −30, −20 y −12 dB) pueden no servir en un equipo concreto. Ahora se pueden ajustar en la fase de calibración mirando la lectura en vivo.
- **La frecuencia se estima con el pico del espectro.** Para "Moverse" (250–800 Hz) y "Mapa" (< 150 Hz) se busca la frecuencia más fuerte entre 50 y 2000 Hz, con una precisión de unos 23 Hz. La voz humana no es una frecuencia única: tiene una fundamental (la nota que se percibe) y armónicos en sus múltiplos, y a veces un armónico es más fuerte que la fundamental. Así, una voz de 200 Hz puede leerse como 400 o 600 Hz, y el personaje alterna entre avanzar y retroceder aunque el jugador mantenga la misma nota. Silbar funciona mejor que hablar, porque un silbido es casi una frecuencia pura.
- **El micrófono escucha todo lo que suena en la sala.** "Usar" se activa con cualquier sonido entre el ruido de fondo y el grito, como máximo cada 0,6 s, y "Lateral" gira con cualquier sonido. Como el juego obliga a los jugadores a coordinarse hablando, sus conversaciones y el audio del PC activan esos controles sin querer: el personaje abre puertas o gira solo.
- **Volumen y frecuencia en el mismo celular (resuelto en v03).** Antes la regla de gestos separaba los controles por volumen (Lateral, Disparar, Usar, Correr) de los controles por frecuencia (Moverse, Mapa), así que un celular podía tener uno de cada tipo. Pero un mismo sonido tiene volumen y frecuencia a la vez y activaba ambos. Ahora se permite un solo control con micrófono por celular.

**10. Modo aproximado del menú.** La página necesita saber si el menú de DOOM está abierto. Con el menú abierto, ignora lo que envían los celulares y deja que las flechas o WASD del PC muevan el cursor; con el menú cerrado, el teclado del PC no mueve al personaje. El motor recompilado incluye `doomy_web.c`, que entrega ese dato exacto (la página lo consulta cada 100 ms). Si alguien reemplaza `doom/doom.js` por uno compilado sin `doomy_web.c` (por ejemplo, el del repositorio original), esa función no existe y la página entra en un "modo aproximado": supone que cada Esc abre o cierra el menú. Pero DOOM también abre y cierra el menú sin pasar por Esc:

- Al elegir "New Game", cargar una partida o confirmar "salir", el menú se cierra solo.
- En la pantalla de título, cualquier tecla (también la de un celular) lo abre.

Desde ese momento la suposición queda invertida. La página cree que el menú está cerrado cuando está abierto, y entonces los celulares mueven el cursor del menú y el PC no puede manejarlo. O cree que está abierto cuando está cerrado, y se ignoran los celulares. Además, en ese modo la pausa general no detiene el juego y no hay autoguardado. Con los archivos actuales de `doom/` esto no ocurre; solo pasaría si se publica otro `doom.js`. Hay dos alternativas: no reemplazar nunca `doom/doom.js`, `doom.wasm` y `doom.data` por otros que no se hayan compilado con `doom/build-web.sh`, o eliminar el modo aproximado y mostrar un error si falta `doomy_web.c`.

Elementos a mejorar:

1. **Probar en celulares reales.** La calibración, el disparo por dedo nuevo y el diseño sin scroll se probaron solo en un navegador de escritorio (con capturas de pantalla), no en celulares.
2. **Doble toque de "Usar" en 0,9 s.** La tabla original pedía 2 o 3 segundos entre los dos toques; el código usa 0,9 s (`DOBLE_TOQUE` en `control.js`) para que dos toques sueltos no cuenten como doble toque. Falta confirmar qué valor se quiere.
3. **Celulares sin elementos táctiles.** Durante la partida, quien solo usa sensores o micrófono ve la pantalla vacía. No sabe si su gesto se reconoció; esa información solo aparece en las columnas del PC.
4. **Columnas del PC con 7 jugadores.** Las 7 columnas ocupan cerca de la mitad del ancho de un monitor de 1600 px, así que DOOM se ve más pequeño. Se podría hacerlas más angostas o mostrar solo el control activo.
5. **Pantalla completa.** Se quitó el botón; para jugar a pantalla completa hay que usar la del navegador (F11), con lo que también se ven las columnas.
6. **Disparar al sumar un dedo.** En DOOM, mantener presionado Ctrl ya dispara en forma continua. Volver a presionar con cada dedo nuevo no dispara más rápido que la cadencia del arma; solo evita esperas al empezar.

### v04

Cambios aplicados respecto de v03:

- **`style.css` reescrito** según `design_system_2000s.json`. Antes de escribir el código se definieron estos puntos:
  - Se aplica al PC y al celular.
  - Paleta oscura, con barras de módulo en degradado naranja → rojo.
  - Cambios menores en el HTML, sin barra lateral.
  - El celular usa texto más grande.
  - Fuentes desde Google Fonts, con VT323 para los títulos.
  - Durante la partida el PC sigue a pantalla completa, con marco Y2K.
- **PC (lobby):** contenedor centrado de 960 px sobre una trama de píxeles. Arriba va una cabecera con el logo en VT323 y abajo un pie de página con 4 insignias de 88x31 px y la nota legal. Las secciones Sala, Jugadores y Controles son módulos con bordes biselados y barra de título. Se agregaron tablas con encabezado metálico y filas alternadas, botones metálicos y botones principales naranjos (Iniciar, Continuar, Unirse, Estoy listo).
- **PC (partida):** sin ancho fijo. DOOM tiene un marco biselado, las columnas de jugadores usan barras naranjas y la acción activa se ve hundida en naranja. La pausa general es un módulo sobre el juego.
- **Celular:** misma estética, con texto de 15 px, inputs de 16 px (iOS no hace zoom) y botones de al menos 44 px. Las pestañas tienen las esquinas superiores redondeadas. En la partida, la zona táctil lleva una cuadrícula, el joystick tiene una perilla naranja y el arma actual se muestra como una pantalla LCD.
- **Decoraciones:** viñetas en forma de cruz de píxeles, insignias de 88x31 px, inputs y selects grises con borde hundido (estilo Windows 2000) y la etiqueta **NEW!**. Esta etiqueta parpadea durante 20 s junto al jugador que se acaba de unir (`TIEMPO_NUEVO` en `main.js`).
- **HTML:** se agregaron el `<link>` a las fuentes, las clases `modulo`, `modulo-titulo`, `modulo-cuerpo` y `principal`, la cabecera y el pie. No se cambió ningún `id` que use el JS.

Elementos a considerar:

1. **Fuentes externas.** Roboto Mono, Space Mono y VT323 se cargan desde Google Fonts. Sin internet (o si se bloquea Google), el texto usa la fuente monospace del sistema y el diseño se mantiene. VT323 no tiene algunos símbolos, como las flechas ← →; en esos casos el navegador usa otra fuente para ese carácter.
2. **Altura del lobby en celulares pequeños.** Los botones de 44 px hacen más alta la lista de 7 controles. En pantallas de unos 550 px útiles (iPhone SE con la barra del navegador), la última fila podría quedar cortada, porque el diseño no tiene scroll. Hay que probarlo en un celular real. Si ocurre, se puede bajar a 36–40 px solo en `.fila button`.
3. **Colores de enlaces distintos al JSON.** El JSON pide #0000FF para los enlaces y #800080 para los visitados, pero sobre fondo oscuro casi no se leen. Se usaron #6aa8ff y #c58cff, porque el JSON permite "colores de alto contraste con el fondo".
4. **Tamaño del logo.** El JSON fija los títulos principales en 18–24 px. El logo se dejó en 44 px (48 px en el celular) porque VT323 se ve pequeña y la cabecera del JSON pide un "logo complejo". Los títulos de módulo sí están en 14–16 px.
5. **Elementos del JSON que no se aplicaron:**
   - barra lateral (decisión tomada);
   - pestañas de navegación y buscador en la cabecera: la web tiene una sola página, así que no hay a dónde navegar;
   - miniaturas (thumbnails) y texturas grunge.

   Si más adelante se agregan secciones (por ejemplo, Instrucciones o Créditos), se pueden incluir las pestañas de la cabecera.
6. **Contraste de las barras naranjas.** El texto blanco sobre la parte clara del degradado tiene un contraste cercano a 3:1; la sombra negra del texto lo compensa. Conviene revisarlo en el proyector o la TV donde se jugará.
7. **Etiqueta NEW!** Solo aparece en el PC (lista de jugadores del lobby y de la pausa). Los jugadores recuperados al "volver al lobby" no la muestran. Si el sistema tiene activado "reducir movimiento", no parpadea.
8. **Insignias de 88x31.** Están hechas con texto y CSS, no son imágenes, y no enlazan a ningún sitio. Si se quieren imágenes reales, se pueden agregar como `.gif` o `.png` en una carpeta `img/`.
9. **Columnas del PC.** Ahora miden 8,5em con letra de 11 px (unos 94 px por jugador, antes unos 102 px). Con 7 jugadores siguen restando ancho a DOOM (ver el punto 4 de v03).
10. **Pruebas.** Se revisó con capturas de Edge en modo headless: el lobby del PC; la partida y la pausa simuladas; y en el celular, unirse, el lobby y la partida simulados en 390 px de ancho. No se probó con el broker conectado, en celulares reales ni en Safari/iOS.

</details>

<br>

##  Resultado Final y Conclusiones

Finalmente en esta web se puede experimentar como no solo el tacto trabaja en conjunto conjunto con otros sensores, no solo en el cuerpo humano, si no tambien en los dispositivos. En _Doomy plays DOOM_, se representa como ninguna sensación funciona sola, todas estas se complementan para lograr una interpretación de la realidad y en este caso la realidad es jugar DOOM. 

Esta experiencia busca ser compleja sin caer en la frustración, es por ello que consta de calibración de los sensores y el uso de otros con menor complejidad

En esta experiencia se encuentra la interconexión entre los distintos sentidos y como el tacto puede hacer de anclaje entre ellos