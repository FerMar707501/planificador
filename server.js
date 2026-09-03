const app = require('./src/app');
const sequelize = require('./src/config/database');
const modelos = require('./src/models');
const { nodeEnv, port } = require('./src/config/env');
const { version } = require('./package.json');

const intentosMaximos = 3;

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function conectarBaseDatos() {
  let ultimoError;

  for (let intento = 1; intento <= intentosMaximos; intento += 1) {
    try {
      await sequelize.authenticate();
      return;
    } catch (error) {
      ultimoError = error;

      if (intento < intentosMaximos) {
        await esperar(1000 * intento);
      }
    }
  }

  throw ultimoError;
}

async function verificarModelos() {
  await Promise.all(
    Object.values(modelos).map((modelo) => modelo.describe()),
  );
}

function nombreModo() {
  const nombres = {
    development: 'Desarrollo',
    production: 'Producción',
    test: 'Pruebas',
  };

  return nombres[nodeEnv];
}

async function iniciarServidor() {
  console.log('🚀 Servidor encendiendo...');
  console.log(`📦 Versión: ${version}`);
  console.log(`⚙️ Modo: ${nombreModo()}`);
  console.log('🔌 Conectando a la base de datos...');
  await conectarBaseDatos();
  console.log('✅ Conectado a la base de datos.');
  await verificarModelos();
  console.log('✅ Modelos sincronizados.');

  app.listen(port, '0.0.0.0', () => {
    console.log(`🌐 Servidor disponible en el puerto ${port}.`);
  });
}

iniciarServidor().catch((error) => {
  console.error('❌ No se pudo iniciar el servidor:', error.message);
  process.exitCode = 1;
});