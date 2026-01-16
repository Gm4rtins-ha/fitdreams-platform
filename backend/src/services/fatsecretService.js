// backend/src/services/fatsecretService.js
// Serviço para falar com a FatSecret usando OAuth 2.0 (Client Credentials)
// e métodos foods.search / food.get

const axios = require('axios');
const querystring = require('querystring');

const FATSECRET_BASE_URL = 'https://platform.fatsecret.com/rest/server.api';
const FATSECRET_TOKEN_URL = 'https://oauth.fatsecret.com/connect/token';

// Preferimos variáveis com nome de OAuth2, mas aceitamos as antigas pra não quebrar nada
const CLIENT_ID =
  process.env.FATSECRET_CLIENT_ID || process.env.FATSECRET_CONSUMER_KEY;
const CLIENT_SECRET =
  process.env.FATSECRET_CLIENT_SECRET || process.env.FATSECRET_CONSUMER_SECRET;

console.log(
  '🔑 FatSecret client carregado?',
  'ID:', !!CLIENT_ID,
  'SECRET:', !!CLIENT_SECRET
);

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn(
    '⚠️ FATSECRET_CLIENT_ID ou FATSECRET_CLIENT_SECRET não definidos no .env (ou equivalentes FATSECRET_CONSUMER_KEY/SECRET).'
  );
}

/**
 * Cache simples de token em memória
 */
let cachedToken = null;
let cachedTokenExpiresAt = 0; // timestamp (ms)

/**
 * Obtém token de acesso OAuth2 via Client Credentials
 */
async function getAccessToken() {
  // ainda válido? reaproveita
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt - 60_000) {
    // renova 1 min antes de expirar
    return cachedToken;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      'Credenciais da FatSecret não configuradas (FATSECRET_CLIENT_ID / FATSECRET_CLIENT_SECRET).'
    );
  }

  console.log('🔐 Solicitando novo access_token à FatSecret...');

  const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
    'base64'
  );

  const body = querystring.stringify({
    grant_type: 'client_credentials',
    scope: 'basic', // é o escopo padrão recomendado pela FatSecret
  });

  const response = await axios.post(FATSECRET_TOKEN_URL, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
  });

  const data = response.data || {};
  if (!data.access_token) {
    console.error('❌ Erro ao obter token da FatSecret:', data);
    throw new Error('Não foi possível obter access_token da FatSecret');
  }

  const expiresIn = data.expires_in || 3600; // segundos
  cachedToken = data.access_token;
  cachedTokenExpiresAt = Date.now() + expiresIn * 1000;

  console.log(
    '✅ Token FatSecret obtido. Expira em ~',
    Math.round(expiresIn / 60),
    'minutos.'
  );

  return cachedToken;
}

/**
 * Chamada genérica à API da FatSecret (agora com Bearer token, sem assinatura OAuth1)
 * @param {string} method ex: 'foods.search', 'food.get'
 * @param {object} extraParams parâmetros adicionais
 */
async function callFatSecret(method, extraParams = {}) {
  const accessToken = await getAccessToken();

  const params = {
    method,
    format: 'json',
    ...extraParams,
  };

  const url = `${FATSECRET_BASE_URL}?${querystring.stringify(params)}`;

  console.log('🌍 Chamando FatSecret:', method, 'params:', extraParams);

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  console.log('✅ FatSecret OK status:', response.status);

  const data = response.data;

  // Se vier erro dentro do JSON, loga pra facilitar debug
  if (data && data.error) {
    console.warn('⚠️ FatSecret retornou erro na payload:', data.error);
  }

  return data;
}

/**
 * Normaliza/“traduz” consultas em PT para algo mais amigável à FatSecret (EN)
 */
function normalizeQuery(originalQuery = '') {
  let q = originalQuery.toLowerCase().trim();
  if (!q) return q;

  const directMap = {
    'arroz branco': 'white rice',
    'arroz integral': 'brown rice',
    'frango ao molho': 'chicken in sauce',
    'frango com molho': 'chicken with sauce',
    'frango grelhado': 'grilled chicken breast',
    'frango assado': 'roast chicken',
    'batata palha': 'potato sticks',
    'batata frita': 'french fries',
    'feijão carioca': 'pinto beans',
    'feijão preto': 'black beans',
    'salada verde': 'green salad',
  };

  if (directMap[q]) return directMap[q];

  let norm = q;

  norm = norm.replace(/\bfrango\b/g, 'chicken');
  norm = norm.replace(/\barroz\b/g, 'rice');
  norm = norm.replace(/\bbatata\b/g, 'potato');
  norm = norm.replace(/\bfeij[aã]o\b/g, 'beans');
  norm = norm.replace(/\bsalada\b/g, 'salad');
  norm = norm.replace(/\bcarne\b/g, 'beef');
  norm = norm.replace(/\bqueijo\b/g, 'cheese');
  norm = norm.replace(/\bp[aã]o\b/g, 'bread');

  norm = norm.replace(/\bau molho\b/g, '');
  norm = norm.replace(/\bcom\b/g, '');
  norm = norm.replace(/\bgratinado\b/g, '');
  norm = norm.replace(/\bassado\b/g, '');
  norm = norm.replace(/\bfrito\b/g, 'fried');

  norm = norm.replace(/\s{2,}/g, ' ').trim();

  return norm || q;
}

/**
 * Busca alimentos pelo nome (texto)
 * Tenta:
 *   1) query original
 *   2) query normalizada/“traduzida” (se for diferente)
 * @param {string} query - descrição do alimento ("frango com arroz")
 * @param {number} maxResults
 */
async function searchFood(query, maxResults = 5) {
  const attempts = [];
  const original = (query || '').trim();

  if (original) attempts.push({ label: 'original', q: original });

  const normalized = normalizeQuery(original);
  if (normalized && normalized !== original) {
    attempts.push({ label: 'normalized', q: normalized });
  }

  for (const attempt of attempts) {
    console.log(`🔎 FatSecret foods.search (${attempt.label}): "${attempt.q}"`);

    const data = await callFatSecret('foods.search', {
      search_expression: attempt.q,
      max_results: maxResults,
    });

    if (!data || !data.foods) {
      console.log(
        '📦 FatSecret resposta sem "foods" para',
        attempt.q,
        '- JSON bruto:',
        JSON.stringify(data)
      );
      continue;
    }

    let list = data.foods.food;
    if (!list) {
      console.log('⚠️ FatSecret: foods.food vazio para', attempt.q);
      continue;
    }

    if (!Array.isArray(list)) {
      list = [list];
    }

    if (list.length > 0) {
      console.log(
        `✅ FatSecret: encontrados ${list.length} itens para "${attempt.q}"`
      );
      return list;
    }
  }

  console.log('⚠️ FatSecret: nenhum alimento encontrado para', query);
  return [];
}

/**
 * Pega detalhes de um alimento específico
 * @param {string|number} foodId
 */
async function getFoodDetails(foodId) {
  const data = await callFatSecret('food.get', {
    food_id: foodId,
  });

  return data.food || null;
}

/**
 * Extrai uma porção padrão (serving) e macros principais
 */
function extractMacrosFromFood(food) {
  if (!food || !food.servings || !food.servings.serving) return null;

  let serving = food.servings.serving;
  if (Array.isArray(serving)) {
    serving = serving[0];
  }

  return {
    servingDescription: serving.serving_description,
    calories: serving.calories ? Number(serving.calories) : null,
    protein: serving.protein ? Number(serving.protein) : null,
    fat: serving.fat ? Number(serving.fat) : null,
    carbs: serving.carbohydrate ? Number(serving.carbohydrate) : null,
    fiber: serving.fiber ? Number(serving.fiber) : null,
    sugar: serving.sugar ? Number(serving.sugar) : null,
    sodium: serving.sodium ? Number(serving.sodium) : null,
  };
}

module.exports = {
  searchFood,
  getFoodDetails,
  extractMacrosFromFood,
};
