const { Usuario } = require('../models');
const usuarioPublico = require('../utils/usuarioPublico');

async function obtenerPerfil(req, res, next) {
  try {
    const usuario = await Usuario.findByPk(req.usuario.idUsuario);

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario no autorizado' });
    }

    return res.status(200).json({ usuario: usuarioPublico(usuario) });
  } catch (error) {
    return next(error);
  }
}

async function actualizarPerfil(req, res, next) {
  try {
    const usuario = await Usuario.findByPk(req.usuario.idUsuario);

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario no autorizado' });
    }

    await usuario.update(req.body);
    return res.status(200).json({ usuario: usuarioPublico(usuario) });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    return next(error);
  }
}

module.exports = {
  actualizarPerfil,
  obtenerPerfil,
};