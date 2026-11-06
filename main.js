// Pantalla del PC: crea la sala, coordina el lobby por MQTT y corre DOOM.
//
// El PC es la autoridad: los celulares piden controles y el PC decide.
// Cuando empieza la partida, cada mensaje de input de un celular se valida
// (¿ese jugador es dueño de ese control? ¿esa tecla es de ese control?) y
// se traduce en un KeyboardEvent sintético que el motor de DOOM escucha.

(function () {
  'use strict';

  var D = window.DOOMY;
  var $ = function (id) { return document.getElementById(id); };

  var TIEMPO_SIN_SENAL = 8000;   // ms sin ping para dar por desconectado a un celular

  // ---------------------------------------------------------------- sala

  function crearCodigoSala() {
    return D.idAleatorio(5, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
  }

  // La sala se recuerda en el navegador: recargar la página no cambia el QR.
  var sala = D.limpiarSala(D.leer('doomy.sala')) || crearCodigoSala();
  D.guardar('doomy.sala', sala);
  var T = D.temas(sala);

  // fase: 'lobby' | 'juego'
  // jugadores[id] = { nombre, listo, visto }
  // asignacion[controlId] = { jugador, sensor }
  var estado = { fase: 'lobby', jugadores: {}, asignacion: {} };

  var cliente = null;
  var motorListo = false;

  // ------------------------------------------------------------- teclado

  // Mientras se juega, el teclado físico del PC no llega al motor:
  // solo pasan los eventos sintéticos (isTrusted = false) de los celulares.
  // Se registra antes de cargar doom.js para ejecutarse antes que el motor.
  ['keydown', 'keyup', 'keypress'].forEach(function (tipo) {
    window.addEventListener(tipo, function (e) {
      if (e.isTrusted && estado.fase === 'juego') e.stopImmediatePropagation();
    }, true);
  });

  function nombreDeTecla(code) {
    if (/^Key[A-Z]$/.test(code)) return code[3].toLowerCase();
    if (/^Digit\d$/.test(code)) return code[5];
    return { Space: ' ', Comma: ',', Period: '.', ControlRight: 'Control', ShiftRight: 'Shift' }[code] || code;
  }

  function enviarAlMotor(code, abajo) {
    if (!motorListo) return;
    window.dispatchEvent(new KeyboardEvent(abajo ? 'keydown' : 'keyup', {
      code: code, key: nombreDeTecla(code), bubbles: true, cancelable: true
    }));
  }

  // Una misma tecla puede estar presionada por varias fuentes (ej: la flecha
  // arriba del que se mueve y la del que navega el menú). El motor recibe
  // keydown con la primera fuente y keyup cuando se suelta la última.
  var presionadas = {};   // code -> { "jugador|control": true }

  function tecla(code, abajo, fuente) {
    var fuentes = presionadas[code] || (presionadas[code] = {});
    var antes = Object.keys(fuentes).length > 0;
    if (abajo) fuentes[fuente] = true; else delete fuentes[fuente];
    var ahora = Object.keys(fuentes).length > 0;
    if (antes !== ahora) enviarAlMotor(code, ahora);
  }

  // Suelta todas las teclas de un jugador (o de un control de un jugador).
  function soltarTeclas(jugador, controlId) {
    Object.keys(presionadas).forEach(function (code) {
      Object.keys(presionadas[code]).forEach(function (fuente) {
        var partes = fuente.split('|');
        if (partes[0] === jugador && (!controlId || partes[1] === controlId)) {
          tecla(code, false, fuente);
        }
      });
    });
  }

  // ---------------------------------------------------------------- MQTT

  function publicar(tema, datos, retener) {
    if (!cliente || !cliente.connected) return;
    cliente.publish(tema, JSON.stringify(datos), { qos: 1, retain: !!retener });
  }

  function publicarEstado() {
    var jugadores = {};
    Object.keys(estado.jugadores).forEach(function (id) {
      var j = estado.jugadores[id];
      jugadores[id] = { nombre: j.nombre, listo: j.listo };
    });
    publicar(T.estado, {
      fase: estado.fase,
      jugadores: jugadores,
      asignacion: estado.asignacion,
      max: D.MAX_JUGADORES
    }, true);
    dibujar();
  }

  function conectarBroker() {
    try {
      cliente = D.conectar('doomy-pc-' + sala + '-' + D.idAleatorio(6), {
        // Si el PC se cae, el broker avisa a los celulares que la sala se cerró.
        topic: T.estado,
        payload: JSON.stringify({ fase: 'cerrada' }),
        qos: 1,
        retain: true
      });
    } catch (err) {
      mostrarConexion('Error: ' + err.message, true);
      return;
    }

    cliente.on('connect', function () {
      mostrarConexion('Conectado al broker · temas ' + window.DOOMY_CONFIG.temaBase + '/' + sala + '/…');
      cliente.subscribe([T.host, T.input], { qos: 0 }, function (err, concedidas) {
        // EMQX responde qos 128 cuando la lista blanca no permite el tema.
        if (err || (concedidas || []).some(function (c) { return c.qos === 128; })) {
          mostrarConexion('El broker no permitió suscribirse a ' + T.host +
            '. Revisa que el usuario tenga permisos sobre ' + window.DOOMY_CONFIG.temaBase + '/#', true);
          return;
        }
        publicarEstado();
      });
    });

    cliente.on('reconnect', function () { mostrarConexion('Reconectando al broker…', true); });
    cliente.on('offline', function () { mostrarConexion('Sin conexión con el broker', true); });
    cliente.on('error', function (err) { mostrarConexion('Error: ' + D.explicarError(err), true); });

    cliente.on('message', function (tema, mensaje) {
      var datos;
      try { datos = JSON.parse(mensaje.toString()); } catch (e) { return; }
      if (!datos || typeof datos.id !== 'string') return;
      if (tema === T.input) recibirInput(datos);
      else if (tema === T.host) recibirPeticion(datos);
    });
  }

  // ------------------------------------------------------ lógica del lobby

  function controlesDe(id) {
    return D.CONTROLES.filter(function (c) {
      var a = estado.asignacion[c.id];
      return a && a.jugador === id;
    });
  }

  function recibirPeticion(p) {
    var j = estado.jugadores[p.id];
    if (j) j.visto = Date.now();

    switch (p.tipo) {
      case 'unir': return unir(p);
      case 'ping':
        // Un celular que el PC no conoce (por ejemplo, si se recargó el PC)
        // debe volver a unirse.
        if (!j) publicar(T.jugador(p.id), { tipo: 'reunir' });
        return;
      case 'salir': return quitarJugador(p.id, 'salió');
    }

    if (!j) return;

    if (p.tipo === 'listo') {
      if (estado.fase !== 'lobby') return;
      j.listo = !!p.valor;
      publicarEstado();
    } else if (p.tipo === 'elegir') {
      elegir(p);
    } else if (p.tipo === 'soltar') {
      if (estado.fase !== 'lobby') return;
      var a = estado.asignacion[p.control];
      if (a && a.jugador === p.id) {
        delete estado.asignacion[p.control];
        j.listo = false;
        publicarEstado();
      }
    }
  }

  function unir(p) {
    var nombre = String(p.nombre || '').trim().slice(0, 20) || 'Jugador';
    var j = estado.jugadores[p.id];
    if (!j) {
      if (Object.keys(estado.jugadores).length >= D.MAX_JUGADORES) {
        publicar(T.jugador(p.id), { tipo: 'rechazo', motivo: 'La sala está llena (máximo ' + D.MAX_JUGADORES + ' jugadores).' });
        return;
      }
      j = estado.jugadores[p.id] = { nombre: nombre, listo: false, visto: Date.now() };
      registrar(nombre + ' se unió');
      // Si la partida ya empezó, recibe los controles que quedaron sin dueño.
      reasignarHuerfanos();
    }
    j.nombre = nombre;
    publicar(T.jugador(p.id), { tipo: 'bienvenida' });
    publicarEstado();
  }

  function elegir(p) {
    if (estado.fase !== 'lobby') return;
    var c = D.control(p.control);
    if (!c || c.sensores.indexOf(p.sensor) < 0) return;
    var a = estado.asignacion[c.id];
    if (a && a.jugador !== p.id) {
      // Cada control tiene un solo dueño.
      publicar(T.jugador(p.id), { tipo: 'rechazo', motivo: c.nombre + ' ya lo tiene otro jugador.' });
      return;
    }
    estado.asignacion[c.id] = { jugador: p.id, sensor: p.sensor };
    estado.jugadores[p.id].listo = false;
    publicarEstado();
  }

  function quitarJugador(id, motivo) {
    var j = estado.jugadores[id];
    if (!j) return;
    soltarTeclas(id);
    delete estado.jugadores[id];
    var huerfanos = controlesDe(id);
    huerfanos.forEach(function (c) { delete estado.asignacion[c.id]; });
    registrar(j.nombre + ' ' + motivo + (huerfanos.length && estado.fase === 'juego'
      ? ': se reasignan ' + huerfanos.map(function (c) { return c.nombre; }).join(', ')
      : ''));
    reasignarHuerfanos();
    publicarEstado();
  }

  // Durante la partida ningún control puede quedar sin dueño: se le pasa
  // al jugador con menos controles, en pantalla táctil (no requiere
  // permisos ni calibración).
  function reasignarHuerfanos() {
    if (estado.fase !== 'juego') return;
    var ids = Object.keys(estado.jugadores);
    if (!ids.length) return;
    D.CONTROLES.forEach(function (c) {
      if (estado.asignacion[c.id]) return;
      var elegido = ids.reduce(function (menor, id) {
        return controlesDe(id).length < controlesDe(menor).length ? id : menor;
      });
      estado.asignacion[c.id] = { jugador: elegido, sensor: 'tactil' };
    });
  }

  function revisarDesconectados() {
    var ahora = Date.now();
    Object.keys(estado.jugadores).forEach(function (id) {
      if (ahora - estado.jugadores[id].visto > TIEMPO_SIN_SENAL) quitarJugador(id, 'se desconectó');
    });
  }

  // Devuelve null si se puede iniciar, o el motivo por el que no.
  function motivoParaNoIniciar() {
    var ids = Object.keys(estado.jugadores);
    if (!cliente || !cliente.connected) return 'Sin conexión con el broker.';
    if (!ids.length) return 'Esperando jugadores.';
    var libres = D.CONTROLES.filter(function (c) { return !estado.asignacion[c.id]; });
    if (libres.length) return 'Faltan controles por elegir: ' + libres.map(function (c) { return c.nombre; }).join(', ') + '.';
    var noListos = ids.filter(function (id) { return !estado.jugadores[id].listo; });
    if (noListos.length) return 'Falta que estén listos: ' + noListos.map(function (id) { return estado.jugadores[id].nombre; }).join(', ') + '.';
    return null;
  }

  // -------------------------------------------------------------- input

  function recibirInput(m) {
    if (estado.fase !== 'juego' || !estado.jugadores[m.id]) return;
    var c = D.control(m.c);
    var a = c && estado.asignacion[c.id];
    if (!a || a.jugador !== m.id || c.teclas.indexOf(m.k) < 0) return;
    estado.jugadores[m.id].visto = Date.now();
    tecla(m.k, !!m.d, m.id + '|' + c.id);
  }

  // ---------------------------------------------------------- interfaz

  function mostrarConexion(texto, esError) {
    var p = $('conexion');
    p.textContent = texto;
    p.classList.toggle('error', !!esError);
    dibujar();
  }

  function registrar(texto) {
    $('registro').textContent = new Date().toLocaleTimeString() + ' · ' + texto;
  }

  function elemento(etiqueta, texto) {
    var e = document.createElement(etiqueta);
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function dibujar() {
    var lista = $('lista-jugadores');
    lista.textContent = '';
    var ids = Object.keys(estado.jugadores);
    if (!ids.length) lista.appendChild(elemento('li', 'Nadie todavía.'));
    ids.forEach(function (id) {
      var j = estado.jugadores[id];
      var n = controlesDe(id).length;
      lista.appendChild(elemento('li', j.nombre + ' · ' + n + (n === 1 ? ' control' : ' controles') +
        (estado.fase === 'lobby' ? (j.listo ? ' · listo' : ' · eligiendo') : '')));
    });

    var tabla = $('tabla-controles');
    tabla.textContent = '';
    D.CONTROLES.forEach(function (c) {
      var a = estado.asignacion[c.id];
      var j = a && estado.jugadores[a.jugador];
      var fila = elemento('tr');
      fila.appendChild(elemento('td', c.nombre));
      fila.appendChild(elemento('td', j ? j.nombre : '— libre —'));
      fila.appendChild(elemento('td', a ? D.SENSORES[a.sensor] : ''));
      tabla.appendChild(fila);
    });

    var motivo = estado.fase === 'lobby' ? motivoParaNoIniciar() : null;
    $('iniciar').disabled = !!motivo;
    $('motivo-iniciar').textContent = motivo || '';
  }

  function prepararLobby() {
    $('codigo-sala').textContent = sala;
    $('codigo-sala-juego').textContent = sala;
    $('max-jugadores').textContent = D.MAX_JUGADORES;

    var url = new URL('control.html?sala=' + sala, location.href).href;
    var enlace = $('enlace-control');
    enlace.href = url;
    enlace.textContent = url;
    if (window.QRCode) {
      new window.QRCode($('qr'), { text: url, width: 220, height: 220 });
    } else {
      $('qr').textContent = 'No se pudo cargar el generador de QR: usa el enlace.';
    }

    $('nueva-sala').addEventListener('click', function () {
      if (!confirm('¿Crear una sala nueva? Los jugadores conectados tendrán que escanear otro QR.')) return;
      publicar(T.estado, { fase: 'cerrada' }, true);
      D.guardar('doomy.sala', crearCodigoSala());
      setTimeout(function () { location.reload(); }, 300);
    });

    $('borrar-partidas').addEventListener('click', borrarPartidas);
    $('iniciar').addEventListener('click', iniciarPartida);
    $('pantalla-completa').addEventListener('click', function () {
      if ($('pantalla').requestFullscreen) $('pantalla').requestFullscreen();
    });
  }

  function iniciarPartida() {
    if (motivoParaNoIniciar()) return;
    estado.fase = 'juego';
    publicarEstado();
    $('lobby').hidden = true;
    $('juego').hidden = false;
    registrar('Partida iniciada. Quien tiene el Menú debe abrirlo y elegir "New Game".');
    // El motor se carga recién aquí: el clic en "Iniciar" habilita el audio del navegador.
    cargarMotor();
  }

  // --------------------------------------------------- motor de DOOM

  // Las partidas guardadas (F2/F3 o desde el menú) y la configuración
  // viven en /save, una carpeta respaldada por el IndexedDB del navegador.
  var CARPETA_PARTIDAS = '/save';
  var sincronizando = false;
  var sincronizarDeNuevo = false;

  function sincronizarPartidas(listo) {
    if (sincronizando) { sincronizarDeNuevo = true; return; }
    sincronizando = true;
    window.Module.FS.syncfs(false, function (err) {
      sincronizando = false;
      if (err) console.warn('No se pudo guardar en el navegador:', err);
      if (sincronizarDeNuevo) { sincronizarDeNuevo = false; sincronizarPartidas(listo); }
      else if (listo) listo();
    });
  }

  function montarPartidas() {
    var FS = window.Module.FS;
    FS.mkdir(CARPETA_PARTIDAS);
    FS.mount(window.Module.IDBFS, {}, CARPETA_PARTIDAS);
    FS.chdir(CARPETA_PARTIDAS);
    window.Module.ENV.HOME = CARPETA_PARTIDAS;
    window.Module.ENV.DOOMWADDIR = '/';
    // El motor espera a que se lean las partidas guardadas.
    window.Module.addRunDependency('doom-partidas');
    FS.syncfs(true, function (err) {
      if (err) console.warn('No se pudieron leer las partidas guardadas:', err);
      window.Module.removeRunDependency('doom-partidas');
    });
  }

  // Borra la base IndexedDB de Emscripten sin necesidad de cargar el motor.
  function borrarPartidas() {
    if (!confirm('¿Borrar todas las partidas guardadas y la configuración de DOOM en este navegador?')) return;
    try {
      var peticion = indexedDB.deleteDatabase(CARPETA_PARTIDAS);
      peticion.onsuccess = function () { alert('Partidas borradas.'); };
      peticion.onerror = function () { alert('No se pudieron borrar las partidas.'); };
    } catch (e) {
      alert('Este navegador no permite borrar las partidas.');
    }
  }

  function estadoMotor(texto, esError) {
    $('overlay').hidden = false;
    $('overlay').classList.toggle('error', !!esError);
    $('estado-motor').textContent = texto;
  }

  function cargarMotor() {
    var canvas = $('canvas');
    var primerCuadro = true;

    if (location.protocol === 'file:') {
      estadoMotor('Error: abre la página desde un servidor web (por ejemplo: python -m http.server). ' +
        'El navegador no permite cargar WebAssembly desde file://', true);
      return;
    }

    window.Module = {
      canvas: canvas,
      arguments: [],
      preRun: [montarPartidas],
      // doom.js, doom.wasm y doom.data están en la carpeta doom/.
      locateFile: function (ruta) { return 'doom/' + ruta; },

      // Lo llama M_WriteFile (m_misc.c) después de cada guardado.
      doomSyncSaves: function () { sincronizarPartidas(); },

      print: function (texto) {
        console.log(texto);
        if (primerCuadro) $('estado-motor').textContent = texto;
      },
      printErr: function (texto) { console.warn(texto); },

      // Emscripten informa la descarga como "Downloading data... (x/y)".
      setStatus: function (texto) {
        var m = texto && texto.match(/\((\d+(\.\d+)?)\/(\d+)\)/);
        if (m) {
          $('progreso').hidden = false;
          $('progreso').value = (100 * m[1]) / m[3];
          $('estado-motor').textContent = 'Descargando datos…';
        } else if (texto) {
          $('estado-motor').textContent = texto;
        }
      },
      onRuntimeInitialized: function () {
        $('progreso').hidden = true;
        $('estado-motor').textContent = 'Iniciando…';
      },
      // Lo llama I_Error (i_system.c).
      doomError: function (texto) { estadoMotor('Error: ' + texto, true); },
      onAbort: function (que) { estadoMotor('Error: ' + que, true); },
      onExit: function (codigo) {
        motorListo = false;
        if (codigo === 0) estadoMotor('Fin del juego. Recarga la página para volver al lobby.');
      }
    };

    // El motor pide el contexto 2D al dibujar el primer cuadro: ahí ya
    // escucha el teclado y se puede quitar la pantalla de carga.
    var getContextOriginal = canvas.getContext.bind(canvas);
    canvas.getContext = function (tipo, opciones) {
      if (primerCuadro) {
        primerCuadro = false;
        motorListo = true;
        $('overlay').hidden = true;
      }
      return getContextOriginal(tipo, opciones);
    };

    var script = document.createElement('script');
    script.src = 'doom/doom.js';
    script.onerror = function () {
      estadoMotor('Error: no se encontró doom/doom.js. Compila primero con doom/build-web.sh', true);
    };
    document.body.appendChild(script);
  }

  // ------------------------------------------------------------- inicio

  prepararLobby();
  dibujar();
  conectarBroker();
  setInterval(revisarDesconectados, 2000);
})();
