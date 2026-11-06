# Instrucciones — Doomy plays DOOM

Varias personas (de 1 a 5) juegan **la misma partida de DOOM con el mismo personaje**.
La partida se ve en el PC; cada celular controla solo los elementos que eligió en el lobby.

## 1. Configuración (una sola vez)

Abre `config.js` y completa la contraseña del usuario `dommy`:

```js
contrasena: 'ESCRIBE_AQUI_LA_CONTRASENA'
```

Requisitos del broker EMQX (lista blanca):

| Qué | Valor |
|---|---|
| URL | `wss://v1604705.ala.us-east-1.emqxsl.com:8084/mqtt` |
| Usuario | `dommy` |
| Permisos necesarios | Publicar **y** suscribirse en `tacto/#` |
| Retención | Permitida (el estado del lobby se publica retenido) |
| Mensaje de última voluntad (LWT) | Permitido (avisa cuando un PC o celular se desconecta) |

> `config.js` es público en GitHub Pages: cualquiera puede leer la contraseña.

## 2. Publicar en GitHub Pages

1. Sube todos los archivos al repositorio (incluida la carpeta `doom/`).
2. En GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.
3. Abre `https://<usuario>.github.io/<repositorio>/` en el PC.

Los sensores del celular solo funcionan sobre **https**, así que para jugar con
sensores hay que usar GitHub Pages (o cualquier hosting con https).

### Probar en local (sin sensores)

```sh
python -m http.server 8000
```

Abre `http://localhost:8000/` en el PC y el enlace `control.html?sala=…` en otra
pestaña: los controles de **pantalla táctil** funcionan con el mouse.

## 3. Cómo se juega

1. **PC**: abre la página. Aparece la sala (código de 5 letras) y un QR.
2. **Celulares**: escanean el QR, escriben su nombre y entran al lobby.
3. **Lobby (en el celular)**: cada jugador toma controles y elige con qué sensor manejarlos.
   - Cada control tiene un solo dueño.
   - Con un solo jugador, esa persona toma los 9 controles.
4. Cada jugador presiona **"Estoy listo"**: se piden permisos de sensores y se
   calibra la posición neutral (sostén el celular como lo vas a usar).
5. **PC**: cuando todos los controles tienen dueño y todos están listos, se habilita
   **"Iniciar partida"**.
6. Quien tiene el **Menú** abre el menú de DOOM y elige *New Game*.

Durante la partida el teclado del PC está desactivado: todo se controla desde los celulares.

### Si alguien se desconecta

Sus controles pasan automáticamente al jugador con menos controles, en modo
pantalla táctil. Si entra alguien nuevo durante la partida, recibe los
controles que hayan quedado sin dueño.

### Guardar partidas

Desde el menú de DOOM (*Save game*). DOOM pide un nombre: usa el botón
**Escribir "DOOMY"** y luego **Aceptar**. Las partidas quedan guardadas en el
navegador del PC. El botón *Borrar partidas guardadas* del lobby las elimina.

El celular recuerda tu nombre, los controles y sensores que elegiste la última
vez (los vuelve a pedir si están libres) y qué ejes invertiste.

## 4. Controles disponibles

| Control | Sensores | Teclas de DOOM |
|---|---|---|
| Moverse | Giroscopio, acelerómetro, táctil | ↑ ↓ |
| Girar | Giroscopio, acelerómetro, táctil | ← → |
| Desplazarse lateralmente | Giroscopio, acelerómetro, táctil | , . |
| Disparar | Táctil, acelerómetro, giroscopio | Ctrl |
| Abrir puertas / usar | Táctil, acelerómetro, giroscopio | Espacio |
| Correr | Táctil, acelerómetro, giroscopio | Shift |
| Cambiar arma | Táctil, acelerómetro, giroscopio | 1–7 |
| Mapa | Táctil, acelerómetro, giroscopio | Tab |
| Menú | Táctil | Esc, flechas, Enter, Y, N |

Si un eje funciona al revés en tu celular, usa **"Invertir dirección"** en su tarjeta.

## 5. Archivos

| Archivo | Qué hace |
|---|---|
| `index.html` / `main.js` | Pantalla del PC: sala, QR, lobby y juego |
| `control.html` / `control.js` | Control del celular |
| `comun.js` | Controles, sensores y temas MQTT compartidos |
| `config.js` | Datos de conexión al broker |
| `style.css` | Estilos básicos (provisorios) |
| `doom/` | Motor de DOOM compilado a WebAssembly (`doom.js`, `doom.wasm`, `doom.data`) y su código fuente para recompilar (`build-web.sh`, `linuxdoom-1.10/`, `doom.WAD`) |

## 6. Temas MQTT

Todos bajo `tacto/doomy/<SALA>/`:

| Tema | Dirección | Contenido |
|---|---|---|
| `estado` | PC → celulares (retenido) | Fase (`lobby` / `juego` / `cerrada`), jugadores y asignación de controles |
| `host` | Celulares → PC | `unir`, `elegir`, `soltar`, `listo`, `ping`, `salir` (LWT) |
| `input` | Celulares → PC | `{ id, c: control, k: tecla, d: 1/0 }` |
| `jugador/<id>` | PC → un celular | `rechazo`, `bienvenida`, `reunir` |

El PC valida cada mensaje de `input`: solo acepta teclas del control que ese
jugador tiene asignado.
