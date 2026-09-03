# Backend - Planificador de Actividades

API REST del proyecto "Planificador de Actividades" (Flutter, PDM). El backend
maneja **únicamente** autenticación, gestión de usuarios y auditoría de eventos
de login. Ubicaciones, actividades y clima viven en SQLite local en el
dispositivo; el backend no los conoce. Ver `contexto/especificacion_backend_nodejs.md`
para la especificación completa.

## Stack técnico

- Node.js + Express
- Sequelize (PostgreSQL, alojado en [Neon.tech](https://neon.tech))
- Autenticación con JWT + bcrypt
- Envío de correos con Nodemailer
- Validación de entrada con express-validator

## Requisitos previos

- Node.js LTS
- Una base de datos PostgreSQL (Neon en producción, o un contenedor local
  Docker para desarrollo) con el esquema de `contexto/esquema_basedatos_backend.sql`
  ya aplicado.
- Credenciales SMTP (ej. Gmail con "contraseña de aplicación") si se quiere
  probar `POST /api/auth/forgot-password`.

## Instalación

```bash
npm install
```

## Variables de entorno

Copiar `.env.example` a `.env` y completar los valores:

| Variable | Descripción |
|---|---|
| `PORT` | Puerto HTTP del servidor (default `3000`). |
| `NODE_ENV` | `development`, `test` o `production`. |
| `DATABASE_URL` | Cadena de conexión de PostgreSQL (Neon o local). |
| `DATABASE_SSL` | `true` para exigir SSL (Neon); `false` para Postgres local sin SSL. |
| `JWT_SECRET` | Secreto usado para firmar los JWT. |
| `JWT_EXPIRES_IN` | Expiración del token (ej. `24h`). |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM` | Configuración SMTP para Nodemailer, requerida por `forgot-password`. |

## Ejecución

```bash
npm start   # o npm run dev
```

`server.js` reintenta la conexión a la base de datos (útil para el "cold
start" de Neon en el plan gratuito) antes de levantar el servidor Express en
`0.0.0.0:$PORT`.

Para verificar que Sequelize puede autenticar y describir los modelos contra
la base configurada, sin levantar el servidor:

```bash
npm run db:verify
```

## Endpoints disponibles

Todas las rutas están bajo el prefijo `/api`.

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/register` | No | Crear cuenta |
| POST | `/auth/login` | No | Iniciar sesión, retorna JWT |
| POST | `/auth/forgot-password` | No | Solicitar recuperación por correo |
| POST | `/auth/change-password` | JWT | Cambiar contraseña (temporal → definitiva) |
| GET | `/users/me` | JWT | Obtener datos del usuario logueado |
| PUT | `/users/me` | JWT | Editar `correo`, `nombreCompleto`, `telefono` |
| GET | `/admin/logs` | JWT + rol admin | Listar eventos de `logs_sistema` |
| GET | `/admin/users` | JWT + rol admin | Listar usuarios (sin `contrasenaHash`) |

Los endpoints de sincronización/respaldo cifrado (`/sync/backup`,
`/sync/backups`) están documentados en la especificación como **stub
pendiente**: el modelo `RespaldoSincronizacion` ya existe, pero el
controlador y las rutas todavía no se implementan.

## Colección Postman

`postman/planificador-auth.postman_collection.json` incluye ejemplos de
registro, login, cambio/recuperación de contraseña y perfil de usuario.

## Despliegue

El `Dockerfile` y `fly.toml` están preparados para desplegar en Fly.io. Ver
`contexto/Avances/` para el historial detallado de configuración de
producción y despliegue.

