const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Usuario',
    {
      idUsuario: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: 'id_usuario',
      },
      nombreUsuario: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'nombre_usuario',
      },
      contrasenaHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'contrasena_hash',
      },
      correo: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      nombreCompleto: {
        type: DataTypes.STRING(150),
        allowNull: false,
        field: 'nombre_completo',
      },
      telefono: {
        type: DataTypes.STRING(30),
      },
      rol: {
        type: DataTypes.ENUM('usuario', 'admin'),
        allowNull: false,
        defaultValue: 'usuario',
      },
      esContrasenaTemporal: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'es_contrasena_temporal',
      },
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      ultimoLogin: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'ultimo_login',
      },
    },
    {
      tableName: 'usuarios',
      underscored: true,
    },
  );