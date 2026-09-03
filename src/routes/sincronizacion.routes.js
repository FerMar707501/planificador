const express = require('express');
const sincronizacionController = require('../controllers/sincronizacion.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/backup', authMiddleware, sincronizacionController.crearRespaldo);
router.get('/backups', authMiddleware, sincronizacionController.listarRespaldos);

module.exports = router;
