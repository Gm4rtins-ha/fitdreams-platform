// backend/src/controllers/BodyMeasurements.js
const db = require('../models');

const pickNumberOrNull = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Campos que vamos suportar (cm)
const FIELDS = [
  'neck',
  'shoulder',
  'chest',
  'waist',
  'abdomenUpper',
  'abdomenLower',
  'hip',
  'armLeft',
  'armRight',
  'forearmLeft',
  'forearmRight',
  'thighLeft',
  'thighRight',
  'calfLeft',
  'calfRight',
];

exports.getLatest = async (req, res) => {
  try {
    const userId = req.user.id;

    const latest = await db.BodyMeasurement.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    if (!latest) return res.json({ success: true, data: null });

    const data = {};
    for (const f of FIELDS) data[f] = latest[f] ?? null;

    return res.json({
      success: true,
      data: {
        ...data,
        updatedAt: latest.createdAt,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const history = await db.BodyMeasurement.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    return res.json({
      success: true,
      data: history.map((item) => {
        const obj = { id: item.id, createdAt: item.createdAt };
        for (const f of FIELDS) obj[f] = item[f] ?? null;
        return obj;
      }),
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

exports.createMeasurement = async (req, res) => {
  try {
    const userId = req.user.id;

    const payload = { userId };

    // ✅ fallback: aceita nomes antigos do app
    const body = req.body || {};
    body.abdomenUpper = body.abdomenUpper ?? body.upperAbdomen;
    body.abdomenLower = body.abdomenLower ?? body.lowerAbdomen;

    for (const f of FIELDS) payload[f] = pickNumberOrNull(body?.[f]);

    const hasAny = FIELDS.some((f) => payload[f] !== null);
    if (!hasAny) {
      return res.status(422).json({
        success: false,
        error: 'Envie ao menos uma medida (em cm).',
      });
    }

    const created = await db.BodyMeasurement.create(payload);

    const data = { id: created.id, createdAt: created.createdAt };
    for (const f of FIELDS) data[f] = created[f] ?? null;

    return res.status(201).json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

