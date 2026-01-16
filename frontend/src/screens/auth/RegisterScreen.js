// frontend/src/screens/auth/RegisterScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios'; // ← CORRIGIDO: import api, não register

export default function RegisterScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [unitSystem, setUnitSystem] = useState('metric');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatPhone = (text) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 11) {
      let formatted = numbers;
      if (numbers.length > 2) {
        formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
      }
      if (numbers.length > 7) {
        formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
      }
      return formatted;
    }
    return phone;
  };

  const formatBirthDate = (text) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 8) {
      let formatted = numbers;
      if (numbers.length > 2) {
        formatted = `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
      }
      if (numbers.length > 4) {
        formatted = `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
      }
      return formatted;
    }
    return birthDate;
  };

  const convertDateToISO = (dateStr) => {
    if (dateStr.length !== 10) return null;
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  const validateForm = () => {
    if (!firstName.trim()) {
      Alert.alert('Erro', 'Preencha seu nome');
      return false;
    }
    if (!lastName.trim()) {
      Alert.alert('Erro', 'Preencha seu sobrenome');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Erro', 'E-mail inválido');
      return false;
    }
    if (phone.replace(/\D/g, '').length < 11) {
      Alert.alert('Erro', 'Telefone inválido');
      return false;
    }
    if (birthDate.length !== 10) {
      Alert.alert('Erro', 'Data de nascimento inválida');
      return false;
    }
    if (!gender) {
      Alert.alert('Erro', 'Selecione seu gênero');
      return false;
    }
    if (!height || parseFloat(height) <= 0) {
      Alert.alert('Erro', 'Altura inválida');
      return false;
    }
    if (!weight || parseFloat(weight) <= 0) {
      Alert.alert('Erro', 'Peso inválido');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Erro', 'Senha deve ter no mínimo 6 caracteres');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não conferem');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    console.log('🚀 handleRegister CHAMADO - VERSÃO CORRIGIDA');

    if (!validateForm()) {
      console.log('❌ Validação falhou');
      return;
    }

    setLoading(true);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const birthDateISO = convertDateToISO(birthDate);

      const userData = {
        fullName,
        email: email.trim().toLowerCase(),
        phone: phone.replace(/\D/g, ''),
        password,
        confirmPassword,
        birthDate: birthDateISO,
        gender,
        height: parseFloat(height),
        weight: parseFloat(weight),
      };

      console.log('📝 Cadastrando usuário...');
      console.log('📦 Dados enviados:', JSON.stringify(userData, null, 2));

      // CORREÇÃO AQUI: Use api.post() diretamente
      const response = await api.post('/auth/register', userData);
      
      console.log('✅ Resposta da API:', JSON.stringify(response.data, null, 2));

      if (response.data.success) {
        console.log('🎉 Cadastro realizado com sucesso!');

        Alert.alert(
          'Sucesso!',
          'Conta criada com sucesso! Agora você pode fazer login.',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('➡️ Navegando para Login');
                navigation.navigate('Login');
              }
            }
          ]
        );
      } else {
        console.log('❌ Cadastro falhou:', response.data.message);
        Alert.alert('Erro', response.data.message || 'Não foi possível criar a conta');
      }
    } catch (error) {
      console.error('💥 ERRO NO CADASTRO:', error.response?.data || error.message);
      
      let errorMessage = 'Erro ao criar conta. Tente novamente.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Erro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getHeightLabel = () => {
    return unitSystem === 'metric' ? 'Altura (cm)' : 'Altura (polegadas)';
  };

  const getWeightLabel = () => {
    return unitSystem === 'metric' ? 'Peso (kg)' : 'Peso (lb)';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={['#4A90E2', '#357ABD']}
            style={styles.header}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="sparkles" size={40} color="#fff" />
              </View>
            </View>

            <Text style={styles.welcomeText}>Criar Conta</Text>
            <Text style={styles.subtitleText}>Preencha seus dados para começar</Text>
          </LinearGradient>

          <View style={styles.formContainer}>
            <View style={styles.rowContainer}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label}>Nome</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="João"
                    placeholderTextColor="#999"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label}>Sobrenome</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { paddingLeft: 16 }]}
                    placeholder="Silva"
                    placeholderTextColor="#999"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>E-mail</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="seu@email.com"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Telefone</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="(11) 98765-4321"
                  placeholderTextColor="#999"
                  value={phone}
                  onChangeText={(text) => setPhone(formatPhone(text))}
                  keyboardType="phone-pad"
                  maxLength={15}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Data de Nascimento</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="calendar-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="31/12/1990"
                  placeholderTextColor="#999"
                  value={birthDate}
                  onChangeText={(text) => setBirthDate(formatBirthDate(text))}
                  keyboardType="number-pad"
                  maxLength={10}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Gênero</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    gender === 'masculino' && styles.genderButtonActive,
                  ]}
                  onPress={() => setGender('masculino')}
                  disabled={loading}
                >
                  <Ionicons name="male-outline" size={20} color={gender === 'masculino' ? '#4A90E2' : '#666'} />
                  <Text style={[styles.genderButtonText, gender === 'masculino' && styles.genderButtonTextActive]}>
                    Masculino
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    gender === 'feminino' && styles.genderButtonActive,
                  ]}
                  onPress={() => setGender('feminino')}
                  disabled={loading}
                >
                  <Ionicons name="female-outline" size={20} color={gender === 'feminino' ? '#4A90E2' : '#666'} />
                  <Text style={[styles.genderButtonText, gender === 'feminino' && styles.genderButtonTextActive]}>
                    Feminino
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Sistema de Unidades</Text>
              <View style={styles.unitButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    unitSystem === 'metric' && styles.unitButtonActive,
                  ]}
                  onPress={() => setUnitSystem('metric')}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      unitSystem === 'metric' && styles.unitButtonTextActive,
                    ]}
                  >
                    Métrico (cm, kg)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    unitSystem === 'imperial' && styles.unitButtonActive,
                  ]}
                  onPress={() => setUnitSystem('imperial')}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      unitSystem === 'imperial' && styles.unitButtonTextActive,
                    ]}
                  >
                    Imperial (in, lb)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{getHeightLabel()}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="body-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={unitSystem === 'metric' ? "175" : "69"}
                  placeholderTextColor="#999"
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{getWeightLabel()}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="scale-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={unitSystem === 'metric' ? "70.5" : "155"}
                  placeholderTextColor="#999"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="********"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.passwordToggle}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirmar Senha</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="********"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.passwordToggle}>
                  <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>Criar Conta</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            >
              <Text style={styles.loginLinkText}>Já tem uma conta? <Text style={styles.loginLinkHighlight}>Faça Login</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Os styles permanecem os mesmos
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 0,
    paddingBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 40 : 10,
    left: 20,
    zIndex: 1,
    padding: 8,
  },
  logoContainer: {
    marginBottom: 15,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  halfWidth: {
    width: '48%',
    marginBottom: 0,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  passwordToggle: {
    padding: 8,
  },
  unitButtonsContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  unitButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  unitButtonActive: {
    backgroundColor: '#EBF4FF',
    borderColor: '#4A90E2',
  },
  unitButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  unitButtonTextActive: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  genderButtonActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F7FF',
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  genderButtonTextActive: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    height: 55,
    justifyContent: 'center',
  },
  registerButtonDisabled: {
    backgroundColor: '#CCC',
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
    paddingBottom: 20,
  },
  loginLinkText: {
    fontSize: 15,
    color: '#666',
  },
  loginLinkHighlight: {
    color: '#4A90E2',
    fontWeight: '600',
  },
});