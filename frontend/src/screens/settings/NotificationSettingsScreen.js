import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import NotificationService from '../../services/NotificationService';

export default function NotificationSettingsScreen({ navigation }) {
  // Estados principais
  const [weighingEnabled, setWeighingEnabled] = useState(true);
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [weighingTime, setWeighingTime] = useState(new Date(2024, 0, 1, 7, 0));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5, 6, 7]);
  const [loading, setLoading] = useState(false);

  // Períodos predefinidos
  const [selectedPeriod, setSelectedPeriod] = useState('morning'); // morning, afternoon, evening, custom

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('notification_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setWeighingEnabled(parsed.weighingEnabled ?? true);
        setAlarmEnabled(parsed.alarmEnabled ?? false);
        setSelectedDays(parsed.selectedDays ?? [1, 2, 3, 4, 5, 6, 7]);
        setSelectedPeriod(parsed.selectedPeriod ?? 'morning');
        
        if (parsed.weighingHour !== undefined) {
          const time = new Date();
          time.setHours(parsed.weighingHour, parsed.weighingMinute || 0);
          setWeighingTime(time);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      
      const settings = {
        weighingEnabled,
        alarmEnabled,
        weighingHour: weighingTime.getHours(),
        weighingMinute: weighingTime.getMinutes(),
        selectedDays,
        selectedPeriod,
      };
      
      await AsyncStorage.setItem('notification_settings', JSON.stringify(settings));
      console.log('📝 Salvando configurações:', settings);
      
      if (weighingEnabled) {
        await NotificationService.setupWeighingReminders(settings);
      }
      
      Alert.alert(
        'Configurações Salvas! ✅',
        alarmEnabled 
          ? 'Lembretes com alarme configurados!\nO alarme vai tocar até você desligá-lo.'
          : 'Lembretes configurados!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      Alert.alert('Erro', 'Não foi possível salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setWeighingTime(selectedTime);
      setSelectedPeriod('custom');
    }
  };

  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter(d => d !== day));
      } else {
        Alert.alert('Atenção', 'Selecione pelo menos um dia');
      }
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const selectPeriod = (period) => {
    setSelectedPeriod(period);
    const time = new Date();
    
    switch(period) {
      case 'morning':
        time.setHours(7, 0);
        break;
      case 'afternoon':
        time.setHours(14, 0);
        break;
      case 'evening':
        time.setHours(20, 0);
        break;
    }
    
    if (period !== 'custom') {
      setWeighingTime(time);
    }
  };

  const handleTestNotification = async () => {
    if (alarmEnabled) {
      Alert.alert(
        'Teste de Alarme',
        'O alarme vai tocar por 10 segundos. Continue?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Testar', 
            onPress: () => {
              // Aqui você implementaria o teste de alarme
              Alert.alert('Alarme', 'Funcionalidade de alarme em desenvolvimento');
            }
          },
        ]
      );
    } else {
      await NotificationService.sendAchievementNotification(
        'Teste',
        'Esta é uma notificação de teste!'
      );
      Alert.alert('Enviado!', 'Verifique sua central de notificações');
    }
  };

  const daysOfWeek = [
    { id: 1, name: 'Dom' },
    { id: 2, name: 'Seg' },
    { id: 3, name: 'Ter' },
    { id: 4, name: 'Qua' },
    { id: 5, name: 'Qui' },
    { id: 6, name: 'Sex' },
    { id: 7, name: 'Sáb' },
  ];

  const periods = [
    { id: 'morning', name: 'Manhã', time: '07:00', icon: 'sunny-outline' },
    { id: 'afternoon', name: 'Tarde', time: '14:00', icon: 'partly-sunny-outline' },
    { id: 'evening', name: 'Noite', time: '20:00', icon: 'moon-outline' },
    { id: 'custom', name: 'Personalizado', time: null, icon: 'time-outline' },
  ];

  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lembretes de Pesagem</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* ATIVAR LEMBRETES */}
        <View style={styles.section}>
          <View style={styles.mainToggle}>
            <View style={styles.mainToggleLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="scale-outline" size={28} color="#4A90E2" />
              </View>
              <View>
                <Text style={styles.mainToggleTitle}>Lembretes de Pesagem</Text>
                <Text style={styles.mainToggleSubtitle}>
                  {weighingEnabled ? 'Ativos' : 'Desativados'}
                </Text>
              </View>
            </View>
            <Switch 
              value={weighingEnabled} 
              onValueChange={setWeighingEnabled}
              trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
              thumbColor={weighingEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {weighingEnabled && (
          <>
            {/* TIPO DE LEMBRETE */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tipo de Lembrete</Text>
              
              <View style={styles.card}>
                <TouchableOpacity 
                  style={styles.reminderType}
                  onPress={() => setAlarmEnabled(false)}
                >
                  <View style={styles.reminderTypeLeft}>
                    <View style={[
                      styles.radio,
                      !alarmEnabled && styles.radioActive
                    ]}>
                      {!alarmEnabled && <View style={styles.radioDot} />}
                    </View>
                    <View>
                      <Text style={styles.reminderTypeName}>Notificação</Text>
                      <Text style={styles.reminderTypeDesc}>Lembrete silencioso</Text>
                    </View>
                  </View>
                  <Ionicons name="notifications-outline" size={24} color="#4A90E2" />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity 
                  style={styles.reminderType}
                  onPress={() => setAlarmEnabled(true)}
                >
                  <View style={styles.reminderTypeLeft}>
                    <View style={[
                      styles.radio,
                      alarmEnabled && styles.radioActive
                    ]}>
                      {alarmEnabled && <View style={styles.radioDot} />}
                    </View>
                    <View>
                      <Text style={styles.reminderTypeName}>Alarme</Text>
                      <Text style={styles.reminderTypeDesc}>Toca até desligar</Text>
                    </View>
                  </View>
                  <Ionicons name="alarm-outline" size={24} color="#FF9800" />
                </TouchableOpacity>
              </View>
            </View>

            {/* PERÍODO DO DIA */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Período do Dia</Text>
              
              <View style={styles.periodsGrid}>
                {periods.map(period => (
                  <TouchableOpacity
                    key={period.id}
                    style={[
                      styles.periodCard,
                      selectedPeriod === period.id && styles.periodCardActive
                    ]}
                    onPress={() => selectPeriod(period.id)}
                  >
                    <Ionicons 
                      name={period.icon} 
                      size={32} 
                      color={selectedPeriod === period.id ? '#4A90E2' : '#999'}
                    />
                    <Text style={[
                      styles.periodName,
                      selectedPeriod === period.id && styles.periodNameActive
                    ]}>
                      {period.name}
                    </Text>
                    {period.time && (
                      <Text style={[
                        styles.periodTime,
                        selectedPeriod === period.id && styles.periodTimeActive
                      ]}>
                        {period.time}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* HORÁRIO PERSONALIZADO */}
            {selectedPeriod === 'custom' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Horário Personalizado</Text>
                
                <View style={styles.card}>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={24} color="#4A90E2" />
                    <Text style={styles.timeText}>{formatTime(weighingTime)}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#CCC" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* DIAS DA SEMANA */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dias da Semana</Text>
              
              <View style={styles.card}>
                <View style={styles.daysContainer}>
                  {daysOfWeek.map(day => (
                    <TouchableOpacity
                      key={day.id}
                      style={[
                        styles.dayButton,
                        selectedDays.includes(day.id) && styles.dayButtonActive
                      ]}
                      onPress={() => toggleDay(day.id)}
                    >
                      <Text style={[
                        styles.dayButtonText,
                        selectedDays.includes(day.id) && styles.dayButtonTextActive
                      ]}>
                        {day.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.hint}>
                  {selectedDays.length === 7 
                    ? 'Todos os dias' 
                    : `${selectedDays.length} ${selectedDays.length === 1 ? 'dia selecionado' : 'dias selecionados'}`}
                </Text>
              </View>
            </View>

            {/* INFORMAÇÕES */}
            <View style={styles.section}>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={24} color="#4A90E2" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Melhor horário para pesar</Text>
                  <Text style={styles.infoText}>
                    Pela manhã, em jejum, após usar o banheiro e sem roupas pesadas.
                  </Text>
                </View>
              </View>
            </View>

            {/* TESTE */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.testButton}
                onPress={handleTestNotification}
              >
                <Ionicons 
                  name={alarmEnabled ? "alarm-outline" : "notifications-outline"} 
                  size={24} 
                  color="#9C27B0" 
                />
                <Text style={styles.testButtonText}>
                  {alarmEnabled ? 'Testar Alarme' : 'Testar Notificação'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* BOTÃO SALVAR */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSaveSettings}
          disabled={loading}
        >
          <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
          <Text style={styles.saveButtonText}>
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {showTimePicker && (
        <DateTimePicker
          value={weighingTime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  scrollView: { flex: 1 },
  
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#999', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
  
  mainToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  mainToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center' },
  mainToggleTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 4 },
  mainToggleSubtitle: { fontSize: 14, color: '#999' },
  
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  
  reminderType: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  reminderTypeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: '#4A90E2' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4A90E2' },
  reminderTypeName: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 2 },
  reminderTypeDesc: { fontSize: 14, color: '#999' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 8 },
  
  periodsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  periodCard: { width: '48%', backgroundColor: '#fff', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 2, borderColor: '#E0E0E0' },
  periodCardActive: { borderColor: '#4A90E2', backgroundColor: '#F0F7FF' },
  periodName: { fontSize: 14, fontWeight: '600', color: '#666', marginTop: 12 },
  periodNameActive: { color: '#4A90E2' },
  periodTime: { fontSize: 12, color: '#999', marginTop: 4 },
  periodTimeActive: { color: '#4A90E2' },
  
  timeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8F9FA', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  timeText: { flex: 1, fontSize: 24, fontWeight: '700', color: '#333', marginLeft: 12 },
  
  daysContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dayButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F8F9FA', borderWidth: 2, borderColor: '#E0E0E0', alignItems: 'center' },
  dayButtonActive: { backgroundColor: '#E3F2FD', borderColor: '#4A90E2' },
  dayButtonText: { fontSize: 14, fontWeight: '600', color: '#666' },
  dayButtonTextActive: { color: '#4A90E2' },
  
  hint: { fontSize: 12, color: '#999', textAlign: 'center' },
  
  infoBox: { flexDirection: 'row', backgroundColor: '#E3F2FD', padding: 16, borderRadius: 12, gap: 12 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#4A90E2', marginBottom: 4 },
  infoText: { fontSize: 13, color: '#666', lineHeight: 20 },
  
  testButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#fff', paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: '#9C27B0' },
  testButtonText: { fontSize: 16, fontWeight: '600', color: '#9C27B0' },
  
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#4A90E2', marginHorizontal: 16, marginTop: 24, paddingVertical: 18, borderRadius: 12, shadowColor: '#4A90E2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveButtonDisabled: { backgroundColor: '#CCC', shadowOpacity: 0 },
  saveButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
});