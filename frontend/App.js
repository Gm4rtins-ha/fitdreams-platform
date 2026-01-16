// frontend/App.js

import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { StatusBar } from 'expo-status-bar'; // ✅ (se você usa Expo)
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Estilos para a tela de carregamento inicial
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FB',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

// Componente para a tela de carregamento inicial
function InitialLoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4A90E2" />
      <Text style={styles.loadingText}>Carregando aplicativo...</Text>
    </View>
  );
}

// Componente principal que usa o AuthProvider e o AppNavigator
function RootApp() {
  const { isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return <InitialLoadingScreen />;
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootApp />
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
