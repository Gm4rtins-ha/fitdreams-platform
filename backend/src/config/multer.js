// backend/src/config/multer.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadFolder = path.resolve(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '';
    cb(null, unique + ext.toLowerCase());
  },
});

const allowedMime = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const fileFilter = (req, file, cb) => {
  if (!file?.mimetype) return cb(new Error('Arquivo sem mimetype'), false);

  if (allowedMime.has(file.mimetype)) return cb(null, true);

  return cb(
    new Error(`Tipo de arquivo não permitido: ${file.mimetype}`),
    false
  );
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
});

module.exports = upload;
