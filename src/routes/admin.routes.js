const express = require('express');
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

const router = express.Router();

router.get('/logs', authMiddleware, adminMiddleware, adminController.listarLogs);
router.get('/users', authMiddleware, adminMiddleware, adminController.listarUsuarios);

module.exports = router;
