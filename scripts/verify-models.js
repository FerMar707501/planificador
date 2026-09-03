const sequelize = require('../src/config/database');
const modelos = require('../src/models');

async function verificarModelos() {
  try {
    await sequelize.authenticate();
    await Promise.all(
      Object.values(modelos).map((modelo) => modelo.describe()),
    );
    console.log('Modelos conectados y esquema PostgreSQL disponible.');
  } finally {
    await sequelize.close();
  }
}

verificarModelos().catch((error) => {
  console.error('No se pudieron verificar los modelos:', error.message);
  process.exitCode = 1;
});
