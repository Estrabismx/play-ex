# Proyecto: Doomy plays DOOM

- Fecha inicio 05-11-2026 
- Estado [**En Ideación**]

<br>

---

<br>

## 1. Contexto

En el año 2014 en la plataforma Twitch, se realizó un directo todos quienes observaban la transmisión podían jugar, este evento se llamó "_Twitch Plays Pokemon_". Es decir que miles de personas controlaban la misma partida y al mismo personaje a la vez, esto fue posible ya que mediante la escritura de comandes en el chat de Twitch un _script_ lo interpretaba y realizaba las acciones en el videojuego.

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

- Es importante que antes de inicar el juego exista un "_lobby_", en este se debe poder configurar que va a realizar cada usuario, además de que elementos se van a poder controlar:

  - Moverse y girar
  - Disparar
  - Abrir puertas, usar
  - Correr
  - Desplazarse lateralmente
  - Cambiar arma
  - Mapa
  - Menú

Los usuarios deben poder elegir que elementos controlar en su celular, además de como, por ejemplo: giroscopio, acelerometro, sensor de luz, pantalla touch

### Que **NO** debe ocurrir



---

##  Resultado Final y Conclusiones

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

- **Tono y estilo visual:** Utilizar html sin css para lo que no sea nativo de `doom.WAV`

<br>

### Insumos y Variables

- **Assets propios:** utiliza como referencia la carpeta `/doom`

- **Reglas del juego:** referencia `/doom`

- **Controles:** utilizar los sensores como el giroscopio, el acelerometro, la pantalla táctil

---

## Tabla de mapeo de sensores (provisoria)

> Mapeo inicial definido por Claude para la primera versión. Editar esta tabla con los mapeos definitivos; el código está en `comun.js` (descripciones y teclas) y `control.js` (umbrales y cálculo).

### Sensor Giroscopio

| # | Control | Gesto | Comportamiento |
| - | ------- | ----- | -------------- |
| 1 | Moverse / Avanzar - retroceder | Inclinar el teléfono hacia adelante o atrás | Utiliza el eje X del dispositivo para el desplazamiento / Avanzar y retroceder ±_n0_°  |
| 2 | Moverse lateralmente | Inclinar el teléfono hacia los lados | Utiliza el eje Z o Y del dispositivo para el desplazamiento lateral / izquierdo y derecha ±_n0_° |
| 3 | Girar |  No está habilitado | No está habilitado |
| 4 | Disparar | Hacer un giro rápido y breve hacia los lados | Al hacer un giro rápido en los ejes Z o Y  +  detectar una aceleración de menos de 1s con el acelerometro se ejecuta la acción |
| 5 | Abrir puertas / Usar | Hacer un giro rápido y breve hacia adelante y/o atrás | Al hacer un giro rápido en el eje X  +  detectar una aceleración de menos de 1s con el acelerometro se ejecuta la acción |
| 6 | Correr | Inclinar ampliamente el teléfono hacia adelante | Si la inclinación del teléfono es >= _n1_° |
| 7 | Cambiar arma | No disponible con giroscopio | No disponible con giroscopio |
| 8 | Mapa | No disponible con giroscopio | No disponible con giroscopio |

<br>

### Sensor Acelerómetro

| # | Control | Gesto | Comportamiento |
| - | ------- | ----- | -------------- |
| 1 | Moverse / Avanzar - retroceder | Inclinar el teléfono hacia adelante o atrás | Utiliza el eje X del dispositivo para el desplazamiento / Avanzar y retroceder ±_n2_°  |
| 2 | Moverse lateralmente | Inclinar el teléfono hacia los lados | Utiliza el eje Z o Y del dispositivo para el desplazamiento lateral / izquierdo y derecha ±_n2_° |
| 3 | Girar |  No está habilitado | No está habilitado |
| 4 | Disparar | Hacer un movimiento rápido | Al detectar una aceleración de ±_n3_ m/s² |
| 5 | Abrir puertas / Usar | Hacer un giro rápido y breve hacia adelante y/o atrás | Al hacer un giro rápido en el eje X  +  detectar una aceleración de menos de 1s con el acelerometro se ejecuta la acción |
| 6 | Correr | Inclinar ampliamente el teléfono hacia adelante | Si la inclinación del teléfono es >= _n4_° |
| 7 | Cambiar arma | No disponible con acelerómetro | No disponible con acelerómetro |
| 8 | Mapa | No disponible con acelerómetro | No disponible con acelerómetro |

<br>

### Sensor Touch

| # | Control | Gesto | Comportamiento |
| - | ------- | ----- | -------------- |
| 1 | Moverse / Avanzar - retroceder | Deslizar hacia adelante / atrás | Deslizar el dedo<sup>1</sup> |
| 2 | Moverse lateralmente | Deslizar hacia izquierda / derecha | Deslizar el dedo<sup>1</sup> |
| 3 | Girar | No está habilitado | No está habilitado |
| 4 | Disparar | Colocar 2 dedos en la pantalla | Al identificar solo 2 dedos se debe disparar<sup>2</sup> |
| 5 | Abrir puertas / Usar | Hacer doble click | Se deben detectar 2 presiones en un rango determinado en un tiempo de 2 a 3 segundos<sup>3</sup> |
| 6 | Correr | Deslizar hacia adelante con 2 dedos | Al detectar 2 dedos deslizandose se va a activar el correr<sup>4</sup> |
| 7 | Cambiar arma | Menú con flecha <br> ◀ ▶ | Funciona como un carrusel<sup>5</sup> |
| 8 | Mapa | Botón Mapa | Un botón que sea exclusivamente para habilitar el menú<sup>6</sup> |

<sup><strong>1</strong></sup> Esto debe simular un _joystick_ virtual, no posee una ubicación determinada, funciona donde se coloque el dedo

<sup><strong>2</strong></sup> Si se está desplazando y se coloca un dedo encima no debe bloquearse la acción de disparar ni moverse, deben ejecutarse a la vez

<sup><strong>3</strong></sup> Este _doble click_ no es restrictivo con el _joystick virtual_ 

<sup><strong>4</strong></sup> Debe identifarse que se estan deslizandose para no interferir con el _4. Disparar_

<sup><strong>5</strong></sup> Debe visualizarse ◀ [Arma seleccionada] ▶

<sup><strong>6</strong></sup> Ubicado en la esquina inferior izquierda, funciona como un _push button_

<br>

### Sensor Micrófono

| # | Control | Gesto | Comportamiento |
| - | ------- | ----- | -------------- |
| 1 | Moverse / Avanzar - retroceder | Frecuencia de sonidos | Al detectar sonidos en un umbral de fecuencia avanza, fuera de ese umbral retrocede |
| 2 | Moverse lateralmente | Sonidos altos o bajos | Se establece un umbral, si es mayor va a la derecha, si es menor a la izquierda (Se considera un umbral para filtrar ruido) |
| 3 | Girar | No está habilitado | No está habilitado |
| 4 | Disparar | Se debe detectar un sónido en altos decibeles (grito) | Debe superarse un umbral de dB |
| 5 | Abrir puertas / Usar | Sónido de bajos dB | El sonido debe estar bajo el umbral de _Disparar_ y sobre un umbral que evite detectar ruido de fondo |
| 6 | Correr | Sonidos altos dB | Si se detectan notas sobre un umbral de dB corre |
| 7 | Cambiar arma | No disponible con micrófono | No disponible con micrófono |
| 8 | Mapa | sonido bajos Hz | si suena algo debajo de un umbral (grave) aparece el mapa |

<br>

### Notas

- El sensor touch es el único que muestra información en pantalla
- Entre dos sacudidas o giros bruscos hay una pausa mínima de 450 ms.
- La posición neutral se calibra al presionar "Estoy listo"
- Al habilitar la _pausa general_ se pueden "Recalibrar sensores", "Modificar sensibilidad de sensores", "Invertir dirección"
- No se pueden elegir 2 sensores con controles que se ampliquen de manera similar o igual en el mismo dispositivo

---

## Comentarios Claude

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

1. **Recompilar el motor.** La pausa que detiene a DOOM, el autoguardado y la detección del menú dependen de `doomy_web.c`; mientras no se recompile con Emscripten, la página funciona en un modo aproximado (lo avisa en pantalla). El código C nuevo todavía no se ha compilado ni probado.
2. **Probar en celulares reales.** La lógica de sala, lobby, conflictos, inputs y pausa se probó con el broker real en un navegador simulado, pero los sensores, el micrófono y los gestos táctiles no se han probado en dispositivos; los valores por defecto son estimaciones.
3. **Tablas del README desactualizadas.** Las tablas de mapeo siguen diciendo "desplazamiento lateral" y "Girar: no habilitado"; en el juego, "Moverse lateralmente" ahora gira. Conviene ajustar el texto, y los valores _n0_–_n4_ ya están definidos en `INSTRUCCIONES.md`.
4. **Micrófono.** Los dB son relativos al micrófono de cada celular (no dB reales), la frecuencia se estima con el pico del espectro (la voz tiene armónicos y puede fallar) y "usar" se activa con cualquier sonido suave cada 0,6 s. Además, la regla de gestos permite en un mismo celular un control por volumen y otro por frecuencia, que reaccionan al mismo sonido.
5. **Ajustes solo en la pausa.** La primera vez hay que iniciar la partida y pausar para calibrar umbrales; se podrían mostrar también en el lobby. Además, algunos umbrales se comparten entre controles (por ejemplo, la inclinación de Moverse y Lateral).
6. **Disparar táctil exige 2 dedos** aunque el jugador no tenga el joystick; en ese caso podría bastar un dedo. Si el mismo celular tiene Correr táctil, el disparo espera 150 ms para distinguirlo del deslizamiento.
7. **Autoguardado en la ranura 6.** Sobrescribe lo que los jugadores hayan guardado en esa ranura del menú de DOOM.
8. **Volver al lobby recarga el PC.** Los celulares ven "sala cerrada" un momento y se reconectan solos; si se cierra la pestaña del PC en vez de usar el botón, no hay autoguardado.
9. **Jugadores que entran a mitad de partida** quedan sin controles hasta la próxima pausa general; el PC solo lo muestra en el registro.
10. **Menú del PC sin el motor recompilado.** Se adivina si el menú está abierto contando los Esc; al elegir "New Game" el menú se cierra solo y puede desincronizarse.
11. **"Qué NO debe ocurrir"** sigue vacío en el README; completarlo ayudaría a definir pruebas.
