// backend/src/routes/foodRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const foodController = require('../controllers/foodController');
const authMiddleware = require('../middlewares/auth');

// normaliza middleware (igual fizemos em weightRoutes)
const authenticate = authMiddleware.authenticate || authMiddleware;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// POST /api/food/analyze  (envia imagem, IA analisa, salva no banco)
router.post(
  '/analyze',
  authenticate,
  upload.single('image'),
  foodController.analyzeAndSave
);

// GET /api/food/history?days=7
router.get(
  '/history',
  authenticate,
  foodController.getHistory
);

module.exports = router;
