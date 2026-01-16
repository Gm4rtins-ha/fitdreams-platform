// frontend/src/navigation/AppNavigator.js
import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Telas de Autenticação
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Telas Principais
import HomeScreen from '../screens/main/HomeScreen';
import HistoryScreen from '../screens/main/HistoryScreen'; // ✅ histórico de PESAGENS
import ProfileScreen from '../screens/main/ProfileScreen';
import StatisticsScreen from '../screens/main/BodyEvolutionScreen';

// Scanner Alimentício
import FoodScannerScreen from '../screens/food/FoodScannerScreen';
import FoodHistoryScreen from '../screens/food/FoodHistoryScreen'; // ✅ histórico do SCANNER

// Pesagem
import WeightResultScreen from '../screens/weight/WeightResultScreen';
import WeightScanScreen from '../screens/weight/WeightScanScreen';
import PesoTendenciaScreen from '../screens/weight/PesoTendenciaScreen';
import MetricDetailScreen from '../screens/weight/MetricDetailScreen';

// 📄 NOVAS TELAS – Análises de Exames
import BloodExamScreen from '../screens/exams/BloodExamScreen';
import BloodExamResultScreen from '../screens/exams/BloodExamResultScreen';

// Outras
import NotificationSettingsScreen from '../screens/settings/NotificationSettingsScreen';
import BLEDebugScreen from '../screens/other/BLEDebugScreen';
import UserProfileScreen from '../screens/other/UserProfileScreen';

//Telas da HomeScreen
import BodyMeasurementsScreen from '../screens/main/BodyMeasurementsScreen';


// Contexto de Autenticação
import { useAuth } from '../contexts/AuthContext';

const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();
const MainTab = createBottomTabNavigator();

const FoodStack = createNativeStackNavigator();
const ExamStack = createNativeStackNavigator();

// 🔹 STACK DO SCANNER (Scanner + Histórico ALIMENTAR)
function FoodStackScreens() {
  return (
    <FoodStack.Navigator initialRouteName="FoodScanner">
      <FoodStack.Screen
        name="FoodScanner"
        component={FoodScannerScreen}
        options={{ headerShown: false }}
      />

      {/* ✅ AQUI estava o HistoryScreen (pesagens). Troquei para FoodHistoryScreen */}
      <FoodStack.Screen
        name="FoodHistory"
        component={FoodHistoryScreen}
        options={{ headerShown: false }}
      />
    </FoodStack.Navigator>
  );
}

// 🔹 STACK DAS ANÁLISES (PDF + Resultado)
function ExamStackScreens() {
  return (
    <ExamStack.Navigator initialRouteName="BloodExamScreen">
      <ExamStack.Screen
        name="BloodExamScreen"
        component={BloodExamScreen}
        options={{ headerShown: false }}
      />
      <ExamStack.Screen
        name="BloodExamResultScreen"
        component={BloodExamResultScreen}
        options={{ headerShown: false }}
      />
    </ExamStack.Navigator>
  );
}

// 🔹 BOTTOM TABS
function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 90 : 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'ScannerTab') {
            iconName = focused ? 'fast-food' : 'fast-food-outline';
          } else if (route.name === 'ExamTab') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <MainTab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: 'Início' }}
      />

      {/* ✅ Scanner agora usa FoodStack (Scanner + FoodHistory) */}
      <MainTab.Screen
        name="ScannerTab"
        component={FoodStackScreens}
        options={{ title: 'Scanner' }}
      />

      <MainTab.Screen
        name="ExamTab"
        component={ExamStackScreens}
        options={{ title: 'Análises' }}
      />

      <MainTab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Perfil' }}
      />
    </MainTab.Navigator>
  );
}

// 🔹 MAIN STACK
function MainStackScreens() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      {/* Tabs principais */}
      <MainStack.Screen name="MainTabs" component={MainTabs} />

      {/* Telas de pesagem */}
      <MainStack.Screen name="WeightResult" component={WeightResultScreen} />
      <MainStack.Screen name="WeightScan" component={WeightScanScreen} />

      {/* ✅ Histórico de PESAGENS (ficou fora do ScannerTab agora) */}
      <MainStack.Screen name="WeightHistory" component={HistoryScreen} />

      {/* Outras */}
      <MainStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <MainStack.Screen name="BLEDebug" component={BLEDebugScreen} />
      <MainStack.Screen name="PesoTendencia" component={PesoTendenciaScreen} />
      <MainStack.Screen name="MetricDetail" component={MetricDetailScreen} />

      {/* Estatísticas */}
      <MainStack.Screen name="BodyEvolution" component={StatisticsScreen} />

      {/* Medidas corporais */}
      <MainStack.Screen name="BodyMeasurements" component={BodyMeasurementsScreen} />

      {/* Editar Perfil */}
      <MainStack.Screen name="UserProfile" component={UserProfileScreen} />
    </MainStack.Navigator>
  );
}

// 🔹 FLUXO DE AUTENTICAÇÃO
function AuthFlowScreens() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <AuthStack.Screen name="MainApp" component={MainStackScreens} />
      ) : (
        <>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </AuthStack.Navigator>
  );
}

// 🔹 ROOT
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <AuthFlowScreens />
    </NavigationContainer>
  );
}
