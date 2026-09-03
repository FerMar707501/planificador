const express = require('express');
const authRoutes = require('./auth.routes');
const usuarioRoutes = require('./usuario.routes');
const adminRoutes = require('./admin.routes');
const sincronizacionRoutes = require('./sincronizacion.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', usuarioRoutes);
router.use('/admin', adminRoutes);
router.use('/sync', sincronizacionRoutes);

module.exports = router;