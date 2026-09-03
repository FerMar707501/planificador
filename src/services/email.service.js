const nodemailer = require('nodemailer');

function crearTransportador() {
  const variablesRequeridas = [
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'EMAIL_FROM',
  ];

  const faltantes = variablesRequeridas.filter((nombre) => !process.env[nombre]);

  if (faltantes.length > 0) {
    throw new Error(
      `Faltan variables de correo requeridas: ${faltantes.join(', ')}`,
    );
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

async function enviarContrasenaTemporal({ correo, contrasenaTemporal }) {
  const transportador = crearTransportador();

  await transportador.sendMail({
    from: process.env.EMAIL_FROM,
    to: correo,
    subject: 'Contraseña temporal - Planificador de Actividades',
    text: `Tu contraseña temporal es: ${contrasenaTemporal}`,
  });
}

module.exports = {
  crearTransportador,
  enviarContrasenaTemporal,
};