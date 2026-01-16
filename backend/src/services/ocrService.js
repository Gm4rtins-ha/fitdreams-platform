const Tesseract = require('tesseract.js');
const fs = require('fs/promises');

async function ocrImageFromFile(imagePath) {
  const buffer = await fs.readFile(imagePath);

  const { data } = await Tesseract.recognize(buffer, 'por', {
    logger: () => {}, // silencioso
  });

  return (data?.text || '').trim();
}

module.exports = {
  ocrImageFromFile,
};
