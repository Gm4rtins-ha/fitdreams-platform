import AsyncStorage from '@react-native-async-storage/async-storage';

// Chaves usadas no storage
const KEYS = {
  AUTH_TOKEN: 'token',
  USER_DATA: 'user',
};

/**
 * Salva o token de autenticação
 */
export const saveToken = async (token) => {
  try {
    await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
    return true;
  } catch (error) {
    console.error('Erro ao salvar token:', error);
    return false;
  }
};

/**
 * Busca o token de autenticação
 */
export const getToken = async () => {
  try {
    const token = await AsyncStorage.getItem(KEYS.AUTH_TOKEN);
    return token;
  } catch (error) {
    console.error('Erro ao buscar token:', error);
    return null;
  }
};

/**
 * Remove o token de autenticação
 */
export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
    return true;
  } catch (error) {
    console.error('Erro ao remover token:', error);
    return false;
  }
};

/**
 * Salva dados do usuário
 */
export const saveUserData = async (userData) => {
  try {
    await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(userData));
    return true;
  } catch (error) {
    console.error('Erro ao salvar dados do usuário:', error);
    return false;
  }
};

/**
 * Busca dados do usuário
 */
export const getUserData = async () => {
  try {
    const userData = await AsyncStorage.getItem(KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    return null;
  }
};

/**
 * Remove dados do usuário
 */
export const removeUserData = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.USER_DATA);
    return true;
  } catch (error) {
    console.error('Erro ao remover dados do usuário:', error);
    return false;
  }
};

/**
 * Limpa todo o storage (logout completo)
 */
export const clearAll = async () => {
  try {
    await AsyncStorage.multiRemove([KEYS.AUTH_TOKEN, KEYS.USER_DATA]);
    return true;
  } catch (error) {
    console.error('Erro ao limpar storage:', error);
    return false;
  }
};

/**
 * Verifica se usuário está autenticado
 */
export const isAuthenticated = async () => {
  try {
    const token = await getToken();
    return !!token; // Retorna true se token existe
  } catch (error) {
    return false;
  }
};

/**
 * Faz logout completo
 */
export const logout = async () => {
  try {
    await clearAll();
    console.log('✅ Logout realizado com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    return false;
  }
};