const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'RespaldoSincronizacion',
    {
      idRespaldo: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: 'id_respaldo',
      },
      idUsuario: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'id_usuario',
        references: {
          model: 'usuarios',
          key: 'id_usuario',
        },
        onDelete: 'CASCADE',
      },
      fechaSincronizacion: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'fecha_sincronizacion',
      },
      tipo: {
        type: DataTypes.ENUM('semanal', 'mensual', 'manual'),
        allowNull: false,
      },
      contenidoEncriptado: {
        type: DataTypes.BLOB,
        allowNull: false,
        field: 'contenido_encriptado',
      },
      iv: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      salt: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      metadataResumen: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: 'metadata_resumen',
      },
      hashVerificacion: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'hash_verificacion',
      },
    },
    {
      tableName: 'respaldos_sincronizacion',
      timestamps: false,
      underscored: true,
    },
  );