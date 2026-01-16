// backend/src/services/examAI.js
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ========= Helpers =========
function extractFirstJsonObject(text = '') {
  // tenta pegar o primeiro objeto JSON no meio de texto (inclui quebras de linha)
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

function safeJsonParse(value) {
  if (!value) return null;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return null;
  }
}

function validateAnalysisShape(obj) {
  // validação leve (evita retornar coisas totalmente erradas)
  if (!obj || typeof obj !== 'object') return false;

  if (!obj.summary || typeof obj.summary !== 'object') return false;
  if (!Array.isArray(obj.summary.positives)) return false;
  if (!Array.isArray(obj.summary.warnings)) return false;
  if (!Array.isArray(obj.summary.critical)) return false;

  if (!Array.isArray(obj.items)) return false;

  // items opcionais, mas se existir, deve ser objeto com alguns campos
  for (const it of obj.items) {
    if (!it || typeof it !== 'object') return false;
    // section/label/value/interpretation podem vir vazios, mas devem ser strings se presentes
    for (const k of ['section', 'label', 'value', 'interpretation']) {
      if (it[k] != null && typeof it[k] !== 'string') return false;
    }
  }

  return true;
}

// limita tamanho do texto para reduzir chance de resposta “bagunçada”
function trimTextForModel(text, maxChars = 20000) {
  const t = String(text || '');
  if (t.length <= maxChars) return t;
  return t.slice(0, maxChars) + '\n\n[TRUNCADO: texto muito grande]';
}

async function callModelForJson({ model, system, user, temperature = 0.2 }) {
  // tenta usar response_format JSON (quando suportado) e cai em fallback se não der.
  // Observação: algumas versões do SDK/modelos podem recusar response_format; por isso try/catch.
  try {
    const resp = await client.chat.completions.create({
      model,
      temperature,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      // força “JSON object” quando suportado
      response_format: { type: 'json_object' },
    });

    return resp.choices[0]?.message?.content || '';
  } catch (e) {
    // fallback sem response_format
    const resp = await client.chat.completions.create({
      model,
      temperature,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    return resp.choices[0]?.message?.content || '';
  }
}

async function repairToValidJson({ model, raw }) {
  const system = 'Você é um validador e corretor de JSON.';
  const user = `
Converta o conteúdo abaixo em um JSON VÁLIDO, retornando APENAS o JSON final (sem texto, sem markdown).
Regras:
- Use aspas duplas em todas as chaves/strings
- Não inclua comentários
- Não inclua texto fora do JSON

CONTEÚDO:
${raw}
`.trim();

  return callModelForJson({ model, system, user, temperature: 0 });
}

// ========= Main =========
/**
 * Recebe o texto extraído do PDF do exame de sangue
 * e retorna um JSON estruturado com summary + items.
 */
async function analyzeExamText(text) {
  const model = process.env.EXAM_AI_MODEL || 'gpt-4o-mini';

  const trimmed = trimTextForModel(text, 20000);

  const system = 'Você é um médico especialista em exames laboratoriais.';
  const user = `
Você interpreta exames de sangue a partir de TEXTO BRUTO (valores + referências).

TAREFA:
1) Identificar parâmetros (glicemia, lipídios, enzimas hepáticas, etc.)
2) Para cada parâmetro, indicar: BAIXO, NORMAL, ALTO ou CRÍTICO (usando a referência do próprio exame)
3) Escrever interpretação em português (1–2 frases), simples e correta.

RETORNE EXATAMENTE NESTE FORMATO JSON:
{
  "summary": {
    "positives": ["..."],
    "warnings": ["..."],
    "critical": ["..."]
  },
  "items": [
    {
      "section": "Metabolismo da Glicose",
      "label": "Glicemia de Jejum",
      "value": "92 mg/dL",
      "interpretation": "..."
    }
  ]
}

REGRAS IMPORTANTES:
- RESPONDA APENAS COM O JSON (sem markdown, sem texto extra)
- Se não encontrar algo, não invente: apenas não inclua no items
- Use seções lógicas: "Metabolismo da Glicose", "Perfil Lipídico", "Função Hepática", "Inflamação", etc.

TEXTO DO EXAME:
"""${trimmed}"""
`.trim();

  // 1) primeira chamada (forçando json quando possível)
  const content = await callModelForJson({
    model,
    system,
    user,
    temperature: 0.2,
  });

  // tenta parse direto
  let parsed = safeJsonParse(content);

  // 2) se falhar, tenta extrair o primeiro {...}
  if (!parsed) {
    const extracted = extractFirstJsonObject(content);
    parsed = safeJsonParse(extracted);
  }

  // 3) se ainda falhar, faz repair com 2ª chamada
  if (!parsed) {
    console.error('⚠️ JSON inválido na 1ª tentativa. Tentando repair...');
    console.error('🧾 Conteúdo recebido (início):', String(content).slice(0, 500));

    const fixed = await repairToValidJson({ model, raw: content });
    parsed = safeJsonParse(fixed);

    if (!parsed) {
      const extracted2 = extractFirstJsonObject(fixed);
      parsed = safeJsonParse(extracted2);
    }
  }

  // 4) valida estrutura mínima
  if (!validateAnalysisShape(parsed)) {
    console.error('❌ Estrutura inválida retornada pela IA.');
    console.error('🧾 Conteúdo original (início):', String(content).slice(0, 500));
    console.error('🧾 Objeto parseado:', parsed);

    throw new Error('Resposta da IA não veio em JSON válido.');
  }

  return parsed;
}

module.exports = {
  analyzeExamText,
};
