// frontend/src/screens/weight/WeightScanScreen.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BluetoothManager from '../../services/bluetooth/BluetoothManager';
import { calculateOkOkStyle } from '../../utils/bioimpedanceCalculator';
import { useAuth } from '../../contexts/AuthContext'; // 🔑 NOVO

export default function WeightScanScreen({ navigation }) {
  const { user, refreshUser } = useAuth(); // 🔑 pega usuário do contexto

  const [timeLeft, setTimeLeft] = useState(30);
  const [currentWeight, setCurrentWeight] = useState(null);
  const [isStabilizing, setIsStabilizing] = useState(false);
  const [finalWeight, setFinalWeight] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Procurando balança...');
  const hasNavigatedRef = useRef(false);
  const [userData, setUserData] = useState(null);
  const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);
  const [stableData, setStableData] = useState(null);
  const sonarAnim1 = useRef(new Animated.Value(0)).current;
  const sonarAnim2 = useRef(new Animated.Value(0)).current;
  const sonarAnim3 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // --------- helper pra idade ----------
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // --------- navegar para resultados ----------
  const navigateToResults = useCallback((stabilizationData, userProfile) => {
    if (hasNavigatedRef.current) {
      console.log('❌ navigateToResults: Navegação já realizada - bloqueando duplicação');
      return;
    }
    hasNavigatedRef.current = true;
    BluetoothManager.stopScan();

    const weightKg = parseFloat(stabilizationData.weight);
    const userHeightCm = userProfile?.height ? parseFloat(userProfile.height) : null;
    const userAge = userProfile?.age ? parseInt(userProfile.age, 10) : null;
    const userGender = userProfile?.gender || null; // 'masculino' ou 'feminino'

    console.log('DEBUG: Dados de entrada para cálculos:');
    console.log(`  Peso (weightKg): ${weightKg}`);
    console.log(`  Altura (userHeightCm): ${userHeightCm}`);
    console.log(`  Idade (userAge): ${userAge}`);
    console.log(`  Gênero (userGender): ${userGender}`);

    let calculatedMetrics = {};

    // valida dados
    if (isNaN(weightKg) || isNaN(userHeightCm) || isNaN(userAge) || !userGender || userHeightCm === 0) {
      console.warn('⚠️ Condição de cálculo de bioimpedância NÃO SATISFEITA. Dados inválidos ou ausentes.');
      Alert.alert(
        'Dados Incompletos',
        'Por favor, complete seu perfil (altura, idade, gênero) com valores válidos para calcular as métricas de bioimpedância.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MainTabs', { screen: 'ProfileTab' }), // 🔁 nome correto
          },
        ]
      );
      // valores nulos pra não quebrar tela de resultado
      calculatedMetrics = {
        bmi: null,
        bodyFatPercent: null,
        bodyFatKg: null,
        skeletalMusclePercent: null,
        skeletalMuscleKg: null,
        waterPercent: null,
        waterKg: null,
        visceralFat: null,
        boneKg: null,
        bmr: null,
        metabolicAge: null,
        proteinPercent: null,
        obesityPercent: null,
        leanBodyMassKg: null,
        bmiStatus: 'Indefinido',
        bodyFatStatus: 'Indefinido',
        skeletalMuscleStatus: 'Indefinido',
        waterStatus: 'Indefinido',
        visceralFatStatus: 'Indefinido',
        boneStatus: 'Indefinido',
        bmrStatus: 'Indefinido',
        metabolicAgeStatus: 'Indefinido',
        proteinStatus: 'Indefinido',
        obesityStatus: 'Indefinido',
      };
    } else {
      console.log('DEBUG: Condição de cálculo de bioimpedância SATISFEITA.');
      try {
        calculatedMetrics = calculateOkOkStyle({
          weightKg: weightKg,
          heightCm: userHeightCm,
          age: userAge,
          sex: userGender === 'masculino' ? 'male' : 'female',
          previousMeasurements: userProfile?.measurementsCount || 0,
        });
        console.log('✅ Métricas de bioimpedância calculadas com sucesso:', calculatedMetrics);
      } catch (error) {
        console.error('❌ Erro ao calcular métricas de bioimpedância:', error.message, error);
        Alert.alert(
          'Erro de Cálculo',
          `Não foi possível calcular as métricas de bioimpedância: ${error.message}. Verifique os dados do perfil.`
        );
        calculatedMetrics = {
          bmi: null,
          bodyFatPercent: null,
          bodyFatKg: null,
          skeletalMusclePercent: null,
          skeletalMuscleKg: null,
          waterPercent: null,
          waterKg: null,
          visceralFat: null,
          boneKg: null,
          bmr: null,
          metabolicAge: null,
          proteinPercent: null,
          obesityPercent: null,
          leanBodyMassKg: null,
          bmiStatus: 'Indefinido',
          bodyFatStatus: 'Indefinido',
          skeletalMuscleStatus: 'Indefinido',
          waterStatus: 'Indefinido',
          visceralFatStatus: 'Indefinido',
          boneStatus: 'Indefinido',
          bmrStatus: 'Indefinido',
          metabolicAgeStatus: 'Indefinido',
          proteinStatus: 'Indefinido',
          obesityStatus: 'Indefinido',
        };
      }
    }

    const completeData = {
      weight: weightKg.toFixed(1),
      bmi: calculatedMetrics.bmi ?? '--',
      bodyFat: calculatedMetrics.bodyFatPercent ?? '--',
      bodyFatKg: calculatedMetrics.bodyFatKg ?? '--',
      muscleMass: calculatedMetrics.skeletalMusclePercent ?? '--',
      muscleMassKg: calculatedMetrics.skeletalMuscleKg ?? '--',
      bodyWater: calculatedMetrics.waterPercent ?? '--',
      bodyWaterKg: calculatedMetrics.waterKg ?? '--',
      boneMass: calculatedMetrics.boneKg ?? '--',
      basalMetabolicRate: calculatedMetrics.bmr ?? '--',
      metabolicAge: calculatedMetrics.metabolicAge ?? '--',
      visceralFat: calculatedMetrics.visceralFat ?? '--',
      protein: calculatedMetrics.proteinPercent ?? '--',
      obesity: calculatedMetrics.obesityPercent ?? '--',
      lbm: calculatedMetrics.leanBodyMassKg ?? '--',
      readings: stabilizationData.readingsCount,
      variance: stabilizationData.variance,
      trend: stabilizationData.trend,
      userHeight: userHeightCm ?? '--',
      userAge: userAge ?? '--',
      userGender: userGender ?? '--',
      bmiStatus: calculatedMetrics.bmiStatus ?? 'Indefinido',
      bodyFatStatus: calculatedMetrics.bodyFatStatus ?? 'Indefinido',
      muscleMassStatus: calculatedMetrics.skeletalMuscleStatus ?? 'Indefinido',
      bodyWaterStatus: calculatedMetrics.waterStatus ?? 'Indefinido',
      visceralFatStatus: calculatedMetrics.visceralFatStatus ?? 'Indefinido',
      boneStatus: calculatedMetrics.boneStatus ?? 'Indefinido',
      basalMetabolicRateStatus: calculatedMetrics.bmrStatus ?? 'Indefinido',
      metabolicAgeStatus: calculatedMetrics.metabolicAgeStatus ?? 'Indefinido',
      proteinStatus: calculatedMetrics.proteinStatus ?? 'Indefinido',
      obesityStatus: calculatedMetrics.obesityStatus ?? 'Indefinido',
    };

    console.log('Dados completos para resultados (WeightScanScreen):', completeData);
    navigation.replace('WeightResult', { weightData: completeData });
  }, [navigation]);

  // --------- carregar dados do usuário (do contexto) ----------
  const loadUserData = async () => {
    try {
      let currentUser = user;

      // se por algum motivo user ainda não estiver no contexto, tenta atualizar do backend
      if (!currentUser) {
        console.log('ℹ️ Nenhum usuário no contexto, chamando refreshUser()...');
        currentUser = await refreshUser();
      }

      if (!currentUser) {
        console.warn('⚠️ Nenhum perfil de usuário disponível para scan.');
        Alert.alert(
          'Perfil Ausente',
          'Por favor, complete seu perfil (altura, idade, gênero) para calcular as métricas de bioimpedância.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('MainTabs', { screen: 'ProfileTab' }), // 🔁 nome correto
            },
          ]
        );
        setUserData({});
        setIsUserDataLoaded(true);
        return;
      }

      const age = calculateAge(currentUser.birthDate);
      const userWithAge = {
        ...currentUser,
        age: age,
        measurementsCount: currentUser.measurementsCount || 0,
      };

      setUserData(userWithAge);
      setIsUserDataLoaded(true);
      console.log('✅ Dados do usuário carregados para scan (com idade calculada):', userWithAge);

      // envia perfil para o BluetoothManager
      BluetoothManager.setUserProfile(userWithAge);
    } catch (error) {
      console.error('❌ Erro ao carregar dados do usuário para scan:', error);
      setUserData({});
      setIsUserDataLoaded(true);
    }
  };

  // --------- efeitos iniciais ----------
  useEffect(() => {
    loadUserData();
    initializeScanning();
    startTimer();
    startSonarAnimation();
    startPulseAnimation();
    return () => {
      BluetoothManager.stopScan();
    };
  }, []);

  useEffect(() => {
    if (stableData && userData && isUserDataLoaded && !hasNavigatedRef.current) {
      console.log('🚀 Ambos os dados (peso e usuário) estão prontos. Chamando navigateToResults...');
      setTimeout(() => {
        navigateToResults(stableData, userData);
      }, 500);
    }
  }, [stableData, userData, isUserDataLoaded, navigateToResults]);

  const startTimer = () => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startSonarAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sonarAnim1, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(sonarAnim1, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(sonarAnim2, {
            toValue: 1,
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(sonarAnim2, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 600);
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(sonarAnim3, {
            toValue: 1,
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(sonarAnim3, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 1200);
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const initializeScanning = async () => {
    console.log('⚙️ Inicializando escaneamento...');
    try {
      const onDeviceFound = (device) => { };
      const onRealtimeReading = (data) => { };
      const onStabilization = (stabilizationData) => {
        console.log('📊 Estabilização:', stabilizationData.status);
        if (stabilizationData.status === 'collecting') {
          setStatusMessage(stabilizationData.message);
          if (stabilizationData.currentWeight) {
            setCurrentWeight(stabilizationData.currentWeight.toFixed(1));
          }
        } else if (stabilizationData.status === 'stabilizing') {
          setIsStabilizing(true);
          setStatusMessage(stabilizationData.message);
          if (stabilizationData.currentWeight) {
            setCurrentWeight(stabilizationData.currentWeight.toFixed(1));
          }
        } else if (stabilizationData.status === 'stable') {
          setIsStabilizing(false);
          setFinalWeight(stabilizationData.weight.toFixed(1));
          setStatusMessage('Peso estabilizado!');
          setStableData(stabilizationData);
          console.log('✅ Peso estabilizado. Dados armazenados para navegação.');
        }
      };
      await BluetoothManager.startScan(
        onDeviceFound,
        onRealtimeReading,
        onStabilization
      );
      console.log('✅ Scan iniciado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao iniciar scan:', error);
      Alert.alert('Erro', error.message || 'Não foi possível iniciar o escaneamento');
      navigation.goBack();
    }
  };

  const handleTimeout = () => {
    BluetoothManager.stopScan();
    Alert.alert(
      'Tempo Esgotado',
      'Não foi possível encontrar a balança. Verifique se está ligada e próxima.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  const sonarScale1 = sonarAnim1.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const sonarOpacity1 = sonarAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] });
  const sonarScale2 = sonarAnim2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const sonarOpacity2 = sonarAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
  const sonarScale3 = sonarAnim3.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const sonarOpacity3 = sonarAnim3.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient colors={['#4A90E2', '#357ABD']} style={styles.gradient}>
        <View style={styles.header}>
          <Text style={styles.title}>Procurando Balança</Text>
          <Text style={styles.subtitle}>Suba na balança para ativá-la</Text>
        </View>
        <View style={styles.sonarContainer}>
          <Animated.View style={[styles.sonarWave, { transform: [{ scale: sonarScale1 }], opacity: sonarOpacity1 }]} />
          <Animated.View style={[styles.sonarWave, { transform: [{ scale: sonarScale2 }], opacity: sonarOpacity2 }]} />
          <Animated.View style={[styles.sonarWave, { transform: [{ scale: sonarScale3 }], opacity: sonarOpacity3 }]} />
          <Animated.View style={[styles.timerContainer, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="scale" size={40} color="#fff" />
            <Text style={styles.timerText}>{timeLeft}s</Text>
          </Animated.View>
        </View>
        <View style={styles.weightAndStatusSection}>
          {currentWeight && !finalWeight && (
            <View style={styles.weightDisplayContainer}>
              <Text style={styles.weightLabel}>Medindo...</Text>
              <Text style={styles.weightValue}>{currentWeight}</Text>
              <Text style={styles.weightUnit}>Kg</Text>
            </View>
          )}
          {finalWeight && (
            <View style={styles.weightDisplayContainer}>
              <Ionicons name="checkmark-circle" size={40} color="#27AE60" />
              <Text style={styles.weightLabel}>Peso Estabilizado</Text>
              <Text style={styles.weightValue}>{finalWeight}</Text>
              <Text style={styles.weightUnit}>Kg</Text>
            </View>
          )}
          <View style={styles.statusContainerBottom}>
            <View style={styles.statusDot} />
            <Text style={styles.statusTextBottom}>{statusMessage}</Text>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#4A90E2' },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { position: 'absolute', top: 40, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#E0E0E0' },
  sonarContainer: { width: 250, height: 250, justifyContent: 'center', alignItems: 'center' },
  sonarWave: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: '#fff' },
  timerContainer: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  timerText: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 8 },

  weightAndStatusSection: {
    alignItems: 'center',
    marginTop: 40,
    position: 'absolute',
    bottom: 40,
  },
  weightDisplayContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  weightLabel: { fontSize: 18, color: '#E0E0E0', marginBottom: 8 },
  weightValue: { fontSize: 64, fontWeight: 'bold', color: '#fff' },
  weightUnit: { fontSize: 24, color: '#E0E0E0' },
  statusContainerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#27AE60', marginRight: 8 },
  statusTextBottom: { fontSize: 14, color: '#E0E0E0' },
});
