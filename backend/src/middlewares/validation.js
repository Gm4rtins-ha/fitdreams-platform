const { body, validationResult } = require('express-validator');

/**
 * Validação para registro
 */
const validateRegister = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Nome completo é obrigatório')
    .isLength({ min: 3, max: 100 })
    .withMessage('Nome deve ter entre 3 e 100 caracteres'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email é obrigatório')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Telefone é obrigatório')
    .matches(/^\d{10,11}$/)
    .withMessage('Telefone deve ter 10 ou 11 dígitos'),
  
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres'),
  
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirmação de senha é obrigatória')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('As senhas não coincidem'),
];

/**
 * Validação para login
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email é obrigatório')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória'),
];

/**
 * Validação para solicitar reset de senha
 */
const validateRequestPasswordReset = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email ou telefone é obrigatório'),
];

/**
 * Validação para resetar senha
 */
const validateResetPassword = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email ou telefone é obrigatório'),
  
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Código de verificação é obrigatório')
    .isLength({ min: 6, max: 6 })
    .withMessage('Código deve ter 6 dígitos'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('Nova senha é obrigatória')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres'),
  
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirmação de senha é obrigatória')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('As senhas não coincidem'),
];

/**
 * Validação para trocar senha
 */
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Senha atual é obrigatória'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('Nova senha é obrigatória')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres'),
  
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirmação de senha é obrigatória')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('As senhas não coincidem'),
];

/**
 * Validação para atualizar perfil
 */
const validateUpdateProfile = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Nome deve ter entre 3 e 100 caracteres'),
  
  body('gender')
    .optional()
    .isIn(['masculino', 'feminino'])
    .withMessage('Sexo inválido'),
  
  body('birthDate')
    .optional()
    .isISO8601()
    .withMessage('Data de nascimento inválida'),
  
  body('weight')
    .optional()
    .isFloat({ min: 1, max: 500 })
    .withMessage('Peso deve estar entre 1 e 500 kg'),
  
  body('height')
    .optional()
    .isFloat({ min: 0.5, max: 3 })
    .withMessage('Altura deve estar entre 0.5 e 3 metros'),
];

/**
 * Middleware para verificar erros de validação
 */
const checkValidation = (req, res, next) => {
  console.log('🔍 === VALIDAÇÃO ===');
  console.log('Body recebido:', JSON.stringify(req.body, null, 2));
  console.log('fullName:', req.body.fullName);
  console.log('fullName tipo:', typeof req.body.fullName);
  console.log('fullName length:', req.body.fullName?.length);
  console.log('===================');

  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }
  
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateRequestPasswordReset,
  validateResetPassword,
  validateChangePassword,
  validateUpdateProfile,
  checkValidation,
};