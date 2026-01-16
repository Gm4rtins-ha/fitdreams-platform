// frontend/src/api/axios.js - VERSÃO COMPLETA (com upload de foto de perfil)
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ============================================
// CONFIGURAÇÃO PRINCIPAL
// ============================================

export const getBaseURL = () => {
  if (__DEV__) {
    if (Platform.OS === 'ios') {
      return 'http://localhost:5000/api';
    } else {
      // ✅ IP do seu PC na rede (Android em device/emulator)
      return 'http://192.168.0.152:5000/api';
    }
  }

  // ✅ Se tiver produção depois, coloque aqui:
  // return 'https://seu-backend.onrender.com/api';
  return 'http://192.168.0.152:5000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ============================================
// GESTÃO GLOBAL DE TOKEN
// ============================================

let currentToken = null;

export const setAuthToken = (token) => {
  currentToken = token;
  console.log('🔐 setAuthToken chamado, length:', token?.length || 0);

  if (token && token.length > 100) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    console.log('✅ Token configurado globalmente no axios');
  } else {
    delete api.defaults.headers.common.Authorization;
    console.log('❌ Token removido (inválido ou ausente)');
  }
};

export const getCurrentToken = () => currentToken;

// ============================================
// INTERCEPTOR DE REQUISIÇÕES
// ============================================

api.interceptors.request.use(
  async (config) => {
    console.log(`📤 REQUEST [${config.method?.toUpperCase()}] ${config.url}`);

    // Log do body (ocultando senhas)
    if (config.data && !(config.data instanceof FormData)) {
      const safeData = { ...config.data };
      const sensitiveFields = ['password', 'confirmPassword', 'newPassword', 'currentPassword'];
      sensitiveFields.forEach((field) => {
        if (safeData[field]) safeData[field] = '***';
      });
      console.log('📦 Request Body:', safeData);
    } else if (config.data instanceof FormData) {
      console.log('📦 Request Body: [FormData]');
    }

    // Estratégia de token (cache -> storage -> backup)
    let tokenToUse = null;

    // 1) cache
    if (currentToken && currentToken.length > 100) {
      tokenToUse = currentToken;
      console.log('🔐 Usando token global (cache)');
    } else {
      // 2) AsyncStorage principal
      try {
        tokenToUse = await AsyncStorage.getItem('userToken');
        console.log('🔐 Token do AsyncStorage:', tokenToUse ? 'Encontrado' : 'Não encontrado');
        console.log('🔐 Token length:', tokenToUse?.length || 0);

        if (tokenToUse && tokenToUse.length > 100) {
          currentToken = tokenToUse;
        }
      } catch (error) {
        console.error('❌ Erro ao buscar token:', error);
      }
    }

    // 3) backup (user_token)
    if (!tokenToUse || tokenToUse.length < 100) {
      try {
        const backupToken = await AsyncStorage.getItem('user_token');
        if (backupToken && backupToken.length > 100) {
          tokenToUse = backupToken;
          console.log('🔐 Usando token backup (user_token)');
          await AsyncStorage.setItem('userToken', backupToken);
        }
      } catch (error) {
        // ignora
      }
    }

    // aplica token no header
    if (tokenToUse && tokenToUse.length > 100) {
      config.headers.Authorization = `Bearer ${tokenToUse}`;
      console.log('✅ Token configurado na requisição');
      console.log('🔐 Token (primeiros 40 chars):', tokenToUse.substring(0, 40) + '...');
    } else {
      console.warn('⚠️ Token inválido ou ausente:', tokenToUse?.length || 0);
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => {
    console.error('❌ ERRO na configuração da requisição:', error.message);
    return Promise.reject(error);
  }
);

// ============================================
// INTERCEPTOR DE RESPOSTAS
// ============================================

api.interceptors.response.use(
  (response) => {
    console.log(`✅ RESPONSE [${response.status}] ${response.config.url}`);

    // tratamento especial login/registro
    if (
      (response.config.url?.includes('/auth/login') || response.config.url?.includes('/auth/register')) &&
      response.data?.success
    ) {
      const token = response.data.data?.token;

      if (token) {
        console.log('🔑 Token recebido na resposta, length:', token.length);
        console.log('🔑 Primeiros 50 chars:', token.substring(0, 50) + '...');

        setAuthToken(token);

        const safeResponse = { ...response.data };
        if (safeResponse.data?.token) {
          safeResponse.data.token = token.substring(0, 30) + `...[${token.length} chars]`;
        }
        console.log('📥 Response Data:', safeResponse);
      }
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    console.error(
      `❌ RESPONSE ERROR [${error.response?.status || 'NO STATUS'}] ${originalRequest?.url || 'NO URL'}`
    );

    if (error.response) {
      console.error('📥 Error Status:', error.response.status);
      console.error('📥 Error Message:', error.response.data?.message);
      console.error('📥 Error Data:', error.response.data);

      if (error.response.status === 401) {
        console.log('🔒 ERRO 401 - Token inválido ou expirado');

        if (!originalRequest.url?.includes('/auth/login')) {
          try {
            await AsyncStorage.multiRemove(['userToken', 'user_token', 'userId']);
            setAuthToken(null);
            currentToken = null;
            console.log('🧹 Tokens limpos do storage');
          } catch (storageError) {
            console.error('❌ Erro ao limpar storage:', storageError);
          }
        }
      }

      if (error.code === 'ECONNABORTED') {
        console.log('⏰ Timeout da requisição');
      }
    } else if (error.request) {
      console.error('🌐 Sem resposta do servidor - Verifique conexão');
      console.error('Request:', error.request);
    } else {
      console.error('⚡ Erro ao configurar requisição:', error.message);
    }

    return Promise.reject(error);
  }
);

// ============================================
// FUNÇÕES AUXILIARES (debug)
// ============================================

export const testConnection = async () => {
  try {
    console.log('🔍 Testando conexão com backend...');
    const response = await api.get('/health');
    console.log('✅ Backend conectado:', response.data);
    return { connected: true, data: response.data };
  } catch (error) {
    console.error('❌ Backend offline:', error.message);
    return { connected: false, error: error.message };
  }
};

export const testTokenValidity = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    console.log('🔍 Testando token...');
    console.log('Token length:', token?.length || 0);

    if (!token || token.length < 100) {
      return { valid: false, reason: 'Token muito curto ou ausente' };
    }

    const response = await api.get('/users/profile');
    console.log('✅ Token válido!');
    return { valid: true, data: response.data };
  } catch (error) {
    console.error('❌ Token inválido:', error.message);
    return { valid: false, error: error.message };
  }
};

// ============================================
// FUNÇÕES DE PERFIL (NOVAS / PROFISSIONAIS)
// ============================================

// ✅ Atualizar campos do perfil (nome, altura, etc.)
export const updateProfile = async (payload) => {
  const response = await api.put('/users/profile', payload);
  return response.data;
};

// ✅ Upload de foto de perfil (multipart/form-data)
export const uploadProfilePhoto = async (uri) => {
  const form = new FormData();

  form.append('photo', {
    uri,
    name: 'profile.jpg',
    type: 'image/jpeg',
  });

  const response = await api.put('/users/profile/photo', form, {
    // ⚠️ IMPORTANTE: não force boundary manualmente
    headers: {
      'Content-Type': 'multipart/form-data',
      Accept: 'application/json',
    },
  });

  return response.data;
};

export default api;
