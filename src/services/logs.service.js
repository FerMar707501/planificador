const { LogSistema } = require('../models');

async function registrarLog({ idUsuario = null, tipoEvento, detalle = null, transaction }) {
  return LogSistema.create(
    {
      idUsuario,
      tipoEvento,
      detalle,
    },
    { transaction },
  );
}

module.exports = {
  registrarLog,
};