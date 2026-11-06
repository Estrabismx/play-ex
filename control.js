// Control del celular: se une a una sala, elige controles y sensores en el
// lobby, y durante la partida traduce sensores / toques en teclas que
// publica por MQTT para que el PC las pase al motor de DOOM.

(function () {
  'use strict';

  var D = window.DOOMY;
  var $ = function (id) { return document.getElementById(id); };

  // Umbrales provisorios (se ajustarán junto con la tabla de mapeo del README).
  var UMBRAL_INCLINACION = 15;   // grados desde la posición calibrada
  var UMBRAL_LATERAL = 5;        // m/s² de aceleración lateral para un "golpe"
  var UMBRAL_SACUDIDA = 14;      // m/s² de aceleración (sin gravedad)
  var UMBRAL_GIRO_BRUSCO = 300;  // °/s de velocidad de rotación
  var PAUSA_GESTO = 450;         // ms mínimos entre dos sacudidas / giros
  var DURACION_IMPULSO = 250;    // ms que dura un desplazamiento lateral por golpe
  var INTERVALO_SENSORES = 40;   // ms entre lecturas de sensores
  var INTERVALO_PING = 2000;     // ms entre avisos de "sigo conectado" al PC

  // ------------------------------------------------- datos recordados

  function leerJSON(clave) {
    try { return JSON.parse(D.leer(clave)) || {}; } catch (e) { return {}; }
  }

  var miId = D.leer('doomy.id');
  if (!miId) {
    miId = 'j' + D.idAleatorio(8);
    D.guardar('doomy.id', miId);
  }
  var preferencias = leerJSON('doomy.preferencias');   // controlId -> sensor (última elección)
  var invertidos = leerJSON('doomy.invertidos');       // controlId -> true si el eje va al revés

  var sala = D.limpiarSala(new URLSearchParams(location.search).get('sala'));
  var nombre = D.leer('doomy.nombre') || '';

  var cliente = null;
  var T = null;
  var estado = null;          // último estado publicado por el PC
  var ultimoUnir = 0;
  var restaurado = false;     // ya se pidieron los controles de la última vez
  var firmaJuego = '';        // controles + sensores dibujados en la vista de juego
  var misControles = [];      // estado de cada control propio durante la partida

  // ----------------------------------------------------------- vistas

  function mostrarVista(id) {
    ['vista-unirse', 'vista-lobby', 'vista-juego'].forEach(function (v) {
      $(v).hidden = v !== id;
    });
  }

  function mensaje(texto, esError) {
    $('mensaje').textContent = texto || '';
    $('mensaje').classList.toggle('error', !!esError);
  }

  function elemento(etiqueta, texto, clase) {
    var e = document.createElement(etiqueta);
    if (texto !== undefined && texto !== null) e.textContent = texto;
    if (clase) e.className = clase;
    return e;
  }

  // ------------------------------------------------------------ MQTT

  function publicar(tema, datos, qos) {
    if (!cliente || !cliente.connected) return;
    cliente.publish(tema, JSON.stringify(datos), { qos: qos === undefined ? 1 : qos });
  }

  function pedir(tipo, extra) {
    var datos = { tipo: tipo, id: miId };
    Object.keys(extra || {}).forEach(function (k) { datos[k] = extra[k]; });
    publicar(T.host, datos);
  }

  function enviarUnir() {
    ultimoUnir = Date.now();
    pedir('unir', { nombre: nombre });
  }

  function conectar() {
    T = D.temas(sala);
    mensaje('Conectando…');
    try {
      cliente = D.conectar('doomy-cel-' + miId + '-' + D.idAleatorio(4), {
        // Si el celular se desconecta de golpe, el broker avisa al PC.
        topic: T.host,
        payload: JSON.stringify({ tipo: 'salir', id: miId }),
        qos: 1,
        retain: false
      });
    } catch (err) {
      mensaje('Error: ' + err.message, true);
      mostrarVista('vista-unirse');
      return;
    }

    cliente.on('connect', function () {
      mensaje('Conectado. Esperando al PC de la sala ' + sala + '…');
      cliente.subscribe([T.estado, T.jugador(miId)], { qos: 1 }, function (err, concedidas) {
        if (err || (concedidas || []).some(function (c) { return c.qos === 128; })) {
          mensaje('El broker no permitió suscribirse a los temas de la sala.', true);
          return;
        }
        enviarUnir();
      });
    });
    cliente.on('reconnect', function () { mensaje('Reconectando…', true); });
    cliente.on('offline', function () { mensaje('Sin conexión', true); olvidarTeclas(); });
    cliente.on('error', function (err) { mensaje('Error: ' + D.explicarError(err), true); });

    cliente.on('message', function (tema, contenido) {
      var datos;
      try { datos = JSON.parse(contenido.toString()); } catch (e) { return; }
      if (!datos) return;
      if (tema === T.estado) recibirEstado(datos);
      else if (tema === T.jugador(miId)) recibirDirecto(datos);
    });
  }

  setInterval(function () { if (cliente && cliente.connected) pedir('ping'); }, INTERVALO_PING);

  function recibirDirecto(m) {
    if (m.tipo === 'rechazo') {
      mensaje(m.motivo, true);
      if (!estado || !estado.jugadores || !estado.jugadores[miId]) {
        // No entró a la sala (por ejemplo, sala llena).
        cliente.end(true);
        mostrarVista('vista-unirse');
      }
    } else if (m.tipo === 'reunir') {
      enviarUnir();
    }
  }

  function recibirEstado(e) {
    if (e.fase === 'cerrada') {
      estado = null;
      soltarTodo();
      mostrarVista(null);
      mensaje('El PC cerró la sala ' + sala + '. Si la vuelve a abrir, te unirás automáticamente.', true);
      return;
    }
    estado = e;

    if (!e.jugadores || !e.jugadores[miId]) {
      if (Date.now() - ultimoUnir > 3000) enviarUnir();
      return;
    }

    if (e.fase === 'lobby') {
      soltarTodo();
      firmaJuego = '';
      mensaje('');
      mostrarVista('vista-lobby');
      restaurarElecciones();
      dibujarLobby();
    } else if (e.fase === 'juego') {
      mensaje('');
      mostrarVista('vista-juego');
      dibujarJuego();
    }
  }

  // ------------------------------------------------------------ lobby

  function duenoDe(controlId) {
    var a = estado && estado.asignacion && estado.asignacion[controlId];
    return a || null;
  }

  // La primera vez que entra al lobby, pide los mismos controles de la
  // última partida (si están libres).
  function restaurarElecciones() {
    if (restaurado) return;
    restaurado = true;
    var tieneAlguno = D.CONTROLES.some(function (c) {
      var a = duenoDe(c.id);
      return a && a.jugador === miId;
    });
    if (tieneAlguno) return;
    Object.keys(preferencias).forEach(function (controlId) {
      var c = D.control(controlId);
      if (c && !duenoDe(controlId) && c.sensores.indexOf(preferencias[controlId]) >= 0) {
        pedir('elegir', { control: controlId, sensor: preferencias[controlId] });
      }
    });
  }

  function dibujarLobby() {
    $('lobby-sala').textContent = sala;
    var lista = $('lista-controles');
    lista.textContent = '';

    D.CONTROLES.forEach(function (c) {
      var a = duenoDe(c.id);
      var mio = a && a.jugador === miId;
      var item = elemento('li');
      item.appendChild(elemento('strong', c.nombre));

      if (a && !mio) {
        var otro = estado.jugadores[a.jugador];
        item.appendChild(elemento('p', 'Lo tiene ' + (otro ? otro.nombre : 'otro jugador') +
          ' (' + D.SENSORES[a.sensor] + ')'));
        lista.appendChild(item);
        return;
      }

      item.appendChild(elemento('p', mio ? 'Tuyo · ' + D.SENSORES[a.sensor] : 'Libre'));

      var selector = elemento('select');
      c.sensores.forEach(function (s) {
        var opcion = elemento('option', D.SENSORES[s]);
        opcion.value = s;
        selector.appendChild(opcion);
      });
      selector.value = mio ? a.sensor : (preferencias[c.id] || c.sensores[0]);
      var ayuda = elemento('p', D.descripcion(c.id, selector.value), 'aviso');
      selector.addEventListener('change', function () {
        ayuda.textContent = D.descripcion(c.id, selector.value);
      });

      var tomar = elemento('button', mio ? 'Cambiar sensor' : 'Tomar');
      tomar.type = 'button';
      tomar.addEventListener('click', function () {
        preferencias[c.id] = selector.value;
        D.guardar('doomy.preferencias', JSON.stringify(preferencias));
        pedir('elegir', { control: c.id, sensor: selector.value });
      });

      item.appendChild(selector);
      item.appendChild(tomar);
      if (mio) {
        var soltar = elemento('button', 'Soltar');
        soltar.type = 'button';
        soltar.addEventListener('click', function () {
          delete preferencias[c.id];
          D.guardar('doomy.preferencias', JSON.stringify(preferencias));
          pedir('soltar', { control: c.id });
        });
        item.appendChild(soltar);
      }
      item.appendChild(ayuda);
      lista.appendChild(item);
    });

    var listo = estado.jugadores[miId].listo;
    $('listo').textContent = listo ? 'Ya no estoy listo' : 'Estoy listo';
    $('estado-listo').textContent = listo ? '✔ Listo, esperando a los demás' : '';
  }

  function sensoresQueUso() {
    var usados = {};
    D.CONTROLES.forEach(function (c) {
      var a = duenoDe(c.id);
      if (a && a.jugador === miId && a.sensor !== 'tactil') usados[a.sensor] = true;
    });
    return usados;
  }

  function alPresionarListo() {
    if (!estado || !estado.jugadores[miId]) return;
    if (estado.jugadores[miId].listo) {
      pedir('listo', { valor: false });
      return;
    }
    var usados = sensoresQueUso();
    if (!usados.giroscopio && !usados.acelerometro) {
      pedirPantallaEncendida();
      pedir('listo', { valor: true });
      return;
    }
    // iPhone exige pedir permiso a los sensores desde un toque del usuario.
    pedirPermisos().then(function () {
      pedirPantallaEncendida();
      // Esperar un momento a que lleguen las primeras lecturas.
      setTimeout(function () {
        if (usados.giroscopio && !lectura.orientacion) {
          mensaje('Este celular no entrega datos del giroscopio. Elige otro sensor.', true);
          return;
        }
        if (usados.acelerometro && !lectura.movimiento) {
          mensaje('Este celular no entrega datos del acelerómetro. Elige otro sensor.', true);
          return;
        }
        calibrar();
        mensaje('');
        pedir('listo', { valor: true });
      }, 600);
    }).catch(function () {
      mensaje('No se dio permiso para usar los sensores. Elige pantalla táctil o vuelve a intentarlo.', true);
    });
  }

  // ---------------------------------------------------------- sensores

  var lectura = {
    orientacion: false, movimiento: false,
    beta: null, gamma: null, alpha: null,      // deviceorientation (grados)
    gx: null, gy: null, gz: null,              // aceleración con gravedad (m/s²)
    picoSacudida: 0, picoGiro: 0,              // máximos desde la última lectura
    picoLatMax: 0, picoLatMin: 0
  };
  var calibracion = { beta: 0, gamma: 0, alpha: 0, inclinacion: 0, ladeo: 0 };

  function pedirPermisos() {
    var pedidos = [];
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
      pedidos.push(DeviceOrientationEvent.requestPermission());
    }
    if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
      pedidos.push(DeviceMotionEvent.requestPermission());
    }
    return Promise.all(pedidos).then(function (respuestas) {
      if (respuestas.some(function (r) { return r !== 'granted'; })) throw new Error('denegado');
    });
  }

  window.addEventListener('deviceorientation', function (e) {
    if (e.beta === null || e.beta === undefined) return;
    lectura.orientacion = true;
    lectura.beta = e.beta;
    lectura.gamma = e.gamma;
    lectura.alpha = e.alpha;
  });

  window.addEventListener('devicemotion', function (e) {
    var g = e.accelerationIncludingGravity;
    var a = e.acceleration;
    var r = e.rotationRate;
    if (g && g.x !== null) {
      lectura.movimiento = true;
      lectura.gx = g.x; lectura.gy = g.y; lectura.gz = g.z;
    }
    var sacudida = 0;
    if (a && a.x !== null) {
      sacudida = Math.hypot(a.x, a.y, a.z);
      lectura.picoLatMax = Math.max(lectura.picoLatMax, a.x);
      lectura.picoLatMin = Math.min(lectura.picoLatMin, a.x);
    } else if (g && g.x !== null) {
      sacudida = Math.abs(Math.hypot(g.x, g.y, g.z) - 9.81);
    }
    lectura.picoSacudida = Math.max(lectura.picoSacudida, sacudida);
    if (r && r.alpha !== null) {
      lectura.picoGiro = Math.max(lectura.picoGiro, Math.hypot(r.alpha, r.beta, r.gamma));
    }
  });

  var GRADOS = 180 / Math.PI;

  // Inclinación adelante/atrás y ladeo izquierda/derecha calculados con la gravedad.
  function inclinacionGravedad() { return Math.atan2(lectura.gy, lectura.gz) * GRADOS; }
  function ladeoGravedad() { return Math.atan2(lectura.gx, Math.hypot(lectura.gy, lectura.gz)) * GRADOS; }

  function diferenciaAngulo(a, b) {
    var d = (a - b) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  function calibrar() {
    if (lectura.orientacion) {
      calibracion.beta = lectura.beta;
      calibracion.gamma = lectura.gamma;
      calibracion.alpha = lectura.alpha || 0;
    }
    if (lectura.movimiento) {
      calibracion.inclinacion = inclinacionGravedad();
      calibracion.ladeo = ladeoGravedad();
    }
  }

  // Valor de un eje: positivo = etiquetas[0] (avanzar / izquierda),
  // negativo = etiquetas[1]. null si no hay lectura.
  function valorEje(controlId, sensor) {
    if (sensor === 'giroscopio') {
      if (!lectura.orientacion) return null;
      if (controlId === 'mover') return diferenciaAngulo(calibracion.beta, lectura.beta);
      if (controlId === 'girar') return diferenciaAngulo(calibracion.gamma, lectura.gamma);
      if (controlId === 'lateral') return diferenciaAngulo(lectura.alpha || 0, calibracion.alpha);
    } else if (sensor === 'acelerometro') {
      if (!lectura.movimiento) return null;
      if (controlId === 'mover') return diferenciaAngulo(calibracion.inclinacion, inclinacionGravedad());
      if (controlId === 'girar') return diferenciaAngulo(ladeoGravedad(), calibracion.ladeo);
    }
    return null;
  }

  // ---------------------------------------------- teclas de cada control

  function enviar(st, code, abajo) {
    if (!!st.abajo[code] === abajo) return;
    st.abajo[code] = abajo;
    publicar(T.input, { id: miId, c: st.control.id, k: code, d: abajo ? 1 : 0 }, 0);
    actualizarIndicador(st);
  }

  function soltarControl(st) {
    Object.keys(st.abajo).forEach(function (code) { enviar(st, code, false); });
    st.activo = false;
    st.finPulso = 0;
  }

  function soltarTodo() {
    misControles.forEach(soltarControl);
  }

  // Sin conexión, el PC ya soltó las teclas: solo se olvida el estado local
  // para que se vuelvan a enviar al reconectar.
  function olvidarTeclas() {
    misControles.forEach(function (st) { st.abajo = {}; st.activo = false; st.finPulso = 0; });
  }

  // dir: 1 = teclas[0], -1 = teclas[1], 0 = ninguna.
  function ponerEje(st, dir) {
    var deseada = dir > 0 ? st.control.teclas[0] : dir < 0 ? st.control.teclas[1] : null;
    st.control.teclas.forEach(function (code) { enviar(st, code, code === deseada); });
  }

  // Una sacudida o giro brusco sobre un control de botón o de arma.
  function gesto(st, ahora) {
    var c = st.control;
    if (c.tipo === 'arma') {
      soltarControl(st);
      st.arma = (st.arma % c.teclas.length) + 1;
      enviar(st, c.teclas[st.arma - 1], true);
      st.finPulso = ahora + 120;
    } else if (c.accion === 'alternar') {
      st.activo = !st.activo;
      enviar(st, c.teclas[0], st.activo);
    } else {
      enviar(st, c.teclas[0], true);
      st.finPulso = ahora + c.duracion;
    }
  }

  function pasoSensores() {
    var ahora = Date.now();
    var huboSacudida = lectura.picoSacudida > UMBRAL_SACUDIDA;
    var huboGiro = lectura.picoGiro > UMBRAL_GIRO_BRUSCO;
    var lateral = Math.abs(lectura.picoLatMax) > Math.abs(lectura.picoLatMin) ? lectura.picoLatMax : lectura.picoLatMin;
    lectura.picoSacudida = lectura.picoGiro = lectura.picoLatMax = lectura.picoLatMin = 0;

    misControles.forEach(function (st) {
      if (st.sensor === 'tactil') return;
      var c = st.control;
      var signo = invertidos[c.id] ? -1 : 1;

      if (c.tipo === 'eje') {
        var dir = 0;
        if (c.id === 'lateral' && st.sensor === 'acelerometro') {
          // Mover el celular hacia la derecha da aceleración x positiva.
          var golpe = -lateral * signo;
          st.valor = golpe;
          if (Math.abs(golpe) > UMBRAL_LATERAL && ahora > st.bloqueo) {
            st.impulso = golpe > 0 ? 1 : -1;
            st.finImpulso = ahora + DURACION_IMPULSO;
            st.bloqueo = ahora + 2 * DURACION_IMPULSO;   // ignora el frenado del movimiento
          }
          dir = ahora < st.finImpulso ? st.impulso : 0;
        } else {
          var v = valorEje(c.id, st.sensor);
          if (v !== null) {
            v *= signo;
            st.valor = v;
            dir = v > UMBRAL_INCLINACION ? 1 : v < -UMBRAL_INCLINACION ? -1 : 0;
          }
        }
        ponerEje(st, dir);
      } else {
        if (st.finPulso && ahora > st.finPulso) {
          st.finPulso = 0;
          c.teclas.forEach(function (code) { enviar(st, code, false); });
        }
        var hubo = st.sensor === 'acelerometro' ? huboSacudida : huboGiro;
        if (hubo && ahora > st.bloqueo) {
          st.bloqueo = ahora + PAUSA_GESTO;
          gesto(st, ahora);
        }
      }
      actualizarIndicador(st);
    });
  }

  setInterval(pasoSensores, INTERVALO_SENSORES);

  // --------------------------------------------------- vista de juego

  function controlesPropios() {
    return D.CONTROLES.filter(function (c) {
      var a = duenoDe(c.id);
      return a && a.jugador === miId;
    }).map(function (c) {
      return { control: c, sensor: duenoDe(c.id).sensor };
    });
  }

  function dibujarJuego() {
    var propios = controlesPropios();
    var firma = propios.map(function (p) { return p.control.id + ':' + p.sensor; }).join(',');
    if (firma === firmaJuego) return;     // no redibujar: cortaría los toques en curso
    firmaJuego = firma;

    soltarTodo();
    misControles = [];
    var contenedor = $('mis-controles');
    contenedor.textContent = '';
    if (!propios.length) {
      contenedor.appendChild(elemento('p', 'No tienes controles asignados en este momento.'));
      return;
    }

    propios.forEach(function (p) {
      var st = {
        control: p.control, sensor: p.sensor, abajo: {},
        valor: 0, bloqueo: 0, finPulso: 0, impulso: 0, finImpulso: 0,
        activo: false, arma: 1
      };
      var tarjeta = elemento('div', null, 'tarjeta');
      tarjeta.appendChild(elemento('h2', p.control.nombre + ' · ' + D.SENSORES[p.sensor]));
      tarjeta.appendChild(elemento('p', D.descripcion(p.control.id, p.sensor), 'aviso'));
      st.indicador = elemento('p', '', 'indicador');
      tarjeta.appendChild(st.indicador);

      if (p.sensor === 'tactil') {
        tarjeta.appendChild(botonesTactiles(st));
      } else if (p.control.tipo === 'eje') {
        var invertir = elemento('button', 'Invertir dirección');
        invertir.type = 'button';
        invertir.addEventListener('click', function () {
          invertidos[p.control.id] = !invertidos[p.control.id];
          D.guardar('doomy.invertidos', JSON.stringify(invertidos));
        });
        tarjeta.appendChild(invertir);
      }

      contenedor.appendChild(tarjeta);
      misControles.push(st);
      actualizarIndicador(st);
    });
  }

  // Botón que mantiene presionada una tecla mientras se toca.
  function botonMantener(st, texto, code) {
    var b = elemento('button', texto, 'tactil');
    b.type = 'button';
    b.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (b.setPointerCapture) b.setPointerCapture(e.pointerId);
      enviar(st, code, true);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (tipo) {
      b.addEventListener(tipo, function () { enviar(st, code, false); });
    });
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    return b;
  }

  function botonesTactiles(st) {
    var c = st.control;
    var grupo = elemento('div', null, 'botones');
    if (c.tipo === 'eje') {
      grupo.appendChild(botonMantener(st, c.etiquetas[0], c.teclas[0]));
      grupo.appendChild(botonMantener(st, c.etiquetas[1], c.teclas[1]));
    } else if (c.tipo === 'arma') {
      c.teclas.forEach(function (code, i) { grupo.appendChild(botonMantener(st, String(i + 1), code)); });
    } else if (c.tipo === 'menu') {
      [['Menú (Esc)', 'Escape'], ['▲', 'ArrowUp'], ['▼', 'ArrowDown'], ['◀', 'ArrowLeft'],
       ['▶', 'ArrowRight'], ['Aceptar', 'Enter'], ['Sí', 'KeyY'], ['No', 'KeyN'],
       ['Borrar', 'Backspace']].forEach(function (b) {
        grupo.appendChild(botonMantener(st, b[0], b[1]));
      });
      // Para guardar partida DOOM pide un nombre: este botón escribe "DOOMY".
      var escribir = elemento('button', 'Escribir "DOOMY"', 'tactil');
      escribir.type = 'button';
      escribir.addEventListener('click', function () {
        ['KeyD', 'KeyO', 'KeyO', 'KeyM', 'KeyY'].forEach(function (code, i) {
          setTimeout(function () { enviar(st, code, true); }, i * 160);
          setTimeout(function () { enviar(st, code, false); }, i * 160 + 80);
        });
      });
      grupo.appendChild(escribir);
    } else {
      grupo.appendChild(botonMantener(st, c.nombre, c.teclas[0]));
    }
    return grupo;
  }

  function actualizarIndicador(st) {
    if (!st.indicador) return;
    var c = st.control;
    var abajo = c.teclas.filter(function (code) { return st.abajo[code]; });
    var texto;
    if (c.tipo === 'eje') {
      var activa = abajo.length ? c.etiquetas[c.teclas.indexOf(abajo[0])] : '—';
      texto = activa + (st.sensor === 'tactil' ? '' : ' · ' + Math.round(st.valor) +
        (c.id === 'lateral' && st.sensor === 'acelerometro' ? ' m/s²' : '°'));
    } else if (c.tipo === 'arma') {
      texto = st.sensor === 'tactil'
        ? (abajo.length ? 'Arma ' + (c.teclas.indexOf(abajo[0]) + 1) : '—')
        : 'Arma elegida: ' + st.arma;
    } else if (c.tipo === 'menu') {
      texto = abajo.length ? 'Presionando' : '—';
    } else if (c.accion === 'alternar' && st.sensor !== 'tactil') {
      texto = st.activo ? 'Corriendo' : 'Caminando';
    } else {
      texto = abajo.length ? '● Activo' : '○';
    }
    st.indicador.textContent = texto;
    st.indicador.classList.toggle('activo', abajo.length > 0 || !!st.activo);
  }

  // ------------------------------------------------ pantalla encendida

  var bloqueoPantalla = null;
  function pedirPantallaEncendida() {
    if (!navigator.wakeLock || bloqueoPantalla) return;
    navigator.wakeLock.request('screen').then(function (b) {
      bloqueoPantalla = b;
      b.addEventListener('release', function () { bloqueoPantalla = null; });
    }).catch(function () { /* no soportado: no es grave */ });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      soltarTodo();      // con la pantalla apagada no se puede seguir "presionando"
    } else if (estado && estado.fase === 'juego') {
      pedirPantallaEncendida();
    }
  });

  // ------------------------------------------------------------ inicio

  $('sala').value = sala;
  $('nombre').value = nombre;
  $('form-unirse').addEventListener('submit', function (e) {
    e.preventDefault();
    sala = D.limpiarSala($('sala').value);
    nombre = $('nombre').value.trim().slice(0, 20);
    if (!sala || !nombre) return;
    D.guardar('doomy.nombre', nombre);
    history.replaceState(null, '', '?sala=' + sala);
    if (cliente) cliente.end(true);
    conectar();
  });
  $('listo').addEventListener('click', alPresionarListo);
  $('recalibrar').addEventListener('click', function () {
    calibrar();
    mensaje('Sensores recalibrados.');
  });

  // Con sala en el QR y nombre recordado, se une directo.
  if (sala && nombre) conectar();
  else mostrarVista('vista-unirse');
})();
