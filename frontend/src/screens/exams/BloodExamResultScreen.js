// frontend/src/screens/exams/BloodExamResultScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api/axios'; // ✅ ajuste se o caminho for diferente

function mapItemsToSections(items = []) {
  // agrupa por "section" (como vem no JSON da IA)
  const grouped = new Map();
  for (const it of items) {
    const key = it.section || 'Outros';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(it);
  }

  // define status simples por heurística (você pode melhorar depois)
  // aqui vou deixar tudo como "good" por padrão.
  const sections = [];
  for (const [title, arr] of grouped.entries()) {
    sections.push({
      title,
      status: 'good',
      items: arr.map((x) => ({
        label: x.label,
        value: x.value,
        note: x.interpretation,
      })),
    });
  }

  return sections;
}

export default function BloodExamResultScreen({ navigation, route }) {
  const examId = route?.params?.examId; // ✅ precisa vir da tela anterior

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const statusColor = {
    good: '#27AE60',
    warning: '#F39C12',
    bad: '#E74C3C',
  };

  useEffect(() => {
    let isMounted = true;

    async function run() {
      try {
        setLoading(true);
        setErrorMsg(null);
        setAnalysis(null);

        if (!examId) {
          setErrorMsg('Não encontrei o ID do exame. Volte e tente novamente.');
          return;
        }

        // ✅ chama análise por ID (sempre novo resultado pro PDF atual)
        const res = await api.post(`/exams/${examId}/analyze`);
        if (!isMounted) return;

        setAnalysis(res.data?.data || null);
      } catch (err) {
        if (!isMounted) return;

        const status = err?.response?.status;
        const apiError = err?.response?.data?.error;

        if (status === 422) {
          setErrorMsg(apiError || 'Texto insuficiente para análise. Envie um PDF digital ou foto mais nítida.');
        } else {
          setErrorMsg(apiError || 'Não foi possível analisar este exame.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    run();
    return () => {
      isMounted = false;
    };
  }, [examId]);

  const sections = useMemo(() => {
    return mapItemsToSections(analysis?.items || []);
  }, [analysis]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.scroll, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={{ marginTop: 10, color: '#555' }}>Analisando seu exame...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMsg) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Resultado da Análise</Text>
          <Text style={styles.date}>Exame analisado automaticamente</Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Não foi possível concluir</Text>
            <Text style={styles.summaryText}>{errorMsg}</Text>

            <Text style={styles.disclaimer}>
              Dica: PDFs escaneados (imagem dentro do PDF) precisam de OCR. Se puder, envie um PDF “digital” (com texto) ou
              uma foto bem reta e nítida.
            </Text>
          </View>

          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={20} color="#4A90E2" />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Resultado da Análise</Text>
        <Text style={styles.date}>Exame analisado automaticamente</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumo da sua saúde</Text>

          {analysis?.summary?.positives?.length > 0 && (
            <View style={styles.summaryBlock}>
              <Ionicons name="checkmark-circle-outline" size={22} color="#27AE60" />
              <View>
                {analysis.summary.positives.map((p, i) => (
                  <Text key={i} style={styles.summaryText}>{p}</Text>
                ))}
              </View>
            </View>
          )}

          {analysis?.summary?.warnings?.length > 0 && (
            <View style={styles.summaryBlock}>
              <Ionicons name="alert-circle-outline" size={22} color="#F39C12" />
              <View>
                {analysis.summary.warnings.map((p, i) => (
                  <Text key={i} style={styles.summaryText}>{p}</Text>
                ))}
              </View>
            </View>
          )}

          {analysis?.summary?.critical?.length > 0 && (
            <View style={styles.summaryBlock}>
              <Ionicons name="close-circle-outline" size={22} color="#E74C3C" />
              <View>
                {analysis.summary.critical.map((p, i) => (
                  <Text key={i} style={styles.summaryText}>{p}</Text>
                ))}
              </View>
            </View>
          )}

          <Text style={styles.disclaimer}>
            Este relatório tem caráter educativo e não substitui consulta médica,
            diagnóstico ou tratamento. Qualquer decisão deve ser tomada com seu médico.
          </Text>
        </View>

        {sections.map((section, index) => (
          <View key={index} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusColor[section.status] || '#999' },
                ]}
              />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            {section.items.map((item, i) => (
              <View key={i} style={styles.sectionItem}>
                <Text style={styles.itemLabel}>{item.label}</Text>
                <Text style={styles.itemValue}>{item.value}</Text>
                <Text style={styles.itemNote}>{item.note}</Text>
              </View>
            ))}
          </View>
        ))}

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={20} color="#4A90E2" />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ------- Estilo Premium -------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },
  scroll: { padding: 20, flexGrow: 1 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333' },
  date: { marginTop: 4, fontSize: 14, color: '#777', marginBottom: 20 },
  summaryCard: { backgroundColor: '#fff', padding: 20, borderRadius: 14, marginBottom: 20, elevation: 3 },
  summaryTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#333' },
  summaryBlock: { flexDirection: 'row', marginBottom: 8 },
  summaryText: { marginLeft: 10, fontSize: 14, color: '#555' },
  disclaimer: { marginTop: 10, fontSize: 12, color: '#999', fontStyle: 'italic' },
  sectionCard: { backgroundColor: '#fff', padding: 18, borderRadius: 14, marginBottom: 20, elevation: 3 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  sectionItem: { marginBottom: 10 },
  itemLabel: { fontSize: 14, fontWeight: '500', color: '#444' },
  itemValue: { fontSize: 16, fontWeight: 'bold', color: '#4A90E2' },
  itemNote: { fontSize: 13, color: '#777' },
  backButton: { alignSelf: 'center', flexDirection: 'row', marginTop: 10 },
  backButtonText: { marginLeft: 6, fontSize: 15, color: '#4A90E2' },
});
