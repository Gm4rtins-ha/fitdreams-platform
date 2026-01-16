// backend/src/controllers/examController.js
const fs = require('fs/promises');
const path = require('path');
const db = require('../models');
const { PDFDocument } = require('pdf-lib');
const { analyzeExamText } = require('../services/examAI');
const { ocrImageToText } = require('../services/ocrService');


let PDFParseClass = null;
let pdfParseFn = null;

// ✅ Compatível com pdf-parse v1 (função) e v2/v3 (classe PDFParse)
try {
  const mod = require('pdf-parse');

  if (typeof mod === 'function') {
    pdfParseFn = mod; // v1
  } else if (mod && typeof mod.default === 'function') {
    pdfParseFn = mod.default; // interop ESM
  } else if (mod && typeof mod.PDFParse === 'function') {
    PDFParseClass = mod.PDFParse; // v2/v3
  }
} catch (e) {
  console.error('❌ Falha ao carregar pdf-parse:', e);
}

/**
 * Extrai texto do PDF (Buffer)
 */
async function parsePdfBuffer(buffer) {
  if (pdfParseFn) {
    const result = await pdfParseFn(buffer);
    return result?.text || '';
  }

  if (PDFParseClass) {
    const parser = new PDFParseClass({ data: buffer });
    try {
      const result = await parser.getText();
      return result?.text || '';
    } finally {
      await parser.destroy();
    }
  }

  throw new Error('Biblioteca pdf-parse não está exportando uma função/classe compatível.');
}

/**
 * ✅ Conta páginas SEM pdfjs-dist
 */
async function getPdfPageCount(buffer) {
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return pdfDoc.getPageCount();
}

function safeJsonParse(value) {
  if (!value) return null;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return null;
  }
}

/**
 * ✅ Converte imagem em PDF (1 página A4)
 */
async function convertImageFileToPdf({ imagePath, mimetype }) {
  const imageBytes = await fs.readFile(imagePath);
  const pdfDoc = await PDFDocument.create();

  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;

  let embedded;
  const mt = (mimetype || '').toLowerCase();

  if (mt.includes('png')) {
    embedded = await pdfDoc.embedPng(imageBytes);
  } else {
    embedded = await pdfDoc.embedJpg(imageBytes);
  }

  const imgW = embedded.width;
  const imgH = embedded.height;

  const margin = 24;
  const maxW = A4_WIDTH - margin * 2;
  const maxH = A4_HEIGHT - margin * 2;

  const scale = Math.min(maxW / imgW, maxH / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;

  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const x = (A4_WIDTH - drawW) / 2;
  const y = (A4_HEIGHT - drawH) / 2;

  page.drawImage(embedded, { x, y, width: drawW, height: drawH });

  const pdfBuffer = await pdfDoc.save();

  const dir = path.dirname(imagePath);
  const base = path.basename(imagePath, path.extname(imagePath));
  const pdfPath = path.join(dir, `${base}.pdf`);

  await fs.writeFile(pdfPath, pdfBuffer);

  return { pdfBuffer, pdfPath };
}

/**
 * POST /api/exams/upload
 */
exports.uploadExam = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file?.path) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const incomingPath = req.file.path;
    const incomingMime = req.file.mimetype || '';
    console.log('📄 Arquivo recebido em:', incomingPath, '| mime:', incomingMime);

    const examTypeRaw = req.body?.examType || req.body?.exam_type || 'Exame de sangue';
    const examType = String(examTypeRaw).trim() || 'Exame de sangue';

    const examDateRaw = req.body?.examDate || req.body?.exam_date;
    const examDate = examDateRaw ? new Date(examDateRaw) : new Date();

    let filePathToAnalyze = incomingPath;
    let pdfBuffer = null;

    if (incomingMime.startsWith('image/')) {
      console.log('🖼️ Entrada é imagem. Convertendo para PDF...');
      const converted = await convertImageFileToPdf({
        imagePath: incomingPath,
        mimetype: incomingMime,
      });
      pdfBuffer = converted.pdfBuffer;
      filePathToAnalyze = converted.pdfPath;
      console.log('✅ Imagem convertida para PDF em:', filePathToAnalyze);
    } else {
      pdfBuffer = await fs.readFile(incomingPath);
    }

    const pagesTotal = await getPdfPageCount(pdfBuffer);
    const pagesProcessed = pagesTotal;
    console.log('📄 PDF páginas detectadas:', pagesTotal);

   let finalText = await parsePdfBuffer(pdfBuffer);
   let charactersExtracted = (finalText || '').length;
     
   // ✅ Se for imagem e o PDF não tiver texto suficiente → OCR
   if (charactersExtracted < 200) {

     try {
       console.log('🔎 Pouco texto no PDF. Executando OCR com pré-processamento...');
       const ocrText = await ocrImageToText(incomingPath);
     
       if (ocrText && ocrText.length > charactersExtracted) {
         finalText = ocrText;
         charactersExtracted = ocrText.length;
         console.log('✅ OCR aplicado com sucesso. chars:', charactersExtracted);
       } else {
         console.log('⚠️ OCR retornou pouco texto também.');
       }
     } catch (e) {
       console.error('❌ Erro ao executar OCR:', e?.message || e);
     }
   }
   

    const resultPayload = {
      meta: {
        pagesTotal,
        pagesProcessed,
        charactersExtracted,
        status: charactersExtracted >= 200 ? 'completed' : 'completed_with_low_text',
        inputMime: incomingMime,
        storedAsPdf: true,
      },
      extractedTextPreview: (finalText || '').slice(0, 6000),
    };

    const created = await db.Exam.create({
      userId,
      examType,
      examDate,
      fileUrl: filePathToAnalyze,
      notes:
        charactersExtracted >= 200
          ? `PDF analisado. Páginas: ${pagesProcessed}/${pagesTotal}.`
          : `PDF lido (páginas: ${pagesProcessed}/${pagesTotal}), porém com pouco texto extraído (provável exame escaneado/foto).`,
      result: JSON.stringify(resultPayload),
    });

    return res.status(201).json({
      success: true,
      data: {
        id: created.id,
        examType: created.examType,
        examDate: created.examDate,
        fileUrl: created.fileUrl,
        notes: created.notes,
        result: safeJsonParse(created.result),
      },
    });
  } catch (error) {
    console.error('❌ Erro em uploadExam:', error);
    return res.status(500).json({
      error: 'Erro ao processar exame.',
      details: error.message,
    });
  }
};

/**
 * GET /api/exams/history
 */
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const exams = await db.Exam.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    const data = exams.map((e) => ({
      id: e.id,
      examType: e.examType,
      examDate: e.examDate,
      fileUrl: e.fileUrl,
      notes: e.notes,
      result: safeJsonParse(e.result),
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Erro em getHistory:', error);
    return res.status(500).json({
      error: 'Erro ao buscar histórico de exames.',
      details: error.message,
    });
  }
};

/**
 * GET /api/exams/:id
 */
exports.getById = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);

    const exam = await db.Exam.findOne({ where: { id, userId } });
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exame não encontrado.' });
    }

    return res.json({
      success: true,
      data: {
        id: exam.id,
        examType: exam.examType,
        examDate: exam.examDate,
        fileUrl: exam.fileUrl,
        notes: exam.notes,
        result: safeJsonParse(exam.result),
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar exame.',
      details: error.message,
    });
  }
};

/**
 * POST /api/exams/:id/analyze
 */
exports.analyzeById = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);

    const exam = await db.Exam.findOne({ where: { id, userId } });
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exame não encontrado.' });
    }

    const parsed = safeJsonParse(exam.result) || {};
    const text = parsed?.extractedTextPreview || '';

    if (!text || text.trim().length < 200) {
      return res.status(422).json({
        success: false,
        error: 'Texto insuficiente para análise. PDF pode estar escaneado/foto (sem OCR).',
        meta: parsed?.meta || null,
      });
    }

    // ✅ análise robusta (se vier string, tenta converter)
    let analysis;
    try {
      analysis = await analyzeExamText(text);
      if (typeof analysis === 'string') {
        analysis = safeJsonParse(analysis) || { raw: analysis };
      }
    } catch (e) {
      console.error('❌ analyzeExamText falhou:', e?.message || e);
      return res.status(500).json({
        success: false,
        error: e?.message || 'Falha ao analisar exame.',
      });
    }

    const newPayload = {
      ...parsed,
      analysis,
      analyzedAt: new Date().toISOString(),
    };

    exam.result = JSON.stringify(newPayload);
    await exam.save();

    return res.json({ success: true, data: analysis });
  } catch (err) {
    console.error('❌ Erro analyzeById:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
