// backend/controllers/metricsController.js
const db = require('../models');
const Metric = db.Metric;
const { Op } = require('sequelize');

/**
 * Criar uma nova métrica
 */
exports.createMetric = async (req, res) => {
  try {
    const {
      weight,
      bodyFat,
      muscleMass,
      water,
      boneMass,
      bmi,
      timestamp,
      deviceId,
      deviceName
    } = req.body;

    const userId = req.user.id;

    const metric = await Metric.create({
      userId,
      weight,
      bodyFat,
      muscleMass,
      water,
      boneMass,
      bmi,
      timestamp: timestamp || new Date(),
      deviceId,
      deviceName
    });

    res.status(201).json({
      success: true,
      message: 'Métrica registrada com sucesso',
      data: metric
    });
  } catch (error) {
    console.error('❌ Erro ao criar métrica:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar métrica'
    });
  }
};

/**
 * Obter todas as métricas do usuário
 */
exports.getUserMetrics = async (req, res) => {
  try {
    const userId = req.user.id;
    const metrics = await Metric.findAll({
      where: { userId },
      order: [['timestamp', 'DESC']],
      attributes: [
        'id', 'weight', 'bodyFat', 'muscleMass', 'water', 
        'boneMass', 'bmi', 'timestamp', 'deviceId', 'deviceName', 'createdAt'
      ]
    });

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('❌ Erro ao buscar métricas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar métricas'
    });
  }
};

/**
 * Obter estatísticas do usuário (NOVO MÉTODO)
 */
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Encontrar última métrica
    const lastMetric = await Metric.findOne({
      where: { userId },
      order: [['timestamp', 'DESC']]
    });

    // Encontrar penúltima métrica
    const previousMetric = await Metric.findOne({
      where: { userId },
      order: [['timestamp', 'DESC']],
      offset: 1
    });

    // Contar total de medições
    const totalMeasurements = await Metric.count({ where: { userId } });

    res.status(200).json({
      success: true,
      data: {
        totalMeasurements,
        lastWeight: lastMetric ? lastMetric.weight : null,
        previousWeight: previousMetric ? previousMetric.weight : null,
        lastMeasurementDate: lastMetric ? lastMetric.timestamp : null,
        lastMeasurement: lastMetric ? {
          id: lastMetric.id,
          weight: lastMetric.weight,
          bodyFat: lastMetric.bodyFat,
          muscleMass: lastMetric.muscleMass,
          water: lastMetric.water,
          boneMass: lastMetric.boneMass,
          bmi: lastMetric.bmi,
          timestamp: lastMetric.timestamp,
          deviceName: lastMetric.deviceName
        } : null
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas'
    });
  }
};

/**
 * Obter últimas métricas (NOVO MÉTODO)
 */
exports.getLatestMetrics = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    
    const metrics = await Metric.findAll({
      where: { userId },
      order: [['timestamp', 'DESC']],
      limit: limit,
      attributes: [
        'id', 'weight', 'bodyFat', 'muscleMass', 'water', 
        'boneMass', 'bmi', 'timestamp', 'deviceId', 'deviceName', 'createdAt'
      ]
    });

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('❌ Erro ao buscar últimas métricas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar últimas métricas'
    });
  }
};

/**
 * Obter métrica por ID
 */
exports.getMetricById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const metric = await Metric.findOne({
      where: { id, userId }
    });

    if (!metric) {
      return res.status(404).json({
        success: false,
        message: 'Métrica não encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: metric
    });
  } catch (error) {
    console.error('❌ Erro ao buscar métrica:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar métrica'
    });
  }
};

/**
 * Atualizar métrica
 */
exports.updateMetric = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const metric = await Metric.findOne({
      where: { id, userId }
    });

    if (!metric) {
      return res.status(404).json({
        success: false,
        message: 'Métrica não encontrada'
      });
    }

    await metric.update(req.body);

    res.status(200).json({
      success: true,
      message: 'Métrica atualizada com sucesso',
      data: metric
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar métrica:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar métrica'
    });
  }
};

/**
 * Deletar métrica
 */
exports.deleteMetric = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const metric = await Metric.findOne({
      where: { id, userId }
    });

    if (!metric) {
      return res.status(404).json({
        success: false,
        message: 'Métrica não encontrada'
      });
    }

    await metric.destroy();

    res.status(200).json({
      success: true,
      message: 'Métrica deletada com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao deletar métrica:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar métrica'
    });
  }
};