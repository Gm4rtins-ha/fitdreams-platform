import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { logout, getProfile } from '../api/axios';
import { getUserData } from '../utils/storage';

export default function SettingsScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      const storedData = await getUserData();
      if (storedData) {
        setUserData(storedData);
      }

      const response = await getProfile();
      if (response.success) {
        setUserData(response.data.user);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    Alert.alert(
      'Editar Perfil',
      'Funcionalidade de edição de perfil será implementada em breve!',
      [{ text: 'OK' }]
    );
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleNotificationsToggle = (value) => {
    setNotificationsEnabled(value);
    Alert.alert(
      'Notificações',
      value ? 'Notificações ativadas!' : 'Notificações desativadas!',
      [{ text: 'OK' }]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'Sobre o App',
      'App de Análise de Exames com IA\nVersão 1.0.0\n\nDesenvolvido para facilitar a interpretação de exames médicos através de Inteligência Artificial.',
      [{ text: 'OK' }]
    );
  };

  const handleTerms = () => {
    Alert.alert(
      'Termos de Uso',
      'Os termos de uso completos estarão disponíveis em breve.',
      [{ text: 'OK' }]
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      'Política de Privacidade',
      'A política de privacidade completa estará disponível em breve.',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Excluir Conta',
      'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita e todos os seus dados serão permanentemente removidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmar Exclusão',
              'Digite sua senha para confirmar a exclusão da conta.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Confirmar',
                  style: 'destructive',
                  onPress: () => {
                    // Aqui você implementaria a lógica de exclusão da conta
                    Alert.alert('Info', 'Funcionalidade em desenvolvimento');
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header com Gradiente */}
      <LinearGradient
        colors={['#4A90E2', '#357ABD']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {userData?.fullName?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName}>{userData?.fullName}</Text>
            <Text style={styles.headerEmail}>{userData?.email}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Seção: Perfil */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Perfil</Text>
        
        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleEditProfile}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#4A90E2' }]}>
              <Text style={styles.menuIconText}>✏️</Text>
            </View>
            <Text style={styles.menuItemText}>Editar Perfil</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleChangePassword}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#FF9800' }]}>
              <Text style={styles.menuIconText}>🔑</Text>
            </View>
            <Text style={styles.menuItemText}>Alterar Senha</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Seção: Preferências */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferências</Text>
        
        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#4CAF50' }]}>
              <Text style={styles.menuIconText}>🔔</Text>
            </View>
            <Text style={styles.menuItemText}>Notificações</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationsToggle}
            trackColor={{ false: '#D1D1D6', true: '#4CAF50' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Seção: Informações */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações</Text>
        
        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleAbout}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#9C27B0' }]}>
              <Text style={styles.menuIconText}>ℹ️</Text>
            </View>
            <Text style={styles.menuItemText}>Sobre o App</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleTerms}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#607D8B' }]}>
              <Text style={styles.menuIconText}>📄</Text>
            </View>
            <Text style={styles.menuItemText}>Termos de Uso</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={handlePrivacy}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#795548' }]}>
              <Text style={styles.menuIconText}>🔒</Text>
            </View>
            <Text style={styles.menuItemText}>Política de Privacidade</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Seção: Conta */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conta</Text>
        
        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#FF5252' }]}>
              <Text style={styles.menuIconText}>🗑️</Text>
            </View>
            <Text style={[styles.menuItemText, { color: '#FF5252' }]}>
              Excluir Conta
            </Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#FF9800' }]}>
              <Text style={styles.menuIconText}>🚪</Text>
            </View>
            <Text style={[styles.menuItemText, { color: '#FF9800' }]}>
              Sair
            </Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Versão */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Versão 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  headerTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  headerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerEmail: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },

  // Sections
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Menu Items
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIconText: {
    fontSize: 20,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  menuItemArrow: {
    fontSize: 24,
    color: '#C7C7CC',
    fontWeight: '300',
  },

  // Version
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
});