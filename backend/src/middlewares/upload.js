const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB (PDF costuma passar de 3MB)
  fileFilter: (req, file, cb) => {
    const ok = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ].includes(file.mimetype);

    cb(ok ? null : new Error("Formato inválido. Use PDF/JPG/PNG/WEBP."), ok);
  },
});

module.exports = upload;
