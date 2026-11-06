// Control del celular: se une a una sala, elige controles y sensores en el
// lobby (o en la pausa general), y durante la partida traduce sensores y
// toques en teclas que publica por MQTT para que el PC las pase a DOOM.

(function () {
  'use strict';

  var D = window.DOOMY;
  var $ = function (id) { return document.getElementById(id); };

  var PAUSA_GESTO = 450;          // ms mínimos entre dos gestos rápidos (giro, movimiento)
  var PAUSA_MIC_USAR = 600;       // ms entre dos "usar" con el micrófono
  var PAUSA_MIC_MAPA = 1000;      // ms entre dos aperturas del mapa con el micrófono
  var VENTANA_CONFIRMACION = 1000;  // ms: la aceleración debe acompañar al giro rápido
  var DOBLE_TOQUE = 900;          // ms máximos entre los dos toques de "usar"
  var AREA_DOBLE_TOQUE = 50;      // px: ambos toques deben caer en un área similar
  var TOQUE_MAX_MS = 300;         // un toque dura menos que esto…
  var TOQUE_MAX_PX = 15;          // …y casi no se mueve
  var DEDOS_JUNTOS_PX = 25;       // desplazamiento mínimo para "2 dedos deslizando"
  var ESPERA_DOS_DEDOS = 150;     // ms para distinguir correr de disparar
  var INTERVALO_SENSORES = 40;    // ms entre lecturas de sensores
  var INTERVALO_PING = 2000;      // ms entre avisos de "sigo conectado" al PC

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
  var ajustesGuardados = leerJSON('doomy.ajustes');    // ajusteId -> valor

  function ajuste(id) {
    if (typeof ajustesGuardados[id] === 'number') return ajustesGuardados[id];
    for (var i = 0; i < D.AJUSTES.length; i++) if (D.AJUSTES[i].id === id) return D.AJUSTES[i].valor;
    return 0;
  }

  var sala = D.limpiarSala(new URLSearchParams(location.search).get('sala'));
  var nombre = D.leer('doomy.nombre') || '';

  var cliente = null;
  var T = null;
  var estado = null;          // último estado publicado por el PC
  var ultimoUnir = 0;
  var restaurado = false;     // ya se pidieron los controles de la última vez
  var firmaJuego = '';        // controles + sensores dibujados en la vista de juego
  var firmaAjustes = null;    // controles + sensores dibujados en los ajustes
  var misControles = [];      // estado de cada control propio durante la partida

  // ----------------------------------------------------------- vistas

  function mostrarVista(id) {
    ['vista-unirse', 'vista-lobby', 'vista-juego'].forEach(function (v) {
      $(v).hidden = v !== id;
    });
    // Durante la partida la página ocupa toda la pantalla, sin scroll.
    document.body.classList.toggle('fija', id === 'vista-juego' || id === 'vista-lobby');
    window.scrollTo(0, 0);
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

    if (e.fase === 'lobby' || e.fase === 'pausa') {
      soltarTodo();
      firmaJuego = '';
      mensaje('');
      mostrarVista('vista-lobby');
      if (e.fase === 'lobby') restaurarElecciones();
      dibujarLobby();
    } else if (e.fase === 'juego') {
      mensaje(controlesPropios().length ? '' : 'No tienes controles: podrás elegir en la próxima pausa general.');
      mostrarVista('vista-juego');
      dibujarJuego();
    }
  }

  // ------------------------------------------------------------ lobby

  function duenoDe(controlId) {
    var a = estado && estado.asignacion && estado.asignacion[controlId];
    return a || null;
  }

  // [{ control, sensor }] de los controles que tiene este celular.
  function asignacionesPropias() {
    return D.CONTROLES.filter(function (c) {
      var a = duenoDe(c.id);
      return a && a.jugador === miId;
    }).map(function (c) {
      return { control: c.id, sensor: duenoDe(c.id).sensor };
    });
  }

  // La primera vez que entra al lobby, pide los mismos controles de la
  // última partida (si están libres y no chocan entre sí).
  function restaurarElecciones() {
    if (restaurado) return;
    restaurado = true;
    if (asignacionesPropias().length) return;
    var pedidos = [];
    Object.keys(preferencias).forEach(function (controlId) {
      var c = D.control(controlId);
      var sensor = preferencias[controlId];
      if (!c || duenoDe(controlId) || c.sensores.indexOf(sensor) < 0 || !sensorDisponible(sensor)) return;
      if (D.conflicto(pedidos, controlId, sensor)) return;
      pedidos.push({ control: controlId, sensor: sensor });
      pedir('elegir', { control: controlId, sensor: sensor });
    });
  }

  // Lobby y pausa general, a pantalla completa: pestaña "Controles" (una
  // fila compacta por control) y, en la pausa, pestaña "Ajustes".
  var pestana = 'controles';

  function mostrarPestana(nombre) {
    pestana = nombre;
    $('panel-controles').hidden = nombre !== 'controles';
    $('panel-ajustes').hidden = nombre !== 'ajustes';
    Array.prototype.forEach.call(document.querySelectorAll('#pestanas button'), function (b) {
      b.classList.toggle('activa', b.getAttribute('data-pestana') === nombre);
    });
  }

  // Una sola línea al pie con el gesto del control que se está mirando.
  function mostrarAyuda(controlId, sensor) {
    $('ayuda-control').textContent = D.control(controlId).corto + ' · ' + D.SENSORES[sensor] + ': ' +
      D.descripcion(controlId, sensor);
  }

  function dibujarLobby() {
    var enPausa = estado.fase === 'pausa';
    $('titulo-lobby').textContent = enPausa ? 'Pausa general' : 'Lobby';
    $('motivo-pausa').textContent = enPausa ? estado.motivoPausa || '' : '';
    $('lobby-sala').textContent = sala;
    $('activar-sensores').hidden = !necesitaPermisoMovimiento || permisoMovimiento;
    $('pestanas').hidden = !enPausa;
    if (!enPausa && pestana !== 'controles') mostrarPestana('controles');

    var propias = asignacionesPropias();
    var lista = $('lista-controles');
    lista.textContent = '';

    D.CONTROLES.forEach(function (c) {
      var a = duenoDe(c.id);
      var mio = a && a.jugador === miId;
      var fila = elemento('li', null, 'fila' + (mio ? ' mia' : ''));
      var nombreCol = elemento('div', null, 'col-nombre');
      nombreCol.appendChild(elemento('strong', c.corto));
      var otro = a && !mio && estado.jugadores[a.jugador];
      nombreCol.appendChild(elemento('small', !a ? 'Libre' : mio ? 'Tuyo' : (otro ? otro.nombre : 'Otro jugador')));
      fila.appendChild(nombreCol);

      if (a && !mio) {
        fila.appendChild(elemento('span', D.SENSORES[a.sensor], 'col-sensor'));
        fila.appendChild(elemento('span'));
        fila.addEventListener('click', function () { mostrarAyuda(c.id, a.sensor); });
        lista.appendChild(fila);
        return;
      }

      // Sensores posibles: se deshabilitan los que el celular no tiene y
      // los que chocan con otro control propio.
      var selector = elemento('select', null, 'col-sensor');
      var primeroValido = null;
      c.sensores.forEach(function (s) {
        var opcion = elemento('option', D.SENSORES[s]);
        opcion.value = s;
        var choque = D.conflicto(propias, c.id, s);
        if (!sensorDisponible(s)) {
          opcion.disabled = true;
          opcion.textContent += ' (no disponible)';
        } else if (choque) {
          opcion.disabled = true;
          opcion.textContent += ' (mismo gesto que ' + D.control(choque).corto + ')';
        } else if (!primeroValido) {
          primeroValido = s;
        }
        selector.appendChild(opcion);
      });
      var preferido = mio ? a.sensor : preferencias[c.id];
      var opcionPreferida = Array.prototype.filter.call(selector.options, function (o) {
        return o.value === preferido && !o.disabled;
      })[0];
      selector.value = opcionPreferida || mio ? preferido : (primeroValido || c.sensores[0]);

      function pedirControl() {
        var opcion = selector.options[selector.selectedIndex];
        if (!opcion || opcion.disabled) return;
        preferencias[c.id] = selector.value;
        D.guardar('doomy.preferencias', JSON.stringify(preferencias));
        pedir('elegir', { control: c.id, sensor: selector.value });
      }

      selector.addEventListener('focus', function () { mostrarAyuda(c.id, selector.value); });
      selector.addEventListener('change', function () {
        mostrarAyuda(c.id, selector.value);
        // Si el control ya es tuyo, el cambio de sensor se aplica al elegirlo.
        if (mio) pedirControl();
      });
      fila.appendChild(selector);

      var boton = elemento('button', mio ? 'Soltar' : 'Tomar');
      boton.type = 'button';
      if (mio) {
        boton.addEventListener('click', function () {
          delete preferencias[c.id];
          D.guardar('doomy.preferencias', JSON.stringify(preferencias));
          pedir('soltar', { control: c.id });
        });
      } else {
        boton.disabled = !primeroValido;
        boton.addEventListener('click', function () {
          mostrarAyuda(c.id, selector.value);
          pedirControl();
        });
      }
      fila.appendChild(boton);
      lista.appendChild(fila);
    });

    if (enPausa) dibujarAjustes(propias);

    var listo = estado.jugadores[miId].listo;
    $('listo').textContent = listo ? '✔ Listo · tocar para cancelar' : 'Estoy listo';
    $('listo').classList.toggle('activo', !!listo);
  }

  function alPresionarListo() {
    if (!estado || !estado.jugadores[miId]) return;
    if (estado.jugadores[miId].listo) {
      pedir('listo', { valor: false });
      return;
    }
    var usados = {};
    asignacionesPropias().forEach(function (p) { usados[p.sensor] = true; });

    // Los permisos se piden desde el toque del usuario (lo exige iPhone).
    var pedidos = [];
    if (usados.giroscopio || usados.acelerometro) pedidos.push(pedirPermisoMovimiento());
    if (usados.microfono) pedidos.push(iniciarMicrofono());
    pedirPantallaEncendida();

    Promise.all(pedidos).then(function () {
      // Esperar un momento a que lleguen las primeras lecturas.
      setTimeout(function () {
        if (usados.giroscopio && !lectura.orientacion) {
          return mensaje('Este celular no entrega datos del giroscopio. Elige otro sensor.', true);
        }
        if (usados.acelerometro && !lectura.movimiento) {
          return mensaje('Este celular no entrega datos del acelerómetro. Elige otro sensor.', true);
        }
        calibrar();
        mensaje('');
        pedir('listo', { valor: true });
      }, pedidos.length ? 600 : 0);
    }).catch(function () {
      mensaje('No se dio permiso para usar los sensores o el micrófono. Elige otro sensor o vuelve a intentarlo.', true);
    });
  }

  // --------------------------------------------- ajustes (pausa general)

  function dibujarAjustes(propias) {
    var firma = propias.map(function (p) { return p.control + ':' + p.sensor; }).join(',');
    if (firma === firmaAjustes) return;     // no redibujar: perdería lo que se está escribiendo
    firmaAjustes = firma;

    var invertir = $('lista-invertir');
    invertir.textContent = '';
    propias.forEach(function (p) {
      var c = D.control(p.control);
      if (c.tipo !== 'eje' || (p.sensor !== 'giroscopio' && p.sensor !== 'acelerometro')) return;
      var etiqueta = elemento('label', null, 'fila-ajuste');
      var casilla = elemento('input');
      casilla.type = 'checkbox';
      casilla.checked = !!invertidos[c.id];
      casilla.addEventListener('change', function () {
        invertidos[c.id] = casilla.checked;
        D.guardar('doomy.invertidos', JSON.stringify(invertidos));
      });
      etiqueta.appendChild(elemento('span', 'Invertir ' + c.corto));
      etiqueta.appendChild(casilla);
      invertir.appendChild(etiqueta);
    });

    var lista = $('lista-ajustes');
    lista.textContent = '';
    lecturasVisibles = [];
    camposAjustes = [];
    D.AJUSTES.forEach(function (aj) {
      var aplica = propias.some(function (p) {
        return aj.sensores.indexOf(p.sensor) >= 0 && aj.controles.indexOf(p.control) >= 0;
      });
      if (!aplica) return;
      var fila = elemento('label', null, 'fila-ajuste');
      var texto = elemento('span');
      texto.appendChild(document.createTextNode(aj.nombre + ' (' + aj.unidad + ')'));
      if (aj.lectura) {
        var actual = elemento('small', '');
        texto.appendChild(actual);
        lecturasVisibles.push({ elemento: actual, tipo: aj.lectura });
      }
      var campo = elemento('input');
      campo.type = 'number';
      campo.step = 'any';
      campo.inputMode = 'decimal';
      campo.value = ajuste(aj.id);
      campo.addEventListener('change', function () {
        var v = parseFloat(campo.value);
        if (isNaN(v)) return;
        ajustesGuardados[aj.id] = v;
        D.guardar('doomy.ajustes', JSON.stringify(ajustesGuardados));
      });
      camposAjustes.push({ campo: campo, ajuste: aj });
      fila.appendChild(texto);
      fila.appendChild(campo);
      lista.appendChild(fila);
    });
    if (!lista.childNodes.length) lista.appendChild(elemento('p', 'Tus controles no tienen umbrales que ajustar.', 'aviso'));
  }

  var camposAjustes = [];

  function restablecerAjustes() {
    camposAjustes.forEach(function (c) {
      delete ajustesGuardados[c.ajuste.id];
      c.campo.value = c.ajuste.valor;
    });
    D.guardar('doomy.ajustes', JSON.stringify(ajustesGuardados));
    mensaje('Umbrales restablecidos a los valores por defecto.');
  }

  // Muestra la lectura actual junto a cada ajuste para poder elegir el umbral.
  var lecturasVisibles = [];
  function actualizarLecturasVisibles() {
    lecturasVisibles.forEach(function (l) {
      var t = '';
      if (l.tipo === 'inclinacion') {
        t = 'adelante ' + redondear(inclinacionAdelante()) + '° · lados ' + redondear(inclinacionLados()) + '°';
      } else if (l.tipo === 'giro') {
        t = 'último giro ' + redondear(lectura.ultimoGiro) + ' °/s';
      } else if (l.tipo === 'aceleracion') {
        t = 'última aceleración ' + redondear(lectura.ultimaAceleracion) + ' m/s²';
      } else if (l.tipo === 'volumen') {
        t = audio ? 'ahora ' + redondear(lectura.volumen) + ' dB' : 'activa el micrófono con "Estoy listo"';
      } else if (l.tipo === 'frecuencia') {
        t = audio ? 'ahora ' + (lectura.frecuencia ? redondear(lectura.frecuencia) + ' Hz' : 'silencio') : 'activa el micrófono con "Estoy listo"';
      }
      l.elemento.textContent = t ? ' · ' + t : '';
    });
  }

  function redondear(v) { return v === null || v === undefined || isNaN(v) ? '—' : Math.round(v); }

  // ---------------------------------------------------------- sensores

  var lectura = {
    orientacion: false, movimiento: false,
    beta: null, gamma: null,                 // deviceorientation (grados)
    gx: null, gy: null, gz: null,            // aceleración con gravedad (m/s²)
    // máximos desde la última vuelta del ciclo
    picoAcel: 0, picoAcelZ: 0, picoGiroLados: 0, picoGiroAdelante: 0,
    ultimaConfirmacion: 0,                   // última vez que la aceleración superó "confirmacion"
    ultimoGiro: 0, ultimaAceleracion: 0,     // para mostrar en los ajustes
    volumen: null, frecuencia: null          // micrófono (dB y Hz)
  };
  var calibracion = { beta: 0, gamma: 0, inclinacion: 0, ladeo: 0 };

  var necesitaPermisoMovimiento = !!(window.DeviceOrientationEvent &&
    typeof DeviceOrientationEvent.requestPermission === 'function');
  var permisoMovimiento = false;
  var sensoresProbados = false;   // ya pasó tiempo suficiente para saber si hay sensores

  function probarSensoresLuego() {
    setTimeout(function () {
      sensoresProbados = true;
      if (estado && (estado.fase === 'lobby' || estado.fase === 'pausa')) dibujarLobby();
    }, 1500);
  }
  if (!necesitaPermisoMovimiento) probarSensoresLuego();

  function pedirPermisoMovimiento() {
    if (!necesitaPermisoMovimiento || permisoMovimiento) return Promise.resolve();
    var pedidos = [DeviceOrientationEvent.requestPermission()];
    if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
      pedidos.push(DeviceMotionEvent.requestPermission());
    }
    return Promise.all(pedidos).then(function (respuestas) {
      if (respuestas.some(function (r) { return r !== 'granted'; })) throw new Error('denegado');
      permisoMovimiento = true;
      probarSensoresLuego();
    });
  }

  // Un sensor se ofrece solo si el celular lo tiene.
  function sensorDisponible(sensor) {
    if (sensor === 'tactil') return true;
    if (sensor === 'microfono') {
      return !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }
    if (!window.DeviceOrientationEvent && !window.DeviceMotionEvent) return false;
    if (!sensoresProbados) return true;      // todavía no se sabe: se comprueba en "Estoy listo"
    return sensor === 'giroscopio' ? lectura.orientacion : lectura.movimiento;
  }

  window.addEventListener('deviceorientation', function (e) {
    if (e.beta === null || e.beta === undefined) return;
    lectura.orientacion = true;
    lectura.beta = e.beta;
    lectura.gamma = e.gamma;
  });

  window.addEventListener('devicemotion', function (e) {
    var g = e.accelerationIncludingGravity;
    var a = e.acceleration;
    var r = e.rotationRate;
    if (g && g.x !== null) {
      lectura.movimiento = true;
      lectura.gx = g.x; lectura.gy = g.y; lectura.gz = g.z;
    }
    var acel = 0;
    if (a && a.x !== null) {
      acel = Math.hypot(a.x, a.y, a.z);
      lectura.picoAcelZ = Math.max(lectura.picoAcelZ, Math.abs(a.z));
    } else if (g && g.x !== null) {
      acel = Math.abs(Math.hypot(g.x, g.y, g.z) - 9.81);
    }
    lectura.picoAcel = Math.max(lectura.picoAcel, acel);
    if (acel > 1) lectura.ultimaAceleracion = acel;
    if (acel > ajuste('confirmacion')) lectura.ultimaConfirmacion = Date.now();

    if (r && r.alpha !== null) {
      // beta: giro hacia adelante/atrás (eje X); gamma y alpha: hacia los lados (ejes Y y Z).
      var lados = Math.max(Math.abs(r.gamma), Math.abs(r.alpha));
      var adelante = Math.abs(r.beta);
      lectura.picoGiroLados = Math.max(lectura.picoGiroLados, lados);
      lectura.picoGiroAdelante = Math.max(lectura.picoGiroAdelante, adelante);
      if (Math.max(lados, adelante) > 60) lectura.ultimoGiro = Math.max(lados, adelante);
    }
  });

  var GRADOS = 180 / Math.PI;

  function diferenciaAngulo(a, b) {
    var d = (a - b) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  // Ángulos medidos con la gravedad (acelerómetro).
  function inclinacionGravedad() { return Math.atan2(lectura.gy, lectura.gz) * GRADOS; }
  function ladeoGravedad() { return Math.atan2(lectura.gx, Math.hypot(lectura.gy, lectura.gz)) * GRADOS; }

  // Positivo = hacia adelante / hacia la izquierda, respecto de la calibración.
  function adelanteGiroscopio() { return lectura.orientacion ? diferenciaAngulo(calibracion.beta, lectura.beta) : null; }
  function izquierdaGiroscopio() { return lectura.orientacion ? diferenciaAngulo(calibracion.gamma, lectura.gamma) : null; }
  function adelanteAcelerometro() { return lectura.movimiento ? diferenciaAngulo(calibracion.inclinacion, inclinacionGravedad()) : null; }
  function izquierdaAcelerometro() { return lectura.movimiento ? diferenciaAngulo(ladeoGravedad(), calibracion.ladeo) : null; }

  function inclinacionAdelante() { return lectura.orientacion ? adelanteGiroscopio() : adelanteAcelerometro(); }
  function inclinacionLados() { return lectura.orientacion ? izquierdaGiroscopio() : izquierdaAcelerometro(); }

  function calibrar() {
    if (lectura.orientacion) {
      calibracion.beta = lectura.beta;
      calibracion.gamma = lectura.gamma;
    }
    if (lectura.movimiento) {
      calibracion.inclinacion = inclinacionGravedad();
      calibracion.ladeo = ladeoGravedad();
    }
  }

  // ---------------------------------------------------------- micrófono

  var audio = null;   // { analizador, tiempo, frecuencias, tasa }

  function iniciarMicrofono() {
    if (audio) return Promise.resolve();
    return navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    }).then(function (flujo) {
      var Contexto = window.AudioContext || window.webkitAudioContext;
      var contexto = new Contexto();
      var analizador = contexto.createAnalyser();
      analizador.fftSize = 2048;
      contexto.createMediaStreamSource(flujo).connect(analizador);
      audio = {
        contexto: contexto,
        analizador: analizador,
        tiempo: new Float32Array(analizador.fftSize),
        frecuencias: new Float32Array(analizador.frequencyBinCount),
        tasa: contexto.sampleRate
      };
    });
  }

  // Volumen en dB (0 = máximo del micrófono; los sonidos son negativos)
  // y frecuencia dominante en Hz (null si hay silencio).
  function leerMicrofono() {
    if (!audio) return;
    audio.analizador.getFloatTimeDomainData(audio.tiempo);
    var suma = 0;
    for (var i = 0; i < audio.tiempo.length; i++) suma += audio.tiempo[i] * audio.tiempo[i];
    var rms = Math.sqrt(suma / audio.tiempo.length);
    lectura.volumen = 20 * Math.log10(rms || 1e-8);

    if (lectura.volumen < ajuste('micPiso')) {
      lectura.frecuencia = null;
      return;
    }
    audio.analizador.getFloatFrequencyData(audio.frecuencias);
    var ancho = audio.tasa / audio.analizador.fftSize;
    var desde = Math.floor(50 / ancho), hasta = Math.min(audio.frecuencias.length - 1, Math.ceil(2000 / ancho));
    var mejor = desde;
    for (var k = desde; k <= hasta; k++) if (audio.frecuencias[k] > audio.frecuencias[mejor]) mejor = k;
    lectura.frecuencia = mejor * ancho;
  }

  // ---------------------------------------------- teclas de cada control

  function enviar(st, code, abajo) {
    if (!!st.abajo[code] === abajo) return;
    st.abajo[code] = abajo;
    publicar(T.input, { id: miId, c: st.control.id, k: code, d: abajo ? 1 : 0 }, 0);
    dibujarTeclas();
  }

  function soltarControl(st) {
    Object.keys(st.abajo).forEach(function (code) { enviar(st, code, false); });
    st.finPulso = 0;
  }

  function soltarTodo() {
    misControles.forEach(soltarControl);
    punteros = {};
    joystickId = null;
  }

  // Sin conexión, el PC ya soltó las teclas: solo se olvida el estado local
  // para que se vuelvan a enviar al reconectar.
  function olvidarTeclas() {
    misControles.forEach(function (st) { st.abajo = {}; st.finPulso = 0; });
    dibujarTeclas();
  }

  // dir: 1 = teclas[0], -1 = teclas[1], 0 = ninguna.
  function ponerEje(st, dir) {
    var deseada = dir > 0 ? st.control.teclas[0] : dir < 0 ? st.control.teclas[1] : null;
    st.control.teclas.forEach(function (code) { enviar(st, code, code === deseada); });
  }

  function ejePorUmbral(st, valor, umbral) {
    if (valor === null) return ponerEje(st, 0);
    if (invertidos[st.control.id]) valor = -valor;
    st.valor = valor;
    ponerEje(st, valor > umbral ? 1 : valor < -umbral ? -1 : 0);
  }

  function mantener(st, activo) {
    enviar(st, st.control.teclas[0], !!activo);
  }

  // Gesto puntual: presiona la tecla un momento (duración del control).
  function pulso(st, ocurrio, ahora, pausa) {
    if (!ocurrio || ahora < st.bloqueo) return;
    st.bloqueo = ahora + (pausa || PAUSA_GESTO);
    enviar(st, st.control.teclas[0], true);
    st.finPulso = ahora + st.control.duracion;
  }

  function el(st) { return st.control.id + '/' + st.sensor; }

  function pasoSensores() {
    var ahora = Date.now();
    leerMicrofono();
    var picos = {
      acel: lectura.picoAcel, acelZ: lectura.picoAcelZ,
      giroLados: lectura.picoGiroLados, giroAdelante: lectura.picoGiroAdelante
    };
    lectura.picoAcel = lectura.picoAcelZ = lectura.picoGiroLados = lectura.picoGiroAdelante = 0;
    var confirmado = ahora - lectura.ultimaConfirmacion < VENTANA_CONFIRMACION;
    var vol = lectura.volumen, piso = ajuste('micPiso');
    var sonido = vol !== null && vol >= piso;

    actualizarLecturasVisibles();
    if (!estado || estado.fase !== 'juego') return;

    misControles.forEach(function (st) {
      // Fin de los pulsos (de cualquier sensor, incluido el doble toque).
      if (st.finPulso && ahora > st.finPulso) {
        st.finPulso = 0;
        st.control.teclas.forEach(function (code) { enviar(st, code, false); });
      }

      switch (el(st)) {
        case 'mover/giroscopio': return ejePorUmbral(st, adelanteGiroscopio(), ajuste('inclinacion'));
        case 'mover/acelerometro': return ejePorUmbral(st, adelanteAcelerometro(), ajuste('inclinacion'));
        case 'lateral/giroscopio': return ejePorUmbral(st, izquierdaGiroscopio(), ajuste('inclinacion'));
        case 'lateral/acelerometro': return ejePorUmbral(st, izquierdaAcelerometro(), ajuste('inclinacion'));
        case 'correr/giroscopio': return mantener(st, adelanteGiroscopio() >= ajuste('inclinacionCorrer'));
        case 'correr/acelerometro': return mantener(st, adelanteAcelerometro() >= ajuste('inclinacionCorrer'));

        // Giro rápido (giroscopio) confirmado por aceleración en el último segundo.
        case 'disparar/giroscopio': return pulso(st, picos.giroLados > ajuste('giroBrusco') && confirmado, ahora);
        case 'usar/giroscopio': return pulso(st, picos.giroAdelante > ajuste('giroBrusco') && confirmado, ahora);
        // Movimiento rápido (acelerómetro); "usar" solo hacia adelante / atrás.
        case 'disparar/acelerometro': return pulso(st, picos.acel > ajuste('movimientoBrusco'), ahora);
        case 'usar/acelerometro': return pulso(st, picos.acelZ > ajuste('movimientoBrusco'), ahora);

        case 'mover/microfono': {
          if (!sonido) return ponerEje(st, 0);
          var f = lectura.frecuencia;
          return ponerEje(st, f !== null && f >= ajuste('frecMin') && f <= ajuste('frecMax') ? 1 : -1);
        }
        case 'lateral/microfono':
          // teclas[0] = izquierda (suave), teclas[1] = derecha (fuerte).
          return ponerEje(st, !sonido ? 0 : vol >= ajuste('micMedio') ? -1 : 1);
        case 'disparar/microfono': return mantener(st, vol !== null && vol >= ajuste('micDisparo'));
        case 'correr/microfono': return mantener(st, vol !== null && vol >= ajuste('micCorrer'));
        case 'usar/microfono': return pulso(st, sonido && vol < ajuste('micDisparo'), ahora, PAUSA_MIC_USAR);
        case 'mapa/microfono':
          return pulso(st, sonido && lectura.frecuencia !== null && lectura.frecuencia < ajuste('frecGrave'), ahora, PAUSA_MIC_MAPA);
      }
    });

    evaluarTactil();
  }

  setInterval(pasoSensores, INTERVALO_SENSORES);

  // --------------------------------------------------- pantalla táctil

  var punteros = {};       // pointerId -> { x0, y0, x, y, t0, solo }
  var joystickId = null;   // el primer dedo es el joystick
  var ultimoToque = null;  // { x, y, t } para el doble toque
  var inicioDosDedos = 0;

  function tactil(controlId) {
    for (var i = 0; i < misControles.length; i++) {
      if (misControles[i].control.id === controlId && misControles[i].sensor === 'tactil') return misControles[i];
    }
    return null;
  }

  // Sigue al dedo aunque salga del elemento. Si el navegador no lo permite,
  // no debe impedir que se envíe la tecla.
  function capturar(elemento, pointerId) {
    try { if (elemento.setPointerCapture) elemento.setPointerCapture(pointerId); } catch (err) { /* sin captura */ }
  }

  function alApoyar(e) {
    e.preventDefault();
    var zona = $('zona-tactil');
    capturar(zona, e.pointerId);
    var ids = Object.keys(punteros);
    ids.forEach(function (id) { punteros[id].solo = false; });
    punteros[e.pointerId] = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: Date.now(), solo: !ids.length };
    if (joystickId === null && (tactil('mover') || tactil('lateral'))) joystickId = e.pointerId;
    if (Object.keys(punteros).length === 2) inicioDosDedos = Date.now();
    evaluarTactil();
  }

  function alMover(e) {
    var p = punteros[e.pointerId];
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    evaluarTactil();
  }

  function alLevantar(e) {
    var p = punteros[e.pointerId];
    if (!p) return;
    delete punteros[e.pointerId];
    if (e.pointerId === joystickId) joystickId = null;
    var ahora = Date.now();
    var esToque = p.solo && ahora - p.t0 < TOQUE_MAX_MS && Math.hypot(p.x - p.x0, p.y - p.y0) < TOQUE_MAX_PX;
    if (esToque) registrarToque(p.x, p.y, ahora);
    evaluarTactil();
  }

  // "Usar": dos toques en menos de 0,9 s y en un área similar.
  function registrarToque(x, y, t) {
    var st = tactil('usar');
    if (!st) return;
    if (ultimoToque && t - ultimoToque.t <= DOBLE_TOQUE &&
        Math.hypot(x - ultimoToque.x, y - ultimoToque.y) <= AREA_DOBLE_TOQUE) {
      ultimoToque = null;
      enviar(st, st.control.teclas[0], true);
      st.finPulso = t + st.control.duracion;
    } else {
      ultimoToque = { x: x, y: y, t: t };
    }
  }

  function evaluarTactil() {
    if (!estado || estado.fase !== 'juego') return;
    var zonaMuerta = ajuste('zonaMuerta');

    // Joystick virtual: aparece donde se apoya el primer dedo.
    var joy = joystickId !== null && punteros[joystickId];
    var dx = joy ? joy.x - joy.x0 : 0, dy = joy ? joy.y - joy.y0 : 0;
    var mover = tactil('mover'), lateral = tactil('lateral');
    if (mover) ponerEje(mover, dy < -zonaMuerta ? 1 : dy > zonaMuerta ? -1 : 0);
    if (lateral) ponerEje(lateral, dx < -zonaMuerta ? 1 : dx > zonaMuerta ? -1 : 0);
    dibujarJoystick(joy);

    // Dos dedos: juntos hacia arriba = correr; si no, disparar.
    var ids = Object.keys(punteros);
    var disparar = tactil('disparar'), correr = tactil('correr');
    var corriendo = false, disparando = false;
    if (ids.length === 2) {
      var a = punteros[ids[0]], b = punteros[ids[1]];
      var ax = a.x - a.x0, ay = a.y - a.y0, bx = b.x - b.x0, by = b.y - b.y0;
      var la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
      var juntos = la > DEDOS_JUNTOS_PX && lb > DEDOS_JUNTOS_PX &&
        (ax * bx + ay * by) / (la * lb) > 0.8 && (ay + by) / 2 < -DEDOS_JUNTOS_PX;
      if (correr && juntos) corriendo = true;
      else if (disparar && (!correr || Date.now() - inicioDosDedos > ESPERA_DOS_DEDOS)) disparando = true;
    }
    if (correr) mantener(correr, corriendo);
    if (disparar) mantener(disparar, disparando);
  }

  function dibujarJoystick(joy) {
    var base = $('joystick-base'), perilla = $('joystick-perilla');
    base.hidden = perilla.hidden = !joy;
    if (!joy) return;
    var zona = $('zona-tactil').getBoundingClientRect();
    var dx = joy.x - joy.x0, dy = joy.y - joy.y0, largo = Math.hypot(dx, dy), maximo = 60;
    if (largo > maximo) { dx = dx * maximo / largo; dy = dy * maximo / largo; }
    base.style.left = (joy.x0 - zona.left) + 'px';
    base.style.top = (joy.y0 - zona.top) + 'px';
    perilla.style.left = (joy.x0 - zona.left + dx) + 'px';
    perilla.style.top = (joy.y0 - zona.top + dy) + 'px';
  }

  (function prepararZonaTactil() {
    var zona = $('zona-tactil');
    zona.addEventListener('pointerdown', alApoyar);
    zona.addEventListener('pointermove', alMover);
    ['pointerup', 'pointercancel'].forEach(function (tipo) { zona.addEventListener(tipo, alLevantar); });
    zona.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // Carrusel de armas: ◀ [arma] ▶
    function cambiarArma(paso) {
      var st = tactil('arma');
      if (!st) return;
      st.arma = ((st.arma - 1 + paso + 7) % 7) + 1;
      $('arma-actual').textContent = st.arma + ' · ' + D.ARMAS[st.arma - 1];
      var code = st.control.teclas[st.arma - 1];
      soltarControl(st);
      enviar(st, code, true);
      st.finPulso = Date.now() + 120;
    }
    $('arma-anterior').addEventListener('click', function () { cambiarArma(-1); });
    $('arma-siguiente').addEventListener('click', function () { cambiarArma(1); });

    // Botón Mapa: se presiona mientras se mantiene (push button).
    var mapa = $('boton-mapa');
    mapa.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      capturar(mapa, e.pointerId);
      var st = tactil('mapa');
      if (st) enviar(st, 'Tab', true);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (tipo) {
      mapa.addEventListener(tipo, function () {
        var st = tactil('mapa');
        if (st) enviar(st, 'Tab', false);
      });
    });
    mapa.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  })();

  // --------------------------------------------------- vista de juego

  function controlesPropios() {
    return asignacionesPropias().map(function (p) {
      return { control: D.control(p.control), sensor: p.sensor };
    });
  }

  function dibujarJuego() {
    var propios = controlesPropios();
    var firma = propios.map(function (p) { return p.control.id + ':' + p.sensor; }).join(',');
    if (firma === firmaJuego) return;     // no redibujar: cortaría los toques en curso
    firmaJuego = firma;

    soltarTodo();
    misControles = propios.map(function (p) {
      return { control: p.control, sensor: p.sensor, abajo: {}, valor: 0, bloqueo: 0, finPulso: 0, arma: 2 };
    });

    // Tarjetas de los controles que no son táctiles.
    var tarjetas = $('tarjetas');
    tarjetas.textContent = '';
    misControles.forEach(function (st) {
      if (st.sensor === 'tactil') return;
      var tarjeta = elemento('div', null, 'tarjeta');
      tarjeta.appendChild(elemento('h2', st.control.nombre + ' · ' + D.SENSORES[st.sensor]));
      tarjeta.appendChild(elemento('p', D.descripcion(st.control.id, st.sensor), 'aviso'));
      tarjetas.appendChild(tarjeta);
    });

    // Elementos táctiles.
    var ayuda = [];
    ['mover', 'lateral', 'disparar', 'usar', 'correr'].forEach(function (id) {
      if (tactil(id)) ayuda.push(D.control(id).nombre + ': ' + D.descripcion(id, 'tactil'));
    });
    $('zona-tactil').hidden = !ayuda.length;
    $('ayuda-tactil').textContent = ayuda.join(' · ');

    var arma = tactil('arma');
    $('carrusel').hidden = !arma;
    if (arma) $('arma-actual').textContent = arma.arma + ' · ' + D.ARMAS[arma.arma - 1];
    $('boton-mapa').hidden = !tactil('mapa');

    dibujarTeclas();
  }

  // Indicadores: qué tecla de DOOM está presionando este celular.
  function dibujarTeclas() {
    var contenedor = $('teclas');
    contenedor.textContent = '';
    misControles.forEach(function (st) {
      var grupo = elemento('div', null, 'grupo-teclas');
      grupo.appendChild(elemento('span', st.control.nombre, 'aviso'));
      st.control.teclas.forEach(function (code) {
        grupo.appendChild(elemento('span', D.NOMBRES_TECLAS[code] || code, st.abajo[code] ? 'tecla activa' : 'tecla'));
      });
      contenedor.appendChild(grupo);
    });
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
  $('activar-sensores').addEventListener('click', function () {
    pedirPermisoMovimiento().then(function () { if (estado) dibujarLobby(); })
      .catch(function () { mensaje('No se dio permiso para usar los sensores de movimiento.', true); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('#pestanas button'), function (b) {
    b.addEventListener('click', function () { mostrarPestana(b.getAttribute('data-pestana')); });
  });
  $('restablecer').addEventListener('click', restablecerAjustes);
  $('recalibrar').addEventListener('click', function () {
    calibrar();
    mensaje('Sensores recalibrados.');
  });

  // Con sala en el QR y nombre recordado, se une directo.
  if (sala && nombre) conectar();
  else mostrarVista('vista-unirse');
})();
