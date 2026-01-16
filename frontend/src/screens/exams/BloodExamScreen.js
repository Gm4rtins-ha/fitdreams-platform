// frontend/src/screens/exams/BloodExamScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

import api from '../../api/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function BloodExamScreen({ navigation }) {
  const [examList, setExamList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const formatDate = (value) => {
    try {
      if (!value) return null;
      return new Date(value).toLocaleDateString('pt-BR');
    } catch {
      return null;
    }
  };

  // 🔄 Carregar histórico de exames
  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const response = await api.get('/exams/history');
      const list = response?.data?.data || [];
      setExamList(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error(
        '❌ Erro ao carregar histórico de exames:',
        error?.response?.data || error.message
      );
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadHistory);
    return unsubscribe;
  }, [navigation, loadHistory]);

  // =====================================================
  // UPLOAD PDF (ÚNICA FORMA)
  // =====================================================
  const uploadExamFile = useCallback(
    async ({ uri, mimeType, name }) => {
      try {
        if (!uri) {
          Alert.alert('Erro', 'Arquivo inválido.');
          return;
        }

        if (mimeType !== 'application/pdf') {
          Alert.alert('Formato inválido', 'O app aceita apenas arquivos PDF.');
          return;
        }

        setUploading(true);

        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          Alert.alert('Erro', 'Token não encontrado. Faça login novamente.');
          return;
        }

        const formData = new FormData();
        const fixedUri = uri.startsWith('file://') ? uri : `file://${uri}`;

        formData.append('file', {
          uri: fixedUri,
          type: 'application/pdf',
          name: name || 'exame.pdf',
        });

        formData.append('examType', 'Exame de sangue');
        formData.append('examDate', new Date().toISOString());

        const url = `${api.defaults.baseURL}/exams/upload`;

        console.log('📤 Upload PDF =>', url);

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          console.log('❌ Upload falhou:', res.status, data);
          Alert.alert(
            'Erro',
            data?.message || data?.error || `Falha no upload (${res.status})`
          );
          return;
        }

        const examId =
          data?.data?.id ||
          data?.data?.exam?.id ||
          data?.examId ||
          data?.id;

        if (!examId) {
          Alert.alert('Erro', 'Upload realizado, mas o ID do exame não foi retornado.');
          return;
        }

        await loadHistory();
        navigation.navigate('BloodExamResultScreen', { examId });
      } catch (error) {
        console.error('❌ Erro ao enviar exame:', error?.message || error);
        Alert.alert('Erro', 'Não foi possível enviar o exame. Tente novamente.');
      } finally {
        setUploading(false);
      }
    },
    [loadHistory, navigation]
  );

  // =====================================================
  // SELECIONAR PDF
  // =====================================================
  const handleUploadPdf = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets?.[0];
      if (!file?.uri) {
        Alert.alert('Erro', 'Não foi possível acessar o arquivo selecionado.');
        return;
      }

      await uploadExamFile({
        uri: file.uri,
        mimeType: file.mimeType || 'application/pdf',
        name: file.name || 'exame.pdf',
      });
    } catch (error) {
      console.error('❌ Erro ao selecionar PDF:', error?.message || error);
      Alert.alert('Erro', 'Não foi possível selecionar o PDF.');
    }
  }, [uploadExamFile]);

  const renderExamSubtitle = (exam) => {
    const meta = exam?.result?.meta;
    const pagesProcessed = meta?.pagesProcessed;
    const pagesTotal = meta?.pagesTotal;
    const uploadDate = formatDate(exam?.createdAt) || formatDate(exam?.examDate);

    if (pagesProcessed && pagesTotal) {
      return `Páginas: ${pagesProcessed}/${pagesTotal} • Enviado em ${uploadDate}`;
    }

    return uploadDate || 'Toque para ver o relatório';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.title}>Análises de Exames</Text>
          <Text style={styles.subtitle}>
            Envie seu exame em PDF e receba uma interpretação clara e objetiva.
          </Text>
        </View>

        {/* Botão direto PDF */}
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleUploadPdf}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={[styles.uploadButtonText, { marginLeft: 10 }]}>
                Enviando...
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
              <Text style={styles.uploadButtonText}>Enviar exame (PDF)</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Histórico */}
        <Text style={styles.sectionTitle}>Últimas análises</Text>

        {loadingHistory ? (
          <View style={styles.emptyBox}>
            <ActivityIndicator size="small" color="#4A90E2" />
            <Text style={styles.emptyText}>Carregando histórico...</Text>
          </View>
        ) : examList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={40} color="#aaa" />
            <Text style={styles.emptyText}>Você ainda não enviou nenhum exame.</Text>
            <Text style={styles.emptySubtext}>
              Assim que você enviar, suas análises aparecerão aqui.
            </Text>
          </View>
        ) : (
          examList.map((exam) => (
            <TouchableOpacity
              key={exam.id}
              style={styles.examCard}
              onPress={() =>
                navigation.navigate('BloodExamResultScreen', { examId: exam.id })
              }
            >
              <Ionicons name="document-text-outline" size={30} color="#4A90E2" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.examTitle}>
                  {exam.examType || `Exame #${exam.id}`}
                </Text>
                <Text style={styles.examSubtitle}>
                  {renderExamSubtitle(exam)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// =====================================================
// ESTILOS
// =====================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },
  scroll: { padding: 20 },
  header: { marginBottom: 25 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333' },
  subtitle: { marginTop: 6, fontSize: 14, color: '#777' },

  uploadButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    justifyContent: 'center',
    borderRadius: 14,
    marginBottom: 16,
    elevation: 4,
  },
  uploadButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 10 },

  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 10, marginBottom: 10 },

  emptyBox: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 3,
  },
  emptyText: { marginTop: 10, color: '#777', fontSize: 14 },
  emptySubtext: { marginTop: 4, color: '#999', fontSize: 12, textAlign: 'center' },

  examCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
  },
  examTitle: { color: '#333', fontSize: 16, fontWeight: '600' },
  examSubtitle: { color: '#888', fontSize: 12, marginTop: 2 },
});
