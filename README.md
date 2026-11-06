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

## Indicaciones Cloude

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

- **Controles:** utilizar los sensores como el giroscopio, el acelerometro, sensor de luz, la pantalla táctil

---

## Tabla de mapeo de sensores (provisoria)

> Mapeo inicial definido por Claude para la primera versión. Editar esta tabla con los mapeos definitivos; el código está en `comun.js` (descripciones y teclas) y `control.js` (umbrales y cálculo).

| Control | Sensor | Gesto | Comportamiento |
|---|---|---|---|
| Moverse | Giroscopio | Inclinar la parte superior del celular hacia adelante / hacia uno | Avanza / retrocede mientras supere ±15° |
| Moverse | Acelerómetro | Igual, calculado con la gravedad | Avanza / retrocede mientras supere ±15° |
| Moverse | Pantalla táctil | Botones Avanzar / Retroceder | Mientras se mantienen presionados |
| Girar | Giroscopio | Inclinar a izquierda / derecha (como volante) | Gira mientras supere ±15° |
| Girar | Acelerómetro | Igual, calculado con la gravedad | Gira mientras supere ±15° |
| Girar | Pantalla táctil | Botones Izquierda / Derecha | Mientras se mantienen presionados |
| Desplazarse lateralmente | Giroscopio | Rotar el celular sobre sí mismo (como una perilla) | Se desplaza mientras supere ±15° |
| Desplazarse lateralmente | Acelerómetro | Mover el celular de golpe a izquierda / derecha (> 5 m/s²) | Se desplaza 250 ms por golpe |
| Desplazarse lateralmente | Pantalla táctil | Botones Izquierda / Derecha | Mientras se mantienen presionados |
| Disparar | Pantalla táctil | Botón | Dispara mientras se mantiene |
| Disparar | Acelerómetro | Sacudir (> 14 m/s²) | Dispara 400 ms |
| Disparar | Giroscopio | Giro brusco (> 300 °/s) | Dispara 400 ms |
| Abrir puertas / usar | Pantalla táctil | Botón | Usa al tocar |
| Abrir puertas / usar | Acelerómetro | Sacudir | Usa (200 ms) |
| Abrir puertas / usar | Giroscopio | Giro brusco | Usa (200 ms) |
| Correr | Pantalla táctil | Botón | Corre mientras se mantiene |
| Correr | Acelerómetro | Sacudir | Alterna correr / caminar |
| Correr | Giroscopio | Giro brusco | Alterna correr / caminar |
| Cambiar arma | Pantalla táctil | Botones 1 a 7 | Elige esa arma |
| Cambiar arma | Acelerómetro | Sacudir | Pasa a la siguiente arma |
| Cambiar arma | Giroscopio | Giro brusco | Pasa a la siguiente arma |
| Mapa | Pantalla táctil | Botón | Abre / cierra el mapa |
| Mapa | Acelerómetro | Sacudir | Abre / cierra el mapa |
| Mapa | Giroscopio | Giro brusco | Abre / cierra el mapa |
| Menú | Pantalla táctil | Botones Menú (Esc), ▲ ▼ ◀ ▶, Aceptar, Sí, No, Borrar, Escribir "DOOMY" | Navega el menú de DOOM |

Notas:
- Entre dos sacudidas o giros bruscos hay una pausa mínima de 450 ms.
- La posición neutral se calibra al presionar "Estoy listo" y con el botón "Recalibrar sensores".
- Cada eje con sensor tiene un botón "Invertir dirección" por si el celular reporta los ejes al revés.

---

## Comentarios Claude

Elementos a mejorar en próximas versiones:

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
