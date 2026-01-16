// backend/src/routes/examRoutes.js
const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth');
const multer = require('../config/multer');
const examController = require('../controllers/examController');

router.post('/upload', authenticate, multer.single('file'), examController.uploadExam);
router.get('/history', authenticate, examController.getHistory);
router.get('/:id', authenticate, examController.getById);
router.post('/:id/analyze', authenticate, examController.analyzeById);


module.exports = router;
