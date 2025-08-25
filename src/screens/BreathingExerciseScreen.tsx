import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ImageBackground,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { playVoiceCommand, playRandomMotivation, stopVoice } from '../utils/voiceAssistant';
import { COLORS, standardTextStyles } from '../constants/typography';
import { triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import { saveUserStats, saveExerciseSession, getUserStats, getUserPreferences, updateUserCycleCount } from '../services/firestoreService';
import { validateTechnique, validateSession, validateProgramDay } from '../utils/validation';
import { logError, logInfo, logUserAction, logExerciseCompletion, logWarn, logDebug } from '../utils/logger';
import { analyzeNetworkError } from '../utils/networkUtils';
import { handleError } from '../utils/errorHandler';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type BreathingExerciseScreenRouteProp = RouteProp<RootStackParamList, 'BreathingExercise'>;
type BreathingExerciseScreenNavigationProp = StackNavigationProp<RootStackParamList, 'BreathingExercise'>;

const { width, height } = Dimensions.get('window');

// Tüm nefes teknikleri ve fazları
const breathingPatterns = {
  'diaphragmatic': {
    name: 'Karın (Diyafram) Nefesi',
    phases: [
      { name: 'Nefes Al', duration: 4000, instruction: 'Burnuzdan derin nefes alın, karnınız şişsin', voiceCommand: 'inhale' },
      { name: 'Ver', duration: 6000, instruction: 'Ağzınızdan yavaşça nefes verin', voiceCommand: 'exhale' },
    ],
    color: COLORS.primary,
    benefits: ['Anksiyeteyi azaltır', 'Sinir sistemini yatıştırır', 'Odaklanmayı artırır'],
  },
  '4-7-8': {
    name: '4-7-8 Nefes Tekniği',
    phases: [
      { name: 'Nefes Al', duration: 4000, instruction: 'Burnuzdan 4 saniye nefes alın', voiceCommand: 'inhale' },
      { name: 'Tut', duration: 7000, instruction: '7 saniye nefesinizi tutun', voiceCommand: 'hold' },
      { name: 'Ver', duration: 8000, instruction: '8 saniye ağzınızdan yavaşça verin', voiceCommand: 'exhale' },
    ],
    color: COLORS.secondary,
    benefits: ['Uykuya geçişi kolaylaştırır', 'Sinir sistemini dengeler'],
  },
  'box-breathing': {
    name: 'Kutulama (Box) Nefesi',
    phases: [
      { name: 'Nefes Al', duration: 4000, instruction: '4 saniye nefes alın', voiceCommand: 'inhale' },
      { name: 'Tut', duration: 4000, instruction: '4 saniye nefesinizi tutun', voiceCommand: 'hold' },
      { name: 'Ver', duration: 4000, instruction: '4 saniye nefes verin', voiceCommand: 'exhale' },
      { name: 'Bekle', duration: 4000, instruction: '4 saniye boş akciğerlerle bekleyin', voiceCommand: 'hold' },
    ],
    color: COLORS.accent,
    benefits: ['Yoğun stres altında sakinleşmeyi sağlar', 'Askerler, sporcular ve pilotlar tarafından kullanılır'],
  },
  'kapalabhati': {
    name: 'Kapalabhati (Ateş Nefesi)',
    phases: [
      { name: 'Hızlı Ver', duration: 1000, instruction: 'Burnuzdan hızlıca ve kuvvetli nefes verin', voiceCommand: 'exhale' },
      { name: 'Pasif Al', duration: 1000, instruction: 'Pasif olarak nefes alın', voiceCommand: 'inhale' },
    ],
    color: COLORS.warning,
    benefits: ['Enerji verir', 'Zihni açar', 'Sindirimi destekler'],
    warning: 'Hamileler ve tansiyon problemi olanlar yapmamalı',
  },
  'anxiety-relief': {
    name: 'Anksiyete Rahatlatma',
    phases: [
      { name: 'Nefes Al', duration: 4000, instruction: 'Yavaşça nefes alın', voiceCommand: 'inhale' },
      { name: 'Ver', duration: 6000, instruction: 'Yavaşça nefes verin', voiceCommand: 'exhale' },
    ],
    color: COLORS.success,
    benefits: ['Anksiyeteyi azaltır', 'Panik atakları önler', 'Sakinleştirici etki'],
  },
  'nadi-shodhana': {
    name: 'Nadi Shodhana (Alternatif Burun Nefesi)',
    phases: [
      { name: 'Sağ Burun Al', duration: 4000, instruction: 'Sağ burun deliğinden derin nefes alın', voiceCommand: 'inhale' },
      { name: 'Sol Burun Ver', duration: 4000, instruction: 'Sol burun deliğinden nefes verin', voiceCommand: 'exhale' },
      { name: 'Sol Burun Al', duration: 4000, instruction: 'Sol burun deliğinden derin nefes alın', voiceCommand: 'inhale' },
      { name: 'Sağ Burun Ver', duration: 4000, instruction: 'Sağ burun deliğinden nefes verin', voiceCommand: 'exhale' },
    ],
    color: COLORS.info,
    benefits: ['Enerji dengesini sağlar', 'Zihni sakinleştirir', 'Odaklanmayı artırır', 'Sinir sistemini dengeler'],
    instruction: 'Sağ elinizin işaret ve orta parmaklarını alnınızın köprüsüne yerleştirin. Baş parmağınız sağ burun deliğinizi, yüzük parmağınız sol burun deliğinizi kapatmak için kullanın.',
  },
  'coherent_breathing': {
    name: 'Uyumlu Nefes (Coherent Breathing)',
    phases: [
      { name: 'Nefes Al', duration: 5000, instruction: '5 saniye nefes alın', voiceCommand: 'inhale' },
      { name: 'Ver', duration: 5000, instruction: '5 saniye nefes verin', voiceCommand: 'exhale' },
    ],
    color: COLORS.primary,
    benefits: ['Kalp sağlığını iyileştirir', 'Stresi azaltır', 'Sinir sistemini dengeler'],
  },
  'alternate_nostril_advanced': {
    name: 'Gelişmiş Alternatif Burun Nefesi',
    phases: [
      { name: 'Sağ Burun Al', duration: 4000, instruction: 'Sağ burun deliğinden nefes alın', voiceCommand: 'inhale' },
      { name: 'Sol Burun Ver', duration: 4000, instruction: 'Sol burun deliğinden nefes verin', voiceCommand: 'exhale' },
      { name: 'Sol Burun Al', duration: 4000, instruction: 'Sol burun deliğinden nefes alın', voiceCommand: 'inhale' },
      { name: 'Sağ Burun Ver', duration: 4000, instruction: 'Sağ burun deliğinden nefes verin', voiceCommand: 'exhale' },
    ],
    color: COLORS.info,
    benefits: ['Enerji dengesini sağlar', 'Odaklanmayı artırır', 'Stresi azaltır'],
  },
  'ujjayi': {
    name: 'Ujjayi (Zafer Nefesi)',
    phases: [
      { name: 'Nefes Al', duration: 4000, instruction: 'Boğazınızı daraltarak nefes alın', voiceCommand: 'inhale' },
      { name: 'Ver', duration: 4000, instruction: 'Boğazınızı daraltarak nefes verin', voiceCommand: 'exhale' },
    ],
    color: COLORS.warning,
    benefits: ['Odaklanmayı artırır', 'Enerji verir', 'Nefes kontrolünü geliştirir'],
  },
  'sitali': {
    name: 'Sitali (Soğutucu Nefes)',
    phases: [
      { name: 'Nefes Al', duration: 4000, instruction: 'Dilinizi rulo yapıp ağzınızdan nefes alın', voiceCommand: 'inhale' },
      { name: 'Nefes Ver', duration: 4000, instruction: 'Burnuzdan nefes verin', voiceCommand: 'exhale' },
    ],
    color: COLORS.info,
    benefits: ['Vücudu soğutur', 'Stresi azaltır', 'Enerji verir'],
  },
  'sitkari': {
    name: 'Sitkari (Diş Nefesi)',
    phases: [
      { name: 'Nefes Al', duration: 4000, instruction: 'Dişlerinizi sıkıp ağzınızdan nefes alın', voiceCommand: 'inhale' },
      { name: 'Nefes Ver', duration: 4000, instruction: 'Burnuzdan nefes verin', voiceCommand: 'exhale' },
    ],
    color: COLORS.info,
    benefits: ['Vücudu soğutur', 'Anksiyeteyi azaltır', 'Odaklanmayı artırır'],
  },
  'bhramari_advanced': {
    name: 'Gelişmiş Brahmari (Arı Nefesi)',
    phases: [
      { name: 'Nefes Al', duration: 3000, instruction: 'Burnuzdan nefes alın', voiceCommand: 'inhale' },
      { name: 'Uğultu', duration: 6000, instruction: 'Ağzınızı kapatıp "mmmm" sesi çıkarın', voiceCommand: 'hum' },
    ],
    color: COLORS.success,
    benefits: ['Uykuya geçişi kolaylaştırır', 'Anksiyeteyi azaltır', 'Sakinleştirici etki'],
  },
  'lion_breath': {
    name: 'Aslan Nefesi (Lion Breath)',
    phases: [
      { name: 'Nefes Al', duration: 3000, instruction: 'Burnuzdan nefes alın', voiceCommand: 'inhale' },
      { name: 'Aslan', duration: 3000, instruction: 'Ağzınızı açıp dilinizi çıkarın, "ha" sesi çıkarın', voiceCommand: 'roar' },
    ],
    color: COLORS.warning,
    benefits: ['Enerji verir', 'Güven artırır', 'Stres azaltır'],
  },
  'victorious_breath': {
    name: 'Zafer Nefesi (Victorious Breath)',
    phases: [
      { name: 'Nefes Al', duration: 4000, instruction: 'Boğazınızı daraltarak nefes alın', voiceCommand: 'inhale' },
      { name: 'Ver', duration: 4000, instruction: 'Boğazınızı daraltarak nefes verin', voiceCommand: 'exhale' },
    ],
    color: COLORS.warning,
    benefits: ['Odaklanmayı artırır', 'Enerji verir', 'Nefes kontrolünü geliştirir'],
  },
  'three_part_breath': {
    name: 'Üç Bölümlü Nefes',
    phases: [
      { name: 'Karın', duration: 3000, instruction: 'Önce karnınızı şişirin', voiceCommand: 'inhale' },
      { name: 'Göğüs', duration: 2000, instruction: 'Sonra göğsünüzü genişletin', voiceCommand: 'inhale' },
      { name: 'Omuz', duration: 2000, instruction: 'Son olarak omuzlarınızı kaldırın', voiceCommand: 'inhale' },
      { name: 'Ver', duration: 7000, instruction: 'Ters sırayla nefes verin', voiceCommand: 'exhale' },
    ],
    color: COLORS.primary,
    benefits: ['Akciğer kapasitesini artırır', 'Anksiyeteyi azaltır', 'Stresi azaltır'],
  },
  'equal_breathing': {
    name: 'Eşit Nefes',
    phases: [
      { name: 'Nefes Al', duration: 4000, instruction: '4 saniye nefes alın', voiceCommand: 'inhale' },
      { name: 'Ver', duration: 4000, instruction: '4 saniye nefes verin', voiceCommand: 'exhale' },
    ],
    color: COLORS.accent,
    benefits: ['Dengeyi sağlar', 'Odaklanmayı artırır', 'Stresi azaltır'],
  },
  'pursed_lip_breathing': {
    name: 'Büzük Dudak Nefesi',
    phases: [
      { name: 'Nefes Al', duration: 3000, instruction: 'Burnuzdan yavaşça nefes alın', voiceCommand: 'inhale' },
      { name: 'Büzük Ver', duration: 6000, instruction: 'Dudaklarınızı büzerek ağzınızdan yavaşça nefes verin', voiceCommand: 'exhale' },
    ],
    color: COLORS.success,
    benefits: ['Solunum kontrolünü artırır', 'Anksiyeteyi azaltır', 'Enerji verir'],
  },
  'deep_breathing': {
    name: 'Derin Nefes',
    phases: [
      { name: 'Derin Al', duration: 5000, instruction: 'Burnuzdan derin ve yavaş nefes alın', voiceCommand: 'inhale' },
      { name: 'Tut', duration: 3000, instruction: '3 saniye nefesinizi tutun', voiceCommand: 'hold' },
      { name: 'Yavaş Ver', duration: 7000, instruction: 'Ağzınızdan yavaşça nefes verin', voiceCommand: 'exhale' },
    ],
    color: COLORS.primary,
    benefits: ['Stresi azaltır', 'Anksiyeteyi azaltır', 'Oksijen alımını artırır'],
  },
  'mindful_breathing': {
    name: 'Farkındalık Nefesi',
    phases: [
      { name: 'Farkında Al', duration: 4000, instruction: 'Nefes alırken farkında olun', voiceCommand: 'inhale' },
      { name: 'Farkında Ver', duration: 6000, instruction: 'Nefes verirken farkında olun', voiceCommand: 'exhale' },
    ],
    color: COLORS.info,
    benefits: ['Farkındalığı artırır', 'Odaklanmayı geliştirir', 'Stresi azaltır'],
  },
  'bhramari': {
    name: 'Bhramari (Arı Nefesi)',
    phases: [
      { name: 'Nefes Al', duration: 3000, instruction: 'Burnuzdan nefes alın', voiceCommand: 'inhale' },
      { name: 'Uğultu', duration: 6000, instruction: 'Ağzınızı kapatıp "mmmm" sesi çıkarın', voiceCommand: 'hum' },
    ],
    color: COLORS.success,
    benefits: ['Uykuya geçişi kolaylaştırır', 'Anksiyeteyi azaltır', 'Sakinleştirici etki'],
  },
  'alternate_nostril': {
    name: 'Alternatif Burun Nefesi',
    phases: [
      { name: 'Sağ Burun Al', duration: 4000, instruction: 'Sağ burun deliğinden derin nefes alın', voiceCommand: 'inhale' },
      { name: 'Sol Burun Ver', duration: 4000, instruction: 'Sol burun deliğinden nefes verin', voiceCommand: 'exhale' },
      { name: 'Sol Burun Al', duration: 4000, instruction: 'Sol burun deliğinden derin nefes alın', voiceCommand: 'inhale' },
      { name: 'Sağ Burun Ver', duration: 4000, instruction: 'Sağ burun deliğinden nefes verin', voiceCommand: 'exhale' },
    ],
    color: COLORS.info,
    benefits: ['Enerji dengesini sağlar', 'Zihni sakinleştirir', 'Odaklanmayı artırır'],
  },
  // brahmari duplicate removed - use 'bhramari' as standard key
};

export default function BreathingExerciseScreen() {
  const route = useRoute<BreathingExerciseScreenRouteProp>();
  const navigation = useNavigation<BreathingExerciseScreenNavigationProp>();
  
  // Route parametrelerini güvenli şekilde al
  const routeParams = route.params || {};
  const { 
    autoStart = false, 
    technique = 'diaphragmatic',
    isPremium,
    techniqueTitle,
    techniqueDescription,
    programDay,
    session
  } = routeParams;

  // Kapsamlı input validation
  const validatedTechnique = validateTechnique(technique) ? technique : 'diaphragmatic';
  const validatedSession = validateSession(session) ? session : undefined;
  const validatedProgramDay = validateProgramDay(programDay) ? programDay : undefined;

  const validatedIsPremium = typeof isPremium === 'boolean' ? isPremium : false;
  const validatedAutoStart = typeof autoStart === 'boolean' ? autoStart : false;
  
  // Validation sonuçlarını sadece development modunda logla
  if (__DEV__) {
    logDebug('BreathingExerciseScreen route params validation:', {
      original: {
        technique,
        isPremium,
        techniqueTitle,
        techniqueDescription,
        programDay,
        session,
        autoStart
      },
      validated: {
        technique: validatedTechnique,
        isPremium: validatedIsPremium,
        techniqueTitle: techniqueTitle || 'Nefes Egzersizi',
        techniqueDescription: techniqueDescription || 'Kişiselleştirilmiş nefes egzersizi',
        programDay: validatedProgramDay,
        session: validatedSession,
        autoStart: validatedAutoStart
      }
    });
  }

  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [cycle, setCycle] = useState(1);
  const [currentTimer, setCurrentTimer] = useState<NodeJS.Timeout | null>(null);
  const [voiceTimer, setVoiceTimer] = useState<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [hasProgress, setHasProgress] = useState(false);
  const [cycleCount, setCycleCount] = useState(3);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [pendingCycleCount, setPendingCycleCount] = useState(1);
  


  // Modern halka için animasyon state'i
  const [progressAnim] = useState(new Animated.Value(0));

  // Değerlendirme modalı için state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);

  const pattern = breathingPatterns[validatedTechnique as keyof typeof breathingPatterns];
  
  // Pattern validation - eğer pattern bulunamazsa default kullan
  if (!pattern) {
    logWarn('Pattern not found for technique, using default', { technique: validatedTechnique });
  }
  const { themeColors } = useTheme();

  // Timer management wrapper functions
  const clearAllTimers = () => {
    // Ana timer'ı temizle
    if (currentTimer) {
      clearInterval(currentTimer);
      setCurrentTimer(null);
    }
    
    // Ses timer'ını temizle
    if (voiceTimer) {
      clearTimeout(voiceTimer);
      setVoiceTimer(null);
    }
    
    // Countdown timer'ı temizle
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    
    // Animasyonu durdur
    progressAnim.stopAnimation();
    progressAnim.setValue(0);
    
    // State'leri de sıfırla
    setTimeLeft(0);
  };

  const startTimer = (callback: () => void, interval: number) => {
    clearAllTimers(); // Önceki timer'ları temizle
    const timer = setInterval(callback, interval);
    setCurrentTimer(timer);
    return timer;
  };

  const startVoiceTimer = (callback: () => void, delay: number) => {
    if (voiceTimer) {
      clearTimeout(voiceTimer);
    }
    const timer = setTimeout(callback, delay);
    setVoiceTimer(timer);
    return timer;
  };

  const preloadBackground = async () => {
    setBackgroundLoaded(true);
  };

  // İlerleme kaydetme fonksiyonu
  const saveProgress = async () => {
    try {
      logInfo('İlerleme kaydedildi (Firestore)', { technique: validatedTechnique, cycle, currentPhase });
    } catch (error) {
      logError('İlerleme kaydedilemedi', error);
    }
  };

  // İlerleme yükleme fonksiyonu
  const loadProgress = async () => {
    try {
      logInfo('İlerleme yüklendi (Firestore)', { technique: validatedTechnique });
      return false;
    } catch (error) {
      logError('İlerleme yüklenemedi', error);
    }
    return false;
  };

  // İlerleme silme fonksiyonu
  const clearProgress = async () => {
    try {
      setHasProgress(false);
      logInfo('İlerleme temizlendi (Firestore)');
    } catch (error) {
      logError('İlerleme silinemedi', error);
    }
  };

  // Döngü sayısını güncelleme fonksiyonu
  const updateCycleCount = async (newCount: number) => {
    try {
      // Geçerli döngü sayısı kontrolü (1-8 arası)
      if (newCount < 1 || newCount > 8) {
        Alert.alert('Hata', 'Döngü sayısı 1-8 arası olmalıdır.');
        return;
      }
      
      // Eğer egzersiz aktifse, durdur
      if (isActive) {
        await stopExercise(true);
      }
      
      // Mevcut kullanıcıyı al
      const currentUser = getCurrentUser();
      if (currentUser) {
        // Firestore'a kaydet
        await updateUserCycleCount(currentUser.uid, newCount);
        logInfo('Döngü sayısı Firestore\'a kaydedildi', { 
          userId: currentUser.uid, 
          newCycleCount: newCount 
        });
      } else {
        // Misafir kullanıcı - AsyncStorage'a kaydet
        await AsyncStorage.setItem('guest_cycle_count', newCount.toString());
        logInfo('Misafir döngü sayısı AsyncStorage\'a kaydedildi', { 
          newCycleCount: newCount 
        });
      }
      
      // State'leri güncelle
      setCycleCount(newCount);
      setPendingCycleCount(newCount);
      
      Alert.alert(
        'Döngü Sayısı Güncellendi',
        `Döngü sayısı ${newCount} olarak ayarlandı. Bu tercih TÜM nefes tekniklerinde kullanılacak.`,
        [{ text: 'Tamam' }]
      );
    } catch (error) {
      logError('Döngü sayısı güncellenemedi:', error);
      Alert.alert('Hata', 'Döngü sayısı güncellenirken bir hata oluştu.');
    }
  };

  // Döngü modal'ını açma fonksiyonu
  const openCycleModal = () => {
    setPendingCycleCount(cycleCount);
    setShowCycleModal(true);
  };

  // Döngü modal'ını kapatma fonksiyonu
  const closeCycleModal = () => {
    setShowCycleModal(false);
  };

  // Döngü sayısını kaydetme fonksiyonu
  const saveCycleCount = () => {
    updateCycleCount(pendingCycleCount);
    closeCycleModal();
  };

  // Döngü sayısını oku - TÜM TEKNİKLER İÇİN AYNI
  const fetchCycleCount = async () => {
    try {
      const currentUser = getCurrentUser();
      
      if (currentUser) {
        // Giriş yapmış kullanıcı - Firestore'dan oku
        try {
          const userPrefs = await getUserPreferences(currentUser.uid);
          if (userPrefs && userPrefs.cycleCount) {
            const firestoreCycleCount = userPrefs.cycleCount;
            if (firestoreCycleCount >= 1 && firestoreCycleCount <= 8) {
              setCycleCount(firestoreCycleCount);
              setPendingCycleCount(firestoreCycleCount);
              logInfo('Döngü sayısı Firestore\'dan yüklendi - TÜM TEKNİKLER İÇİN', { 
                cycleCount: firestoreCycleCount,
                userId: currentUser.uid,
                currentTechnique: validatedTechnique
              });
              return;
            }
          }
        } catch (firestoreError) {
          logWarn('Firestore\'dan döngü sayısı alınamadı:', firestoreError);
        }
      } else {
        // Misafir kullanıcı - AsyncStorage'dan oku
        try {
          const storedCycleCount = await AsyncStorage.getItem('guest_cycle_count');
          if (storedCycleCount) {
            const count = parseInt(storedCycleCount);
            if (count >= 1 && count <= 8) {
              setCycleCount(count);
              setPendingCycleCount(count);
              logInfo('Misafir döngü sayısı AsyncStorage\'dan yüklendi', { 
                cycleCount: count,
                currentTechnique: validatedTechnique
              });
              return;
            }
          }
        } catch (asyncStorageError) {
          logWarn('AsyncStorage\'dan döngü sayısı alınamadı:', asyncStorageError);
        }
      }
      
      // Hiçbir yerden alınamadıysa varsayılan değer kullan
      const defaultCycleCount = 3;
      setCycleCount(defaultCycleCount);
      setPendingCycleCount(defaultCycleCount);
      logInfo('Varsayılan döngü sayısı kullanılıyor', { 
        defaultCycleCount,
        currentTechnique: validatedTechnique
      });
    } catch (error) {
      logError('Döngü sayısı okunamadı, varsayılan değer kullanılıyor:', error);
      const defaultCycleCount = 3;
      setCycleCount(defaultCycleCount);
      setPendingCycleCount(defaultCycleCount);
    }
  };

  // Optimized useEffect - Consolidate all initialization and cleanup logic
  useEffect(() => {
    let autoStartTimer: NodeJS.Timeout | null = null;
    
    const initializeScreen = async () => {
      try {
        setIsLoading(true);
        logDebug('Egzersiz sayfası başlatılıyor...');
        
        await preloadBackground();
        await loadProgress();
        
        // Egzersiz sayfasına girince "rahat bir pozisyon alın" sesi çal
        playVoiceCommand('cool');
        
      } catch (error) {
        const errorInfo = analyzeNetworkError(error);
        
        if (errorInfo.isNetworkError) {
          await handleError(error, 'initializeScreen', {
            title: 'Bağlantı Hatası',
            message: 'İnternet bağlantınızı kontrol edin. Egzersiz yerel modda çalışacak.',
            actions: [
              { title: 'Tamam', onPress: () => logInfo('Kullanıcı network hatasını kabul etti, local mod devam ediyor') }
            ]
          });
        } else {
          await handleError(error, 'initializeScreen', {
            title: 'Egzersiz Başlatma Hatası',
            message: 'Egzersiz başlatılırken bir hata oluştu. Lütfen tekrar deneyin.',
            actions: [
              { title: 'Tekrar Dene', onPress: () => initializeScreen() },
              { title: 'Geri Dön', onPress: () => navigation.goBack() }
            ]
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeScreen();
    fetchCycleCount();

    // Otomatik başlatma kontrolü
    if (validatedAutoStart && !isActive && !hasProgress) {
      autoStartTimer = setTimeout(() => {
        startExercise();
      }, 1000);
    }

    // Cleanup function
    return () => {
      clearAllTimers();
      if (autoStartTimer) {
        clearTimeout(autoStartTimer);
      }
    };
  }, []);

  // İlerleme kaydetme - her 5 saniyede bir
  useEffect(() => {
    let saveInterval: NodeJS.Timeout | null = null;
    
    if (isActive) {
      saveInterval = setInterval(saveProgress, 5000);
    }
    
    return () => {
      if (saveInterval) {
        clearInterval(saveInterval);
      }
    };
  }, [isActive, cycle, currentPhase, timeLeft]);

  // Pattern bulunamazsa varsayılan pattern kullan
  if (!pattern) {
    logWarn(`Pattern not found for technique: ${validatedTechnique}, using default`);
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Bu nefes tekniği henüz mevcut değil.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Breathing cycle effect
  useEffect(() => {
    if (isActive && !isLoading && currentPhase === 0 && cycle === 1) {
      startBreathingCycle(0);
    }
  }, [isActive, isLoading, currentPhase, cycle]);

  // Döngü sayısı değiştiğinde egzersizi yeniden başlat
  useEffect(() => {
    if (isActive && cycleCount > 0) {
      logInfo('Döngü sayısı değişti, egzersiz yeniden başlatılıyor', { 
        newCycleCount: cycleCount,
        currentCycle: cycle
      });
      
      // Eğer mevcut döngü, yeni döngü sayısını geçtiyse egzersizi durdur
      if (cycle > cycleCount) {
        logInfo('Mevcut döngü sayısı aşıldı, egzersiz tamamlanıyor', { 
          currentCycle: cycle,
          maxCycleCount: cycleCount
        });
        handleExerciseComplete();
        return;
      }
      
      // Eğer egzersiz aktifse ve döngü sayısı değiştiyse yeniden başlat
      if (isActive && cycle <= cycleCount) {
        // Mevcut fazı yeniden başlat
        startBreathingCycle(currentPhase);
      }
    }
  }, [cycleCount]); // Sadece cycleCount değişince tetiklenmeli!

  const startBreathingCycle = (phaseIndex?: number) => {
    if (!isActive) return;
    
    // Sonsuz döngü güvenlik kontrolü
    if (cycle > cycleCount) {
      logWarn('startBreathingCycle: Döngü sayısı aşıldı, fonksiyon durduruluyor', {
        cycle,
        cycleCount
      });
      return;
    }
    
    // Eğer phaseIndex verilmişse onu kullan, yoksa currentPhase'i kullan
    const currentPhaseIndex = phaseIndex !== undefined ? phaseIndex : currentPhase;
    const phase = pattern.phases[currentPhaseIndex];
    const durationInSeconds = Math.ceil(phase.duration / 1000);
    
    // Timer ve animasyonu aynı anda başlat
    setTimeLeft(durationInSeconds);
    
    // Her faz için sesli komut çal
    if (phase.voiceCommand) {
      playVoiceCommand(phase.voiceCommand);
    }
    
    // Animasyonu başlat
    progressAnim.setValue(0);
    
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: durationInSeconds * 1000, // Saniyeyi milisaniye çevir
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
    
    triggerHapticFeedback(HapticType.LIGHT);
    
    // Saniye sayımı için timer başlat
    countdownTimerRef.current = setInterval(() => {
      if (!isActive) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        return;
      }
      
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Süre doldu, timer'ı durdur
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Timer ile faz geçişi yap
    const phaseTimer = setTimeout(() => {
      // Timer'ı temizle
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      
      // Faz tamamlandı, sonraki faza geç
      const nextPhase = (currentPhaseIndex + 1) % pattern.phases.length;
      
      if (nextPhase === 0) {
        // Döngü tamamlandı
        logInfo('🔍 DÖNGÜ KONTROLÜ - DEBUG', { 
          currentCycle: cycle,
          cycleCount: cycleCount,
          isActive: isActive,
          nextPhase: nextPhase
        });
        
        // Cycle'ı güvenli şekilde artır ve devam/bitiş kararını aynı anda ver
        const targetCycleCount = cycleCount;
        setCycle((prevCycle) => {
          const updatedCycle = prevCycle + 1;

          if (updatedCycle > targetCycleCount) {
            // Tüm döngüler tamamlandı
          logInfo('🎯 EGZERSİZ BİTİYOR! Tüm döngüler tamamlandı', { 
              completedCycles: targetCycleCount,
              totalCycles: targetCycleCount,
              previousCycle: prevCycle,
              updatedCycle
            });
          setIsActive(false);
          clearAllTimers();
          handleExerciseComplete();
          } else {
            // Yeni döngüyü başlatmak için fazı sıfırla ve bir sonraki render'a bırak
        setCurrentPhase(0);
            setTimeout(() => {
              if (isActive) {
        startBreathingCycle(0);
              }
            }, 0);
          }
          return updatedCycle;
        });
      } else {
        // Sonraki faza geç
        setCurrentPhase(nextPhase);
        // Faz state güncellendikten hemen sonra bir sonraki fazı başlat
        setTimeout(() => {
          if (isActive) {
        startBreathingCycle(nextPhase);
          }
        }, 0);
      }
    }, phase.duration);
    
    // Timer'ı ref'e sakla
    if (currentTimer) {
      clearTimeout(currentTimer);
    }
    setCurrentTimer(phaseTimer);
  };

  const startExercise = async () => {
    try {
      setIsLoading(true);
      logDebug('Egzersiz başlatılıyor...');
      
      await stopVoice();
      
      // Egzersiz başlamadan önce güncel döngü sayısını al
      await fetchCycleCount();
      
      setIsActive(true);
      setHasProgress(false);
      setCycle(1);
      setCurrentPhase(0);
      setTimeLeft(0);
      triggerHapticFeedback(HapticType.MEDIUM);
      
      // Döngü sayısı kontrolü - sadece geçersiz değerler için uyarı ver
      if (cycleCount < 1 || cycleCount > 8) {
        logWarn('Geçersiz döngü sayısı, mevcut değer kullanılıyor', { 
          currentCycleCount: cycleCount 
        });
      }
      
      startBreathingCycle(0);
      
      logUserAction('Exercise Started', { 
        technique: validatedTechnique, 
        isPremium,
        programDay: validatedProgramDay,
        session: validatedSession
      });
      
    } catch (error) {
      logError('Egzersiz başlatma hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const continueExercise = async () => {
    // Devam etmeden önce güncel döngü sayısını al
    await fetchCycleCount();
    
    setIsActive(true);
    setHasProgress(false);
    triggerHapticFeedback(HapticType.MEDIUM);
    startBreathingCycle(currentPhase);
  };

  const stopExercise = async (stopVoiceCommands: boolean = true) => {
    // Önce isActive'i false yap
    setIsActive(false);
    
    // Tüm timer'ları zorla temizle
    if (currentTimer) {
      clearInterval(currentTimer);
      setCurrentTimer(null);
    }
    if (voiceTimer) {
      clearTimeout(voiceTimer);
      setVoiceTimer(null);
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    
    // Animasyonu zorla durdur ve listener'ları temizle
    progressAnim.stopAnimation();
    progressAnim.setValue(0);
    progressAnim.removeAllListeners();
    
    // Sesli komutları durdur
    if (stopVoiceCommands) {
      try {
        await stopVoice();
      } catch (error) {
        logError('Stop voice error:', error);
      }
    }
    
    // State'leri sıfırla
    setTimeLeft(0);
    setCurrentPhase(0);
    setCycle(1);
    
    triggerHapticFeedback(HapticType.LIGHT);
    
    logUserAction('Exercise Stopped', { 
      technique: validatedTechnique, 
      cycle,
      currentPhase
    });
  };

  const resetExercise = () => {
    // Tüm timer'ları zorla temizle
    if (currentTimer) {
      clearInterval(currentTimer);
      setCurrentTimer(null);
    }
    if (voiceTimer) {
      clearTimeout(voiceTimer);
      setVoiceTimer(null);
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    
    // Animasyonu zorla durdur ve listener'ları temizle
    progressAnim.stopAnimation();
    progressAnim.setValue(0);
    progressAnim.removeAllListeners();
    
    // State'leri sıfırla
    setCycle(1);
    setCurrentPhase(0);
    setTimeLeft(0);
    setHasProgress(false);
    setIsActive(false);
    
    clearProgress();
    
    triggerHapticFeedback(HapticType.LIGHT);
  };

  // İlerleme devam etme dialog'u
  const showContinueDialog = () => {
    Alert.alert(
      'Devam Et',
      `Daha önce ${cycle}. döngüde kalmıştınız. Kaldığınız yerden devam etmek istiyor musunuz?`,
      [
        {
          text: 'Yeni Başlat',
          onPress: resetExercise,
          style: 'destructive',
        },
        {
          text: 'Devam Et',
          onPress: continueExercise,
        },
        {
          text: 'İptal',
          style: 'cancel',
        },
      ]
    );
  };

  // Dairesel progress için hesaplamalar
  const size = 220;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const currentPhaseData = pattern.phases[currentPhase];

  // Komut metni (nefes al/ver)
  const commandText = isActive ? (currentPhaseData?.name || '') : '';
  const instructionText = isActive ? (currentPhaseData?.instruction || '') : '';

  // Egzersiz adı ve toplam süre
  const exerciseName = pattern?.name || '';
  const totalSeconds = useMemo(() => {
    // Pattern phases sürelerini topla (milisaniye cinsinden)
    const totalPhaseDuration = pattern.phases.reduce((total, phase) => total + phase.duration, 0);
    // Milisaniyeyi saniyeye çevir ve döngü sayısı ile çarp
    return Math.ceil(totalPhaseDuration / 1000) * cycleCount;
  }, [pattern, cycleCount]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Süreyi teknik ve döngüye göre hesaplayan yardımcı fonksiyon
  const getExerciseDurationText = useMemo(() => {
    // Pattern phases sürelerini kullan
    const totalPhaseDuration = pattern.phases.reduce((total, phase) => total + phase.duration, 0);
    const totalSeconds = Math.ceil(totalPhaseDuration / 1000) * cycleCount;
    return `${totalSeconds} saniye`;
  }, [pattern, cycleCount]);

  // Değerlendirme fonksiyonu
  const handleRating = (rating: number) => {
    setSelectedRating(rating);
    triggerHapticFeedback(HapticType.SELECTION);
    
    // Değerlendirmeyi kaydet
    const currentUser = getCurrentUser();
    if (currentUser) {
      logUserAction('User Rating', { rating, technique: validatedTechnique });
    }
    
    // Modal'ı kapat ve doğru sayfaya dön
    setTimeout(async () => {
      setShowRatingModal(false);
      
      // Local zorla güncelleme kaldırıldı; senkronizasyon PersonalizedProgramScreen'de yapılacak
      
      // Eğer kişisel programdan geldiyse, kişisel program sayfasına dön
      if (validatedProgramDay && validatedSession) {
        if (validatedIsPremium) {
          navigation.replace('PremiumProgram');
        } else {
          navigation.replace('PersonalizedProgram');
        }
      } else {
        // Hızlı egzersizden geldiyse ana sayfaya dön
        navigation.goBack();
      }
    }, 1000);
  };

  // Egzersiz tamamlandığında istatistikleri güncelle ve mesaj göster
  const handleExerciseComplete = async () => {
    // Egzersizi hemen durdur ve sesli komutları durdur
    await stopExercise(false);
    
    // Tüm timer'ları temizle ve sesli komutları durdur
    clearAllTimers();
    await stopVoice();
    
    // Başarı haptic feedback'i
    setTimeout(() => {
      triggerHapticFeedback(HapticType.SUCCESS);
    }, 500);

    // Döngü sayısını state'ten al
    const currentCycleCount = cycleCount;
    
    // Toplam süreyi hesapla (saniye) - pattern phases sürelerini kullan
    const totalPhaseDuration = pattern.phases.reduce((total, phase) => total + phase.duration, 0);
    const totalSeconds = Math.ceil(totalPhaseDuration / 1000) * currentCycleCount;
    const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));

    logExerciseCompletion(validatedTechnique, totalMinutes, validatedIsPremium);

    // İstatistikleri güncelle
    const currentUser = getCurrentUser();
    if (currentUser) {
      // Önce mevcut istatistikleri al
      const stats = await getUserStats(currentUser.uid);
      
      // Streak hesaplama - DOĞRU MANTIK
      let newCurrentStreak = 1; // Varsayılan olarak 1
      let newLongestStreak = stats?.longestStreak || 0;
      
      if (stats?.lastSessionDate) {
        const lastSessionDate = new Date(stats.lastSessionDate);
        const today = new Date();
        
        // Tarihleri sadece gün olarak karşılaştır (saat farkını yok say)
        const lastSessionDay = new Date(lastSessionDate.getFullYear(), lastSessionDate.getMonth(), lastSessionDate.getDate());
        const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        const diffTime = todayDay.getTime() - lastSessionDay.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        logInfo(`Streak calculation: lastSession=${lastSessionDate.toISOString()}, today=${today.toISOString()}, diffDays=${diffDays}`);
        
        if (diffDays === 0) {
          // Aynı gün - streak artırma, mevcut streak'i koru
          newCurrentStreak = stats.currentStreak || 0;
          logInfo(`Same day exercise, keeping current streak: ${newCurrentStreak}`);
        } else if (diffDays === 1) {
          // Dün egzersiz yapılmış - streak +1
          newCurrentStreak = (stats.currentStreak || 0) + 1;
          logInfo(`Consecutive day, increasing streak to: ${newCurrentStreak}`);
        } else {
          // Arada boş gün var - streak'i 1'e sıfırla
          newCurrentStreak = 1;
          logInfo(`Gap in days (${diffDays} days), resetting streak to: ${newCurrentStreak}`);
        }
      } else {
        // İlk egzersiz
        logInfo('First exercise session, starting streak: 1');
      }
      
      // En uzun streak'i güncelle
      newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);
      
      // Favori teknikleri güncelle
      let favoriteTechniques = stats?.favoriteTechniques || [];
      // Teknik sayımını tutmak için bir nesne oluştur
      let techniqueCounts: { [key: string]: number } = stats?.techniqueCounts || {};
      
      // Mevcut tekniği ekle/güncelle
      techniqueCounts[validatedTechnique] = (techniqueCounts[validatedTechnique] || 0) + 1;
      
      // En çok yapılan teknikleri sırala (sayıya göre)
      const sortedTechniques = Object.entries(techniqueCounts)
        .sort((a, b) => b[1] - a[1]) // En çok yapılandan en aza
        .map(([tech]) => tech);
      
      favoriteTechniques = sortedTechniques;
      
      const newStats = {
        totalSessions: (stats?.totalSessions || 0) + 1,
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastSessionDate: new Date().toISOString(),
        lastSessionTechnique: validatedTechnique,
        favoriteTechniques,
        techniqueCounts, // Teknik sayılarını da kaydet
      };
      await saveUserStats(currentUser.uid, newStats);
      await saveExerciseSession(currentUser.uid, {
        technique: validatedTechnique,
        duration: totalMinutes,
        date: new Date().toISOString(),
        completed: true,
      } as any);

      logInfo('Statistics updated, program update starting...');

      // Program güncellemesi - sadece kişisel programdan geldiğinde çalıştır
      try {
        // Sadece gerçekten kişisel programdan geldiğinde çalıştır
        if (validatedProgramDay && validatedSession && (validatedIsPremium !== undefined || validatedProgramDay > 0)) {
        try {
          logInfo('Program update starting...');
          
          // Premium program kontrolü
          if (validatedIsPremium && validatedProgramDay) {
            logInfo(`Premium program day ${validatedProgramDay} completed`);
          
          try {
            const sessionKey = `${validatedProgramDay}-${validatedSession}`;
            logInfo(`Premium session key: ${sessionKey}`);
            
            // Firebase'de premium session'ı tamamla
            const { completePremiumDay } = await import('../services/firestoreService');
            const updatedProgram = await completePremiumDay(currentUser.uid, sessionKey);
            
            if (updatedProgram) {
              // Premium program başarıyla güncellendi
              logInfo('Premium program updated successfully');
              logInfo('Updated completedDays:', updatedProgram.completedDays);
              logInfo('Updated program length:', updatedProgram.completedDays.length);
              logInfo('Premium program type confirmed:', updatedProgram.isPremium === true);
            } else {
              logWarn('Premium program update failed - updatedProgram is null');
            }
          } catch (error) {
            logError('Premium program update error:', error);
          }
        } else {
          // Normal program güncellemesi - FİRESTORE ANA KAYNAK
          logInfo('Normal program update starting - Firestore as main source');
          
          // Önce Firestore'dan güncel program verisini al
          const { getUserProgram } = await import('../services/firestoreService');
          const firestoreProgram = await getUserProgram(currentUser.uid);
          
          if (!firestoreProgram || firestoreProgram.isPremium) {
            logWarn('Firestore program not found or is premium, skipping update');
            return;
          }
          
          logInfo('Firestore program data:', firestoreProgram);
          logInfo('Firestore completedDays:', firestoreProgram.completedDays);
          logInfo('Firestore currentDay:', firestoreProgram.currentDay);
          
          // Program gününü tamamla (route parametresinden al)
          const currentDayToComplete = validatedProgramDay || firestoreProgram.currentDay;
          logInfo(`Checking if day ${currentDayToComplete} is already completed...`);
          logInfo(`Route programDay: ${validatedProgramDay}, Using: ${currentDayToComplete}`);
          
          // Gün sınırı kontrolü (5 günlük program)
          if (currentDayToComplete > 5) {
            logWarn(`Day ${currentDayToComplete} is beyond 5-day program limit`);
            return;
          }
          
          if (!firestoreProgram.completedDays.includes(currentDayToComplete)) {
            logInfo(`Day ${currentDayToComplete} not completed yet, completing...`);
            
            // Firestore'da completeDay fonksiyonunu kullan
            const { completeDay } = await import('../services/firestoreService');
            await completeDay(currentUser.uid, currentDayToComplete);
            logInfo('Firestore completeDay completed');
            
            // Program güncellemesi tamamlandı
            try {
              const updatedProgram = await getUserProgram(currentUser.uid);
              if (updatedProgram && !updatedProgram.isPremium) {
                logInfo('Program updated successfully in Firestore');
                logInfo('Updated completedDays:', updatedProgram.completedDays);
                logInfo('Updated currentDay:', updatedProgram.currentDay);
              }
            } catch (error) {
              logError('Program update verification error:', error);
            }
            
            logInfo(`Day ${currentDayToComplete} marked as completed in Firestore`);
          } else {
            logInfo(`Day ${currentDayToComplete} already completed, skipping...`);
          }
        }
      } catch (error) {
        logError('Program update error:', error);
      }
    }
  } catch (error) {
      const errorInfo = analyzeNetworkError(error);
        
        if (errorInfo.isNetworkError) {
          await handleError(error, 'handleExerciseComplete', {
            title: 'Bağlantı Hatası',
            message: 'İnternet bağlantınızı kontrol edin. İlerlemeniz yerel olarak kaydedildi.',
            actions: [
              { title: 'Tamam', onPress: () => logInfo('Kullanıcı network hatasını kabul etti, local progress kaydedildi') }
            ]
          });
        } else {
          await handleError(error, 'handleExerciseComplete', {
            title: 'İlerleme Kaydetme Hatası',
            message: 'İlerlemeniz kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.',
            actions: [
              { title: 'Tekrar Dene', onPress: () => handleExerciseComplete() },
              { title: 'İptal', onPress: () => {}, style: 'cancel' }
            ]
          });
        }
      }
    }

    // Sadece tamamlanma mesajını söyle - güvenli şekilde
    setTimeout(async () => {
      try {
        logInfo('EXERCISE COMPLETED: finish.mp3 playing');
        await playVoiceCommand('finish');
        
        // 2 saniye sonra motivasyon mesajı
        setTimeout(async () => {
          try {
            logInfo('EXERCISE COMPLETED: motivation message playing');
            await playRandomMotivation();
          } catch (error) {
            logError('Motivation message error:', error);
          }
        }, 2000);
      } catch (error) {
        logError('Finish message error:', error);
      }
    }, 100);
    
    clearProgress();
    
    // Değerlendirme modalını göster
    setShowRatingModal(true);
  };

  if (isLoading) {
  return (
    <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(245, 245, 220, 0.1)', borderColor: '#DDD', borderWidth: 1, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 }}>
            <ActivityIndicator size="large" color="#F5F5DC" style={{ marginBottom: 16 }} />
            <Text style={[standardTextStyles.bodyLarge, { color: '#F5F5DC', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              Egzersiz hazırlanıyor...
            </Text>
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover" onLoad={() => setBackgroundLoaded(true)}>
      {/* En üstte başlık */}
      <View style={{ width: '100%', alignItems: 'center', marginTop: 130, marginBottom: 16 }}>
        <View style={{ backgroundColor: 'rgba(245, 245, 220, 0.1)', borderColor: '#DDD', borderWidth: 1, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', letterSpacing: 1, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            {techniqueTitle || exerciseName}
          </Text>
      </View>
      </View>
      
      {/* Teknik açıklaması varsa göster */}
      {techniqueDescription && (
        <View style={{ width: '100%', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ backgroundColor: 'rgba(245, 245, 220, 0.05)', borderColor: '#DDD', borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, maxWidth: '90%' }}>
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              {techniqueDescription}
            </Text>
          </View>
        </View>
      )}
      {/* Ortada halka ve komut */}
      <View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 80 }}>
        <View style={{ width: 240, height: 240, justifyContent: 'center', alignItems: 'center' }}>
          <Svg width={240} height={240} style={{ position: 'absolute', left: 0, top: 0 }}>
            <Circle
              stroke="#FFF"
              fill="none"
              cx={120}
              cy={120}
              r={110}
              strokeWidth={12}
              opacity={0.18}
            />
            <AnimatedCircle
              stroke="#D4E8D4"
              fill="none"
              cx={120}
              cy={120}
              r={110}
              strokeWidth={12}
              strokeDasharray={`${2 * Math.PI * 110}, ${2 * Math.PI * 110}`}
              strokeDashoffset={progress}
              strokeLinecap="round"
            />
          </Svg>
          {/* Dairenin ortası tıklanabilir, komut metni */}
          <TouchableOpacity
            style={{ position: 'absolute', left: 0, top: 0, width: 240, height: 240, justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={0.7}
            onPress={() => {
              if (!isActive && !hasProgress) {
                startExercise();
              } else if (isActive) {
                stopExercise();
              } else if (!isActive && hasProgress) {
                startExercise();
              }
            }}
          >
            <Text style={[standardTextStyles.bodyLarge, { color: '#F5F5DC', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              {String(commandText || (!isActive ? 'Başlamak için dokun' : ''))}
            </Text>
          </TouchableOpacity>
        </View>
        {/* Halkanın hemen altında kalan süre */}
        <Text style={[standardTextStyles.mainTitle, { color: '#F5F5DC', marginTop: 12, marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>{isActive ? String(timeLeft) : ''}</Text>
        
        {/* Komut açıklaması - Beyaz çerçeveli şeffaf kutu */}
        {instructionText && (
          <View style={{ backgroundColor: 'rgba(245, 245, 220, 0.1)', borderColor: '#DDD', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginTop: 8, marginBottom: 16 }}>
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>{String(instructionText)}</Text>
          </View>
        )}
        
        {/* Döngü sayısı - Biraz aşağıda */}
        <TouchableOpacity 
          style={{ backgroundColor: 'rgba(245, 245, 220, 0.1)', borderColor: '#DDD', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, marginTop: 20 }}
          onPress={openCycleModal}
          activeOpacity={0.7}
        >
          <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Döngü {String(Math.min(cycle, cycleCount))} / {String(cycleCount)}</Text>
        </TouchableOpacity>
      </View>
      
      {/* Değerlendirme Modal */}
      {showRatingModal && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <View style={{
            backgroundColor: 'rgba(245, 245, 220, 0.95)',
            borderRadius: 20,
            padding: 30,
            margin: 20,
            alignItems: 'center',
            borderColor: '#DDD',
            borderWidth: 1,
          }}>
            <Text style={[standardTextStyles.cardTitle, { 
              color: '#2C3E50', 
              marginBottom: 20, 
              textAlign: 'center',
              textShadowColor: 'rgba(0, 0, 0, 0.3)',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2
            }]}>
              Kendinizi nasıl hissediyorsunuz?
            </Text>
            
            <Text style={[standardTextStyles.bodyMedium, { 
              color: '#34495E', 
              marginBottom: 30, 
              textAlign: 'center',
              textShadowColor: 'rgba(0, 0, 0, 0.2)',
              textShadowOffset: { width: 0.5, height: 0.5 },
              textShadowRadius: 1
            }]}>
              Egzersiz sonrası hislerinizi değerlendirin
            </Text>
            
            {/* 5 Yıldız */}
            <View style={{ flexDirection: 'row', marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleRating(star)}
                  style={{ marginHorizontal: 8 }}
                >
                  <Text style={{ 
                    fontSize: 40, 
                    color: selectedRating >= star ? '#FFD700' : '#DDD',
                    textShadowColor: 'rgba(0, 0, 0, 0.3)',
                    textShadowOffset: { width: 1, height: 1 },
                    textShadowRadius: 2
                  }}>
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Değerlendirme Açıklamaları */}
            <View style={{ alignItems: 'center' }}>
              {selectedRating > 0 && (
                <Text style={[standardTextStyles.bodyMedium, { 
                  color: '#2C3E50', 
                  textAlign: 'center',
                  fontStyle: 'italic',
                  textShadowColor: 'rgba(0, 0, 0, 0.2)',
                  textShadowOffset: { width: 0.5, height: 0.5 },
                  textShadowRadius: 1
                }]}>
                  {selectedRating === 1 && 'Çok kötü'}
                  {selectedRating === 2 && 'Kötü'}
                  {selectedRating === 3 && 'Orta'}
                  {selectedRating === 4 && 'İyi'}
                  {selectedRating === 5 && 'Mükemmel'}
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Döngü Sayısı Modal */}
      {showCycleModal && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <View style={{
            backgroundColor: COLORS.white,
            borderRadius: 20,
            padding: 24,
            width: 320,
            alignItems: 'center',
          }}>
            <Text style={[standardTextStyles.cardTitle, { 
              marginBottom: 20,
              color: COLORS.text,
            }]}>
              Egzersiz Döngü Sayısı
            </Text>
            
                         <Text style={[standardTextStyles.bodyMedium, { 
               color: COLORS.textSecondary,
               marginBottom: 16,
               textAlign: 'center'
             }]}>
               TÜM nefes teknikleri için kaç döngü yapılacağını seçin
             </Text>
            
            {/* Döngü Sayısı Seçenekleri */}
            <View style={{ 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              justifyContent: 'center', 
              marginBottom: 24 
            }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
                <TouchableOpacity
                  key={count}
                  onPress={() => setPendingCycleCount(count)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: pendingCycleCount === count ? COLORS.primary : COLORS.gray[200],
                    justifyContent: 'center',
                    alignItems: 'center',
                    margin: 6,
                  }}
                >
                  <Text style={[standardTextStyles.bodyMedium, { 
                    color: pendingCycleCount === count ? COLORS.white : COLORS.text,
                    fontFamily: pendingCycleCount === count ? 'Tahoma' : 'Tahoma',
                  }]}>
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Butonlar */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              width: '100%' 
            }}>
              <TouchableOpacity
                onPress={closeCycleModal}
                style={{
                  flex: 1,
                  padding: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={[standardTextStyles.bodyMedium, { 
                  color: COLORS.error,
                }]}>
                  İptal
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={saveCycleCount}
                style={{
                  flex: 1,
                  padding: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={[standardTextStyles.bodyMedium, { 
                  color: COLORS.primary,
                }]}>
                  Kaydet
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    ...standardTextStyles.bodyMedium,
    color: COLORS.primary,
  },
  titleContainer: {
    marginBottom: 20,
  },
  exerciseTitle: {
    ...standardTextStyles.cardTitle,
    color: COLORS.text,
    marginBottom: 8,
  },
  exerciseDescription: {
    ...standardTextStyles.bodyMedium,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  durationText: {
    ...standardTextStyles.bodySmall,
    color: COLORS.primary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  techniqueInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  techniqueName: {
    ...standardTextStyles.mainTitle,
    color: COLORS.text,
    marginBottom: 8,
  },
  techniqueInstruction: {
    ...standardTextStyles.bodyMedium,
    color: COLORS.textSecondary,
  },
  breathingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathingText: {
    ...standardTextStyles.mainTitle,
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  controls: {
    alignItems: 'center',
    marginBottom: 40,
  },
  cycleInfo: {
    marginBottom: 20,
  },
  cycleText: {
    ...standardTextStyles.bodyMedium,
    color: COLORS.textSecondary,
  },
  controlButton: {
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  controlButtonText: {
    ...standardTextStyles.buttonLarge,
    color: COLORS.white,
  },
  benefitsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  benefitsTitle: {
    ...standardTextStyles.cardTitle,
    color: COLORS.text,
    marginBottom: 12,
  },
  benefitText: {
    ...standardTextStyles.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  instructionText: {
    ...standardTextStyles.bodyLarge,
    color: COLORS.text,
    textAlign: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  timerText: {
    ...standardTextStyles.mainTitle,
    color: COLORS.primary,
  },
  errorText: {
    ...standardTextStyles.bodyLarge,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressText: {
    ...standardTextStyles.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  resetButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  resetButtonText: {
    ...standardTextStyles.bodyMedium,
    color: COLORS.textSecondary,
  },
});