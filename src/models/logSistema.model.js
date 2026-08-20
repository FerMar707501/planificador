const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'LogSistema',
    {
      idLog: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: 'id_log',
      },
      idUsuario: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'id_usuario',
        references: {
          model: 'usuarios',
          key: 'id_usuario',
        },
        onDelete: 'SET NULL',
      },
      tipoEvento: {
        type: DataTypes.ENUM(
          'login_exitoso',
          'login_fallido',
          'cambio_contrasena',
          'recuperacion_contrasena',
          'sincronizacion',
        ),
        allowNull: false,
        field: 'tipo_evento',
      },
      fechaEvento: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'fecha_evento',
      },
      detalle: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'logs_sistema',
      timestamps: false,
      underscored: true,
    },
  );