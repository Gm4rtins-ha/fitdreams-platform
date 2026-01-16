// backend/scripts/init-db.js
const db = require('../src/models');
const path = require('path');
const fs = require('fs');

console.log('🔄 Inicializando banco de dados...');

// Verificar se o arquivo database.sqlite existe
const dbPath = path.join(__dirname, '..', 'database.sqlite');
if (fs.existsSync(dbPath)) {
  console.log('🗑️ Removendo banco de dados antigo...');
  fs.unlinkSync(dbPath);
}

// Sincronizar modelos
db.sequelize.sync({ force: true })
  .then(() => {
    console.log('✅ Banco de dados criado com sucesso!');
    console.log(`📁 Local: ${dbPath}`);
    console.log('📊 Modelos criados:');
    Object.keys(db).forEach(modelName => {
      if (modelName !== 'sequelize' && modelName !== 'Sequelize') {
        console.log(`  - ${modelName}`);
      }
    });
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro ao criar banco:', error);
    process.exit(1);
  });