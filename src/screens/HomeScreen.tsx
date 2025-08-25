import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Animated,
  ImageBackground,
  Modal,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout, getCurrentUser } from '../services/authService';
import { getUserProgram, getUserStats } from '../services/firestoreService';
import { PersonalizedProgram } from '../utils/programGenerator';
import { colors, theme } from '../constants/colors';
import { FONTS, standardTextStyles } from '../constants/typography';
import { HapticFeedback, triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';
import { checkPremiumStatus, deactivatePremium } from '../utils/premiumUtils';
import { openManageSubscriptions } from '../services/iapService';
import { AuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { logError, logInfo, logUserAction, logWarn } from '../utils/logger';

const { width, height } = Dimensions.get('window');

type HomeScreenNavigationProp = StackNavigationProp<any, 'Home'>;

// Her teknik için 1 döngü süresi (saniye)
const CYCLE_DURATIONS: { [key: string]: number } = {
  'diaphragmatic': 10,
  '4-7-8': 19,
  'box-breathing': 8,
  'kapalabhati': 2,
  'nadi-shodhana': 8,
  'anxiety-relief': 10,
  'ujjayi': 8,
  'sitkari': 8,
  'lion_breath': 6,
  'pursed_lip_breathing': 9,
};

// Teknik isimlerini Türkçe'ye çeviren fonksiyon
const getTechniqueDisplayName = (technique: string): string => {
  const techniqueNames: { [key: string]: string } = {
    'diaphragmatic': 'Diyafram Nefesi',
    '4-7-8': '4-7-8 Tekniği',
    'box-breathing': 'Kutu Nefesi',
    'kapalabhati': 'Kapalabhati',
    'nadi-shodhana': 'Nadi Shodhana',
    'anxiety-relief': 'Anksiyete Rahatlatma',
    'ujjayi': 'Ujjayi',
    'sitkari': 'Sitkari',
    'deep_breathing': 'Derin Nefes',
    'coherent_breathing': 'Uyumlu Nefes',
    'equal_breathing': 'Eşit Nefes',
    'alternate_nostril': 'Alternatif Burun',
    'bhramari': 'Bhramari',
    'mindful_breathing': 'Farkındalık Nefesi',
    'lion_breath': 'Aslan Nefesi',
    'pursed_lip_breathing': 'Dudak Büzme',
    'sitali': 'Sitali',
    'victorious_breath': 'Zafer Nefesi',
    'three_part_breath': 'Üç Bölüm Nefesi',
    'alternate_nostril_advanced': 'Gelişmiş Alternatif Burun',
    'bhramari_advanced': 'Gelişmiş Bhramari',
  };
  
  return techniqueNames[technique] || technique;
};

// Pastel renkler
const STAT_CARD_COLORS = [
  '#E0F7FA', // pastel mavi
  '#E8F5E9', // pastel yeşil
  '#FFFFFF', // beyaz
  '#B3E5FC', // açık mavi
  '#C8E6C9', // açık yeşil
];
const STAT_CARD_ICONS = [
  '🏆', // Toplam Egzersiz
  '⏳', // Toplam Süre
  '🔥', // Seri
  '📅', // Son Egzersiz
  '💙', // En Çok Yapılan Teknik
];

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { isGuest, logout } = useContext(AuthContext);
  const [userName, setUserName] = useState<string>('');
  // autoStart kaldırıldı (önceki state kaldırıldı)
  type UserProgramState = {
    program: PersonalizedProgram[];
    completedDays: number[] | string[];
    currentDay: number;
    isPremium?: boolean;
  } | null;
  const [userProgram, setUserProgram] = useState<UserProgramState>(null);
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    totalSessions: 0,
    totalMinutes: 0,
    currentStreak: 0,
  });
  const { themeColors } = useTheme();
  const [cycleCount, setCycleCount] = useState(5);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);

  // İstatistikler için örnek state (ileride gerçek verilerle doldurulacak)
  type StatsType = {
    totalSessions: number;
    currentStreak: number;
    longestStreak: number;
    lastSessionDate: string;
    favoriteTechniques: string[];
    techniqueCounts: { [key: string]: number };
    lastSessionTechnique: string;
  };
  const [stats, setStats] = useState<StatsType>({
    totalSessions: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastSessionDate: '-',
    favoriteTechniques: [],
    techniqueCounts: {},
    lastSessionTechnique: '-',
  });

  // Animasyon için state
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Dikkat butonu için state
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningAnim] = useState(new Animated.Value(1));
  const [isPremium, setIsPremium] = useState(false);
  const [showProgramOptionsModal, setShowProgramOptionsModal] = useState(false);

  const preloadBackground = async () => {
    // Local dosyalar için preloading'e gerek yok, sadece onLoad handler kullanılacak
    setBackgroundLoaded(true);
  };

  // Firebase'den kullanıcı verilerini yükle
  const loadUserData = async () => {
    try {
      logInfo('HomeScreen: loadUserData başladı');
      const currentUser = getCurrentUser();
      if (!currentUser) {
        logWarn('HomeScreen: Kullanıcı bulunamadı');
        setIsLoading(false);
        return;
      }

      // Kullanıcı adını al
      const displayName = currentUser.displayName;
      setUserName(displayName || '');

      // Önce premium durumunu kontrol et
      const premiumStatus = await checkPremiumStatus();
      logInfo('HomeScreen: Premium durumu kontrol edildi:', premiumStatus);
      
      // Premium iptal edilmişse, tüm premium verileri temizle
      if (!premiumStatus) {
        logInfo('HomeScreen: Premium durumu false, premium veriler temizleniyor');
        setIsPremium(false);
        setUserProgram(null);
        
        // Premium olmayan normal programı yükle
        logInfo('HomeScreen: Normal program yükleniyor...');
      const programData = await getUserProgram(currentUser.uid);
        
        if (programData && !programData.isPremium) {
          // Normal program var
          const userProgramData = {
            program: programData.program || [],
            completedDays: programData.completedDays || [],
            currentDay: programData.currentDay || 1,
            isPremium: false,
          };
          setUserProgram(userProgramData);
          logInfo('HomeScreen: Normal program yüklendi');
          logInfo('HomeScreen: currentDay:', userProgramData.currentDay);
          logInfo('HomeScreen: completedDays:', userProgramData.completedDays);
      } else {
          // Normal program da yok, AsyncStorage'dan kontrol et
          logInfo('HomeScreen: Firestore\'da normal program yok, AsyncStorage kontrol ediliyor...');
          const { getStoredProgram } = await import('../utils/programStorage');
          const storedProgram = await getStoredProgram();
          
          if (storedProgram) {
            const userProgramData = {
              program: storedProgram.program,
              completedDays: storedProgram.completedDays,
              currentDay: storedProgram.currentDay,
              isPremium: false,
            };
            setUserProgram(userProgramData);
            logInfo('HomeScreen: AsyncStorage\'dan normal program yüklendi');
            logInfo('HomeScreen: currentDay:', userProgramData.currentDay);
            logInfo('HomeScreen: completedDays:', userProgramData.completedDays);
          } else {
            // Legacy anahtar ile kayıt edilmiş olabilir: 'user_program'
            try {
              const legacyUserProgramJson = await AsyncStorage.getItem('user_program');
              if (legacyUserProgramJson) {
                const legacy = JSON.parse(legacyUserProgramJson);
                const userProgramData = {
                  program: legacy.program || [],
                  completedDays: legacy.completedDays || [],
                  currentDay: legacy.currentDay || 1,
                  isPremium: false,
                };
                setUserProgram(userProgramData);
                logInfo('HomeScreen: Legacy user_program anahtarından program yüklendi');
              } else {
                logInfo('HomeScreen: Hiçbir yerde program bulunamadı - userProgram null olarak ayarlanıyor');
                setUserProgram(null);
              }
            } catch (e) {
              logWarn('HomeScreen: Legacy user_program okuması başarısız, program yok sayılıyor');
              setUserProgram(null);
            }
          }
        }
      } else {
        // Premium aktif, premium programı yükle
        logInfo('HomeScreen: Premium aktif, premium program yükleniyor...');
        const programData = await getUserProgram(currentUser.uid);
        
        if (programData && programData.isPremium) {
          const userProgramData = {
            program: programData.program || [],
            completedDays: programData.completedDays || [],
            currentDay: programData.currentDay || 1,
            isPremium: true,
          };
          setUserProgram(userProgramData);
          setIsPremium(true);
          logInfo('HomeScreen: Premium program yüklendi');
        } else {
          logWarn('HomeScreen: Premium durumu true ama premium program bulunamadı');
          setIsPremium(false);
          setUserProgram(null);
        }
      }

      logInfo('HomeScreen: Firestore\'dan istatistik verisi alınıyor...');
      // Firestore'dan kullanıcı istatistiklerini al
      const statsData = await getUserStats(currentUser.uid);
      logInfo('HomeScreen: İstatistik verisi alındı');
      
      if (statsData) {
        setStats({
          totalSessions: statsData.totalSessions ?? 0,
          currentStreak: statsData.currentStreak ?? 0,
          longestStreak: statsData.longestStreak ?? 0,
          lastSessionDate: statsData.lastSessionDate ?? '-',
          favoriteTechniques: statsData.favoriteTechniques ?? [],
          techniqueCounts: statsData.techniqueCounts ?? {},
          lastSessionTechnique: statsData.lastSessionTechnique ?? '-',
        });
      }

      // Otomatik başlatma ayarını yükle
      // auto_start_enabled kaldırıldı

      setIsLoading(false);
      logInfo('HomeScreen: loadUserData tamamlandı');
    } catch (error) {
      logError('Kullanıcı verileri yüklenirken hata', error);
      setIsLoading(false);
    }
  };

  // Optimized useEffect - Consolidate all initialization logic
  useEffect(() => {
    logInfo('HomeScreen: İlk useEffect tetiklendi');
    
    // Animasyonları başlat
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();

    // Dikkat butonu yanıp sönme animasyonu
    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(warningAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(warningAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    blinkAnimation.start();

    // İlk yükleme işlemleri
    const initializeScreen = async () => {
      await preloadBackground();
      await loadUserData();

      // Döngü sayısını AsyncStorage'dan oku
      try {
        const stored = await AsyncStorage.getItem('cycle_count');
        if (stored) setCycleCount(parseInt(stored));
      } catch {}
    };
    
    initializeScreen();

    // Cleanup function
    return () => {
      blinkAnimation.stop();
    };
  }, []); // Empty dependency array - only run once

  // Focus effect - Her fokus olduğunda program verisini güncelle
  useFocusEffect(
    React.useCallback(() => {
      logInfo('HomeScreen: useFocusEffect tetiklendi - Program verisi yenileniyor');
      const refreshData = async () => {
        try {
          const currentUser = getCurrentUser();
          if (!currentUser) return;

          // Firestore'dan programı çek
          const programData = await getUserProgram(currentUser.uid);

          if (programData) {
            if ((programData as any).isPremium) {
              setIsPremium(true);
              const userProgramData = {
                program: programData.program || [],
                completedDays: programData.completedDays || [],
                currentDay: programData.currentDay || 1,
                isPremium: true,
              };
              setUserProgram(userProgramData);
              logInfo('HomeScreen: Premium/Normal program güncellendi (focus)');
            } else {
              setIsPremium(false);
              const userProgramData = {
                program: programData.program || [],
                completedDays: programData.completedDays || [],
                currentDay: programData.currentDay || 1,
                isPremium: false,
              };
              setUserProgram(userProgramData);
              logInfo('HomeScreen: Normal program güncellendi (focus)');
            }
          } else {
            // Firestore yoksa AsyncStorage'dan dene
            const { getStoredProgram } = await import('../utils/programStorage');
            const storedProgram = await getStoredProgram();
            if (storedProgram) {
              setIsPremium(false);
              const userProgramData = {
                program: storedProgram.program,
                completedDays: storedProgram.completedDays,
                currentDay: storedProgram.currentDay,
                isPremium: false,
              };
              setUserProgram(userProgramData);
              logInfo('HomeScreen: AsyncStorage programı güncellendi (focus)');
            }
          }
        } catch (error) {
          logError('Focus effect veri yenileme hatası:', error);
        }
      };

      refreshData();
    }, [])
  );

  // Navigation stack'ini temizleme işlemini kaldırdık - sonsuz döngüye neden oluyordu

  const handleLogout = async () => {
    try {
      triggerHapticFeedback(HapticType.MEDIUM);
      logUserAction('Logout');
              await logout();
      // AuthContext'teki logout fonksiyonu otomatik olarak Welcome ekranına yönlendirecek
    } catch (error) {
      logError('Logout error', error);
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
    }
  };

  const handleStartExercise = (technique: string, duration?: string) => {
    HapticFeedback.medium();
    logUserAction('Start Exercise', { technique, duration });
    
    navigation.navigate('BreathingExercise', {
      technique,
      duration,
      title: technique,
      description: `${duration} dakikalık ${technique} egzersizi`,
      isPremium: false,
      programDay: undefined,
      session: undefined
    });
  };

  const handleAssessment = () => {
    HapticFeedback.medium();
    logUserAction('Show Program Options');
    setShowProgramOptionsModal(true);
  };

  const handlePersonalizedProgram = () => {
    HapticFeedback.medium();
    logUserAction('Navigate to Personalized Program');
    
    if (isGuest) {
      Alert.alert(
        'Giriş Gerekli',
        'Kişisel programınızı görüntülemek için giriş yapmanız gerekmektedir.',
        [
          {
            text: 'İptal',
            style: 'cancel'
          },
          {
            text: 'Giriş Yap',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
    } else {
      navigation.navigate('PersonalizedProgram');
    }
  };

  const handleSettings = () => {
    HapticFeedback.medium();
    logUserAction('Navigate to Settings');
    navigation.navigate('Settings');
  };

  const handleWarningModal = () => {
    HapticFeedback.medium();
    logUserAction('Open Warning Modal');
    setShowWarningModal(true);
  };

  // Premium özellikler için handler'lar
  const handlePremiumAssessment = () => {
    HapticFeedback.medium();
    logUserAction('Navigate to Premium Assessment');
    navigation.navigate('PremiumAssessment');
  };

  const handlePremiumProgram = () => {
    HapticFeedback.medium();
    logUserAction('Navigate to Premium Program');
    navigation.navigate('PremiumProgram');
  };

  const handleManageSubscription = async () => {
    logUserAction('Open Manage Subscription');
    const ok = await openManageSubscriptions();
    if (!ok) {
      Alert.alert('Hata', 'Abonelik yönetim sayfası açılamadı.');
    }
  };

  const handleDeactivatePremium = async () => {
    logUserAction('Deactivate Premium Request');
    Alert.alert(
      'Premium İptal Et',
      'Premium aboneliğinizi iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve premium özelliklerinize erişiminiz kaybolacaktır.',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Premium\'u İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              logInfo('Premium iptal işlemi başlatılıyor...');
              
              // Premium iptal işlemini gerçekleştir
              await deactivatePremium();
              logUserAction('Premium Deactivated');
              
              // State'leri tamamen temizle
              setIsPremium(false);
              setUserProgram(null); // Program verilerini tamamen temizle
              
              logInfo('Premium iptal sonrası state temizlendi');
              
              Alert.alert(
                'Premium İptal Edildi',
                'Premium aboneliğiniz başarıyla iptal edildi. Tüm premium verileriniz temizlendi. Ne yapmak istiyorsunuz?',
                [
                  {
                    text: 'Yeni Değerlendirme',
                    onPress: () => {
                      logUserAction('Navigate to Assessment after premium deactivation');
      navigation.navigate('Assessment');
    }
                  },
                  {
                    text: 'Ana Sayfa',
                    onPress: () => {
                      logUserAction('Stay on Home after premium deactivation');
                      // Sadece premium durumunu güncelle
                      setIsPremium(false);
                      setUserProgram(null);
                    }
                  }
                ]
              );
            } catch (error) {
              logError('Premium iptal hatası', error);
              Alert.alert(
                'Hata', 
                'Premium iptal edilirken bir hata oluştu. Lütfen tekrar deneyin.',
                [
                  {
                    text: 'Tamam',
                    onPress: () => {
                      // Hata durumunda hiçbir şey yapma
                      logInfo('Premium iptal hatası kabul edildi');
                    }
                  }
                ]
              );
            }
          }
        }
      ]
    );
  };

  // Egzersiz kartlarında süreyi hesaplayan yardımcı fonksiyon
  const getExerciseDurationText = (technique: string) => {
    const cycleDuration = CYCLE_DURATIONS[technique] || 10;
    const totalSeconds = cycleDuration * cycleCount;
    return `${totalSeconds} saniye`;
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.loadingText, { color: themeColors.text }]}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={styles.backgroundImage} resizeMode="cover" onLoad={() => setBackgroundLoaded(true)}>
      <ScrollView style={[styles.container, { backgroundColor: 'transparent' }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[standardTextStyles.sectionTitle, { color: '#F5F5DC', flex: 1, fontWeight: '700', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            {userName ? `Hoş Geldin ${userName}!` : 'Hoş Geldin!'}
          </Text>
          
          {/* Dikkat Butonu - Herkes görecek */}
          <Animated.View style={{ opacity: warningAnim, marginRight: 8 }}>
            <TouchableOpacity 
              style={[styles.warningButton, { backgroundColor: 'rgba(255, 193, 7, 0.2)', borderColor: '#FFC107', borderWidth: 1 }]} 
              onPress={handleWarningModal}
            >
              <Text style={[standardTextStyles.buttonSmall, { color: '#FFC107', fontWeight: 'bold' }]}>⚠️</Text>
            </TouchableOpacity>
          </Animated.View>
          
          {!isGuest && (
            <TouchableOpacity 
              style={[styles.logoutButton, { backgroundColor: 'transparent', borderColor: '#DDD', borderWidth: 1 }]} 
              onPress={handleLogout}
            >
              <Text style={[standardTextStyles.buttonSmall, { color: '#F5F5DC' }]}>Çıkış</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Program Status - Premium ve Normal kullanıcılar için */}
        {!isGuest && (
          <View style={[styles.programCard, { 
            backgroundColor: 'rgba(245, 245, 220, 0.1)', 
            borderColor: 'rgba(255, 215, 0, 0.8)', 
            borderWidth: 3,
            borderTopWidth: 3,
            borderBottomWidth: 3,
            borderLeftWidth: 3,
            borderRightWidth: 3,
            borderTopColor: 'rgba(255, 215, 0, 0.8)',
            borderBottomColor: 'rgba(255, 215, 0, 0.8)',
            borderLeftColor: 'rgba(255, 215, 0, 0.8)',
            borderRightColor: 'rgba(255, 215, 0, 0.8)',
            shadowColor: 'transparent' 
          }]}> 
            {isPremium && userProgram ? (
              // Premium kullanıcı - Premium program
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', flex: 1, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Kişisel Programınız</Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: 'rgba(33, 150, 243, 0.2)',
                      borderColor: '#2196F3',
                      borderWidth: 2,
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                      marginLeft: 10
                    }}
                    onPress={handleManageSubscription}
                  >
                    <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', fontSize: 12, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Aboneliği Yönet</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginBottom: 10, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Gün {userProgram.currentDay} / 21</Text>
                {/* Premium kartta tamamlanan egzersiz sayısını göstermiyoruz */}
                <TouchableOpacity
                  style={[styles.programButton, { backgroundColor: 'rgba(255, 215, 0, 0.2)', borderColor: '#FFD700', borderWidth: 1 }]}
                  onPress={handlePremiumProgram}
                >
                  <Text style={[standardTextStyles.buttonMedium, { color: '#F5F5DC', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Premium Programı Görüntüle</Text>
                </TouchableOpacity>
              </>
            ) : userProgram ? (
              // Normal kullanıcı - Normal program
              <>
                <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Günlük Nefes Yolculuğunuz</Text>
                <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', marginBottom: 20, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>{userProgram.completedDays.length} gün tamamlandı</Text>
                <TouchableOpacity
                  style={[styles.programButton, { backgroundColor: 'rgba(245, 245, 220, 0.15)', borderColor: '#DDD', borderWidth: 1 }]}
              onPress={handlePersonalizedProgram}
            >
                  <Text style={[standardTextStyles.buttonMedium, { color: '#F5F5DC', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Programı Görüntüle</Text>
            </TouchableOpacity>
              </>
            ) : (
              // Program yoksa
              <>
                <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Günlük Nefes Yolculuğun</Text>
                <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginBottom: 20, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Size özel kişisel programınızı oluşturun</Text>
                <TouchableOpacity
                  style={[styles.programButton, { backgroundColor: 'rgba(245, 245, 220, 0.15)', borderColor: '#DDD', borderWidth: 1 }]}
                  onPress={handleAssessment}
                >
                  <Text style={[standardTextStyles.buttonMedium, { color: '#F5F5DC', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Günlük Nefes Yolculuğu Oluştur</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Misafir kullanıcılar için kişisel program butonu */}
        {isGuest && (
          <View style={[styles.programCard, { 
            backgroundColor: 'rgba(245, 245, 220, 0.1)', 
            borderColor: 'rgba(255, 251, 0, 0.78)', 
            borderWidth: 3,
            borderTopWidth: 3,
            borderBottomWidth: 3,
            borderLeftWidth: 3,
            borderRightWidth: 3,
            borderTopColor: 'rgba(255, 215, 0, 0.8)',
            borderBottomColor: 'rgba(255, 215, 0, 0.8)',
            borderLeftColor: 'rgba(255, 215, 0, 0.8)',
            borderRightColor: 'rgba(255, 215, 0, 0.8)',
            shadowColor: colors.primary[300] 
          }]}> 
            <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Günlük Nefes Yolculuğun</Text>
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginBottom: 20, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Giriş yaparak günlük kişisel programınızı oluşturun</Text>
            <TouchableOpacity
              style={[styles.programButton, { backgroundColor: 'rgba(245, 245, 220, 0.15)', borderColor: '#DDD', borderWidth: 1 }]}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={[standardTextStyles.buttonMedium, { color: '#F5F5DC', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Giriş Yap</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Exercises */}
        <View style={styles.quickExercises}>
          <Text style={[standardTextStyles.sectionTitle, { color: '#F5F5DC', fontWeight: '700', marginBottom: 20, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Hızlı Egzersizler</Text>
          
          <TouchableOpacity
            style={[styles.exerciseCard, { 
              backgroundColor: 'rgba(245, 245, 220, 0.1)', 
              borderColor: '#DDD', 
              borderWidth: 1,
              borderLeftWidth: 8,
              borderLeftColor: 'rgba(135, 206, 235, 0.8)',
            }]}
            onPress={() => handleStartExercise('diaphragmatic', '5')}
          >
            <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Sakinleş Ve Rahatla</Text>
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginBottom: 6, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Karnını şişererek diyafram kasını aktif kullan ve sakinleş!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exerciseCard, { 
              backgroundColor: 'rgba(245, 245, 220, 0.1)', 
              borderColor: '#DDD', 
              borderWidth: 1,
              borderLeftWidth: 8,
              borderLeftColor: 'rgba(147, 112, 219, 0.8)',
            }]}
            onPress={() => handleStartExercise('4-7-8', '5')}
          >
            <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Rahatça Uykuya Geç</Text>
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginBottom: 6, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>4-7-8 ritmi ile stresi sıfıra indir rahatça uykuya geç!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exerciseCard, { 
              backgroundColor: 'rgba(245, 245, 220, 0.1)', 
              borderColor: '#DDD', 
              borderWidth: 1,
              borderLeftWidth: 8,
              borderLeftColor: 'rgba(100, 149, 237, 0.8)',
            }]}
            onPress={() => handleStartExercise('box-breathing', '4')}
          >
            <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Odaklan Ve Dengelen</Text>
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginBottom: 6, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Box tekniği ve eşit süreli 4'lük döngülerle zihnini dengele ve odaklanmanı arttır!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exerciseCard, { 
              backgroundColor: 'rgba(245, 245, 220, 0.1)', 
              borderColor: '#DDD', 
              borderWidth: 1,
              borderLeftWidth: 8,
              borderLeftColor: 'rgba(255, 165, 0, 0.8)',
            }]}
            onPress={() => handleStartExercise('kapalabhati', '3')}
          >
            <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Zihnini Uyandır</Text>
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginBottom: 6, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Kapalabhati tekniği ile hızlı nefes alış verişlerle zihnini canlandır!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exerciseCard, { 
              backgroundColor: 'rgba(245, 245, 220, 0.1)', 
              borderColor: '#DDD', 
              borderWidth: 1,
              borderLeftWidth: 8,
              borderLeftColor: 'rgba(87, 224, 87, 0.64)',
            }]}
            onPress={() => handleStartExercise('nadi-shodhana', '5')}
          >
            <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Enerjini Dengele</Text>
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginBottom: 6, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Nadi Shodhana tekniği ile enerji kanallarını dengele ve sakinleş!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exerciseCard, { 
              backgroundColor: 'rgba(245, 245, 220, 0.1)', 
              borderColor: '#DDD', 
              borderWidth: 1,
              borderLeftWidth: 8,
              borderLeftColor: 'rgba(255, 182, 193, 0.8)',
            }]}
            onPress={() => handleStartExercise('anxiety-relief', '5')}
          >
            <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Anksiyeteyi Rahatlat</Text>
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginBottom: 6, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Panik ataklarının önüne geçerek sakinleş!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exerciseCard, { 
              backgroundColor: 'rgba(245, 245, 220, 0.1)', 
              borderColor: '#DDD', 
              borderWidth: 1,
              borderLeftWidth: 8,
              borderLeftColor: 'rgba(112, 64, 156, 0.8)',
            }]}
            onPress={() => handleStartExercise('ujjayi', '5')}
          >
            <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Odaklan Ve Enerji Al</Text>
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginBottom: 6, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Ujjayi (Zafer Nefesi) ile boğazını daraltarak odaklanmanı arttır ve enerji al!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exerciseCard, { 
              backgroundColor: 'rgba(245, 245, 220, 0.1)', 
              borderColor: '#DDD', 
              borderWidth: 1,
              borderLeftWidth: 8,
              borderLeftColor: 'rgba(173, 216, 230, 0.8)',
            }]}
            onPress={() => handleStartExercise('sitkari', '5')}
          >
            <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Soğut Ve Sakinleş</Text>
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginBottom: 6, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Sitkari (Diş Nefesi) ile dişlerini sıkarak anksiyeteyi azalt!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exerciseCard, { 
              backgroundColor: 'rgba(245, 245, 220, 0.1)', 
              borderColor: '#DDD', 
              borderWidth: 1,
              borderLeftWidth: 8,
              borderLeftColor: 'rgba(168, 144, 7, 0.8)',
            }]}
            onPress={() => handleStartExercise('lion_breath', '3')}
          >
            <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Aslan Nefesi İle Güçlen</Text>
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginBottom: 6, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Ağzınızı açıp dilinizi çıkararak özgüvenini arttır!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exerciseCard, { 
              backgroundColor: 'rgba(245, 245, 220, 0.1)', 
              borderColor: '#DDD', 
              borderWidth: 1,
              borderLeftWidth: 8,
              borderLeftColor: 'rgba(240, 128, 128, 0.8)',
            }]}
            onPress={() => handleStartExercise('pursed_lip_breathing', '5')}
          >
            <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Büzük Dudakla Rahatla</Text>
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginBottom: 6, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Dudaklarınızı büzerek anksiyeteyi azaltın!</Text>
          </TouchableOpacity>
        </View>

        {/* Uyku Müzikleri Link */}
        <View style={styles.sleepMusicSection}>
          <Text style={[standardTextStyles.sectionTitle, { color: '#F5F5DC', fontWeight: '700', marginBottom: 22, fontSize: 22, marginLeft: 20, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}> Gece Melodileri</Text>

          <TouchableOpacity
            style={[styles.sleepMusicCard, { backgroundColor: 'rgba(245, 245, 220, 0.1)', borderColor: '#DDD', borderWidth: 1 }]}
            onPress={() => navigation.navigate('SleepMusic')}
          >
            <View style={styles.sleepMusicContent}>
              <Text style={styles.sleepMusicEmoji}>🎵</Text>
              <View style={styles.sleepMusicTextContainer}>
                <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Sakinleştirici Müzikler</Text>
                
                <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Yağmur, okyanus, orman sesleri ve daha fazlası</Text>
              </View>
              <Text style={styles.arrowIcon}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* İstatistik Kartı */}
        <Text style={[standardTextStyles.sectionTitle, { color: '#F5F5DC', marginLeft: 20, marginBottom: 8, marginTop: 20, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>İstatistikler</Text>
        {isGuest ? (
          <View style={{ alignItems: 'center', marginVertical: 24 }}>
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              İstatistiklerinizi görebilmek için giriş yapın.
            </Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16, paddingBottom: 8 }}>
              {/* Seri */}
              <View style={[styles.statCard, { backgroundColor: 'rgba(245, 245, 220, 0.08)', borderWidth: 1, borderColor: '#DDD' }]}> 
                <Text style={{ fontSize: 24, marginBottom: 8 }}>🔥</Text>
                <Text style={[standardTextStyles.label, { color: '#F5F5DC', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Seri</Text>
                <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', fontWeight: 'bold', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>{String(stats.currentStreak)} gün</Text>
              </View>
              {/* Son Egzersiz */}
              <View style={[styles.statCard, { backgroundColor: 'rgba(245, 245, 220, 0.08)', borderWidth: 1, borderColor: '#DDD' }]}> 
                <Text style={{ fontSize: 24, marginBottom: 8 }}>🧘‍♂️</Text>
                <Text style={[standardTextStyles.label, { color: '#F5F5DC', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Son egzersiz</Text>
                <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', fontWeight: 'bold', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>{getTechniqueDisplayName(stats.lastSessionTechnique ?? '-')}</Text>
              </View>
              {/* En Çok Yapılan Nefes Tekniği */}
              <View style={[styles.statCard, { backgroundColor: 'rgba(245, 245, 220, 0.08)', borderWidth: 1, borderColor: '#DDD' }]}> 
                <Text style={{ fontSize: 24, marginBottom: 8 }}>🤍</Text>
                <Text style={[standardTextStyles.label, { color: '#F5F5DC', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>En çok yapılan nefes tekniği</Text>
                <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', fontWeight: 'bold', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>{stats.favoriteTechniques.length > 0 ? getTechniqueDisplayName(stats.favoriteTechniques[0]) : '-'}</Text>
              </View>
            </ScrollView>
          </Animated.View>
        )}



        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {!userProgram && !isGuest && (
            <TouchableOpacity
              style={[styles.assessmentButton, { backgroundColor: colors.secondary[500] }]}
              onPress={handleAssessment}
            >
              <Text style={[standardTextStyles.buttonLarge, { color: '#FFFFFF' }]}>Kişisel Programı Oluştur</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: 'rgba(245, 245, 220, 0.15)', borderColor: '#DDD' }]}
            onPress={handleSettings}
          >
            <Text style={[standardTextStyles.buttonMedium, { color: '#F5F5DC', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Ayarlar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Dikkat Modal */}
      <Modal
        visible={showWarningModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWarningModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ Nefes Teknikleri Güvenlik Uyarısı</Text>
            
            <View style={styles.warningSection}>
              <Text style={styles.warningSectionTitle}>❌ Bu teknikler önerilmez:</Text>
              <Text style={styles.warningText}>• Kapalabhati: Hamileler, tansiyon hastaları, kalp hastaları</Text>
              <Text style={styles.warningText}>• Nadi Shodhana: Kalp hastaları</Text>
              <Text style={styles.warningText}>• Alternatif Burun Nefesi: Kalp hastaları</Text>
              <Text style={styles.warningText}>• Box Breathing: Astım/bronşit hastaları</Text>
              <Text style={styles.warningText}>• 4-7-8 Tekniği: Astım/bronşit hastaları</Text>
              <Text style={styles.warningText}>• Aslan Nefesi: Astım/bronşit hastaları</Text>
              <Text style={styles.warningText}>• Zafer Nefesi: Astım/bronşit hastaları</Text>
            </View>
            
            <View style={styles.safeSection}>
              <Text style={styles.safeSectionTitle}>✅ Bu teknikler güvenlidir:</Text>
              <Text style={styles.safeText}>• Diyafram nefesi: Herkes için güvenli</Text>
              <Text style={styles.safeText}>• Anksiyete rahatlatma: Panik atak için</Text>
              <Text style={styles.safeText}>• Uyumlu nefes: Kalp sağlığı için</Text>
              <Text style={styles.safeText}>• Arı nefesi: Uyku ve sakinlik için</Text>
              <Text style={styles.safeText}>• Soğutucu nefes: Vücut soğutma için</Text>
              <Text style={styles.safeText}>• Diş nefesi: Anksiyete azaltma için</Text>
              <Text style={styles.safeText}>• Üç parça nefes: Derin rahatlama için</Text>
              <Text style={styles.safeText}>• Eşit nefes: Denge için</Text>
              <Text style={styles.safeText}>• Dudak büzme nefesi: Solunum kontrolü için</Text>
              <Text style={styles.safeText}>• Derin nefes: Stres azaltma için</Text>
              <Text style={styles.safeText}>• Farkındalık nefesi: Meditasyon için</Text>
            </View>
            
            <View style={styles.ageSection}>
              <Text style={styles.ageSectionTitle}>📊 Yaş Gruplarına Göre Yoğunluk:</Text>
              <Text style={styles.ageText}>• 18-30 yaş: Normal yoğunluk</Text>
              <Text style={styles.ageText}>• 31-50 yaş: %20 azaltılmış yoğunluk</Text>
              <Text style={styles.ageText}>• 50+ yaş: %40 azaltılmış yoğunluk</Text>
            </View>
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowWarningModal(false)}
            >
              <Text style={styles.modalButtonText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Program Seçenekleri Modal */}
      <Modal
        visible={showProgramOptionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProgramOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎯 Program Seçimi</Text>
            
            <Text style={[standardTextStyles.bodyMedium, { color: '#333', textAlign: 'center', marginBottom: 24, lineHeight: 20 }]}>
              Hangi tür program oluşturmak istiyorsunuz?
            </Text>
            
            <TouchableOpacity
              style={[styles.programOptionButton, { backgroundColor: 'rgba(76, 175, 80, 0.1)', borderColor: '#4CAF50', marginBottom: 12 }]}
              onPress={() => {
                setShowProgramOptionsModal(false);
                logUserAction('Navigate to Assessment (Free)');
                navigation.navigate('Assessment');
              }}
            >
              <Text style={[standardTextStyles.buttonMedium, { color: '#4CAF50', fontWeight: 'bold' }]}>
                5 Günlük Ücretsiz Program
              </Text>
              <Text style={[standardTextStyles.bodySmall, { color: '#666', textAlign: 'center', marginTop: 4 }]}>
                Temel nefes teknikleri ile başlayın
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.programOptionButton, { backgroundColor: 'rgba(34, 139, 34, 0.1)', borderColor: '#228B22', marginBottom: 12 }]}
              onPress={() => {
                setShowProgramOptionsModal(false);
                logUserAction('Navigate to Premium Screen');
                navigation.navigate('Premium');
              }}
            >
              <Text style={[standardTextStyles.buttonMedium, { color: '#228B22', fontWeight: 'bold' }]}>
                21 Günlük Kişiselleştirilmiş Program
              </Text>
              <Text style={[standardTextStyles.bodySmall, { color: '#666', textAlign: 'center', marginTop: 4 }]}>
                Sabah-akşam premium teknikler, gelişmiş özellikler ve daha fazlası..
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.programOptionButton, { backgroundColor: 'rgba(158, 158, 158, 0.1)', borderColor: '#9E9E9E' }]}
              onPress={() => setShowProgramOptionsModal(false)}
            >
              <Text style={[standardTextStyles.buttonMedium, { color: '#9E9E9E' }]}>
                İptal
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 100,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  welcomeText: {
    ...standardTextStyles.sectionTitle,
    flex: 1,
  },
  logoutButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  logoutButtonText: {
    ...standardTextStyles.buttonSmall,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statCard: {
    width: 140,
    borderRadius: 18,
    padding: 18,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 245, 220, 0.08)',
    borderWidth: 1,
    borderColor: '#DDD',
    minHeight: 120,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  statLabel: {
    ...standardTextStyles.label,
    textAlign: 'center',
    marginBottom: 2,
  },
  statNumber: {
    ...standardTextStyles.cardTitle,
    textAlign: 'center',
  },
  programCard: {
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 30,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  programTitle: {
    ...standardTextStyles.cardTitle,
    marginBottom: 8,
  },
  programSubtitle: {
    ...standardTextStyles.bodyMedium,
    marginBottom: 8,
  },
  programProgress: {
    ...standardTextStyles.bodySmall,
    marginBottom: 20,
  },
  programButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  programButtonText: {
    ...standardTextStyles.buttonMedium,
    color: '#222',
    textAlign: 'center',
  },
  quickExercises: {
    paddingHorizontal: 20,
    marginBottom: 30,
    marginTop: 10,
  },
  sectionTitle: {
    ...standardTextStyles.sectionTitle,
    marginBottom: 16,
  },
  exerciseCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  exerciseTitle: {
    ...standardTextStyles.cardTitle,
    marginBottom: 4,
  },
  exerciseDescription: {
    ...standardTextStyles.bodyMedium,
    marginBottom: 6,
  },
  exerciseDuration: {
    ...standardTextStyles.bodyMedium,
  },
  actionButtons: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  assessmentButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  assessmentButtonText: {
    ...standardTextStyles.buttonLarge,
  },
  settingsButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  settingsButtonText: {
    ...standardTextStyles.buttonMedium,
    color: '#F5F5DC',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...standardTextStyles.bodyLarge,
  },
  statsCard: {
    borderRadius: 16,
    padding: 20,
    margin: 20,
    marginBottom: 0,
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
  },
  statsLabel: {
    ...standardTextStyles.caption,
    marginTop: 2,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  warningButton: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(245, 245, 220, 0.95)',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    maxWidth: 350,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    ...standardTextStyles.cardTitle,
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  warningSection: {
    marginBottom: 16,
  },
  warningSectionTitle: {
    ...standardTextStyles.bodyMedium,
    color: '#D32F2F',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  warningText: {
    ...standardTextStyles.bodySmall,
    color: '#D32F2F',
    marginBottom: 4,
    marginLeft: 8,
  },
  safeSection: {
    marginBottom: 20,
  },
  safeSectionTitle: {
    ...standardTextStyles.bodyMedium,
    color: '#388E3C',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  safeText: {
    ...standardTextStyles.bodySmall,
    color: '#388E3C',
    marginBottom: 4,
    marginLeft: 8,
  },
  ageSection: {
    marginBottom: 16,
  },
  ageSectionTitle: {
    ...standardTextStyles.bodyMedium,
    color: '#1976D2',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ageText: {
    ...standardTextStyles.bodySmall,
    color: '#1976D2',
    marginBottom: 4,
    marginLeft: 8,
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalButtonText: {
    ...standardTextStyles.buttonMedium,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  sleepMusicSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  sleepMusicCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sleepMusicContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sleepMusicEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  sleepMusicTextContainer: {
    flex: 1,
  },
  arrowIcon: {
    fontSize: 24,
    color: '#F5F5DC',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  programOptionButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 2,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
}); 