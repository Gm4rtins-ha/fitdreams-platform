// backend/src/routes/BodyMeasurements.js
const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth');

// ✅ No seu projeto o controller é: controllers/BodyMeasurements.js
const BodyMeasurements = require('../controllers/BodyMeasurements');

// ✅ Endpoints que seu frontend já tentou chamar
router.get('/latest', authenticate, BodyMeasurements.getLatest);
router.get('/history', authenticate, BodyMeasurements.getHistory);

// ✅ Para não dar 404 quando o app chamar /body-measurements
router.get('/', authenticate, BodyMeasurements.getHistory);

// ✅ Criar uma nova medição (pode mandar só alguns campos)
router.post('/', authenticate, BodyMeasurements.createMeasurement);

module.exports = router;
