// backend/src/middlewares/auth.js
const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.User;

/**
 * Middleware de autenticação.
 * Valida o token JWT e coloca o usuário em req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    console.log('🔐 MIDDLEWARE: Verificando autenticação...');
    console.log('🔐 Headers:', JSON.stringify(req.headers, null, 2));

    const authHeader = req.headers.authorization;

    // Ex.: "Bearer eyJhbGciOi..."
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Sem header Authorization');

      return res.status(401).json({
        success: false,
        message: 'Token não fornecido ou inválido.',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const userId = decoded.id || decoded.userId;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado.',
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    };

    return next();
  } catch (error) {
    console.error('❌ Erro na autenticação:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido.',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erro ao verificar autenticação.',
    });
  }
};

module.exports = { authenticate };
