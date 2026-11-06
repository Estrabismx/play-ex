// Definiciones compartidas por la pantalla del PC (main.js) y el control
// del celular (control.js): controles, sensores, temas MQTT y conexión.

(function () {
  'use strict';

  var MAX_JUGADORES = 5;

  var SENSORES = {
    giroscopio: 'Giroscopio',
    acelerometro: 'Acelerómetro',
    tactil: 'Pantalla táctil'
  };

  // Controles de la partida. "teclas" son los KeyboardEvent.code que el PC
  // envía al motor de DOOM. En los ejes, teclas[0] corresponde a
  // etiquetas[0] (valor positivo) y teclas[1] a etiquetas[1] (negativo).
  var CONTROLES = [
    {
      id: 'mover', nombre: 'Moverse', tipo: 'eje',
      teclas: ['ArrowUp', 'ArrowDown'], etiquetas: ['Avanzar', 'Retroceder'],
      sensores: ['giroscopio', 'acelerometro', 'tactil']
    },
    {
      id: 'girar', nombre: 'Girar', tipo: 'eje',
      teclas: ['ArrowLeft', 'ArrowRight'], etiquetas: ['Izquierda', 'Derecha'],
      sensores: ['giroscopio', 'acelerometro', 'tactil']
    },
    {
      id: 'lateral', nombre: 'Desplazarse lateralmente', tipo: 'eje',
      teclas: ['Comma', 'Period'], etiquetas: ['Izquierda', 'Derecha'],
      sensores: ['giroscopio', 'acelerometro', 'tactil']
    },
    {
      id: 'disparar', nombre: 'Disparar', tipo: 'boton', accion: 'pulso', duracion: 400,
      teclas: ['ControlRight'], sensores: ['tactil', 'acelerometro', 'giroscopio']
    },
    {
      id: 'usar', nombre: 'Abrir puertas / usar', tipo: 'boton', accion: 'pulso', duracion: 200,
      teclas: ['Space'], sensores: ['tactil', 'acelerometro', 'giroscopio']
    },
    {
      id: 'correr', nombre: 'Correr', tipo: 'boton', accion: 'alternar',
      teclas: ['ShiftRight'], sensores: ['tactil', 'acelerometro', 'giroscopio']
    },
    {
      id: 'arma', nombre: 'Cambiar arma', tipo: 'arma',
      teclas: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7'],
      sensores: ['tactil', 'acelerometro', 'giroscopio']
    },
    {
      id: 'mapa', nombre: 'Mapa', tipo: 'boton', accion: 'pulso', duracion: 150,
      teclas: ['Tab'], sensores: ['tactil', 'acelerometro', 'giroscopio']
    },
    {
      id: 'menu', nombre: 'Menú', tipo: 'menu',
      // Navegación del menú + letras para escribir el nombre de una partida guardada.
      teclas: ['Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter',
               'KeyY', 'KeyN', 'Backspace', 'KeyD', 'KeyO', 'KeyM'],
      sensores: ['tactil']
    }
  ];

  // Cómo se maneja cada control con cada sensor (se muestra en el celular).
  // Mapeo provisorio: la tabla definitiva se documentará en el README.
  var DESCRIPCIONES = {
    'mover/giroscopio': 'Inclina la parte de arriba del celular hacia adelante para avanzar y hacia ti para retroceder.',
    'mover/acelerometro': 'Igual que el giroscopio pero calculado con la gravedad: inclina hacia adelante / hacia ti.',
    'mover/tactil': 'Mantén presionado Avanzar o Retroceder.',
    'girar/giroscopio': 'Inclina el celular hacia la izquierda o la derecha (como un volante).',
    'girar/acelerometro': 'Igual que el giroscopio pero calculado con la gravedad: inclina a izquierda / derecha.',
    'girar/tactil': 'Mantén presionado Izquierda o Derecha.',
    'lateral/giroscopio': 'Gira el celular sobre sí mismo, como girando una perilla, a izquierda o derecha.',
    'lateral/acelerometro': 'Mueve el celular de golpe hacia la izquierda o la derecha.',
    'lateral/tactil': 'Mantén presionado Izquierda o Derecha.',
    'disparar/tactil': 'Mantén presionado el botón para disparar.',
    'disparar/acelerometro': 'Sacude el celular para disparar.',
    'disparar/giroscopio': 'Gira el celular bruscamente para disparar.',
    'usar/tactil': 'Toca el botón para abrir puertas o activar interruptores.',
    'usar/acelerometro': 'Sacude el celular para usar.',
    'usar/giroscopio': 'Gira el celular bruscamente para usar.',
    'correr/tactil': 'Mantén presionado el botón para correr.',
    'correr/acelerometro': 'Sacude el celular para empezar o dejar de correr.',
    'correr/giroscopio': 'Gira el celular bruscamente para empezar o dejar de correr.',
    'arma/tactil': 'Toca el número del arma (1 a 7).',
    'arma/acelerometro': 'Sacude el celular para pasar a la siguiente arma.',
    'arma/giroscopio': 'Gira el celular bruscamente para pasar a la siguiente arma.',
    'mapa/tactil': 'Toca el botón para abrir o cerrar el mapa.',
    'mapa/acelerometro': 'Sacude el celular para abrir o cerrar el mapa.',
    'mapa/giroscopio': 'Gira el celular bruscamente para abrir o cerrar el mapa.',
    'menu/tactil': 'Botones para abrir el menú, moverse por él, aceptar y responder Sí / No.'
  };

  function control(id) {
    for (var i = 0; i < CONTROLES.length; i++) {
      if (CONTROLES[i].id === id) return CONTROLES[i];
    }
    return null;
  }

  function descripcion(controlId, sensor) {
    return DESCRIPCIONES[controlId + '/' + sensor] || '';
  }

  // El código de sala va dentro del tema MQTT: solo letras y números.
  function limpiarSala(texto) {
    return String(texto || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  }

  function temas(sala) {
    var base = window.DOOMY_CONFIG.temaBase + '/' + sala;
    return {
      estado: base + '/estado',      // PC -> celulares (retenido): lobby y asignaciones
      host: base + '/host',          // celulares -> PC: unirse, elegir, listo, ping, salir
      input: base + '/input',        // celulares -> PC: teclas presionadas / soltadas
      jugador: function (id) {       // PC -> un celular: mensajes directos
        return base + '/jugador/' + id;
      }
    };
  }

  function idAleatorio(largo, alfabeto) {
    alfabeto = alfabeto || 'abcdefghijkmnpqrstuvwxyz23456789';
    var texto = '';
    for (var i = 0; i < largo; i++) {
      texto += alfabeto[Math.floor(Math.random() * alfabeto.length)];
    }
    return texto;
  }

  // localStorage puede fallar (modo privado, bloqueado): nunca romper por eso.
  function leer(clave) {
    try { return localStorage.getItem(clave); } catch (e) { return null; }
  }
  function guardar(clave, valor) {
    try { localStorage.setItem(clave, valor); } catch (e) { /* sin almacenamiento */ }
  }

  // Conecta al broker con las credenciales de config.js.
  function conectar(clientId, will) {
    var cfg = window.DOOMY_CONFIG && window.DOOMY_CONFIG.mqtt;
    if (!cfg) throw new Error('falta config.js');
    if (!window.mqtt) throw new Error('no se pudo cargar la librería MQTT (revisa tu conexión a internet)');
    if (!cfg.contrasena || cfg.contrasena === 'ESCRIBE_AQUI_LA_CONTRASENA') {
      throw new Error('falta la contraseña del broker en config.js');
    }
    return window.mqtt.connect(cfg.url, {
      clientId: clientId,
      username: cfg.usuario,
      password: cfg.contrasena,
      clean: true,
      keepalive: 10,
      reconnectPeriod: 2000,
      connectTimeout: 10000,
      will: will
    });
  }

  function explicarError(err) {
    var texto = String((err && err.message) || err);
    if (/not authori[sz]ed|bad user ?name|password/i.test(texto)) {
      return 'el broker rechazó las credenciales (' + texto + '). Revisa usuario y contraseña en config.js.';
    }
    return texto;
  }

  window.DOOMY = {
    MAX_JUGADORES: MAX_JUGADORES,
    SENSORES: SENSORES,
    CONTROLES: CONTROLES,
    control: control,
    descripcion: descripcion,
    limpiarSala: limpiarSala,
    temas: temas,
    idAleatorio: idAleatorio,
    leer: leer,
    guardar: guardar,
    conectar: conectar,
    explicarError: explicarError
  };
})();
