// backend/routes/metricRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const metricController = require('../controllers/metricsController');

// Rota para criar métrica
router.post('/', authenticate, metricController.createMetric);

// Rota para listar todas as métricas do usuário
router.get('/', authenticate, metricController.getUserMetrics);

// Rota para estatísticas do usuário
router.get('/stats', authenticate, metricController.getUserStats);

// Rota para últimas métricas
router.get('/latest', authenticate, metricController.getLatestMetrics);

// Rota para obter métrica específica
router.get('/:id', authenticate, metricController.getMetricById);

// Rota para atualizar métrica
router.put('/:id', authenticate, metricController.updateMetric);

// Rota para deletar métrica
router.delete('/:id', authenticate, metricController.deleteMetric);

module.exports = router;