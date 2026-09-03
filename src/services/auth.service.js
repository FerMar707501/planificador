const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Usuario } = require('../models');
const { enviarContrasenaTemporal, crearTransportador } = require('./email.service');
const { registrarLog } = require('./logs.service');
const generarContrasenaTemporal = require('../utils/generarContrasenaTemporal');

const rondasBcrypt = 12;

function usuarioPublico(usuario) {
  return {
    idUsuario: usuario.idUsuario,
    nombreUsuario: usuario.nombreUsuario,
    nombreCompleto: usuario.nombreCompleto,
    correo: usuario.correo,
    rol: usuario.rol,
  };
}

async function registrarUsuario(datos) {
  const contrasenaHash = await bcrypt.hash(datos.contrasena, rondasBcrypt);

  return Usuario.create({
    nombreUsuario: datos.nombreUsuario,
    correo: datos.correo,
    contrasenaHash,
    nombreCompleto: datos.nombreCompleto,
    telefono: datos.telefono,
  });
}

async function buscarUsuarioPorIdentificador(identificador) {
  return Usuario.findOne({
    where: {
      [Op.or]: [
        { nombreUsuario: identificador },
        { correo: identificador.toLowerCase() },
      ],
    },
  });
}

async function recuperarContrasena(correo) {
  crearTransportador();

  const usuario = await Usuario.findOne({
    where: { correo: correo.toLowerCase() },
  });

  if (!usuario) {
    return;
  }

  const contrasenaTemporal = generarContrasenaTemporal();
  const contrasenaHash = await bcrypt.hash(contrasenaTemporal, rondasBcrypt);
  const transaction = await sequelize.transaction();

  try {
    await usuario.update(
      {
        contrasenaHash,
        esContrasenaTemporal: true,
      },
      { transaction },
    );
    await enviarContrasenaTemporal({
      correo: usuario.correo,
      contrasenaTemporal,
    });
    await registrarLog({
      idUsuario: usuario.idUsuario,
      tipoEvento: 'recuperacion_contrasena',
      transaction,
    });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function cambiarContrasena(usuario, nuevaContrasena) {
  const contrasenaHash = await bcrypt.hash(nuevaContrasena, rondasBcrypt);

  await sequelize.transaction(async (transaction) => {
    await usuario.update(
      {
        contrasenaHash,
        esContrasenaTemporal: false,
      },
      { transaction },
    );
    await registrarLog({
      idUsuario: usuario.idUsuario,
      tipoEvento: 'cambio_contrasena',
      transaction,
    });
  });
}

module.exports = {
  buscarUsuarioPorIdentificador,
  cambiarContrasena,
  recuperarContrasena,
  registrarUsuario,
  registrarLog,
  usuarioPublico,
};