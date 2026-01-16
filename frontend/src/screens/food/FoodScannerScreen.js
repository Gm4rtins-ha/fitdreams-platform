// frontend/src/screens/food/FoodScannerScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

export default function FoodScannerScreen({ navigation }) {
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [hasMediaPermission, setHasMediaPermission] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  // ✅ NOVO: controla expand/collapse dos detalhes
  const [showDetails, setShowDetails] = useState(false);

  // ====== PEDIR PERMISSÕES ======
  useEffect(() => {
    (async () => {
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      const mediaStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();

      setHasCameraPermission(cameraStatus.status === 'granted');
      setHasMediaPermission(mediaStatus.status === 'granted');
    })();
  }, []);

  const handlePickImage = useCallback(async () => {
    if (!hasMediaPermission) {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de acesso à sua galeria para selecionar fotos.'
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType
          ? ImagePicker.MediaType.Images
          : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setImageUri(asset.uri);
      setAnalysis(null);
      setShowDetails(false); // ✅ fecha detalhes ao trocar foto
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  }, [hasMediaPermission]);

  const handleTakePhoto = useCallback(async () => {
    if (!hasCameraPermission) {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de acesso à câmera para tirar fotos.'
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setImageUri(asset.uri);
      setAnalysis(null);
      setShowDetails(false); // ✅ fecha detalhes ao tirar nova foto
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Não foi possível tirar a foto.');
    }
  }, [hasCameraPermission]);

  // ====== ENVIAR PARA BACKEND / GPT ======
  const handleAnalyzeFood = useCallback(async () => {
    if (!imageUri) {
      Alert.alert(
        'Selecione uma foto',
        'Escolha ou tire uma foto do alimento primeiro.'
      );
      return;
    }

    try {
      setLoading(true);
      setAnalysis(null);
      setShowDetails(false); // ✅ fecha detalhes ao reanalisar

      const formData = new FormData();

      const filename = imageUri.split('/').pop() || 'food.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      formData.append('image', {
        uri: imageUri,
        name: filename,
        type: mimeType,
      });

      console.log('📤 Enviando imagem para análise...', { uri: imageUri, filename, mimeType });

      const response = await api.post('/food/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('✅ Resposta /food/analyze:', response.data);

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Falha na análise do alimento');
      }

      setAnalysis(response.data.data || null);
    } catch (error) {
      console.error('❌ Erro na análise de alimento:', error.response?.data || error.message);
      Alert.alert(
        'Erro',
        'Não foi possível analisar o alimento. Tente novamente em alguns instantes.'
      );
    } finally {
      setLoading(false);
    }
  }, [imageUri]);

  // ====== UI HELPERS (ALIMENTOS DETECTADOS) ======

  const normalizeSourceLabel = (source) => {
    if (!source) return '—';
    const s = String(source).toLowerCase();
    if (s === 'fatsecret') return 'FatSecret';
    return source;
  };

  const Badge = ({ label }) => (
    <View style={style.badge}>
      <Text style={style.badgeText}>{label}</Text>
    </View>
  );

  const MacroPill = ({ label, value }) => (
    <View style={style.macroPill}>
      <Text style={style.macroPillLabel}>{label}</Text>
      <Text style={style.macroPillValue}>{value}</Text>
    </View>
  );

  const DetectedFoodCard = ({ item }) => {
    const title = item?.name || 'Alimento';
    const matched = item?.matchedFoodName;

    const kcal = item?.calories;
    const p = item?.protein;
    const c = item?.carbs;
    const g = item?.fat;

    const sourceLabel = normalizeSourceLabel(item?.source);
    const portion = item?.portion;
    const serving = item?.servingDescription;

    return (
      <View style={style.detectedCard}>
        <View style={style.detectedHeader}>
          <View style={{ flex: 1 }}>
            <Text style={style.detectedTitle}>{title}</Text>
            {!!matched && <Text style={style.detectedSubtitle}>{matched}</Text>}
          </View>

          <View style={style.kcalPill}>
            <Text style={style.kcalNumber}>{kcal != null ? kcal : '--'}</Text>
            <Text style={style.kcalLabel}>kcal</Text>
          </View>
        </View>

        <View style={style.badgeRow}>
          {!!portion && <Badge label={`Porção: ${portion}`} />}
          {!!serving && <Badge label={serving} />}
          <Badge label={`Fonte: ${sourceLabel}`} />
        </View>

        <View style={style.macroPillRow}>
          <MacroPill label="P" value={p != null ? `${p}g` : '--'} />
          <MacroPill label="C" value={c != null ? `${c}g` : '--'} />
          <MacroPill label="G" value={g != null ? `${g}g` : '--'} />
        </View>
      </View>
    );
  };

  // ====== RENDER ======

  const renderAnalysisCard = () => {
    if (!analysis) return null;

    const { foodName, calories, protein, fat, carbs, notes, items, total } = analysis;

    const listItems = Array.isArray(items) ? items : [];

    const summary = total || {
      calories,
      protein,
      fat,
      carbs,
    };

    return (
      <View style={style.resultCard}>
        <Text style={style.resultTitle}>{foodName || 'Resultado da Análise'}</Text>

        {/* 🔹 Bloco de macros totais */}
        <View style={style.macrosRow}>
          <View style={style.macroBox}>
            <Text style={style.macroLabel}>Calorias totais</Text>
            <Text style={style.macroValue}>
              {summary.calories != null ? `${summary.calories} kcal` : '--'}
            </Text>
          </View>
        </View>

        <View style={style.macrosRow}>
          <View style={style.macroBox}>
            <Text style={style.macroLabel}>Proteínas</Text>
            <Text style={style.macroValue}>
              {summary.protein != null ? `${summary.protein} g` : '--'}
            </Text>
          </View>
          <View style={style.macroBox}>
            <Text style={style.macroLabel}>Gorduras</Text>
            <Text style={style.macroValue}>
              {summary.fat != null ? `${summary.fat} g` : '--'}
            </Text>
          </View>
        </View>

        <View style={style.macrosRow}>
          <View style={style.macroBox}>
            <Text style={style.macroLabel}>Carboidratos</Text>
            <Text style={style.macroValue}>
              {summary.carbs != null ? `${summary.carbs} g` : '--'}
            </Text>
          </View>
        </View>

        {/* ✅ Botão de expandir/fechar */}
        <View style={style.detailsToggleWrap}>
          <TouchableOpacity
            style={style.detailsToggleBtn}
            onPress={() => setShowDetails((v) => !v)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={showDetails ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={18}
              color="#4A90E2"
            />
            <Text style={style.detailsToggleText}>
              {showDetails ? 'Menos detalhes' : 'Mais detalhes'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ✅ Detalhes só aparecem quando expandir */}
        {showDetails && (
          <>
            {listItems.length > 0 && (
              <>
                <View style={style.itemsHeaderRow}>
                  <Text style={style.itemsHeader}>Alimentos detectados</Text>
                  <Text style={style.itemsCount}>{listItems.length}</Text>
                </View>

                <FlatList
                  data={listItems}
                  keyExtractor={(item, index) => `${item?.name || 'item'}-${index}`}
                  renderItem={({ item }) => <DetectedFoodCard item={item} />}
                  scrollEnabled={false}
                  contentContainerStyle={{ gap: 12 }}
                />
              </>
            )}

            {notes ? (
              <View style={style.notesBox}>
                <Text style={style.notesTitle}>Observações</Text>
                <Text style={style.notesText}>{notes}</Text>
              </View>
            ) : (
              <Text style={style.disclaimer}>
                * Estes valores são uma estimativa baseada nos dados da FatSecret e podem variar de
                acordo com a porção, modo de preparo e ingredientes.
              </Text>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={style.safeArea}>
      <ScrollView contentContainerStyle={style.container}>
        {/* Header */}
        <View style={style.header}>
          <Text style={style.headerTitle}>Scanner de Comida</Text>
          <Text style={style.headerSubtitle}>
            Tire uma foto do seu prato e veja uma estimativa nutricional.
          </Text>
        </View>

        <TouchableOpacity
          style={style.historyButton}
          onPress={() => navigation.navigate('FoodHistory')}
        >
          <Ionicons name="time-outline" size={20} color="#4A90E2" />
          <Text style={style.historyButtonText}>Histórico</Text>
        </TouchableOpacity>

        {/* Área de imagem */}
        <View style={style.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={style.image} />
          ) : (
            <View style={style.placeholder}>
              <Ionicons name="fast-food-outline" size={48} color="#bbb" />
              <Text style={style.placeholderText}>Nenhuma foto selecionada ainda.</Text>
              <Text style={style.placeholderSubtext}>
                Toque em "Tirar Foto" ou "Escolher da Galeria" para começar.
              </Text>
            </View>
          )}
        </View>

        {/* Botões de ação (foto / galeria) */}
        <View style={style.actionsRow}>
          <TouchableOpacity style={style.actionButton} onPress={handleTakePhoto}>
            <Ionicons name="camera-outline" size={20} color="#fff" />
            <Text style={style.actionButtonText}>Tirar Foto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[style.actionButton, style.secondaryButton]}
            onPress={handlePickImage}
          >
            <Ionicons name="images-outline" size={20} color="#4A90E2" />
            <Text style={style.secondaryButtonText}>Galeria</Text>
          </TouchableOpacity>
        </View>

        {/* Botão de análise */}
        <TouchableOpacity
          style={[style.analyzeButton, (!imageUri || loading) && style.analyzeButtonDisabled]}
          onPress={handleAnalyzeFood}
          disabled={!imageUri || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="analytics-outline" size={22} color="#fff" />
              <Text style={style.analyzeButtonText}>Analisar Alimento</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Loading */}
        {loading && (
          <View style={style.loadingBox}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={style.loadingText}>Analisando imagem com IA...</Text>
          </View>
        )}

        {/* Resultado */}
        {renderAnalysisCard()}

        {/* Rodapé */}
        <Text style={style.footerText}>
          As informações exibidas são estimativas automáticas geradas por IA e não substituem a
          orientação de um nutricionista.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const style = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginTop: 10,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#EAF2FF',
    alignSelf: 'flex-start',
  },
  historyButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#4a90e2',
  },

  imageContainer: {
    marginTop: 10,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  placeholderText: {
    marginTop: 10,
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  placeholderSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#EAF2FF',
    marginRight: 0,
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#4A90E2',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },

  analyzeButton: {
    flexDirection: 'row',
    backgroundColor: '#27AE60',
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  analyzeButtonDisabled: {
    opacity: 0.6,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },

  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#555',
  },

  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },

  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  macroBox: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },

  // ✅ Botão "Mais detalhes"
  detailsToggleWrap: {
    marginTop: 10,
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  detailsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF2FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  detailsToggleText: {
    marginLeft: 6,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#4A90E2',
  },

  // ====== Alimentos detectados (cards bonitos) ======
  itemsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 10,
  },
  itemsHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#333',
  },
  itemsCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4A90E2',
    backgroundColor: '#EAF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  detectedCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  detectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detectedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
    textTransform: 'lowercase',
  },
  detectedSubtitle: {
    marginTop: 3,
    fontSize: 12.5,
    color: 'rgba(0,0,0,0.55)',
  },

  kcalPill: {
    minWidth: 74,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(39, 174, 96, 0.12)',
  },
  kcalNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#14532d',
    lineHeight: 18,
  },
  kcalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#14532d',
    opacity: 0.9,
    marginTop: 2,
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.65)',
  },

  macroPillRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  macroPill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  macroPillLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(0,0,0,0.5)',
  },
  macroPillValue: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: '900',
    color: '#111',
  },

  // ====== Notas ======
  notesBox: {
    marginTop: 14,
    backgroundColor: '#F9FBFF',
    padding: 10,
    borderRadius: 10,
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#555',
  },
  disclaimer: {
    fontSize: 12,
    color: '#888',
    marginTop: 10,
  },

  footerText: {
    marginTop: 8,
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
});