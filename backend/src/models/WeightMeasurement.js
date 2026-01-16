// backend/src/models/WeightMeasurement.js
module.exports = (sequelize, DataTypes) => {
  const WeightMeasurement = sequelize.define('WeightMeasurement', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    weight: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 10,
        max: 300
      }
    },
    bmi: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    bodyFat: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    muscleMass: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    bodyWater: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    boneMass: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    basalMetabolicRate: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    metabolicAge: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    visceralFat: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    protein: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    obesity: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    lbm: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    variance: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    trend: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    readingsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    protocol: {
      type: DataTypes.STRING,
      allowNull: true
    },
    measuredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'WeightMeasurements',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  WeightMeasurement.associate = (models) => {
    WeightMeasurement.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return WeightMeasurement;
};