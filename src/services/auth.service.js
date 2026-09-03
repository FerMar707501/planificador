const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Usuario } = require('../models');
const { enviarContrasenaTemporal, crearTransportador } = require('./email.service');
const { registrarLog } = require('./logs.service');
const generarContrasenaTemporal = require('../utils/generarContrasenaTemporal');
const usuarioPublico = require('../utils/usuarioPublico');

const rondasBcrypt = 12;

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
  // La existencia del correo nunca debe filtrarse al cliente: si no hay
  // usuario, simplemente no se hace nada y el controlador responde 200
  // genérico igualmente.
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
    // Se valida el transportador de correo dentro del intento, para que un
    // SMTP no configurado no derive en un 500 al cliente: se revierte la
    // transacción (la contraseña no cambia) y se registra el fallo solo
    // en el servidor.
    crearTransportador();
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
    // eslint-disable-next-line no-console
    console.error('No se pudo completar la recuperación de contraseña:', error.message);
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