import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { verifyPhone, resendPhoneVerification } from '../../api/axios';

export default function VerifyPhoneScreen({ route, navigation }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const phone = route.params?.phone;

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      Alert.alert('Atenção', 'Digite o código de 6 dígitos');
      return;
    }

    if (!phone) {
      Alert.alert('Erro', 'Telefone não encontrado. Por favor, volte e tente novamente.');
      return;
    }

    setLoading(true);

    try {
      const response = await verifyPhone(phone, code);

      if (response.success) {
        // Salvar token se vier na resposta
        if (response.token) {
          await AsyncStorage.setItem('token', response.token);
          await AsyncStorage.setItem('user', JSON.stringify(response.user));
        }

        Alert.alert(
          '🎉 Verificação Completa!',
          'Sua conta foi ativada com sucesso. Bem-vindo ao FitDreams!',
          [
            {
              text: 'Começar',
              onPress: () => navigation.replace('Home')
            }
          ]
        );
      } else {
        Alert.alert('Erro', response.message || 'Código inválido');
      }
    } catch (error) {
      console.error('Erro ao verificar telefone:', error);
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível verificar o código');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!phone) {
      Alert.alert('Erro', 'Telefone não encontrado.');
      return;
    }

    setResending(true);

    try {
      const response = await resendPhoneVerification(phone);

      if (response.success) {
        Alert.alert('Sucesso', 'Novo código enviado via SMS');
        
        // Mostrar código em desenvolvimento
        if (response.debug?.code) {
          console.log('📱 Novo código SMS:', response.debug.code);
        }
      } else {
        Alert.alert('Erro', response.message);
      }
    } catch (error) {
      console.error('Erro ao reenviar código:', error);
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível reenviar o código');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <LinearGradient
        colors={['#4CAF50', '#45a049', '#3d8b40']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>📱</Text>
          </View>
          <Text style={styles.headerTitle}>Verificar Telefone</Text>
          <Text style={styles.headerSubtitle}>
            Digite o código de 6 dígitos enviado via SMS
          </Text>
          {phone && (
            <Text style={styles.phoneText}>{phone}</Text>
          )}
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>Passo 2 de 2 - Último passo!</Text>
        </View>

        {/* Input de Código */}
        <View style={styles.codeInputContainer}>
          <Text style={styles.label}>Código de Verificação SMS</Text>
          <TextInput
            style={styles.codeInput}
            placeholder="000000"
            placeholderTextColor="#999"
            value={code}
            onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            O SMS pode levar alguns minutos para chegar. O código expira em 15 minutos.
          </Text>
        </View>

        {/* Botão Verificar */}
        <TouchableOpacity
          style={styles.verifyButton}
          onPress={handleVerify}
          disabled={loading || code.length !== 6}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={code.length === 6 ? ['#4CAF50', '#45a049'] : ['#E0E0E0', '#BDBDBD']}
            style={styles.verifyButtonGradient}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.verifyButtonText}>✅ Concluir Verificação</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Reenviar Código */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Não recebeu o SMS? </Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={resending}
            activeOpacity={0.7}
          >
            {resending ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <Text style={styles.resendLink}>Reenviar</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Pular (opcional) */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => {
            Alert.alert(
              'Pular Verificação?',
              'Você pode verificar seu telefone depois nas configurações.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Pular',
                  onPress: () => navigation.replace('Home')
                }
              ]
            );
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Pular e fazer depois →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconText: {
    fontSize: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  phoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
  },

  // Progress
  progressContainer: {
    marginBottom: 40,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
    fontWeight: '600',
  },

  // Code Input
  codeInputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  codeInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    letterSpacing: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 20,
  },

  // Verify Button
  verifyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  verifyButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Resend
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },

  // Skip
  skipButton: {
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    color: '#999',
  },
});