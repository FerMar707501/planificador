# Especificación del Backend — Planificador de Actividades

**Este documento es la fuente de verdad para implementar el backend.** Está escrito para que otra IA (o desarrollador) lo tome y construya el proyecto sin necesidad de contexto adicional. No inventes tablas, campos, ni endpoints que no estén aquí — si algo parece faltar, señálalo como pregunta en vez de asumir.

---

## 1. Contexto del proyecto

Es el backend de una app móvil Flutter llamada "Planificador de Actividades" (proyecto universitario de Programación de Dispositivos Móviles). La app permite al usuario registrar ubicaciones físicas y crear actividades en esas ubicaciones, condicionadas por el clima.

**Importante:** el backend NO maneja ubicaciones, actividades, ni clima. Esos datos viven 100% en SQLite local dentro del dispositivo del usuario, y el clima/mapas se consultan directo desde la app a APIs externas (Google Maps, API de clima). El backend existe únicamente para tres cosas:

1. **Autenticación y gestión de usuarios** (login, registro, recuperación de contraseña).
2. **Auditoría/monitoreo** para un rol admin (logs de eventos de login).
3. **Recepción y almacenamiento de respaldos cifrados** que el usuario sincroniza manualmente desde su teléfono (backup de sus datos locales, cifrado en el cliente — el backend nunca ve el contenido en claro).

El backend es un **API REST puro**: no renderiza vistas para el usuario final (excepto, opcionalmente, un panel de admin simple a futuro, que NO es parte de este alcance todavía).

---

## 2. Stack técnico y despliegue

| Elemento | Tecnología |
|---|---|
| Runtime | Node.js (LTS) |
| Framework HTTP | Express |
| ORM | Sequelize |
| Base de datos | PostgreSQL, alojado en **Neon.tech** |
| Autenticación | JWT (jsonwebtoken) + bcrypt para hash de contraseñas |
| Envío de correos | Nodemailer |
| Validación de entrada | express-validator (o Joi, a elección del implementador, pero usar una sola de forma consistente) |
| Variables de entorno | dotenv |

### 2.1 Consideraciones específicas de Neon.tech

- Neon es PostgreSQL **serverless**: la conexión requiere SSL obligatorio. En la configuración de Sequelize hay que incluir:
  ```js
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
  ```
- Neon "duerme" la base de datos si no hay actividad (en el plan gratuito), lo que puede causar una latencia alta en la primera conexión después de inactividad ("cold start"). El backend debe manejar reintentos de conexión al arrancar, no fallar de inmediato.
- Usar el **connection string** que Neon provee directamente como `DATABASE_URL` en variables de entorno — no separar host/usuario/contraseña a mano.
- Neon ofrece un modo *pooled connection* (recomendado para apps con muchas conexiones cortas, como un backend serverless o con auto-scaling) vs *direct connection*. Para este proyecto (backend tradicional Express corriendo continuamente, no funciones serverless), usar la **conexión directa** es suficiente y más simple; dejar la pooled como nota para si se despliega en un entorno serverless (ej. Vercel Functions) a futuro.

### 2.2 Dónde correrá el servidor Node

Este documento no asume una plataforma de hosting específica para el proceso Node (Render, Railway, Fly.io, etc. son opciones válidas) — solo la base de datos está fija en Neon. El código no debe tener nada hardcodeado que asuma una plataforma en particular; todo por variables de entorno.

---

## 3. Estructura de carpetas esperada

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js        # inicialización de Sequelize + conexión Neon
│   │   └── env.js             # carga y valida variables de entorno
│   ├── models/
│   │   ├── index.js           # inicializa todos los modelos y asociaciones
│   │   ├── usuario.model.js
│   │   ├── logSistema.model.js
│   │   └── respaldoSincronizacion.model.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── usuario.controller.js
│   │   └── sincronizacion.controller.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── usuario.routes.js
│   │   ├── sincronizacion.routes.js
│   │   └── index.js           # agrega todas las rutas bajo /api
│   ├── middlewares/
│   │   ├── auth.middleware.js       # valida JWT
│   │   ├── admin.middleware.js      # valida rol admin
│   │   └── errorHandler.middleware.js
│   ├── services/
│   │   ├── email.service.js         # nodemailer, envío de correos
│   │   ├── auth.service.js          # lógica de negocio de login/recuperación
│   │   └── logs.service.js          # registrar eventos en logs_sistema
│   ├── utils/
│   │   ├── generarContrasenaTemporal.js
│   │   └── jwt.js
│   └── app.js                # configuración de Express (middlewares globales, rutas)
├── server.js                  # punto de entrada, levanta el servidor
├── .env.example
├── package.json
└── README.md
```

---

## 4. Modelos de datos (Sequelize)

Usar `underscored: true` en cada modelo para que Sequelize mapee automáticamente atributos camelCase de JS a columnas snake_case en PostgreSQL (ej. `idUsuario` en JS ↔ `id_usuario` en la tabla).

### 4.1 `usuarios`

| Atributo (JS) | Columna (DB) | Tipo Sequelize | Reglas |
|---|---|---|---|
| idUsuario | id_usuario | UUID (defaultValue: UUIDV4) | PK |
| nombreUsuario | nombre_usuario | STRING | unique, not null, no editable después de creado |
| contrasenaHash | contrasena_hash | STRING | not null (nunca se expone en las respuestas) |
| correo | correo | STRING | unique, not null, validado como email |
| nombreCompleto | nombre_completo | STRING | not null |
| telefono | telefono | STRING | opcional |
| rol | rol | ENUM('usuario', 'admin') | default 'usuario' |
| esContrasenaTemporal | es_contrasena_temporal | BOOLEAN | default false |
| activo | activo | BOOLEAN | default true |
| ultimoLogin | ultimo_login | DATE | nullable |
| *(timestamps automáticos)* | created_at, updated_at | | manejados por Sequelize |

### 4.2 `logs_sistema`

| Atributo (JS) | Columna (DB) | Tipo Sequelize | Reglas |
|---|---|---|---|
| idLog | id_log | UUID | PK |
| idUsuario | id_usuario | UUID | FK → usuarios.id_usuario, nullable (login fallido puede no tener usuario válido) |
| tipoEvento | tipo_evento | ENUM('login_exitoso','login_fallido','cambio_contrasena','recuperacion_contrasena','sincronizacion') | not null |
| fechaEvento | fecha_evento | DATE | default NOW |
| detalle | detalle | TEXT | opcional (ej. "correo no encontrado", user-agent, etc.) |

### 4.3 `respaldos_sincronizacion`

**Nota importante:** esta tabla se define en el modelo desde ya, pero el endpoint que la usa debe quedar como **stub** (ver sección 7.4) — no implementar todavía la lógica real de cifrado ni de restauración. Es solo para dejar la base de datos preparada.

| Atributo (JS) | Columna (DB) | Tipo Sequelize | Reglas |
|---|---|---|---|
| idRespaldo | id_respaldo | UUID | PK |
| idUsuario | id_usuario | UUID | FK → usuarios.id_usuario, not null |
| fechaSincronizacion | fecha_sincronizacion | DATE | default NOW |
| tipo | tipo | ENUM('semanal','mensual','manual') | not null |
| contenidoEncriptado | contenido_encriptado | BLOB / BYTEA (usar `DataTypes.BLOB`) | el JSON cifrado, la app lo manda ya cifrado |
| iv | iv | STRING | vector de inicialización del cifrado, generado en el cliente |
| salt | salt | STRING | generado en el cliente |
| metadataResumen | metadata_resumen | JSONB | **sin cifrar** — ej. `{ "totalUbicaciones": 5, "totalActividades": 23 }` |
| hashVerificacion | hash_verificacion | STRING | para integridad al restaurar |

### 4.4 Asociaciones

```js
Usuario.hasMany(LogSistema, { foreignKey: 'idUsuario' });
LogSistema.belongsTo(Usuario, { foreignKey: 'idUsuario' });

Usuario.hasMany(RespaldoSincronizacion, { foreignKey: 'idUsuario' });
RespaldoSincronizacion.belongsTo(Usuario, { foreignKey: 'idUsuario' });
```

---

## 5. Variables de entorno (`.env.example`)

```
PORT=3000
NODE_ENV=development

DATABASE_URL=postgresql://usuario:password@ep-xxxx.neon.tech/nombre_db?sslmode=require

JWT_SECRET=cambia_esto_por_un_valor_seguro
JWT_EXPIRES_IN=24h

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASSWORD=app_password_de_gmail
EMAIL_FROM="Planificador de Actividades <tu_correo@gmail.com>"
```

> Para el envío de correos en un proyecto universitario, usar Gmail con una "contraseña de aplicación" es suficiente y gratuito. No se necesita un servicio transaccional de pago para el MVP.

---

## 6. Flujo de autenticación — el corazón de este backend

Esto es lo más importante de aclarar, porque el enunciado original lo pide de forma específica y hay que respetarlo tal cual:

### 6.1 Registro (`POST /api/auth/register`)
- No verificación de correo por ahora (queda como plus a futuro, **no implementar verificación de doble opt-in por correo en el MVP**).
- Recibe: `nombreUsuario`, `correo`, `contrasena`, `nombreCompleto`, `telefono` (opcional).
- Guarda la contraseña con `bcrypt.hash()`, nunca en texto plano.
- `esContrasenaTemporal = false` por defecto (el usuario eligió su propia contraseña).

### 6.2 Login (`POST /api/auth/login`)
- Recibe: `nombreUsuario` (o `correo`), `contrasena`.
- Compara con `bcrypt.compare()`.
- Si es correcto: generar JWT, actualizar `ultimoLogin`, registrar `logs_sistema` con `tipo_evento = 'login_exitoso'`.
- Si es incorrecto: registrar `logs_sistema` con `tipo_evento = 'login_fallido'`, responder 401 sin detallar si fue el usuario o la contraseña lo que falló (por seguridad).
- **Si `esContrasenaTemporal === true`**, el login debe igual ser exitoso (para que el usuario pueda entrar con la temporal), pero la respuesta debe incluir un flag `requiereCambioContrasena: true` para que la app Flutter redirija automáticamente a la pantalla de cambio de contraseña, sin dejarlo usar el resto de la app todavía.

### 6.3 Recuperación de contraseña (`POST /api/auth/forgot-password`)
- Recibe: `correo`.
- Si el correo existe: generar una contraseña temporal aleatoria y segura (ver `utils/generarContrasenaTemporal.js` — ej. 10 caracteres alfanuméricos), guardarla con hash en `contrasena_hash`, marcar `es_contrasena_temporal = true`, y **enviar la contraseña temporal en texto plano por correo** (es la única vez que existe en texto plano, y solo en el correo del usuario, nunca se loggea ni se guarda en texto plano en la BD).
- Registrar en `logs_sistema` con `tipo_evento = 'recuperacion_contrasena'`.
- Responder siempre con el mismo mensaje genérico exista o no el correo (ej. "Si el correo está registrado, se enviaron instrucciones") — para no revelar qué correos existen en el sistema.

### 6.4 Cambio de contraseña obligatorio (`POST /api/auth/change-password`)
Este es el endpoint que atiende el requisito de **"doble confirmación"** del enunciado original. Importante: **la doble confirmación es a nivel de formulario (dos campos en la app: nueva contraseña + confirmar nueva contraseña), no una verificación por correo.** El backend simplemente:
- Requiere JWT válido (el que se obtuvo al loguearse con la contraseña temporal).
- Recibe: `nuevaContrasena`, `confirmarContrasena`.
- Valida en el backend que ambos campos coincidan (nunca confiar solo en la validación del cliente).
- Valida una política mínima de seguridad (ej. mínimo 8 caracteres).
- Actualiza `contrasena_hash`, pone `es_contrasena_temporal = false`.
- Registra en `logs_sistema` con `tipo_evento = 'cambio_contrasena'`.

### 6.5 Tokens — alcance del MVP
- Un solo **JWT de acceso**, expiración configurable por `.env` (`JWT_EXPIRES_IN`, sugerido 24h para un proyecto académico donde no se relogueará constantemente).
- El token se genera en login y se firma con `JWT_SECRET`. Payload mínimo: `{ idUsuario, rol }`.
- El token **no se guarda en la base de datos** — es stateless, se valida solo verificando la firma.
- El cliente (Flutter) es responsable de guardarlo en `flutter_secure_storage`, **no en SQLite**.
- **Fuera de alcance del MVP** (documentado como plus a futuro, no implementar ahora): refresh tokens, revocación de tokens, blacklist de tokens.

---

## 7. Endpoints — resumen completo

| Método | Ruta | Auth requerida | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | No | Crear cuenta |
| POST | `/api/auth/login` | No | Iniciar sesión, retorna JWT |
| POST | `/api/auth/forgot-password` | No | Solicitar recuperación, envía correo |
| POST | `/api/auth/change-password` | Sí (JWT) | Cambiar contraseña (temporal → definitiva o cambio voluntario) |
| GET | `/api/users/me` | Sí (JWT) | Obtener datos del usuario logueado |
| PUT | `/api/users/me` | Sí (JWT) | Editar datos personales (no nombreUsuario ni contraseña) |
| POST | `/api/sync/backup` | Sí (JWT) | **Stub** — recibir y guardar respaldo cifrado |
| GET | `/api/sync/backups` | Sí (JWT) | **Stub** — listar respaldos del usuario (metadata solamente) |
| GET | `/api/admin/logs` | Sí (JWT + rol admin) | Listar eventos de `logs_sistema` |
| GET | `/api/admin/users` | Sí (JWT + rol admin) | Listar usuarios (sin exponer `contrasena_hash`) |

### 7.1 Ejemplo — `POST /api/auth/login`

**Request:**
```json
{
  "nombreUsuario": "jgarcia",
  "contrasena": "MiClave123"
}
```

**Response 200 (contraseña normal):**
```json
{
  "token": "eyJhbGciOi...",
  "requiereCambioContrasena": false,
  "usuario": {
    "idUsuario": "uuid...",
    "nombreUsuario": "jgarcia",
    "nombreCompleto": "Juan García",
    "correo": "jgarcia@correo.com",
    "rol": "usuario"
  }
}
```

**Response 200 (contraseña temporal):**
```json
{
  "token": "eyJhbGciOi...",
  "requiereCambioContrasena": true,
  "usuario": { "...": "..." }
}
```

**Response 401:**
```json
{ "error": "Credenciales inválidas" }
```

### 7.2 Ejemplo — `POST /api/auth/forgot-password`

**Request:**
```json
{ "correo": "jgarcia@correo.com" }
```

**Response 200 (siempre, exista o no el correo):**
```json
{ "mensaje": "Si el correo está registrado, se enviaron instrucciones." }
```

### 7.3 Ejemplo — `POST /api/auth/change-password`

**Request:**
```json
{
  "nuevaContrasena": "NuevaClave456",
  "confirmarContrasena": "NuevaClave456"
}
```

**Response 200:**
```json
{ "mensaje": "Contraseña actualizada correctamente" }
```

**Response 400 (no coinciden):**
```json
{ "error": "Las contraseñas no coinciden" }
```

### 7.4 Endpoints de sincronización — STUB (no implementar lógica completa todavía)

`POST /api/sync/backup` y `GET /api/sync/backups` deben existir en el código, con su ruta, controlador y validación básica de que el usuario esté autenticado, pero **sin lógica de negocio real todavía**. El controlador puede simplemente:

```js
// sincronizacion.controller.js
exports.crearRespaldo = async (req, res) => {
  // TODO: implementar cuando se defina el flujo de cifrado en el cliente
  res.status(501).json({ mensaje: 'Endpoint reservado, aún no implementado' });
};
```

Esto dejará el modelo, la ruta y el esqueleto del controlador listos para cuando se retome esta funcionalidad, sin bloquear el resto del backend.

---

## 8. Seguridad mínima esperada en el MVP

- `bcrypt` para hash de contraseñas (nunca texto plano, nunca en logs).
- `helmet` para headers HTTP seguros.
- `cors` configurado (en desarrollo, permitir el origen de la app; ajustar en producción).
- Validación de entrada en **todos** los endpoints (express-validator o Joi) — nunca confiar en el body tal cual llega.
- Middleware `auth.middleware.js` que valide el JWT en rutas protegidas y adjunte `req.usuario`.
- Middleware `admin.middleware.js` que además valide `req.usuario.rol === 'admin'`.
- Mensajes de error genéricos en login/recuperación (no revelar si el usuario existe).

**Fuera de alcance del MVP** (documentado, no implementar ahora): rate limiting en login, verificación de correo por doble opt-in, refresh tokens.

---

## 9. Qué NO debe hacer este backend

Para evitar que la IA implementadora se salga de alcance:

- No debe manejar ubicaciones, actividades, historial ni condiciones climáticas — eso es local en SQLite.
- No debe llamar a Google Maps ni a la API de clima — eso lo hace la app Flutter directamente.
- No debe implementar la lógica de cifrado/descifrado de los respaldos — el cifrado ocurre en el cliente; el backend solo almacena bytes.
- No debe implementar panel de administración web, verificación de correo por doble opt-in, ni refresh tokens en esta fase — todo eso está en el backlog de "plus" y se abordará después.

---

## 10. Checklist de entrega del MVP del backend

- [ ] Conexión a PostgreSQL en Neon funcionando con SSL
- [ ] Modelos Sequelize: `usuarios`, `logs_sistema`, `respaldos_sincronizacion` (este último solo estructura, sin lógica)
- [ ] Migraciones o `sequelize.sync()` documentado (definir cuál se usará)
- [ ] Endpoints de auth completos: register, login, forgot-password, change-password
- [ ] Envío de correo funcional (contraseña temporal) vía Nodemailer
- [ ] Middleware de autenticación JWT y de rol admin
- [ ] Endpoints de usuario: `GET/PUT /api/users/me`
- [ ] Endpoints admin: logs y listado de usuarios
- [ ] Endpoints de sync como stub (501)
- [ ] `.env.example` documentado
- [ ] README con instrucciones de instalación y variables necesarias
