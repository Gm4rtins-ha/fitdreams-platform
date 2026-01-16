// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAuthToken, getBaseURL as getApiBaseURL } from '../api/axios';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    console.log('🚀 AuthContext inicializado');
    loadStoredData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // STORAGE (user completo)
  // ============================================

  const USER_STORAGE_KEY = 'user';

  const saveUserToStorage = async (userObj) => {
    try {
      if (!userObj) return;
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
    } catch (e) {
      console.error('❌ Erro ao salvar user no storage:', e);
    }
  };

  const getUserFromStorage = async () => {
    try {
      const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('❌ Erro ao ler user do storage:', e);
      return null;
    }
  };

  // Base URL padronizada (mesma do axios.js)
  const getBaseURL = () => getApiBaseURL();

  // ============================================
  // FUNÇÕES PRINCIPAIS
  // ============================================

  const loadStoredData = async () => {
    try {
      console.log('📱 Carregando dados do storage...');

      const [userToken, userId, backupToken] = await Promise.all([
        AsyncStorage.getItem('userToken'),
        AsyncStorage.getItem('userId'),
        AsyncStorage.getItem('user_token'),
      ]);

      console.log('🔍 Storage check:', {
        userToken: userToken ? `PRESENTE (${userToken.length} chars)` : 'AUSENTE',
        user_token: backupToken ? `PRESENTE (${backupToken.length} chars)` : 'AUSENTE',
        userId: userId || 'NÃO ENCONTRADO',
      });

      const tokenToUse = userToken || backupToken;

      if (tokenToUse && userId) {
        console.log('✅ Token encontrado, length:', tokenToUse.length);
        console.log('🔐 Primeiros 30 chars:', tokenToUse.substring(0, 30) + '...');

        // 1) Configurar token global no axios
        setAuthToken(tokenToUse);

        // 2) Validar token no backend buscando perfil
        try {
          console.log('👤 Verificando token com /users/profile...');
          const response = await fetch(`${getBaseURL()}/users/profile`, {
            headers: {
              Authorization: `Bearer ${tokenToUse}`,
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json();

          if (response.ok && data.success) {
            const userData = {
              ...data.data.user,
              token: tokenToUse,
            };

            console.log('✅ Token válido! Usuário:', userData.fullName);

            setUser(userData);
            setIsAuthenticated(true);

            // ✅ salva o user completo (inclui profileImage)
            await saveUserToStorage(userData);

            // Migração do token antigo
            if (!userToken && backupToken) {
              await AsyncStorage.setItem('userToken', backupToken);
              await AsyncStorage.removeItem('user_token');
              console.log('🔄 Migrado token de user_token para userToken');
            }
          } else {
            console.log('❌ Token inválido na verificação:', data.message);
            await clearStorage();
          }
        } catch (error) {
          console.error('❌ Erro ao verificar token:', error.message);

          // ✅ Se for erro de rede, mantém sessão usando user salvo (com foto)
          if (String(error.message || '').includes('Network')) {
            console.log('🌐 Erro de rede, mantendo token em cache');

            const storedUser = await getUserFromStorage();
            const fallbackUser = {
              ...(storedUser || {}),
              id: storedUser?.id || Number(userId),
              email: storedUser?.email || (await AsyncStorage.getItem('userEmail')) || '',
              fullName: storedUser?.fullName || (await AsyncStorage.getItem('userName')) || 'Usuário',
              token: tokenToUse,
            };

            setUser(fallbackUser);
            setIsAuthenticated(true);

            // garante persistência do fallback
            await saveUserToStorage(fallbackUser);
          } else {
            await clearStorage();
          }
        }
      } else {
        console.log('🔓 Usuário não autenticado (token ou userId ausente)');
        await clearStorage();
      }
    } catch (error) {
      console.error('❌ ERRO CRÍTICO ao carregar dados:', error);
      await clearStorage();
    } finally {
      setLoading(false);
      console.log('🏁 Carregamento inicial finalizado');
    }
  };

  const clearStorage = async () => {
    console.log('🧹 Limpando storage...');
    try {
      await AsyncStorage.multiRemove([
        'userToken',
        'user_token',
        'userId',
        'userEmail',
        'userName',
        'user', // ✅ remove user completo
      ]);

      setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);

      console.log('✅ Storage limpo com sucesso');
    } catch (error) {
      console.error('❌ Erro ao limpar storage:', error);
    }
  };

  const signIn = async (email, password) => {
    console.log('🔐 Iniciando login...', {
      email: email.trim(),
      passwordLength: password?.length || 0,
    });

    try {
      const response = await fetch(`${getBaseURL()}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      const data = await response.json();
      console.log('✅ Resposta do login recebida, success:', data.success);

      if (data.success) {
        const userData = data.data.user;
        const token = data.data.token;

        if (!token || token.length < 100) {
          console.error('❌ ERRO: Token muito curto!', token?.length || 0);
          return { success: false, message: 'Token inválido recebido do servidor' };
        }

        await Promise.all([
          AsyncStorage.setItem('userToken', token),
          AsyncStorage.setItem('userId', userData.id.toString()),
          AsyncStorage.setItem('userEmail', userData.email),
          AsyncStorage.setItem('userName', userData.fullName),
        ]);

        setAuthToken(token);

        const fullUserData = { ...userData, token };

        // ✅ salva user completo (inclui profileImage)
        await saveUserToStorage(fullUserData);

        setUser(fullUserData);
        setIsAuthenticated(true);

        console.log('🎉 LOGIN CONCLUÍDO COM SUCESSO!');
        return { success: true, data: fullUserData };
      }

      return { success: false, message: data.message || 'Credenciais inválidas' };
    } catch (error) {
      console.error('❌ ERRO NO LOGIN:', error.message);
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  };

  const signOut = async () => {
    console.log('🚪 Fazendo logout...');
    await clearStorage();
    console.log('✅ Logout concluído');
  };

  const refreshUser = async () => {
    if (isRefreshing) return null;

    setIsRefreshing(true);
    try {
      console.log('🔄 Atualizando dados do usuário...');
      const token = await AsyncStorage.getItem('userToken');

      if (!token) return null;

      const response = await fetch(`${getBaseURL()}/users/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const updatedUser = { ...data.data.user, token };

        setUser(updatedUser);
        await saveUserToStorage(updatedUser); // ✅ persistir

        console.log('✅ Usuário atualizado:', updatedUser.fullName);
        return updatedUser;
      }

      if (response.status === 401) await clearStorage();
      return null;
    } catch (error) {
      console.error('❌ Erro ao atualizar usuário:', error.message);
      return null;
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        isRefreshing,
        signIn,
        signOut,
        refreshUser,
        clearStorage,

        // token helper
        getToken: async () => await AsyncStorage.getItem('userToken'),

        // ✅ updateUser salva também no storage (espalha foto no app)
        updateUser: (updates) => {
          setUser((prev) => {
            const next = { ...(prev || {}), ...(updates || {}) };
            saveUserToStorage(next);
            return next;
          });
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
