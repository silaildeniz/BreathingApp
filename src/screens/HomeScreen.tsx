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
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout, getCurrentUser } from '../services/authService';
import { getUserProgram, getUserStats } from '../services/firestoreService';
import { PersonalizedProgram } from '../utils/programGenerator';
import { colors, theme } from '../constants/colors';
import { FONTS } from '../constants/typography';
import { HapticFeedback, triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';
import { AuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

// Her teknik için 1 döngü süresi (saniye)
const CYCLE_DURATIONS: { [key: string]: number } = {
  'diaphragmatic': 10,
  '4-7-8': 19,
  'box-breathing': 8,
  'kapalabhati': 2,
  'nadi-shodhana': 8,
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
  const { isGuest } = useContext(AuthContext);
  type UserProgramState = {
    program: PersonalizedProgram[];
    completedDays: number[];
    currentDay: number;
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

  // İstatistikler için örnek state (ileride gerçek verilerle doldurulacak)
  type StatsType = {
    totalSessions: number;
    totalMinutes: number;
    currentStreak: number;
    longestStreak: number;
    lastSessionDate: string;
    favoriteTechniques: string[];
    lastSessionTechnique: string;
  };
  const [stats, setStats] = useState<StatsType>({
    totalSessions: 0,
    totalMinutes: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastSessionDate: '-',
    favoriteTechniques: [],
    lastSessionTechnique: '-',
  });

  // Animasyon için state
  const [fadeAnim] = useState(new Animated.Value(0));
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  // Firebase'den kullanıcı verilerini yükle
  const loadUserData = async () => {
    try {
      console.log('HomeScreen: loadUserData başladı');
      const currentUser = getCurrentUser();
      if (!currentUser) {
        console.log('HomeScreen: Kullanıcı bulunamadı');
        setIsLoading(false);
        return;
      }

      console.log('HomeScreen: Firestore\'dan program verisi alınıyor...');
      // Firestore'dan kullanıcı programını al
      const programData = await getUserProgram(currentUser.uid);
      console.log('HomeScreen: Program verisi alındı:', programData);
      
      if (programData) {
        const newUserProgram = {
          program: programData.program,
          completedDays: programData.completedDays,
          currentDay: programData.currentDay,
        };
        console.log('HomeScreen: userProgram state güncelleniyor:', newUserProgram);
        setUserProgram(newUserProgram);
      } else {
        console.log('HomeScreen: Program verisi bulunamadı');
        setUserProgram(null);
      }

      console.log('HomeScreen: Firestore\'dan istatistik verisi alınıyor...');
      // Firestore'dan kullanıcı istatistiklerini al
      const statsData = await getUserStats(currentUser.uid);
      console.log('HomeScreen: İstatistik verisi alındı:', statsData);
      
      if (statsData) {
        setStats({
          totalSessions: statsData.totalSessions ?? 0,
          totalMinutes: statsData.totalMinutes ?? 0,
          currentStreak: statsData.currentStreak ?? 0,
          longestStreak: statsData.longestStreak ?? 0,
          lastSessionDate: statsData.lastSessionDate ?? '-',
          favoriteTechniques: statsData.favoriteTechniques ?? [],
          lastSessionTechnique: statsData.lastSessionTechnique ?? '-',
        });
      }

      setIsLoading(false);
      console.log('HomeScreen: loadUserData tamamlandı');
    } catch (error) {
      console.error('Kullanıcı verileri yüklenirken hata:', error);
      setIsLoading(false);
    }
  };

  // Ekran odaklandığında verileri yenile
  useFocusEffect(
    React.useCallback(() => {
      console.log('HomeScreen: useFocusEffect tetiklendi');
      loadUserData();
    }, [])
  );

  // İlk yükleme
  useEffect(() => {
    console.log('HomeScreen: İlk useEffect tetiklendi');
    loadUserData();
  }, []);

  // Navigation reset ile döndüğünde veriyi yenile
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('HomeScreen: Navigation focus event tetiklendi');
      // Kısa bir gecikme ile veriyi yenile
      setTimeout(() => {
        loadUserData();
      }, 100);
    });

    return unsubscribe;
  }, [navigation]);

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

  const handleLogout = async () => {
    HapticFeedback.medium();
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              HapticFeedback.success();
            } catch (error: any) {
              HapticFeedback.error();
              Alert.alert('Hata', error.message);
            }
          }
        }
      ]
    );
  };

  const handleStartExercise = (technique: string, duration?: string) => {
    HapticFeedback.medium();
    navigation.navigate('BreathingExercise', {
      technique,
      duration,
      title: technique,
      description: `${duration} dakikalık ${technique} egzersizi`
    });
  };

  const handleAssessment = () => {
    HapticFeedback.medium();
    navigation.navigate('Assessment');
  };

  const handlePersonalizedProgram = () => {
    HapticFeedback.medium();
    
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
    navigation.navigate('Settings');
  };

  // Sadece giriş yapmış kullanıcılar için program kontrolü
  useEffect(() => {
    if (!isLoading && !userProgram && !isGuest) {
      navigation.navigate('Assessment');
    }
  }, [isLoading, userProgram, navigation, isGuest]);

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
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.welcomeText, { color: themeColors.text }]}>Hoş Geldiniz!</Text>
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: colors.primary[100], borderColor: colors.primary[300] }]} 
          onPress={handleLogout}
        >
          <Text style={[styles.logoutButtonText, { color: colors.primary[600] }]}>Çıkış</Text>
        </TouchableOpacity>
      </View>

      {/* Program Status - Sadece giriş yapmış kullanıcılar için */}
      {userProgram && !isGuest && (
        <View style={[styles.programCard, { backgroundColor: themeColors.surface, shadowColor: colors.primary[300] }]}>
          <Text style={[styles.programTitle, { color: themeColors.text }]}>Kişisel Programınız</Text>
          <Text style={[styles.programSubtitle, { color: themeColors.textSecondary }]}>Gün {userProgram.currentDay} / {userProgram.program.length}</Text>
          <Text style={[styles.programProgress, { color: themeColors.textSecondary }]}>{userProgram.completedDays.length} gün tamamlandı</Text>
          <TouchableOpacity
            style={[styles.programButton, { backgroundColor: colors.primary[500] }]}
            onPress={handlePersonalizedProgram}
          >
            <Text style={[styles.programButtonText, { color: '#FFFFFF' }]}>Programı Görüntüle</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Misafir kullanıcılar için kişisel program butonu */}
      {isGuest && (
        <View style={[styles.programCard, { backgroundColor: themeColors.surface, shadowColor: colors.primary[300] }]}>
          <Text style={[styles.programTitle, { color: themeColors.text }]}>Kişisel Program</Text>
          <Text style={[styles.programSubtitle, { color: themeColors.textSecondary }]}>Giriş yaparak kişisel programınızı oluşturun</Text>
          <TouchableOpacity
            style={[styles.programButton, { backgroundColor: colors.primary[500] }]}
            onPress={handlePersonalizedProgram}
          >
            <Text style={[styles.programButtonText, { color: '#FFFFFF' }]}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* İstatistik Kartı */}
      <Text style={[styles.sectionTitle, { color: themeColors.text, marginLeft: 20, marginBottom: 8 }]}>İstatistikler</Text>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16, paddingBottom: 8 }}>
          {/* Her istatistik için kart */}
          <View style={[styles.statCard, { backgroundColor: STAT_CARD_COLORS[0] }]}> {/* Toplam Egzersiz */}
            <Text style={styles.statIcon}>{STAT_CARD_ICONS[0]}</Text>
            <Text style={styles.statLabel}>Toplam Egzersiz</Text>
            <Text style={styles.statNumber}>{String(stats.totalSessions)}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: STAT_CARD_COLORS[1] }]}> {/* Toplam Süre */}
            <Text style={styles.statIcon}>{STAT_CARD_ICONS[1]}</Text>
            <Text style={styles.statLabel}>Toplam Süre (dk)</Text>
            <Text style={styles.statNumber}>{String(stats.totalMinutes)}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: STAT_CARD_COLORS[2] }]}> {/* Seri */}
            <Text style={styles.statIcon}>{STAT_CARD_ICONS[2]}</Text>
            <Text style={styles.statLabel}>Seri (gün)</Text>
            <Text style={styles.statNumber}>{String(stats.currentStreak)}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: STAT_CARD_COLORS[3] }]}> {/* Son Egzersiz */}
            <Text style={styles.statIcon}>{STAT_CARD_ICONS[3]}</Text>
            <Text style={styles.statLabel}>Son Egzersiz</Text>
            <Text style={styles.statNumber}>{String(stats.lastSessionTechnique ?? '-')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: STAT_CARD_COLORS[4] }]}> {/* En Çok Yapılan Teknik */}
            <Text style={styles.statIcon}>{STAT_CARD_ICONS[4]}</Text>
            <Text style={styles.statLabel}>En Çok Yapılan Teknik</Text>
            <Text style={styles.statNumber}>{String(stats.favoriteTechniques.length > 0 ? stats.favoriteTechniques[0] : '-')}</Text>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Quick Exercises */}
      <View style={styles.quickExercises}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Hızlı Egzersizler</Text>
        
        <TouchableOpacity
          style={[styles.exerciseCard, { backgroundColor: themeColors.surface, shadowColor: colors.primary[300] }]}
          onPress={() => handleStartExercise('diaphragmatic', '5')}
        >
          <Text style={[styles.exerciseTitle, { color: colors.primary[600] }]}>Karın (Diyafram) Nefesi</Text>
          <Text style={[styles.exerciseDescription, { color: themeColors.textSecondary }]}>Karın şişmesini sağlayarak diyafram kasını aktif kullanarak sakinleş!</Text>
          <Text style={[styles.exerciseDuration, { color: themeColors.textSecondary }]}>{getExerciseDurationText('diaphragmatic')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exerciseCard, { backgroundColor: themeColors.surface, shadowColor: colors.secondary[300] }]}
          onPress={() => handleStartExercise('4-7-8', '5')}
        >
          <Text style={[styles.exerciseTitle, { color: colors.secondary[600] }]}>4-7-8 Nefes Tekniği</Text>
          <Text style={[styles.exerciseDescription, { color: themeColors.textSecondary }]}>4-7-8 ritmi ile stresi azaltıp uykuya geçişini kolaylaştır!</Text>
          <Text style={[styles.exerciseDuration, { color: themeColors.textSecondary }]}>{getExerciseDurationText('4-7-8')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exerciseCard, { backgroundColor: themeColors.surface, shadowColor: colors.accent.teal }]}
          onPress={() => handleStartExercise('box-breathing', '4')}
        >
          <Text style={[styles.exerciseTitle, { color: colors.accent.teal }]}>Kutu (Box) Nefes Tekniği</Text>
          <Text style={[styles.exerciseDescription, { color: themeColors.textSecondary }]}>Eşit süreli 4'lük döngülerle zihni dengele ve odaklanmanı arttır!</Text>
          <Text style={[styles.exerciseDuration, { color: themeColors.textSecondary }]}>{getExerciseDurationText('box-breathing')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exerciseCard, { backgroundColor: themeColors.surface, shadowColor: colors.semantic.warning }]}
          onPress={() => handleStartExercise('kapalabhati', '3')}
        >
          <Text style={[styles.exerciseTitle, { color: colors.semantic.warning }]}>Kapalabhati (Ateş Nefesi)</Text>
          <Text style={[styles.exerciseDescription, { color: themeColors.textSecondary }]}>Hızlı nefes alış verişlerle zihni canlandır!</Text>
          <Text style={[styles.exerciseDuration, { color: themeColors.textSecondary }]}>{getExerciseDurationText('kapalabhati')}</Text>
        </TouchableOpacity>



        <TouchableOpacity
          style={[styles.exerciseCard, { backgroundColor: themeColors.surface, shadowColor: colors.semantic.success }]}
          onPress={() => handleStartExercise('nadi-shodhana', '5')}
        >
          <Text style={[styles.exerciseTitle, { color: colors.semantic.success }]}>Nadi Shodhana</Text>
          <Text style={[styles.exerciseDescription, { color: themeColors.textSecondary }]}>Alternatif burun deliği nefesi ile enerji kanallarını dengele ve sakinleş!.</Text>
          <Text style={[styles.exerciseDuration, { color: themeColors.textSecondary }]}>{getExerciseDurationText('nadi-shodhana')}</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {!userProgram && !isGuest && (
          <TouchableOpacity
            style={[styles.assessmentButton, { backgroundColor: colors.secondary[500] }]}
            onPress={handleAssessment}
          >
            <Text style={[styles.assessmentButtonText, { color: '#FFFFFF' }]}>Kişisel Değerlendirme Yap</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: colors.neutral[200] }]}
          onPress={handleSettings}
        >
          <Text style={[styles.settingsButtonText, { color: themeColors.text }]}>Ayarlar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 24,
    fontFamily: 'Tahoma',
    flex: 1,
  },
  logoutButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  logoutButtonText: {
    fontSize: 14,
    fontFamily: 'Tahoma',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 18,
    color: '#222',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  statNumber: {
    fontSize: 18,
    color: '#1976D2', // koyu mavi veya #388E3C gibi koyu yeşil de olabilir
    fontWeight: 'bold',
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
    fontSize: 20,
    fontFamily: 'Tahoma',
    marginBottom: 8,
  },
  programSubtitle: {
    fontSize: 16,
    fontFamily: 'Tahoma',
    marginBottom: 8,
  },
  programProgress: {
    fontSize: 14,
    fontFamily: 'Tahoma',
    marginBottom: 20,
  },
  programButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  programButtonText: {
    fontSize: 16,
    fontFamily: 'Tahoma',
  },
  quickExercises: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Tahoma',
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
    fontSize: 20,
    fontFamily: 'Tahoma',
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 15,
    fontFamily: 'Tahoma',
    lineHeight: 18,
    marginBottom: 6,
  },
  exerciseDuration: {
    fontSize: 15,
    fontFamily: 'Tahoma',
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
    fontSize: 18,
    fontFamily: 'Tahoma',
  },
  settingsButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  settingsButtonText: {
    fontSize: 16,
    fontFamily: 'Tahoma',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Tahoma',
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
    fontSize: 22,
    fontFamily: 'Tahoma',
  },
  statsLabel: {
    fontSize: 13,
    fontFamily: 'Tahoma',
    marginTop: 2,
  },
}); 