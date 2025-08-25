import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';

// Bildirim davranışını ayarla
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // İzinleri kontrol et
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Bildirim izni verilmedi!');
        return;
      }

      // Expo push token al (opsiyonel)
      if (Device.isDevice) {
        try {
          const token = await Notifications.getExpoPushTokenAsync({
            projectId: undefined, // Expo Go için undefined bırak
          });
          console.log('Push Token:', token.data);
        } catch (error) {
          console.log('Push token alınamadı (normal):', error);
        }
      }

      // Android için kanal oluştur
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('breathing-reminders', {
          name: 'Nefes Egzersizi Hatırlatıcıları',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4ECDC4',
        });
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Bildirim servisi başlatılamadı:', error);
    }
  }

  // Günlük bildirim planla
  async scheduleDailyReminder(hour: number = 9, minute: number = 0) {
    try {
      await this.initialize();
      await this.cancelAllNotifications();

      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(hour, minute, 0, 0);
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌬️ Nefes Egzersizi Zamanı!',
          body: 'Gününüzü sakinleştirici bir nefes egzersizi ile başlatın. Sadece 5 dakika!',
          data: { type: 'daily_reminder' },
          sound: 'default',
        },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: scheduledTime },
      });

      console.log(`Günlük bildirim planlandı: ${hour}:${minute}`);
    } catch (error) {
      console.error('Günlük bildirim planlanamadı:', error);
    }
  }

  // İki günlük hatırlatıcıyı birlikte planla (mevcut planları temizler)
  async scheduleDualDailyReminders(hourA: number, minuteA: number, hourB: number, minuteB: number) {
    try {
      await this.initialize();
      await this.cancelAllNotifications();

      const mkFutureDate = (h: number, m: number) => {
        const now = new Date();
        const d = new Date();
        d.setHours(h, m, 0, 0);
        if (d <= now) d.setDate(d.getDate() + 1);
        return d;
      };

      const first = mkFutureDate(hourA, minuteA);
      const second = mkFutureDate(hourB, minuteB);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌬️ Nefes Zamanı',
          body: 'Kısa bir nefes egzersizi iyi gelir.',
          data: { type: 'daily_reminder_a' },
          sound: 'default',
        },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: first },
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '😴 Uyku Öncesi Hazırlık',
          body: 'Uyumadan önce 5 dakikalık nefes egzersizi deneyin.',
          data: { type: 'daily_reminder_b' },
          sound: 'default',
        },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: second },
      });

      console.log(`Çift günlük bildirim planlandı: A=${hourA}:${minuteA}, B=${hourB}:${minuteB}`);
    } catch (error) {
      console.error('Çift günlük bildirimler planlanamadı:', error);
    }
  }

  // Motivasyonel bildirimler
  async scheduleMotivationalReminders() {
    const motivationalMessages = [
      {
        title: '🧘 Sakinleşme Zamanı',
        body: 'Stresli bir gün mü? 3 dakikalık nefes egzersizi ile sakinleşin.',
        hour: 15,
        minute: 30,
      },
      {
        title: '😴 Uyku Hazırlığı',
        body: 'Kaliteli bir uyku için 4-7-8 tekniğini deneyin.',
        hour: 21,
        minute: 0,
      },
      {
        title: '💪 Enerji Artırma',
        body: 'Gün ortası enerji düşüşü mü? Wim Hof metodu ile enerjinizi artırın.',
        hour: 14,
        minute: 0,
      },
    ];

    try {
      await this.initialize();

      for (const message of motivationalMessages) {
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(message.hour, message.minute, 0, 0);
        if (scheduledTime <= now) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: message.title,
            body: message.body,
            data: { type: 'motivational' },
            sound: 'default',
          },
          trigger: { type: SchedulableTriggerInputTypes.DATE, date: scheduledTime },
        });
      }

      console.log('Motivasyonel bildirimler planlandı');
    } catch (error) {
      console.error('Motivasyonel bildirimler planlanamadı:', error);
    }
  }

  // Egzersiz tamamlama bildirimi
  async sendExerciseCompletionNotification(exerciseName: string, duration: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Egzersiz Tamamlandı!',
          body: `${exerciseName} egzersizinizi ${duration} sürede tamamladınız. Harika iş!`,
          data: { type: 'exercise_completion' },
          sound: 'default',
        },
        trigger: null, // Hemen gönder
      });
    } catch (error) {
      console.error('Egzersiz tamamlama bildirimi gönderilemedi:', error);
    }
  }

  // Streak bildirimi
  async sendStreakNotification(days: number) {
    const messages = {
      3: '🔥 3 günlük seri! Harika gidiyorsun!',
      7: '🌟 1 haftalık seri! İnanılmaz!',
      14: '💎 2 haftalık seri! Sen bir nefes ustasısın!',
      30: '👑 1 aylık seri! Efsanevi!',
    };

    const message = messages[days as keyof typeof messages];
    if (message) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🏆 Seri Rekoru!',
            body: message,
            data: { type: 'streak' },
            sound: 'default',
          },
          trigger: null,
        });
      } catch (error) {
        console.error('Streak bildirimi gönderilemedi:', error);
      }
    }
  }

  // Tüm bildirimleri iptal et
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Tüm bildirimler iptal edildi');
    } catch (error) {
      console.error('Bildirimler iptal edilemedi:', error);
    }
  }

  // Bildirim izinlerini kontrol et
  async checkPermissions(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  // Bildirim ayarlarını güncelle
  async updateNotificationSettings(enabled: boolean, hour?: number, minute?: number) {
    if (enabled) {
      await this.scheduleDailyReminder(hour || 9, minute || 0);
      await this.scheduleMotivationalReminders();
    } else {
      await this.cancelAllNotifications();
    }
  }
}

// Global instance
export const notificationService = NotificationService.getInstance();

// Kolay kullanım fonksiyonları
export const scheduleDailyReminder = (hour?: number, minute?: number) => 
  notificationService.scheduleDailyReminder(hour, minute);

export const sendExerciseCompletion = (exerciseName: string, duration: string) => 
  notificationService.sendExerciseCompletionNotification(exerciseName, duration);

export const sendStreakNotification = (days: number) => 
  notificationService.sendStreakNotification(days);

export const updateNotificationSettings = (enabled: boolean, hour?: number, minute?: number) => 
  notificationService.updateNotificationSettings(enabled, hour, minute); 