import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getCurrentUser } from '../services/authService';
import { COLORS, FONTS, standardTextStyles } from '../constants/typography';
import { triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';
import { checkPremiumStatus } from '../utils/premiumUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

type PremiumRemindersScreenNavigationProp = StackNavigationProp<any, 'PremiumReminders'>;

interface ReminderSettings {
  enabled: boolean;
  time: string;
  days: string[];
  message: string;
}

interface PremiumReminderSettings {
  morningReminder: ReminderSettings;
  afternoonReminder: ReminderSettings;
  eveningReminder: ReminderSettings;
  customReminders: ReminderSettings[];
}

export default function PremiumRemindersScreen() {
  const navigation = useNavigation<PremiumRemindersScreenNavigationProp>();
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<PremiumReminderSettings>({
    morningReminder: {
      enabled: true,
      time: '08:00',
      days: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'],
      message: 'Güne nefes egzersizi ile başlayın! 🌅'
    },
    afternoonReminder: {
      enabled: true,
      time: '14:00',
      days: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'],
      message: 'Öğle arası nefes molası! ☀️'
    },
    eveningReminder: {
      enabled: true,
      time: '20:00',
      days: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'],
      message: 'Günü sakinleştirici nefes ile bitirin! 🌙'
    },
    customReminders: []
  });

  const preloadBackground = async () => {
    setBackgroundLoaded(true);
  };

  // Premium kontrolü
  useEffect(() => {
    const checkPremium = async () => {
      const premiumStatus = await checkPremiumStatus();
      setIsPremium(premiumStatus);
      
      if (!premiumStatus) {
        Alert.alert(
          'Premium Gerekli',
          'Bu özelliği kullanmak için premium üye olmanız gerekmektedir.',
          [
            {
              text: 'Premium Ol',
              onPress: () => navigation.navigate('Premium')
            },
            {
              text: 'Geri Dön',
              onPress: () => navigation.goBack(),
              style: 'cancel'
            }
          ]
        );
      }
    };
    
    checkPremium();
  }, [navigation]);

  // Hatırlatıcı ayarlarını yükle
  useEffect(() => {
    const loadReminderSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem('premium_reminder_settings');
        if (storedSettings) {
          setSettings(JSON.parse(storedSettings));
        }
      } catch (error) {
        console.error('Hatırlatıcı ayarları yükleme hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isPremium) {
      loadReminderSettings();
    }
  }, [isPremium]);

  // Component mount olduğunda state'i temizle
  useEffect(() => {
    console.log('PremiumRemindersScreen: Component mount');
    const initializeScreen = async () => {
      await preloadBackground();
    };
    
    initializeScreen();
  }, []);

  const handleToggleReminder = async (reminderType: keyof PremiumReminderSettings) => {
    triggerHapticFeedback(HapticType.SELECTION);
    
    // customReminders hariç diğer reminder'lar için
    if (reminderType !== 'customReminders') {
      const updatedSettings = {
        ...settings,
        [reminderType]: {
          ...settings[reminderType] as ReminderSettings,
          enabled: !(settings[reminderType] as ReminderSettings).enabled
        }
      };
    
      setSettings(updatedSettings);
      
      try {
        await AsyncStorage.setItem('premium_reminder_settings', JSON.stringify(updatedSettings));
        Alert.alert(
          'Başarılı',
          `${reminderType === 'morningReminder' ? 'Sabah' : reminderType === 'afternoonReminder' ? 'Öğle' : 'Akşam'} hatırlatıcısı ${(updatedSettings[reminderType] as ReminderSettings).enabled ? 'aktifleştirildi' : 'devre dışı bırakıldı'}.`
        );
      } catch (error) {
        console.error('Hatırlatıcı ayarları kaydetme hatası:', error);
        Alert.alert('Hata', 'Ayarlar kaydedilemedi.');
      }
    }
  };

  const handleTimeChange = async (reminderType: keyof PremiumReminderSettings, newTime: string) => {
    const updatedSettings = {
      ...settings,
      [reminderType]: {
        ...settings[reminderType],
        time: newTime
      }
    };
    
    setSettings(updatedSettings);
    
    try {
      await AsyncStorage.setItem('premium_reminder_settings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Hatırlatıcı ayarları kaydetme hatası:', error);
    }
  };

  const handleMessageChange = async (reminderType: keyof PremiumReminderSettings, newMessage: string) => {
    const updatedSettings = {
      ...settings,
      [reminderType]: {
        ...settings[reminderType],
        message: newMessage
      }
    };
    
    setSettings(updatedSettings);
    
    try {
      await AsyncStorage.setItem('premium_reminder_settings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Hatırlatıcı ayarları kaydetme hatası:', error);
    }
  };

  const handleAddCustomReminder = () => {
    Alert.alert(
      'Özel Hatırlatıcı Ekle',
      'Bu özellik yakında eklenecek. Şimdilik varsayılan hatırlatıcıları kullanabilirsiniz.',
      [{ text: 'Tamam' }]
    );
  };

  const handleTestReminder = (reminderType: keyof PremiumReminderSettings) => {
    if (reminderType !== 'customReminders') {
      Alert.alert(
        'Test Hatırlatıcısı',
        (settings[reminderType] as ReminderSettings).message,
        [{ text: 'Tamam' }]
      );
    }
  };

  if (!isPremium) {
    return null;
  }

  if (loading) {
    return (
      <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F5F5DC" />
          <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginTop: 16, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            Hatırlatıcı ayarlarınız yükleniyor...
          </Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover" onLoad={() => setBackgroundLoaded(true)}>
      <ScrollView style={{ flex: 1, backgroundColor: 'transparent' }} contentContainerStyle={{ paddingHorizontal: 15, paddingTop: 90 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[standardTextStyles.mainTitle, { color: '#F5F5DC', marginBottom: 8, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            Premium Hatırlatıcılar
          </Text>
          <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', textAlign: 'center', marginBottom: 10, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            Kişiselleştirilebilir nefes egzersizi hatırlatıcıları
          </Text>
        </View>

        {/* Sabah Hatırlatıcısı */}
        <View style={styles.reminderCard}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderInfo}>
              <Text style={{ fontSize: 24, marginRight: 12 }}>🌅</Text>
              <View>
                <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                  Sabah Hatırlatıcısı
                </Text>
                <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                  {settings.morningReminder.time} - Her gün
                </Text>
              </View>
            </View>
            <Switch
              value={settings.morningReminder.enabled}
              onValueChange={() => handleToggleReminder('morningReminder')}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={settings.morningReminder.enabled ? '#fff' : '#f4f3f4'}
            />
          </View>
          
          <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginTop: 12, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            {settings.morningReminder.message}
          </Text>
          
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => handleTestReminder('morningReminder')}
          >
            <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              Test Et
            </Text>
          </TouchableOpacity>
        </View>

        {/* Öğle Hatırlatıcısı */}
        <View style={styles.reminderCard}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderInfo}>
              <Text style={{ fontSize: 24, marginRight: 12 }}>☀️</Text>
              <View>
                <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                  Öğle Hatırlatıcısı
                </Text>
                <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                  {settings.afternoonReminder.time} - Hafta içi
                </Text>
              </View>
            </View>
            <Switch
              value={settings.afternoonReminder.enabled}
              onValueChange={() => handleToggleReminder('afternoonReminder')}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={settings.afternoonReminder.enabled ? '#fff' : '#f4f3f4'}
            />
          </View>
          
          <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginTop: 12, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            {settings.afternoonReminder.message}
          </Text>
          
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => handleTestReminder('afternoonReminder')}
          >
            <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              Test Et
            </Text>
          </TouchableOpacity>
        </View>

        {/* Akşam Hatırlatıcısı */}
        <View style={styles.reminderCard}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderInfo}>
              <Text style={{ fontSize: 24, marginRight: 12 }}>🌙</Text>
              <View>
                <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                  Akşam Hatırlatıcısı
                </Text>
                <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                  {settings.eveningReminder.time} - Her gün
                </Text>
              </View>
            </View>
            <Switch
              value={settings.eveningReminder.enabled}
              onValueChange={() => handleToggleReminder('eveningReminder')}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={settings.eveningReminder.enabled ? '#fff' : '#f4f3f4'}
            />
          </View>
          
          <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginTop: 12, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            {settings.eveningReminder.message}
          </Text>
          
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => handleTestReminder('eveningReminder')}
          >
            <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              Test Et
            </Text>
          </TouchableOpacity>
        </View>

        {/* Özel Hatırlatıcı Ekle */}
        <TouchableOpacity
          style={styles.addCustomButton}
          onPress={handleAddCustomReminder}
        >
          <Text style={{ fontSize: 24, marginRight: 12 }}>➕</Text>
          <Text style={[standardTextStyles.bodyLarge, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            Özel Hatırlatıcı Ekle
          </Text>
        </TouchableOpacity>

        {/* Bilgi Kartı */}
        <View style={styles.infoCard}>
          <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 12, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            💡 Hatırlatıcı İpuçları
          </Text>
          <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            • Sabah hatırlatıcıları güne enerjik başlamanıza yardımcı olur
          </Text>
          <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            • Öğle hatırlatıcıları stres yönetiminde etkilidir
          </Text>
          <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            • Akşam hatırlatıcıları uyku kalitesini artırır
          </Text>
          <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            • Hatırlatıcıları kendi programınıza göre ayarlayın
          </Text>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  reminderCard: {
    backgroundColor: 'rgba(245, 245, 220, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  testButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  addCustomButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: 'rgba(245, 245, 220, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 