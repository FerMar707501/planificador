// Endpoints de sincronización — STUB según especificación (sección 7.4).
// No implementar lógica de negocio real todavía: solo dejar la ruta,
// el controlador y la autenticación listos para cuando se retome esta
// funcionalidad (flujo de cifrado del cliente aún no definido).

async function crearRespaldo(req, res) {
  return res.status(501).json({ mensaje: 'Endpoint reservado, aún no implementado' });
}

async function listarRespaldos(req, res) {
  return res.status(501).json({ mensaje: 'Endpoint reservado, aún no implementado' });
}

module.exports = {
  crearRespaldo,
  listarRespaldos,
};
