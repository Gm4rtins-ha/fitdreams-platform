// backend/src/models/FoodLog.js
module.exports = (sequelize, DataTypes) => {
  const FoodLog = sequelize.define('FoodLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    // Nome principal do prato/alimento
    foodName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Totais estimados
    calories: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    protein: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    fat: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    carbs: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    // Observações textuais do GPT
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Opcional: base64 da imagem (pra poder mostrar miniatura depois)
    imageBase64: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Data/hora em que a refeição foi registrada
    loggedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'FoodLogs',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  });

  FoodLog.associate = (models) => {
    FoodLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  return FoodLog;
};
