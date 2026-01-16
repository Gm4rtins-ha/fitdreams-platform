// src/routes/userRoutes.js - VERSÃO DEFINITIVA
const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/auth');
const upload = require('../middlewares/upload');


// 🔐 Normaliza o middleware de autenticação
// (funciona se o auth exportar direto ou como { authenticate })
const authenticate = authMiddleware.authenticate || authMiddleware;

// =========================
// ROTAS DE PERFIL
// =========================

// Obter perfil completo do usuário logado
router.get('/profile', authenticate, userController.getProfile);

// Atualizar perfil (nome, altura, etc.)
router.put('/profile', authenticate, userController.updateProfile);

// 🆕 ATUALIZAR APENAS META DE PESO
// URL final: PUT /api/users/profile/target-weight
router.put('/profile/target-weight', authenticate, userController.updateTargetWeight);

// Dashboard resumido (se quiser usar depois)
router.get('/dashboard', authenticate, userController.getDashboard);

// Upload da foto de perfil
router.put('/profile/photo', authenticate, upload.single('photo'), userController.updateProfilePhoto);

module.exports = router;
