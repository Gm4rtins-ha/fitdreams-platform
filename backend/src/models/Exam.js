// backend/src/models/Exam.js
module.exports = (sequelize, DataTypes) => {
  const Exam = sequelize.define(
    'Exam',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
      },

      examType: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'exam_type',
      },

      examDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'exam_date',
      },

      // ✅ aqui você pode salvar um JSON string com a análise (summary + itens)
      result: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'result',
      },

      // ✅ link do arquivo (caso você salve em storage / pasta pública / etc)
      fileUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'file_url',
      },

      // ✅ observações gerais (texto)
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'notes',
      },
    },
    {
      tableName: 'exams',
      underscored: true,
      timestamps: true, // created_at / updated_at já existem ✅
    }
  );

  Exam.associate = (models) => {
    Exam.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  return Exam;
};
