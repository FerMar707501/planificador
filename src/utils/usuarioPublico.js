/**
 * Representación pública unificada del usuario, usada por
 * register/login (auth.service) y por /users/me (usuario.controller)
 * para mantener el mismo shape en toda la API.
 */
function usuarioPublico(usuario) {
  return {
    idUsuario: usuario.idUsuario,
    nombreUsuario: usuario.nombreUsuario,
    correo: usuario.correo,
    nombreCompleto: usuario.nombreCompleto,
    telefono: usuario.telefono,
    rol: usuario.rol,
  };
}

module.exports = usuarioPublico;
