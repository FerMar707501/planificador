const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

function validarSolicitud(req, res, next) {
  const errores = validationResult(req);

  if (!errores.isEmpty()) {
    return res.status(400).json({
      error: 'Datos de entrada inválidos',
      detalles: errores.array().map(({ path, msg }) => ({ campo: path, mensaje: msg })),
    });
  }

  return next();
}

const validarRegistro = [
  body('nombreUsuario')
    .trim()
    .notEmpty()
    .withMessage('El nombre de usuario es obligatorio')
    .isLength({ max: 50 })
    .withMessage('El nombre de usuario no puede exceder 50 caracteres'),
  body('correo')
    .trim()
    .isEmail()
    .withMessage('El correo debe tener un formato válido')
    .normalizeEmail()
    .isLength({ max: 150 })
    .withMessage('El correo no puede exceder 150 caracteres'),
  body('contrasena')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('nombreCompleto')
    .trim()
    .notEmpty()
    .withMessage('El nombre completo es obligatorio')
    .isLength({ max: 150 })
    .withMessage('El nombre completo no puede exceder 150 caracteres'),
  body('telefono')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 30 })
    .withMessage('El teléfono no puede exceder 30 caracteres'),
];

const validarLogin = [
  body().custom((valor, { req }) => {
    if (!req.body.nombreUsuario && !req.body.correo) {
      throw new Error('El nombre de usuario o correo es obligatorio');
    }

    return true;
  }),
  body('nombreUsuario').optional().trim(),
  body('correo').optional().trim().normalizeEmail(),
  body('contrasena').notEmpty().withMessage('La contraseña es obligatoria'),
];

const validarRecuperacion = [
  body('correo')
    .trim()
    .isEmail()
    .withMessage('El correo debe tener un formato válido')
    .normalizeEmail(),
];

const validarCambioContrasena = [
  body('nuevaContrasena')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('confirmarContrasena')
    .custom((valor, { req }) => valor === req.body.nuevaContrasena)
    .withMessage('Las contraseñas no coinciden'),
];

router.post('/register', validarRegistro, validarSolicitud, authController.registrar);
router.post('/login', validarLogin, validarSolicitud, authController.iniciarSesion);
router.post(
  '/forgot-password',
  validarRecuperacion,
  validarSolicitud,
  authController.solicitarRecuperacion,
);
router.post(
  '/change-password',
  authMiddleware,
  validarCambioContrasena,
  validarSolicitud,
  authController.cambiarContrasena,
);

module.exports = router;