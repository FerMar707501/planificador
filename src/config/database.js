const { Sequelize } = require('sequelize');
const { databaseSsl, databaseUrl } = require('./env');

const opciones = {
  dialect: 'postgres',
  logging: false,
};

if (databaseSsl) {
  opciones.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  };
}

module.exports = new Sequelize(databaseUrl, opciones);