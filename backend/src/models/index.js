// backend/models/index.js
'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';

// Carrega o arquivo config/database.js
const config = require('../config/database')[env];

const db = {};

// ==========================
// FUNÇÃO PARA AJUSTAR PATH DO SQLITE
// ==========================
const resolveSqliteStorage = (storagePath) => {
  if (!storagePath) return path.join(__dirname, '..', 'database.sqlite');

  // Se já for absoluto, usa direto
  if (path.isAbsolute(storagePath)) {
    return storagePath;
  }

  // Se for relativo, sempre joga dentro da pasta backend/
  return path.join(__dirname, '..', storagePath);
};

// ==========================
// INSTANCIA O SEQUELIZE
// ==========================
let sequelize;

if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  if (config.dialect === 'sqlite') {
    const finalStorage = resolveSqliteStorage(config.storage);

    console.log('💾 Usando SQLite em:', finalStorage);

    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: finalStorage,
      logging: config.logging,
      define: config.define
    });
  } else {
    // Caso um dia você use MySQL/Postgres
    sequelize = new Sequelize(
      config.database,
      config.username,
      config.password,
      config
    );
  }
}

// ==========================
// CARREGA AUTOMATICAMENTE TODOS OS MODELS
// ==========================
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file !== basename &&
      file.endsWith('.js') &&
      !file.includes('.test.js')
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// ==========================
// REGISTRA ASSOCIAÇÕES ENTRE MODELS
// ==========================
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// ==========================
db.sequelize = sequelize;
db.Sequelize = Sequelize;
db.BodyMeasurement = require('./BodyMeasurements')(sequelize, Sequelize.DataTypes);

// ==========================

// 🚨 NÃO ADICIONE WeightMeasurement MANUALMENTE!
// O loop acima já adiciona automaticamente.

module.exports = db;