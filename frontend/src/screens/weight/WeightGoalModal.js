import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WeightGoalModal({ visible, onClose, onSave, currentWeight, currentGoal, userProfile }) {
  const insets = useSafeAreaInsets();
  const [goalWeight, setGoalWeight] = useState(currentGoal?.toString() || '');
  const [goalType, setGoalType] = useState('lose');

  useEffect(() => {
    if (currentGoal) {
      setGoalWeight(currentGoal.toString());
    }
  }, [currentGoal]);

  const handleSave = () => {
    const weight = parseFloat(goalWeight);
    if (weight && weight > 0) {
      onSave({ 
        weight, 
        type: goalType,
        setDate: new Date().toISOString(),
        startWeight: currentWeight,
      });
      onClose();
    }
  };

  const suggestGoal = () => {
    if (!currentWeight) return;
    
    if (goalType === 'lose') {
      const suggested = (currentWeight * 0.9).toFixed(1);
      setGoalWeight(suggested);
    } else if (goalType === 'gain') {
      const suggested = (currentWeight * 1.1).toFixed(1);
      setGoalWeight(suggested);
    } else {
      setGoalWeight(currentWeight.toFixed(1));
    }
  };

  const getDifference = () => {
    const goal = parseFloat(goalWeight);
    if (!goal || !currentWeight) return null;
    return (goal - currentWeight).toFixed(1);
  };

  // VALIDAÇÃO DE PESO SAUDÁVEL
  const validateHealthyWeight = () => {
    const goal = parseFloat(goalWeight);
    if (!goal || !userProfile?.height) return null;

    const heightInMeters = userProfile.height / 100;
    const goalBMI = goal / (heightInMeters * heightInMeters);
    
    // IMC saudável: 18.5 - 24.9
    const isHealthyBMI = goalBMI >= 18.5 && goalBMI <= 24.9;
    
    // Taxa de perda/ganho
    const difference = Math.abs(goal - currentWeight);
    const weeksToGoal = difference / 0.5; // 0.5kg por semana é saudável
    
    // Validar se não é muito agressivo (< 4 semanas)
    const isTooAggressive = weeksToGoal < 4 && difference > 2;
    
    let status = 'healthy';
    let message = '';
    let color = '#51CF66';
    let icon = 'checkmark-circle';
    
    if (goalBMI < 18.5) {
      status = 'underweight';
      message = `IMC muito baixo (${goalBMI.toFixed(1)}). Risco de desnutrição.`;
      color = '#FF6B6B';
      icon = 'close-circle';
    } else if (goalBMI > 24.9 && goalBMI < 30) {
      status = 'warning';
      message = `IMC acima do ideal (${goalBMI.toFixed(1)}). Considere um peso mais baixo.`;
      color = '#FFA94D';
      icon = 'warning';
    } else if (goalBMI >= 30) {
      status = 'overweight';
      message = `IMC alto (${goalBMI.toFixed(1)}). Meta pode trazer riscos à saúde.`;
      color = '#FF6B6B';
      icon = 'close-circle';
    } else if (isTooAggressive) {
      status = 'aggressive';
      message = `Meta muito agressiva! Recomendado: ${weeksToGoal.toFixed(0)} semanas para atingir de forma saudável.`;
      color = '#FFA94D';
      icon = 'warning';
    } else {
      message = `IMC saudável (${goalBMI.toFixed(1)})! Meta alcançável em ~${weeksToGoal.toFixed(0)} semanas.`;
      color = '#51CF66';
      icon = 'checkmark-circle';
    }
    
    return {
      status,
      message,
      color,
      icon,
      bmi: goalBMI.toFixed(1),
      weeksToGoal: weeksToGoal.toFixed(0),
      isHealthy: status === 'healthy',
    };
  };

  const healthValidation = validateHealthyWeight();
  const difference = getDifference();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎯 Definir Meta de Peso</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Peso Atual */}
            {currentWeight && (
              <View style={styles.currentWeightCard}>
                <Text style={styles.currentWeightLabel}>Peso Atual</Text>
                <Text style={styles.currentWeightValue}>{currentWeight.toFixed(1)} kg</Text>
              </View>
            )}

            {/* Info do Perfil */}
            {userProfile && (
              <View style={styles.profileInfo}>
                <View style={styles.profileInfoItem}>
                  <Ionicons name="resize-outline" size={16} color="#666" />
                  <Text style={styles.profileInfoText}>Altura: {userProfile.height}cm</Text>
                </View>
                {userProfile.age && (
                  <View style={styles.profileInfoItem}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.profileInfoText}>Idade: {userProfile.age} anos</Text>
                  </View>
                )}
              </View>
            )}

            {/* Tipo de Meta */}
            <View style={styles.goalTypeSection}>
              <Text style={styles.sectionTitle}>Qual é seu objetivo?</Text>
              <View style={styles.goalTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.goalTypeButton,
                    goalType === 'lose' && styles.goalTypeButtonActive,
                    goalType === 'lose' && { borderColor: '#FF6B6B' }
                  ]}
                  onPress={() => setGoalType('lose')}
                >
                  <Text style={styles.goalTypeIcon}>📉</Text>
                  <Text style={[
                    styles.goalTypeText,
                    goalType === 'lose' && styles.goalTypeTextActive
                  ]}>
                    Perder Peso
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.goalTypeButton,
                    goalType === 'gain' && styles.goalTypeButtonActive,
                    goalType === 'gain' && { borderColor: '#51CF66' }
                  ]}
                  onPress={() => setGoalType('gain')}
                >
                  <Text style={styles.goalTypeIcon}>📈</Text>
                  <Text style={[
                    styles.goalTypeText,
                    goalType === 'gain' && styles.goalTypeTextActive
                  ]}>
                    Ganhar Peso
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.goalTypeButton,
                    goalType === 'maintain' && styles.goalTypeButtonActive,
                    goalType === 'maintain' && { borderColor: '#4A90E2' }
                  ]}
                  onPress={() => setGoalType('maintain')}
                >
                  <Text style={styles.goalTypeIcon}>⚖️</Text>
                  <Text style={[
                    styles.goalTypeText,
                    goalType === 'maintain' && styles.goalTypeTextActive
                  ]}>
                    Manter Peso
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Input de Peso Meta */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionTitle}>Peso Objetivo</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={goalWeight}
                  onChangeText={setGoalWeight}
                  keyboardType="decimal-pad"
                  placeholder="Ex: 70.0"
                  placeholderTextColor="#999"
                />
                <Text style={styles.inputUnit}>kg</Text>
              </View>

              <TouchableOpacity 
                style={styles.suggestButton}
                onPress={suggestGoal}
              >
                <Ionicons name="bulb-outline" size={16} color="#4A90E2" />
                <Text style={styles.suggestButtonText}>Sugerir meta saudável</Text>
              </TouchableOpacity>
            </View>

            {/* VALIDAÇÃO DE PESO SAUDÁVEL */}
            {healthValidation && (
              <View style={[
                styles.healthValidationCard,
                { 
                  backgroundColor: healthValidation.color + '15',
                  borderColor: healthValidation.color,
                }
              ]}>
                <View style={styles.healthValidationHeader}>
                  <Ionicons 
                    name={healthValidation.icon} 
                    size={24} 
                    color={healthValidation.color} 
                  />
                  <Text style={[
                    styles.healthValidationTitle,
                    { color: healthValidation.color }
                  ]}>
                    {healthValidation.isHealthy ? 'Peso Saudável' : 'Atenção'}
                  </Text>
                </View>
                <Text style={styles.healthValidationMessage}>
                  {healthValidation.message}
                </Text>
                
                {/* Detalhes */}
                <View style={styles.healthDetails}>
                  <View style={styles.healthDetailItem}>
                    <Text style={styles.healthDetailLabel}>IMC Objetivo:</Text>
                    <Text style={[styles.healthDetailValue, { color: healthValidation.color }]}>
                      {healthValidation.bmi}
                    </Text>
                  </View>
                  <View style={styles.healthDetailItem}>
                    <Text style={styles.healthDetailLabel}>Tempo estimado:</Text>
                    <Text style={[styles.healthDetailValue, { color: healthValidation.color }]}>
                      ~{healthValidation.weeksToGoal} semanas
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Preview da diferença */}
            {difference && !healthValidation && (
              <View style={[
                styles.differenceCard,
                { 
                  backgroundColor: goalType === 'lose' 
                    ? '#FFF5F5' 
                    : goalType === 'gain' 
                      ? '#F0FFF4' 
                      : '#F0F7FF' 
                }
              ]}>
                <Text style={styles.differenceLabel}>
                  {goalType === 'lose' 
                    ? '🔥 Para perder:' 
                    : goalType === 'gain'
                      ? '💪 Para ganhar:'
                      : '⚖️ Para manter:'}
                </Text>
                <Text style={[
                  styles.differenceValue,
                  { 
                    color: goalType === 'lose' 
                      ? '#FF6B6B' 
                      : goalType === 'gain'
                        ? '#51CF66'
                        : '#4A90E2'
                  }
                ]}>
                  {Math.abs(parseFloat(difference)).toFixed(1)} kg
                </Text>
                <Text style={styles.differenceSubtext}>
                  {goalType === 'lose' 
                    ? 'Faltam perder' 
                    : goalType === 'gain'
                      ? 'Faltam ganhar'
                      : 'Diferença atual'}
                </Text>
              </View>
            )}

            {/* Dica */}
            {!healthValidation && (
              <View style={styles.tipCard}>
                <Ionicons name="information-circle" size={20} color="#4A90E2" />
                <Text style={styles.tipText}>
                  {goalType === 'lose' 
                    ? 'Perda saudável: 0.5-1kg por semana'
                    : goalType === 'gain'
                      ? 'Ganho saudável: 0.25-0.5kg por semana'
                      : 'Manter peso requer equilíbrio calórico'}
                </Text>
              </View>
            )}

            {/* Botões */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.saveButton,
                  (!goalWeight || parseFloat(goalWeight) <= 0) && styles.saveButtonDisabled
                ]}
                onPress={handleSave}
                disabled={!goalWeight || parseFloat(goalWeight) <= 0}
              >
                <Text style={styles.saveButtonText}>Salvar Meta</Text>
              </TouchableOpacity>
            </View>

            {/* Espaçamento extra para navegação mobile */}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  currentWeightCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  currentWeightLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  currentWeightValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
  },
  profileInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  profileInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileInfoText: {
    fontSize: 13,
    color: '#666',
  },
  goalTypeSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  goalTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  goalTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  goalTypeButtonActive: {
    backgroundColor: '#F8F9FA',
  },
  goalTypeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  goalTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  goalTypeTextActive: {
    color: '#333',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
    paddingVertical: 16,
  },
  inputUnit: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
  },
  suggestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  suggestButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 4,
  },
  healthValidationCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
  },
  healthValidationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  healthValidationTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  healthValidationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  healthDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  healthDetailItem: {
    flex: 1,
  },
  healthDetailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  healthDetailValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  differenceCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  differenceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  differenceValue: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
  },
  differenceSubtext: {
    fontSize: 12,
    color: '#999',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#4A90E2',
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#CCC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});