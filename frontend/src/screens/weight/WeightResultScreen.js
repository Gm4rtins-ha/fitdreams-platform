// frontend/src/screens/weight/WeightResultScreen.js - VERSÃO CORRIGIDA
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/axios'; // ← Use o api configurado, não axios direto!
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

// ============================================
// CONFIGURAÇÃO
// ============================================

export default function WeightResultScreen({ route, navigation }) {
  const params = route.params || {};
  const rawWeightData = params.weightData;
  const lastMeasurementFromHome = params.measurement;
  const fromScreen = params.from || 'scan';
  const userHeightFromHome = params.userHeight;
  const userAgeFromHome = params.userAge;


  const [userProfile, setUserProfile] = useState(null);
  const [saveStatus, setSaveStatus] = useState('Processando...');
  const [isSaving, setIsSaving] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const shareViewRef = useRef(null);

  // ============================================
  // CONFIGURAÇÕES DE STATUS
  // ============================================

  const statusConfig = {
    colors: {
      'Baixo': '#87CEEB',
      'Saudável': '#27AE60',
      'Excelente': '#27AE60',
      'Normal': '#27AE60',
      'Alto': '#e67e22',
      'Obeso': '#e74c3c',
      'Muito Alto': '#e74c3c',
      'Jovem': '#27AE60',
      'Velha': '#e74c3c',
      'Indefinido': '#95a5a6',
    },
    icons: {
      'Baixo': 'arrow-down-circle-outline',
      'Saudável': 'happy-outline',
      'Excelente': 'happy-outline',
      'Normal': 'happy-outline',
      'Alto': 'alert-circle-outline',
      'Obeso': 'sad-outline',
      'Muito Alto': 'sad-outline',
      'Jovem': 'happy-outline',
      'Velha': 'sad-outline',
      'Indefinido': 'help-circle-outline',
    }
  };

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  const formatNumber = useCallback((value, decimals = 1) => {
    if (value === null || value === undefined || value === '--' || value === '') {
      return '--';
    }
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '--';
    
    return num.toFixed(decimals).replace('.', ',');
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '--';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '--';
    }
  }, []);

  // ============================================
  // PROCESSAMENTO DOS DADOS
  // ============================================

  const weightData = React.useMemo(() => {
  if (rawWeightData) {
    // Vindo direto do scan
    return {
      ...rawWeightData,
      date: rawWeightData.date || new Date().toISOString(),
      deviceName: rawWeightData.deviceName || 'Balança Bluetooth',
    };
  }

    if (lastMeasurementFromHome) {
    console.log(
      '📦 lastMeasurementFromHome recebido na WeightResultScreen:',
      JSON.stringify(lastMeasurementFromHome, null, 2)
    );

    return {
      // peso
      weight:
        lastMeasurementFromHome.weight ??
        lastMeasurementFromHome.weightKg ??
        lastMeasurementFromHome.weight_kg ?? null,

      // IMC
      bmi:
        lastMeasurementFromHome.bmi ??
        lastMeasurementFromHome.imc ??
        lastMeasurementFromHome.bmiValue ??
        null,

      // Gordura corporal (% e kg)
      bodyFat:
        lastMeasurementFromHome.bodyFat ??
        lastMeasurementFromHome.body_fat ??
        lastMeasurementFromHome.bodyFatPercent ??
        lastMeasurementFromHome.body_fat_percent ??
        null,

      bodyFatKg:
        lastMeasurementFromHome.bodyFatKg ??
        lastMeasurementFromHome.body_fat_kg ??
        null,

      // Massa muscular (% e kg)
      muscleMass:
        lastMeasurementFromHome.muscleMass ??
        lastMeasurementFromHome.muscle_mass ??
        lastMeasurementFromHome.skeletalMusclePercent ??
        lastMeasurementFromHome.skeletal_muscle_percent ??
        null,

      muscleMassKg:
        lastMeasurementFromHome.muscleMassKg ??
        lastMeasurementFromHome.muscle_mass_kg ??
        lastMeasurementFromHome.skeletalMuscleKg ??
        lastMeasurementFromHome.skeletal_muscle_kg ??
        null,

      // Água corporal
      bodyWater:
        lastMeasurementFromHome.bodyWater ??
        lastMeasurementFromHome.body_water ??
        lastMeasurementFromHome.waterPercent ??
        lastMeasurementFromHome.water_percent ??
        null,

      bodyWaterKg:
        lastMeasurementFromHome.bodyWaterKg ??
        lastMeasurementFromHome.body_water_kg ??
        null,

      // Gordura visceral
      visceralFat:
        lastMeasurementFromHome.visceralFat ??
        lastMeasurementFromHome.visceral_fat ??
        null,

      // Massa óssea
      boneMass:
        lastMeasurementFromHome.boneMass ??
        lastMeasurementFromHome.bone_mass ??
        lastMeasurementFromHome.boneKg ??
        lastMeasurementFromHome.bone_kg ??
        null,

      // Taxa metabólica
      basalMetabolicRate:
        lastMeasurementFromHome.basalMetabolicRate ??
        lastMeasurementFromHome.metabolism ??
        lastMeasurementFromHome.bmr ??
        lastMeasurementFromHome.basal_metabolic_rate ??
        null,

      // Idade metabólica
      metabolicAge:
        lastMeasurementFromHome.metabolicAge ??
        lastMeasurementFromHome.metabolic_age ??
        null,

      // Proteína
      protein:
        lastMeasurementFromHome.protein ??
        lastMeasurementFromHome.proteinPercent ??
        lastMeasurementFromHome.protein_percent ??
        null,

      // Obesidade (%)
      obesity:
        lastMeasurementFromHome.obesity ??
        lastMeasurementFromHome.obesityPercent ??
        lastMeasurementFromHome.obesity_percent ??
        null,

      // Massa magra (se existir)
      leanBodyMassKg:
        lastMeasurementFromHome.leanBodyMassKg ??
        lastMeasurementFromHome.lbm ??
        lastMeasurementFromHome.lean_body_mass_kg ??
        null,

      // Datas / dispositivo
      date:
        lastMeasurementFromHome.timestamp ??
        lastMeasurementFromHome.date ??
        lastMeasurementFromHome.createdAt ??
        new Date().toISOString(),

      deviceName:
        lastMeasurementFromHome.deviceName ??
        lastMeasurementFromHome.device_name ??
        lastMeasurementFromHome.source ??
        'Histórico',

        userAge: userAgeFromHome ?? null,
        userHeight: userHeightFromHome ?? null,
    };
  }

  return {};
}, [rawWeightData, lastMeasurementFromHome]);


  // ============================================
// CARREGAR PERFIL DO USUÁRIO (só pra idade/altura)
// E DISPARAR SALVAMENTO DA MEDIÇÃO
// ============================================

useEffect(() => {
  const loadUserProfile = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserProfile(user);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  loadUserProfile();
}, []);

useEffect(() => {
  if (fromScreen === 'scan' && weightData.weight) {
    console.log('🚀 Nova medição vinda do scan, disparando saveMeasurement...');
    saveMeasurement();
  } else {
    setSaveStatus(
      fromScreen === 'home'
        ? 'Medição carregada do histórico'
        : 'Pronto para visualizar'
    );
  }
}, [fromScreen, weightData.weight]);


  // ============================================
  // SALVAR MEDIÇÃO NO BACKEND
  // ============================================

  const saveMeasurement = async () => {
    if (!weightData.weight || isSaving) return;
    
    setIsSaving(true);
    setSaveStatus('Salvando medição...');

    try {
      const measurementToSave = {
        weight: parseFloat(weightData.weight) || 0,
        bmi: parseFloat(weightData.bmi) || null,
        bodyFat: parseFloat(weightData.bodyFat) || null,
        muscleMass: parseFloat(weightData.muscleMass) || null,
        bodyWater: parseFloat(weightData.bodyWater) || null,
        boneMass: parseFloat(weightData.boneMass) || null,
        basalMetabolicRate: parseFloat(weightData.basalMetabolicRate) || null,
        metabolicAge: parseFloat(weightData.metabolicAge) || null,
        visceralFat: parseFloat(weightData.visceralFat) || null,
        protein: parseFloat(weightData.protein) || null,
        obesity: parseFloat(weightData.obesity) || null,
        lbm: parseFloat(weightData.lbm || weightData.leanBodyMassKg) || null,
        variance: parseFloat(weightData.variance) || null,
        trend: parseFloat(weightData.trend) || null,
        readings: weightData.readings || 0,
        protocol: weightData.protocol || 'Original Line',
        date: weightData.date || new Date().toISOString(),
        deviceName: weightData.deviceName || 'Balança Bluetooth',
};


      console.log('💾 Salvando medição:', measurementToSave);

      // Usa o api configurado (já tem token)
      const response = await api.post('/weight/save', measurementToSave);

      if (response.data.success) {
        setSaveStatus('✅ Medição salva com sucesso!');
        console.log('✅ Medição salva:', response.data);
      } else {
        setSaveStatus('❌ Falha ao salvar');
        Alert.alert('Erro', response.data.message || 'Falha ao salvar medição');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      setSaveStatus('❌ Erro ao salvar');
      Alert.alert('Erro', 'Não foi possível salvar a medição');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // FUNÇÃO PARA DETERMINAR STATUS
  // ============================================

  const getStatusInfo = useCallback((metric, value) => {
    if (!value || value === '--' || isNaN(value)) {
      return {
        status: 'Indefinido',
        color: statusConfig.colors.Indefinido,
        icon: statusConfig.icons.Indefinido,
      };
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    // Lógica de classificação
    let status = 'Normal';
    let color = statusConfig.colors.Normal;
    let icon = statusConfig.icons.Normal;

    switch (metric) {
      case 'bmi':
        if (numValue < 18.5) { status = 'Baixo'; color = statusConfig.colors.Baixo; icon = 'trending-down-outline'; }
        else if (numValue < 25) { status = 'Normal'; color = statusConfig.colors.Normal; icon = 'checkmark-circle-outline'; }
        else if (numValue < 30) { status = 'Alto'; color = statusConfig.colors.Alto; icon = 'warning-outline'; }
        else { status = 'Obeso'; color = statusConfig.colors.Obeso; icon = 'alert-circle-outline'; }
        break;

      case 'bodyFat':
        if (numValue < 15) { status = 'Excelente'; color = statusConfig.colors.Excelente; icon = 'trophy-outline'; }
        else if (numValue < 25) { status = 'Normal'; color = statusConfig.colors.Normal; icon = 'checkmark-circle-outline'; }
        else if (numValue < 30) { status = 'Alto'; color = statusConfig.colors.Alto; icon = 'warning-outline'; }
        else { status = 'Muito Alto'; color = statusConfig.colors['Muito Alto']; icon = 'alert-circle-outline'; }
        break;

      case 'muscleMass':
        if (numValue < 30) { status = 'Baixo'; color = statusConfig.colors.Baixo; icon = 'trending-down-outline'; }
        else if (numValue < 45) { status = 'Normal'; color = statusConfig.colors.Normal; icon = 'checkmark-circle-outline'; }
        else { status = 'Excelente'; color = statusConfig.colors.Excelente; icon = 'trophy-outline'; }
        break;

      case 'bodyWater':
        if (numValue < 50) { status = 'Baixo'; color = statusConfig.colors.Baixo; icon = 'trending-down-outline'; }
        else if (numValue < 65) { status = 'Normal'; color = statusConfig.colors.Normal; icon = 'checkmark-circle-outline'; }
        else { status = 'Excelente'; color = statusConfig.colors.Excelente; icon = 'trophy-outline'; }
        break;

      default:
        // Para outras métricas, usa o status do weightData se existir
        const specificStatus = weightData[`${metric}Status`];
        if (specificStatus && statusConfig.colors[specificStatus]) {
          status = specificStatus;
          color = statusConfig.colors[specificStatus];
          icon = statusConfig.icons[specificStatus] || statusConfig.icons.Indefinido;
        }
    }

    return { status, color, icon };
  }, [weightData]);

  // ============================================
  // COMPONENTES DE UI
  // ============================================

  const renderMetric = (label, value, unit = '', metricKey, decimals = 1) => {
    const formattedValue = formatNumber(value, decimals);
    const { status, color, icon } = getStatusInfo(metricKey, value);

    return (
      <View style={styles.metricItem} key={metricKey}>
        <Ionicons name={icon} size={24} color={color} style={styles.metricIcon} />
        <View style={styles.metricContent}>
          <Text style={styles.metricLabel}>{label}</Text>
          <Text style={styles.metricValue}>
            {formattedValue} {unit}
          </Text>
        </View>
        <View style={[styles.metricStatusBadge, { backgroundColor: color }]}>
          <Text style={styles.metricStatusText}>{status}</Text>
        </View>
      </View>
    );
  };

  const renderBMIBar = (bmiValue) => {
    const { color } = getStatusInfo('bmi', bmiValue);
    const bmiNum = parseFloat(bmiValue) || 22;
    const position = Math.min(Math.max((bmiNum - 15) / 20 * 100, 0), 100);

    return (
      <View style={styles.bmiBarContainer}>
        <LinearGradient
          colors={['#27AE60', '#F39C12', '#E67E22', '#E74C3C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bmiBarGradient}
        />
        <View style={[styles.bmiIndicatorDot, { left: `${position}%`, backgroundColor: color }]} />
        <View style={styles.bmiLabelsRow}>
          <Text style={styles.bmiLabel}>18.5</Text>
          <Text style={styles.bmiLabel}>25</Text>
          <Text style={styles.bmiLabel}>30</Text>
          <Text style={styles.bmiLabel}>35+</Text>
        </View>
      </View>
    );
  };

  // ============================================
  // COMPARTILHAMENTO
  // ============================================

  const captureAndShare = async () => {
    if (!shareViewRef.current) return;
    
    setIsCapturing(true);
    try {
      const uri = await captureRef(shareViewRef.current, {
        format: 'png',
        quality: 0.9,
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Compartilhar resultado da pesagem',
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar');
    } finally {
      setIsCapturing(false);
    }
  };

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  let userAge;
  if (
    weightData.userAge !== undefined &&
    weightData.userAge !== null &&
    weightData.userAge !== '--'
  ) {
    userAge = weightData.userAge;
  } else if (userProfile?.birthDate) {
    const birth = new Date(userProfile.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    userAge = age;
  } else {
    userAge = '--';
  }

  let userHeight;
  if (
    weightData.userHeight !== undefined &&
    weightData.userHeight !== null &&
    weightData.userHeight !== '--'
  ) {
    // se vier em cm (número), usamos direto
    userHeight = weightData.userHeight;
  } else if (userProfile?.height) {
    userHeight = userProfile.height;
  } else {
    userHeight = '--';
  }


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resultados da Pesagem</Text>
        <TouchableOpacity onPress={() => setShareVisible(true)} style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Card Principal */}
        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Medição de Peso</Text>
              <Text style={styles.cardDate}>{formatDate(weightData.date)}</Text>
              {weightData.deviceName && (
                <Text style={styles.deviceName}>Dispositivo: {weightData.deviceName}</Text>
              )}
            </View>
          </View>

          <View style={styles.weightDisplay}>
            <Text style={styles.weightValue}>{formatNumber(weightData.weight, 1)}</Text>
            <Text style={styles.weightUnit}>kg</Text>
          </View>

          {renderBMIBar(weightData.bmi)}

          <View style={styles.bmiStatus}>
            <Text style={styles.bmiStatusText}>
              IMC: {formatNumber(weightData.bmi, 1)} - {getStatusInfo('bmi', weightData.bmi).status}
            </Text>
          </View>
        </View>

        {/* Métricas */}
        <View style={styles.metricsCard}>
          {renderMetric('IMC', weightData.bmi, '', 'bmi')}
          {renderMetric('Gordura Corporal', weightData.bodyFat, '%', 'bodyFat')}
          {renderMetric('Massa Muscular', weightData.muscleMass, '%', 'muscleMass')}
          {renderMetric('Água Corporal', weightData.bodyWater, '%', 'bodyWater')}
          {renderMetric('Gordura Visceral', weightData.visceralFat, '', 'visceralFat', 0)}
          {renderMetric('Massa Óssea', weightData.boneMass, 'kg', 'boneMass')}
          {renderMetric('Taxa Metabólica', weightData.basalMetabolicRate, 'kcal', 'basalMetabolicRate', 0)}
          {renderMetric('Idade Metabólica', weightData.metabolicAge, 'anos', 'metabolicAge', 0)}
          {renderMetric('Proteína', weightData.protein, '%', 'protein')}
          {renderMetric('Obesidade', weightData.obesity, '%', 'obesity')}
          {renderMetric('Idade', userAge, 'anos', 'age', 0)}
          {renderMetric('Altura', userHeight, 'cm', 'height')}
        </View>

        {/* Status de Salvamento */}
        <View style={styles.saveStatus}>
          <Text style={[
            styles.saveStatusText,
            saveStatus.includes('✅') && styles.saveSuccess,
            saveStatus.includes('❌') && styles.saveError
          ]}>
            {saveStatus}
          </Text>
          {isSaving && <ActivityIndicator size="small" color="#4A90E2" style={styles.loading} />}
        </View>

        {/* Botões de Ação */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.homeButton}
            onPress={() => navigation.navigate('MainTabs', {screen:'HomeTab'})}
          >
            <Ionicons name="home-outline" size={20} color="#4A90E2" />
            <Text style={styles.homeButtonText}>Voltar para Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de Compartilhamento */}
      <Modal
        visible={shareVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setShareVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.modalClose}
              onPress={() => setShareVisible(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Compartilhar Resultados</Text>
            
            <ViewShot ref={shareViewRef} style={styles.shotContainer}>
              <View style={styles.shotContent}>
                <Text style={styles.shotTitle}>Resultado da Pesagem</Text>
                <Text style={styles.shotDate}>{formatDate(weightData.date)}</Text>
                <Text style={styles.shotWeight}>{formatNumber(weightData.weight, 1)} kg</Text>
                <Text style={styles.shotBmi}>IMC: {formatNumber(weightData.bmi, 1)}</Text>
              </View>
            </ViewShot>

            <TouchableOpacity 
              style={styles.shareButtonModal}
              onPress={captureAndShare}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={20} color="#fff" />
                  <Text style={styles.shareButtonText}>Compartilhar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  shareButton: {
    padding: 5,
  },
  content: {
    paddingBottom: 30,
  },
  mainCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  cardDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  deviceName: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontStyle: 'italic',
  },
  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 20,
  },
  weightValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#333',
  },
  weightUnit: {
    fontSize: 24,
    color: '#666',
    marginLeft: 8,
    marginBottom: 12,
  },
  bmiBarContainer: {
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
    marginBottom: 10,
    position: 'relative',
  },
  bmiBarGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  bmiIndicatorDot: {
    position: 'absolute',
    top: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#fff',
    transform: [{ translateX: -14 }],
  },
  bmiLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  bmiLabel: {
    fontSize: 12,
    color: '#666',
  },
  bmiStatus: {
    alignSelf: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    marginTop: 10,
  },
  bmiStatusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  metricsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  metricIcon: {
    marginRight: 15,
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 15,
    color: '#333',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginTop: 2,
  },
  metricStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  metricStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  saveStatus: {
    alignItems: 'center',
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveStatusText: {
    fontSize: 14,
    color: '#666',
  },
  saveSuccess: {
    color: '#27AE60',
    fontWeight: 'bold',
  },
  saveError: {
    color: '#E74C3C',
    fontWeight: 'bold',
  },
  loading: {
    marginLeft: 10,
  },
  actionButtons: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  homeButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    alignItems: 'center',
  },
  modalClose: {
    alignSelf: 'flex-end',
    padding: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  shotContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  shotContent: {
    alignItems: 'center',
  },
  shotTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  shotDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  shotWeight: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginTop: 10,
  },
  shotBmi: {
    fontSize: 16,
    color: '#333',
    marginTop: 5,
  },
  shareButtonModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    width: '100%',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});