// src/controllers/userController.js - VERSÃO COMPLETA (com foto de perfil)
const db = require('../models');
const User = db.User;

// ✅ Cloudinary config (crie o arquivo em src/config/cloudinary.js)
const cloudinary = require('../config/cloudinary');

// Função auxiliar para calcular idade
const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

// =========================
// GET /api/users/profile
// =========================
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          gender: user.gender,
          birthDate: user.birthDate,
          height: user.height,
          weight: user.weight,
          targetWeight: user.targetWeight,
          profileImage: user.profileImage, // ✅ ADICIONADO
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          age: calculateAge(user.birthDate)
        }
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar perfil:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar perfil do usuário.'
    });
  }
};

// =========================
// PUT /api/users/profile
// =========================
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado.'
      });
    }

    // Campos permitidos para atualização
    const allowedUpdates = [
      'fullName',
      'gender',
      'birthDate',
      'height',
      'weight',
      'targetWeight',
      'phone',
      'profileImage' // ✅ PERMITE salvar URL vinda do upload
    ];

    // Aplicar atualizações
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Perfil atualizado com sucesso!',
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          gender: user.gender,
          birthDate: user.birthDate,
          height: user.height,
          weight: user.weight,
          targetWeight: user.targetWeight,
          profileImage: user.profileImage, // ✅ ADICIONADO
          updatedAt: user.updatedAt,
          age: calculateAge(user.birthDate)
        }
      }
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar perfil:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar perfil do usuário.'
    });
  }
};

// =========================
// PUT /api/users/profile/photo
// (upload de foto via multipart/form-data)
// =========================
exports.updateProfilePhoto = async (req, res) => {
  try {

    console.log('☁️ Cloudinary ENV:', {
    cloud: process.env.CLOUDINARY_CLOUD_NAME,
    key: process.env.CLOUDINARY_API_KEY ? 'OK' : 'MISSING',
    secret: process.env.CLOUDINARY_API_SECRET ? 'OK' : 'MISSING',
  });
  
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Envie um arquivo no campo "photo".'
      });
    }

    // Upload para Cloudinary via stream (não salva em disco)
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'fitdreams/profile',
          resource_type: 'image',
          // ✅ deixa a foto sempre quadrada e tenta focar no rosto
          transformation: [
            { width: 512, height: 512, crop: 'fill', gravity: 'face' },
            { quality: 'auto' },
            { fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) return reject(error);
          return resolve(result);
        }
      );

      stream.end(req.file.buffer);
    });

    user.profileImage = uploadResult.secure_url;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Foto atualizada com sucesso!',
      data: {
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar foto de perfil:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar foto de perfil.'
    });
  }
};

// =========================
// GET /api/users/dashboard
// =========================
exports.getDashboard = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        'id',
        'fullName',
        'email',
        'phone',
        'gender',
        'birthDate',
        'height',
        'targetWeight',
        'profileImage', // ✅ ADICIONADO (opcional, mas útil)
        'createdAt'
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado.'
      });
    }

    // Buscar métricas recentes
    const metrics = await db.Metric.findAll({
      where: { userId: req.user.id },
      order: [['timestamp', 'DESC']],
      limit: 5,
      attributes: [
        'id',
        'weight',
        'bodyFat',
        'muscleMass',
        'water',
        'boneMass',
        'bmi',
        'timestamp',
        'deviceName'
      ]
    });

    const totalMetrics = await db.Metric.count({ where: { userId: req.user.id } });
    const lastMetric = metrics.length > 0 ? metrics[0] : null;

    return res.status(200).json({
      success: true,
      data: {
        user: {
          ...user.toJSON(),
          age: calculateAge(user.birthDate)
        },
        metrics: {
          recent: metrics,
          total: totalMetrics,
          lastMeasurement: lastMetric
        },
        summary: {
          totalMeasurements: totalMetrics,
          hasTargetWeight: user.targetWeight !== null && user.targetWeight !== undefined,
          lastMeasurementDate: lastMetric ? lastMetric.timestamp : null
        }
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar dashboard:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados do dashboard.'
    });
  }
};

// =========================
// PUT /api/users/profile/target-weight
// =========================
exports.updateTargetWeight = async (req, res) => {
  try {
    const userId = req.user.id;
    let { targetWeight } = req.body;

    console.log('🎯 Atualizando meta de peso para usuário:', userId);
    console.log('📦 targetWeight recebido:', targetWeight);

    if (targetWeight === null || targetWeight === undefined || targetWeight === '') {
      targetWeight = null;
    } else {
      targetWeight = Number(targetWeight);
      if (isNaN(targetWeight) || targetWeight <= 0 || targetWeight > 500) {
        return res.status(400).json({
          success: false,
          message: 'Meta de peso inválida. Informe um valor em kg entre 1 e 500.'
        });
      }
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado.'
      });
    }

    user.targetWeight = targetWeight;
    await user.save();

    console.log('✅ Meta de peso atualizada para:', user.targetWeight);

    return res.status(200).json({
      success: true,
      message: 'Meta de peso atualizada com sucesso!',
      data: {
        user: {
          id: user.id,
          targetWeight: user.targetWeight
        }
      }
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar meta de peso:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar meta de peso.'
    });
  }
};
