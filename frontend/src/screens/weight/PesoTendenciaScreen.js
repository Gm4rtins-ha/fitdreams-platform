import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Line, Circle, Path, Text as SvgText } from 'react-native-svg';
import WeightGoalModal from './WeightGoalModal';

const { width } = Dimensions.get('window');
const GRAPH_WIDTH = width - 48;
const GRAPH_HEIGHT = 280;

export default function PesoTendenciaScreen() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [weightGoal, setWeightGoal] = useState(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      
      const cachedData = await AsyncStorage.getItem('metricsHistory');
      if (cachedData) setMetrics(JSON.parse(cachedData));
      
      const goalData = await AsyncStorage.getItem('weightGoal');
      if (goalData) setWeightGoal(JSON.parse(goalData));
      
      const profileData = await AsyncStorage.getItem('userProfile');
      if (profileData) setUserProfile(JSON.parse(profileData));
    } catch (error) {
      console.error('❌ Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveWeightGoal = async (goal) => {
    try {
      await AsyncStorage.setItem('weightGoal', JSON.stringify(goal));
      setWeightGoal(goal);
    } catch (error) {
      console.error('❌ Erro ao salvar meta:', error);
    }
  };

  const getFilteredMetrics = () => {
    const now = new Date();
    const filtered = metrics.filter(m => {
      const date = new Date(m.timestamp);
      const diffDays = (now - date) / (1000 * 60 * 60 * 24);
      if (period === 'week') return diffDays <= 7;
      if (period === 'month') return diffDays <= 30;
      if (period === '3months') return diffDays <= 90;
      return true;
    });
    return filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const getLatestMetric = () => {
    if (metrics.length === 0) return null;
    return [...metrics].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  };

  const calculateBMI = (weight, height) => {
    if (!weight || !height) return null;
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
  };

  const getBMICategory = (bmi) => {
    if (!bmi) return null;
    if (bmi < 18.5) return { text: 'Abaixo do peso', color: '#FFA94D', icon: 'warning' };
    if (bmi <= 24.9) return { text: 'Peso saudável', color: '#51CF66', icon: 'checkmark-circle' };
    if (bmi <= 29.9) return { text: 'Sobrepeso', color: '#FFA94D', icon: 'warning' };
    return { text: 'Obesidade', color: '#FF6B6B', icon: 'close-circle' };
  };

  const getHealthAnalysis = (latest, profile) => {
    if (!latest || !profile || !latest.weight || !profile.height || !latest.bodyFatPercentage) return null;

    const bmi = calculateBMI(latest.weight, profile.height);
    if (!bmi) return null;
    
    const bmiCategory = getBMICategory(bmi);
    const bodyFat = latest.bodyFatPercentage;
    const age = profile.age || 30;
    const gender = profile.gender || 'male';

    let idealFatRange = gender === 'male' ? [10, 20] : [18, 28];
    if (age < 30) idealFatRange = gender === 'male' ? [8, 18] : [16, 25];
    if (age > 50) idealFatRange = gender === 'male' ? [12, 22] : [20, 30];

    const fatStatus = bodyFat >= idealFatRange[0] && bodyFat <= idealFatRange[1];
    
    let message = '';
    let color = '#4A90E2';
    let recommendation = '';

    if (bmi < 18.5) {
      message = `Seu IMC está abaixo do ideal (${bmi.toFixed(1)}). Risco de perda muscular e deficiência nutricional.`;
      color = '#FFA94D';
      recommendation = 'Foco: aumentar massa muscular e consumo calórico saudável.';
    } else if (bmi <= 24.9) {
      if (fatStatus) {
        message = `Peso saudável! IMC ${bmi.toFixed(1)} e ${bodyFat.toFixed(1)}% de gordura estão ideais para sua idade e gênero.`;
        color = '#51CF66';
        recommendation = 'Mantenha o foco em composição corporal — ganho muscular e baixa gordura.';
      } else if (bodyFat > idealFatRange[1]) {
        message = `IMC saudável (${bmi.toFixed(1)}), mas gordura corporal está em ${bodyFat.toFixed(1)}% (ideal: ${idealFatRange[0]}-${idealFatRange[1]}%).`;
        color = '#FFA94D';
        recommendation = 'O foco deve ser redução de gordura mantendo ou aumentando massa magra.';
      } else {
        message = `IMC saudável (${bmi.toFixed(1)}), gordura baixa (${bodyFat.toFixed(1)}%). Ótima composição!`;
        color = '#51CF66';
        recommendation = 'Continue mantendo seus hábitos saudáveis!';
      }
    } else if (bmi <= 29.9) {
      message = `Sobrepeso com IMC ${bmi.toFixed(1)}. Gordura corporal em ${bodyFat.toFixed(1)}%.`;
      color = '#FFA94D';
      recommendation = 'Foco: déficit calórico moderado + treino de força para preservar músculo.';
    } else {
      message = `IMC ${bmi.toFixed(1)} indica obesidade. Importante procurar orientação profissional.`;
      color = '#FF6B6B';
      recommendation = 'Recomendamos consultar nutricionista e educador físico.';
    }

    return {
      message,
      color,
      recommendation,
      bmi: bmi.toFixed(1),
      bmiCategory,
      fatStatus,
      idealFatRange,
    };
  };

  const getTrendAnalysis = (filteredMetrics) => {
    if (filteredMetrics.length < 2) return null;

    const latest = filteredMetrics[filteredMetrics.length - 1];
    const first = filteredMetrics[0];

    // Verificar se os dados necessários existem
    if (!latest.weight || !first.weight || 
        !latest.bodyFatPercentage || !first.bodyFatPercentage ||
        !latest.muscleMass || !first.muscleMass) {
      return null;
    }

    const weightChange = latest.weight - first.weight;
    const fatChange = latest.bodyFatPercentage - first.bodyFatPercentage;
    const muscleChange = latest.muscleMass - first.muscleMass;

    let musclePercent = 0;
    let fatPercent = 0;
    
    if (weightChange > 0) {
      const fatGained = (latest.weight * latest.bodyFatPercentage / 100) - (first.weight * first.bodyFatPercentage / 100);
      const totalGained = weightChange;
      
      if (totalGained > 0) {
        musclePercent = (muscleChange / totalGained) * 100;
        fatPercent = (fatGained / totalGained) * 100;
      }
    }

    let trendMessage = '';
    let trendColor = '#4A90E2';

    if (weightChange > 0.5 && musclePercent > 70) {
      trendMessage = `Ganho de ${weightChange.toFixed(1)}kg veio ${musclePercent.toFixed(0)}% de massa muscular — excelente progresso!`;
      trendColor = '#51CF66';
    } else if (weightChange > 0.5 && fatPercent > 60) {
      trendMessage = `Ganho de ${weightChange.toFixed(1)}kg teve ${fatPercent.toFixed(0)}% de gordura. Ajuste a dieta.`;
      trendColor = '#FF6B6B';
    } else if (weightChange < -0.5 && muscleChange > -0.3) {
      trendMessage = `Perdeu ${Math.abs(weightChange).toFixed(1)}kg preservando músculo. Ótimo trabalho!`;
      trendColor = '#51CF66';
    } else if (weightChange < -0.5 && muscleChange < -0.5) {
      trendMessage = `Perdeu ${Math.abs(weightChange).toFixed(1)}kg, mas ${Math.abs(muscleChange).toFixed(1)}kg foi músculo. Aumente proteína.`;
      trendColor = '#FFA94D';
    } else {
      trendMessage = `Peso estável. Foco em recomposição corporal.`;
      trendColor = '#4A90E2';
    }

    return {
      message: trendMessage,
      color: trendColor,
      musclePercent: musclePercent.toFixed(0),
      fatPercent: fatPercent.toFixed(0),
    };
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const renderEvolutionGraph = (filteredMetrics) => {
    if (filteredMetrics.length < 2) {
      return (
        <View style={styles.emptyGraph}>
          <Ionicons name="analytics-outline" size={60} color="#DDD" />
          <Text style={styles.emptyGraphText}>Dados insuficientes</Text>
        </View>
      );
    }

    const weights = filteredMetrics.map(m => m.weight);
    const fats = filteredMetrics.map(m => m.weight * m.bodyFatPercentage / 100);
    const muscles = filteredMetrics.map(m => m.muscleMass);

    const allValues = [...weights, ...fats, ...muscles];
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue || 1;
    const padding = range * 0.1;

    const normalizeValue = (value) => {
      return ((value - minValue + padding) / (range + 2 * padding)) * 100;
    };

    const createPoints = (values) => {
      return values.map((value, index) => {
        const x = 10 + (index / (values.length - 1)) * (GRAPH_WIDTH - 20);
        const y = GRAPH_HEIGHT - 40 - (normalizeValue(value) / 100) * (GRAPH_HEIGHT - 60);
        return { x, y };
      });
    };

    const weightPoints = createPoints(weights);
    const fatPoints = createPoints(fats);
    const musclePoints = createPoints(muscles);

    const createPath = (points) => {
      return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    };

    const dates = filteredMetrics.map(m => formatDate(m.timestamp));

    return (
      <View style={styles.graphContainer}>
        <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
          {/* Grid */}
          {[0, 25, 50, 75, 100].map((percent, i) => {
            const y = GRAPH_HEIGHT - 40 - (percent / 100) * (GRAPH_HEIGHT - 60);
            return (
              <Line
                key={i}
                x1={10}
                y1={y}
                x2={GRAPH_WIDTH - 10}
                y2={y}
                stroke="#E0E0E0"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            );
          })}

          {/* Eixos */}
          <Line x1={10} y1={20} x2={10} y2={GRAPH_HEIGHT - 40} stroke="#333" strokeWidth="2" />
          <Line x1={10} y1={GRAPH_HEIGHT - 40} x2={GRAPH_WIDTH - 10} y2={GRAPH_HEIGHT - 40} stroke="#333" strokeWidth="2" />

          {/* Linha de Peso (Azul) */}
          <Path d={createPath(weightPoints)} stroke="#4A90E2" strokeWidth="3" fill="none" />
          {weightPoints.map((p, i) => (
            <Circle key={`w${i}`} cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#4A90E2" strokeWidth="2" />
          ))}

          {/* Linha de Gordura (Vermelho) */}
          <Path d={createPath(fatPoints)} stroke="#FF6B6B" strokeWidth="3" fill="none" />
          {fatPoints.map((p, i) => (
            <Circle key={`f${i}`} cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#FF6B6B" strokeWidth="2" />
          ))}

          {/* Linha de Músculo (Verde) */}
          <Path d={createPath(musclePoints)} stroke="#51CF66" strokeWidth="3" fill="none" />
          {musclePoints.map((p, i) => (
            <Circle key={`m${i}`} cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#51CF66" strokeWidth="2" />
          ))}

          {/* Labels do eixo X */}
          {dates.map((date, i) => {
            const x = 10 + (i / (dates.length - 1)) * (GRAPH_WIDTH - 20);
            return (
              <SvgText key={i} x={x} y={GRAPH_HEIGHT - 20} fontSize="10" fill="#666" textAnchor="middle">
                {date}
              </SvgText>
            );
          })}
        </Svg>

        {/* Legenda */}
        <View style={styles.graphLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4A90E2' }]} />
            <Text style={styles.legendText}>Peso total</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#51CF66' }]} />
            <Text style={styles.legendText}>Massa muscular</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
            <Text style={styles.legendText}>Gordura corporal</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (metrics.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <Ionicons name="analytics-outline" size={80} color="#DDD" />
          <Text style={styles.emptyTitle}>Nenhum dado disponível</Text>
          <Text style={styles.emptySubtitle}>
            Faça medições na balança para ver suas estatísticas
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredMetrics = getFilteredMetrics();
  const latest = getLatestMetric();
  const healthAnalysis = getHealthAnalysis(latest, userProfile);
  const trendAnalysis = getTrendAnalysis(filteredMetrics);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Análise de Peso Saudável</Text>
          <TouchableOpacity onPress={loadData}>
            <Ionicons name="refresh" size={24} color="#4A90E2" />
          </TouchableOpacity>
        </View>

        {/* 1. BLOCO DE DADOS BÁSICOS */}
        <View style={styles.basicDataCard}>
          <Text style={styles.sectionTitle}>📊 Dados Atuais</Text>
          
          <View style={styles.dataGrid}>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>Peso atual</Text>
              <Text style={styles.dataValue}>
                {latest?.weight ? latest.weight.toFixed(1) : '--'} kg
              </Text>
            </View>
            
            {weightGoal && (
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>🎯 Meta</Text>
                <Text style={styles.dataValue}>{weightGoal.weight.toFixed(1)} kg</Text>
              </View>
            )}
            
            {userProfile && (
              <>
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>👤 Gênero</Text>
                  <Text style={styles.dataValue}>{userProfile.gender === 'male' ? 'Masculino' : 'Feminino'}</Text>
                </View>
                
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>📅 Idade</Text>
                  <Text style={styles.dataValue}>{userProfile.age} anos</Text>
                </View>
                
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>📏 Altura</Text>
                  <Text style={styles.dataValue}>{userProfile.height} cm</Text>
                </View>
              </>
            )}
          </View>

          {/* Aviso se não tem perfil */}
          {!userProfile && (
            <View style={styles.infoCard}>
              <Ionicons name="person-circle-outline" size={24} color="#4A90E2" />
              <Text style={styles.infoText}>
                Configure seu perfil (altura, idade, gênero) para receber análises personalizadas e validação de metas.
              </Text>
            </View>
          )}

          {!weightGoal && (
            <TouchableOpacity 
              style={styles.setGoalButton}
              onPress={() => setShowGoalModal(true)}
            >
              <Ionicons name="flag-outline" size={20} color="#4A90E2" />
              <Text style={styles.setGoalButtonText}>Definir Meta de Peso</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Seletor de Período */}
        <View style={styles.periodSelector}>
          {['week', 'month', '3months'].map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, period === p && styles.periodButtonActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : '3 Meses'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 2. GRÁFICO PRINCIPAL */}
        <View style={styles.graphSection}>
          <Text style={styles.sectionTitle}>📈 Evolução do Peso</Text>
          {renderEvolutionGraph(filteredMetrics)}
        </View>

        {/* 3. ANÁLISE DE TENDÊNCIA */}
        {trendAnalysis && (
          <View style={[styles.analysisCard, { borderLeftColor: trendAnalysis.color }]}>
            <View style={styles.analysisHeader}>
              <Ionicons name="trending-up" size={24} color={trendAnalysis.color} />
              <Text style={styles.analysisTitle}>Análise de Progresso</Text>
            </View>
            <Text style={styles.analysisMessage}>{trendAnalysis.message}</Text>
            {parseFloat(trendAnalysis.musclePercent) > 0 && (
              <View style={styles.progressDetails}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${trendAnalysis.musclePercent}%`, backgroundColor: '#51CF66' }]} />
                </View>
                <View style={styles.progressLegend}>
                  <Text style={styles.progressLegendText}>🟢 {trendAnalysis.musclePercent}% músculo</Text>
                  <Text style={styles.progressLegendText}>🔴 {trendAnalysis.fatPercent}% gordura</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 4. SAÚDE DO PESO */}
        {healthAnalysis && (
          <View style={[styles.healthCard, { borderLeftColor: healthAnalysis.color }]}>
            <View style={styles.healthHeader}>
              <Ionicons name={healthAnalysis.bmiCategory.icon} size={32} color={healthAnalysis.color} />
              <View style={styles.healthHeaderText}>
                <Text style={styles.healthTitle}>Saúde do Peso</Text>
                <Text style={[styles.healthCategory, { color: healthAnalysis.color }]}>
                  IMC: {healthAnalysis.bmi} — {healthAnalysis.bmiCategory.text}
                </Text>
              </View>
            </View>
            
            <Text style={styles.healthMessage}>{healthAnalysis.message}</Text>
            
            <View style={styles.recommendationBox}>
              <Text style={styles.recommendationLabel}>💡 Recomendação:</Text>
              <Text style={styles.recommendationText}>{healthAnalysis.recommendation}</Text>
            </View>
          </View>
        )}

        {/* 5. INDICADORES COMPLEMENTARES */}
        <View style={styles.indicatorsSection}>
          <Text style={styles.sectionTitle}>🎯 Indicadores de Saúde</Text>
          
          {/* Aviso se dados estão incompletos */}
          {latest && (!latest.bodyFatPercentage || !latest.muscleMass || !latest.bmr || !latest.bodyWaterPercentage) && (
            <View style={styles.warningCard}>
              <Ionicons name="information-circle" size={24} color="#FFA94D" />
              <Text style={styles.warningText}>
                Alguns indicadores não estão disponíveis. Conecte-se a uma balança de bioimpedância para ver todos os dados.
              </Text>
            </View>
          )}
          
          <View style={styles.indicatorsGrid}>
            {/* Gordura Corporal */}
            {latest?.bodyFatPercentage !== undefined && (
              <View style={[styles.indicatorCard, {
                borderColor: latest.bodyFatPercentage >= 10 && latest.bodyFatPercentage <= 20 ? '#51CF66' : '#FFA94D'
              }]}>
                <Text style={styles.indicatorIcon}>🔥</Text>
                <Text style={styles.indicatorLabel}>Gordura</Text>
                <Text style={styles.indicatorValue}>{latest.bodyFatPercentage.toFixed(1)}%</Text>
                <Text style={[styles.indicatorStatus, {
                  color: latest.bodyFatPercentage >= 10 && latest.bodyFatPercentage <= 20 ? '#51CF66' : '#FFA94D'
                }]}>
                  {latest.bodyFatPercentage >= 10 && latest.bodyFatPercentage <= 20 ? '✅ Ideal' : '⚠️ Atenção'}
                </Text>
              </View>
            )}

            {/* Massa Muscular */}
            {latest?.muscleMass !== undefined && latest?.weight !== undefined && (
              <View style={[styles.indicatorCard, { borderColor: '#51CF66' }]}>
                <Text style={styles.indicatorIcon}>💪</Text>
                <Text style={styles.indicatorLabel}>Músculo</Text>
                <Text style={styles.indicatorValue}>{latest.muscleMass.toFixed(1)} kg</Text>
                <Text style={[styles.indicatorStatus, { color: '#51CF66' }]}>
                  {(latest.muscleMass / latest.weight * 100).toFixed(0)}% do peso
                </Text>
              </View>
            )}

            {/* Metabolismo */}
            {latest?.bmr !== undefined && (
              <View style={[styles.indicatorCard, { borderColor: '#4A90E2' }]}>
                <Text style={styles.indicatorIcon}>🔥</Text>
                <Text style={styles.indicatorLabel}>Metabolismo</Text>
                <Text style={styles.indicatorValue}>{latest.bmr} kcal</Text>
                <Text style={[styles.indicatorStatus, { color: '#4A90E2' }]}>
                  Taxa basal
                </Text>
              </View>
            )}

            {/* Hidratação */}
            {latest?.bodyWaterPercentage !== undefined && (
              <View style={[styles.indicatorCard, { borderColor: '#4A90E2' }]}>
                <Text style={styles.indicatorIcon}>💧</Text>
                <Text style={styles.indicatorLabel}>Hidratação</Text>
                <Text style={styles.indicatorValue}>{latest.bodyWaterPercentage.toFixed(1)}%</Text>
                <Text style={[styles.indicatorStatus, {
                  color: latest.bodyWaterPercentage >= 50 ? '#51CF66' : '#FFA94D'
                }]}>
                  {latest.bodyWaterPercentage >= 50 ? '✅ Boa' : '⚠️ Baixa'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 6. FEEDBACK EDUCATIVO */}
        <View style={styles.educationalCard}>
          <View style={styles.educationalHeader}>
            <Ionicons name="school-outline" size={24} color="#4A90E2" />
            <Text style={styles.educationalTitle}>💡 Você Sabia?</Text>
          </View>
          <Text style={styles.educationalText}>
            {userProfile && healthAnalysis && healthAnalysis.bmiCategory.text === 'Peso saudável' 
              ? "Seu peso está dentro da faixa ideal para sua idade e altura. O importante agora é focar na composição corporal — aumentar massa magra e reduzir gordura é mais saudável do que apenas perder peso na balança."
              : healthAnalysis && healthAnalysis.bmi < 18.5
                ? "Para ganhar peso de forma saudável, foque em alimentos nutritivos e densos em calorias. Combine com treino de força para garantir que o ganho seja principalmente de músculo."
                : "A composição corporal (quanto você tem de músculo vs gordura) é mais importante que o número na balança. Duas pessoas com o mesmo peso podem ter composições completamente diferentes!"
            }
          </Text>
        </View>
      </ScrollView>

      {/* Modal de Meta */}
      <WeightGoalModal
        visible={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        onSave={saveWeightGoal}
        currentWeight={latest?.weight}
        currentGoal={weightGoal?.weight}
        userProfile={userProfile}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  basicDataCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dataItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
  },
  dataLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  setGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
    gap: 8,
  },
  setGoalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0F7FF',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#4A90E2',
    lineHeight: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#4A90E2',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  periodTextActive: {
    color: '#fff',
  },
  graphSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  graphContainer: {
    marginBottom: 16,
  },
  emptyGraph: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyGraphText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  graphLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  analysisCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  analysisMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
    marginBottom: 12,
  },
  progressDetails: {
    marginTop: 12,
  },
  progressBar: {
    flexDirection: 'row',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
  },
  progressLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressLegendText: {
    fontSize: 12,
    color: '#666',
  },
  healthCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  healthHeaderText: {
    flex: 1,
  },
  healthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  healthCategory: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  healthMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
    marginBottom: 16,
  },
  recommendationBox: {
    backgroundColor: '#F0F7FF',
    padding: 16,
    borderRadius: 12,
  },
  recommendationLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 6,
  },
  recommendationText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  indicatorsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFE066',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  indicatorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  indicatorCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  indicatorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  indicatorLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  indicatorValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  indicatorStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  educationalCard: {
    backgroundColor: '#FFF9E6',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFE066',
  },
  educationalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  educationalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  educationalText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
  },
});