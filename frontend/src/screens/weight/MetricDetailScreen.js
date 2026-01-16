import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export default function MetricDetailScreen({ route, navigation }) {
  const { metric } = route.params;
  const viewRef = useRef();
  const [loading, setLoading] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getIMCClassification = (imc) => {
    if (imc < 18.5) return { text: 'Baixo', color: '#3498DB' };
    if (imc < 25) return { text: 'Normal', color: '#27AE60' };
    if (imc < 30) return { text: 'Alto', color: '#F39C12' };
    return { text: 'Muito Alto', color: '#E74C3C' };
  };

  const getBFClassification = (bf, gender) => {
    if (gender === 'masculino') {
      if (bf < 6) return { text: 'Essencial', color: '#3498DB' };
      if (bf < 14) return { text: 'Atleta', color: '#27AE60' };
      if (bf < 18) return { text: 'Fitness', color: '#2ECC71' };
      if (bf < 25) return { text: 'Aceitável', color: '#F39C12' };
      return { text: 'Alto', color: '#E74C3C' };
    } else {
      if (bf < 14) return { text: 'Essencial', color: '#3498DB' };
      if (bf < 21) return { text: 'Atleta', color: '#27AE60' };
      if (bf < 25) return { text: 'Fitness', color: '#2ECC71' };
      if (bf < 32) return { text: 'Aceitável', color: '#F39C12' };
      return { text: 'Alto', color: '#E74C3C' };
    }
  };

  const captureAndShare = async () => {
    try {
      setLoading(true);

      // Capturar view como imagem
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1.0,
      });

      // Verificar se compartilhamento está disponível
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Compartilhar Medição',
        });
      } else {
        Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo');
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar a imagem');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async () => {
    try {
      setLoading(true);

      // Pedir permissão para salvar na galeria
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Atenção', 'Precisamos de permissão para salvar na galeria');
        setLoading(false);
        return;
      }

      // Capturar view como imagem
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1.0,
      });

      // Salvar na galeria
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('FitDreams', asset, false);

      Alert.alert('Sucesso', 'Imagem salva na galeria!');
    } catch (error) {
      console.error('Erro ao baixar:', error);
      Alert.alert('Erro', 'Não foi possível salvar a imagem');
    } finally {
      setLoading(false);
    }
  };

  const shareOptions = () => {
    Alert.alert(
      'Compartilhar Medição',
      'Escolha uma opção',
      [
        { text: 'Compartilhar Imagem', onPress: captureAndShare },
        { text: 'Baixar Imagem', onPress: downloadImage },
        { text: 'Exportar PDF', onPress: exportPDF },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const exportPDF = async () => {
    Alert.alert('Em breve', 'Exportação em PDF será adicionada em breve!');
  };

  const imcClass = getIMCClassification(metric.imc);
  const bfClass = getBFClassification(metric.bodyFat, metric.gender);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Detalhes</Text>
        
        <TouchableOpacity
          style={styles.shareButton}
          onPress={shareOptions}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#4A90E2" />
          ) : (
            <Ionicons name="share-outline" size={24} color="#4A90E2" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Card Principal (capturável) */}
        <View ref={viewRef} style={styles.captureContainer}>
          <View style={styles.shareCard}>
            {/* Avatar e Nome */}
            <View style={styles.userHeader}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={32} color="#fff" />
              </View>
              <Text style={styles.userName}>{metric.userName || 'Usuário'}</Text>
            </View>

            {/* Peso Principal */}
            <View style={styles.weightContainer}>
              <View style={styles.weightBadge}>
                <Text style={styles.weightBadgeText}>
                  {imcClass.text}
                </Text>
              </View>
              
              <Text style={styles.weightValue}>{metric.weight.toFixed(1)}</Text>
              <Text style={styles.weightUnit}>Kg</Text>
              <Text style={styles.dateText}>{formatDate(metric.createdAt)}</Text>

              {/* Barra de Progresso */}
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min((metric.weight / 120) * 100, 100)}%` }]} />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>Baixo</Text>
                <Text style={styles.progressLabel}>Saudável</Text>
                <Text style={styles.progressLabel}>Alto</Text>
                <Text style={styles.progressLabel}>Obeso</Text>
              </View>
            </View>

            {/* Comparações */}
            <View style={styles.comparisonContainer}>
              <View style={styles.comparisonItem}>
                <Ionicons name="trending-down" size={20} color="#3498DB" />
                <Text style={styles.comparisonLabel}>Comparado com última vez</Text>
                <Text style={styles.comparisonValue}>-1.2</Text>
              </View>
            </View>

            {/* Métricas Principais */}
            <View style={styles.metricsGrid}>
              <MetricRow 
                icon="fitness"
                label="Peso(Kg)"
                value={metric.weight.toFixed(1)}
                status={imcClass.text}
                color={imcClass.color}
              />
              
              <MetricRow 
                icon="calculator"
                label="IMC"
                value={metric.imc?.toFixed(1) || '--'}
                status={imcClass.text}
                color={imcClass.color}
              />
              
              <MetricRow 
                icon="body"
                label="Gordura(%)"
                value={metric.bodyFat?.toFixed(1) || '--'}
                status={bfClass.text}
                color={bfClass.color}
              />
              
              <MetricRow 
                icon="water"
                label="Peso da gordura(Kg)"
                value={metric.fatMass?.toFixed(1) || '--'}
                status={bfClass.text}
                color={bfClass.color}
              />
              
              <MetricRow 
                icon="barbell"
                label="Massa muscular(%)"
                value={metric.muscleMassPercent?.toFixed(1) || '--'}
                status="Excelente"
                color="#27AE60"
              />

              <MetricRow 
                icon="nutrition"
                label="Massa muscular(Kg)"
                value={metric.muscleMass?.toFixed(1) || '--'}
                status="Excelente"
                color="#27AE60"
              />

              <MetricRow 
                icon="water-outline"
                label="Água(%)"
                value={metric.waterPercent?.toFixed(1) || '--'}
                status="Excelente"
                color="#27AE60"
              />

              <MetricRow 
                icon="flame"
                label="Metabolismo"
                value={metric.bmr?.toFixed(0) || '--'}
                status="Alto"
                color="#F39C12"
              />
            </View>

            {/* Rodapé */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>FitDreams - Sua Saúde em Foco</Text>
              <Text style={styles.footerDate}>{formatDate(new Date())}</Text>
            </View>
          </View>
        </View>

        {/* Botões de Ação */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.shareBtn]}
            onPress={captureAndShare}
            disabled={loading}
          >
            <Ionicons name="share-social" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Compartilhar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.downloadBtn]}
            onPress={downloadImage}
            disabled={loading}
          >
            <Ionicons name="download" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Baixar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Componente auxiliar para linhas de métricas
function MetricRow({ icon, label, value, status, color }) {
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricLeft}>
        <Ionicons name={icon} size={20} color="#666" />
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <View style={styles.metricRight}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={[styles.metricStatus, { color }]}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  shareButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center' },
  
  captureContainer: { backgroundColor: '#F8F9FA', padding: 16 },
  shareCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  
  userHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userName: { fontSize: 18, fontWeight: '600', color: '#333' },
  
  weightContainer: { alignItems: 'center', marginBottom: 24 },
  weightBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  weightBadgeText: { fontSize: 14, fontWeight: '600', color: '#2196F3' },
  weightValue: { fontSize: 64, fontWeight: '700', color: '#333' },
  weightUnit: { fontSize: 24, color: '#999', marginTop: -8 },
  dateText: { fontSize: 14, color: '#999', marginTop: 8 },
  
  progressBar: { width: '100%', height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, marginTop: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  progressLabel: { fontSize: 10, color: '#999' },
  
  comparisonContainer: { marginBottom: 24 },
  comparisonItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 12, borderRadius: 12 },
  comparisonLabel: { flex: 1, fontSize: 14, color: '#666', marginLeft: 8 },
  comparisonValue: { fontSize: 16, fontWeight: '700', color: '#3498DB' },
  
  metricsGrid: { gap: 12 },
  metricRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  metricLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metricLabel: { fontSize: 14, color: '#666' },
  metricRight: { alignItems: 'flex-end' },
  metricValue: { fontSize: 18, fontWeight: '700', color: '#333' },
  metricStatus: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  
  footer: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0', alignItems: 'center' },
  footerText: { fontSize: 14, fontWeight: '600', color: '#4A90E2', marginBottom: 4 },
  footerDate: { fontSize: 12, color: '#999' },
  
  actionButtons: { flexDirection: 'row', gap: 12, padding: 16 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12 },
  shareBtn: { backgroundColor: '#4A90E2' },
  downloadBtn: { backgroundColor: '#27AE60' },
  actionButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});