-- ============================================================================
-- ESQUEMA DE BASE DE DATOS — Backend Planificador de Actividades
-- Motor: PostgreSQL (alojado en Neon.tech)
-- ============================================================================
-- Este script define ÚNICAMENTE lo que vive en el servidor: usuarios,
-- auditoría de eventos y respaldos cifrados de sincronización.
--
-- Lo que NO está aquí (y es intencional): ubicaciones, actividades,
-- historial de actividades y condiciones climáticas. Esos datos viven
-- localmente en SQLite dentro de cada dispositivo, porque son datos de uso
-- diario que deben funcionar sin conexión. El servidor nunca los necesita
-- para operar — solo recibe una copia cifrada de ellos cuando el usuario
-- decide sincronizar (ver tabla respaldos_sincronizacion más abajo).
--
-- Este script es la referencia "fuente de verdad" del esquema. Si el
-- proyecto usa Sequelize con sequelize.sync() o migraciones, el resultado
-- final en la base de datos debe coincidir exactamente con esto.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- EXTENSIONES
-- ----------------------------------------------------------------------------
-- pgcrypto nos da gen_random_uuid(), para usar UUID como llave primaria en
-- vez de enteros autoincrementales. Se prefiere UUID porque no revela
-- cuántos usuarios/registros existen (un ID secuencial sí lo haría) y evita
-- colisiones si en el futuro se migra o combina con otra base de datos.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ----------------------------------------------------------------------------
-- TIPOS ENUMERADOS
-- ----------------------------------------------------------------------------
-- Se usan ENUM en vez de TEXT libre para los campos de valores fijos, así
-- la propia base de datos rechaza un valor inválido (ej. rol = 'superusuario'
-- por error de typo) en vez de descubrirlo después en la aplicación.

CREATE TYPE rol_usuario AS ENUM ('usuario', 'admin');
-- 'usuario': cuenta normal, dueña de sus propios datos.
-- 'admin': puede consultar logs_sistema y el listado de usuarios (monitoreo).

CREATE TYPE tipo_evento_log AS ENUM (
  'login_exitoso',
  'login_fallido',
  'cambio_contrasena',
  'recuperacion_contrasena',
  'sincronizacion'
);
-- Catálogo cerrado de eventos que el admin puede auditar. Se limita a estos
-- 5 porque son los únicos que el backend genera en el MVP; si se agrega un
-- evento nuevo a futuro, hay que ALTER TYPE para extenderlo.

CREATE TYPE tipo_respaldo AS ENUM ('semanal', 'mensual', 'manual');
-- Indica si el respaldo se disparó automáticamente por calendario o el
-- usuario lo pidió a mano desde la app.


-- ----------------------------------------------------------------------------
-- TABLA: usuarios
-- ----------------------------------------------------------------------------
-- Razón de ser: es la única tabla que el backend NECESITA para que el login
-- funcione. El enunciado exige que las credenciales se validen "por medio
-- de una API a la base de datos de la aplicación" — esta es esa base de
-- datos. También resuelve el módulo de Usuario (ver/editar datos) y la
-- recuperación de contraseña por correo.
CREATE TABLE usuarios (
  id_usuario              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  nombre_usuario          VARCHAR(50)  NOT NULL UNIQUE,
  -- Único porque se usa para loguear. No editable después de creado
  -- (regla explícita del enunciado, módulo de Usuario, inciso a).

  contrasena_hash         VARCHAR(255) NOT NULL,
  -- Se guarda el hash de bcrypt, NUNCA la contraseña en texto plano.
  -- Ni siquiera el admin puede ver la contraseña real de un usuario.

  correo                  VARCHAR(150) NOT NULL UNIQUE,
  -- Único porque es el canal de recuperación de contraseña; si dos
  -- usuarios compartieran correo, la recuperación sería ambigua.

  nombre_completo          VARCHAR(150) NOT NULL,
  telefono                VARCHAR(30),
  -- Opcional: dato editable de perfil, no crítico para el login.

  rol                      rol_usuario NOT NULL DEFAULT 'usuario',
  -- Permite diferenciar cuentas admin sin necesitar una tabla aparte.

  es_contrasena_temporal   BOOLEAN NOT NULL DEFAULT FALSE,
  -- Se pone en TRUE cuando el usuario pide "olvidé mi contraseña" y el
  -- sistema le asigna una temporal. La app usa este flag para forzar la
  -- pantalla de cambio de contraseña con doble confirmación (enunciado,
  -- módulo de Usuario, inciso c) antes de dejarlo usar el resto de la app.

  activo                   BOOLEAN NOT NULL DEFAULT TRUE,
  -- Permite que un admin desactive una cuenta sin borrar sus datos
  -- (soft-disable), útil si hay abuso o una baja solicitada.

  ultimo_login             TIMESTAMPTZ,
  -- Sirve para el panel de monitoreo del admin (ver hace cuánto entró
  -- cada usuario) y para detectar cuentas inactivas.

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE usuarios IS
  'Cuentas de la aplicación. Única tabla necesaria para autenticación; el resto de los datos del usuario (ubicaciones, actividades) vive local en su dispositivo.';
COMMENT ON COLUMN usuarios.es_contrasena_temporal IS
  'TRUE tras una recuperación de contraseña; obliga a la app a mostrar la pantalla de cambio con doble confirmación antes de continuar.';


-- ----------------------------------------------------------------------------
-- TABLA: logs_sistema
-- ----------------------------------------------------------------------------
-- Razón de ser: le da al admin visibilidad real de lo que pasa en el
-- sistema (intentos de login fallidos, recuperaciones de contraseña,
-- sincronizaciones) sin tener que adivinar. Es la base de un futuro panel
-- de monitoreo, y sirve desde ya para detectar patrones sospechosos
-- (ej. muchos login_fallido seguidos del mismo usuario).
CREATE TABLE logs_sistema (
  id_log         UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  id_usuario     UUID REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  -- Nullable a propósito: un login fallido con un nombre_usuario que no
  -- existe no tiene un id_usuario válido al cual asociarse, pero igual
  -- queremos registrar el intento.

  tipo_evento    tipo_evento_log NOT NULL,

  fecha_evento   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  detalle        TEXT
  -- Texto libre opcional para contexto adicional, ej. "correo no
  -- registrado" en un intento de recuperación, o el tipo de dispositivo.
);

COMMENT ON TABLE logs_sistema IS
  'Auditoría de eventos de autenticación y sincronización, para monitoreo del admin.';


-- ----------------------------------------------------------------------------
-- TABLA: respaldos_sincronizacion
-- ----------------------------------------------------------------------------
-- Razón de ser: el usuario puede perder su teléfono o cambiar de
-- dispositivo, y sus ubicaciones/actividades viven solo en SQLite local.
-- Esta tabla permite un respaldo opcional en la nube SIN que el servidor
-- pueda leer el contenido real (cifrado de conocimiento cero) — el
-- servidor solo guarda bytes cifrados más un resumen numérico en claro
-- para que el admin pueda ver estadísticas de uso sin violar la
-- privacidad de los datos del usuario.
--
-- IMPORTANTE: esta tabla se crea desde ya para dejar la base de datos
-- preparada, pero el endpoint que la usa se implementa como STUB por
-- ahora (ver especificación del backend, sección 7.4). No se está
-- generando tráfico real hacia esta tabla todavía.
CREATE TABLE respaldos_sincronizacion (
  id_respaldo            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  id_usuario             UUID NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  -- CASCADE aquí sí tiene sentido: si se borra la cuenta, sus respaldos
  -- cifrados ya no le sirven a nadie (nadie más tiene la contraseña
  -- para descifrarlos).

  fecha_sincronizacion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  tipo                   tipo_respaldo NOT NULL,

  contenido_encriptado   BYTEA NOT NULL,
  -- El JSON de ubicaciones/actividades/historial, ya cifrado en el
  -- dispositivo ANTES de enviarse. El backend nunca ve el JSON en claro.

  iv                     VARCHAR(255) NOT NULL,
  salt                   VARCHAR(255) NOT NULL,
  -- Necesarios para que el propio dispositivo pueda volver a descifrar
  -- el contenido al restaurar. El servidor los almacena pero no los usa
  -- para nada — no tiene la contraseña del usuario para derivar la
  -- llave de cifrado.

  metadata_resumen       JSONB,
  -- Único dato "legible" del respaldo: conteos simples como
  -- {"totalUbicaciones": 5, "totalActividades": 23}. Esto es lo que
  -- alimenta el panel de estadísticas del admin sin comprometer la
  -- privacidad del contenido real.

  hash_verificacion      VARCHAR(255) NOT NULL
  -- Hash del contenido original (ej. SHA-256), calculado en el cliente,
  -- para que al restaurar se pueda verificar que el archivo descifrado
  -- no se corrompió en tránsito o almacenamiento.
);

COMMENT ON TABLE respaldos_sincronizacion IS
  'Respaldos cifrados de conocimiento cero de los datos locales del usuario. El servidor almacena bytes cifrados y un resumen no cifrado para estadísticas; nunca puede leer el contenido real.';


-- ----------------------------------------------------------------------------
-- ÍNDICES
-- ----------------------------------------------------------------------------
-- UNIQUE en nombre_usuario y correo ya crean índice automáticamente al
-- definir la restricción UNIQUE arriba, así que no hace falta repetirlos.

CREATE INDEX idx_logs_sistema_id_usuario ON logs_sistema(id_usuario);
-- Acelera la consulta más común del admin: "dame los logs de este usuario".

CREATE INDEX idx_logs_sistema_tipo_evento ON logs_sistema(tipo_evento);
-- Acelera filtrar por tipo, ej. "dame todos los login_fallido recientes".

CREATE INDEX idx_respaldos_id_usuario ON respaldos_sincronizacion(id_usuario);
-- Acelera "dame el historial de respaldos de este usuario" al restaurar.


-- ----------------------------------------------------------------------------
-- TRIGGER: actualizar updated_at automáticamente
-- ----------------------------------------------------------------------------
-- Solo usuarios tiene updated_at (las otras dos tablas son solo de
-- inserción — un log o un respaldo no se "edita" después de creado).
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_updated_at();


-- ============================================================================
-- FIN DEL ESQUEMA
--
-- Notas para quien lo implemente en Sequelize:
-- - Usar { underscored: true } en cada modelo para que Sequelize traduzca
--   automáticamente idUsuario (JS) <-> id_usuario (columna).
-- - Los tipos ENUM de Postgres se mapean con DataTypes.ENUM('usuario','admin').
-- - contenido_encriptado se mapea con DataTypes.BLOB.
-- - metadata_resumen se mapea con DataTypes.JSONB.
-- - Si se usa sequelize.sync({ alter: true }) en vez de migraciones,
--   Sequelize NO crea los ENUM types de la misma forma que este script;
--   revisar que el resultado final coincida antes de dar por bueno el MVP.
-- ============================================================================
