# Instrucciones — Doomy plays DOOM

Varias personas (de 1 a 7) juegan **la misma partida de DOOM con el mismo personaje**.
La partida se ve en el PC; cada celular controla solo los elementos que eligió.
El menú de DOOM y la pausa general se manejan con el teclado del PC.

## 1. Configuración (una sola vez)

`config.js` tiene los datos del broker EMQX:

| Qué | Valor |
| --- | --- |
| URL | `wss://v1604705.ala.us-east-1.emqxsl.com:8084/mqtt` |
| Usuario | `dommy` |
| Permisos necesarios | Publicar **y** suscribirse en `tacto/#` |
| Retención | Permitida (el estado de la sala se publica retenido) |
| Mensaje de última voluntad (LWT) | Permitido (avisa cuando un PC o celular se desconecta) |

> `config.js` es público en GitHub Pages: cualquiera puede leer la contraseña.

## 2. Recompilar el motor de DOOM (necesario para esta versión)

La pausa general, el autoguardado y la detección del menú usan funciones nuevas
del motor (`doom/linuxdoom-1.10/doomy_web.c`). Hay que recompilar una vez con
**Emscripten**. Sin recompilar la web funciona, pero la pausa no detiene a DOOM,
no hay autoguardado y el menú se detecta de forma aproximada (la página lo avisa).

### Instalar Emscripten en Windows (una sola vez)

Requisitos: **Git** y **Python 3** (ya están en este PC). Descarga ~1 GB.
En **Git Bash**:

```sh
cd ~
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
```

### Compilar

Cada vez que se abra una terminal nueva hay que cargar Emscripten antes de compilar.
En **Git Bash**:

```sh
source ~/emsdk/emsdk_env.sh
emcc --version                      # debe mostrar la versión
cd ~/Documents/GitHub/play-ex/doom
./build-web.sh
```

Se regeneran `doom/doom.js`, `doom/doom.wasm` y `doom/doom.data`. Para comprobar
que el motor nuevo tiene las funciones:

```sh
grep -c doomy_estado doom.js        # debe ser mayor que 0
```

Luego sube esos tres archivos al repositorio.

## 3. Publicar en GitHub Pages

1. Sube todos los archivos al repositorio (incluida la carpeta `doom/`).
2. En GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.
3. Abre `https://<usuario>.github.io/<repositorio>/` en el PC.

Los sensores y el micrófono del celular solo funcionan sobre **https**: para jugar
con ellos hay que usar GitHub Pages (o cualquier hosting con https).

### Probar en local (solo pantalla táctil)

```sh
python -m http.server 8000
```

Abre `http://localhost:8000/` en el PC y el enlace `control.html?sala=…` en otra
pestaña: los controles táctiles funcionan con el mouse (un solo "dedo").

## 4. Cómo se juega

1. **PC**: abre la página. Aparece la sala (código de 5 letras) y un QR.
2. **Celulares**: escanean el QR, escriben su nombre y entran al lobby.
3. **Lobby (en el celular)**: cada jugador toma controles y elige con qué sensor.
   - Cada control tiene un solo dueño.
   - Un celular puede tener varios controles, pero **no dos con el mismo gesto**
     (ver la tabla del punto 6). Los sensores que el celular no tiene no aparecen disponibles.
4. Cada jugador presiona **"Estoy listo"**: se piden permisos (sensores, micrófono) y se
   calibra la posición neutral (sostén el celular como lo vas a usar).
5. **PC**: cuando todos los controles tienen dueño y todos están listos, se habilitan
   **"Iniciar partida nueva"** y, si hay un autoguardado, **"Continuar partida guardada"**.
6. Partida nueva: en el PC presiona **Esc** y elige *New Game*.

### Teclado del PC

| Tecla | Acción |
| --- | --- |
| Esc | Abre / cierra el menú de DOOM |
| Flechas o W A S D | Recorren el menú |
| Enter | Acepta |
| Y / N | Responden Sí / No |
| Letras y Borrar | Escriben el nombre al guardar una partida |
| **Espacio** | Abre / cierra la **pausa general** |

Con el menú cerrado, el teclado del PC no mueve al personaje: eso es solo de los celulares.
Mientras el menú está abierto, los celulares no envían nada.

### Pausa general

Se abre con **Espacio** en el PC, o sola cuando un jugador se desconecta.

- DOOM se detiene.
- En los celulares vuelve la lista de controles: se pueden tomar los que quedaron
  libres, soltar o cambiar los propios.
- Cada celular ve **Ajustes de sus sensores**: recalibrar, invertir dirección y
  umbrales (con la lectura actual del sensor al lado, para elegir el valor).
- Para continuar (Espacio o botón **Continuar**), todos los controles deben tener
  dueño y todos deben estar listos.
- **Volver al lobby** guarda la partida automáticamente (ranura 6 del menú de DOOM,
  "AUTOGUARDADO") y vuelve al lobby con los mismos jugadores y controles.

El celular recuerda tu nombre, los controles y sensores que elegiste, los ejes
invertidos y tus umbrales.

## 5. Controles

| Control | Teclas de DOOM | Sensores |
| --- | --- | --- |
| Moverse (avanzar / retroceder) | ↑ ↓ | Giroscopio, acelerómetro, táctil, micrófono |
| Moverse lateralmente (girar) | ← → | Giroscopio, acelerómetro, táctil, micrófono |
| Disparar | Ctrl | Giroscopio, acelerómetro, táctil, micrófono |
| Abrir puertas / usar | Espacio | Giroscopio, acelerómetro, táctil, micrófono |
| Correr | Shift | Giroscopio, acelerómetro, táctil, micrófono |
| Cambiar arma | 1–7 | Táctil |
| Mapa | Tab | Táctil, micrófono |

"Moverse lateralmente" usa los gestos de desplazamiento lateral, pero en el juego **gira**.

### Gestos y valores por defecto

Todos los umbrales se cambian en la pausa general (por celular).

| Control | Sensor | Gesto | Valor por defecto |
| --- | --- | --- | --- |
| Moverse | Giroscopio | Inclinar adelante / atrás | ±15° |
| Moverse | Acelerómetro | Inclinar adelante / atrás (gravedad) | ±15° |
| Moverse | Táctil | Joystick virtual (donde se apoye el dedo), eje vertical | zona muerta 30 px |
| Moverse | Micrófono | Nota dentro del rango avanza, fuera retrocede, silencio detiene | 250–800 Hz, silencio < −50 dB |
| Lateral (girar) | Giroscopio | Inclinar a los lados | ±15° |
| Lateral (girar) | Acelerómetro | Inclinar a los lados (gravedad) | ±15° |
| Lateral (girar) | Táctil | Joystick virtual, eje horizontal | zona muerta 30 px |
| Lateral (girar) | Micrófono | Fuerte = derecha, suave = izquierda, silencio = nada | límite −30 dB |
| Disparar | Giroscopio | Giro rápido hacia un lado + aceleración en el último segundo | 250 °/s y 4 m/s² |
| Disparar | Acelerómetro | Movimiento rápido | 12 m/s² |
| Disparar | Táctil | Segundo dedo apoyado (también con el joystick) | — |
| Disparar | Micrófono | Grito: dispara mientras dure | −12 dB |
| Usar | Giroscopio | Giro rápido adelante / atrás + aceleración en el último segundo | 250 °/s y 4 m/s² |
| Usar | Acelerómetro | Mover rápido adelante / atrás | 12 m/s² |
| Usar | Táctil | Doble toque en el mismo lugar | < 0,9 s y < 50 px |
| Usar | Micrófono | Sonido suave (sobre el ruido, bajo el grito) | entre −50 y −12 dB |
| Correr | Giroscopio | Inclinar mucho hacia adelante | ≥ 35° |
| Correr | Acelerómetro | Inclinar mucho hacia adelante (gravedad) | ≥ 35° |
| Correr | Táctil | Dos dedos deslizando juntos hacia arriba | — |
| Correr | Micrófono | Sonido fuerte: corre mientras dure | −20 dB |
| Cambiar arma | Táctil | Carrusel ◀ [arma] ▶ | — |
| Mapa | Táctil | Botón Mapa (esquina inferior izquierda) | — |
| Mapa | Micrófono | Sonido grave | < 150 Hz |

Los dB del micrófono son relativos al máximo del micrófono (0 dB = saturado), no
decibeles reales de la sala: cambian de un celular a otro.

### Gestos que no pueden estar en el mismo celular

| Gesto | Controles / sensores que lo usan |
| --- | --- |
| Inclinar adelante / atrás | Moverse, Correr (giroscopio y acelerómetro), Usar (giroscopio) |
| Inclinar a los lados | Lateral (giroscopio y acelerómetro), Disparar (giroscopio) |
| Movimiento brusco | Disparar y Usar (giroscopio y acelerómetro) |
| Volumen del micrófono | Lateral, Disparar, Usar, Correr (micrófono) |
| Frecuencia del micrófono | Moverse, Mapa (micrófono) |

Los gestos táctiles están pensados para usarse a la vez y no se bloquean.

## 6. Archivos

| Archivo | Qué hace |
| --- | --- |
| `index.html` / `main.js` | Pantalla del PC: sala, QR, lobby, juego, pausa general y teclado del menú |
| `control.html` / `control.js` | Control del celular: lobby, sensores, gestos táctiles y ajustes |
| `comun.js` | Controles, sensores, gestos, valores por defecto y temas MQTT |
| `config.js` | Datos de conexión al broker |
| `style.css` | Estilos básicos (provisorios) |
| `doom/` | Motor de DOOM compilado (`doom.js`, `doom.wasm`, `doom.data`) y su código fuente (`build-web.sh`, `linuxdoom-1.10/`, `doom.WAD`) |
| `doom/linuxdoom-1.10/doomy_web.c` | Funciones agregadas al motor: estado del menú, pausa y autoguardado |

## 7. Temas MQTT

Todos bajo `tacto/doomy/<SALA>/`:

| Tema | Dirección | Contenido |
| --- | --- | --- |
| `estado` | PC → celulares (retenido) | Fase (`lobby` / `juego` / `pausa` / `cerrada`), motivo de la pausa, jugadores y asignación |
| `host` | Celulares → PC | `unir`, `elegir`, `soltar`, `listo`, `ping`, `salir` (LWT) |
| `input` | Celulares → PC | `{ id, c: control, k: tecla, d: 1/0 }` |
| `jugador/<id>` | PC → un celular | `rechazo`, `bienvenida`, `reunir` |

El PC valida cada mensaje de `input`: solo acepta teclas del control que ese
jugador tiene asignado, y solo durante la partida con el menú de DOOM cerrado.
