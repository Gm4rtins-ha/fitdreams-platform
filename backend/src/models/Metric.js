// backend/models/Metric.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Metric extends Model {
    static associate(models) {
      Metric.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }
  
  Metric.init({
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
        min: 20,
        max: 300
      }
    },
    bodyFat: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 1,
        max: 60
      }
    },
    muscleMass: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 10,
        max: 100
      }
    },
    water: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 20,
        max: 80
      }
    },
    boneMass: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 1,
        max: 10
      }
    },
    bmi: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 10,
        max: 50
      }
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    deviceName: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Metric',
    tableName: 'Metrics',
    timestamps: true,
    underscored: true
  });
  
  return Metric;
};