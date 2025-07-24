import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { getStoredProgram, completeDay as completeDayLocal, isDayLocked, resetProgram } from '../utils/programStorage';
import { completeDay as completeDayFirestore, isDayLockedFirestore, saveUserStats, getUserStats, saveExerciseSession } from '../services/firestoreService';
import { getCurrentUser } from '../services/authService';
import { PersonalizedProgram } from '../utils/programGenerator';
import { COLORS, FONTS } from '../constants/typography';
import { triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';
import AsyncStorage from '@react-native-async-storage/async-storage';

type PersonalizedProgramScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PersonalizedProgram'>;

interface DayProgram extends PersonalizedProgram {
  completed: boolean;
}

// Her teknik için 1 döngü süresi (saniye)
const CYCLE_DURATIONS: { [key: string]: number } = {
  'diaphragmatic': 10,
  '4-7-8': 19,
  'box-breathing': 8,
  'kapalabhati': 2,
  'nadi-shodhana': 8,
};

export default function PersonalizedProgramScreen() {
  const navigation = useNavigation<PersonalizedProgramScreenNavigationProp>();
  const [program, setProgram] = useState<DayProgram[]>([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPersonalizedProgram();
  }, []);

  const loadPersonalizedProgram = async () => {
    try {
      const storedProgram = await getStoredProgram();
      
      if (!storedProgram) {
        Alert.alert(
          'Program Bulunamadı',
          'Henüz bir değerlendirme yapmadınız. Lütfen önce değerlendirme ekranına gidin.',
          [
            {
              text: 'Değerlendirme Yap',
              onPress: () => navigation.navigate('Assessment'),
            },
            {
              text: 'Ana Sayfa',
              onPress: () => navigation.navigate('Home'),
            },
          ]
        );
        return;
      }

      // Eğer program hala 20 günlükse, kullanıcıya sıfırlama seçeneği sun
      if (storedProgram.program.length > 10) {
        Alert.alert(
          'Program Güncellemesi',
          'Programınız eski 20 günlük formatta. Yeni 10 günlük programa geçmek için programınızı sıfırlamanız gerekiyor.',
          [
            {
              text: 'Şimdilik Hayır',
              style: 'cancel',
            },
            {
              text: 'Programı Sıfırla',
              onPress: async () => {
                await resetProgram();
                navigation.navigate('Assessment');
              },
            },
          ]
        );
        return;
      }

      // Programı completed durumu ve kilit durumu ile birleştir
      const currentUser = getCurrentUser();
      const programWithStatus = await Promise.all(
        storedProgram.program.map(async (day) => {
          // Hem yerel storage hem de Firestore'dan kilit durumunu kontrol et
          const isLockedLocal = await isDayLocked(day.day);
          let isLockedFirestore = true;
          
          if (currentUser) {
            isLockedFirestore = await isDayLockedFirestore(currentUser.uid, day.day);
          }
          
          // En katı kilitleme: Her iki sistemde de kilitli olmamalı
          const isLocked = isLockedLocal || isLockedFirestore;
          
          return {
            ...day,
            completed: storedProgram.completedDays.includes(day.day),
            isLocked: isLocked,
          };
        })
      );

      setProgram(programWithStatus);
      setCurrentDay(storedProgram.currentDay);
      setTotalCompleted(storedProgram.completedDays.length);
    } catch (error) {
      console.error('Program yükleme hatası:', error);
      Alert.alert('Hata', 'Program yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDayComplete = async (dayNumber: number) => {
    try {
      triggerHapticFeedback(HapticType.SUCCESS);
      
      // Hem yerel storage hem de Firestore'u güncelle
      const currentUser = getCurrentUser();
      if (currentUser) {
        await completeDayFirestore(currentUser.uid, dayNumber);
        // İstatistikleri güncelle
        // Günün programını bul
        const day = program.find(d => d.day === dayNumber);
        const technique = day?.techniques?.[0] || '-';
        // Döngü sayısını ayardan al (varsayılan 5)
        let cycleCount = 5;
        try {
          const stored = await AsyncStorage.getItem('cycle_count');
          if (stored) cycleCount = parseInt(stored);
        } catch {}
        // Toplam süreyi hesapla (saniye)
        const cycleDuration = CYCLE_DURATIONS[technique] || 10;
        const totalSeconds = cycleDuration * cycleCount;
        const duration = Math.max(1, Math.round(totalSeconds / 60));
        // Önce mevcut istatistikleri al
        const stats = await getUserStats(currentUser.uid);
        // Favori teknikleri güncelle
        let favoriteTechniques = stats?.favoriteTechniques || [];
        let techniqueCounts: { [key: string]: number } = {};
        favoriteTechniques.forEach(t => { techniqueCounts[t] = (techniqueCounts[t] || 0) + 1; });
        techniqueCounts[technique] = (techniqueCounts[technique] || 0) + 1;
        const sortedTechniques = Object.entries(techniqueCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([tech]) => tech);
        favoriteTechniques = sortedTechniques;
        const newStats = {
          totalSessions: (stats?.totalSessions || 0) + 1,
          totalMinutes: (stats?.totalMinutes || 0) + duration,
          currentStreak: (stats?.currentStreak || 0) + 1,
          longestStreak: Math.max((stats?.longestStreak || 0), (stats?.currentStreak || 0) + 1),
          lastSessionDate: new Date().toISOString(),
          lastSessionTechnique: technique,
          favoriteTechniques,
        };
        await saveUserStats(currentUser.uid, newStats);
        await saveExerciseSession(currentUser.uid, {
          technique,
          duration,
          date: new Date().toISOString(),
          completed: true,
        });
      }
      await completeDayLocal(dayNumber);
      // Programı yeniden yükle
      await loadPersonalizedProgram();
      // Ana sayfaya reset ile dön ve veri tazelensin
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (error) {
      console.error('Gün tamamlama hatası:', error);
      Alert.alert('Hata', 'Gün tamamlanırken bir hata oluştu.');
    }
  };

  const handleResetProgram = () => {
    Alert.alert(
      'Programı Sıfırla',
      'Programınızı sıfırlamak istediğinizden emin misiniz? Bu işlem tüm ilerlemenizi silecek ve yeni bir program oluşturmanız gerekecek.',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: async () => {
            try {
              triggerHapticFeedback(HapticType.MEDIUM);
              await resetProgram();
              Alert.alert(
                'Program Sıfırlandı',
                'Programınız başarıyla sıfırlandı. Yeni bir program oluşturmak için değerlendirme ekranına yönlendiriliyorsunuz.',
                [
                  {
                    text: 'Tamam',
                    onPress: () => navigation.navigate('Assessment'),
                  },
                ]
              );
            } catch (error) {
              console.error('Program sıfırlama hatası:', error);
              Alert.alert('Hata', 'Program sıfırlanırken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const startDayExercise = (day: DayProgram) => {
    triggerHapticFeedback(HapticType.MEDIUM);
    // Burada BreathingExerciseScreen'e yönlendir ve teknik bilgilerini geç
    navigation.navigate('BreathingExercise', {
      technique: day.techniques[0], // İlk tekniği kullan
      duration: day.duration,
      title: day.title,
      description: day.description,
    });
  };

  const getTechniqueName = (technique: string) => {
    const techniqueNames: { [key: string]: string } = {
      '4-7-8': '4-7-8 Tekniği',
      'box-breathing': 'Kutu Nefesi',
      'coherent-breathing': 'Uyumlu Nefes',
      'alternate-nostril': 'Alternatif Burun Nefesi',
      'bhramari': 'Bhramari',
      'kapalabhati': 'Kapalabhati',
      'anxiety-relief': 'Anksiyete Rahatlatma',
      'wim-hof': 'Wim Hof Metodu',
    };
    
    return techniqueNames[technique] || technique;
  };

  const getProgressPercentage = () => {
    if (program.length === 0) return 0;
    return Math.round((totalCompleted / program.length) * 100);
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'low': return COLORS.success;
      case 'medium': return COLORS.warning;
      case 'high': return COLORS.error;
      default: return COLORS.primary;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Programınız yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (program.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Program Bulunamadı</Text>
          <Text style={styles.emptyText}>
            Kişiselleştirilmiş programınızı oluşturmak için önce değerlendirme yapın.
          </Text>
          <TouchableOpacity
            style={styles.assessmentButton}
            onPress={() => navigation.navigate('Assessment')}
            activeOpacity={0.8}
          >
            <Text style={styles.assessmentButtonText}>Değerlendirme Yap</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Kişiselleştirilmiş Program</Text>
          <Text style={styles.subtitle}>
            10 günlük nefes egzersizi yolculuğunuz
          </Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${getProgressPercentage()}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {totalCompleted} / {program.length} gün tamamlandı ({getProgressPercentage()}%)
            </Text>
          </View>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetProgram}
            activeOpacity={0.8}
          >
            <Text style={styles.resetButtonText}>Program Sıfırla</Text>
          </TouchableOpacity>
        </View>

        {/* Program tamamlandı mesajı */}
        {totalCompleted >= 10 && (
          <View style={styles.completionCard}>
            <Text style={styles.completionTitle}>🎉 Program Tamamlandı! 🎉</Text>
            <Text style={styles.completionText}>
              Tebrikler! 10 günlük nefes egzersizi programınızı başarıyla tamamladınız. 
              İlerlemenizi değerlendirmek ve yeni bir program oluşturmak için tekrar test yapabilirsiniz.
            </Text>
            <TouchableOpacity
              style={styles.retakeAssessmentButton}
              onPress={() => navigation.navigate('Assessment')}
              activeOpacity={0.8}
            >
              <Text style={styles.retakeAssessmentButtonText}>Tekrar Test Yap</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.programContainer}>
          {program.map((day) => (
            <View key={day.day} style={[
              styles.dayCard,
              day.isLocked && !day.completed && styles.lockedCard
            ]}>
              <View style={styles.dayHeader}>
                <View style={styles.dayNumberContainer}>
                  <Text style={styles.dayNumber}>Gün {day.day}</Text>
                  {day.completed && (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedText}>✓</Text>
                    </View>
                  )}
                  {day.isLocked && !day.completed && (
                    <View style={styles.lockedBadge}>
                      <Text style={styles.lockedText}>🔒</Text>
                    </View>
                  )}
                </View>
                <View style={[
                  styles.intensityBadge,
                  { backgroundColor: getIntensityColor(day.intensity) }
                ]}>
                  <Text style={styles.intensityText}>
                    {day.intensity === 'low' ? 'Düşük' : 
                     day.intensity === 'medium' ? 'Orta' : 'Yüksek'}
                  </Text>
                </View>
              </View>

              <Text style={styles.dayTitle}>{day.title}</Text>
              <Text style={styles.dayDescription}>{day.description}</Text>
              
              <View style={styles.dayDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Odak:</Text>
                  <Text style={styles.detailValue}>{day.focus}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Süre:</Text>
                  <Text style={styles.detailValue}>{day.duration}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Teknikler:</Text>
                  <Text style={styles.detailValue}>
                    {day.techniques.map(getTechniqueName).join(', ')}
                  </Text>
                </View>
              </View>

              <View style={styles.benefitsContainer}>
                <Text style={styles.benefitsTitle}>Faydalar:</Text>
                {day.benefits.map((benefit, index) => (
                  <Text key={index} style={styles.benefitText}>• {benefit}</Text>
                ))}
              </View>

              <View style={styles.actionButtons}>
                {day.isLocked && !day.completed ? (
                  <View style={styles.lockedMessage}>
                    <Text style={styles.lockedMessageText}>
                      Bu gün henüz kilitli. Önceki günleri tamamlayın.
                    </Text>
                  </View>
                ) : !day.completed ? (
                  <>
                    <TouchableOpacity
                      style={styles.startButton}
                      onPress={() => startDayExercise(day)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.startButtonText}>Egzersizi Başlat</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.markCompleteButton}
                      onPress={() => handleDayComplete(day.day)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.markCompleteButtonText}>Tamamlandı</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.completedButton}
                    onPress={() => startDayExercise(day)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.completedButtonText}>Tekrar Yap</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
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
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Tahoma',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.gray[200],
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Tahoma',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  assessmentButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  assessmentButtonText: {
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.white,
  },
  programContainer: {
    gap: 20,
  },
  dayCard: {
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
  lockedCard: {
    opacity: 0.5,
    backgroundColor: COLORS.gray[100],
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 18,
    fontFamily: 'Tahoma',
    color: COLORS.text,
  },
  completedBadge: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  completedText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: 'Tahoma',
  },
  lockedBadge: {
    backgroundColor: COLORS.warning,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  lockedText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: 'Tahoma',
  },
  intensityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  intensityText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'Tahoma',
  },
  dayTitle: {
    fontSize: 20,
    fontFamily: 'Tahoma',
    color: COLORS.text,
    marginBottom: 8,
  },
  dayDescription: {
    fontSize: 14,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  dayDetails: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Tahoma',
    color: COLORS.text,
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
    flex: 1,
  },
  benefitsContainer: {
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.text,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
    marginBottom: 4,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 14,
    flex: 1,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 14,
    fontFamily: 'Tahoma',
    color: COLORS.white,
  },
  completedButton: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    padding: 14,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  completedButtonText: {
    fontSize: 14,
    fontFamily: 'Tahoma',
    color: COLORS.primary,
  },
  markCompleteButton: {
    backgroundColor: COLORS.warning,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: COLORS.warning,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markCompleteButtonText: {
    fontSize: 14,
    fontFamily: 'Tahoma',
    color: COLORS.white,
  },
  lockedMessage: {
    backgroundColor: COLORS.error + '10',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.error + '20',
  },
  lockedMessageText: {
    fontSize: 14,
    fontFamily: 'Tahoma',
    color: COLORS.error,
    textAlign: 'center',
  },
  completionCard: {
    backgroundColor: COLORS.success + '10',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.success,
    alignItems: 'center',
  },
  completionTitle: {
    fontSize: 24,
    fontFamily: 'Tahoma',
    color: COLORS.success,
    marginBottom: 12,
    textAlign: 'center',
  },
  completionText: {
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  retakeAssessmentButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  retakeAssessmentButtonText: {
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.white,
  },
  resetButton: {
    backgroundColor: COLORS.error,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 20,
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.white,
  },
}); 