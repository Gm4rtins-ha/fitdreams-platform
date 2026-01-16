const express = require('express');
const router = express.Router();

// Importa controllers
const {
  register,
  login,
  getProfile,
  verifyEmail,
  verifyPhone,
  resendVerificationCode,
  requestPasswordReset,
  resetPassword,
  changePassword,
  updateProfile
} = require('../controllers/authController');

// Importa middlewares
const {
  validateRegister,
  validateLogin,
  validateRequestPasswordReset,
  validateResetPassword,
  validateChangePassword,
  validateUpdateProfile,
  checkValidation
} = require('../middlewares/validation');

const { authenticate } = require('../middlewares/auth');

// ===== ROTAS DE AUTENTICAÇÃO =====

/**
 * @route   POST /auth/register
 * @desc    Cadastrar novo usuário
 * @access  Public (não precisa estar logado)
 * @body    { fullName, email, phone, password, confirmPassword }
 */
router.post('/register',
  (req, res, next) => {
    console.log('🔹 1. Entrou na rota /register');
    next();
  },
  validateRegister,
  (req, res, next) => {
    console.log('🔹 2. Passou por validateRegister');
    next();
  },
  checkValidation,
  (req, res, next) => {
    console.log('🔹 3. Passou por checkValidation');
    next();
  },
  register
);

/**
 * @route   POST /auth/login
 * @desc    Fazer login
 * @access  Public
 * @body    { email, password }
 */
router.post('/login',
  validateLogin,
  checkValidation,
  login
);

/**
 * @route   GET /auth/profile
 * @desc    Obter dados do usuário logado
 * @access  Private (precisa estar logado)
 */
router.get('/profile',
  authenticate,
  getProfile
);

// ===== VERIFICAÇÃO DE EMAIL/TELEFONE (PÚBLICAS - SEM AUTENTICAÇÃO) =====

/**
 * POST /auth/verify-email
 * Verifica código de email (SEM autenticação - durante cadastro)
 * Body: { email: "user@email.com", code: "123456" }
 */
router.post('/verify-email', async (req, res) => {
  console.log('\n========= VERIFICAÇÃO EMAIL =========');
  try {
    const { email, code } = req.body;
    console.log('1. Email:', email);
    console.log('2. Código recebido:', code);
    
    const db = require('../models');
    const User = db.User;

    const user = await User.findOne({ where: { email } });
    console.log('3. Usuário encontrado?', !!user);

    if (!user) {
      console.log('❌ PAROU AQUI: Usuário não encontrado');
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado.'
      });
    }

    console.log('4. Email já verificado?', user.isEmailVerified);
    console.log('5. Código no banco:', user.emailVerificationCode);
    console.log('6. Data expiração:', user.emailVerificationExpires);

    if (user.isEmailVerified) {
      console.log('❌ PAROU AQUI: Email já verificado');
      return res.status(400).json({
        success: false,
        message: 'Email já verificado.'
      });
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpires) {
      console.log('❌ PAROU AQUI: Código ou data não existe no banco');
      return res.status(400).json({
        success: false,
        message: 'Nenhum código de verificação encontrado.'
      });
    }

    console.log('7. Comparando códigos:');
    console.log('   - Banco:', user.emailVerificationCode);
    console.log('   - Recebido:', code);
    console.log('   - São iguais?', user.emailVerificationCode === code);

    if (user.emailVerificationCode !== code) {
      console.log('❌ PAROU AQUI: Código inválido');
      return res.status(400).json({
        success: false,
        message: 'Código inválido.'
      });
    }

    if (new Date() > user.emailVerificationExpires) {
      console.log('❌ PAROU AQUI: Código expirado');
      return res.status(400).json({
        success: false,
        message: 'Código expirado. Solicite um novo código.'
      });
    }

    console.log('✅ Tudo OK! Salvando...');
    user.isEmailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    await user.save();
    console.log('✅ Salvo com sucesso!');

    res.status(200).json({
      success: true,
      message: 'Email verificado com sucesso!'
    });

  } catch (error) {
    console.error('❌ ERRO:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar email.'
    });
  }
});

/**
 * POST /auth/resend-email
 * Reenvia código de verificação de email (SEM autenticação)
 * Body: { email: "user@email.com" }
 */
router.post('/resend-email', async (req, res) => {
  try {
    const { email } = req.body;
    const db = require('../models');
    const User = db.User;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado.'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email já verificado.'
      });
    }

    const generateVerificationCode = () => {
      return Math.floor(100000 + Math.random() * 900000).toString();
    };

    const newCode = generateVerificationCode();
    user.emailVerificationCode = newCode;
    user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    console.log(`📧 Novo código EMAIL para ${user.email}: ${newCode}`);

    res.status(200).json({
      success: true,
      message: 'Novo código enviado para seu email!',
      debug: { code: newCode, expiresIn: '15 minutos' }
    });

  } catch (error) {
    console.error('Erro ao reenviar código de email:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao reenviar código.'
    });
  }
});

/**
 * POST /auth/verify-phone
 * Verifica código de telefone (SEM autenticação - durante cadastro)
 * Body: { phone: "11987654321", code: "123456" }
 */
router.post('/verify-phone', async (req, res) => {
  try {
    const { phone, code } = req.body;
    const db = require('../models');
    const User = db.User;
    const jwt = require('jsonwebtoken');

    const user = await User.findOne({ where: { phone } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado.'
      });
    }

    if (user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Telefone já verificado.'
      });
    }

    if (!user.phoneVerificationCode || !user.phoneVerificationExpires) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum código de verificação encontrado.'
      });
    }

    if (user.phoneVerificationCode !== code) {
      return res.status(400).json({
        success: false,
        message: 'Código inválido.'
      });
    }

    if (new Date() > user.phoneVerificationExpires) {
      return res.status(400).json({
        success: false,
        message: 'Código expirado. Solicite um novo código.'
      });
    }

    user.isPhoneVerified = true;
    user.phoneVerificationCode = null;
    user.phoneVerificationExpires = null;
    await user.save();

    // Gera token após verificação completa
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Telefone verificado com sucesso! Cadastro concluído.',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      }
    });

  } catch (error) {
    console.error('Erro ao verificar telefone:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar telefone.'
    });
  }
});

/**
 * POST /auth/resend-phone
 * Reenvia código de verificação de telefone (SEM autenticação)
 * Body: { phone: "11987654321" }
 */
router.post('/resend-phone', async (req, res) => {
  try {
    const { phone } = req.body;
    const db = require('../models');
    const User = db.User;

    const user = await User.findOne({ where: { phone } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado.'
      });
    }

    if (user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Telefone já verificado.'
      });
    }

    const generateVerificationCode = () => {
      return Math.floor(100000 + Math.random() * 900000).toString();
    };

    const newCode = generateVerificationCode();
    user.phoneVerificationCode = newCode;
    user.phoneVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    console.log(`📱 Novo código TELEFONE para ${user.phone}: ${newCode}`);

    res.status(200).json({
      success: true,
      message: 'Novo código enviado para seu telefone!',
      debug: { code: newCode, expiresIn: '15 minutos' }
    });

  } catch (error) {
    console.error('Erro ao reenviar código de telefone:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao reenviar código.'
    });
  }
});

// ===== VERIFICAÇÃO COM AUTENTICAÇÃO (para usuários já logados) =====

/**
 * POST /auth/verify-email-authenticated
 * Verifica código de email (COM autenticação - para usuários logados)
 * Body: { code: "123456" }
 */
router.post(
  '/verify-email-authenticated',
  authenticate,
  verifyEmail
);

/**
 * POST /auth/verify-phone-authenticated
 * Verifica código de telefone (COM autenticação - para usuários logados)
 * Body: { code: "123456" }
 */
router.post(
  '/verify-phone-authenticated',
  authenticate,
  verifyPhone
);

/**
 * POST /auth/resend-code
 * Reenvia código de verificação (COM autenticação - para usuários logados)
 * Body: { type: "email" ou "phone" }
 */
router.post(
  '/resend-code',
  authenticate,
  resendVerificationCode
);

// ===== RECUPERAÇÃO DE SENHA =====

/**
 * POST /auth/forgot-password
 * Solicita código de recuperação de senha
 * Body: { identifier: "email@exemplo.com" ou "11987654321" }
 */
router.post(
  '/forgot-password',
  validateRequestPasswordReset,
  checkValidation,
  requestPasswordReset
);

/**
 * POST /auth/reset-password
 * Redefine senha usando código de verificação
 */
router.post(
  '/reset-password',
  validateResetPassword,
  checkValidation,
  resetPassword
);

// ===== ALTERAR SENHA (USUÁRIO LOGADO) =====

/**
 * PUT /auth/change-password
 * Altera senha do usuário logado (requer autenticação)
 * Body: { currentPassword, newPassword, confirmPassword }
 */
router.put(
  '/change-password',
  authenticate,
  validateChangePassword,
  checkValidation,
  changePassword
);

// ===== ATUALIZAR PERFIL =====

/**
 * PUT /auth/profile
 * Atualiza dados do perfil do usuário (requer autenticação)
 * Body: { fullName?, gender?, birthDate?, weight?, height? }
 */
router.put(
  '/profile',
  authenticate,
  validateUpdateProfile,
  checkValidation,
  updateProfile
);

module.exports = router;