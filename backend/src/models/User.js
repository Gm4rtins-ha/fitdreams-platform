// backend/models/User.js - VERSÃO CORRIGIDA
'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Metric, {
        foreignKey: 'userId',
        as: 'metrics'
      });
      User.hasMany(models.Exam, {
        foreignKey: 'userId',
        as: 'exams'
      });
    }

    comparePassword(candidatePassword) {
      return bcrypt.compare(candidatePassword, this.password);
    }
  }
  
  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isPhoneVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    emailVerificationCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phoneVerificationCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emailVerificationExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    phoneVerificationExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resetPasswordCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    height: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 50,
        max: 250
      }
    },
    weight: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
      validate: {
        min: 30,
        max: 200
      }
    },
    targetWeight: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
      validate: {
        min: 30,
        max: 200
      }
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (user) => {
        console.log('🔐 HOOK beforeCreate TRIGGERED para:', user.email);
        console.log('  Senha original:', user.password ? `Length: ${user.password.length}` : 'Ausente');
        
        if (user.password) {
          console.log('  Hashando senha...');
          const salt = await bcrypt.genSalt(10);
          const hashed = await bcrypt.hash(user.password, salt);
          user.password = hashed;
          console.log('  Senha hashada:', hashed.substring(0, 30) + '...');
        }
      },
      beforeUpdate: async (user) => {
        console.log('🔐 HOOK beforeUpdate TRIGGERED para:', user.email);
        console.log('  Campos alterados:', user.changed());
        console.log('  Senha alterada?', user.changed('password'));
        
        if (user.changed('password') && user.password) {
          console.log('  Re-hashando senha...');
          console.log('  Senha antes do hash:', user.password.substring(0, Math.min(30, user.password.length)) + '...');
          const salt = await bcrypt.genSalt(10);
          const hashed = await bcrypt.hash(user.password, salt);
          user.password = hashed;
          console.log('  Nova hash:', hashed.substring(0, 30) + '...');
        } else if (user.changed('password')) {
          console.log('  ⚠️ ATENÇÃO: Campo password alterado mas valor é vazio/nulo!');
        }
      }
    }
  });
  
  return User;
};