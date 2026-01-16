const path = require('path');

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', '..', 'database.sqlite'),
    logging: console.log,
    define: {
      timestamps: true,
      underscored: true,
    }
  },
  test: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', '..', 'teste_database.sqlite'),
    logging: false,
  },
  production: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', '..', 'production_database.sqlite'),
    logging: false,
    define: {
      timestamps: true,
      underscored: true
    }
  }
};
