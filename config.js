// Configuración de conexión al broker MQTT (EMQX).
//
// El broker trabaja con lista blanca: solo acepta al usuario autorizado,
// solo por WebSocket seguro (wss, puerto 8084) y solo en los temas tacto/#.
//
// OJO: en GitHub Pages este archivo es público (cualquiera puede leerlo).
window.DOOMY_CONFIG = {
  mqtt: {
    url: 'wss://v1604705.ala.us-east-1.emqxsl.com:8084/mqtt',
    usuario: 'dommy',
    contrasena: 'k9#mP2$xL7!vQ4'
  },

  // Todos los temas del proyecto cuelgan de aquí: tacto/doomy/<sala>/...
  temaBase: 'tacto/doomy'
};
