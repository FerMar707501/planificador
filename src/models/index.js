const sequelize = require('../config/database');
const crearUsuario = require('./usuario.model');
const crearLogSistema = require('./logSistema.model');
const crearRespaldoSincronizacion = require('./respaldoSincronizacion.model');

const Usuario = crearUsuario(sequelize);
const LogSistema = crearLogSistema(sequelize);
const RespaldoSincronizacion = crearRespaldoSincronizacion(sequelize);

Usuario.hasMany(LogSistema, { foreignKey: 'idUsuario' });
LogSistema.belongsTo(Usuario, { foreignKey: 'idUsuario' });

Usuario.hasMany(RespaldoSincronizacion, { foreignKey: 'idUsuario' });
RespaldoSincronizacion.belongsTo(Usuario, { foreignKey: 'idUsuario' });

module.exports = {
  Usuario,
  LogSistema,
  RespaldoSincronizacion,
};