// backend/src/routes/weightRoutes.js
const express = require('express');
const router = express.Router();
const weightController = require('../controllers/weightController');
const authMiddleware = require('../middlewares/auth');

// 🔐 Normaliza o middleware: funciona tanto se o auth.js
// exportar "module.exports = authenticate" quanto
// "module.exports = { authenticate }"
const authenticate = authMiddleware.authenticate || authMiddleware;

// Salvar medição de peso
router.post('/save', authenticate, weightController.saveWeightMeasurement);

// Obter histórico
router.get('/history', authenticate, weightController.getWeightHistory);

// Obter estatísticas (para Home)
router.get('/stats', authenticate, weightController.getWeightStats);

// Obter últimas medições (para Home: limit=1)
router.get('/latest', authenticate, weightController.getLatestWeightMeasurements);

module.exports = router;
