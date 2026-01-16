// frontend/src/screens/main/ProfileScreen.js

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import NotificationService from '../../services/NotificationService';

function ProfileScreen() {
  const { user, signOut, loading: authLoading, refreshUser } = useAuth();
  const navigation = useNavigation();

  const [notifications, setNotifications] = useState(false);
  const [notificationsAvailable, setNotificationsAvailable] = useState(false);
  const [screenLoading, setScreenLoading] = useState(true);

  // ✅ TRAVAS ANTI-LOOP
  const isLoadingRef = useRef(false);
  const lastRunRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 ProfileScreen ganhou foco - recarregando dados...');

      let isActive = true;

      const releaseLock = () => {
        isLoadingRef.current = false;
      };

      const loadData = async () => {
        // ✅ 1) LOCK: se já está carregando, não roda de novo
        if (isLoadingRef.current) {
          console.log('⏳ Já está carregando (lock), liberando loading');
          setScreenLoading(false); // 🔓 LIBERA A TELA
          return;
        }

        // ✅ 2) THROTTLE
        const now = Date.now();
        if (now - lastRunRef.current < 1000) {
          console.log('⏱️ Rodou há pouco (throttle), liberando loading');
          setScreenLoading(false); // 🔓 LIBERA A TELA
          return;
        }

        lastRunRef.current = now;

        isLoadingRef.current = true;
        setScreenLoading(true);

        try {
          // ✅ Atualiza usuário (se refreshUser estiver memoizado no AuthContext, não gera loop)
          const freshUser = await refreshUser();
          console.log('✅ refreshUser retornou:', freshUser?.fullName || 'sem alteração');

          if (!isActive) {
            releaseLock();
            return;
          }

          await loadNotificationSettings();

          if (!isActive) {
            releaseLock();
            return;
          }

          await checkNotificationAvailability();
        } catch (error) {
          if (!isActive) {
            releaseLock();
            return;
          }
          console.error('❌ Erro ao carregar dados na ProfileScreen:', error?.message || error);
        } finally {
          // ✅ IMPORTANTE: se a tela perdeu foco, não chama setState,
          // mas SEMPRE libera o lock
          releaseLock();

          if (!isActive) return;
          setScreenLoading(false);
        }
      };

      loadData();

      // ✅ cleanup quando perde foco/desmonta: libera lock e evita setState
      return () => {
        isActive = false;
        releaseLock();
      };
    }, [refreshUser])
  );

  const checkNotificationAvailability = async () => {
    const available = NotificationService.isAvailable();
    setNotificationsAvailable(available);
    console.log('✅ Serviço de notificações disponível:', available);
  };

  const loadNotificationSettings = async () => {
    try {
      const enabled = await AsyncStorage.getItem('notifications');
      if (enabled !== null) {
        setNotifications(JSON.parse(enabled));
      } else {
        setNotifications(true);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const toggleNotifications = async (value) => {
    try {
      console.log('🔔 Alterando notificações:', value);
      setNotifications(value);
      await AsyncStorage.setItem('notifications', JSON.stringify(value));

      if (value) {
        console.log('✅ Habilitando notificações...');
        await NotificationService.setupAllNotifications();
      } else {
        console.log('❌ Desabilitando notificações...');
        await NotificationService.cancelAllNotifications();
      }
    } catch (error) {
      console.error('Erro ao alterar notificações:', error);
      Alert.alert('Erro', 'Não foi possível alterar as notificações');
      setNotifications(!value);
    }
  };

  const handleAdvancedSettings = () => {
    navigation.navigate('NotificationSettings');
  };

  const handleEditProfile = () => {
    navigation.navigate('UserProfile');
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            console.error('Erro ao fazer logout:', error);
            Alert.alert('Erro', 'Não foi possível sair');
          }
        },
      },
    ]);
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const calculateIMC = (weight, height) => {
    if (typeof weight !== 'number' || typeof height !== 'number' || height <= 0) return null;
    const heightInMeters = height / 100;
    const imc = weight / (heightInMeters * heightInMeters);
    return imc.toFixed(1);
  };

  const getIMCStatus = (imc) => {
    if (!imc) return 'Não calculado';
    const imcNum = parseFloat(imc);
    if (imcNum < 18.5) return 'Abaixo do peso';
    if (imcNum < 25) return 'Peso normal';
    if (imcNum < 30) return 'Sobrepeso';
    return 'Obesidade';
  };

  const displayData = user || {};
  const age = displayData.age || calculateAge(displayData.birthDate);
  const height = displayData.height ?? null;
  const weight = displayData.weight ?? null;
  const imc = displayData.bmi || calculateIMC(weight, height);
  const imcStatus = displayData.bmiStatus || getIMCStatus(imc);

  if (authLoading || screenLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#4A90E2', '#357ABD']} style={styles.header}>
          <View style={styles.profileImageContainer}>
            {displayData.profileImage ? (
              <Image source={{ uri: displayData.profileImage }} style={styles.profileImagePhoto} />
            ) : (
              <View style={styles.profileImage}>
                <Ionicons name="person" size={60} color="#fff" />
              </View>
            )}
            <TouchableOpacity style={styles.editImageButton} onPress={handleEditProfile}>
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{displayData.fullName || 'Usuário'}</Text>
          <Text style={styles.userEmail}>{displayData.email || ''}</Text>

          <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.editProfileButtonText}>Editar Perfil</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="resize-outline" size={28} color="#4A90E2" />
            <Text style={styles.statValue}>{height !== null ? `${Number(height).toFixed(0)}` : '--'}</Text>
            <Text style={styles.statLabel}>cm</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={28} color="#4CAF50" />
            <Text style={styles.statValue}>{age !== null ? `${age}` : '--'}</Text>
            <Text style={styles.statLabel}>anos</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="fitness-outline" size={28} color="#FF9800" />
            <Text style={styles.statValue}>{imc !== null ? imc : '--'}</Text>
            <Text style={styles.statLabel}>IMC</Text>
          </View>
        </View>

        {imc && (
          <View style={styles.weightStatusContainer}>
            <View
              style={[
                styles.weightStatusBadge,
                imcStatus === 'Peso normal' && styles.weightStatusNormal,
                imcStatus === 'Abaixo do peso' && styles.weightStatusLow,
                imcStatus === 'Sobrepeso' && styles.weightStatusOver,
                imcStatus === 'Obesidade' && styles.weightStatusObese,
              ]}
            >
              <Text style={styles.weightStatusText}>{imcStatus}</Text>
            </View>

            {typeof weight === 'number' && weight > 0 && (
              <View style={styles.currentWeightRow}>
                <Ionicons name="scale-outline" size={20} color="#666" />
                <Text style={styles.currentWeightText}>Peso atual: {weight.toFixed(1)} kg</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferências</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="notifications-outline" size={24} color="#4A90E2" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Notificações</Text>
                <Text style={styles.settingDescription}>
                  {notifications ? 'Lembretes de pesagem e hidratação ativos' : 'Desabilitadas'}
                </Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={toggleNotifications}
                trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
                thumbColor={notifications ? '#fff' : '#f4f3f4'}
                disabled={!notificationsAvailable}
              />
            </View>

            {notifications && notificationsAvailable && (
              <TouchableOpacity style={styles.advancedSettingsButton} onPress={handleAdvancedSettings}>
                <Ionicons name="settings-outline" size={20} color="#4A90E2" />
                <Text style={styles.advancedSettingsText}>Configurações Avançadas</Text>
                <Ionicons name="chevron-forward" size={20} color="#CCC" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#666" />
              <Text style={styles.menuItemText}>Privacidade</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle-outline" size={24} color="#666" />
              <Text style={styles.menuItemText}>Ajuda e Suporte</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="information-circle-outline" size={24} color="#666" />
              <Text style={styles.menuItemText}>Sobre o FitDreams</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{displayData.email || 'Não informado'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefone</Text>
              <Text style={styles.infoValue}>{displayData.phone || 'Não informado'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Verificação</Text>
              <View style={styles.verificationBadges}>
                {displayData.isEmailVerified ? (
                  <View style={[styles.badge, styles.badgeVerified]}>
                    <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                    <Text style={styles.badgeText}>Email</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, styles.badgeUnverified]}>
                    <Ionicons name="close-circle" size={14} color="#999" />
                    <Text style={styles.badgeText}>Email</Text>
                  </View>
                )}

                {displayData.isPhoneVerified ? (
                  <View style={[styles.badge, styles.badgeVerified]}>
                    <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                    <Text style={styles.badgeText}>Telefone</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, styles.badgeUnverified]}>
                    <Ionicons name="close-circle" size={14} color="#999" />
                    <Text style={styles.badgeText}>Telefone</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={styles.logoutButtonText}>Sair da Conta</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
  scrollView: { flex: 1 },
  header: { paddingTop: 20, paddingBottom: 30, alignItems: 'center' },
  profileImageContainer: { position: 'relative', marginBottom: 16 },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  profileImagePhoto: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#fff' },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 4 },
  userEmail: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 16 },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editProfileButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 20, gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: '#333', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  weightStatusContainer: { alignItems: 'center', paddingHorizontal: 16, marginTop: 8 },
  weightStatusBadge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  weightStatusNormal: { backgroundColor: '#E8F5E9' },
  weightStatusLow: { backgroundColor: '#FFF9C4' },
  weightStatusOver: { backgroundColor: '#FFE0B2' },
  weightStatusObese: { backgroundColor: '#FFCDD2' },
  weightStatusText: { fontSize: 14, fontWeight: '600', color: '#333' },
  currentWeightRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  currentWeightText: { fontSize: 14, color: '#666', fontWeight: '500' },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12, paddingHorizontal: 4 },
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingHeader: { flexDirection: 'row', alignItems: 'center' },
  settingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  settingDescription: { fontSize: 14, color: '#999' },
  advancedSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
  },
  advancedSettingsText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#4A90E2' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuItemText: { fontSize: 16, fontWeight: '500', color: '#333' },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  infoLabel: { fontSize: 14, color: '#999', marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '500', color: '#333' },
  verificationBadges: { flexDirection: 'row', gap: 8, marginTop: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  badgeVerified: { backgroundColor: '#E8F5E9' },
  badgeUnverified: { backgroundColor: '#F5F5F5' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#666' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  logoutButtonText: { fontSize: 16, fontWeight: '600', color: '#FF3B30' },
});
