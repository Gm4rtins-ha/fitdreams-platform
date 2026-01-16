// backend/src/controllers/authController.js - VERSÃO COMPLETA CORRIGIDA
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../models');
const User = db.User;

// Função auxiliar para gerar JWT
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Função auxiliar para gerar código de 6 dígitos
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Função para calcular idade
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

// Função para calcular IMC
const calculateBMI = (weight, height) => {
  if (!weight || !height || height <= 0) return null;
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  return parseFloat(bmi.toFixed(1));
};

// Função para obter status do IMC
const getBMIStatus = (bmi) => {
  if (!bmi || isNaN(bmi)) return 'Não calculado';
  if (bmi < 18.5) return 'Abaixo do peso';
  if (bmi < 25) return 'Peso normal';
  if (bmi < 30) return 'Sobrepeso';
  return 'Obesidade';
};

// REGISTRO - Criar novo usuário
const register = async (req, res) => {
  console.log('🔍 === REGISTER REQUEST DETAILS ===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('====================================\n');

  // ✅✅✅ ADICIONAR VALIDAÇÃO DE CONFIRMAÇÃO DE SENHA
  const { fullName, email, phone, password, confirmPassword, birthDate, gender, height, weight, targetWeight, profileImage } = req.body;

  // Verificar se as senhas coincidem
  if (password !== confirmPassword) {
    console.log('❌ Senhas não coincidem');
    console.log('  Password:', password);
    console.log('  ConfirmPassword:', confirmPassword);
    return res.status(400).json({
      success: false,
      message: 'As senhas não coincidem.'
    });
  }

  console.log('📝 /api/auth/register chamada');
  console.log('Dados do registro:', { 
    fullName, email, phone, 
    passwordLength: password ? password.length : 0,
    confirmPasswordLength: confirmPassword ? confirmPassword.length : 0,
    birthDate, gender, height, weight, targetWeight 
  });

  // ✅✅✅ VERIFICAÇÃO EXTRA: Senha em plain text
  console.log('🔐 Verificando formato da senha:');
  console.log('  Senha (primeiros 10 chars):', password ? password.substring(0, Math.min(10, password.length)) : 'null');
  console.log('  É hash bcrypt?', password ? password.startsWith('$2') : 'null');

  try {
    // Validações básicas
    if (!email || !password || !fullName || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email, telefone e senha são obrigatórios.'
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Este email já está cadastrado.'
      });
    }

    const existingPhone = await User.findOne({ where: { phone } });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Este telefone já está cadastrado.'
      });
    }

    const emailVerificationCode = generateVerificationCode();
    const phoneVerificationCode = generateVerificationCode();

    console.log('🔐 Criando usuário...');
    console.log('  Senha será hashada pelo hook beforeCreate');

    // Criar usuário no banco REAL
    const user = await User.create({
      fullName,
      email,
      phone,
      password, // Será hasheado pelo hook beforeCreate
      emailVerificationCode,
      phoneVerificationCode,
      emailVerificationExpires: new Date(Date.now() + 15 * 60 * 1000),
      phoneVerificationExpires: new Date(Date.now() + 15 * 60 * 1000),
      birthDate,    
      gender,       
      height,       
      weight,       
      targetWeight, 
      profileImage,
      createdAt: new Date() // Data REAL
    });

    // ✅✅✅ VERIFICAÇÃO PÓS-CRIAÇÃO
    console.log('🔐 Verificação pós-criação:');
    console.log('  Senha no banco (hash):', user.password ? user.password.substring(0, 30) + '...' : 'null');
    console.log('  É hash bcrypt válido?', user.password ? user.password.startsWith('$2') : 'null');
    console.log('  Length do hash:', user.password ? user.password.length : 0);

    const token = generateToken(user.id);

    // ✅✅✅ CORRIGIDO: Calcular e criar métrica inicial 
    try { 
      const Metric = db.Metric;

      const initialBMI = calculateBMI(weight, height);
      const age = calculateAge(birthDate);

      console.log('📊 Calculando dados iniciais para registro:');
      console.log(`   Peso: ${weight} kg`);
      console.log(`   Altura: ${height} cm`);
      console.log(`   IMC calculado: ${initialBMI}`);
      console.log(`   Idade calculada: ${age} anos`);

      // Criar métrica inicial
      if (weight && height) {
        await Metric.create({
          userId: user.id, // ✅ CORRIGIDO: userID -> userId
          weight: weight,
          height: height,
          bmi: initialBMI,
          timestamp: new Date(),
          deviceName: 'Cadastro Inicial'
        });
        console.log('✅ Métrica inicial criada com IMC:', initialBMI); // ✅ CORRIGIDO: initialCMI -> initialBMI
      }
    } catch (metricError) {
      console.error('❌ Erro ao criar métrica inicial:', metricError);
    }

    console.log(`✅ Usuário criado: ${user.fullName} (ID: ${user.id})`);
    console.log(`📧 Código de verificação EMAIL: ${emailVerificationCode}`);
    console.log(`📱 Código de verificação TELEFONE: ${phoneVerificationCode}`);

    // Retornar dados REAIS do banco
    return res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso!',
      data: {
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          birthDate: user.birthDate,    
          gender: user.gender,          
          height: user.height,          
          weight: user.weight,          
          targetWeight: user.targetWeight, 
          profileImage: user.profileImage,
          createdAt: user.createdAt // Data REAL
        }
      }
    });
  } catch (error) {
    console.error('❌ ERRO NO REGISTRO:');
    console.error('Mensagem:', error.message);
    console.error('Nome:', error.name);
    if (error.errors) {
      console.error('Erros de validação:', error.errors.map(e => ({
        campo: e.path,
        mensagem: e.message
      })));
    }
    return res.status(500).json({
      success: false,
      message: 'Erro ao cadastrar usuário.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// LOGIN - Autenticar usuário - VERSÃO CORRIGIDA COM LOGS
const login = async (req, res) => {
  console.log('🔍 === LOGIN REQUEST DETAILS ===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Body type:', typeof req.body);
  console.log('Body is object?', typeof req.body === 'object');
  console.log('=================================\n');

  try {
    const { email, password } = req.body;
    
    console.log('🔐 LOGIN DEBUG INICIADO ====================');
    console.log('Email recebido:', email);
    console.log('Senha recebida length:', password ? password.length : 0);
    console.log('Senha recebida (primeiros 10 chars):', password ? password.substring(0, Math.min(10, password.length)) + '...' : 'null');
    
    // VALIDAÇÃO CRÍTICA: Verificar se email não é um token JWT
    if (email && email.startsWith('eyJ')) {
      console.error('❌ ERRO: Email recebido parece ser um token JWT!');
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido.'
      });
    }

    // VALIDAÇÃO CRÍTICA: Verificar se password não é um objeto
    if (password && typeof password === 'object') {
      console.error('❌ ERRO: Password recebido é um objeto!');
      console.error('Password object:', JSON.stringify(password, null, 2));
      return res.status(400).json({
        success: false,
        message: 'Formato de senha inválido.'
      });
    }

    console.log('🔐 Tentativa de login para:', email);

    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log('❌ Usuário não encontrado:', email);
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos.'
      });
    }

    console.log('✅ Usuário encontrado:', user.fullName);
    console.log('📋 Dados do usuário no banco:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Senha no banco (hash):', user.password ? user.password.substring(0, 30) + '...' : 'null');
    console.log('  Senha length:', user.password ? user.password.length : 0);
    
    // DEBUG: Ver hash bcrypt
    if (user.password) {
      console.log('  Hash começa com:', user.password.substring(0, 7));
      console.log('  É hash bcrypt válido?', user.password.startsWith('$2'));
    }
    
    console.log('🔑 Comparando senha...');
    const isPasswordValid = await user.comparePassword(password);
    
    console.log('🔑 Resultado da comparação:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ SENHA INVÁLIDA - Diagnóstico:');
      
      // Testar manualmente
      try {
        // Tentar comparar com bcrypt direto
        const manualCheck = await bcrypt.compare(password, user.password);
        console.log('  Verificação manual bcrypt:', manualCheck);
        
        // Verificar se a senha está em plain text (sem hash)
        if (password === user.password) {
          console.log('  ⚠️ ATENÇÃO: Senha está em PLAIN TEXT no banco!');
        }
        
        // Verificar se a senha foi hashada múltiplas vezes
        const hashedOnce = await bcrypt.hash(password, 10);
        const doubleHashCheck = await bcrypt.compare(hashedOnce, user.password);
        console.log('  Verificação double-hash:', doubleHashCheck);
        
      } catch (bcryptError) {
        console.error('  Erro na verificação manual:', bcryptError.message);
      }
      
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos.'
      });
    }

    // GERAR TOKEN (CORRETAMENTE)
    const token = generateToken(user.id);
    
    // LOGS DETALHADOS DO TOKEN
    console.log('='.repeat(60));
    console.log('🔐 TOKEN COMPLETO GERADO NO BACKEND:');
    console.log('Valor completo:', token);
    console.log('Tamanho completo:', token.length);
    console.log('Primeiros 50 chars:', token.substring(0, 50));
    console.log('Últimos 50 chars:', token.substring(token.length - 50));
    console.log('='.repeat(60));

    // PREPARAR RESPOSTA
    const responseData = {
      success: true,
      message: 'Login realizado com sucesso!',
      data: {
        token: token, // TOKEN COMPLETO - SEM TRUNCAR
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          birthDate: user.birthDate,    
          gender: user.gender,          
          height: user.height,          
          weight: user.weight,          
          targetWeight: user.targetWeight,
          profileImage: user.profileImage,
          createdAt: user.createdAt
        }
      }
    };

    // LOG DA RESPOSTA (SEM TRUNCAR O TOKEN)
    console.log('📤 ENVIANDO RESPOSTA PARA O APP:');
    console.log('Token na resposta:', responseData.data.token);
    console.log('Token length na resposta:', responseData.data.token.length);
    
    // ENVIAR RESPOSTA
    return res.status(200).json(responseData);
    
  } catch (error) {
    console.error('❌ ERRO NO LOGIN:');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Erro ao fazer login. Tente novamente.'
    });
  }
};

// OBTER PERFIL
const getProfile = async (req, res) => {
  try {
    const user = req.user; 
    console.log('👤 Perfil solicitado para:', user.email);

    const age = calculateAge(user.birthDate);
    const currentBMI = calculateBMI(user.weight, user.height);

    console.log('📊 Dados calculados para perfil:');
    console.log(`   Idade: ${age} anos`);
    console.log(`   IMC: ${currentBMI}`);
    console.log(`   Peso: ${user.weight} kg`);
    console.log(`   Altura: ${user.height} cm`);
    
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          birthDate: user.birthDate,
          gender: user.gender,
          height: user.height,
          weight: user.weight,
          targetWeight: user.targetWeight,
          createdAt: user.createdAt,
          profileImage: user.profileImage || null, 
          age: age,
          bmi: currentBMI,
          bmiStatus: getBMIStatus(currentBMI)
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar perfil.'
    });
  }
};

// VERIFICAÇÃO DE EMAIL/TELEFONE
const verifyEmail = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email já verificado.' });
    }
    if (!user.emailVerificationCode || !user.emailVerificationExpires) {
      return res.status(400).json({ success: false, message: 'Nenhum código de verificação encontrado.' });
    }
    if (user.emailVerificationCode !== code) {
      return res.status(400).json({ success: false, message: 'Código inválido.' });
    }
    if (new Date() > user.emailVerificationExpires) {
      return res.status(400).json({ success: false, message: 'Código expirado. Solicite um novo código.' });
    }
    user.isEmailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    await user.save();
    res.status(200).json({ success: true, message: 'Email verificado com sucesso!' });
  } catch (error) {
    console.error('Erro ao verificar email:', error);
    res.status(500).json({ success: false, message: 'Erro ao verificar email.' });
  }
};

const verifyPhone = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }
    if (user.isPhoneVerified) {
      return res.status(400).json({ success: false, message: 'Telefone já verificado.' });
    }
    if (!user.phoneVerificationCode || !user.phoneVerificationExpires) {
      return res.status(400).json({ success: false, message: 'Nenhum código de verificação encontrado.' });
    }
    if (user.phoneVerificationCode !== code) {
      return res.status(400).json({ success: false, message: 'Código inválido.' });
    }
    if (new Date() > user.phoneVerificationExpires) {
      return res.status(400).json({ success: false, message: 'Código expirado. Solicite um novo código.' });
    }
    user.isPhoneVerified = true;
    user.phoneVerificationCode = null;
    user.phoneVerificationExpires = null;
    await user.save();
    res.status(200).json({ success: true, message: 'Telefone verificado com sucesso!' });
  } catch (error) {
    console.error('Erro ao verificar telefone:', error);
    res.status(500).json({ success: false, message: 'Erro ao verificar telefone.' });
  }
};

const resendVerificationCode = async (req, res) => {
  try {
    const { type } = req.body; 
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }
    if (type === 'email') {
      if (user.isEmailVerified) {
        return res.status(400).json({ success: false, message: 'Email já verificado.' });
      }
      const newCode = generateVerificationCode();
      user.emailVerificationCode = newCode;
      user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
      console.log(`📧 Novo código EMAIL para ${user.email}: ${newCode}`);
      res.status(200).json({ success: true, message: 'Novo código enviado para seu email!' });
    } else if (type === 'phone') {
      if (user.isPhoneVerified) {
        return res.status(400).json({ success: false, message: 'Telefone já verificado.' });
      }
      const newCode = generateVerificationCode();
      user.phoneVerificationCode = newCode;
      user.phoneVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
      console.log(`📱 Novo código TELEFONE para ${user.phone}: ${newCode}`);
      res.status(200).json({ success: true, message: 'Novo código enviado para seu telefone!' });
    } else {
      return res.status(400).json({ success: false, message: 'Tipo inválido. Use "email" ou "phone".' });
    }
  } catch (error) {
    console.error('Erro ao reenviar código:', error);
    res.status(500).json({ success: false, message: 'Erro ao reenviar código.' });
  }
};

// RECUPERAÇÃO DE SENHA
const requestPasswordReset = async (req, res) => {
  try {
    const { identifier } = req.body;
    let user = await User.findOne({ where: { email: identifier } });
    if (!user) {
      user = await User.findOne({ where: { phone: identifier } });
    }
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpires = expiresAt;
    await user.save();
    console.log(`📧 Código de recuperação para ${user.email}: ${resetCode}`);
    res.status(200).json({ success: true, message: 'Código de recuperação enviado com sucesso!' });
  } catch (error) {
    console.error('Erro ao solicitar recuperação:', error);
    res.status(500).json({ success: false, message: 'Erro ao processar solicitação.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { identifier, code, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'As senhas não coincidem.' });
    }
    let user = await User.findOne({ where: { email: identifier } });
    if (!user) {
      user = await User.findOne({ where: { phone: identifier } });
    }
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }
    if (!user.resetPasswordCode || !user.resetPasswordExpires) {
      return res.status(400).json({ success: false, message: 'Nenhum código de recuperação solicitado.' });
    }
    if (user.resetPasswordCode !== code) {
      return res.status(400).json({ success: false, message: 'Código inválido.' });
    }
    if (new Date() > user.resetPasswordExpires) {
      return res.status(400).json({ success: false, message: 'Código expirado. Solicite um novo código.' });
    }
    user.password = newPassword;
    user.resetPasswordCode = null;
    user.resetPasswordExpires = null;
    await user.save();
    res.status(200).json({ success: true, message: 'Senha redefinida com sucesso!' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ success: false, message: 'Erro ao redefinir senha.' });
  }
};

// Alterar senha (usuário logado)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id;
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'As senhas não coincidem.' });
    }
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Senha atual incorreta.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }
    user.password = newPassword;
    await user.save();
    res.status(200).json({ success: true, message: 'Senha alterada com sucesso!' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ success: false, message: 'Erro ao alterar senha.' });
  }
};

// Atualizar perfil do usuário
const updateProfile = async (req, res) => {
  try {
    const { fullName, gender, birthDate, weight, height, targetWeight, profileImage } = req.body; 
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }
    if (fullName !== undefined) user.fullName = fullName;
    if (gender !== undefined) user.gender = gender;
    if (birthDate !== undefined) user.birthDate = birthDate;
    if (weight !== undefined) user.weight = weight;
    if (height !== undefined) user.height = height;
    if (targetWeight !== undefined) user.targetWeight = targetWeight;
    if (profileImage !== undefined) user.profileImage = profileImage; 
    await user.save();
    const userData = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      birthDate: user.birthDate,
      weight: user.weight,
      height: user.height,
      targetWeight: user.targetWeight,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      profileImage: user.profileImage, 
    };
    res.status(200).json({ success: true, message: 'Perfil atualizado com sucesso!', data: { user: userData } });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar perfil.' });
  }
};

module.exports = {
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
};