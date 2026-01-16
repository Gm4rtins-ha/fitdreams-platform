import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HelpScreen() {
  const handleEmail = () => {
    Linking.openURL('mailto:suporte@app.com');
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/5511999999999');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="help-circle" size={60} color="#2196F3" />
        <Text style={styles.headerTitle}>Central de Ajuda</Text>
        <Text style={styles.headerSubtitle}>
          Estamos aqui para ajudar você!
        </Text>
      </View>

      {/* FAQ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>❓ Perguntas Frequentes</Text>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Como funciona a pesagem?</Text>
          <Text style={styles.faqAnswer}>
            1. Abra o app e clique em "Pesar"{'\n'}
            2. Suba na balança{'\n'}
            3. Aguarde o peso estabilizar (5-8 segundos){'\n'}
            4. O app salva automaticamente
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>A balança não conecta</Text>
          <Text style={styles.faqAnswer}>
            • Verifique se o Bluetooth está ativado{'\n'}
            • Certifique-se que a balança é Original Line (34:5C:F3){'\n'}
            • Tente reiniciar o app{'\n'}
            • Verifique as permissões do app
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>O peso está incorreto</Text>
          <Text style={styles.faqAnswer}>
            • Aguarde a balança estabilizar completamente{'\n'}
            • Certifique-se de estar descalço{'\n'}
            • Verifique se a balança está em superfície plana{'\n'}
            • Calibre a balança se necessário
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Como ver meu histórico?</Text>
          <Text style={styles.faqAnswer}>
            Acesse a aba "Histórico" na barra inferior ou pelo menu lateral.
            Lá você encontra todas as suas pesagens anteriores.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Posso exportar meus dados?</Text>
          <Text style={styles.faqAnswer}>
            Em breve! Estamos trabalhando na funcionalidade de exportar
            seus dados em PDF e Excel.
          </Text>
        </View>
      </View>

      {/* Recursos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Recursos do App</Text>

        <View style={styles.featureItem}>
          <Ionicons name="fitness" size={24} color="#2196F3" />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Pesagem Precisa</Text>
            <Text style={styles.featureDesc}>
              Precisão de 0.01 kg (2 decimais)
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Ionicons name="trending-up" size={24} color="#4CAF50" />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Gráfico em Tempo Real</Text>
            <Text style={styles.featureDesc}>
              Veja seu peso subindo enquanto pesa
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Ionicons name="stats-chart" size={24} color="#FF9800" />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Estatísticas Detalhadas</Text>
            <Text style={styles.featureDesc}>
              IMC, gordura, massa muscular e mais
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Ionicons name="time" size={24} color="#9C27B0" />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Histórico Completo</Text>
            <Text style={styles.featureDesc}>
              Todas as suas pesagens salvas
            </Text>
          </View>
        </View>
      </View>

      {/* Contato */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📞 Entre em Contato</Text>

        <TouchableOpacity style={styles.contactButton} onPress={handleEmail}>
          <Ionicons name="mail" size={24} color="#FFFFFF" />
          <Text style={styles.contactButtonText}>Email: suporte@app.com</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactButton} onPress={handleWhatsApp}>
          <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
          <Text style={styles.contactButtonText}>WhatsApp: (11) 99999-9999</Text>
        </TouchableOpacity>
      </View>

      {/* Informações */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Versão 1.0.0</Text>
        <Text style={styles.footerText}>© 2025 - Balança Inteligente</Text>
        <Text style={styles.footerText}>Desenvolvido com ❤️</Text>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  faqItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  featureContent: {
    flex: 1,
    marginLeft: 15,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: '#666',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  footer: {
    alignItems: 'center',
    padding: 30,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
});