const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler.middleware');

const app = express();

app.use(helmet());
app.use(cors());
// 'combined' (formato Apache) en producción, 'dev' (coloreado y breve) en desarrollo.
// Registra en consola/logs de Fly cada request (método, ruta, status, tiempo),
// incluidos los 200/201 que antes no se veían.
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use('/api', routes);
app.use(errorHandler);

module.exports = app;