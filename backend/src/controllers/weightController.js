// backend/src/controllers/weightController.js
const { Op } = require('sequelize');
const { WeightMeasurement } = require('../models');

// Helper pra normalizar número
const toNumberOrNull = (v) => {
  if (v === null || v === undefined || v === '' || v === '--') return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? null : n;
};

module.exports = {
  // =====================================================
  // POST /api/weight/save
  // Salva uma medição COMPLETA de peso + bioimpedância
  // =====================================================
  async saveWeightMeasurement(req, res) {
    try {
      const userId = req.user.id;

      const {
        weight,
        bmi,
        bodyFat,
        muscleMass,
        bodyWater,
        boneMass,
        basalMetabolicRate,
        metabolicAge,
        visceralFat,
        protein,
        obesity,
        lbm,
        variance,
        trend,
        readings,
        date,
        deviceName,
      } = req.body;

      const measuredAt = date ? new Date(date) : new Date();

      const created = await WeightMeasurement.create({
        userId,

        // principais
        weight: toNumberOrNull(weight),
        bmi: toNumberOrNull(bmi),

        // composição corporal
        bodyFat: toNumberOrNull(bodyFat),
        muscleMass: toNumberOrNull(muscleMass),
        bodyWater: toNumberOrNull(bodyWater),
        boneMass: toNumberOrNull(boneMass),

        // métricas avançadas
        basalMetabolicRate: toNumberOrNull(basalMetabolicRate),
        metabolicAge: toNumberOrNull(metabolicAge),
        visceralFat: toNumberOrNull(visceralFat),
        protein: toNumberOrNull(protein),
        obesity: toNumberOrNull(obesity),
        lbm: toNumberOrNull(lbm),

        // metadados
        variance: toNumberOrNull(variance) || 0,
        trend: toNumberOrNull(trend) || 0,
        readingsCount: readings || 1,
        protocol: deviceName || 'Balança Bluetooth',
        measuredAt,
      });

      return res.status(201).json({
        success: true,
        message: 'Medição salva com sucesso',
        data: created,
      });
    } catch (error) {
      console.error('❌ Erro em saveWeightMeasurement:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao salvar medição',
        error: error.message,
      });
    }
  },

  // =====================================================
  // GET /api/weight/history
  // Histórico simples
  // =====================================================
  async getWeightHistory(req, res) {
    try {
      const userId = req.user.id;

      const items = await WeightMeasurement.findAll({
        where: { userId },
        order: [['measuredAt', 'DESC']],
      });

      return res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      console.error('❌ Erro em getWeightHistory:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar histórico',
        error: error.message,
      });
    }
  },

  // =====================================================
  // GET /api/weight/stats
  // Estatísticas para o card da Home
  // =====================================================
  async getWeightStats(req, res) {
    try {
      const userId = req.user.id;

      // Última medição
      const last = await WeightMeasurement.findOne({
        where: { userId },
        order: [['measuredAt', 'DESC']],
      });

      // Penúltima medição (pra comparação)
      const prev = await WeightMeasurement.findOne({
        where: {
          userId,
          id: { [Op.ne]: last ? last.id : 0 },
        },
        order: [['measuredAt', 'DESC']],
      });

      const totalMeasurements = await WeightMeasurement.count({
        where: { userId },
      });

      return res.json({
        success: true,
        data: {
          totalMeasurements,
          lastWeight: last ? last.weight : null,
          lastBmi: last ? last.bmi : null,
          lastDate: last ? last.measuredAt : null,
          previousWeight: prev ? prev.weight : null,
        },
      });
    } catch (error) {
      console.error('❌ Erro em getWeightStats:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas',
        error: error.message,
      });
    }
  },

  // =====================================================
  // GET /api/weight/latest?limit=5
  // Retorna as últimas N medições (com TODOS os campos)
  // Usado pela Home para abrir o último resultado completo
  // =====================================================
  async getLatestWeightMeasurements(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit, 10) || 1;

      const items = await WeightMeasurement.findAll({
        where: { userId },
        order: [['measuredAt', 'DESC']],
        limit,
        attributes: [
          'id',
          'weight',
          'bmi',
          'bodyFat',
          'muscleMass',
          'bodyWater',
          'boneMass',
          'basalMetabolicRate',
          'metabolicAge',
          'visceralFat',
          'protein',
          'obesity',
          'lbm',
          'variance',
          'trend',
          'readingsCount',
          'measuredAt',
          'protocol',
          'createdAt',
        ],
      });

      // Já está em camelCase, só dou um alias praquilo que o front espera
      const mapped = items.map((m) => ({
        id: m.id,
        weight: m.weight,
        bmi: m.bmi,
        bodyFat: m.bodyFat,
        muscleMass: m.muscleMass,
        bodyWater: m.bodyWater,
        boneMass: m.boneMass,
        basalMetabolicRate: m.basalMetabolicRate,
        metabolicAge: m.metabolicAge,
        visceralFat: m.visceralFat,
        protein: m.protein,
        obesity: m.obesity,
        lbm: m.lbm,
        variance: m.variance,
        trend: m.trend,
        readings: m.readingsCount,
        timestamp: m.measuredAt,
        deviceName: m.protocol || 'Histórico',
        createdAt: m.createdAt,
      }));

      return res.json({
        success: true,
        data: mapped,
      });
    } catch (error) {
      console.error('❌ Erro em getLatestWeightMeasurements:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar últimas medições',
        error: error.message,
      });
    }
  },
};
