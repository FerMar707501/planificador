# Coordinación — Backend Planificador de Actividades

**Fecha:** 2026-09-03
**Endpoint probado:** https://planificador-backend-fermar707501.fly.dev
**Contrato de referencia:** colección de Postman `context/postman/planificador-auth.postman_collection.json` + `especificacion_backend_nodejs.md`.

---

## 1) Reporte de pruebas (vs. contrato)

| Endpoint | Resultado | Notas |
|---|---|---|
| POST /api/auth/register | ✅ 201 | Crea usuario. Respuesta `{ usuario }` **sin `telefono`** |
| POST /api/auth/login | ✅ 200 | Acepta **`nombreUsuario` y `correo`**. Shape `{token, requiereCambioContrasena, usuario}` sin `telefono` |
| POST /api/auth/change-password | ✅ 200 | Rechaza si `confirmarContrasena` no coincide (400); la vieja deja de servir |
| POST /api/auth/forgot-password | ❌ **500** | "Error interno" **siempre** (exista o no el correo) |
| GET /api/users/me | ✅ 200 | Devuelve `{ usuario: {…, telefono} }` |
| PUT /api/users/me | ✅ 200 | Edita `nombreCompleto`/`telefono`, persiste y devuelve usuario actualizado |
| Errores | ✅ | 401 credenciales/token inválidos · 409 duplicado · 400 validación con `{error, detalles[]}` |

## 2) Correcciones que debe hacer el backend

1. **`forgot-password` (500).** Debe responder SIEMPRE 200 con mensaje genérico ("Si el correo está registrado, se enviaron instrucciones") sin revelar si el correo existe. Si existe: generar contraseña temporal, `es_contrasena_temporal=true`, registrar log y enviarla por correo. El 500 parece deberse a SMTP sin configurar en el deploy y/o a falta del caso "no existe → 200". **Bloquea la recuperación de contraseña de la app.**
2. **Unificar la forma de respuesta de usuario.** `/users/me` devuelve `{usuario:{…}}`; login/register lo embeben sin envolver. Decidir y documentar (la app se adaptará a `{usuario}`).
3. **Incluir `telefono` en el objeto usuario de login y register** (hoy solo viene en `/users/me`).

## 3) Coordinación — supuestos que asume la app

- Login: la app envía `{correo, contrasena}` → confirmado que el backend lo acepta.
- `change-password`: la app enviará `{nuevaContrasena, confirmarContrasena}`.
- `idUsuario` es **UUID string** → la app lo guardará como **TEXT** en SQLite local.
- Errores: la app leerá `{error}` y, en validaciones, `detalles[0].mensaje`.
- Contraseña mínima: la app validará ≥8 (confirmar si `register` también exige 8).
- CORS: exponer el origen si prueban desde web; Android no requiere CORS.
- Los stubs `/api/sync/*` (501) seguirán así: la app aún no los usa (spec sección 7).

## 4) Roadmap propuesto (más allá del MVP)

### Cerrar el MVP del backend
- Arreglar `forgot-password` + configurar SMTP y probar el flujo de contraseña temporal de punta a punta (login con temporal → `requiereCambioContrasena: true`).
- Implementar endpoints admin del checklist: `GET /api/admin/logs` y `GET /api/admin/users` (rol admin, sin exponer `contrasena_hash`).
- Verificar que `/api/sync/*` respondan 501.

### Dashboard administrativo / estadísticas (futuro)
- El backend solo conoce eventos (`logs_sistema`) y usuarios; **no ve** ubicaciones/actividades (están cifradas o en local).
- Las estadísticas generales se derivan de:
  - `logs_sistema`: logins por día, fallos, recuperaciones, cambios.
  - `metadataResumen` (JSONB sin cifrar) de `respaldos_sincronizacion` cuando exista la **sincronización** (hoy stub): conteos agregados por usuario (ej. `{totalUbicaciones, totalActividades}`).
- Propuesta: `GET /api/admin/stats` (totales y por fecha) y, cuando haya sync, agregados de uso. Nunca contraseñas ni contenido.
- (Opcional) panel web de admin que consuma esos endpoints, solo datos agregados.

### Seguridad (plus, ya anotados como fuera de MVP en la spec)
- Rate limiting en login.
- Verificación de correo (doble opt-in).
- Refresh tokens / revocación / blacklist de tokens.
- `GET /api/health` y manejo de reintentos por el cold start de Neon.

---

## Qué sigue del lado de la app
Refactor de alineación al contrato (id UUID como TEXT, unwrap `{usuario}`, `change-password` con doble campo, contraseña mín. 8, lectura de errores `error`/`detalles`) y luego Fase 7 (Actividades Pendientes). Mientras el backend no responda OK en `forgot-password`, la pantalla de recuperación seguirá usando el mock.
