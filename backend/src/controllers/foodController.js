// backend/src/controllers/foodController.js
const db = require('../models');
const OpenAI = require('openai');
const { Op } = require('sequelize');
const fatsecretService = require('../services/fatsecretService');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// multiplicadores aproximados por tamanho de porção
const PORTION_MULTIPLIERS = {
  small: 0.6,
  medium: 1.0,
  large: 1.4,
};

// converte buffer de imagem para base64 no formato aceito pelo GPT
function bufferToBase64ImageUrl(buffer, mimeType = 'image/jpeg') {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

// ✅ parse numérico robusto (evita NaN e strings "250 kcal", "12,5g")
function toNumber(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;

  const s = String(v)
    .replace(',', '.')
    .replace(/[^0-9.\-]/g, '');

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// ======================================
// POST /api/food/analyze
// ======================================
exports.analyzeAndSave = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Imagem não enviada.',
      });
    }

    const userId = req.user.id;
    const mimeType = req.file.mimetype || 'image/jpeg';
    const imageDataUrl = bufferToBase64ImageUrl(req.file.buffer, mimeType);

    // 🔹 IA devolve lista de itens da refeição, sem calcular macros
    const systemPrompt = `
Você é um nutricionista especialista em análise visual de refeições.

Você receberá a FOTO de um prato (pode ter 1 ou mais alimentos).
Seu papel NÃO é calcular calorias nem macronutrientes.
Seu papel é APENAS identificar claramente os alimentos presentes e o tamanho aproximado de cada porção.

Responda SEMPRE em JSON válido, SEM TEXTO ANTES OU DEPOIS, neste formato:

{
  "items": [
    {
      "name": "nome do alimento em português, bem objetivo (ex: frango grelhado, arroz branco, feijão carioca)",
      "portion": "small | medium | large",
      "estimatedPortionGrams": 0,
      "itemNote": "comentário opcional sobre esse item (ex: gordura visível, muito molho, porção grande etc.)"
    }
  ],
  "overallNotes": "comentários gerais sobre a refeição (qualidade nutricional, equilíbrio, pontos de atenção)"
}

Regras importantes:
- SEMPRE use "items" como array.
- Se tiver apenas 1 alimento, ainda assim retorne um array com 1 item.
- A porção (portion) deve ser "small", "medium" ou "large".
- "estimatedPortionGrams" deve ser um número aproximado (ex: 80, 120, 200).
- NÃO coloque calorias, proteína, carboidratos ou gorduras. Esses valores serão calculados por outra parte do sistema.
    `.trim();

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Identifique todos os alimentos do prato e retorne APENAS o JSON no formato pedido.',
            },
            {
              type: 'image_url',
              image_url: { url: imageDataUrl },
            },
          ],
        },
      ],
      temperature: 0.3,
    });

    // ====== TRATAR CONTENT (string ou array) ======
    const choice = completion.choices?.[0];
    const msg = choice?.message;

    let rawContent = '';

    if (Array.isArray(msg?.content)) {
      rawContent = msg.content
        .map((part) => {
          if (part.type === 'text' && part.text) return part.text;
          return '';
        })
        .join('\n')
        .trim();
    } else {
      rawContent = (msg?.content || '').toString().trim();
    }

    console.log('🧠 Resposta bruta da IA (detecção de itens):', rawContent);

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error('⚠️ Conteúdo não JSON:', rawContent);
        throw new Error('Resposta da IA não está em JSON.');
      }
      parsed = JSON.parse(match[0]);
    }

    // Normaliza os itens
    let itemsFromAI = [];
    if (Array.isArray(parsed.items) && parsed.items.length > 0) {
      itemsFromAI = parsed.items
        .map((it) => ({
          name: (it.name || '').toString().trim(),
          portion: (it.portion || 'medium').toLowerCase(),
          estimatedPortionGrams:
            typeof it.estimatedPortionGrams === 'number'
              ? it.estimatedPortionGrams
              : null,
          itemNote: it.itemNote || null,
        }))
        .filter((it) => it.name.length > 0);
    }

    // fallback caso a IA bugue
    if (itemsFromAI.length === 0) {
      itemsFromAI = [
        {
          name: 'Refeição analisada',
          portion: 'medium',
          estimatedPortionGrams: null,
          itemNote: null,
        },
      ];
    }

    const overallNotes = parsed.overallNotes || null;

    // ==========================================
    // 🔹 INTEGRAÇÃO AVANÇADA COM FATSECRET
    // ==========================================
    const detailedItems = [];

    const totals = {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    };

    // ✅ Flag real: só vira true se algum macro vier mesmo
    let hasAnyMacro = false;

    for (const item of itemsFromAI) {
      try {
        if (!item.name) continue;

        console.log('🍽  Buscando alimento na FatSecret:', item.name);

        const foods = await fatsecretService.searchFood(item.name, 5);

        if (!foods || foods.length === 0) {
          console.log('⚠️ FatSecret: nenhum alimento encontrado para', item.name);

          detailedItems.push({
            name: item.name,
            portion: item.portion,
            matchedFoodName: null,
            servingDescription: null,
            calories: null,
            protein: null,
            fat: null,
            carbs: null,
            source: 'name_only',
            itemNote: item.itemNote || null,
          });

          continue;
        }

        // por enquanto, escolhemos o primeiro resultado
        const bestMatch = foods[0];

        console.log(
          '✅ FatSecret - melhor match:',
          bestMatch.food_name,
          'ID:',
          bestMatch.food_id
        );

        const foodDetails = await fatsecretService.getFoodDetails(bestMatch.food_id);
        const macrosRaw = fatsecretService.extractMacrosFromFood(foodDetails);

        if (!macrosRaw) {
          console.log('⚠️ FatSecret: sem macros para', item.name);

          detailedItems.push({
            name: item.name,
            portion: item.portion,
            matchedFoodName: bestMatch.food_name,
            servingDescription: null,
            calories: null,
            protein: null,
            fat: null,
            carbs: null,
            source: 'fatsecret_no_macros',
            itemNote: item.itemNote || null,
          });

          continue;
        }

        // ✅ garante que macros são numéricos
        const macros = {
          calories: toNumber(macrosRaw.calories),
          protein: toNumber(macrosRaw.protein),
          fat: toNumber(macrosRaw.fat),
          carbs: toNumber(macrosRaw.carbs),
          servingDescription: macrosRaw.servingDescription || null,
        };

        const portionKey = (item.portion || 'medium').toLowerCase();
        const factor = PORTION_MULTIPLIERS[portionKey] || 1.0;

        const itemCalories = macros.calories != null ? macros.calories * factor : null;
        const itemProtein = macros.protein != null ? macros.protein * factor : null;
        const itemFat = macros.fat != null ? macros.fat * factor : null;
        const itemCarbs = macros.carbs != null ? macros.carbs * factor : null;

        // ✅ marca que veio macro de verdade
        if ([itemCalories, itemProtein, itemFat, itemCarbs].some((v) => v != null && Number.isFinite(v))) {
          hasAnyMacro = true;
        }

        if (itemCalories != null) totals.calories += itemCalories;
        if (itemProtein != null) totals.protein += itemProtein;
        if (itemFat != null) totals.fat += itemFat;
        if (itemCarbs != null) totals.carbs += itemCarbs;

        detailedItems.push({
          name: item.name,
          portion: portionKey,
          portionFactor: factor,
          matchedFoodName: bestMatch.food_name,
          servingDescription: macros.servingDescription,
          calories: itemCalories != null ? Number(itemCalories.toFixed(0)) : null,
          protein: itemProtein != null ? Number(itemProtein.toFixed(1)) : null,
          fat: itemFat != null ? Number(itemFat.toFixed(1)) : null,
          carbs: itemCarbs != null ? Number(itemCarbs.toFixed(1)) : null,
          source: 'fatsecret',
          itemNote: item.itemNote || null,
        });
      } catch (err) {
        console.error('❌ Erro ao consultar FatSecret para item', item?.name, err);

        detailedItems.push({
          name: item.name,
          portion: item.portion,
          matchedFoodName: null,
          servingDescription: null,
          calories: null,
          protein: null,
          fat: null,
          carbs: null,
          source: 'error',
          itemNote: item.itemNote || null,
        });
      }
    }

    // ✅ FIX PRINCIPAL:
    // - Não usa "truthy" (0 não vira null)
    // - Só retorna número se realmente houve macro
    const totalRounded = hasAnyMacro
      ? {
          calories: Number.isFinite(totals.calories) ? Number(totals.calories.toFixed(0)) : null,
          protein: Number.isFinite(totals.protein) ? Number(totals.protein.toFixed(1)) : null,
          fat: Number.isFinite(totals.fat) ? Number(totals.fat.toFixed(1)) : null,
          carbs: Number.isFinite(totals.carbs) ? Number(totals.carbs.toFixed(1)) : null,
        }
      : {
          calories: null,
          protein: null,
          fat: null,
          carbs: null,
        };

    // Nome resumo da refeição pra salvar no banco
    const summaryFoodName =
      detailedItems
        .map((i) => i.name)
        .filter(Boolean)
        .join(' + ')
        .slice(0, 255) || 'Refeição analisada';

    // ==========================================
    // 🔐 SALVAR NO BANCO (resumo da refeição)
    // ==========================================
    const log = await db.FoodLog.create({
      userId,
      foodName: summaryFoodName,
      calories: totalRounded.calories,
      protein: totalRounded.protein,
      fat: totalRounded.fat,
      carbs: totalRounded.carbs,
      notes: overallNotes,
      imageBase64: imageDataUrl,
      loggedAt: new Date(),
    });

    // ==========================================
    // 🔙 RESPOSTA PARA O APP
    // ==========================================
    return res.status(200).json({
      success: true,
      message: 'Análise realizada e refeição salva.',
      data: {
        // compatibilidade com o app atual
        foodName: summaryFoodName,
        calories: totalRounded.calories,
        protein: totalRounded.protein,
        fat: totalRounded.fat,
        carbs: totalRounded.carbs,
        notes: overallNotes,

        // novo modelo profissional
        items: detailedItems,
        total: totalRounded,

        id: log.id,
        loggedAt: log.loggedAt,
      },
    });
  } catch (error) {
    console.error('❌ Erro em analyzeAndSave:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao analisar refeição.',
    });
  }
};

// ======================================
// GET /api/food/history?days=7
// OU ?from=2025-12-01&to=2025-12-08
// ======================================
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days, from, to } = req.query;

    const where = { userId };

    if (from || to) {
      where.loggedAt = {};
      if (from) {
        where.loggedAt[Op.gte] = new Date(from);
      }
      if (to) {
        where.loggedAt[Op.lte] = new Date(to);
      }
    } else if (days) {
      const d = parseInt(days, 10);
      if (!isNaN(d) && d > 0) {
        const since = new Date();
        since.setDate(since.getDate() - d);
        where.loggedAt = { [Op.gte]: since };
      }
    }

    const logs = await db.FoodLog.findAll({
      where,
      order: [['loggedAt', 'DESC']],
      attributes: [
        'id',
        'foodName',
        'calories',
        'protein',
        'fat',
        'carbs',
        'notes',
        'loggedAt',
        'imageBase64',
      ],
    });

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('❌ Erro em getHistory:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar histórico alimentar.',
    });
  }
};
