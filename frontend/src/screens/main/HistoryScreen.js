// frontend/src/screens/main/HistoryScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../../api/axios';

const formatDateTime = (dateString) => {
  if (!dateString) return '--/--/---- --:--';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '--/--/---- --:--';

  const dia = d.toLocaleDateString('pt-BR');
  const hora = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dia} ${hora}`;
};

const formatNumber = (value, dec = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  return Number(value).toFixed(dec).replace('.', ',');
};

export default function HistoryScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [measurements, setMeasurements] = useState([]);
  const [totalMeasurements, setTotalMeasurements] = useState(0);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);

      // usa o mesmo endpoint que a Home, só que com um limit maior
      const resp = await api.get('/weight/latest?limit=100');
      const raw = resp.data?.data ?? resp.data ?? [];
      const arr = Array.isArray(raw) ? raw : [];

      // ordena da mais recente pra mais antiga
      arr.sort((a, b) => {
        const da = new Date(a.timestamp || a.measuredAt || a.createdAt);
        const db = new Date(b.timestamp || b.measuredAt || b.createdAt);
        return db - da;
      });

      setMeasurements(arr);
      setTotalMeasurements(arr.length);
    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleOpenDetail = (item) => {
    navigation.navigate('WeightResult', {
      from: 'history',
      measurement: item,
    });
  };

  const handleStartFirst = () => {
    navigation.navigate('WeightScan');
  };

  const renderItem = ({ item }) => {
    const weight = item.weight;
    const bmi = item.bmi;
    const dateTime = formatDateTime(
      item.timestamp || item.measuredAt || item.createdAt
    );

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleOpenDetail(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardDate}>{dateTime}</Text>
          <Ionicons name="chevron-forward" size={18} color="#bbb" />
        </View>

        <View style={styles.cardRow}>
          <View style={styles.cardCol}>
            <Text style={styles.cardLabel}>Peso</Text>
            <Text style={styles.cardValue}>{formatNumber(weight, 1)} Kg</Text>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.cardCol}>
            <Text style={styles.cardLabel}>IMC</Text>
            <Text style={styles.cardValue}>{formatNumber(bmi, 1)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando histórico...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isEmpty = !measurements || measurements.length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Histórico de Pesagens</Text>
        <Text style={styles.headerSubtitle}>
          {totalMeasurements} medições registradas
        </Text>
      </View>

      {isEmpty ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>Nenhuma medição ainda</Text>
          <Text style={styles.emptySubtitle}>
            Suas pesagens aparecerão aqui
          </Text>

          <TouchableOpacity
            style={styles.firstButton}
            onPress={handleStartFirst}
          >
            <Text style={styles.firstButtonText}>Fazer Primeira Pesagem</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={measurements}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#E0E0E0',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
  },
  firstButton: {
    marginTop: 20,
    backgroundColor: '#4A90E2',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  firstButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E6F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 13,
    color: '#666',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardCol: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cardDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 12,
  },
});
