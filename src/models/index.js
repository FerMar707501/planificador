const crearUsuario = require('./usuario.model');
const crearLogSistema = require('./logSistema.model');
const crearRespaldoSincronizacion = require('./respaldoSincronizacion.model');

module.exports = (sequelize) => {
  const Usuario = crearUsuario(sequelize);
  const LogSistema = crearLogSistema(sequelize);
  const RespaldoSincronizacion = crearRespaldoSincronizacion(sequelize);

  Usuario.hasMany(LogSistema, { foreignKey: 'idUsuario' });
  LogSistema.belongsTo(Usuario, { foreignKey: 'idUsuario' });

  Usuario.hasMany(RespaldoSincronizacion, { foreignKey: 'idUsuario' });
  RespaldoSincronizacion.belongsTo(Usuario, { foreignKey: 'idUsuario' });

  return {
    Usuario,
    LogSistema,
    RespaldoSincronizacion,
  };
};