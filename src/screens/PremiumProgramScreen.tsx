import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
  ImageBackground,
  BackHandler,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getCurrentUser } from '../services/authService';
import { getUserProgram, PremiumUserProgram, saveUserProgram, canUserResetProgram } from '../services/firestoreService';
import { PersonalizedProgram } from '../utils/programGenerator';
import { COLORS, FONTS, standardTextStyles } from '../constants/typography';
import { triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';
import { checkPremiumStatus } from '../utils/premiumUtils';

const { width, height } = Dimensions.get('window');

type PremiumProgramScreenNavigationProp = StackNavigationProp<any, 'PremiumProgram'>;

export default function PremiumProgramScreen() {
  const navigation = useNavigation<PremiumProgramScreenNavigationProp>();
  const [userProgram, setUserProgram] = useState<PremiumUserProgram | null>(null);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkDailyProgress, setCheckDailyProgress] = useState<NodeJS.Timeout | null>(null);

  const preloadBackground = async () => {
    setBackgroundLoaded(true);
  };

  // Android donanım geri tuşu: her zaman Home'a gönder
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        return true; // varsayılan geri davranışını engelle
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [navigation])
  );

  // Header geri (GO_BACK) yakala ve Home'a yönlendir
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (e?.data?.action?.type === 'GO_BACK') {
        e.preventDefault();
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }
    });
    return unsubscribe;
  }, [navigation]);

  // Timer temizleme fonksiyonu
  const clearAllTimers = () => {
    if (checkDailyProgress) {
      clearInterval(checkDailyProgress);
      setCheckDailyProgress(null);
    }
  };

  // Premium program için günlük ilerleme timer'ı
  const startDailyProgressTimer = () => {
    clearAllTimers(); // Önceki timer'ı temizle
    
    const timer = setInterval(() => {
      try {
        const currentTime = new Date();
        const hour = currentTime.getHours();
        
        // Saat 00:00'da kontrol yap
        if (hour === 0) {
          console.log('Premium program - Interval ile günlük kontrol yapılıyor... (00:00)');
          checkAndUpdateDailyProgress();
        }
      } catch (error) {
        console.error('Premium program - Interval kontrol hatası:', error);
      }
    }, 60000); // 1 dakika (daha sık kontrol)
    
    setCheckDailyProgress(timer);
    console.log('Premium program - Daily progress timer started (00:00 kontrolü)');
    return timer;
  };

  // Premium program için günlük ilerleme kontrolü
  const checkAndUpdateDailyProgress = async () => {
    try {
      console.log('Premium program - Günlük ilerleme kontrolü çalışıyor (timer/focus)');
      
      const currentUser = getCurrentUser();
      if (!currentUser) {
        console.warn('Premium program - Kullanıcı bulunamadı, kontrol atlanıyor');
        return;
      }
      
      // Premium program için gün açma kontrolü (tarih değişiminde ve sabah+akşam tamam ise)
      await maybeUnlockByDateChange(currentUser.uid);
      
    } catch (error) {
      console.error('Premium program - Günlük ilerleme kontrolü hatası:', error);
    }
  };

  const getDateKey = (d: Date) => `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;

  // Tarih değiştiyse ve önceki günün sabah+akşamı tamamlandıysa sonraki günü aç
  const maybeUnlockByDateChange = async (userId: string) => {
    try {
      // Firestore'dan mevcut programı al
      const userProgram = await getUserProgram(userId);
      
      if (!userProgram || !userProgram.isPremium) {
        console.log('Premium program - Program bulunamadı veya normal program, gün açma atlanıyor');
        return;
      }
      
      const currentDay = userProgram.currentDay;
      const nextDay = currentDay + 1;
      
      // Program tamamlandı mı kontrol et (21 gün)
      if (nextDay > 21) {
        console.log('Premium program - Program tamamlandı, yeni gün açılamaz');
        return;
      }
      
      // Tarih değişimi kontrolü (son güncelleme ile bugün farklı mı?)
      const lastUpdated = userProgram.lastUpdated ? new Date(userProgram.lastUpdated) : null;
      const todayKey = getDateKey(new Date());
      const lastKey = lastUpdated ? getDateKey(lastUpdated) : null;
      if (lastKey === todayKey) {
        console.log('Premium program - Aynı gün içinde, gün açma denenmeyecek');
        return;
      }

      // Önceki günün sabah ve akşam oturumlarının tamamlanmış olması şart
      const prevMorningKey = `${currentDay}-morning`;
      const prevEveningKey = `${currentDay}-evening`;
      const hasMorning = Array.isArray(userProgram.completedDays) && userProgram.completedDays.includes(prevMorningKey);
      const hasEvening = Array.isArray(userProgram.completedDays) && userProgram.completedDays.includes(prevEveningKey);
      if (!(hasMorning && hasEvening)) {
        console.log(`Premium program - Gün ${nextDay} açılamaz: Gün ${currentDay} sabah+akşam tamam değil (morning:${hasMorning}, evening:${hasEvening})`);
        return;
      }
      
      // Yeni günü aç
      await saveUserProgram(userId, {
        ...userProgram,
        currentDay: nextDay,
        lastUpdated: new Date().toISOString(),
      });
      
      console.log(`Premium program - Yeni gün açıldı: ${nextDay}`);
      
    } catch (error) {
      console.error('Premium program - Gün açma hatası:', error);
    }
  };

  // Optimized useEffect - Consolidate all initialization logic
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const initializeScreen = async () => {
      try {
        await preloadBackground();
        
        // Premium kontrolü
        const premiumStatus = await checkPremiumStatus();
        setIsPremium(premiumStatus);
        
        // Premium değilse uyarı ver ama hemen geri dönme
        if (!premiumStatus) {
          console.log('PremiumProgramScreen: Kullanıcı premium değil, uyarı veriliyor');
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
        } else {
          console.log('PremiumProgramScreen: Kullanıcı premium, program yükleniyor');
          
          // Kullanıcı programını yükle
          const currentUser = getCurrentUser();
          if (!currentUser) {
            Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı.');
            return;
          }

          const program = await getUserProgram(currentUser.uid);
          console.log('PremiumProgramScreen: Alınan program:', program);
          console.log('PremiumProgramScreen: isPremium kontrolü:', (program as any)?.isPremium);
          
          if (program && (program as any).isPremium) {
            console.log('PremiumProgramScreen: Premium program bulundu, state güncelleniyor');
            setUserProgram(program as unknown as PremiumUserProgram);
            
            // Premium program için günlük kontrol timer'ı başlat
            startDailyProgressTimer();
            
            // Focus olduğunda da gün açma kontrolü yap ve programı yenile
            unsubscribe = navigation.addListener('focus', async () => {
              try {
                const cu = getCurrentUser();
                if (cu) {
                  await checkAndUpdateDailyProgress();
                  const refreshed = await getUserProgram(cu.uid);
                  if (refreshed && (refreshed as any).isPremium) {
                    setUserProgram(refreshed as unknown as PremiumUserProgram);
                  }
                }
              } catch (e) {
                console.warn('PremiumProgramScreen: focus refresh failed', e);
              }
            });
          } else {
            Alert.alert(
              'Premium Program Bulunamadı',
              '21 günlük premium programınız bulunamadı. Lütfen önce premium değerlendirme yapın.',
              [
                {
                  text: 'Değerlendirme Yap',
                  onPress: () => navigation.navigate('PremiumAssessment')
                },
                {
                  text: 'Ana Sayfa',
                  onPress: () => navigation.navigate('Home'),
                  style: 'cancel'
                }
              ]
            );
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('PremiumProgramScreen: Hata:', error);
        setLoading(false);
      }
    };
    
    initializeScreen();

    // Cleanup function
    return () => {
      clearAllTimers(); // Tüm timer'ları temizle
      if (unsubscribe) {
        unsubscribe();
        console.log('Premium program - Navigation listener unsubscribed');
      }
      console.log('PremiumProgramScreen cleanup completed');
    };
  }, []); // Empty dependency array - only run once

  // Component mount olduğunda state'i temizle - Bu artık ana useEffect içinde yapılıyor

  const handleDayPress = (day: PersonalizedProgram) => {
    if (!day.isLocked) {
      triggerHapticFeedback(HapticType.SELECTION);
      
      // Kapsamlı validation
      if (!day) {
        console.error('Day program is null or undefined');
        Alert.alert('Hata', 'Program bilgisi bulunamadı.');
        return;
      }
      
      if (!day.techniques || day.techniques.length === 0) {
        console.error('Day program has no techniques', { day });
        Alert.alert('Hata', 'Bu gün için teknik bilgisi bulunamadı.');
        return;
      }
      
      if (!day.techniques[0]) {
        console.error('First technique is null or undefined', { techniques: day.techniques });
        Alert.alert('Hata', 'Teknik bilgisi eksik.');
        return;
      }
      
      if (!day.duration) {
        console.error('Day duration is missing', { day });
        Alert.alert('Hata', 'Egzersiz süresi belirlenemedi.');
        return;
      }
      
      if (!day.day || day.day < 1) {
        console.error('Invalid day number', { day: day.day });
        Alert.alert('Hata', 'Geçersiz gün numarası.');
        return;
      }
      
      // İlk tekniği al (ana teknik)
      const primaryTechnique = day.techniques[0];
      
      // Session validation - undefined ise default değer ata
      const session = day.session || 'morning';
      
      console.log('Premium program günü başlatılıyor:', {
        day: day.day,
        technique: primaryTechnique,
        duration: day.duration,
        title: day.title,
        session: session
      });
      
      // Navigation parametrelerini hazırla ve validate et
      const navigationParams = {
        technique: primaryTechnique,
        duration: day.duration,
        isPremium: true,
        autoStart: false,
        techniqueTitle: day.title || `Premium Gün ${day.day} Egzersizi`,
        techniqueDescription: day.description || 'Premium kişiselleştirilmiş nefes egzersizi',
        programDay: day.day,
        session: session
      };
      
      // Son validation kontrolü
      if (!navigationParams.technique || !navigationParams.duration) {
        console.error('Invalid navigation parameters', navigationParams);
        Alert.alert('Hata', 'Egzersiz parametreleri eksik.');
        return;
      }
      
      // BreathingExerciseScreen'e yönlendir
      navigation.navigate('BreathingExercise', navigationParams);
    } else {
      triggerHapticFeedback(HapticType.ERROR);
      Alert.alert(
        'Gün Kilitli',
        'Bu gün henüz açılmadı. Önceki günleri tamamlayın ve 12:00\'yi bekleyin.'
      );
    }
  };

  // Premium program için "Tekrar Yap" butonu - gün sayısını artırmaz
  const handleRepeatDay = (day: PersonalizedProgram) => {
    triggerHapticFeedback(HapticType.SELECTION);
    
    // Kapsamlı validation
    if (!day) {
      console.error('Day program is null or undefined');
      Alert.alert('Hata', 'Program bilgisi bulunamadı.');
      return;
    }
    
    if (!day.techniques || day.techniques.length === 0) {
      console.error('Day program has no techniques', { day });
      Alert.alert('Hata', 'Bu gün için teknik bilgisi bulunamadı.');
      return;
    }
    
    if (!day.techniques[0]) {
      console.error('First technique is null or undefined', { techniques: day.techniques });
      Alert.alert('Hata', 'Teknik bilgisi eksik.');
      return;
    }
    
    if (!day.duration) {
      console.error('Day duration is missing', { day });
      Alert.alert('Hata', 'Egzersiz süresi belirlenemedi.');
      return;
    }
    
    if (!day.day || day.day < 1) {
      console.error('Invalid day number', { day: day.day });
      Alert.alert('Hata', 'Geçersiz gün numarası.');
      return;
    }
    
    // İlk tekniği al (ana teknik)
    const primaryTechnique = day.techniques[0];
    
    // Session validation - undefined ise default değer ata
    const session = day.session || 'morning';
    
    console.log('Premium program tekrar yapılıyor:', {
      day: day.day,
      technique: primaryTechnique,
      duration: day.duration,
      title: day.title,
      session: session
    });
    
    // Navigation parametrelerini hazırla ve validate et - gün sayısını artırmaz
    const navigationParams = {
      technique: primaryTechnique,
      duration: day.duration,
      isPremium: false, // Gün sayısını artırmamak için false
      autoStart: false,
      techniqueTitle: day.title || `Premium Gün ${day.day} Egzersizi`,
      techniqueDescription: day.description || 'Premium kişiselleştirilmiş nefes egzersizi',
      programDay: undefined, // Gün sayısını artırmamak için undefined
      session: undefined // Gün sayısını artırmamak için undefined
    };
    
    // Son validation kontrolü
    if (!navigationParams.technique || !navigationParams.duration) {
      console.error('Invalid navigation parameters', navigationParams);
      Alert.alert('Hata', 'Egzersiz parametreleri eksik.');
      return;
    }
    
    // BreathingExerciseScreen'e yönlendir
    navigation.navigate('BreathingExercise', navigationParams);
  };

  const handleResetProgram = async () => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı.');
        return;
      }

      // Premium durumunu kontrol et (premium program için true)
      const isPremium = true;
      
      // Reset yapabilir mi kontrol et
      const resetCheck = await canUserResetProgram(currentUser.uid, isPremium);
      
      // Premium kullanıcılar her zaman sıfırlayabilir
      Alert.alert(
        'Programı Sıfırla',
        '21 günlük premium programınızı sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.\n\nPremium kullanıcılar sınırsız program sıfırlama hakkına sahiptir.',
        [
          {
            text: 'İptal',
            style: 'cancel'
          },
          {
            text: 'Sıfırla',
            style: 'destructive',
            onPress: async () => {
              try {
                // Programı sıfırla
                setUserProgram(null);
                
                Alert.alert(
                  'Program Sıfırlandı',
                  'Premium programınız sıfırlandı. Ne yapmak istiyorsunuz?',
                  [
                    {
                      text: 'Ana Sayfa',
                      onPress: () => navigation.navigate('Home'),
                      style: 'cancel'
                    },
                    {
                      text: 'Yeni Değerlendirme',
                      onPress: () => navigation.navigate('PremiumAssessment')
                    }
                  ]
                );
              } catch (error) {
                console.error('Program sıfırlama hatası:', error);
                Alert.alert('Hata', 'Program sıfırlanırken bir hata oluştu.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Reset kontrolü hatası:', error);
      Alert.alert('Hata', 'Sıfırlama kontrolü yapılırken bir hata oluştu.');
    }
  };

  const getTechniqueDisplayName = (technique: string) => {
    const techniqueNames: {[key: string]: string} = {
      // Normal program teknikleri
      'diaphragmatic': 'Diyafram Nefesi',
      '4-7-8': '4-7-8 Nefes Tekniği',
      'box-breathing': 'Kutu Nefesi',
      'nadi-shodhana': 'Nadi Shodhana',
      'kapalabhati': 'Kapalabhati',
      'anxiety-relief': 'Anksiyete Rahatlatma',
      'coherent_breathing': 'Uyumlu Nefes',
      'alternate_nostril': 'Alternatif Burun Nefesi',
      'bhramari': 'Bhramari (Arı Nefesi)',
      'ujjayi': 'Ujjayi (Zafer Nefesi)',
      'sitali': 'Sitali (Soğutma Nefesi)',
      'sitkari': 'Sitkari (Diş Nefesi)',
      // deprecated alias removed, use 'bhramari'
      'lion_breath': 'Aslan Nefesi',
      'victorious_breath': 'Zafer Nefesi',
      'three_part_breath': 'Üç Parça Nefes',
      'equal_breathing': 'Eşit Nefes',
      'pursed_lip_breathing': 'Dudak Büzme Nefesi',
      'deep_breathing': 'Derin Nefes',
      'mindful_breathing': 'Farkındalık Nefesi',
      // Premium gelişmiş teknikler
      'alternate_nostril_advanced': 'Gelişmiş Alternatif Burun',
      'bhramari_advanced': 'Gelişmiş Bhramari',
      // Eski takma adlar kaldırıldı; standart anahtarlar kullanılır
    };
    return techniqueNames[technique] || technique;
  };

  const getDayStatus = (day: PersonalizedProgram) => {
    if (day.isLocked) {
      return { status: 'locked', text: '🔒 Kilitli', color: '#666' };
    } else {
      // completedDays'in string dizisi olduğunu kontrol et
      const completedDays = Array.isArray(userProgram?.completedDays) ? userProgram.completedDays : [];
      const sessionKey = `${day.day}-${day.session}`;
      const isCompleted = completedDays.some((completedDay: any) => 
        typeof completedDay === 'string' && completedDay === sessionKey
      );
      
      if (isCompleted) {
        return { status: 'completed', text: '✅ Tamamlandı', color: '#4CAF50' };
      } else if (day.day === userProgram?.currentDay) {
        return { status: 'current', text: '🎯 Bugün', color: '#FFD700' };
      } else {
        return { status: 'available', text: '📅 Açık', color: '#2196F3' };
      }
    }
  };

  // Premium değilse loading göster, null döndürme
  if (!isPremium) {
    return (
      <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F5F5DC" />
          <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginTop: 16, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            Premium durumu kontrol ediliyor...
          </Text>
        </View>
      </ImageBackground>
    );
  }

  if (loading) {
    return (
      <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F5F5DC" />
          <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginTop: 16, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            Premium programınız yükleniyor...
          </Text>
        </View>
      </ImageBackground>
    );
  }

  if (!userProgram) {
    return (
      <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover">
        <View style={styles.errorContainer}>
          <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', textAlign: 'center', marginBottom: 20, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            Premium Program Bulunamadı
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('PremiumAssessment')}
          >
            <Text style={[standardTextStyles.bodyLarge, { color: '#F5F5DC', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              Premium Değerlendirme Yap
            </Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover" onLoad={() => setBackgroundLoaded(true)}>
      <ScrollView style={{ flex: 1, backgroundColor: 'transparent' }} contentContainerStyle={{ paddingHorizontal: 15, paddingTop: 90 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={[standardTextStyles.mainTitle, { color: '#F5F5DC', marginBottom: 8, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              Senin ritmine özel 21 günlük nefes planı
            </Text>
          </View>
          <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', textAlign: 'center', marginBottom: 10, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statCardContent}>
              <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                Tamamlanan Egzersiz
              </Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${Math.min((Array.isArray(userProgram.completedDays) ? userProgram.completedDays.length : 0) / 42 * 100, 100)}%` 
                      }
                    ]} 
                  />
                </View>
                <Text style={[standardTextStyles.cardTitle, { color: '#FFD700', textAlign: 'center', marginTop: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                  {Array.isArray(userProgram.completedDays) ? userProgram.completedDays.length : 0} / 42
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.programContainer}>
          {userProgram.program.map((day) => {
            const dayStatus = getDayStatus(day);
            const timeEmoji = day.timeOfDay === 'morning' ? '' : '';
            const timeText = day.timeOfDay === 'morning' ? 'Sabah' : 'Akşam';
            
            return (
              <TouchableOpacity
                key={`${day.day}-${day.session}`}
                style={[
                  styles.dayCard,
                  dayStatus.status === 'completed' && styles.completedDay,
                  dayStatus.status === 'current' && styles.currentDay,
                  dayStatus.status === 'locked' && styles.lockedDay
                ]}
                onPress={() => handleDayPress(day)}
                disabled={dayStatus.status === 'locked'}
                activeOpacity={0.8}
              >
                <View style={styles.dayHeader}>
                  <Text style={[standardTextStyles.bodyLarge, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                    Gün {day.day} - {timeEmoji} {timeText}
                  </Text>
                  <View style={styles.headerRight}>
                  <Text style={[standardTextStyles.bodySmall, { color: dayStatus.color, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                    {dayStatus.text}
                    </Text>
                    <View style={[
                      styles.difficultyBadge,
                      day.intensity === 'low' && styles.difficultyLow,
                      day.intensity === 'medium' && styles.difficultyMedium,
                      day.intensity === 'high' && styles.difficultyHigh
                    ]}>
                      <Text style={[standardTextStyles.bodySmall, styles.difficultyText]}>
                        {day.intensity === 'low' ? 'Başlangıç' : day.intensity === 'medium' ? 'Orta' : 'İleri'}
                  </Text>
                    </View>
                  </View>
                </View>
                
                <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                  {day.title}
                </Text>
                
                                 <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                   {day.description}
                 </Text>
                 
                 {/* Ana teknik */}
                 <View style={styles.techniquesContainer}>
                   <Text style={[standardTextStyles.bodySmall, { color: '#FFD700', marginBottom: 4, fontWeight: 'bold', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                     🧘‍♀️ Ana Teknik:
                   </Text>
                   <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', marginLeft: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                     {getTechniqueDisplayName(day.techniques[0] || 'diaphragmatic')}
                   </Text>
                 </View>

                
                {/* difficulty badge artık headerRight içinde gösteriliyor */}
                
                {/* Tamamlanan günler için Tekrar Yap butonu */}
                {dayStatus.status === 'completed' && (
                  <TouchableOpacity
                    style={styles.repeatButton}
                    onPress={() => handleRepeatDay(day)}
                    activeOpacity={0.8}
                  >
                    <Text style={[standardTextStyles.bodySmall, { color: '#4CAF50', textAlign: 'center', fontWeight: 'bold' }]}>
                      🔄 Tekrar Yap
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetProgram}
        >
          <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            Programı Sıfırla (Sınırsız)
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 22,
    marginTop: 28,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(245, 245, 220, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 5,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  statCardContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  programContainer: {
    gap: 12,
    marginBottom: 25,
  },
  dayCard: {
    backgroundColor: 'rgba(245, 245, 220, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  completedDay: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: 'transparent',
    borderWidth: 0,
  },
  currentDay: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  lockedDay: {
    backgroundColor: 'rgba(102, 102, 102, 0.2)',
    borderColor: '#666',
    borderWidth: 2,
    opacity: 0.6,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  resetButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#F44336',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
    width: '100%',
  },
  difficultyBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    alignSelf: 'flex-end', // Sağa hizala
    marginLeft: 'auto', // Sağa it
  },
  difficultyLow: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: '#4CAF50',
    borderWidth: 2,
    
  },
  difficultyMedium: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderColor: '#FFC107',
  },
  difficultyHigh: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderColor: '#F44336',
  },
  difficultyText: {
    color: '#F5F5DC',
    fontWeight: '600',
    fontSize: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  repeatButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  titleContainer: {
    backgroundColor: 'rgba(245, 245, 220, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginBottom: 16,
  },
  techniquesContainer: {
    marginBottom: 12,
  },
}); 