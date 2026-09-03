const jwt = require('jsonwebtoken');

function obtenerSecreto() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no está configurado');
  }

  return process.env.JWT_SECRET;
}

function generarToken(usuario) {
  return jwt.sign(
    {
      idUsuario: usuario.idUsuario,
      rol: usuario.rol,
    },
    obtenerSecreto(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },
  );
}

function verificarToken(token) {
  return jwt.verify(token, obtenerSecreto());
}

module.exports = {
  generarToken,
  verificarToken,
};