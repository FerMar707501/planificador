const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const variablesRequeridas = ['DATABASE_URL'];
const modosValidos = ['development', 'test', 'production'];
const nodeEnv = process.env.NODE_ENV || 'development';

const variablesFaltantes = variablesRequeridas.filter(
  (nombre) => !process.env[nombre],
);

if (variablesFaltantes.length > 0) {
  throw new Error(
    `Faltan variables de entorno requeridas: ${variablesFaltantes.join(', ')}`,
  );
}

if (!modosValidos.includes(nodeEnv)) {
  throw new Error(
    `NODE_ENV debe ser uno de los siguientes valores: ${modosValidos.join(', ')}`,
  );
}

module.exports = {
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: process.env.DATABASE_SSL === 'true',
  nodeEnv,
  port: Number(process.env.PORT || 3000),
};