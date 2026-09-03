const bcrypt = require('bcrypt');
const { Usuario } = require('../models');
const {
  buscarUsuarioPorIdentificador,
  cambiarContrasena: cambiarContrasenaServicio,
  recuperarContrasena,
  registrarLog,
  registrarUsuario,
  usuarioPublico,
} = require('../services/auth.service');
const { generarToken } = require('../utils/jwt');

async function registrar(req, res, next) {
  try {
    const usuario = await registrarUsuario(req.body);

    return res.status(201).json({
      usuario: usuarioPublico(usuario),
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'El nombre de usuario o correo ya está registrado',
      });
    }

    return next(error);
  }
}

async function iniciarSesion(req, res, next) {
  try {
    const identificador = req.body.nombreUsuario || req.body.correo;
    const { contrasena } = req.body;
    const usuario = await buscarUsuarioPorIdentificador(identificador);
    const esValida =
      usuario &&
      usuario.activo &&
      (await bcrypt.compare(contrasena, usuario.contrasenaHash));

    if (!esValida) {
      await registrarLog({
        idUsuario: usuario?.idUsuario,
        tipoEvento: 'login_fallido',
      });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    await usuario.update({ ultimoLogin: new Date() });
    await registrarLog({
      idUsuario: usuario.idUsuario,
      tipoEvento: 'login_exitoso',
    });

    return res.status(200).json({
      token: generarToken(usuario),
      requiereCambioContrasena: usuario.esContrasenaTemporal,
      usuario: usuarioPublico(usuario),
    });
  } catch (error) {
    return next(error);
  }
}

async function solicitarRecuperacion(req, res, next) {
  try {
    await recuperarContrasena(req.body.correo);
    return res.status(200).json({
      mensaje: 'Si el correo está registrado, se enviaron instrucciones.',
    });
  } catch (error) {
    return next(error);
  }
}

async function cambiarContrasena(req, res, next) {
  try {
    const usuario = await Usuario.findByPk(req.usuario.idUsuario);

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario no autorizado' });
    }

    await cambiarContrasenaServicio(usuario, req.body.nuevaContrasena);
    return res.status(200).json({
      mensaje: 'Contraseña actualizada correctamente',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  cambiarContrasena,
  iniciarSesion,
  registrar,
  solicitarRecuperacion,
};