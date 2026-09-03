const express = require('express');
const { body, validationResult } = require('express-validator');
const usuarioController = require('../controllers/usuario.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();
const camposEditables = ['correo', 'nombreCompleto', 'telefono'];

function validarSolicitud(req, res, next) {
  const errores = validationResult(req);

  if (!errores.isEmpty()) {
    return res.status(400).json({
      error: 'Datos de entrada inválidos',
      detalles: errores.array().map(({ path, msg }) => ({
        campo: path,
        mensaje: msg,
      })),
    });
  }

  return next();
}

const validarActualizacion = [
  body().custom((valor, { req }) => {
    const campos = Object.keys(req.body);
    const noPermitidos = campos.filter((campo) => !camposEditables.includes(campo));

    if (campos.length === 0) {
      throw new Error('Debe enviar al menos un campo para actualizar');
    }

    if (noPermitidos.length > 0) {
      throw new Error(`Campos no permitidos: ${noPermitidos.join(', ')}`);
    }

    return true;
  }),
  body('correo')
    .optional()
    .trim()
    .isEmail()
    .withMessage('El correo debe tener un formato válido')
    .normalizeEmail()
    .isLength({ max: 150 })
    .withMessage('El correo no puede exceder 150 caracteres'),
  body('nombreCompleto')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre completo no puede estar vacío')
    .isLength({ max: 150 })
    .withMessage('El nombre completo no puede exceder 150 caracteres'),
  body('telefono')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 30 })
    .withMessage('El teléfono no puede exceder 30 caracteres'),
];

router.get('/me', authMiddleware, usuarioController.obtenerPerfil);
router.put(
  '/me',
  authMiddleware,
  validarActualizacion,
  validarSolicitud,
  usuarioController.actualizarPerfil,
);

module.exports = router;