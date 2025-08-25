import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Modal,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
// Sesli asistan kaldırıldı
import { notificationService, updateNotificationSettings } from '../utils/notificationService';
import { COLORS, FONTS, standardTextStyles } from '../constants/typography';
import { triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser, logout } from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteAllUserData } from '../services/firestoreService';
import { deleteUser } from 'firebase/auth';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';


type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { themeType, setThemeType, themeColors } = useTheme();
  
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  // autoStart kaldırıldı
  const darkMode = themeType === 'dark';
  // Persisted preferences yükle
  useEffect(() => {
    (async () => {
      try {
        // auto_start_enabled kaldırıldı
        const hapticStored = await AsyncStorage.getItem('haptic_enabled');
        if (hapticStored !== null) setHapticFeedback(hapticStored === 'true');
        const soundStored = await AsyncStorage.getItem('sound_enabled');
        if (soundStored !== null) setSoundEnabled(soundStored === 'true');
      } catch {}
    })();
  }, []);
  // const [voiceEnabled, setVoiceEnabled] = useState(voiceAssistant.isVoiceEnabled());
  // const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
  //   language: 'tr-TR',
  //   pitch: 1.0,
  //   rate: 0.8,
  //   voice: 'female'
  // });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('09:00');
  const handleOpenLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Hata', 'Bağlantı açılamadı');
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Hesabımı Sil',
      'Tüm verileriniz kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const currentUser = getCurrentUser();
              if (!currentUser) {
                Alert.alert('Hata', 'Kullanıcı bulunamadı');
                return;
              }
              await deleteAllUserData(currentUser.uid);
              await deleteUser(currentUser);
              await logout();
            } catch (error: any) {
              Alert.alert('Hata', 'Hesap silinirken bir sorun oluştu.');
            }
          }
        },
      ]
    );
  };

  const handleNotificationsToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    if (value) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        if (req.status !== 'granted') {
          Alert.alert(
            'İzin Gerekli',
            'Bildirim izni olmadan hatırlatıcı gönderemeyiz. Ayarlar > Bildirimler bölümünden izin verebilirsiniz.'
          );
          setNotificationsEnabled(false);
          return;
        }
      }
    } else {
      try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch {}
    }
  };
  // İstatistikler için örnek state (ileride gerçek verilerle doldurulacak)
  const [stats, setStats] = useState({
    totalSessions: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastSessionDate: '-',
    favoriteTechniques: [],
  });





  const handleResetStats = () => {
    triggerHapticFeedback(HapticType.WARNING);
    Alert.alert(
      'İstatistikleri Sıfırla',
      'Tüm istatistikleriniz silinecek. Bu işlem geri alınamaz.',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: () => {
            triggerHapticFeedback(HapticType.SUCCESS);
            Alert.alert('Başarılı', 'İstatistikleriniz sıfırlandı.');
          },
        },
      ]
    );
  };

  const handleSwitchChange = async (value: boolean, type: string) => {
    triggerHapticFeedback(HapticType.SELECTION);
    switch (type) {
      case 'haptic':
        setHapticFeedback(value);
        try { await AsyncStorage.setItem('haptic_enabled', value ? 'true' : 'false'); } catch {}
        break;
      case 'sound':
        setSoundEnabled(value);
        try { await AsyncStorage.setItem('sound_enabled', value ? 'true' : 'false'); } catch {}
        break;
      // autoStart kaldırıldı
      // case 'voice':
      //   setVoiceEnabled(value);
      //   if (value) {
      //     voiceAssistant.toggleVoiceAssistant();
      //   } else {
      //     voiceAssistant.toggleVoiceAssistant();
      //   }
      //   break;

      case 'darkMode':
        setThemeType(value ? 'dark' : 'light');
        break;
    }
  };

  const handleNavigation = (screen: string) => {
    triggerHapticFeedback(HapticType.LIGHT);
    navigation.navigate(screen as any);
  };

  return (
    <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover">
      <ScrollView style={{ flex: 1, backgroundColor: 'transparent' }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>

          
          <View style={[styles.settingItem, { backgroundColor: 'rgba(245, 245, 220, 0.1)', borderColor: '#DDD', borderWidth: 1, borderRadius: 12, padding: 16 }]}>
            <View style={styles.settingInfo}>
              <Text style={[standardTextStyles.label, { color: '#F5F5DC', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Haptic Feedback</Text>
              <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                Nefes döngülerinde titreşim
              </Text>
            </View>
            <Switch
              value={hapticFeedback}
              onValueChange={(value) => handleSwitchChange(value, 'haptic')}
              trackColor={{ false: COLORS.gray[400], true: COLORS.primary }}
              thumbColor={hapticFeedback ? COLORS.white : COLORS.gray[300]}
            />
          </View>

          <View style={[styles.settingItem, { backgroundColor: 'rgba(245, 245, 220, 0.1)', borderColor: '#DDD', borderWidth: 1, borderRadius: 12, padding: 16 }]}>
            <View style={styles.settingInfo}>
              <Text style={[standardTextStyles.label, { color: '#F5F5DC', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Ses Efektleri</Text>
              <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                Nefes komutları ve sesli rehberlik
              </Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={(value) => handleSwitchChange(value, 'sound')}
              trackColor={{ false: COLORS.gray[400], true: COLORS.primary }}
              thumbColor={soundEnabled ? COLORS.white : COLORS.gray[300]}
            />
          </View>

          {/* <View style={[styles.settingItem, { backgroundColor: 'rgba(245, 245, 220, 0.1)', borderColor: '#DDD', borderWidth: 1, borderRadius: 12, padding: 16 }]}>
            <View style={styles.settingInfo}>
              <Text style={[standardTextStyles.label, { color: '#F5F5DC', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Sesli Asistan</Text>
              <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                Türkçe sesli komutlar ve rehberlik
              </Text>
            </View>
            <Switch
              value={voiceEnabled}
              onValueChange={(value) => handleSwitchChange(value, 'voice')}
              trackColor={{ false: COLORS.gray[400], true: COLORS.primary }}
              thumbColor={voiceEnabled ? COLORS.white : COLORS.gray[300]}
            />
          </View> */}

          {/* Otomatik Başlat kaldırıldı */}



          <TouchableOpacity 
            style={[styles.settingItem, { backgroundColor: 'rgba(245, 245, 220, 0.1)', borderColor: '#DDD', borderWidth: 1, borderRadius: 12, padding: 16, flexDirection: 'column', alignItems: 'flex-start' }]}
            onPress={() => handleNavigation('NotificationSettings')}
            activeOpacity={0.8}
          >
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>🔔 Bildirim Ayarları</Text>
            <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', marginTop: 6, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Bildirimler nefes egzersizi hatırlatmaları içindir; istenildiğinde kapatılabilir.</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, styles.dangerButton, { justifyContent: 'center' }]}
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
          >
            <Text style={[standardTextStyles.bodyMedium, styles.dangerButtonText]}>Hesabımı Sil</Text>
          </TouchableOpacity>
        </View>






        <View style={styles.footer}>
          <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            Nefes Egzersizi v1.0.0
          </Text>
          <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            Sakinleş, odaklan ve yenilen
          </Text>
          <TouchableOpacity onPress={() => handleOpenLink('https://breathingapp-7662b.web.app/privacy.html')} activeOpacity={0.8}>
            <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', marginTop: 8, textDecorationLine: 'underline' }]}>Gizlilik Politikası</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleOpenLink('https://breathingapp-7662b.web.app/terms.html')} activeOpacity={0.8}>
            <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', marginTop: 4, textDecorationLine: 'underline' }]}>Kullanım Şartları</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 120,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  section: {
    marginBottom: 30,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    ...standardTextStyles.sectionTitle,
    color: '#F5F5DC',
    marginBottom: 16,
    paddingLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    shadowColor: 'transparent',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    ...standardTextStyles.label,
    color: '#F5F5DC',
    marginBottom: 4,
  },
  settingDescription: {
    ...standardTextStyles.bodySmall,
    color: '#F5F5DC',
  },

  dangerButton: {
    backgroundColor: COLORS.error + '10',
    borderWidth: 1,
    borderColor: COLORS.error + '20',
  },
  dangerButtonText: {
    ...standardTextStyles.bodyMedium,
    color: COLORS.error,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  footerText: {
    ...standardTextStyles.bodyMedium,
    color: COLORS.text,
    marginBottom: 4,
  },
  footerSubtext: {
    ...standardTextStyles.bodySmall,
    color: COLORS.textSecondary,
  },
  statsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statsItem: {
    flex: 1,
    alignItems: 'center',
  },
  statsValue: {
    ...standardTextStyles.cardTitle,
    color: COLORS.primary,
  },
  statsLabel: {
    ...standardTextStyles.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

 