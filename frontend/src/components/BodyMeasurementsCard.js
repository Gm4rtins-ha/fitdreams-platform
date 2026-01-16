import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function formatDelta(delta) {
  if (delta === null || delta === undefined) return null;
  const n = Number(delta);
  if (Number.isNaN(n)) return null;

  // Ex: -2.0 -> "-2,0 cm"
  const abs = Math.abs(n).toFixed(1).replace('.', ',');
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${sign}${abs} cm`;
}

function TrendBadge({ delta }) {
  const n = Number(delta);
  if (delta === null || delta === undefined || Number.isNaN(n)) {
    return <Text style={styles.deltaNeutral}>—</Text>;
  }

  if (n < 0) {
    return (
      <View style={styles.deltaRow}>
        <Ionicons name="arrow-down" size={14} color="#27AE60" />
        <Text style={styles.deltaGood}>{formatDelta(n)}</Text>
      </View>
    );
  }

  if (n > 0) {
    return (
      <View style={styles.deltaRow}>
        <Ionicons name="arrow-up" size={14} color="#F39C12" />
        <Text style={styles.deltaWarn}>{formatDelta(n)}</Text>
      </View>
    );
  }

  return <Text style={styles.deltaNeutral}>0,0 cm</Text>;
}

function formatCm(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `${n.toFixed(1).replace('.', ',')} cm`;
}

/**
 * Props:
 * - data: {
 *    waist, hip, arm, thigh,
 *    deltaWaist, deltaHip, deltaArm, deltaThigh,
 *    updatedAtLabel
 *  }
 * - onPress: função opcional (clicar no card)
 * - onPressView: função opcional (clicar no "Ver")
 * - title: opcional
 */
export default function BodyMeasurementsCard({
  data,
  onPress,
  onPressView,
  title = 'Medidas corporais',
}) {
  const items = useMemo(() => {
    return [
      { key: 'waist', label: 'Cintura', value: data?.waist, delta: data?.deltaWaist },
      { key: 'hip', label: 'Quadril', value: data?.hip, delta: data?.deltaHip },
      { key: 'arm', label: 'Braço', value: data?.arm, delta: data?.deltaArm },
      { key: 'thigh', label: 'Coxa', value: data?.thigh, delta: data?.deltaThigh },
    ];
  }, [data]);

  const hasAny = items.some((it) => it.value !== null && it.value !== undefined);

  const CardWrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress
    ? { activeOpacity: 0.9, onPress }
    : {};

  return (
    <CardWrapper style={styles.card} {...wrapperProps}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrap}>
            <Ionicons name="resize-outline" size={18} color="#4A90E2" />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>

        <TouchableOpacity
          onPress={onPressView || onPress}
          disabled={!onPressView && !onPress}
          style={styles.viewBtn}
        >
          <Text style={[styles.viewText, (!onPressView && !onPress) && { opacity: 0.5 }]}>
            Ver
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color="#4A90E2"
            style={{ opacity: (!onPressView && !onPress) ? 0.5 : 1 }}
          />
        </TouchableOpacity>
      </View>

      {/* Body */}
      {!hasAny ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Sem medidas ainda</Text>
          <Text style={styles.emptySub}>
            Adicione suas medidas para acompanhar sua evolução.
          </Text>

          <View style={styles.tipRow}>
            <Ionicons name="information-circle-outline" size={16} color="#4A90E2" />
            <Text style={styles.tipText}>
              Dica: meça sempre no mesmo horário e condições.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.grid}>
          {items.map((it) => (
            <View key={it.key} style={styles.cell}>
              <Text style={styles.label}>{it.label}</Text>

              <View style={styles.valueRow}>
                <Text style={styles.value}>{formatCm(it.value)}</Text>
                <TrendBadge delta={it.delta} />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        Última atualização: {data?.updatedAtLabel || '—'}
      </Text>
    </CardWrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 14,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },

  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(74,144,226,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  title: { fontSize: 16, fontWeight: '700', color: '#333' },

  viewBtn: { flexDirection: 'row', alignItems: 'center' },
  viewText: { color: '#4A90E2', fontWeight: '700', marginRight: 4 },

  grid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cell: {
    width: '48%',
    backgroundColor: '#F5F7FB',
    borderRadius: 12,
    padding: 12,
  },

  label: { fontSize: 12, color: '#666', fontWeight: '600' },

  valueRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: { fontSize: 15, fontWeight: '800', color: '#333' },

  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deltaGood: { color: '#27AE60', fontWeight: '800', fontSize: 12 },
  deltaWarn: { color: '#F39C12', fontWeight: '800', fontSize: 12 },
  deltaNeutral: { color: '#999', fontWeight: '800', fontSize: 12 },

  empty: { marginTop: 12, paddingVertical: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#333' },
  emptySub: { marginTop: 4, fontSize: 12, color: '#777' },

  tipRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipText: { fontSize: 12, color: '#666', flex: 1 },

  footer: { marginTop: 12, fontSize: 11, color: '#999' },
});
