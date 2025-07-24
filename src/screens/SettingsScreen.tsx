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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { voiceAssistant, VoiceSettings } from '../utils/voiceAssistant';
import { notificationService, updateNotificationSettings } from '../utils/notificationService';
import { COLORS, FONTS } from '../constants/typography';
import { triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { themeType, setThemeType, themeColors } = useTheme();
  
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoStart, setAutoStart] = useState(false);
  const darkMode = themeType === 'dark';
  const [voiceEnabled, setVoiceEnabled] = useState(voiceAssistant.isVoiceEnabled());
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    language: 'tr-TR',
    pitch: 1.0,
    rate: 0.8,
    voice: 'female'
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('09:00');
  const CYCLE_KEY = 'quick_exercise_cycles';
  const [cycleModalVisible, setCycleModalVisible] = useState(false);
  const [cycleCount, setCycleCount] = useState(5);
  const [pendingCycle, setPendingCycle] = useState(5);
  // İstatistikler için örnek state (ileride gerçek verilerle doldurulacak)
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalMinutes: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastSessionDate: '-',
    favoriteTechniques: [],
  });

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(CYCLE_KEY);
      if (stored) {
        setCycleCount(Number(stored));
        setPendingCycle(Number(stored));
      }
    })();
  }, []);

  const openCycleModal = () => {
    setPendingCycle(cycleCount);
    setCycleModalVisible(true);
  };
  const closeCycleModal = () => setCycleModalVisible(false);
  const saveCycle = async () => {
    setCycleCount(pendingCycle);
    await AsyncStorage.setItem(CYCLE_KEY, String(pendingCycle));
    setCycleModalVisible(false);
  };

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

  const handleSwitchChange = (value: boolean, type: string) => {
    triggerHapticFeedback(HapticType.SELECTION);
    switch (type) {
      case 'haptic':
        setHapticFeedback(value);
        break;
      case 'sound':
        setSoundEnabled(value);
        break;
      case 'voice':
        setVoiceEnabled(value);
        if (value) {
          voiceAssistant.toggleVoiceAssistant();
        } else {
          voiceAssistant.toggleVoiceAssistant();
        }
        break;
      case 'autoStart':
        setAutoStart(value);
        break;
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
    <View style={[styles.container, { backgroundColor: themeColors.background }] }>
      <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: themeColors.background }] }>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Genel Ayarlar</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingDescription}>
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

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Ses Efektleri</Text>
              <Text style={styles.settingDescription}>
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

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Sesli Asistan</Text>
              <Text style={styles.settingDescription}>
                Türkçe sesli komutlar ve rehberlik
              </Text>
            </View>
            <Switch
              value={voiceEnabled}
              onValueChange={(value) => handleSwitchChange(value, 'voice')}
              trackColor={{ false: COLORS.gray[400], true: COLORS.primary }}
              thumbColor={voiceEnabled ? COLORS.white : COLORS.gray[300]}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Otomatik Başlat</Text>
              <Text style={styles.settingDescription}>
                Egzersiz seçildiğinde otomatik başlat
              </Text>
            </View>
            <Switch
              value={autoStart}
              onValueChange={(value) => handleSwitchChange(value, 'autoStart')}
              trackColor={{ false: COLORS.gray[400], true: COLORS.primary }}
              thumbColor={autoStart ? COLORS.white : COLORS.gray[300]}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Karanlık Mod</Text>
              <Text style={styles.settingDescription}>
                Göz yorgunluğunu azaltır
              </Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={(value) => handleSwitchChange(value, 'darkMode')}
              trackColor={{ false: COLORS.gray[400], true: COLORS.primary }}
              thumbColor={darkMode ? COLORS.white : COLORS.gray[300]}
            />
          </View>

          <TouchableOpacity 
            style={styles.settingButton}
            onPress={() => handleNavigation('NotificationSettings')}
            activeOpacity={0.8}
          >
            <Text style={styles.settingButtonText}>🔔 Bildirim Ayarları</Text>
            <Text style={styles.settingButtonSubtext}>
              Uyku/uyanma saatleri ve bildirim tercihleri
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Egzersiz Ayarları</Text>
          <TouchableOpacity style={styles.settingButton} activeOpacity={0.8} onPress={openCycleModal}>
            <Text style={styles.settingButtonText}>🔄 Döngü Sayısını Ayarla</Text>
            <Text style={styles.settingButtonSubtext}>Hızlı egzersizler için: {cycleCount}</Text>
          </TouchableOpacity>
        </View>
        <Modal
          visible={cycleModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeCycleModal}
        >
          <View style={modalStyles.overlay}>
            <View style={modalStyles.modal}>
              <Text style={modalStyles.title}>Döngü Sayısı Seç</Text>
              <View style={modalStyles.pickerRow}>
                {[...Array(10)].map((_, i) => (
                  <TouchableOpacity
                    key={i+1}
                    style={[modalStyles.cycleButton, pendingCycle === i+1 && modalStyles.selectedCycle]}
                    onPress={() => setPendingCycle(i+1)}
                  >
                    <Text style={[modalStyles.cycleText, pendingCycle === i+1 && modalStyles.selectedCycleText]}>{i+1}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={modalStyles.buttonRow}>
                <TouchableOpacity style={modalStyles.cancelButton} onPress={closeCycleModal}>
                  <Text style={modalStyles.cancelText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={modalStyles.saveButton} onPress={saveCycle}>
                  <Text style={modalStyles.saveText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Hakkında bölümü ve ilgili butonlar kaldırıldı */}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Nefes Egzersizi v1.0.0
          </Text>
          <Text style={styles.footerSubtext}>
            Sakinleş, odaklan ve yenilen
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 16,
    paddingLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
  },
  settingButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingButtonText: {
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.text,
  },
  settingButtonSubtext: {
    fontSize: 12,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  dangerButton: {
    backgroundColor: COLORS.error + '10',
    borderWidth: 1,
    borderColor: COLORS.error + '20',
  },
  dangerButtonText: {
    fontSize: 16,
    fontFamily: 'Tahoma',
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
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.text,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 14,
    fontFamily: 'Tahoma',
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
    fontSize: 22,
    fontFamily: 'Tahoma',
    color: COLORS.primary,
  },
  statsLabel: {
    fontSize: 13,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: 320,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Tahoma',
    marginBottom: 20,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 24,
  },
  cycleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    margin: 6,
  },
  selectedCycle: {
    backgroundColor: COLORS.primary,
  },
  cycleText: {
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.text,
  },
  selectedCycleText: {
    color: COLORS.white,
    fontFamily: 'Tahoma',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: COLORS.error,
    fontSize: 16,
    fontFamily: 'Tahoma',
  },
  saveText: {
    color: COLORS.primary,
    fontSize: 16,
    fontFamily: 'Tahoma',
  },
}); 