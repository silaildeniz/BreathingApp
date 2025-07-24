import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { speakCommand, speakStart, speakComplete, speakCycle, speakMotivation, speakCountdown, stopVoice } from '../utils/voiceAssistant';
import { COLORS, FONTS } from '../constants/typography';
import { triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../services/authService';
import { saveUserStats, saveExerciseSession, getUserStats } from '../services/firestoreService';

type BreathingExerciseScreenRouteProp = RouteProp<RootStackParamList, 'BreathingExercise'>;
type BreathingExerciseScreenNavigationProp = StackNavigationProp<RootStackParamList, 'BreathingExercise'>;

const { width, height } = Dimensions.get('window');

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
    name: 'Kutlama (Box) Nefesi',
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
      { name: 'Sağ Burun Al', duration: 4000, instruction: 'Sağ burun deliğinden derin nefes alın', voiceCommand: 'right-nostril' },
      { name: 'Sol Burun Ver', duration: 4000, instruction: 'Sol burun deliğinden nefes verin', voiceCommand: 'exhale' },
      { name: 'Sol Burun Al', duration: 4000, instruction: 'Sol burun deliğinden derin nefes alın', voiceCommand: 'left-nostril' },
      { name: 'Sağ Burun Ver', duration: 4000, instruction: 'Sağ burun deliğinden nefes verin', voiceCommand: 'exhale' },
    ],
    color: COLORS.info,
    benefits: ['Enerji dengesini sağlar', 'Zihni sakinleştirir', 'Odaklanmayı artırır', 'Sinir sistemini dengeler'],
    instruction: 'Sağ elinizin işaret ve orta parmaklarını alnınızın köprüsüne yerleştirin. Baş parmağınız sağ burun deliğinizi, yüzük parmağınız sol burun deliğinizi kapatmak için kullanın.',
  },
};

// Her teknik için 1 döngü süresi (saniye)
const CYCLE_DURATIONS: { [key: string]: number } = {
  'diaphragmatic': 10,
  '4-7-8': 19,
  'box-breathing': 8,
  'kapalabhati': 2,
  'nadi-shodhana': 8,
};

export default function BreathingExerciseScreen() {
  const route = useRoute<BreathingExerciseScreenRouteProp>();
  const navigation = useNavigation<BreathingExerciseScreenNavigationProp>();
  const { technique, duration, title, description } = route.params;

  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [cycle, setCycle] = useState(1);
  const [totalCycles] = useState(5);
  const [currentTimer, setCurrentTimer] = useState<NodeJS.Timeout | null>(null);
  const [hasProgress, setHasProgress] = useState(false);
  const [cycleCount, setCycleCount] = useState(5);

  const pattern = breathingPatterns[technique as keyof typeof breathingPatterns];
  const { themeColors } = useTheme();

  // İlerleme kaydetme fonksiyonu
  const saveProgress = async () => {
    try {
      const progress = {
        technique,
        cycle,
        currentPhase,
        timeLeft,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(`exercise_progress_${technique}`, JSON.stringify(progress));
    } catch (error) {
      console.error('İlerleme kaydedilemedi:', error);
    }
  };

  // İlerleme yükleme fonksiyonu
  const loadProgress = async () => {
    try {
      const savedProgress = await AsyncStorage.getItem(`exercise_progress_${technique}`);
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        const timeDiff = Date.now() - progress.timestamp;
        
        // 30 dakikadan eski ilerleme varsa sil
        if (timeDiff > 30 * 60 * 1000) {
          await AsyncStorage.removeItem(`exercise_progress_${technique}`);
          return;
        }

        setCycle(progress.cycle);
        setCurrentPhase(progress.currentPhase);
        setTimeLeft(progress.timeLeft);
        setHasProgress(true);
        return true;
      }
    } catch (error) {
      console.error('İlerleme yüklenemedi:', error);
    }
    return false;
  };

  // İlerleme silme fonksiyonu
  const clearProgress = async () => {
    try {
      await AsyncStorage.removeItem(`exercise_progress_${technique}`);
      setHasProgress(false);
    } catch (error) {
      console.error('İlerleme silinemedi:', error);
    }
  };

  // Component mount olduğunda ilerleme kontrolü
  useEffect(() => {
    loadProgress();
  }, []);

  // Döngü sayısını AsyncStorage'dan oku
  useEffect(() => {
    const fetchCycleCount = async () => {
      try {
        const stored = await AsyncStorage.getItem('cycle_count');
        if (stored) setCycleCount(parseInt(stored));
      } catch {}
    };
    fetchCycleCount();
  }, []);

  // İlerleme kaydetme - her 5 saniyede bir
  useEffect(() => {
    if (isActive) {
      const saveInterval = setInterval(saveProgress, 5000);
      return () => clearInterval(saveInterval);
    }
  }, [isActive, cycle, currentPhase, timeLeft]);

  // Pattern bulunamazsa varsayılan pattern kullan
  if (!pattern) {
    console.warn(`Pattern not found for technique: ${technique}, using default`);
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Bu nefes tekniği henüz mevcut değil.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  useEffect(() => {
    if (isActive) {
      startBreathingCycle();
    }
  }, [isActive, currentPhase]);

  const startBreathingCycle = () => {
    // Bu kontrol kaldırıldı çünkü timer içinde daha doğru kontrol yapılıyor

    const phase = pattern.phases[currentPhase];
    const durationInSeconds = Math.ceil(phase.duration / 1000);
    
    // Eğer timeLeft 0'dan büyükse (devam ediyorsa) kullan, yoksa yeni başlat
    if (timeLeft === 0) {
      setTimeLeft(durationInSeconds);
    }

    // Haptic feedback
    triggerHapticFeedback(HapticType.LIGHT);
    
    // Sesli komut - her faz için kendi komutu
    setTimeout(() => {
      speakCommand(phase.voiceCommand);
    }, 100);

    // Timer başlat
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          const nextPhase = (currentPhase + 1) % pattern.phases.length;
          setCurrentPhase(nextPhase);
          
          if (nextPhase === 0) {
            // Döngü tamamlandı
            const newCycle = cycle + 1;
            setCycle(newCycle);
            
            // Eğer bu son döngüyse egzersizi bitir
            if (newCycle > totalCycles) {
              handleExerciseComplete();
              return 0;
            }
          }
          return 0;
        }
        
        return prev - 1;
      });
    }, 1000);

    setCurrentTimer(timer);
  };

  const startExercise = () => {
    setIsActive(true);
    setHasProgress(false); // İlerleme varsa temizle
    setCycle(1); // Yeni başlangıç için döngüyü sıfırla
    setCurrentPhase(0);
    setTimeLeft(0);
    speakStart();
    triggerHapticFeedback(HapticType.MEDIUM);
  };

  const continueExercise = () => {
    setIsActive(true);
    setHasProgress(false);
    speakStart();
    triggerHapticFeedback(HapticType.MEDIUM);
  };

  const stopExercise = (stopVoiceCommands: boolean = true) => {
    setIsActive(false);
    
    // Timer'ı durdur
    if (currentTimer) {
      clearInterval(currentTimer);
      setCurrentTimer(null);
    }
    
    // Sesli komutları durdur
    stopVoice();
    
    triggerHapticFeedback(HapticType.LIGHT);
  };

  const resetExercise = () => {
    setCycle(1);
    setCurrentPhase(0);
    setTimeLeft(0);
    setHasProgress(false);
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

  // Ekrandan çıkıldığında sesi durdur
  useEffect(() => {
    return () => {
      stopVoice();
      if (currentTimer) {
        clearInterval(currentTimer);
      }
    };
  }, [currentTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentPhaseData = pattern.phases[currentPhase];

  // Süreyi teknik ve döngüye göre hesaplayan yardımcı fonksiyon
  const getExerciseDurationText = () => {
    const cycleDuration = CYCLE_DURATIONS[technique] || 10;
    const totalSeconds = cycleDuration * cycleCount;
    return `${totalSeconds} saniye`;
  };

  // Egzersiz tamamlandığında istatistikleri güncelle ve mesaj göster
  const handleExerciseComplete = async () => {
    // Egzersizi hemen durdur ve sesli komutları durdur
    stopExercise(false);

    // Döngü sayısını ayardan al (varsayılan 5)
    let cycleCount = 5;
    try {
      const stored = await AsyncStorage.getItem('cycle_count');
      if (stored) cycleCount = parseInt(stored);
    } catch {}

    // Toplam süreyi hesapla (saniye)
    const cycleDuration = CYCLE_DURATIONS[technique] || 10;
    const totalSeconds = cycleDuration * cycleCount;
    const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));

    // İstatistikleri güncelle
    const currentUser = getCurrentUser();
    if (currentUser) {
      // Önce mevcut istatistikleri al
      const stats = await getUserStats(currentUser.uid);
      // Favori teknikleri güncelle
      let favoriteTechniques = stats?.favoriteTechniques || [];
      // Teknik sayımını tutmak için bir nesne oluştur
      let techniqueCounts: { [key: string]: number } = {};
      favoriteTechniques.forEach(t => { techniqueCounts[t] = (techniqueCounts[t] || 0) + 1; });
      // Şimdi mevcut tekniği ekle
      techniqueCounts[technique] = (techniqueCounts[technique] || 0) + 1;
      // En çok yapılan teknikleri sırala
      const sortedTechniques = Object.entries(techniqueCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([tech]) => tech);
      favoriteTechniques = sortedTechniques;
      const newStats = {
        totalSessions: (stats?.totalSessions || 0) + 1,
        totalMinutes: (stats?.totalMinutes || 0) + totalMinutes,
        currentStreak: (stats?.currentStreak || 0) + 1,
        longestStreak: Math.max((stats?.longestStreak || 0), (stats?.currentStreak || 0) + 1),
        lastSessionDate: new Date().toISOString(),
        lastSessionTechnique: technique, // yeni alan
        favoriteTechniques,
      };
      await saveUserStats(currentUser.uid, newStats);
      await saveExerciseSession(currentUser.uid, {
        technique: technique,
        duration: totalMinutes,
        date: new Date().toISOString(),
        completed: true,
      });
    }

    // Sadece tamamlanma mesajını söyle
    setTimeout(() => {
      speakComplete();
    }, 100);

    triggerHapticFeedback(HapticType.SUCCESS);
    clearProgress();
    Alert.alert('Tamamlandı!', 'Nefes egzersiziniz tamamlandı. Kendinizi nasıl hissediyorsunuz?');
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }] }>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={[styles.backButtonText, { color: themeColors.primary }]}>← Geri</Text>
        </TouchableOpacity>
        {/* Başlık kısmı */}
        {title && (
          <View style={styles.titleContainer}>
            <Text style={[styles.exerciseTitle, { color: themeColors.text }]}>{title}</Text>
            {/* Eğer başlık 'Nefes Egzersizi' ise açıklama veya tekrar başlık gösterme */}
            {title !== 'Nefes Egzersizi' && description && (
              <Text style={[styles.exerciseDescription, { color: themeColors.textSecondary }]}>{description}</Text>
            )}
            {duration && title !== 'Nefes Egzersizi' && (
              <Text style={[styles.durationText, { color: themeColors.primary }]}>Süre: {getExerciseDurationText()}</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.content}>
        {/* Timer üstte */}
        {isActive && (
          <View style={styles.timerContainer}>
            <Text style={[styles.timerText, { color: themeColors.primary }]}>
              {timeLeft}
            </Text>
          </View>
        )}

        <View style={styles.breathingContainer}>
          <Text style={[styles.breathingText, { color: themeColors.primary }]}>
            {currentPhaseData.name}
          </Text>
          <Text style={[styles.instructionText, { color: themeColors.text }]}>
            {currentPhaseData.instruction}
          </Text>
        </View>

        <View style={styles.controls}>
          <View style={styles.cycleInfo}>
            <Text style={[styles.cycleText, { color: themeColors.textSecondary }]}>
              Döngü {Math.min(cycle, totalCycles)} / {totalCycles}
            </Text>
            {hasProgress && !isActive && (
              <Text style={[styles.progressText, { color: themeColors.textSecondary }] }>
                Kaldığınız yerden devam edebilirsiniz
              </Text>
            )}
          </View>

          {!isActive && hasProgress && (
            <TouchableOpacity
              style={[
                styles.controlButton,
                { backgroundColor: themeColors.secondary, marginBottom: 10 }
              ]}
              onPress={showContinueDialog}
              activeOpacity={0.8}
            >
              <Text style={[styles.controlButtonText, { color: themeColors.text }] }>
                Devam Et
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.controlButton,
              { backgroundColor: isActive ? COLORS.error : themeColors.primary }
            ]}
            onPress={isActive ? () => stopExercise(true) : startExercise}
            activeOpacity={0.8}
          >
            <Text style={[styles.controlButtonText, { color: themeColors.text }] }>
              {isActive ? 'Durdur' : 'Başlat'}
            </Text>
          </TouchableOpacity>

          {!isActive && hasProgress && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetExercise}
              activeOpacity={0.8}
            >
              <Text style={[styles.resetButtonText, { color: themeColors.textSecondary }] }>
                Sıfırla
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
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
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.primary,
  },
  titleContainer: {
    marginBottom: 20,
  },
  exerciseTitle: {
    fontSize: 24,
    fontFamily: 'Tahoma',
    color: COLORS.text,
    marginBottom: 8,
  },
  exerciseDescription: {
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 22,
  },
  durationText: {
    fontSize: 14,
    fontFamily: 'Tahoma',
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
    fontSize: 28,
    fontFamily: 'Tahoma',
    color: COLORS.text,
    marginBottom: 8,
  },
  techniqueInstruction: {
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  breathingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathingText: {
    fontSize: 48,
    fontFamily: 'Tahoma',
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
    fontSize: 16,
    fontFamily: 'Tahoma',
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
    fontSize: 18,
    fontFamily: 'Tahoma',
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
    fontSize: 18,
    fontFamily: 'Tahoma',
    color: COLORS.text,
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
  },
  instructionText: {
    fontSize: 20,
    fontFamily: 'Tahoma',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 26,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  timerText: {
    fontSize: 120,
    fontFamily: 'Tahoma',
    color: COLORS.primary,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Tahoma',
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Tahoma',
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
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
  },
}); 