// Pantalla del PC: crea la sala, coordina el lobby por MQTT y corre DOOM.
//
// El PC es la autoridad: los celulares piden controles y el PC decide.
// Durante la partida, cada mensaje de input de un celular se valida
// (¿ese jugador es dueño de ese control? ¿esa tecla es de ese control?) y
// se traduce en un KeyboardEvent sintético que el motor de DOOM escucha.
//
// El teclado del PC solo maneja el menú de DOOM (Esc, flechas/WASD, Enter,
// Y/N) y la pausa general (Espacio). Para saber si el menú está abierto se
// usan las funciones que agrega doom/linuxdoom-1.10/doomy_web.c.

(function () {
  'use strict';

  var D = window.DOOMY;
  var $ = function (id) { return document.getElementById(id); };
  var todos = function (selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); };

  var TIEMPO_SIN_SENAL = 8000;   // ms sin ping para dar por desconectado a un celular

  // Bits de Module._doomy_estado() (ver doomy_web.c).
  var MENU_ABIERTO = 1, ESCRIBIENDO = 2, EN_NIVEL = 8;

  var TECLAS_MENU = ['Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'KeyY', 'KeyN', 'Backspace'];
  var WASD = { KeyW: 'ArrowUp', KeyA: 'ArrowLeft', KeyS: 'ArrowDown', KeyD: 'ArrowRight' };

  // ---------------------------------------------------------------- sala

  function crearCodigoSala() {
    return D.idAleatorio(5, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
  }

  // La sala se recuerda en el navegador: recargar la página no cambia el QR.
  var sala = D.limpiarSala(D.leer('doomy.sala')) || crearCodigoSala();
  D.guardar('doomy.sala', sala);
  var T = D.temas(sala);

  // fase: 'lobby' | 'juego' | 'pausa'
  // jugadores[id] = { nombre, listo, visto }
  // asignacion[controlId] = { jugador, sensor }
  var estado = { fase: 'lobby', jugadores: {}, asignacion: {}, motivoPausa: '' };

  // Al "volver al lobby" la página se recarga: se recuperan jugadores y controles.
  (function recuperarLobby() {
    var guardado;
    try { guardado = JSON.parse(sessionStorage.getItem('doomy.lobby')); sessionStorage.removeItem('doomy.lobby'); } catch (e) { guardado = null; }
    if (!guardado || guardado.sala !== sala) return;
    Object.keys(guardado.jugadores || {}).forEach(function (id) {
      estado.jugadores[id] = { nombre: guardado.jugadores[id].nombre, listo: false, visto: Date.now() };
    });
    estado.asignacion = guardado.asignacion || {};
  })();

  var cliente = null;
  var motorListo = false;
  var motorCompleto = false;   // el motor tiene las funciones de doomy_web.c
  var menuAbierto = false;
  var menuSupuesto = false;    // si el motor no tiene doomy_web.c: se adivina con Esc

  // ------------------------------------------------- teclas hacia el motor

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

  // Una misma tecla puede estar presionada por varias fuentes. El motor
  // recibe keydown con la primera fuente y keyup cuando se suelta la última.
  var presionadas = {};   // code -> { "jugador|control": true }

  function tecla(code, abajo, fuente) {
    var fuentes = presionadas[code] || (presionadas[code] = {});
    var antes = Object.keys(fuentes).length > 0;
    if (abajo) fuentes[fuente] = true; else delete fuentes[fuente];
    var ahora = Object.keys(fuentes).length > 0;
    if (antes !== ahora) enviarAlMotor(code, ahora);
    if (fuente.indexOf('pc|') !== 0) pedirDibujoAcciones();
  }

  // ------------------------------------- lo que hace cada jugador (en el PC)

  var dibujoAccionesPendiente = false;
  function pedirDibujoAcciones() {
    if (dibujoAccionesPendiente) return;
    dibujoAccionesPendiente = true;
    requestAnimationFrame(function () {
      dibujoAccionesPendiente = false;
      dibujarAcciones();
    });
  }

  // A la derecha del juego: una columna por jugador con sus controles,
  // resaltando en vivo la acción que está ejecutando cada uno.
  function dibujarAcciones() {
    var contenedor = $('acciones');
    contenedor.textContent = '';
    Object.keys(estado.jugadores).forEach(function (id) {
      var columna = elemento('div');
      columna.className = 'columna';
      columna.appendChild(elemento('strong', estado.jugadores[id].nombre));
      var propios = controlesDe(id);
      if (!propios.length) columna.appendChild(elemento('small', 'Sin controles'));
      propios.forEach(function (c) {
        var activas = c.teclas.filter(function (code) {
          return presionadas[code] && presionadas[code][id + '|' + c.id];
        });
        var accion = elemento('div');
        accion.className = activas.length ? 'accion activa' : 'accion';
        accion.appendChild(elemento('span', c.corto));
        accion.appendChild(elemento('small', D.SENSORES[estado.asignacion[c.id].sensor]));
        accion.appendChild(elemento('b', activas.length
          ? activas.map(function (code) { return D.NOMBRES_TECLAS[code] || code; }).join(' ')
          : '·'));
        columna.appendChild(accion);
      });
      contenedor.appendChild(columna);
    });
  }

  // Suelta las teclas cuyas fuentes cumplan la condición.
  function soltarSi(condicion) {
    Object.keys(presionadas).forEach(function (code) {
      Object.keys(presionadas[code]).forEach(function (fuente) {
        if (condicion(fuente.split('|'))) tecla(code, false, fuente);
      });
    });
  }

  function soltarJugador(id) { soltarSi(function (f) { return f[0] === id; }); }
  function soltarCelulares() { soltarSi(function (f) { return f[0] !== 'pc'; }); }

  // ------------------------------------------------------- estado del motor

  function estadoDelMotor() {
    return motorListo && motorCompleto ? window.Module._doomy_estado() : null;
  }

  function pausarMotor(pausar) {
    if (motorListo && motorCompleto) window.Module._doomy_pausar(pausar ? 1 : 0);
  }

  // Revisa si el menú de DOOM se abrió: mientras está abierto, los
  // celulares no envían nada (el menú lo maneja solo el PC).
  setInterval(function () {
    var em = estadoDelMotor();
    var abierto = em === null ? menuSupuesto : !!(em & MENU_ABIERTO);
    if (abierto && !menuAbierto) soltarCelulares();
    menuAbierto = abierto;
  }, 100);

  // ------------------------------------------------------ teclado del PC

  function reenviar(e, code) {
    e.preventDefault();
    if (e.type === 'keydown' && e.repeat) return;
    tecla(code, e.type === 'keydown', 'pc|teclado');
  }

  // Se registra antes de cargar doom.js para ejecutarse antes que el motor:
  // ninguna tecla física llega al motor sin pasar por aquí. Las teclas de
  // los celulares son eventos sintéticos (isTrusted = false) y pasan directo.
  function alTeclado(e) {
    if (!e.isTrusted || estado.fase === 'lobby') return;
    e.stopImmediatePropagation();
    if (e.type === 'keypress') return;

    var em = estadoDelMotor();
    var escribiendo = em !== null && !!(em & ESCRIBIENDO);

    if (e.code === 'Space' && !menuAbierto) {
      e.preventDefault();
      if (e.type === 'keydown' && !e.repeat) alternarPausa();
      return;
    }
    if (estado.fase === 'pausa') return;     // en la pausa general DOOM no recibe teclas

    if (escribiendo) return reenviar(e, e.code);   // nombre de partida: pasan todas las teclas
    if (e.code === 'Escape') {
      if (em === null && e.type === 'keydown') menuSupuesto = !menuSupuesto;
      return reenviar(e, 'Escape');
    }
    if (!menuAbierto) return;
    var code = WASD[e.code] || e.code;
    if (TECLAS_MENU.indexOf(code) >= 0) reenviar(e, code);
  }

  ['keydown', 'keyup', 'keypress'].forEach(function (tipo) {
    window.addEventListener(tipo, alTeclado, true);
  });

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
      motivoPausa: estado.motivoPausa,
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

  // [{ control, sensor }] de un jugador (para revisar conflictos).
  function asignacionesDe(id) {
    return controlesDe(id).map(function (c) {
      return { control: c.id, sensor: estado.asignacion[c.id].sensor };
    });
  }

  function puedeElegir() {
    return estado.fase === 'lobby' || estado.fase === 'pausa';
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

    if (!j || !puedeElegir()) return;

    if (p.tipo === 'listo') {
      j.listo = !!p.valor;
      publicarEstado();
    } else if (p.tipo === 'elegir') {
      elegir(p);
    } else if (p.tipo === 'soltar') {
      var a = estado.asignacion[p.control];
      if (a && a.jugador === p.id) {
        var problema = D.conflictoAlSoltar(asignacionesDe(p.id), p.control);
        if (problema) return rechazar(p.id, 'No puedes soltar ' + D.control(p.control).nombre + ': ' + problema + '.');
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
      registrar(nombre + ' se unió' + (estado.fase === 'juego' ? ' (podrá elegir controles en la pausa general)' : ''));
    }
    j.nombre = nombre;
    publicar(T.jugador(p.id), { tipo: 'bienvenida' });
    publicarEstado();
  }

  function rechazar(id, motivo) {
    publicar(T.jugador(id), { tipo: 'rechazo', motivo: motivo });
  }

  function elegir(p) {
    var c = D.control(p.control);
    if (!c || c.sensores.indexOf(p.sensor) < 0) return;
    var a = estado.asignacion[c.id];
    if (a && a.jugador !== p.id) {
      return rechazar(p.id, c.nombre + ' ya lo tiene otro jugador.');
    }
    // Un mismo celular no puede tener controles que interfieran entre sí.
    var choque = D.conflicto(asignacionesDe(p.id), c.id, p.sensor);
    if (choque) {
      return rechazar(p.id, c.nombre + ' con ' + D.SENSORES[p.sensor] + ': ' + choque + '. Elige otro sensor.');
    }
    estado.asignacion[c.id] = { jugador: p.id, sensor: p.sensor };
    estado.jugadores[p.id].listo = false;
    publicarEstado();
  }

  function quitarJugador(id, motivo) {
    var j = estado.jugadores[id];
    if (!j) return;
    soltarJugador(id);
    delete estado.jugadores[id];
    var libres = controlesDe(id);
    libres.forEach(function (c) { delete estado.asignacion[c.id]; });
    var texto = j.nombre + ' ' + motivo;
    if (libres.length) texto += ': quedan libres ' + libres.map(function (c) { return c.nombre; }).join(', ');
    registrar(texto);
    // En plena partida se abre la pausa general para repartir sus controles.
    if (estado.fase === 'juego' && libres.length) entrarPausa(texto);
    else publicarEstado();
  }

  function revisarDesconectados() {
    var ahora = Date.now();
    Object.keys(estado.jugadores).forEach(function (id) {
      if (ahora - estado.jugadores[id].visto > TIEMPO_SIN_SENAL) quitarJugador(id, 'se desconectó');
    });
  }

  // Devuelve null si se puede iniciar o continuar, o el motivo por el que no.
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

  // ------------------------------------------------------- pausa general

  function entrarPausa(motivo) {
    if (estado.fase !== 'juego') return;
    estado.fase = 'pausa';
    estado.motivoPausa = motivo || 'Pausa abierta desde el PC.';
    // Todos deben volver a confirmar (y recalibrar) antes de continuar.
    Object.keys(estado.jugadores).forEach(function (id) { estado.jugadores[id].listo = false; });
    soltarCelulares();
    soltarSi(function (f) { return f[0] === 'pc'; });
    pausarMotor(true);
    publicarEstado();
  }

  function salirPausa() {
    if (estado.fase !== 'pausa' || motivoParaNoIniciar()) return;
    estado.fase = 'juego';
    estado.motivoPausa = '';
    pausarMotor(false);
    publicarEstado();
    quitarFoco();
  }

  function alternarPausa() {
    if (estado.fase === 'juego') entrarPausa();
    else if (estado.fase === 'pausa') salirPausa();
  }

  // Guarda la partida (si hay una en curso) y recarga la página en el lobby,
  // conservando jugadores y controles.
  function volverAlLobby() {
    if (!confirm('¿Volver al lobby? La partida se guardará automáticamente.')) return;
    var guardo = false;
    if (motorListo && motorCompleto) {
      try { guardo = window.Module._doomy_autoguardar() === 1; } catch (e) { guardo = false; }
    }
    var recargar = function () {
      var jugadores = {};
      Object.keys(estado.jugadores).forEach(function (id) { jugadores[id] = { nombre: estado.jugadores[id].nombre }; });
      try {
        sessionStorage.setItem('doomy.lobby', JSON.stringify({ sala: sala, jugadores: jugadores, asignacion: estado.asignacion }));
      } catch (e) { /* sin almacenamiento: los jugadores vuelven a unirse solos */ }
      location.reload();
    };
    if (guardo) {
      D.guardar('doomy.autoguardado', '1');
      sincronizarPartidas(recargar);
    } else {
      recargar();
    }
  }

  // -------------------------------------------------------------- input

  function recibirInput(m) {
    if (estado.fase !== 'juego' || menuAbierto || !estado.jugadores[m.id]) return;
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

  // La vista de juego solo muestra la partida: el registro va a la consola.
  function registrar(texto) {
    console.log(new Date().toLocaleTimeString() + ' · ' + texto);
  }

  function elemento(etiqueta, texto) {
    var e = document.createElement(etiqueta);
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  // El foco en un botón haría que Espacio lo "presione".
  function quitarFoco() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function dibujar() {
    var ids = Object.keys(estado.jugadores);

    todos('.lista-jugadores').forEach(function (lista) {
      lista.textContent = '';
      if (!ids.length) lista.appendChild(elemento('li', 'Nadie todavía.'));
      ids.forEach(function (id) {
        var j = estado.jugadores[id];
        var n = controlesDe(id).length;
        lista.appendChild(elemento('li', j.nombre + ' · ' + n + (n === 1 ? ' control' : ' controles') +
          (estado.fase !== 'juego' ? (j.listo ? ' · listo' : ' · eligiendo') : '')));
      });
    });

    todos('.tabla-controles').forEach(function (tabla) {
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
    });

    var motivo = estado.fase === 'juego' ? null : motivoParaNoIniciar();
    todos('.motivo').forEach(function (p) { p.textContent = motivo || ''; });

    $('iniciar').disabled = !!motivo;
    $('continuar').hidden = D.leer('doomy.autoguardado') !== '1';
    $('continuar').disabled = !!motivo;

    dibujarAcciones();
    $('pausa').hidden = estado.fase !== 'pausa';
    $('motivo-pausa').textContent = estado.motivoPausa;
    $('reanudar').disabled = !!motivo;
  }

  function prepararLobby() {
    $('codigo-sala').textContent = sala;
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
    $('iniciar').addEventListener('click', function () { iniciarPartida(false); });
    $('continuar').addEventListener('click', function () { iniciarPartida(true); });
    $('reanudar').addEventListener('click', salirPausa);
    $('volver-lobby').addEventListener('click', volverAlLobby);
  }

  function iniciarPartida(continuar) {
    if (motivoParaNoIniciar()) return;
    estado.fase = 'juego';
    publicarEstado();
    $('lobby').hidden = true;
    $('juego').hidden = false;
    document.body.classList.add('jugando');
    quitarFoco();
    registrar(continuar
      ? 'Cargando la partida guardada…'
      : 'Partida iniciada. Presiona Esc en el PC y elige "New Game".');
    // El motor se carga recién aquí: el clic en "Iniciar" habilita el audio del navegador.
    // La ranura 5 es la del autoguardado (ver doomy_web.c).
    cargarMotor(continuar ? ['-loadgame', '5'] : []);
  }

  // --------------------------------------------------- motor de DOOM

  // Las partidas guardadas y la configuración viven en /save, una carpeta
  // respaldada por el IndexedDB del navegador.
  var CARPETA_PARTIDAS = '/save';
  var sincronizando = false;
  var pendientes = null;       // callbacks a avisar cuando termine la próxima sincronización

  function sincronizarPartidas(listo) {
    if (sincronizando) {
      pendientes = pendientes || [];
      if (listo) pendientes.push(listo);
      return;
    }
    sincronizando = true;
    window.Module.FS.syncfs(false, function (err) {
      sincronizando = false;
      if (err) console.warn('No se pudo guardar en el navegador:', err);
      if (listo) listo();
      if (pendientes) {
        var siguientes = pendientes;
        pendientes = null;
        sincronizarPartidas(function () { siguientes.forEach(function (f) { f(); }); });
      }
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
    if (!confirm('¿Borrar todas las partidas guardadas (incluido el autoguardado) y la configuración de DOOM en este navegador?')) return;
    try {
      var peticion = indexedDB.deleteDatabase(CARPETA_PARTIDAS);
      peticion.onsuccess = function () {
        D.guardar('doomy.autoguardado', '0');
        dibujar();
        alert('Partidas borradas.');
      };
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

  function cargarMotor(argumentos) {
    var canvas = $('canvas');
    var primerCuadro = true;

    if (location.protocol === 'file:') {
      estadoMotor('Error: abre la página desde un servidor web (por ejemplo: python -m http.server). ' +
        'El navegador no permite cargar WebAssembly desde file://', true);
      return;
    }

    window.Module = {
      canvas: canvas,
      arguments: argumentos,
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
        motorCompleto = typeof window.Module._doomy_estado === 'function';
        if (!motorCompleto) {
          $('aviso-motor').hidden = false;
          $('aviso-motor').textContent = 'El motor de DOOM no está recompilado con doomy_web.c: ' +
            'la pausa no detiene el juego, el autoguardado no funciona y el menú se detecta de forma aproximada. ' +
            'Recompila con doom/build-web.sh (ver INSTRUCCIONES.md).';
        }
        if (estado.fase === 'pausa') pausarMotor(true);
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
