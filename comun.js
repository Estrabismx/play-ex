// Definiciones compartidas por la pantalla del PC (main.js) y el control
// del celular (control.js): controles, sensores, gestos, temas MQTT y conexión.

(function () {
  'use strict';

  var MAX_JUGADORES = 7;

  var SENSORES = {
    giroscopio: 'Giroscopio',
    acelerometro: 'Acelerómetro',
    tactil: 'Pantalla táctil',
    microfono: 'Micrófono'
  };

  // Controles de la partida. "teclas" son los KeyboardEvent.code que el PC
  // envía al motor de DOOM. En los ejes, teclas[0] corresponde a
  // etiquetas[0] y teclas[1] a etiquetas[1].
  // El menú de DOOM ya no es un control: se maneja con el teclado del PC.
  var CONTROLES = [
    {
      id: 'mover', nombre: 'Moverse (avanzar / retroceder)', tipo: 'eje',
      teclas: ['ArrowUp', 'ArrowDown'], etiquetas: ['Avanzar', 'Retroceder'],
      sensores: ['giroscopio', 'acelerometro', 'tactil', 'microfono']
    },
    {
      // Usa los gestos de "moverse lateralmente", pero en el juego gira.
      id: 'lateral', nombre: 'Moverse lateralmente (girar)', tipo: 'eje',
      teclas: ['ArrowLeft', 'ArrowRight'], etiquetas: ['Izquierda', 'Derecha'],
      sensores: ['giroscopio', 'acelerometro', 'tactil', 'microfono']
    },
    {
      id: 'disparar', nombre: 'Disparar', tipo: 'boton', duracion: 400,
      teclas: ['ControlRight'], sensores: ['giroscopio', 'acelerometro', 'tactil', 'microfono']
    },
    {
      id: 'usar', nombre: 'Abrir puertas / usar', tipo: 'boton', duracion: 200,
      teclas: ['Space'], sensores: ['giroscopio', 'acelerometro', 'tactil', 'microfono']
    },
    {
      id: 'correr', nombre: 'Correr', tipo: 'boton',
      teclas: ['ShiftRight'], sensores: ['giroscopio', 'acelerometro', 'tactil', 'microfono']
    },
    {
      id: 'arma', nombre: 'Cambiar arma', tipo: 'arma',
      teclas: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7'],
      sensores: ['tactil']
    },
    {
      id: 'mapa', nombre: 'Mapa', tipo: 'boton', duracion: 150,
      teclas: ['Tab'], sensores: ['tactil', 'microfono']
    }
  ];

  // Nombre corto de cada tecla para los indicadores del celular.
  var NOMBRES_TECLAS = {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    ControlRight: 'Ctrl', Space: 'Espacio', ShiftRight: 'Shift', Tab: 'Tab',
    Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5', Digit6: '6', Digit7: '7'
  };

  var ARMAS = ['Puño / motosierra', 'Pistola', 'Escopeta', 'Ametralladora',
               'Lanzacohetes', 'Rifle de plasma', 'BFG 9000'];

  // Gesto físico de cada combinación control/sensor. Un mismo celular no
  // puede tener dos controles que compartan un gesto (se activarían juntos).
  var GESTOS = {
    'mover/giroscopio': ['inclinar-adelante'],
    'mover/acelerometro': ['inclinar-adelante'],
    'mover/microfono': ['frecuencia'],
    'lateral/giroscopio': ['inclinar-lados'],
    'lateral/acelerometro': ['inclinar-lados'],
    'lateral/microfono': ['volumen'],
    'disparar/giroscopio': ['inclinar-lados', 'brusco'],
    'disparar/acelerometro': ['brusco'],
    'disparar/microfono': ['volumen'],
    'usar/giroscopio': ['inclinar-adelante', 'brusco'],
    'usar/acelerometro': ['brusco'],
    'usar/microfono': ['volumen'],
    'correr/giroscopio': ['inclinar-adelante'],
    'correr/acelerometro': ['inclinar-adelante'],
    'correr/microfono': ['volumen'],
    'mapa/microfono': ['frecuencia']
    // Pantalla táctil: sus gestos están pensados para usarse a la vez.
  };

  // Devuelve el control (de "propios": [{control, sensor}]) que choca con
  // elegir controlId/sensor, o null si no hay conflicto.
  function conflicto(propios, controlId, sensor) {
    var gestos = GESTOS[controlId + '/' + sensor] || [];
    for (var i = 0; i < propios.length; i++) {
      var p = propios[i];
      if (p.control === controlId) continue;
      var otros = GESTOS[p.control + '/' + p.sensor] || [];
      if (gestos.some(function (g) { return otros.indexOf(g) >= 0; })) return p.control;
    }
    return null;
  }

  // Cómo se maneja cada control con cada sensor (se muestra en el celular).
  var DESCRIPCIONES = {
    'mover/giroscopio': 'Inclina el celular hacia adelante para avanzar y hacia atrás para retroceder.',
    'mover/acelerometro': 'Inclina el celular hacia adelante o hacia atrás (medido con la gravedad).',
    'mover/tactil': 'Joystick virtual: apoya un dedo en cualquier parte y deslízalo hacia arriba o abajo.',
    'mover/microfono': 'Haz sonar una nota dentro del rango de frecuencias para avanzar; fuera del rango retrocedes. En silencio te detienes.',
    'lateral/giroscopio': 'Inclina el celular hacia los lados para girar.',
    'lateral/acelerometro': 'Inclina el celular hacia los lados para girar (medido con la gravedad).',
    'lateral/tactil': 'Joystick virtual: apoya un dedo en cualquier parte y deslízalo a izquierda o derecha.',
    'lateral/microfono': 'Sonido fuerte: gira a la derecha. Sonido suave: gira a la izquierda. En silencio no gira.',
    'disparar/giroscopio': 'Haz un giro rápido y breve del celular hacia un lado.',
    'disparar/acelerometro': 'Haz un movimiento rápido con el celular.',
    'disparar/tactil': 'Apoya un segundo dedo en la pantalla (también mientras usas el joystick).',
    'disparar/microfono': 'Grita: dispara mientras el sonido supere el umbral.',
    'usar/giroscopio': 'Haz un giro rápido y breve del celular hacia adelante o atrás.',
    'usar/acelerometro': 'Mueve el celular rápido hacia adelante o hacia atrás.',
    'usar/tactil': 'Toca dos veces en el mismo lugar (en menos de 0,9 s).',
    'usar/microfono': 'Haz un sonido suave (más fuerte que el ruido, más bajo que un grito).',
    'correr/giroscopio': 'Inclina mucho el celular hacia adelante.',
    'correr/acelerometro': 'Inclina mucho el celular hacia adelante (medido con la gravedad).',
    'correr/tactil': 'Desliza dos dedos juntos hacia arriba.',
    'correr/microfono': 'Haz un sonido fuerte: corres mientras dure.',
    'arma/tactil': 'Carrusel ◀ [arma] ▶: cada toque selecciona la anterior o la siguiente.',
    'mapa/tactil': 'Botón Mapa (esquina inferior izquierda): abre o cierra el mapa.',
    'mapa/microfono': 'Haz un sonido grave para abrir o cerrar el mapa.'
  };

  // Umbrales por defecto: cada celular los puede cambiar en la pausa general.
  var AJUSTES = [
    { id: 'inclinacion', nombre: 'Inclinación para moverse / girar', unidad: '°', valor: 15, sensores: ['giroscopio', 'acelerometro'], controles: ['mover', 'lateral'], lectura: 'inclinacion' },
    { id: 'inclinacionCorrer', nombre: 'Inclinación para correr', unidad: '°', valor: 35, sensores: ['giroscopio', 'acelerometro'], controles: ['correr'], lectura: 'inclinacion' },
    { id: 'giroBrusco', nombre: 'Velocidad del giro rápido', unidad: '°/s', valor: 250, sensores: ['giroscopio'], controles: ['disparar', 'usar'], lectura: 'giro' },
    { id: 'confirmacion', nombre: 'Aceleración que confirma el giro rápido', unidad: 'm/s²', valor: 4, sensores: ['giroscopio'], controles: ['disparar', 'usar'], lectura: 'aceleracion' },
    { id: 'movimientoBrusco', nombre: 'Aceleración del movimiento rápido', unidad: 'm/s²', valor: 12, sensores: ['acelerometro'], controles: ['disparar', 'usar'], lectura: 'aceleracion' },
    { id: 'micPiso', nombre: 'Ruido de fondo (bajo esto es silencio)', unidad: 'dB', valor: -50, sensores: ['microfono'], controles: ['mover', 'lateral', 'usar', 'mapa'], lectura: 'volumen' },
    { id: 'micMedio', nombre: 'Límite suave / fuerte para girar', unidad: 'dB', valor: -30, sensores: ['microfono'], controles: ['lateral'], lectura: 'volumen' },
    { id: 'micCorrer', nombre: 'Sonido fuerte para correr', unidad: 'dB', valor: -20, sensores: ['microfono'], controles: ['correr'], lectura: 'volumen' },
    { id: 'micDisparo', nombre: 'Grito para disparar (y techo de "usar")', unidad: 'dB', valor: -12, sensores: ['microfono'], controles: ['disparar', 'usar'], lectura: 'volumen' },
    { id: 'frecMin', nombre: 'Frecuencia mínima para avanzar', unidad: 'Hz', valor: 250, sensores: ['microfono'], controles: ['mover'], lectura: 'frecuencia' },
    { id: 'frecMax', nombre: 'Frecuencia máxima para avanzar', unidad: 'Hz', valor: 800, sensores: ['microfono'], controles: ['mover'], lectura: 'frecuencia' },
    { id: 'frecGrave', nombre: 'Sonido grave para el mapa (bajo esto)', unidad: 'Hz', valor: 150, sensores: ['microfono'], controles: ['mapa'], lectura: 'frecuencia' },
    { id: 'zonaMuerta', nombre: 'Zona muerta del joystick', unidad: 'px', valor: 30, sensores: ['tactil'], controles: ['mover', 'lateral'], lectura: null }
  ];

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
      estado: base + '/estado',      // PC -> celulares (retenido): fase, jugadores y asignaciones
      host: base + '/host',          // celulares -> PC: unirse, elegir, soltar, listo, ping, salir
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
    NOMBRES_TECLAS: NOMBRES_TECLAS,
    ARMAS: ARMAS,
    AJUSTES: AJUSTES,
    control: control,
    conflicto: conflicto,
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
