import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let Notifications = null;
try {
  Notifications = require('expo-notifications');
  console.log('✅ expo-notifications importado');
} catch (error) {
  console.warn('⚠️ expo-notifications não disponível:', error.message);
}

if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (error) {
    console.warn('⚠️ Erro ao configurar notification handler:', error);
  }
}

class NotificationService {
  constructor() {
    this.initialized = false;
    this.available = Notifications !== null;
    console.log('📦 NotificationService criado. Disponível:', this.available);
  }

  async getSettings() {
    try {
      const settings = await AsyncStorage.getItem('notification_settings');
      if (settings) {
        return JSON.parse(settings);
      }
      return {
        weighingEnabled: true,
        hydrationEnabled: true,
        motivationEnabled: true,
        weighingHour: 7,
        weighingMinute: 0,
        hydrationInterval: 2,
        selectedDays: [1, 2, 3, 4, 5, 6, 7],
      };
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      return {
        weighingEnabled: true,
        hydrationEnabled: true,
        motivationEnabled: true,
        weighingHour: 7,
        weighingMinute: 0,
        hydrationInterval: 2,
        selectedDays: [1, 2, 3, 4, 5, 6, 7],
      };
    }
  }

  isAvailable() {
    return this.available && Notifications !== null;
  }

  async initialize() {
    if (!this.isAvailable()) {
      console.warn('⚠️ expo-notifications não disponível');
      return false;
    }
    if (this.initialized) {
      console.log('✅ NotificationService já inicializado');
      return true;
    }
    try {
      console.log('🔔 Inicializando serviço de notificações...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('⚠️ Permissão de notificação negada');
        return false;
      }
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'FitDreams',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4A90E2',
        });
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Lembretes',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });
      }
      this.initialized = true;
      console.log('✅ Serviço de notificações inicializado');
      return true;
    } catch (error) {
      console.error('❌ Erro ao inicializar notificações:', error);
      return false;
    }
  }

  async isEnabled() {
    try {
      const enabled = await AsyncStorage.getItem('notifications');
      return enabled === null || JSON.parse(enabled) === true;
    } catch {
      return true;
    }
  }

  async scheduleWeighingReminders() {
    if (!this.isAvailable()) return;
    const enabled = await this.isEnabled();
    if (!enabled) return;
    try {
      const settings = await this.getSettings();
      if (!settings.weighingEnabled) {
        console.log('Lembretes de pesagem desabilitados');
        return;
      }
      await this.cancelWeighingReminders();
      const { weighingHour, weighingMinute, selectedDays } = settings;
      console.log(`Agendando pesagem para ${weighingHour}:${weighingMinute} nos dias:`, selectedDays);
      for (const day of selectedDays) {
        await Notifications.scheduleNotificationAsync({
          identifier: `weighing_reminder_${day}`,
          content: {
            title: '⚖️ Hora de se pesar!',
            body: 'Comece o dia acompanhando seu progresso',
            data: { type: 'weighing_reminder', day },
            sound: 'default',
          },
          trigger: {
            weekday: day,
            hour: weighingHour,
            minute: weighingMinute,
            repeats: true,
          },
        });
      }
      console.log(`${selectedDays.length} lembretes de pesagem agendados`);
    } catch (error) {
      console.error('Erro ao agendar lembretes:', error);
    }
  }

  async cancelWeighingReminders() {
    if (!this.isAvailable()) return;
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      const weighingNotifications = notifications.filter(n => n.identifier.includes('weighing_reminder'));
      for (const notification of weighingNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    } catch (error) {
      console.error('Erro ao cancelar lembretes:', error);
    }
  }

  async scheduleHydrationReminders() {
    if (!this.isAvailable()) return;
    const enabled = await this.isEnabled();
    if (!enabled) return;
    try {
      const settings = await this.getSettings();
      if (!settings.hydrationEnabled) {
        console.log('Lembretes de hidratação desabilitados');
        return;
      }
      await this.cancelHydrationReminders();
      const { hydrationInterval } = settings;
      const hours = [];
      for (let hour = 8; hour <= 20; hour += hydrationInterval) {
        if (hour <= 20) {
          hours.push(hour);
        }
      }
      console.log(`Agendando hidratação a cada ${hydrationInterval}h:`, hours);
      for (const hour of hours) {
        await Notifications.scheduleNotificationAsync({
          identifier: `hydration_${hour}`,
          content: {
            title: '💧 Beba água!',
            body: 'Mantenha-se hidratado para uma vida saudável',
            data: { type: 'hydration' },
          },
          trigger: {
            hour,
            minute: 0,
            repeats: true,
          },
        });
      }
      console.log(`${hours.length} lembretes de hidratação agendados`);
    } catch (error) {
      console.error('Erro ao agendar hidratação:', error);
    }
  }

  async cancelHydrationReminders() {
    if (!this.isAvailable()) return;
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      const hydrationNotifications = notifications.filter(n => n.identifier.includes('hydration'));
      for (const notification of hydrationNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    } catch (error) {
      console.error('Erro ao cancelar hidratação:', error);
    }
  }

  async sendAchievementNotification(title, body) {
    if (!this.isAvailable()) return;
    const enabled = await this.isEnabled();
    if (!enabled) return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🎉 ${title}`,
          body,
          data: { type: 'achievement' },
          sound: 'default',
        },
        trigger: null,
      });
      console.log('Notificação de conquista enviada');
    } catch (error) {
      console.error('Erro ao enviar conquista:', error);
    }
  }

  async scheduleMotivationalMessages() {
    if (!this.isAvailable()) return;
    const enabled = await this.isEnabled();
    if (!enabled) return;
    try {
      const settings = await this.getSettings();
      if (!settings.motivationEnabled) {
        console.log('Mensagens motivacionais desabilitadas');
        return;
      }
      await this.cancelMotivationalMessages();
      const messages = [
        { title: '💪 Você consegue!', body: 'Cada passo conta. Continue firme!' },
        { title: '🌟 Progresso', body: 'Pequenas mudanças trazem grandes resultados' },
        { title: '🔥 Motivação', body: 'Seu corpo agradece por cuidar dele!' },
      ];
      for (let i = 0; i < messages.length; i++) {
        const { title, body } = messages[i];
        await Notifications.scheduleNotificationAsync({
          identifier: `motivation_${i}`,
          content: {
            title,
            body,
            data: { type: 'motivation' },
          },
          trigger: {
            weekday: 2,
            hour: 9,
            minute: 0,
            repeats: true,
          },
        });
      }
      console.log('Mensagens motivacionais agendadas');
    } catch (error) {
      console.error('Erro ao agendar motivação:', error);
    }
  }

  async cancelMotivationalMessages() {
    if (!this.isAvailable()) return;
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      const motivationNotifications = notifications.filter(n => n.identifier.includes('motivation'));
      for (const notification of motivationNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    } catch (error) {
      console.error('Erro ao cancelar motivação:', error);
    }
  }

  async cancelAllNotifications() {
    if (!this.isAvailable()) return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Todas as notificações canceladas');
    } catch (error) {
      console.error('Erro ao cancelar notificações:', error);
    }
  }

  async listScheduledNotifications() {
    if (!this.isAvailable()) return [];
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('Notificações agendadas:', notifications.length);
      notifications.forEach(n => {
        console.log(`  - ${n.identifier}: ${n.content.title}`);
      });
      return notifications;
    } catch (error) {
      console.error('Erro ao listar notificações:', error);
      return [];
    }
  }

  async setupAllNotifications() {
    if (!this.isAvailable()) {
      console.warn('expo-notifications não disponível');
      return;
    }
    const initialized = await this.initialize();
    if (!initialized) {
      console.log('Não foi possível inicializar notificações');
      return;
    }
    const enabled = await this.isEnabled();
    if (!enabled) {
      console.log('Notificações desabilitadas pelo usuário');
      await this.cancelAllNotifications();
      return;
    }
    console.log('Configurando todas as notificações...');
    const settings = await this.getSettings();
    console.log('Usando configurações:', settings);
    await this.scheduleWeighingReminders();
    await this.scheduleHydrationReminders();
    await this.scheduleMotivationalMessages();
    const scheduled = await this.listScheduledNotifications();
    console.log(`${scheduled.length} notificações configuradas!`);
  }
}

const notificationService = new NotificationService();
export default notificationService;