// HomeScreen.js (UI igual ao print)
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../api/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../contexts/AuthContext';

// -------- helpers --------
const formatDateShort = (dateString) => {
  if (!dateString) return '--';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '--';
  // "06 Jan"
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    .replace('.', '')
    .replace(' de ', ' ');
};

const formatDate = (dateString) => {
  if (!dateString) return '--/--/----';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '--/--/----';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatNumber = (value, decimalPlaces = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  return Number(value).toFixed(decimalPlaces).replace('.', ',');
};

const calculateBMI = (weight, height) => {
  if (weight == null || height == null || height === 0) return null;
  const h = height / 100;
  return weight / (h * h);
};

const getStatusBadge = (bmi) => {
  if (bmi === null || isNaN(bmi)) return { text: 'N/A', color: '#9AA4B2', bg: '#EEF2F7' };
  if (bmi < 18.5) return { text: 'Baixo Peso', color: '#B7791F', bg: '#FFF7E6' };
  if (bmi >= 18.5 && bmi < 25) return { text: 'Peso Normal', color: '#2F855A', bg: '#E9F7EF' };
  if (bmi >= 25 && bmi < 30) return { text: 'Sobrepeso', color: '#B45309', bg: '#FFF1E6' };
  return { text: 'Obesidade', color: '#B91C1C', bg: '#FDECEC' };
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const getBMIIndicatorLeft = (bmi) => {
  // de 15 a 35 -> 0% a 100%
  if (bmi == null || isNaN(bmi)) return 0;
  const min = 15;
  const max = 35;
  const pct = ((clamp(bmi, min, max) - min) / (max - min)) * 100;
  return pct;
};

const getAgeFromBirthDate = (birthDateStr) => {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, signOut, refreshUser } = useAuth();

  const [latestMetricData, setLatestMetricData] = useState(null);
  const [lastFullMeasurement, setLastFullMeasurement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // meta editável
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newTargetWeight, setNewTargetWeight] = useState(null);
  const [savingGoal, setSavingGoal] = useState(false);

  // ✅ evitar loop no useEffect
  const [bodyMeasurements, setBodyMeasurements] = useState(null);
  const [loadingMeasurements, setLoadingMeasurements] = useState(false);

  const weightOptions = useMemo(() => Array.from({ length: 111 }, (_, i) => 40 + i), []);
  const hasFetchedRef = useRef(false);
  const isLoadingRef = useRef(false);

  const loadBodyMeasurements = useCallback(async () => {
    try {
      setLoadingMeasurements(true);
      const res = await api.get('/body-measurements/latest');
      setBodyMeasurements(res.data?.data || null);
    } catch (e) {
      setBodyMeasurements(null);
    } finally {
      setLoadingMeasurements(false);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const statsResponse = await api.get('/weight/stats');
      const stats = statsResponse.data.data ?? statsResponse.data;
      if (stats && stats.totalMeasurements > 0) setLatestMetricData(stats);
      else setLatestMetricData(null);

      const latestMeasurementResponse = await api.get('/weight/latest?limit=5');
      const raw = latestMeasurementResponse.data.data ?? latestMeasurementResponse.data ?? [];
      const measurements = Array.isArray(raw) ? raw : [];

      const hasBodyComp = (m) =>
        m.bodyFat != null || m.body_fat_percent != null ||
        m.muscleMass != null || m.skeletalMusclePercent != null ||
        m.bodyWater != null || m.waterPercent != null ||
        m.visceralFat != null || m.visceral_fat != null;

      const lastWithBodyComp = measurements.find(hasBodyComp);
      const lastMeasurement = lastWithBodyComp || measurements[0] || null;

      setLastFullMeasurement(lastMeasurement);

      try {
        await api.get('/users/profile');
        if (refreshUser) await refreshUser();
      } catch (profileError) {
        if (profileError.response?.status === 401) {
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userId');
        }
      }
    } catch (error) {
      setLatestMetricData(null);
      setLastFullMeasurement(null);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [refreshUser]);

  useEffect(() => {
    if (user?.targetWeight != null) setNewTargetWeight(user.targetWeight);
    else setNewTargetWeight(weightOptions[0]);
  }, [user?.targetWeight, weightOptions]);

  useEffect(() => {
    let mounted = true;
    if (!hasFetchedRef.current && mounted) {
      hasFetchedRef.current = true;
      const t = setTimeout(() => mounted && fetchDashboardData(), 80);
      return () => clearTimeout(t);
    }
    return () => { mounted = false; };
  }, [fetchDashboardData]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      fetchDashboardData();
      loadBodyMeasurements();
    });
    return unsub;
  }, [navigation, fetchDashboardData, loadBodyMeasurements]);

  useEffect(() => {
    loadBodyMeasurements();
  }, [loadBodyMeasurements]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchDashboardData(), loadBodyMeasurements()])
      .finally(() => setRefreshing(false));
  }, [fetchDashboardData, loadBodyMeasurements]);

  const handleOpenLastResult = useCallback(() => {
    if (!lastFullMeasurement || lastFullMeasurement.weight == null) {
      Alert.alert('Nenhuma Pesagem', 'Faça sua primeira pesagem para ver os detalhes.');
      return;
    }

    const userAge = user?.birthDate ? getAgeFromBirthDate(user.birthDate) : null;

    navigation.navigate('WeightResult', {
      from: 'home',
      measurement: lastFullMeasurement,
      userHeight: user?.height ?? null,
      userAge,
    });
  }, [lastFullMeasurement, navigation, user]);

  const handleStartWeightScan = useCallback(() => {
    navigation.navigate('WeightScan');
  }, [navigation]);

  const handleSaveTargetWeight = useCallback(async () => {
    Keyboard.dismiss();
    setSavingGoal(true);

    try {
      if (newTargetWeight == null || newTargetWeight <= 0) {
        Alert.alert('Erro', 'Selecione um peso válido para a meta.');
        return;
      }

      await api.put('/users/profile/target-weight', { targetWeight: newTargetWeight });
      Alert.alert('Sucesso', 'Sua meta de peso foi atualizada!');
      setIsEditingGoal(false);

      if (refreshUser) await refreshUser();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar sua meta. Tente novamente.');
    } finally {
      setSavingGoal(false);
    }
  }, [newTargetWeight, refreshUser]);

  // -------- derived UI data --------
  const hasMeasurements = !!lastFullMeasurement && lastFullMeasurement.weight != null;
  const displayWeight = hasMeasurements ? lastFullMeasurement.weight : null;
  const displayTimestamp = hasMeasurements ? lastFullMeasurement.timestamp : null;

  const bmi = hasMeasurements && user?.height ? calculateBMI(displayWeight, user.height) : null;
  const badge = getStatusBadge(bmi);

  const comparison = useMemo(() => {
    // usado no print: DIFERENÇA +1,3 kg (vermelho/verde)
    const prev = latestMetricData?.previousWeight;
    const last = latestMetricData?.lastWeight;
    if (!hasMeasurements || prev == null || last == null) return { diff: null, text: '--', color: '#9AA4B2' };

    const diff = last - prev;
    const color = diff > 0 ? '#E11D48' : diff < 0 ? '#16A34A' : '#111827';
    const prefix = diff > 0 ? '+' : '';
    return { diff, text: `${prefix}${formatNumber(diff, 1)} kg`, color };
  }, [latestMetricData, hasMeasurements]);

  // goal
  const userTargetWeight = user?.targetWeight ?? null;
  const goalRemainingKg = useMemo(() => {
    if (userTargetWeight == null || displayWeight == null) return null;
    return userTargetWeight - displayWeight; // para o print: "5,2 kg restantes" (meta 75 - atual 69.8)
  }, [userTargetWeight, displayWeight]);

  const goalProgressPct = useMemo(() => {
    // Progresso visual "bonito": clamp 0..100, sem depender do maxDiff fixo.
    // Se meta > atual: progresso = atual/meta (ex: 69.8/75 = 93%) — mas no print está 70%.
    // Então aqui vou manter compatível com seu cálculo anterior (maxDiff 15), mas exibindo em %.
    if (userTargetWeight == null || displayWeight == null) return 0;
    const diffAbs = Math.abs(displayWeight - userTargetWeight);
    const maxDiff = 15;
    const raw = 1 - diffAbs / maxDiff;
    return Math.round(clamp(raw, 0, 1) * 100);
  }, [userTargetWeight, displayWeight]);

  const goalBarWidth = `${goalProgressPct}%`;

  const memberName = (user?.fullName || 'Usuário').split(' ')[0];
  const headerSubtitle = 'Bem-vindo de volta,';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* HEADER (igual ao print) */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.avatarBox}>
              <Ionicons name="person" size={26} color="#fff" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.headerSub}>{headerSubtitle}</Text>
              <Text style={styles.headerName}>{memberName}</Text>
            </View>

            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('NotificationSettings')}
            >
              <Ionicons name="notifications-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* PESO ATUAL */}
        {hasMeasurements ? (
          <View style={styles.cardBig}>
            <View style={styles.cardBigHeader}>
              <View style={styles.cardBigTitleLeft}>
                <View style={styles.cardIconPill}>
                  <Ionicons name="scale-outline" size={18} color="#2F6FED" />
                </View>
                <Text style={styles.cardBigTitle}>Peso Atual</Text>
              </View>

              <View style={styles.datePill}>
                <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                <Text style={styles.datePillText}>{formatDateShort(displayTimestamp)}</Text>
              </View>
            </View>

            <TouchableOpacity activeOpacity={0.85} onPress={handleOpenLastResult}>
              <View style={styles.weightCenter}>
                <Text style={styles.weightBig}>{formatNumber(displayWeight, 1)}</Text>
                <Text style={styles.weightKg}>kg</Text>
              </View>

              <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: badge.color }]} />
                <Text style={[styles.statusText, { color: badge.color }]}>
                  {badge.text}
                  {bmi != null ? ` (IMC ${formatNumber(bmi, 1)})` : ''}
                </Text>
              </View>

              {/* barra segmentada estilo print */}
              <View style={styles.segmentRow}>
                <View style={[styles.segment, styles.segBlue]} />
                <View style={[styles.segment, styles.segGreen]} />
                <View style={[styles.segment, styles.segYellow]} />
                <View style={[styles.segment, styles.segRed]} />

                {/* marcador */}
                {bmi != null && (
                  <View style={[styles.bmiMarker, { left: `${getBMIIndicatorLeft(bmi)}%` }]} />
                )}
              </View>

              <View style={styles.segmentLabels}>
                <Text style={styles.segLabel}>18.5</Text>
                <Text style={styles.segLabel}>25</Text>
                <Text style={styles.segLabel}>30</Text>
                <Text style={styles.segLabel}>35</Text>
              </View>
            </TouchableOpacity>

            {/* Rodapé interno: Diferença + Ver histórico */}
            <View style={styles.cardFooterRow}>
              <View style={styles.footerLeft}>
                <View style={styles.footerIconCircle}>
                  <Ionicons name="trending-up-outline" size={18} color="#E11D48" />
                </View>

                <View>
                  <Text style={styles.footerLabel}>DIFERENÇA</Text>
                  <Text style={[styles.footerValue, { color: comparison.color }]}>{comparison.text}</Text>
                </View>
              </View>

              <View style={styles.footerDivider} />

              <TouchableOpacity
                style={styles.footerRight}
                onPress={() => navigation.navigate('WeightHistory', { screen: 'HistoryScreen' })}
              >
                <Text style={styles.footerLink}>Ver Histórico</Text>
                <Ionicons name="arrow-forward" size={16} color="#2F6FED" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.cardBig}>
            <Text style={styles.cardBigTitle}>Peso Atual</Text>
            <Text style={styles.emptyText}>Nenhuma pesagem registrada ainda.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleStartWeightScan}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Fazer primeira pesagem</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* META DE PESO */}
        {hasMeasurements ? (
          <View style={styles.cardBig}>
            <View style={styles.goalTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.goalTitle}>Meta de Peso</Text>
                <Text style={styles.goalObjective}>
                  Objetivo: <Text style={styles.goalObjectiveStrong}>{userTargetWeight != null ? formatNumber(userTargetWeight, 1) : '--'}kg</Text>
                </Text>
              </View>

              <TouchableOpacity
                style={styles.editCircle}
                onPress={() => setIsEditingGoal(!isEditingGoal)}
              >
                <Ionicons name="pencil" size={18} color="#2F6FED" />
              </TouchableOpacity>
            </View>

            {isEditingGoal || userTargetWeight == null ? (
              <View style={{ marginTop: 12 }}>
                <View style={styles.goalEditContainer}>
                  <Picker
                    selectedValue={newTargetWeight}
                    onValueChange={(v) => setNewTargetWeight(v)}
                    style={styles.goalPicker}
                    itemStyle={styles.goalPickerItem}
                  >
                    {weightOptions.map((w) => (
                      <Picker.Item key={w} label={`${w} Kg`} value={w} />
                    ))}
                  </Picker>

                  <TouchableOpacity
                    style={styles.saveGoalButton}
                    onPress={handleSaveTargetWeight}
                    disabled={savingGoal}
                  >
                    {savingGoal ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveGoalButtonText}>Salvar</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.goalBigRow}>
                  <Text style={styles.goalBigNumber}>
                    {goalRemainingKg != null ? formatNumber(goalRemainingKg, 1) : '--'}
                  </Text>
                  <Text style={styles.goalBigUnit}>kg restantes</Text>
                </View>

                <View style={styles.goalProgressRow}>
                  <Text style={styles.goalProgressLabel}>Progresso</Text>
                  <View style={styles.goalPctPill}>
                    <Text style={styles.goalPctText}>{goalProgressPct}%</Text>
                  </View>
                </View>

                <View style={styles.goalBarTrack}>
                  <View style={[styles.goalBarFill, { width: goalBarWidth }]} />
                </View>

                <View style={styles.goalBarLabels}>
                  <Text style={styles.goalBarLabel}>{formatNumber(displayWeight, 1)} kg</Text>
                  <Text style={styles.goalBarLabel}>{formatNumber(userTargetWeight, 1)} kg</Text>
                </View>
              </>
            )}
          </View>
        ) : null}

        {/* GRID 2 CARDS */}
        <View style={styles.gridRow}>
          <TouchableOpacity
            style={[styles.smallCard, { marginRight: 12 }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('BodyEvolution', { initialMetric: 'bmi' })}
          >
            <View style={[styles.smallIcon, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="analytics-outline" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.smallTitle}>Evolução</Text>
            <Text style={styles.smallSub}>Gráficos detalhados</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.smallCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('BodyMeasurements')}
          >
            <View style={[styles.smallIcon, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="resize-outline" size={18} color="#EA580C" />
            </View>
            <Text style={styles.smallTitle}>Medidas</Text>
            <Text style={styles.smallSub}>Corpo inteiro</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 18 }]}
        onPress={handleStartWeightScan}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EEF3FF' },
  scrollContent: { paddingBottom: 120 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF3FF' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },

  // HEADER
  header: {
    backgroundColor: '#4A78FF',
    paddingTop: Platform.OS === 'android' ? 18 : 0,
    paddingHorizontal: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  headerName: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 2 },
  headerIconBtn: { padding: 10 },

  // CARDS
  cardBig: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 26,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  cardBigHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBigTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIconPill: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBigTitle: { fontSize: 22, fontWeight: '700', color: '#1F2937' },

  datePill: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  datePillText: { color: '#374151', fontWeight: '800' },

  weightCenter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginTop: 10 },
  weightBig: { fontSize: 84, fontWeight: '900', color: '#111827', letterSpacing: -1 },
  weightKg: { fontSize: 26, fontWeight: '800', color: '#6B7280', marginLeft: 10, marginBottom: 14 },

  statusPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    marginTop: 8,
  },
  statusDot: { width: 10, height: 10, borderRadius: 999 },
  statusText: { fontWeight: '900' },

  segmentRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    position: 'relative',
  },
  segment: { height: '100%', borderRadius: 999 },
  segBlue: { flex: 1, backgroundColor: '#D8E8FF' },
  segGreen: { flex: 1, backgroundColor: '#44B049' },
  segYellow: { flex: 1, backgroundColor: '#FFD89A' },
  segRed: { flex: 1, backgroundColor: '#FFC1C1' },

  bmiMarker: {
    position: 'absolute',
    top: -6,
    width: 12,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.08)',
    transform: [{ translateX: -6 }],
  },

  segmentLabels: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  segLabel: { color: '#9CA3AF', fontWeight: '700' },

  cardFooterRow: {
    marginTop: 18,
    backgroundColor: '#F6F7FB',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  footerIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: '#FFE4E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLabel: { fontSize: 12, fontWeight: '900', color: '#6B7280' },
  footerValue: { fontSize: 16, fontWeight: '900' },

  footerDivider: { width: 1, height: 28, backgroundColor: 'rgba(0,0,0,0.08)', marginHorizontal: 12 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerLink: { color: '#2F6FED', fontWeight: '900', fontSize: 16 },

  // META
  goalTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  goalTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  goalObjective: { marginTop: 4, color: '#6B7280', fontWeight: '700' },
  goalObjectiveStrong: { color: '#2F6FED', fontWeight: '900' },
  editCircle: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  goalBigRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 14 },
  goalBigNumber: { fontSize: 52, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  goalBigUnit: { fontSize: 18, fontWeight: '800', color: '#6B7280', marginLeft: 8, marginBottom: 10 },

  goalProgressRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalProgressLabel: { color: '#6B7280', fontWeight: '800' },
  goalPctPill: { backgroundColor: '#EEF4FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  goalPctText: { color: '#2F6FED', fontWeight: '900' },

  goalBarTrack: { marginTop: 12, height: 10, backgroundColor: '#E5E7EB', borderRadius: 999, overflow: 'hidden' },
  goalBarFill: { height: '100%', backgroundColor: '#4A78FF', borderRadius: 999 },

  goalBarLabels: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  goalBarLabel: { color: '#9CA3AF', fontWeight: '800' },

  // goal edit
  goalEditContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalPicker: { flex: 1, height: 150 },
  goalPickerItem: { fontSize: 18, color: '#111827' },
  saveGoalButton: {
    backgroundColor: '#4A78FF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    height: 44,
    minWidth: 90,
  },
  saveGoalButtonText: { color: '#fff', fontWeight: '900', fontSize: 16 },

  // GRID
  gridRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 14 },
  smallCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 26,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  smallIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  smallTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  smallSub: { marginTop: 6, color: '#6B7280', fontWeight: '500', fontSize: 14 },

  // EMPTY + BTN
  emptyText: { marginTop: 10, color: '#6B7280', fontWeight: '700' },
  primaryBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4A78FF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900' },

  // FAB
  fab: {
    position: 'absolute',
    right: 18,
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: '#4A78FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
