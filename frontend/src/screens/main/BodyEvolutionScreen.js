// BodyEvolutionScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import api from '../../api/axios';

import {
  interpretIMC,
  interpretVisceralFat,
  interpretBodyFatPercent,
  measurementQuality,
} from '../../domain/interpretation';

const { width } = Dimensions.get('window');

// paddings do layout
const SCREEN_PADDING = 16; // paddingHorizontal do conteúdo
const CARD_PADDING = 14; // padding do chartCard
const CHART_HEIGHT = 220;

// largura do gráfico pra NÃO vazar
const CHART_WIDTH = width - SCREEN_PADDING * 2 - CARD_PADDING * 2;

const formatDateShort = (dateStr) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return '';
  }
};

const formatDateTime = (dateStr) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// métricas (camelCase + snake_case)
const METRICS = [
  {
    key: 'bmi',
    label: 'IMC',
    icon: 'body-outline',
    unit: '',
    getter: (m) => toNumber(m.bmi ?? m.imc),
    decimals: 1,
  },
  {
    key: 'visceralFat',
    label: 'Gordura Visceral',
    icon: 'alert-circle-outline',
    unit: '',
    getter: (m) => toNumber(m.visceralFat ?? m.visceral_fat ?? m.vat),
    decimals: 0,
  },
  {
    key: 'bodyFat',
    label: 'Gordura Corporal',
    icon: 'water-outline',
    unit: '%',
    getter: (m) => toNumber(m.bodyFat ?? m.body_fat ?? m.body_fat_percent),
    decimals: 1,
  },
  {
    key: 'muscleMass',
    label: 'Massa Muscular',
    icon: 'fitness-outline',
    unit: '%',
    getter: (m) =>
      toNumber(
        m.muscleMass ??
          m.muscle_mass ??
          m.skeletalMusclePercent ??
          m.skeletal_muscle_percent
      ),
    decimals: 1,
  },
  {
    key: 'bodyWater',
    label: 'Água Corporal',
    icon: 'leaf-outline',
    unit: '%',
    getter: (m) =>
      toNumber(m.bodyWater ?? m.body_water ?? m.waterPercent ?? m.water_percent),
    decimals: 1,
  },
  {
    key: 'weight',
    label: 'Peso',
    icon: 'scale-outline',
    unit: 'kg',
    getter: (m) => toNumber(m.weight ?? m.peso),
    decimals: 1,
  },
];

function Chip({ active, label, icon, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={active ? '#fff' : '#2F6FED'}
        style={{ marginRight: 6 }}
      />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StatBox({ title, value, subtitle, color }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color: color || '#111827' }]}>
        {value}
      </Text>
      {!!subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function InfoCard({ title, badge, badgeColor, text }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoCardHeader}>
        <Text style={styles.infoCardTitle}>{title}</Text>
        {!!badge && (
          <View
            style={[
              styles.infoBadge,
              { backgroundColor: `${badgeColor || '#2F6FED'}22` },
            ]}
          >
            <Text style={[styles.infoBadgeText, { color: badgeColor || '#2F6FED' }]}>
              {badge}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.infoCardText}>{text || '—'}</Text>
    </View>
  );
}

/**
 * Cartão “Interpretação detalhada” estilo Stitch
 */
function DetailedInterpretationCard({ interpretation }) {
  if (!interpretation) return null;

  const color = interpretation?.color || '#22C55E';
  const label = interpretation?.label || 'Saudável';

  // Texto detalhado (se você quiser deixar 100% dinâmico por métrica,
  // pode mover isso pro domain/interpretation depois)
  const title =
    label === 'Normal' ? 'Peso Normal' : label;

  const body =
    interpretation?.note ||
    'Acompanhe sua evolução e mantenha consistência de horários para medições mais comparáveis.';

  const tip =
    label === 'Normal' || label === 'Ok' || label === 'Confiável'
      ? 'Dica: mantenha rotina ativa e alimentação equilibrada para preservar seus resultados.'
      : 'Dica: ajuste hábitos aos poucos e acompanhe a evolução com consistência.';

  return (
    <View style={[styles.detailCard, { borderColor: `${color}33` }]}>
      <View style={styles.detailTopRow}>
        <View style={[styles.detailIconCircle, { backgroundColor: `${color}22` }]}>
          <Ionicons name="checkmark" size={22} color={color} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.detailTitleRow}>
            <Text style={styles.detailTitle}>{title}</Text>
            <View style={[styles.detailPill, { backgroundColor: `${color}22` }]}>
              <Text style={[styles.detailPillText, { color }]}>{label}</Text>
            </View>
          </View>

          <Text style={styles.detailText}>{body}</Text>

          <View style={styles.detailTipRow}>
            <Ionicons name="bulb-outline" size={16} color={color} />
            <Text style={[styles.detailTipText, { color }]}>{tip}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ====== REFERÊNCIAS (para todas métricas) ======
function getReferenceRanges(metricKey, ctx = {}) {
  const sex = (ctx.sex || '').toString().trim().toLowerCase();
  const age = Number(ctx.age);

  const make = (title, desc, tag, color) => ({ title, desc, tag, color });

  if (metricKey === 'bmi') {
    return {
      title: 'Faixas de referência (OMS)',
      pill: 'Padrão geral',
      rows: [
        make(
          'Abaixo do Peso',
          'Pode indicar necessidade de suporte nutricional.',
          'Menor que 18,5',
          '#3B82F6'
        ),
        make(
          'Peso Normal',
          'Faixa de menor risco para a saúde. Objetivo ideal.',
          '18,5 – 24,9',
          '#22C55E'
        ),
        make(
          'Sobrepeso',
          'Alerta para aumento de riscos cardiometabólicos.',
          '25,0 – 29,9',
          '#F59E0B'
        ),
        make(
          'Obesidade',
          'Requer acompanhamento profissional e mudanças de hábito.',
          '30,0 ou mais',
          '#EF4444'
        ),
      ],
    };
  }

  if (metricKey === 'visceralFat') {
    return {
      title: 'Faixas de referência (Gordura Visceral)',
      pill: 'Manual típico',
      rows: [
        make(
          'Normal',
          'Nível associado a menor risco cardiometabólico.',
          'Até 9',
          '#22C55E'
        ),
        make(
          'Alto',
          'Pode elevar risco metabólico. Ajustes de rotina ajudam.',
          '10 – 14',
          '#F59E0B'
        ),
        make(
          'Muito alto',
          'Recomendável acompanhamento profissional.',
          '15 ou mais',
          '#EF4444'
        ),
      ],
    };
  }

  if (metricKey === 'bodyFat') {
    const hasSex =
      ['m', 'masc', 'masculino', 'male', 'homem'].some((x) => sex.includes(x)) ||
      ['f', 'fem', 'feminino', 'female', 'mulher'].some((x) => sex.includes(x));
    const hasAge = Number.isFinite(age);

    if (!hasSex || !hasAge) {
      return {
        title: 'Faixas de referência (Gordura Corporal)',
        pill: 'Por sexo/idade',
        rows: [
          make(
            'Precisa de dados do perfil',
            'Para mostrar faixas com precisão, informe sexo e idade no seu perfil.',
            'Atualize seu perfil',
            '#3B82F6'
          ),
        ],
      };
    }

    const isFemale = ['f', 'fem', 'feminino', 'female', 'mulher'].some((x) =>
      sex.includes(x)
    );
    const bucket = age < 40 ? '20–39' : age < 60 ? '40–59' : '60–79';

    const female = {
      '20–39': [
        make('Baixo', 'Abaixo do esperado para sexo/idade.', 'Até 20,9%', '#3B82F6'),
        make('Normal', 'Faixa esperada para sexo/idade.', '21,0 – 32,9%', '#22C55E'),
        make('Alto', 'Acima do ideal; pode impactar saúde/metas.', '33,0 – 38,9%', '#F59E0B'),
        make('Muito alto', 'Muito acima do ideal; avalie com profissional.', '39,0% ou mais', '#EF4444'),
      ],
      '40–59': [
        make('Baixo', 'Abaixo do esperado para sexo/idade.', 'Até 22,9%', '#3B82F6'),
        make('Normal', 'Faixa esperada para sexo/idade.', '23,0 – 33,9%', '#22C55E'),
        make('Alto', 'Acima do ideal; pode impactar saúde/metas.', '34,0 – 39,9%', '#F59E0B'),
        make('Muito alto', 'Muito acima do ideal; avalie com profissional.', '40,0% ou mais', '#EF4444'),
      ],
      '60–79': [
        make('Baixo', 'Abaixo do esperado para sexo/idade.', 'Até 23,9%', '#3B82F6'),
        make('Normal', 'Faixa esperada para sexo/idade.', '24,0 – 34,9%', '#22C55E'),
        make('Alto', 'Acima do ideal; pode impactar saúde/metas.', '35,0 – 40,9%', '#F59E0B'),
        make('Muito alto', 'Muito acima do ideal; avalie com profissional.', '41,0% ou mais', '#EF4444'),
      ],
    };

    const male = {
      '20–39': [
        make('Baixo', 'Abaixo do esperado para sexo/idade.', 'Até 7,9%', '#3B82F6'),
        make('Normal', 'Faixa esperada para sexo/idade.', '8,0 – 19,9%', '#22C55E'),
        make('Alto', 'Acima do ideal; pode impactar saúde/metas.', '20,0 – 24,9%', '#F59E0B'),
        make('Muito alto', 'Muito acima do ideal; avalie com profissional.', '25,0% ou mais', '#EF4444'),
      ],
      '40–59': [
        make('Baixo', 'Abaixo do esperado para sexo/idade.', 'Até 10,9%', '#3B82F6'),
        make('Normal', 'Faixa esperada para sexo/idade.', '11,0 – 21,9%', '#22C55E'),
        make('Alto', 'Acima do ideal; pode impactar saúde/metas.', '22,0 – 27,9%', '#F59E0B'),
        make('Muito alto', 'Muito acima do ideal; avalie com profissional.', '28,0% ou mais', '#EF4444'),
      ],
      '60–79': [
        make('Baixo', 'Abaixo do esperado para sexo/idade.', 'Até 12,9%', '#3B82F6'),
        make('Normal', 'Faixa esperada para sexo/idade.', '13,0 – 24,9%', '#22C55E'),
        make('Alto', 'Acima do ideal; pode impactar saúde/metas.', '25,0 – 29,9%', '#F59E0B'),
        make('Muito alto', 'Muito acima do ideal; avalie com profissional.', '30,0% ou mais', '#EF4444'),
      ],
    };

    return {
      title: 'Faixas de referência (Gordura Corporal)',
      pill: `Sexo/idade (${bucket})`,
      rows: (isFemale ? female : male)[bucket],
    };
  }

  if (metricKey === 'muscleMass') {
    return {
      title: 'Faixas de referência (Massa Muscular)',
      pill: 'Geral',
      rows: [
        make(
          'Baixa',
          'Pode indicar baixa reserva muscular. Foque em força e proteína.',
          'Abaixo do recomendado',
          '#F59E0B'
        ),
        make(
          'Adequada',
          'Boa base para saúde, metabolismo e performance.',
          'Faixa adequada',
          '#22C55E'
        ),
        make(
          'Alta',
          'Boa composição para performance (depende do biotipo).',
          'Acima da média',
          '#3B82F6'
        ),
      ],
    };
  }

  if (metricKey === 'bodyWater') {
    return {
      title: 'Faixas de referência (Água Corporal)',
      pill: 'Geral',
      rows: [
        make(
          'Baixa',
          'Pode refletir hidratação insuficiente (ou variação do dia).',
          'Abaixo do ideal',
          '#F59E0B'
        ),
        make(
          'Adequada',
          'Faixa coerente com boa hidratação no dia a dia.',
          'Faixa adequada',
          '#22C55E'
        ),
        make(
          'Alta',
          'Pode variar por biotipo, retenção ou horário da medição.',
          'Acima do esperado',
          '#3B82F6'
        ),
      ],
    };
  }

  if (metricKey === 'weight') {
    return {
      title: 'Referência (Peso)',
      pill: 'Contexto',
      rows: [
        make(
          'Peso isolado não define saúde',
          'O ideal é interpretar junto com IMC, gordura e massa muscular.',
          'Veja tendência',
          '#3B82F6'
        ),
        make(
          'O que importa é a evolução',
          'Compare medições no mesmo horário e observe a direção da curva.',
          'Consistência',
          '#22C55E'
        ),
      ],
    };
  }

  return null;
}

function ReferenceRanges({ metricKey, ctx }) {
  const ref = getReferenceRanges(metricKey, ctx);
  if (!ref) return null;

  return (
    <View style={styles.rangesWrap}>
      <View style={styles.rangesHeader}>
        <Text style={styles.rangesTitle}>{ref.title}</Text>
        <View style={styles.rangesPill}>
          <Text style={styles.rangesPillText}>{ref.pill}</Text>
        </View>
      </View>

      <View style={styles.rangeList}>
        {ref.rows.map((r, idx) => {
          const highlight =
            r.title.toLowerCase().includes('adequada') ||
            r.title.toLowerCase().includes('normal') ||
            r.title.toLowerCase().includes('confi');
          return (
            <View
              key={`${metricKey}-${idx}`}
              style={[
                styles.rangeRow,
                { borderLeftColor: r.color },
                highlight ? { backgroundColor: `${r.color}14` } : null,
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rangeName}>{r.title}</Text>
                <Text style={styles.rangeDesc}>{r.desc}</Text>
              </View>

              <View style={[styles.rangeTag, { backgroundColor: `${r.color}22` }]}>
                <Text style={[styles.rangeTagText, { color: r.color }]}>{r.tag}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function BodyEvolutionScreen({ route }) {
  const initialMetric = route?.params?.initialMetric || 'bmi';
  const insets = useSafeAreaInsets();

  const [selectedKey, setSelectedKey] = useState(initialMetric);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  // tooltip: somente valor
  const [tooltip, setTooltip] = useState(null); // { left, top, text }

  // ✅ “ver interpretação detalhada”
  const [showDetails, setShowDetails] = useState(false);

  const selectedMetric = useMemo(
    () => METRICS.find((m) => m.key === selectedKey) || METRICS[0],
    [selectedKey]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const res = await api.get('/weight/latest?limit=200');
      const list = res?.data?.data ?? res?.data ?? [];
      const arr = Array.isArray(list) ? list : [];

      const sorted = [...arr].sort((a, b) => {
        const da = new Date(a.timestamp || a.createdAt || a.date || 0).getTime();
        const db = new Date(b.timestamp || b.createdAt || b.date || 0).getTime();
        return da - db;
      });

      setData(sorted);
      setLastUpdatedAt(new Date().toISOString());
    } catch (e) {
      console.error('❌ erro ao carregar métricas:', e?.response?.data || e.message);
      Alert.alert('Erro', 'Não foi possível carregar seus dados.');
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const series = useMemo(() => {
    const points = data
      .map((m) => {
        const x = m.timestamp || m.createdAt || m.date;
        const y = selectedMetric.getter(m);
        return { x, y, raw: m };
      })
      .filter((p) => p.y != null && p.x);

    return points;
  }, [data, selectedMetric]);

  const lastMeasurementAt = useMemo(() => {
    if (!data?.length) return null;
    const last = data[data.length - 1];
    return last?.timestamp || last?.createdAt || null;
  }, [data]);

  const stats = useMemo(() => {
    if (!series.length) return null;
    const values = series.map((p) => p.y);
    const last = values[values.length - 1];
    const first = values[0];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const change = last - first;
    return { last, first, min, max, avg, change };
  }, [series]);

  const chart = useMemo(() => {
    if (!series.length) return null;

    const step = Math.ceil(series.length / 10);
    const labels = series.map((p, idx) => (idx % step === 0 ? formatDateShort(p.x) : ''));
    const values = series.map((p) => p.y);

    return { labels, values };
  }, [series]);

  const fmt = useCallback(
    (n) => {
      if (n == null) return '--';
      return Number(n).toFixed(selectedMetric.decimals).replace('.', ',');
    },
    [selectedMetric.decimals]
  );

  const valueOnlyText = useCallback(
    (v) => `${fmt(v)}${selectedMetric.unit ? ` ${selectedMetric.unit}` : ''}`,
    [fmt, selectedMetric.unit]
  );

  useEffect(() => {
    setTooltip(null);
  }, [selectedKey]);

  // ✅ quando troca de métrica: fecha detalhes (pra UX ficar limpa)
  useEffect(() => {
    setShowDetails(false);
  }, [selectedKey]);

  const interpretation = useMemo(() => {
    if (!series.length) return null;
    const lastValue = stats?.last;
    if (lastValue == null) return null;

    if (selectedKey === 'bmi') return interpretIMC(lastValue);
    if (selectedKey === 'visceralFat') return interpretVisceralFat(lastValue);

    if (selectedKey === 'bodyFat') {
      const lastRaw = data?.[data.length - 1] || {};
      const sex = lastRaw.sex ?? lastRaw.gender ?? lastRaw.sexo;
      const age = lastRaw.age ?? lastRaw.idade;
      return interpretBodyFatPercent(lastValue, sex, age);
    }

    // para muscleMass / bodyWater / weight (por enquanto)
    // (depois dá pra criar interpretadores específicos)
    return {
      level: 'info',
      label: 'Acompanhe',
      color: '#2F6FED',
      note: 'Observe a tendência ao longo do tempo e compare medições em horários semelhantes.',
    };
  }, [selectedKey, series.length, stats?.last, data]);

  const quality = useMemo(() => {
    if (!data?.length) return null;
    const last = data[data.length - 1];
    const prev = data.length >= 2 ? data[data.length - 2] : null;

    const lastTs = last?.timestamp || last?.createdAt || null;
    const prevTs = prev?.timestamp || prev?.createdAt || null;

    return measurementQuality(lastTs, prevTs);
  }, [data]);

  // toque “área grande” → pega ponto mais próximo
  const handleChartTap = useCallback(
    (evt) => {
      if (!chart?.values?.length) return;

      const n = chart.values.length;
      const { locationX, locationY } = evt.nativeEvent;

      const leftPad = 34;
      const rightPad = 16;
      const usableW = Math.max(1, CHART_WIDTH - leftPad - rightPad);

      const xClamped = Math.max(leftPad, Math.min(locationX, CHART_WIDTH - rightPad));
      const ratio = (xClamped - leftPad) / usableW;
      const idx = Math.round(ratio * (n - 1));
      const safeIdx = Math.max(0, Math.min(n - 1, idx));

      const value = chart.values[safeIdx];
      const text = valueOnlyText(value);

      const left = Math.max(8, Math.min(locationX - 55, CHART_WIDTH - 120));
      const top = Math.max(8, locationY - 55);

      setTooltip({ left, top, text });
    },
    [chart, valueOnlyText]
  );

  const bottomSafe = (Platform.OS === 'android' ? 18 : 0) + insets.bottom + 24;

  // sexo/idade do último registro (pra referências)
  const ctx = useMemo(() => {
    const last = data?.[data.length - 1] || {};
    return {
      sex: last.sex ?? last.gender ?? last.sexo,
      age: last.age ?? last.idade,
    };
  }, [data]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomSafe }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4A78FF']} />
        }
      >
        {/* ✅ Header mais “vivo” (padrão Home) */}
        <LinearGradient colors={['#4A78FF', '#4A90E2']} style={styles.header}>
          <Text style={styles.headerTitle}>Evolução corporal</Text>
          <Text style={styles.headerSubtitle}>Acompanhe sua bioimpedância por categoria.</Text>

          <Text style={styles.headerMeta}>
            Atualizado em: {lastUpdatedAt ? formatDateTime(lastUpdatedAt) : '--'} • Última medição:{' '}
            {lastMeasurementAt ? formatDateTime(lastMeasurementAt) : '--'}
          </Text>
        </LinearGradient>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {METRICS.map((m) => (
            <Chip
              key={m.key}
              label={m.label}
              icon={m.icon}
              active={m.key === selectedKey}
              onPress={() => setSelectedKey(m.key)}
            />
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4A78FF" />
            <Text style={styles.loadingText}>Carregando gráficos...</Text>
          </View>
        ) : !series.length ? (
          <View style={styles.emptyBox}>
            <Ionicons name="stats-chart-outline" size={70} color="#C7CED9" />
            <Text style={styles.emptyTitle}>Sem dados suficientes</Text>
            <Text style={styles.emptyText}>
              Faça mais medições para ver a evolução de{' '}
              <Text style={{ fontWeight: '800' }}>{selectedMetric.label}</Text>.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View style={styles.chartHeaderLeft}>
                  <View style={styles.chartIconWrap}>
                    <Ionicons name={selectedMetric.icon} size={20} color="#2F6FED" />
                  </View>
                  <View>
                    <Text style={styles.chartTitle}>{selectedMetric.label}</Text>
                    <Text style={styles.chartCaption}>
                      Último:{' '}
                      <Text style={styles.chartCaptionStrong}>
                        {fmt(stats?.last)}
                        {selectedMetric.unit ? ` ${selectedMetric.unit}` : ''}
                      </Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{series.length} pontos</Text>
                </View>
              </View>

              <View style={[styles.chartClip, { width: CHART_WIDTH, height: CHART_HEIGHT }]}>
                <LineChart
                  data={{
                    labels: chart.labels,
                    datasets: [{ data: chart.values }],
                  }}
                  width={CHART_WIDTH}
                  height={CHART_HEIGHT}
                  yAxisSuffix={selectedMetric.unit ? ` ${selectedMetric.unit}` : ''}
                  chartConfig={{
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: selectedMetric.decimals,
                    color: () => '#4A78FF',
                    labelColor: () => 'rgba(17,24,39,0.55)',
                    propsForDots: { r: '3', strokeWidth: '2', stroke: '#4A78FF' },
                  }}
                  bezier
                  style={styles.chartSvgFix}
                  withInnerLines
                  withOuterLines={false}
                  withShadow={false}
                />

                <View
                  style={[styles.tapOverlay, { width: CHART_WIDTH, height: CHART_HEIGHT }]}
                  onStartShouldSetResponder={() => true}
                  onResponderRelease={handleChartTap}
                />

                {tooltip && (
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setTooltip(null)}
                    style={[styles.tooltip, { left: tooltip.left, top: tooltip.top }]}
                  >
                    <Text style={styles.tooltipText}>{tooltip.text}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <InfoCard
              title="Interpretação do resultado"
              badge={interpretation?.label}
              badgeColor={interpretation?.color || '#2F6FED'}
              text={interpretation?.note || '—'}
            />

            {/* ✅ Toggle “Ver interpretação detalhada” para TODAS as métricas */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowDetails((v) => !v)}
              style={styles.detailsToggle}
            >
              <Text style={styles.detailsToggleText}>
                {showDetails ? 'Ocultar detalhes' : 'Ver interpretação detalhada'}
              </Text>
              <Ionicons
                name={showDetails ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#64748B"
              />
            </TouchableOpacity>

            {showDetails && (
              <View style={styles.detailsWrap}>
                <Text style={styles.sectionTitle}>Interpretação detalhada</Text>
                <DetailedInterpretationCard interpretation={interpretation} />

                <ReferenceRanges metricKey={selectedKey} ctx={ctx} />
              </View>
            )}

            <InfoCard
              title="Confiabilidade da medição"
              badge={quality?.label}
              badgeColor={quality?.color || '#2F6FED'}
              text={quality?.note || '—'}
            />

            <View style={styles.statsGrid}>
              <StatBox
                title="Atual"
                value={`${fmt(stats.last)}${selectedMetric.unit ? ` ${selectedMetric.unit}` : ''}`}
                subtitle={`Início: ${fmt(stats.first)}${
                  selectedMetric.unit ? ` ${selectedMetric.unit}` : ''
                }`}
                color="#111827"
              />
              <StatBox
                title="Variação"
                value={`${stats.change >= 0 ? '+' : ''}${fmt(stats.change)}${
                  selectedMetric.unit ? ` ${selectedMetric.unit}` : ''
                }`}
                subtitle={stats.change >= 0 ? 'Subiu no período' : 'Caiu no período'}
                color={stats.change >= 0 ? '#EF4444' : '#22C55E'}
              />
              <StatBox
                title="Média"
                value={`${fmt(stats.avg)}${selectedMetric.unit ? ` ${selectedMetric.unit}` : ''}`}
                subtitle="No período"
              />
              <StatBox
                title="Min / Máx"
                value={`${fmt(stats.min)} • ${fmt(stats.max)}`}
                subtitle={selectedMetric.unit ? selectedMetric.unit : ''}
              />
            </View>

            <Text style={styles.disclaimer}>
              * Valores exibidos dependem do modelo da balança e do método de medição. Para decisões
              clínicas, leve seu relatório ao profissional de saúde.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // base
  container: { flex: 1, backgroundColor: '#EEF3FF' },
  scroll: { flex: 1 },

  // header (mais vivo, padrão Home)
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff' },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 18,
    fontWeight: '600',
  },
  headerMeta: { marginTop: 10, fontSize: 12.5, color: 'rgba(255,255,255,0.86)' },

  // chips
  chipsRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF2FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(47,111,237,0.18)',
  },
  chipActive: { backgroundColor: '#4A78FF', borderColor: '#4A78FF' },
  chipText: { fontSize: 12.5, fontWeight: '800', color: '#2F6FED' },
  chipTextActive: { color: '#fff' },

  // loading/empty
  loadingBox: {
    marginTop: 30,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  loadingText: { marginTop: 10, color: '#64748B', fontWeight: '700' },

  emptyBox: {
    marginTop: 30,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '900', color: '#111827' },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(17,24,39,0.60)',
    textAlign: 'center',
    lineHeight: 18,
  },

  // chart card (mais arredondado, padrão Home)
  chartCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 26,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chartHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chartIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTitle: { fontSize: 15.5, fontWeight: '900', color: '#1F2937' },
  chartCaption: { marginTop: 2, fontSize: 12.5, color: 'rgba(31,41,55,0.62)', fontWeight: '600' },
  chartCaptionStrong: { fontWeight: '900', color: '#111827' },

  badge: {
    backgroundColor: 'rgba(47,111,237,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: '900', color: '#2F6FED' },

  chartClip: {
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: '#fff',
  },
  chartSvgFix: { borderRadius: 18 },
  tapOverlay: { position: 'absolute', left: 0, top: 0, backgroundColor: 'transparent' },

  tooltip: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 9999,
    maxWidth: 160,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  tooltipText: { color: '#fff', fontSize: 12, fontWeight: '900', lineHeight: 16 },

  // info cards (mais arredondado, padrão Home)
  infoCard: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoCardTitle: { fontSize: 14, fontWeight: '900', color: '#111827' },
  // ✅ texto mais “leve” (não parece negrito)
  infoCardText: {
    fontSize: 12.8,
    color: 'rgba(17,24,39,0.62)',
    lineHeight: 18,
    fontWeight: '600',
  },
  infoBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  infoBadgeText: { fontSize: 12, fontWeight: '900' },

  // toggle detalhado
  detailsToggle: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  detailsToggleText: { color: '#2F6FED', fontWeight: '900' },

  detailsWrap: {
    marginTop: 10,
    marginHorizontal: 16,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginLeft: 2,
  },

  // card detalhado estilo Stitch
  detailCard: {
    backgroundColor: '#ECFDF3',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  detailTopRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  detailIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  detailTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  detailPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  detailPillText: { fontWeight: '900', fontSize: 12 },
  detailText: {
    marginTop: 8,
    color: 'rgba(17,24,39,0.70)',
    fontWeight: '600',
    lineHeight: 18,
  },
  detailTipRow: { marginTop: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  detailTipText: { flex: 1, fontWeight: '800', lineHeight: 18 },

  // referências
  rangesWrap: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  rangesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rangesTitle: { fontSize: 14, fontWeight: '900', color: '#111827' },
  rangesPill: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  rangesPillText: { color: '#64748B', fontWeight: '900', fontSize: 12 },

  rangeList: { gap: 10 },
  rangeRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    borderRadius: 18,
    padding: 12,
    borderLeftWidth: 6,
  },
  rangeName: { fontWeight: '900', color: '#111827', marginBottom: 2 },
  rangeDesc: { color: 'rgba(17,24,39,0.62)', fontWeight: '600', lineHeight: 16 },
  rangeTag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  rangeTagText: { fontWeight: '900', fontSize: 12 },

  // stats grid (padrão Home)
  statsGrid: { marginTop: 12, marginHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statBox: {
    width: (width - 16 * 2 - 12) / 2,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  statTitle: { fontSize: 12, fontWeight: '800', color: 'rgba(17,24,39,0.55)' },
  statValue: { marginTop: 6, fontSize: 20, fontWeight: '900' },
  statSubtitle: { marginTop: 6, fontSize: 12, color: 'rgba(17,24,39,0.52)', lineHeight: 16, fontWeight: '600' },

  disclaimer: {
    marginTop: 12,
    marginBottom: 22,
    marginHorizontal: 16,
    fontSize: 11.5,
    color: 'rgba(17,24,39,0.45)',
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '600',
  },
});
