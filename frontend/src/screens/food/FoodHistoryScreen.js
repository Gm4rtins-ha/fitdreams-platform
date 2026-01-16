import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

const formatDateTime = (dateString) => {
  if (!dateString) return '--/--/---- --:--';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '--/--/---- --:--';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function FoodHistoryScreen({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('7'); // "7 dias"

  const fetchHistory = useCallback(async (days = '7') => {
    try {
      setLoading(true);
      const response = await api.get(`/food/history?days=${days}`);
      if (response.data?.success) {
        setLogs(response.data.data || []);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar histórico de comida:', error.response?.data || error.message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(selectedFilter);
  }, [fetchHistory, selectedFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory(selectedFilter).finally(() => setRefreshing(false));
  }, [fetchHistory, selectedFilter]);

  const renderItem = ({ item }) => (
    <View style={style.card}>
      <View style={style.cardHeader}>
        <Text style={style.foodName}>{item.foodName || 'Refeição'}</Text>
        <Text style={style.dateText}>{formatDateTime(item.loggedAt || item.createdAt)}</Text>
      </View>

      <View style={style.macrosRow}>
        <View style={style.macroBox}>
          <Text style={style.macroLabel}>Calorias</Text>
          <Text style={style.macroValue}>
            {item.calories != null ? `${item.calories} kcal` : '--'}
          </Text>
        </View>
        <View style={style.macroBox}>
          <Text style={style.macroLabel}>Prot.</Text>
          <Text style={style.macroValue}>
            {item.protein != null ? `${item.protein} g` : '--'}
          </Text>
        </View>
        <View style={style.macroBox}>
          <Text style={style.macroLabel}>Gord.</Text>
          <Text style={style.macroValue}>
            {item.fat != null ? `${item.fat} g` : '--'}
          </Text>
        </View>
        <View style={style.macroBox}>
          <Text style={style.macroLabel}>Carb.</Text>
          <Text style={style.macroValue}>
            {item.carbs != null ? `${item.carbs} g` : '--'}
          </Text>
        </View>
      </View>

      {item.notes ? (
        <Text style={style.notesText}>{item.notes}</Text>
      ) : null}
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={style.emptyBox}>
        <Ionicons name="fast-food-outline" size={40} color="#bbb" />
        <Text style={style.emptyText}>
          Nenhuma refeição registrada nesse período.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={style.safeArea}>
      {/* Header */}
      <View style={style.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={style.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={style.headerTitle}>Histórico Alimentar</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filtros rápidos */}
      <View style={style.filterRow}>
        {[
          { label: 'Hoje', value: '1' },
          { label: '7 dias', value: '7' },
          { label: '30 dias', value: '30' },
          { label: 'Tudo', value: '3650' }, // ~10 anos
        ].map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              style.filterChip,
              selectedFilter === f.value && style.filterChipActive,
            ]}
            onPress={() => setSelectedFilter(f.value)}
          >
            <Text
              style={[
                style.filterChipText,
                selectedFilter === f.value && style.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <View style={style.loadingBox}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      )}

      <FlatList
        data={logs}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={style.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
}

const style = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    paddingRight: 8,
    paddingVertical: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F5F7FB',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D0D7E2',
    backgroundColor: '#fff',
  },
  filterChipActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  filterChipText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardHeader: {
    marginBottom: 8,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  dateText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 6,
  },
  macroBox: {
    flex: 1,
    marginHorizontal: 2,
  },
  macroLabel: {
    fontSize: 11,
    color: '#999',
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  notesText: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#888',
  },
  loadingBox: {
    paddingVertical: 10,
  },
});
