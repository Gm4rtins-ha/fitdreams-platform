// backend/src/server.js
const path = require('path');

// ✅ GARANTE QUE SEMPRE VAI LER O .env DO BACKEND (backend/.env)
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

const express = require('express');
const cors = require('cors');

console.log('🔑 JWT_SECRET definido?', !!process.env.JWT_SECRET);
console.log('🔑 FatSecret env:', {
  hasClientId: !!process.env.FATSECRET_CLIENT_ID,
  hasClientSecret: !!process.env.FATSECRET_CLIENT_SECRET,
});
console.log('🌱 NODE_ENV:', process.env.NODE_ENV);

const app = express();
const PORT = process.env.PORT || 5000;

// ========== CONFIGURAÇÃO DO BANCO ==========
const db = require('./models');

// ========== MIDDLEWARES ==========
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '20mb' })); // 👈 útil se enviar imagem base64
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ========== ROTAS ==========
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const metricRoutes = require('./routes/metricRoutes');
const weightRoutes = require('./routes/weightRoutes');
const foodRoutes = require('./routes/foodRoutes');
const examRoutes = require('./routes/examRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/metrics', metricRoutes);
app.use('/api/weight', weightRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/exams', examRoutes);

// ========== ROTAS DE VERIFICAÇÃO ==========
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API HealthApp está rodando!',
    version: '2.0.0 (com banco de dados REAL)',
    timestamp: new Date().toISOString(),
    database: 'SQLite',
    endpoints: {
      auth: '/api/auth/*',
      users: '/api/users/*',
      metrics: '/api/metrics/*',
      weight: '/api/weight/*',
      food: '/api/food/*',
      exams: '/api/exams/*',
      health: '/api/health',
    },
  });
});

app.use('/api/body-measurements', require('./routes/BodyMeasurements'));


// Rota de saúde do banco
app.get('/api/health', async (req, res) => {
  try {
    const userCount = await db.User.count();

    res.json({
      success: true,
      status: 'healthy',
      database: 'connected',
      users: userCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// ========== INICIAR SERVIDOR ==========
const dbPath = path.join(__dirname, '..', 'database.sqlite');
console.log('📁 Caminho do banco:', dbPath);

// Sincronizar banco
db.sequelize
  .sync()
  .then(async () => {
    console.log('✅ Banco de dados criado/atualizado');

    const userCount = await db.User.count();
    console.log(`👥 Usuários no banco: ${userCount}`);

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
      console.log('📡 Rotas disponíveis:');
      console.log('   GET  /api/health');
      console.log('   POST /api/auth/login');
      console.log('   POST /api/auth/register');
      console.log('   GET  /api/users/profile');
      console.log('   PUT  /api/users/profile/target-weight');
      console.log('   GET  /api/metrics/stats');
      console.log('   GET  /api/metrics/latest');
      console.log('   GET  /api/weight/*');
      console.log('   POST /api/food/analyze');
      console.log('   GET  /api/food/history');
      console.log('   GET  /api/exams/history');
      console.log('');
    });
  })
  .catch((err) => {
    console.error('❌ Erro ao sincronizar banco:', err);
    console.error('Detalhes:', err.message);
    process.exit(1);
  });
