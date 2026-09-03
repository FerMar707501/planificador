const { LogSistema, Usuario } = require('../models');

function usuarioAdmin(usuario) {
  return {
    idUsuario: usuario.idUsuario,
    nombreUsuario: usuario.nombreUsuario,
    correo: usuario.correo,
    nombreCompleto: usuario.nombreCompleto,
    telefono: usuario.telefono,
    rol: usuario.rol,
    esContrasenaTemporal: usuario.esContrasenaTemporal,
    activo: usuario.activo,
    ultimoLogin: usuario.ultimoLogin,
    createdAt: usuario.createdAt,
    updatedAt: usuario.updatedAt,
  };
}

async function listarLogs(req, res, next) {
  try {
    const logs = await LogSistema.findAll({
      include: [
        {
          model: Usuario,
          attributes: ['idUsuario', 'nombreUsuario', 'correo'],
        },
      ],
      order: [['fechaEvento', 'DESC']],
    });

    return res.status(200).json({ logs });
  } catch (error) {
    return next(error);
  }
}

async function listarUsuarios(req, res, next) {
  try {
    const usuarios = await Usuario.findAll({
      attributes: { exclude: ['contrasenaHash'] },
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({ usuarios: usuarios.map(usuarioAdmin) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listarLogs,
  listarUsuarios,
};
