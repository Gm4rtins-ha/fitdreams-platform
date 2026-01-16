// backend/src/models/BodyMeasurements.js
module.exports = (sequelize, DataTypes) => {
  const BodyMeasurement = sequelize.define(
    'BodyMeasurement',
    {
      userId: { type: DataTypes.INTEGER, allowNull: false },

      neck: { type: DataTypes.FLOAT, allowNull: true },
      shoulder: { type: DataTypes.FLOAT, allowNull: true },
      chest: { type: DataTypes.FLOAT, allowNull: true },
      waist: { type: DataTypes.FLOAT, allowNull: true },

      abdomenUpper: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'abdomen_upper',
      },
      abdomenLower: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'abdomen_lower',
      },

      hip: { type: DataTypes.FLOAT, allowNull: true },
      armLeft: { type: DataTypes.FLOAT, allowNull: true, field: 'arm_left' },
      armRight: { type: DataTypes.FLOAT, allowNull: true, field: 'arm_right' },

      forearmLeft: { type: DataTypes.FLOAT, allowNull: true, field: 'forearm_left' },
      forearmRight: { type: DataTypes.FLOAT, allowNull: true, field: 'forearm_right' },

      thighLeft: { type: DataTypes.FLOAT, allowNull: true, field: 'thigh_left' },
      thighRight: { type: DataTypes.FLOAT, allowNull: true, field: 'thigh_right' },

      calfLeft: { type: DataTypes.FLOAT, allowNull: true, field: 'calf_left' },
      calfRight: { type: DataTypes.FLOAT, allowNull: true, field: 'calf_right' },
    },
    {
      tableName: 'body_measurements',
      timestamps: true,
      underscored: true, // (opcional) ajuda com created_at etc, mas não é obrigatório
    }
  );

  BodyMeasurement.associate = (models) => {
    BodyMeasurement.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return BodyMeasurement;
};
