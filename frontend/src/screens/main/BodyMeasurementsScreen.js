// frontend/src/screens/main/BodyMeasurementsScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  Platform,
  PanResponder,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

import * as Victory from 'victory-native';
const {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryScatter,
  VictoryGroup,
  VictoryLabel,
  VictoryVoronoiContainer,
} = Victory;

const SCREEN_W = Dimensions.get('window').width;

const MEASUREMENT_ITEMS = [
  { key: 'neck', label: 'Pescoço', unit: 'cm', icon: 'body-outline' },
  { key: 'shoulder', label: 'Ombro', unit: 'cm', icon: 'body-outline' },
  { key: 'chest', label: 'Peito', unit: 'cm', icon: 'body-outline' },
  { key: 'waist', label: 'Cintura', unit: 'cm', icon: 'body-outline' },
  { key: 'abdomenUpper', label: 'Abdômen superior', unit: 'cm', icon: 'body-outline' },
  { key: 'abdomenLower', label: 'Abdômen inferior', unit: 'cm', icon: 'body-outline' },
  { key: 'hip', label: 'Quadril', unit: 'cm', icon: 'body-outline' },
  { key: 'armLeft', label: 'Braço (esquerdo)', unit: 'cm', icon: 'barbell-outline' },
  { key: 'armRight', label: 'Braço (direito)', unit: 'cm', icon: 'barbell-outline' },
  { key: 'forearmLeft', label: 'Antebraço (esquerdo)', unit: 'cm', icon: 'barbell-outline' },
  { key: 'forearmRight', label: 'Antebraço (direito)', unit: 'cm', icon: 'barbell-outline' },
  { key: 'thighLeft', label: 'Coxa (esquerda)', unit: 'cm', icon: 'walk-outline' },
  { key: 'thighRight', label: 'Coxa (direita)', unit: 'cm', icon: 'walk-outline' },
  { key: 'calfLeft', label: 'Panturrilha (esquerda)', unit: 'cm', icon: 'walk-outline' },
  { key: 'calfRight', label: 'Panturrilha (direita)', unit: 'cm', icon: 'walk-outline' },
];

const MEASUREMENT_GROUPS = [
  {
    key: 'abdomen',
    title: 'Abdômen',
    items: [
      { key: 'waist', label: 'Cintura' },
      { key: 'abdomenUpper', label: 'Abdômen sup.' },
      { key: 'abdomenLower', label: 'Abdômen inf.' },
    ],
  },
  {
    key: 'arms',
    title: 'Braços',
    items: [
      { key: 'armLeft', label: 'Braço Esq.' },
      { key: 'armRight', label: 'Braço Dir.' },
      { key: 'forearmLeft', label: 'Antebraço Esq.' },
      { key: 'forearmRight', label: 'Antebraço Dir.' },
    ],
  },
  {
    key: 'legs',
    title: 'Pernas',
    items: [
      { key: 'thighLeft', label: 'Coxa Esq.' },
      { key: 'thighRight', label: 'Coxa Dir.' },
      { key: 'calfLeft', label: 'Panturrilha Esq.' },
      { key: 'calfRight', label: 'Panturrilha Dir.' },
    ],
  },
  {
    key: 'torso',
    title: 'Tronco',
    items: [
      { key: 'neck', label: 'Pescoço' },
      { key: 'shoulder', label: 'Ombro' },
      { key: 'chest', label: 'Peito' },
    ],
  },
  { key: 'hip', title: 'Quadril', items: [{ key: 'hip', label: 'Quadril' }] },
];

// ✅ faixas “realistas” p/ filtrar outliers (ajuste quando quiser)
const OUTLIER_RULES = {
  neck: { min: 15, max: 600 },
  shoulder: { min: 30, max: 800 },
  chest: { min: 50, max: 1080 },
  waist: { min: 40, max: 2000 },
  abdomenUpper: { min: 40, max: 2200 },
  abdomenLower: { min: 40, max: 2200 },
  hip: { min: 50, max: 2500 },
  armLeft: { min: 15, max: 800 },
  armRight: { min: 15, max: 800 },
  forearmLeft: { min: 10, max: 700 },
  forearmRight: { min: 10, max: 700 },
  thighLeft: { min: 25, max: 1300 },
  thighRight: { min: 25, max: 1300 },
  calfLeft: { min: 15, max: 900 },
  calfRight: { min: 15, max: 900 },
};

function formatDateBR(value) {
  try {
    if (!value) return '';
    return new Date(value).toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
}

function formatMonthShortBR(value) {
  try {
    return new Date(value).toLocaleDateString('pt-BR', { month: 'short' });
  } catch {
    return '';
  }
}

// ✅ NOVO: quando o período real for curto (poucos dias), mostrar dd/mm
function formatDayMonthBR(value) {
  try {
    const d = new Date(value);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}`;
  } catch {
    return '';
  }
}

function toISODateOnly(d) {
  try {
    const x = new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const day = String(x.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '';
  }
}

function parseISODateOnly(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  return Number.isFinite(d.getTime()) ? d : null;
}

function toNumberOrNull(text) {
  if (text === null || text === undefined) return null;
  const cleaned = String(text).replace(',', '.').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function clampNumber(n, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function roundTo(n, decimals = 1) {
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
}

function niceStep(range, targetTicks = 5) {
  const r = Math.abs(range);
  if (r === 0) return 1;
  const rough = r / Math.max(2, targetTicks - 1);
  const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
  const rem = rough / pow10;
  let step;
  if (rem <= 1) step = 1;
  else if (rem <= 2) step = 2;
  else if (rem <= 5) step = 5;
  else step = 10;
  return step * pow10;
}

function buildNiceTicks(min, max, tickCount = 5) {
  const a = clampNumber(min, 0);
  const b = clampNumber(max, 1);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const range = hi - lo;
  const step = niceStep(range, tickCount);
  const niceMin = Math.floor(lo / step) * step;
  const niceMax = Math.ceil(hi / step) * step;

  const ticks = [];
  for (let i = 0; i < 50; i++) {
    const v = niceMin + step * i;
    if (v > niceMax + step * 0.0001) break;
    ticks.push(roundTo(v, 1));
  }
  if (!ticks.length) return [roundTo(lo, 1), roundTo(hi, 1)];
  return ticks;
}

function getMeasureRange() {
  return { min: 0, max: 200, step: 0.1 };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function roundToStep(n, step) {
  const inv = 1 / step;
  return Math.round(n * inv) / inv;
}

function isOutlier(key, value) {
  if (!Number.isFinite(value)) return false;
  const rule = OUTLIER_RULES[key];
  if (!rule) return false;
  return value < rule.min || value > rule.max;
}

/**
 * ✅ RÉGUA POR ARRASTO
 */
function RulerDrag({
  value,
  min,
  max,
  step,
  pxPerStep = 2,
  majorEvery = 1,
  onLiveChange,
  onCommit,
}) {
  const vSafe = Number.isFinite(Number(value)) ? Number(value) : min;

  const currentValueRef = useRef(vSafe);
  useEffect(() => {
    currentValueRef.current = vSafe;
  }, [vSafe]);

  const startValueRef = useRef(vSafe);
  const dragX = useRef(new Animated.Value(0)).current;

  const visibleSteps = useMemo(() => {
    const half = SCREEN_W / 2;
    return Math.floor(half / pxPerStep) + 80;
  }, [pxPerStep]);

  const ticks = useMemo(() => {
    const center = currentValueRef.current;
    const arr = [];
    for (let i = -visibleSteps; i <= visibleSteps; i++) {
      const t = roundToStep(center + i * step, step);
      if (t < min || t > max) continue;

      const isMajor = Math.abs(t / majorEvery - Math.round(t / majorEvery)) < 1e-9;
      arr.push({ t, i, isMajor });
    }
    return arr;
  }, [min, max, step, visibleSteps, majorEvery, vSafe]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        startValueRef.current = currentValueRef.current;
        dragX.stopAnimation();
        dragX.setValue(0);
      },

      onPanResponderMove: (_, g) => {
        const atMin = currentValueRef.current <= min + 1e-9;
        const atMax = currentValueRef.current >= max - 1e-9;

        let dx = g.dx;

        if (atMax && dx < 0) dx = dx * 0.25;
        if (atMin && dx > 0) dx = dx * 0.25;

        dragX.setValue(dx);

        const deltaSteps = dx / pxPerStep;
        const rawValue = startValueRef.current - deltaSteps * step;
        const next = clamp(roundToStep(rawValue, step), min, max);

        currentValueRef.current = next;
        onLiveChange?.(next);
      },

      onPanResponderRelease: () => {
        const committed = clamp(roundToStep(currentValueRef.current, step), min, max);
        currentValueRef.current = committed;

        onLiveChange?.(committed);
        onCommit?.(committed);

        Animated.timing(dragX, {
          toValue: 0,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <View style={styles.rulerTrackDrag} {...pan.panHandlers}>
      <View style={styles.rulerPointerWrap}>
        <Ionicons name="caret-down" size={18} color="#2F6BFF" />
      </View>
      <View style={styles.rulerCenterLineDrag} />

      <Animated.View style={[styles.rulerTicksLayer, { transform: [{ translateX: dragX }] }]}>
        {ticks.map((x) => {
          const left = SCREEN_W / 2 + x.i * pxPerStep;
          return (
            <View
              key={`${x.t}-${x.i}`}
              style={[
                styles.rulerTickAbs,
                { left },
                x.isMajor ? styles.rulerTickMajor : styles.rulerTickMinor,
              ]}
            >
              {x.isMajor ? (
                <Text style={styles.rulerLabelAbs}>{String(x.t).replace('.0', '')}</Text>
              ) : null}
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}

/**
 * ✅ botão compacto (drop) p/ reduzir poluição visual
 */
function CompactSelect({ label, value, onPress, rightText }) {
  return (
    <TouchableOpacity style={styles.selectBtn} onPress={onPress} activeOpacity={0.9}>
      <View style={{ flex: 1 }}>
        <Text style={styles.selectLabel}>{label}</Text>
        <Text style={styles.selectValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {rightText ? <Text style={styles.selectRight}>{rightText}</Text> : null}
      <Ionicons name="chevron-down" size={18} color="#9AA4B2" />
    </TouchableOpacity>
  );
}

/**
 * ✅ Bottom Sheet genérico
 */
function BottomSheet({ visible, title, onClose, children, height = 420 }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { maxHeight: height }]}>
          <View style={styles.sheetTopRow}>
            <Text style={styles.sheetDate}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetClose}>
              <Ionicons name="close" size={18} color="#111827" />
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 10 }}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

export default function BodyMeasurementsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const ANDROID_NAV_FALLBACK = Platform.OS === 'android' ? 32 : 0;
  const bottomOffset = Math.max(insets.bottom || 0, ANDROID_NAV_FALLBACK);

  if (!VictoryChart || !VictoryLine || !VictoryAxis) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>
            Erro ao carregar gráfico (Victory). Verifique a instalação do victory-native.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  function sortByCreatedAtAsc(list = []) {
    return [...list].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState({});
  const [selectedKey, setSelectedKey] = useState(null);
  const [inputMode, setInputMode] = useState('ruler'); // 'ruler' | 'keyboard'
  const [liveValue, setLiveValue] = useState(null);
  const liveValueInputRef = useRef(null);
  const [liveValueText, setLiveValueText] = useState('0.0');
  const liveValueRef = useRef(0);

  const [selectedMeasureKeys, setSelectedMeasureKeys] = useState(['waist']);

  const [periodPreset, setPeriodPreset] = useState('month'); // 'week' | 'month' | 'year' | 'custom'
  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [measureSheetOpen, setMeasureSheetOpen] = useState(false);
  const [periodSheetOpen, setPeriodSheetOpen] = useState(false);

  const [activeHover, setActiveHover] = useState(null);
  const [isTouching, setIsTouching] = useState(false);

  const [showMoreHistory, setShowMoreHistory] = useState(false);

  const setLiveValueFast = useCallback((v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    liveValueRef.current = n;
    const txt = n.toFixed(1);
    liveValueInputRef.current?.setNativeProps?.({ text: txt });
  }, []);

  const commitLiveValue = useCallback((v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    liveValueRef.current = n;
    setLiveValueText(n.toFixed(1));
  }, []);

  const palette = useMemo(
    () => [
      { stroke: '#2563eb', point: '#2563eb' }, // azul
      { stroke: '#10b981', point: '#10b981' }, // verde
      { stroke: '#f59e0b', point: '#f59e0b' }, // laranja
    ],
    []
  );

  const materialTheme = useMemo(
    () => ({
      axis: {
        style: {
          axis: { stroke: '#999' },
          grid: { stroke: '#e6e6e6' },
          tickLabels: { fontSize: 10, padding: 5 },
        },
      },
    }),
    []
  );

  const labelByKey = useMemo(() => {
    const map = {};
    MEASUREMENT_ITEMS.forEach((m) => (map[m.key] = m.label));
    MEASUREMENT_GROUPS.forEach((c) => c.items.forEach((it) => (map[it.key] = it.label)));
    return map;
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);

      const [latestRes, historyRes] = await Promise.allSettled([
        api.get('/body-measurements/latest'),
        api.get('/body-measurements/history'),
      ]);

      if (latestRes.status === 'fulfilled') setLatest(latestRes.value?.data?.data || null);
      if (historyRes.status === 'fulfilled') {
        const list = historyRes.value?.data?.data || [];
        setHistory(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      console.log('❌ loadAll:', e?.response?.data || e?.message || e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadAll);
    return unsub;
  }, [navigation, loadAll]);

  const latestDate = useMemo(() => formatDateBR(latest?.updatedAt || latest?.createdAt), [latest]);

  const openRegisterModal = useCallback(() => {
    const base = {};
    MEASUREMENT_ITEMS.forEach((it) => {
      const v = latest?.[it.key];
      base[it.key] = v !== null && v !== undefined ? String(v) : '';
    });
    setDraft(base);
    setSelectedKey(null);
    setLiveValue(null);
    setInputMode('keyboard');
    setModalOpen(true);
  }, [latest]);

  const openSingleFieldModal = useCallback(
    (key) => {
      const base = {};
      MEASUREMENT_ITEMS.forEach((it) => {
        const v = latest?.[it.key];
        base[it.key] = v !== null && v !== undefined ? String(v) : '';
      });

      setDraft(base);
      setSelectedKey(key);
      setInputMode('ruler');

      const n = toNumberOrNull(base[key]);
      const initial = Number.isFinite(n) ? n : getMeasureRange(key).min;
      liveValueRef.current = initial;
      setLiveValueText(initial.toFixed(1));
      setLiveValue(Number.isFinite(n) ? n : null);

      setModalOpen(true);
    },
    [latest]
  );

  const saveMeasurements = useCallback(async () => {
    try {
      setSaving(true);

      const payload = {};
      MEASUREMENT_ITEMS.forEach((it) => {
        payload[it.key] = toNumberOrNull(draft[it.key]);
      });

      const hasAny = MEASUREMENT_ITEMS.some((it) => payload[it.key] !== null);
      if (!hasAny) {
        Alert.alert('Ops', 'Preencha pelo menos uma medida (cm).');
        return;
      }

      const res = await api.post('/body-measurements', payload);
      if (!res?.data?.success) {
        Alert.alert('Erro', res?.data?.error || 'Falha ao salvar medidas.');
        return;
      }

      setModalOpen(false);
      setSelectedKey(null);
      setLiveValue(null);

      await loadAll();
      Alert.alert('Sucesso', 'Medidas corporais registradas!');
    } catch (e) {
      console.log('❌ saveMeasurements:', e?.response?.data || e?.message || e);
      Alert.alert('Erro', 'Não foi possível salvar as medidas.');
    } finally {
      setSaving(false);
    }
  }, [draft, loadAll]);

  const getValueText = useCallback(
    (key, unit) => {
      const v = latest?.[key];
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return `${n.toFixed(1)} ${unit}`;
    },
    [latest]
  );

  const toggleMeasureKey = useCallback((k) => {
    setSelectedMeasureKeys((prev) => {
      const has = prev.includes(k);

      if (has) {
        const next = prev.filter((x) => x !== k);
        if (!next.length) return ['waist'];
        return next;
      }

      if (prev.length >= 3) {
        Alert.alert('Limite', 'Selecione até 3 medidas para comparar no gráfico.');
        return prev;
      }

      return [...prev, k];
    });
  }, []);

  const formatYTick = useCallback((t) => {
    const n = clampNumber(t, 0);
    const rounded = roundTo(n, 1);
    const isInt = Math.abs(rounded - Math.round(rounded)) < 0.00001;
    return isInt ? String(Math.round(rounded)) : String(rounded);
  }, []);

  // ====== Período selecionado ======
  const periodRange = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    if (periodPreset === 'custom') {
      const fromD = parseISODateOnly(customFrom);
      const toD = parseISODateOnly(customTo);
      if (fromD && toD) {
        const a = new Date(fromD);
        a.setHours(0, 0, 0, 0);
        const b = new Date(toD);
        b.setHours(23, 59, 59, 999);
        return { start: a <= b ? a : b, end: a <= b ? b : a, label: 'Personalizado' };
      }
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      return { start, end, label: 'Personalizado' };
    }

    if (periodPreset === 'week') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end, label: 'Semana' };
    }

    if (periodPreset === 'year') {
      const start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      return { start, end, label: 'Ano' };
    }

    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: 'Mês' };
  }, [periodPreset, customFrom, customTo]);

  const sortedHistoryAsc = useMemo(() => sortByCreatedAtAsc(history), [history]);

  const periodHistoryAsc = useMemo(() => {
    const { start, end } = periodRange;
    return sortedHistoryAsc.filter((r) => {
      const d = new Date(r?.createdAt || r?.updatedAt);
      if (!Number.isFinite(d.getTime())) return false;
      return d >= start && d <= end;
    });
  }, [sortedHistoryAsc, periodRange]);

  // ====== Séries (até 3) ======
  const seriesAll = useMemo(() => {
    const asc = periodHistoryAsc;
    const keys = selectedMeasureKeys.slice(0, 3);

    return keys.map((key, idx) => {
      let ignored = 0;

      const data = asc
        .map((row) => {
          const xRaw = row?.createdAt || row?.updatedAt;
          const x = xRaw ? new Date(xRaw) : null;
          if (!x || !Number.isFinite(x.getTime())) return null;

          const yRaw = row?.[key];
          const y = typeof yRaw === 'number' ? yRaw : yRaw != null ? Number(yRaw) : null;
          if (!Number.isFinite(y)) return null;

          if (isOutlier(key, y)) {
            ignored += 1;
            return null;
          }

          return { x, y };
        })
        .filter(Boolean);

      const label = labelByKey[key] || key;
      const last = data.length ? data[data.length - 1] : null;

      return {
        key,
        label,
        color: palette[idx % palette.length],
        data,
        last,
        ignored,
      };
    });
  }, [periodHistoryAsc, selectedMeasureKeys, labelByKey, palette]);

  const seriesWithData = useMemo(() => seriesAll.filter((s) => (s.data?.length || 0) > 0), [seriesAll]);

  const missingInPeriod = useMemo(() => {
    return seriesAll.filter((s) => (s.data?.length || 0) === 0).map((s) => s.label);
  }, [seriesAll]);

  const ignoredTotal = useMemo(() => {
    return seriesAll.reduce((a, s) => a + (s.ignored || 0), 0);
  }, [seriesAll]);

  // ====== Domain Y ======
  const yMinMax = useMemo(() => {
    const all = seriesWithData.flatMap((s) => s.data.map((d) => d.y));
    if (!all.length) return { min: 0, max: 1 };

    const min = Math.min(...all);
    const max = Math.max(...all);

    const range = Math.max(0.001, max - min);
    const pad = Math.max(1, range * 0.2);

    if (range < 0.01) return { min: min - 2, max: max + 2 };
    return { min: min - pad, max: max + pad };
  }, [seriesWithData]);

  const yTickValues = useMemo(() => buildNiceTicks(yMinMax.min, yMinMax.max, 5), [yMinMax]);

  // ✅ NOVO: Domain X inteligente (zoom nos dados quando estiver “apertado”)
  const xDomain = useMemo(() => {
    const allX = seriesWithData
      .flatMap((s) => s.data.map((p) => p.x))
      .filter(Boolean);

    // se não tiver dados, usa o período selecionado
    if (!allX.length) return [periodRange.start, periodRange.end];

    const minX = new Date(Math.min(...allX.map((d) => d.getTime())));
    const maxX = new Date(Math.max(...allX.map((d) => d.getTime())));

    // ✅ regra que você pediu: começar EXATAMENTE na primeira data com registro
    // (opcional) pequeno respiro só no final pra não colar na borda
    const padRightMs = 12 * 60 * 60 * 1000; // 12h (pode ser 0 se quiser “seco”)
    const end = new Date(maxX.getTime() + padRightMs);

    return [minX, end];
  },   [seriesWithData, periodRange]);


  const chartKey = useMemo(() => {
    const lastRow = periodHistoryAsc.length ? periodHistoryAsc[periodHistoryAsc.length - 1] : null;
    const lastStamp = lastRow?.updatedAt || lastRow?.createdAt || '';
    const points = seriesAll.reduce((a, s) => a + (s.data?.length || 0), 0);
    return `bm-${periodPreset}-${customFrom}-${customTo}-${selectedMeasureKeys.join('|')}-${points}-${lastStamp}`;
  }, [periodHistoryAsc, seriesAll, periodPreset, customFrom, customTo, selectedMeasureKeys]);

  // ====== Comparação inteligente ======
  const smartCompare = useMemo(() => {
    const asc = periodHistoryAsc;
    const keys = selectedMeasureKeys.slice(0, 3);
    if (!asc.length || !keys.length) return { rows: [], firstDate: null, lastDate: null };

    const first = asc[0];
    const last = asc[asc.length - 1];

    const rows = keys
      .map((k) => {
        const fv = Number(first?.[k]);
        const lv = Number(last?.[k]);

        const fOk = Number.isFinite(fv) && !isOutlier(k, fv);
        const lOk = Number.isFinite(lv) && !isOutlier(k, lv);

        if (!fOk && !lOk) return null;

        const firstVal = fOk ? fv : null;
        const lastVal = lOk ? lv : null;
        const diff = firstVal !== null && lastVal !== null ? lastVal - firstVal : null;

        return {
          key: k,
          label: labelByKey[k] || k,
          firstVal,
          lastVal,
          diff,
        };
      })
      .filter(Boolean);

    return {
      rows,
      firstDate: first?.createdAt || first?.updatedAt || null,
      lastDate: last?.createdAt || last?.updatedAt || null,
    };
  }, [periodHistoryAsc, selectedMeasureKeys, labelByKey]);

  // ====== Tooltip ======
  const handleActivated = useCallback((points = []) => {
    if (!points?.length) return;

    const x = points[0]?.x;
    const valuesByKey = {};
    points.forEach((p) => {
      if (p?.childName) {
        const m = String(p.childName).match(/^line-(.+)$/);
        if (m?.[1]) valuesByKey[m[1]] = p.y;
      }
    });

    setActiveHover({ x, valuesByKey });
    setIsTouching(true);
  }, []);

  const handleDeactivated = useCallback(() => {
    setIsTouching(false);
    setActiveHover(null);
  }, []);

  const hoverDisplay = useMemo(() => {
    if (!activeHover?.x) return null;
    const xTxt = formatDateBR(activeHover.x);
    const keys = selectedMeasureKeys.slice(0, 3);

    const rows = keys
      .map((k, idx) => {
        const y = activeHover.valuesByKey?.[k];
        if (!Number.isFinite(y)) return null;
        return {
          key: k,
          label: labelByKey[k] || k,
          value: y,
          color: palette[idx]?.stroke || '#2563eb',
        };
      })
      .filter(Boolean);

    return { xTxt, rows };
  }, [activeHover, selectedMeasureKeys, labelByKey, palette]);

  // ====== Histórico (lista) ======
  const historyDesc = useMemo(() => [...periodHistoryAsc].reverse(), [periodHistoryAsc]);

  const historyList = useMemo(() => {
    const total = historyDesc.length;
    if (!total) return [];
    if (showMoreHistory) return historyDesc.slice(0, Math.min(total, 30));
    return historyDesc.slice(0, 3);
  }, [historyDesc, showMoreHistory]);

  const measuresSummary = useMemo(() => {
    const keys = selectedMeasureKeys.slice(0, 3);
    if (!keys.length) return 'Selecione';
    if (keys.length === 1) return labelByKey[keys[0]] || keys[0];
    return `${keys.length} medidas`;
  }, [selectedMeasureKeys, labelByKey]);

  const periodSummary = useMemo(() => periodRange.label, [periodRange]);

  const applyCustomRange = () => {
    const a = parseISODateOnly(customFrom);
    const b = parseISODateOnly(customTo);
    if (!a || !b) {
      Alert.alert('Datas inválidas', 'Use o formato YYYY-MM-DD (ex: 2026-01-13).');
      return;
    }
    setPeriodPreset('custom');
    setCustomOpen(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando medidas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedItem = selectedKey ? MEASUREMENT_ITEMS.find((x) => x.key === selectedKey) : null;
  const sheetDate = formatDateBR(new Date());

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Medidas corporais</Text>
          <Text style={styles.subtitle}>{latestDate ? `Último registro: ${latestDate}` : 'Sem registro'}</Text>
        </View>

        <TouchableOpacity style={styles.headerBtn} onPress={openRegisterModal}>
          <Ionicons name="add" size={22} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 24 + 72 + bottomOffset },
        ]}
      >
        {/* Cards das medidas */}
        <View style={styles.grid}>
          {MEASUREMENT_ITEMS.map((it) => {
            const valueText = getValueText(it.key, it.unit);
            const hasValue = !!valueText;

            return (
              <TouchableOpacity
                key={it.key}
                activeOpacity={0.85}
                style={styles.card}
                onPress={() => openSingleFieldModal(it.key)}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardLabel}>{it.label}</Text>

                  {!hasValue ? (
                    <View style={styles.plusCircle}>
                      <Ionicons name="add" size={16} color="#2563eb" />
                    </View>
                  ) : (
                    <View style={styles.okCircle}>
                      <Ionicons name="checkmark" size={14} color="#14532d" />
                    </View>
                  )}
                </View>

                <View style={styles.cardBottom}>
                  <Text style={styles.cardValue}>{hasValue ? valueText : 'Sem registro'}</Text>
                  <Ionicons name={it.icon} size={22} color="#9AA4B2" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Histórico */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Histórico</Text>
            <Text style={styles.helperText}>até 3</Text>
          </View>

          {/* Controles */}
          <View style={styles.selectRow}>
            <CompactSelect
              label="Medidas"
              value={measuresSummary}
              rightText={`${Math.min(3, selectedMeasureKeys.length)}/3`}
              onPress={() => setMeasureSheetOpen(true)}
            />
            <CompactSelect
              label="Período"
              value={periodSummary}
              onPress={() => setPeriodSheetOpen(true)}
            />
          </View>

          {/* Card do gráfico */}
          <View style={styles.chartBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={{ fontWeight: '900', color: '#111827', marginBottom: 6 }}>Gráfico de Evolução</Text>
              <Text style={{ fontWeight: '900', color: '#9AA4B2' }}>{periodRange.label}</Text>
            </View>

            {/* Comparação */}
            {smartCompare.rows.length ? (
              <View style={styles.compareBox}>
                <Text style={styles.compareTitle}>
                  {smartCompare.firstDate && smartCompare.lastDate
                    ? `${formatDateBR(smartCompare.firstDate)} → ${formatDateBR(smartCompare.lastDate)}`
                    : 'Comparação'}
                </Text>

                <View style={{ marginTop: 8 }}>
                  {smartCompare.rows.map((r, idx) => {
                    const c = palette[idx]?.stroke || '#2563eb';
                    const diff = r.diff;
                    const diffColor = diff === null ? '#9AA4B2' : diff > 0 ? '#DC2626' : '#16A34A';
                    return (
                      <View key={r.key} style={styles.compareLine}>
                        <View style={[styles.historyDot, { backgroundColor: c }]} />
                        <Text style={styles.compareLabel}>{r.label}</Text>
                        <Text style={styles.compareValue}>
                          {r.firstVal !== null ? r.firstVal.toFixed(1) : '—'} →{' '}
                          {r.lastVal !== null ? r.lastVal.toFixed(1) : '—'} cm
                          {diff !== null ? (
                            <Text style={{ color: diffColor, fontWeight: '900' }}>
                              {'  '}
                              ({diff > 0 ? '+' : ''}
                              {diff.toFixed(1)} cm)
                            </Text>
                          ) : null}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {ignoredTotal > 0 ? (
              <View style={styles.outlierNote}>
                <Ionicons name="alert-circle-outline" size={16} color="#9AA4B2" />
                <Text style={styles.outlierText}>
                  {ignoredTotal} registro(s) ignorado(s) por valor fora do padrão.
                </Text>
              </View>
            ) : null}

            {missingInPeriod.length ? (
              <View style={styles.missingNote}>
                <Ionicons name="information-circle-outline" size={16} color="#9AA4B2" />
                <Text style={styles.missingText}>
                  Sem dados no período para: <Text style={{ color: '#111827' }}>{missingInPeriod.join(', ')}</Text>
                </Text>
              </View>
            ) : null}

            {/* Legenda */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {seriesAll.slice(0, 3).map((s) => {
                const hasData = (s.data?.length || 0) > 0;
                return (
                  <View
                    key={`legend-${s.key}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#F3F4F6',
                      borderRadius: 999,
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      opacity: hasData ? 1 : 0.45,
                    }}
                  >
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 99,
                        backgroundColor: s.color.stroke,
                        marginRight: 8,
                      }}
                    />
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#111827' }}>{s.label}</Text>
                  </View>
                );
              })}
            </View>

            {seriesWithData.length ? (
              <>
                {/* tooltip */}
                {hoverDisplay?.rows?.length && isTouching ? (
                  <View style={styles.hoverBox}>
                    <Text style={styles.hoverDate}>{hoverDisplay.xTxt}</Text>
                    <View style={{ marginTop: 6 }}>
                      {hoverDisplay.rows.map((r) => (
                        <View key={`hover-${r.key}`} style={styles.hoverLine}>
                          <View style={[styles.historyDot, { backgroundColor: r.color }]} />
                          <Text style={styles.hoverLabel}>{r.label}</Text>
                          <Text style={styles.hoverValue}>{r.value.toFixed(1)} cm</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                <VictoryChart
                  key={chartKey}
                  theme={materialTheme}
                  height={240}
                  // ✅ mais “respiro” pra não colar na borda do card
                  padding={{ left: 52, right: 46, top: 26, bottom: 56 }}
                  domainPadding={{ y: 22, x: 0}}
                  scale={{ x: 'time', y: 'linear' }}
                  // ✅ X agora usa domain inteligente (zoom)
                  domain={{
                    y: [yMinMax.min - 0.5, yMinMax.max + 0.5],
                    x: xDomain,
                  }}
                  containerComponent={
                    <VictoryVoronoiContainer
                      voronoiDimension="x"
                      onActivated={handleActivated}
                      onDeactivated={handleDeactivated}
                      labels={() => ''}
                    />
                  }
                >
                  <VictoryAxis
                    tickCount={4}
                    // ✅ troca mês por dd/mm quando o span for curto
                    tickFormat={(t) => {
                      const spanMs = xDomain[1].getTime() - xDomain[0].getTime();
                      const fortyFiveDays = 45 * 24 * 3600 * 1000;
                      return spanMs <= fortyFiveDays ? formatDayMonthBR(t) : formatMonthShortBR(t);
                    }}
                    style={{
                      tickLabels: { fontSize: 10, padding: 10, fill: '#6B7280', fontWeight: '700' },
                      axis: { stroke: '#E5E7EB' },
                      grid: { stroke: '#EEF2F7' },
                    }}
                  />

                  <VictoryAxis
                    dependentAxis
                    tickValues={yTickValues}
                    tickFormat={formatYTick}
                    style={{
                      tickLabels: { fontSize: 10, padding: 8, fill: '#6B7280', fontWeight: '700' },
                      axis: { stroke: 'transparent' },
                      grid: { stroke: '#E5E7EB' },
                    }}
                  />

                  {seriesWithData.slice(0, 3).map((s) => (
                    <VictoryGroup key={s.key}>
                      <VictoryLine
                        name={`line-${s.key}`}
                        data={s.data}
                        interpolation="linear"
                        animate={{
                          duration: 550,
                          easing: 'quadInOut',
                          onLoad: { duration: 550 },
                        }}
                        style={{ data: { stroke: s.color.stroke, strokeWidth: 3 } }}
                      />
                      <VictoryScatter
                        data={s.data}
                        size={4}
                        style={{ data: { fill: s.color.point, stroke: '#fff', strokeWidth: 2 } }}
                      />
                    </VictoryGroup>
                  ))}

                  {seriesWithData.length === 1 && seriesWithData[0]?.last ? (
                    <VictoryLabel
                      x={90}
                      y={30}
                      textAnchor="start"
                      style={{ fontSize: 11, fontWeight: '700', fill: '#6b7280' }}
                      text={`${formatYTick(seriesWithData[0].last.y)} cm`}
                    />
                  ) : null}
                </VictoryChart>
              </>
            ) : (
              <View style={styles.emptyChart}>
                <Ionicons name="analytics-outline" size={18} color="#9AA4B2" />
                <Text style={styles.emptyChartTitle}>Sem histórico nesse período</Text>
                <Text style={styles.emptyChartText}>
                  Mude o filtro (semana/mês/ano) ou registre novas medidas.
                </Text>
              </View>
            )}
          </View>

          {/* Registros */}
          <View style={styles.historyBox}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Registros</Text>
              <Text style={styles.helperText}>
                {historyDesc.length ? `${Math.min(historyList.length, historyDesc.length)} de ${historyDesc.length}` : '0'}
              </Text>
            </View>

            {historyList.length ? (
              historyList.map((row, idx) => {
                const dateTxt = formatDateBR(row?.createdAt || row?.updatedAt);
                const prev = historyList[idx + 1];

                return (
                  <View key={row?.id || row?.createdAt || idx} style={styles.historyCard}>
                    <Text style={styles.historyDate}>{dateTxt || '—'}</Text>

                    <View style={{ marginTop: 8 }}>
                      {selectedMeasureKeys.slice(0, 3).map((k, i) => {
                        const v = Number(row?.[k]);
                        if (!Number.isFinite(v) || isOutlier(k, v)) return null;

                        const pv = prev ? Number(prev?.[k]) : NaN;
                        const diff = Number.isFinite(pv) && !isOutlier(k, pv) ? v - pv : null;

                        const diffTxt = diff === null ? '' : `  (${diff > 0 ? '+' : ''}${diff.toFixed(1)} cm)`;

                        return (
                          <View key={`${k}-${i}`} style={styles.historyLine}>
                            <View style={[styles.historyDot, { backgroundColor: palette[i]?.stroke || '#2563eb' }]} />
                            <Text style={styles.historyLabel}>{labelByKey[k] || k}</Text>
                            <Text style={styles.historyValue}>
                              {v.toFixed(1)} cm
                              <Text
                                style={{
                                  color: diff === null ? '#9AA4B2' : diff > 0 ? '#DC2626' : '#16A34A',
                                  fontWeight: '900',
                                }}
                              >
                                {diffTxt}
                              </Text>
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyHistory}>
                <Ionicons name="time-outline" size={18} color="#9AA4B2" />
                <Text style={styles.emptyChartTitle}>Sem registros nesse período</Text>
                <Text style={styles.emptyChartText}>Tente “Mês” ou “Ano”.</Text>
              </View>
            )}

            {historyDesc.length > 3 ? (
              <View style={styles.historyActionsRow}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  activeOpacity={0.9}
                  onPress={() => setShowMoreHistory((v) => !v)}
                >
                  <Ionicons name={showMoreHistory ? 'chevron-up' : 'chevron-down'} size={18} color="#111827" />
                  <Text style={styles.actionBtnText}>{showMoreHistory ? 'Ver menos' : 'Ver mais'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSecondary]}
                  activeOpacity={0.9}
                  onPress={() => setPeriodSheetOpen(true)}
                >
                  <Ionicons name="options-outline" size={18} color="#111827" />
                  <Text style={styles.actionBtnText}>Filtrar por período</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* ✅ botão fixo fora do ScrollView (melhor pro Android) */}
      <View style={[styles.bottomBar, { bottom: bottomOffset }]}>
        <TouchableOpacity style={styles.bigButton} onPress={openRegisterModal} activeOpacity={0.9}>
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.bigButtonText}> Registrar medidas corporais</Text>
        </TouchableOpacity>
      </View>

      {/* Sheet: Medidas */}
      <BottomSheet
        visible={measureSheetOpen}
        title="Escolher medidas (até 3)"
        onClose={() => setMeasureSheetOpen(false)}
        height={620}
      >
        <View style={styles.sheetHintRow}>
          <Text style={styles.sheetHintText}>
            Selecionadas: <Text style={{ color: '#111827' }}>{Math.min(3, selectedMeasureKeys.length)}/3</Text>
          </Text>

          <TouchableOpacity
            onPress={() => setSelectedMeasureKeys(['waist'])}
            activeOpacity={0.9}
            style={styles.clearBtn}
          >
            <Text style={styles.clearBtnText}>Limpar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
          {MEASUREMENT_GROUPS.map((group) => (
            <View key={group.key} style={{ marginBottom: 14 }}>
              <Text style={styles.groupTitle}>{group.title}</Text>

              {group.items.map((it) => {
                const active = selectedMeasureKeys.includes(it.key);
                return (
                  <TouchableOpacity
                    key={it.key}
                    style={[styles.sheetItem, active && styles.sheetItemDark]}
                    activeOpacity={0.9}
                    onPress={() => toggleMeasureKey(it.key)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[styles.checkDot, active && styles.checkDotActive]} />
                      <Text style={[styles.sheetItemText, active && styles.sheetItemTextDark]}>{it.label}</Text>
                    </View>

                    {active ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.confirmBtn, { marginTop: 12 }]}
          onPress={() => setMeasureSheetOpen(false)}
          activeOpacity={0.9}
        >
          <Text style={styles.confirmText}>confirmar</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* Sheet: Período */}
      <BottomSheet
        visible={periodSheetOpen}
        title="Escolher período"
        onClose={() => setPeriodSheetOpen(false)}
        height={420}
      >
        {[
          { k: 'week', label: 'Semana' },
          { k: 'month', label: 'Mês' },
          { k: 'year', label: 'Ano' },
          { k: 'custom', label: 'Personalizado' },
        ].map((p) => {
          const active = periodPreset === p.k;
          return (
            <TouchableOpacity
              key={p.k}
              style={[styles.sheetItem, active && styles.sheetItemActive]}
              activeOpacity={0.9}
              onPress={() => {
                setShowMoreHistory(false);
                if (p.k === 'custom') {
                  if (!customFrom) setCustomFrom(toISODateOnly(new Date(Date.now() - 30 * 24 * 3600 * 1000)));
                  if (!customTo) setCustomTo(toISODateOnly(new Date()));
                  setPeriodSheetOpen(false);
                  setCustomOpen(true);
                  return;
                }
                setPeriodPreset(p.k);
                setPeriodSheetOpen(false);
              }}
            >
              <Text style={[styles.sheetItemText, active && styles.sheetItemTextActive]}>{p.label}</Text>
              {active ? <Ionicons name="checkmark" size={18} color="#2563eb" /> : null}
            </TouchableOpacity>
          );
        })}
      </BottomSheet>

      {/* Modal: datas personalizadas */}
      <Modal visible={customOpen} transparent animationType="fade" onRequestClose={() => setCustomOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setCustomOpen(false)} />
          <View style={styles.customSheet}>
            <View style={styles.sheetTopRow}>
              <Text style={styles.sheetDate}>Período personalizado</Text>
              <TouchableOpacity onPress={() => setCustomOpen(false)} style={styles.sheetClose}>
                <Ionicons name="close" size={18} color="#111827" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.sheetTitle, { marginTop: 8 }]}>Defina as datas (YYYY-MM-DD)</Text>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.inputLabel}>De</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={customFrom}
                  onChangeText={setCustomFrom}
                  placeholder="2026-01-01"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={{ marginTop: 10 }}>
              <Text style={styles.inputLabel}>Até</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={customTo}
                  onChangeText={setCustomTo}
                  placeholder="2026-01-13"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={applyCustomRange} activeOpacity={0.9}>
              <Text style={styles.confirmText}>aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal principal (registro) */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setModalOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetTopRow}>
              <Text style={styles.sheetDate}>{sheetDate}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={styles.sheetClose}>
                <Ionicons name="close" size={18} color="#111827" />
              </TouchableOpacity>
            </View>

            {selectedKey ? (
              <>
                <Text style={styles.sheetTitle}>Adicionar {selectedItem?.label?.toLowerCase?.() || 'medida'}</Text>

                <View style={styles.sheetValueRow}>
                  <TextInput
                    ref={liveValueInputRef}
                    editable={false}
                    value={liveValueText}
                    style={styles.sheetValueInput}
                  />
                  <Text style={styles.sheetUnit}>cm</Text>
                </View>

                <View style={styles.sheetControlsRow}>
                  <TouchableOpacity
                    style={[styles.modeIconBtn, inputMode === 'keyboard' && styles.modeIconBtnActive]}
                    onPress={() => setInputMode('keyboard')}
                  >
                    <Ionicons
                      name="keypad-outline"
                      size={18}
                      color={inputMode === 'keyboard' ? '#2F6BFF' : '#9AA4B2'}
                    />
                  </TouchableOpacity>
                </View>

                {inputMode === 'keyboard' ? (
                  <View style={{ marginTop: 10 }}>
                    <View style={styles.keyboardInputWrap}>
                      <TextInput
                        value={draft[selectedKey] ?? ''}
                        onChangeText={(t) => {
                          setDraft((prev) => ({ ...prev, [selectedKey]: t }));
                          const n = toNumberOrNull(t);
                          if (Number.isFinite(n)) setLiveValue(n);
                        }}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        style={styles.keyboardInput}
                      />
                      <Text style={styles.keyboardUnit}>cm</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.switchToRulerBtn}
                      onPress={() => setInputMode('ruler')}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="swap-horizontal-outline" size={16} color="#2F6BFF" />
                      <Text style={styles.switchToRulerText}>Usar régua</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ marginTop: 2 }}>
                    {(() => {
                      const range = getMeasureRange(selectedKey);
                      const current = toNumberOrNull(draft[selectedKey]);
                      const safe =
                        Number.isFinite(current) ? current : Number.isFinite(liveValue) ? liveValue : range.min;

                      return (
                        <RulerDrag
                          value={Number.isFinite(liveValue) ? liveValue : safe}
                          min={range.min}
                          max={range.max}
                          step={range.step}
                          pxPerStep={8}
                          majorEvery={1}
                          onLiveChange={(v) => setLiveValueFast(v)}
                          onCommit={(v) => {
                            commitLiveValue(v);
                            setDraft((prev) => ({ ...prev, [selectedKey]: String(Number(v).toFixed(1)) }));
                          }}
                        />
                      );
                    })()}

                    <TouchableOpacity
                      style={[styles.switchToRulerBtn, { marginTop: 10 }]}
                      onPress={() => setInputMode('keyboard')}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="keypad-outline" size={16} color="#2F6BFF" />
                      <Text style={styles.switchToRulerText}>Digitar valor</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.confirmBtn, saving && { opacity: 0.7 }]}
                  onPress={saveMeasurements}
                  disabled={saving}
                  activeOpacity={0.9}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmText}>confirmar</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>Registrar medidas</Text>

                <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                  {MEASUREMENT_ITEMS.map((it) => (
                    <View key={it.key} style={styles.inputRow}>
                      <Text style={styles.inputLabel}>{it.label}</Text>
                      <View style={styles.inputWrap}>
                        <TextInput
                          value={draft[it.key] ?? ''}
                          onChangeText={(t) => setDraft((prev) => ({ ...prev, [it.key]: t }))}
                          placeholder="0"
                          keyboardType="decimal-pad"
                          style={styles.input}
                        />
                        <Text style={styles.unit}>{it.unit}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.confirmBtn, saving && { opacity: 0.7 }]}
                  onPress={saveMeasurements}
                  disabled={saving}
                  activeOpacity={0.9}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmText}>confirmar</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FB' },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: '#6b7280', fontWeight: '800' },

  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F7FB',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 2, fontSize: 12, color: '#6b7280', fontWeight: '700' },

  scroll: { paddingHorizontal: 16, paddingBottom: 24 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginTop: 6 },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { fontSize: 13, fontWeight: '700', color: '#111827', flex: 1, paddingRight: 10 },

  plusCircle: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  okCircle: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: 'rgba(39, 174, 96, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardBottom: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardValue: { fontSize: 12, color: '#6b7280', fontWeight: '700' },

  section: { marginTop: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 10 },
  helperText: { color: '#9AA4B2', fontWeight: '900' },

  selectRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  selectBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectLabel: { fontSize: 10, color: '#9AA4B2', fontWeight: '900' },
  selectValue: { fontSize: 12, color: '#111827', fontWeight: '900', marginTop: 2 },
  selectRight: { fontSize: 11, fontWeight: '900', color: '#9AA4B2' },

  chartBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    overflow: 'hidden',
  },

  emptyChart: { alignItems: 'center', justifyContent: 'center', paddingVertical: 18 },
  emptyChartTitle: { marginTop: 6, fontWeight: '900', color: '#111827' },
  emptyChartText: { marginTop: 4, color: '#9AA4B2', fontWeight: '800', fontSize: 12, textAlign: 'center' },

  compareBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    marginBottom: 10,
  },
  compareTitle: { fontWeight: '900', color: '#111827', fontSize: 12 },
  compareLine: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  compareLabel: { flex: 1, fontWeight: '800', color: '#374151', fontSize: 12 },
  compareValue: { fontWeight: '900', color: '#111827', fontSize: 12 },

  outlierNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  outlierText: { color: '#9AA4B2', fontWeight: '800', fontSize: 12 },

  missingNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  missingText: { color: '#9AA4B2', fontWeight: '800', fontSize: 12, flex: 1 },

  hoverBox: { backgroundColor: '#111827', borderRadius: 14, padding: 12, marginBottom: 10 },
  hoverDate: { color: '#fff', fontWeight: '900', fontSize: 12, opacity: 0.9 },
  hoverLine: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  hoverLabel: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 12, opacity: 0.95 },
  hoverValue: { color: '#fff', fontWeight: '900', fontSize: 12 },

  historyBox: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  historyCard: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  historyDate: { fontWeight: '900', color: '#111827', fontSize: 12 },
  historyLine: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  historyDot: { width: 10, height: 10, borderRadius: 999, marginRight: 8 },
  historyLabel: { flex: 1, fontWeight: '800', color: '#374151', fontSize: 12 },
  historyValue: { fontWeight: '900', color: '#111827', fontSize: 12 },
  emptyHistory: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },

  historyActionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  actionBtnText: { fontWeight: '900', color: '#111827' },

  bigButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#4A90E2',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    flexDirection: 'row',
    gap: 8,
  },
  bigButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 22 : 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  customSheet: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 22 : 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  sheetTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetDate: { color: '#111827', fontWeight: '800' },
  sheetClose: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: { marginTop: 10, fontSize: 14, fontWeight: '900', color: '#111827' },

  sheetItem: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetItemActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
    borderColor: 'rgba(37, 99, 235, 0.18)',
  },
  sheetItemDark: { backgroundColor: '#111827', borderColor: '#111827' },
  sheetItemText: { fontWeight: '900', color: '#111827' },
  sheetItemTextActive: { color: '#2563eb' },
  sheetItemTextDark: { color: '#fff' },

  sheetHintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sheetHintText: { color: '#6B7280', fontWeight: '900', fontSize: 12 },
  clearBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#F3F4F6', borderRadius: 999 },
  clearBtnText: { fontWeight: '900', color: '#111827', fontSize: 12 },

  checkDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: '#111827', opacity: 0.2 },
  checkDotActive: { opacity: 1, backgroundColor: '#fff' },

  sheetValueRow: { marginTop: 8, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  sheetUnit: { fontSize: 14, fontWeight: '900', color: '#2F6BFF', opacity: 0.7 },

  sheetControlsRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'flex-start' },
  modeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconBtnActive: { backgroundColor: 'rgba(47,107,255,0.10)' },

  confirmBtn: {
    marginTop: 12,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#5A61FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '900', textTransform: 'lowercase' },

  keyboardInputWrap: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyboardInput: { flex: 1, fontWeight: '900', color: '#111827', fontSize: 18 },
  keyboardUnit: { fontWeight: '900', color: '#6b7280' },

  switchToRulerBtn: {
    marginTop: 10,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(47,107,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  switchToRulerText: { fontWeight: '900', color: '#2F6BFF' },

  inputRow: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '800', color: '#111827', marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  input: { flex: 1, fontWeight: '800', color: '#111827' },
  unit: { color: '#6b7280', fontWeight: '800' },

  rulerPointerWrap: {
    position: 'absolute',
    left: '50%',
    top: 4,
    transform: [{ translateX: -9 }],
    zIndex: 20,
  },
  rulerTrackDrag: {
    marginTop: 8,
    height: 92,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  rulerCenterLineDrag: {
    position: 'absolute',
    left: '50%',
    top: 22,
    width: 2,
    height: 52,
    backgroundColor: 'rgba(47,107,255,0.25)',
    borderRadius: 999,
    transform: [{ translateX: -1 }],
    zIndex: 10,
  },
  rulerTicksLayer: { position: 'absolute', left: 0, right: 0, top: 24, height: 60 },
  rulerTickAbs: { position: 'absolute', bottom: 0, width: 1, alignItems: 'center' },
  rulerTickMinor: { height: 18, backgroundColor: 'rgba(17,24,39,0.25)' },
  rulerTickMajor: { height: 32, backgroundColor: 'rgba(17,24,39,0.45)' },
  rulerLabelAbs: { position: 'absolute', top: -18, fontSize: 10, fontWeight: '900', color: '#9AA4B2' },

  sheetValueInput: {
    fontSize: 46,
    fontWeight: '900',
    color: '#2F6BFF',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },

  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'transparent',
  },

  groupTitle: { fontWeight: '900', color: '#6B7280', marginBottom: 8, marginTop: 4 },
});
