import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredProgram, completeDay as completeDayLocal, isDayLocked, resetProgram, saveStoredProgram } from '../utils/programStorage';
import { completeDay as completeDayFirestore, isDayLockedFirestore, saveUserStats, getUserStats, saveExerciseSession, resetUserProgram, getUserProgram, canUserResetProgram } from '../services/firestoreService';
import { getCurrentUser } from '../services/authService';
import { PersonalizedProgram } from '../utils/programGenerator';
import { COLORS, FONTS, standardTextStyles } from '../constants/typography';
import { triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';
import { logError, logInfo, logUserAction, logWarn, logDebug } from '../utils/logger';
import { analyzeNetworkError } from '../utils/networkUtils';
import { handleError, withErrorHandling, withRetry } from '../utils/errorHandler';

type PersonalizedProgramScreenNavigationProp = StackNavigationProp<any, 'PersonalizedProgram'>;

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
  const [userName, setUserName] = useState<string>('');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [checkDailyProgress, setCheckDailyProgress] = useState<NodeJS.Timeout | null>(null);
  const [resetButtonText, setResetButtonText] = useState<string>('Programı Sıfırla');



  // Timer management wrapper functions
  const clearAllTimers = () => {
    if (checkDailyProgress) {
      clearInterval(checkDailyProgress);
      setCheckDailyProgress(null);
      logDebug('Daily progress timer cleared');
    }
  };

  const startDailyProgressTimer = () => {
    clearAllTimers(); // Önceki timer'ı temizle
    
    const timer = setInterval(() => {
      try {
        const currentTime = new Date();
        const hour = currentTime.getHours();
        
        // Saat 00:00'da kontrol yap
        if (hour === 0) {
          logDebug('Interval ile günlük kontrol yapılıyor... (00:00)');
          checkAndUpdateDailyProgress();
        }
      } catch (error) {
        logError('Interval kontrol hatası:', error);
      }
    }, 60000); // 1 dakika (daha sık kontrol)
    
    setCheckDailyProgress(timer);
    logDebug('Daily progress timer started (00:00 kontrolü)');
    return timer;
  };

  // Optimized useEffect - Consolidate all initialization and cleanup logic
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const initializeScreen = async () => {
      await loadPersonalizedProgram();
      
      // Günlük kontrol için timer başlat
      startDailyProgressTimer();

      // Focus olduğunda tarih değişimi kontrolü yap ve programı yenile
      unsubscribe = navigation.addListener('focus', async () => {
        logDebug('PersonalizedProgramScreen: Focus - Gün kontrolü ve program yenileme');
        const currentUser = getCurrentUser();
        if (currentUser) {
          await checkAndUpdateDailyProgress();
        }
        await loadPersonalizedProgram();
      });
    };
    
    initializeScreen();

    // Cleanup function
    return () => {
      clearAllTimers(); // Tüm timer'ları temizle
      if (unsubscribe) {
        unsubscribe();
        logDebug('Navigation listener unsubscribed');
      }
      logDebug('PersonalizedProgramScreen cleanup completed');
    };
  }, []); // Empty dependency array - only run once

  // Sayfa her açıldığında verileri yeniden yükle (hemen ve kısa gecikmeyle)
  useFocusEffect(
    React.useCallback(() => {
      logInfo('PersonalizedProgramScreen: useFocusEffect - Program verileri hemen yenileniyor');
      loadPersonalizedProgram();
      const t = setTimeout(() => {
        logInfo('PersonalizedProgramScreen: useFocusEffect - Gecikmeli yeniden yükleme (Firestore gecikmesi için)');
        loadPersonalizedProgram();
      }, 400);
      return () => clearTimeout(t);
    }, [])
  );

  // Günlük ilerleme kontrolü (tarih değişimi + önceki gün tamam mı)
  const checkAndUpdateDailyProgress = async () => {
    try {
      logDebug('Günlük ilerleme kontrolü çalışıyor (timer/focus)');
      
      const currentUser = getCurrentUser();
      if (!currentUser) {
        logWarn('Kullanıcı bulunamadı, kontrol atlanıyor');
        return;
      }
      
      // Tarih değiştiyse ve önceki gün tamamlandıysa bir sonraki günü aç
      await maybeUnlockByDateChange(currentUser.uid);
      
    } catch (error) {
      logError('Günlük ilerleme kontrolü hatası:', error);
    }
  };

  const getDateKey = (d: Date) => `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;

  // Tarih değiştiyse ve önceki gün tamamlandıysa bir sonraki günü aç
  const maybeUnlockByDateChange = async (userId: string) => {
    try {
      // Firestore'dan mevcut programı al
      const { getUserProgram } = await import('../services/firestoreService');
      const userProgram = await getUserProgram(userId);
      
      if (!userProgram || userProgram.isPremium) {
        logDebug('Program bulunamadı veya premium program, gün açma atlanıyor');
        return;
      }
      
      const currentDay = userProgram.currentDay;
      const nextDay = currentDay + 1;
      
      // Program tamamlandı mı kontrol et
      if (nextDay > 5) {
        logDebug('Program tamamlandı, yeni gün açılamaz');
        return;
      }

      // Tarih değişimi kontrolü (son güncelleme ile bugün aynı gün mü?)
      const lastUpdated = userProgram.lastUpdated ? new Date(userProgram.lastUpdated) : null;
      const todayKey = getDateKey(new Date());
      const lastKey = lastUpdated ? getDateKey(lastUpdated) : null;
      if (lastKey === todayKey) {
        logDebug('Aynı gün içinde, gün açma denenmeyecek');
        return;
      }

      // Önceki gün tamamlanmış mı kontrol et
      const isPreviousDayCompleted = Array.isArray(userProgram.completedDays) && userProgram.completedDays.includes(currentDay);
      if (!isPreviousDayCompleted) {
        logDebug(`Gün ${nextDay} açılamaz: Önceki gün (${currentDay}) tamamlanmamış`);
        return;
      }
      
      // Yeni günü aç
      const { saveUserProgram } = await import('../services/firestoreService');
      await saveUserProgram(userId, {
        ...userProgram,
        currentDay: nextDay,
        lastUpdated: new Date().toISOString(),
      });
      
      // Yerel storage'ı da güncelle
      const { getStoredProgram, saveStoredProgram } = await import('../utils/programStorage');
      const localProgram = await getStoredProgram();
      if (localProgram) {
        await saveStoredProgram({
          ...localProgram,
          currentDay: nextDay,
          lastUpdated: new Date().toISOString(),
        });
      }
      
      logInfo(`Yeni gün açıldı: ${nextDay}`);
      
    } catch (error) {
      logError('Gün açma hatası:', error);
    }
  };

  // Basitleştirilmiş egzersiz tamamlama kontrolü
  const checkExerciseCompletion = async () => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) return;

      // Son egzersiz oturumunu kontrol et
      const { getUserStats, getUserProgram } = await import('../services/firestoreService');
      const stats = await getUserStats(currentUser.uid);
      const userProgram = await getUserProgram(currentUser.uid);
      
      if (!stats?.lastSessionDate || !userProgram || userProgram.isPremium) {
        logDebug('Egzersiz tamamlama kontrolü atlanıyor');
        return;
      }
      
      const lastSessionDate = new Date(stats.lastSessionDate);
      const now = new Date();
      
      // Bugün egzersiz yapılmış mı kontrol et
      const isToday = lastSessionDate.toDateString() === now.toDateString();
      
      if (isToday && userProgram.currentDay <= 5) {
        // Mevcut gün tamamlanmış mı kontrol et
        const isCurrentDayCompleted = userProgram.completedDays.includes(userProgram.currentDay);
        
        if (!isCurrentDayCompleted) {
          logDebug('Bugün egzersiz yapılmış, gün otomatik tamamlanıyor');
          await handleDayComplete(userProgram.currentDay);
        }
      }
    } catch (error) {
      logError('Egzersiz tamamlama kontrolü hatası:', error);
    }
  };

  const loadPersonalizedProgram = async () => {
    try {
      setIsLoading(true);
      logDebug('Program yükleniyor...');
      
      const storedProgram = await getStoredProgram();
      
      if (!storedProgram) {
        setIsLoading(false);
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
      if (storedProgram.program.length > 5) {
        Alert.alert(
          'Program Güncellemesi',
          'Programınız eski formatta. Yeni 5 günlük programa geçmek için programınızı sıfırlamanız gerekiyor.',
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
      
      // Kullanıcı adını al
      if (currentUser) {
        const displayName = currentUser.displayName;
        setUserName(displayName || '');
        
        // Firestore'dan program verisini al ve AsyncStorage ile senkronize et
        try {
          const firestoreProgram = await getUserProgram(currentUser.uid);
          if (firestoreProgram && !firestoreProgram.isPremium) {
            logDebug('Firestore program bulundu, senkronizasyon başlıyor...');
            logDebug('Firestore completedDays:', firestoreProgram.completedDays);
            logDebug('Firestore currentDay:', firestoreProgram.currentDay);
            logDebug('Local completedDays:', storedProgram.completedDays);
            logDebug('Local currentDay:', storedProgram.currentDay);
            
            // FİRESTORE ANA KAYNAK - Her zaman Firestore verisini kullan
            logInfo('Firestore ana kaynak olarak kullanılıyor...');
            
            // Normal program - Firestore verilerini AsyncStorage ile senkronize et
            const updatedStoredProgram = {
              ...storedProgram,
              completedDays: firestoreProgram.completedDays,
              currentDay: firestoreProgram.currentDay,
              lastUpdated: firestoreProgram.lastUpdated
            };
            
            // AsyncStorage'ı güncelle
            await saveStoredProgram(updatedStoredProgram);
            logInfo('AsyncStorage Firestore ile senkronize edildi');
            
            // Güncellenmiş programı kullan
            storedProgram.completedDays = firestoreProgram.completedDays;
            storedProgram.currentDay = firestoreProgram.currentDay;
            storedProgram.lastUpdated = firestoreProgram.lastUpdated;
          } else if (firestoreProgram && firestoreProgram.isPremium) {
            logWarn('Premium program bulundu, normal program senkronizasyonu atlanıyor');
          } else {
            logInfo('Firestore\'da program bulunamadı, sadece local veri kullanılıyor');
          }
        } catch (error) {
          logError('Firestore senkronizasyon hatası:', error);
          
          // Network hatası kontrolü
          const errorInfo = analyzeNetworkError(error);
          
          if (errorInfo.isNetworkError) {
            setIsOfflineMode(true);
            await handleError(error, 'loadPersonalizedProgram_sync', {
              title: 'Çevrimdışı Mod',
              message: 'İnternet bağlantınız yok. Program yerel verilerle çalışacak.',
              actions: [
                { title: 'Tamam', onPress: () => logInfo('Offline mode aktif, local veri kullanılıyor') }
              ]
            });
          } else {
            await handleError(error, 'loadPersonalizedProgram_sync', {
              title: 'Senkronizasyon Hatası',
              message: 'Program verileri senkronize edilemedi. Yerel verilerle devam ediliyor.',
              actions: [
                { title: 'Tamam', onPress: () => logInfo('Kullanıcı senkronizasyon hatasını kabul etti') }
              ]
            });
          }
        }
      }
      
      // Program başlangıç tarihini kontrol et
      let currentStoredProgram = storedProgram;
      if (!currentStoredProgram.startDate) {
        logDebug('Program başlangıç tarihi eksik, bugünün tarihi olarak ayarlanıyor');
        const updatedProgram = {
          ...currentStoredProgram,
          startDate: new Date().toISOString(),
        };
        await saveStoredProgram(updatedProgram);
        // Program güncellendi, yeniden yükle
        const updatedStoredProgram = await getStoredProgram();
        if (updatedStoredProgram) {
          currentStoredProgram = updatedStoredProgram;
        }
      }
      
      const programWithStatus = await Promise.all(
        currentStoredProgram.program.map(async (day) => {
          // Hem yerel storage hem de Firestore'dan kilit durumunu kontrol et
          const isLockedLocal = await isDayLocked(day.day);
          let isLockedFirestore = true;
          
          if (currentUser) {
            isLockedFirestore = await isDayLockedFirestore(currentUser.uid, day.day);
          }
          
          // En katı kilitleme: Her iki sistemde de kilitli olmamalı
          const isLocked = isLockedLocal || isLockedFirestore;
          
          const isCompleted = currentStoredProgram.completedDays.includes(day.day);
          logInfo(`Day ${day.day} check: completedDays=${currentStoredProgram.completedDays}, includes(${day.day})=${isCompleted}`);
          
          return {
            ...day,
            completed: isCompleted,
            isLocked: isLocked,
          };
        })
      );

      setProgram(programWithStatus);
      setCurrentDay(currentStoredProgram.currentDay);
      setTotalCompleted(currentStoredProgram.completedDays.length);
      
      // Debug logları
      logInfo('PersonalizedProgramScreen: Program loaded');
      logInfo('PersonalizedProgramScreen: currentDay:', currentStoredProgram.currentDay);
      logInfo('PersonalizedProgramScreen: completedDays:', currentStoredProgram.completedDays);
      logInfo('PersonalizedProgramScreen: totalCompleted:', currentStoredProgram.completedDays.length);
      
      // Her günün durumunu kontrol et
      programWithStatus.forEach(day => {
        logInfo(`Day ${day.day}: completed=${day.completed}, isLocked=${day.isLocked}`);
      });
    } catch (error) {
      logError('Program yükleme hatası:', error);
      
      // Network hatası kontrolü
      const errorInfo = analyzeNetworkError(error);
      
      if (errorInfo.isNetworkError) {
        await handleError(error, 'loadPersonalizedProgram', {
          title: 'Bağlantı Hatası',
          message: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
          actions: [
            { title: 'Tekrar Dene', onPress: () => loadPersonalizedProgram() },
            { title: 'Ana Sayfa', onPress: () => navigation.navigate('Home') }
          ]
        });
      } else {
        await handleError(error, 'loadPersonalizedProgram', {
          title: 'Program Yükleme Hatası',
          message: 'Program yüklenirken bir hata oluştu. Lütfen tekrar deneyin.',
          actions: [
            { title: 'Tekrar Dene', onPress: () => loadPersonalizedProgram() },
            { title: 'Ana Sayfa', onPress: () => navigation.navigate('Home') }
          ]
        });
      }
    } finally {
      // Reset buton metnini güncelle
      await updateResetButtonText();
      setIsLoading(false);
    }
  };

  const handleDayComplete = async (dayNumber: number) => {
    try {
      logInfo(`Gün ${dayNumber} tamamlanıyor...`);
      triggerHapticFeedback(HapticType.SUCCESS);
      
      // Hem yerel storage hem de Firestore'u güncelle
      const currentUser = getCurrentUser();
      if (currentUser) {
        // Firestore'da günü tamamla
        await completeDayFirestore(currentUser.uid, dayNumber);
        
        // AsyncStorage'ı da güncelle
        const { getStoredProgram, saveStoredProgram } = await import('../utils/programStorage');
        const localProgram = await getStoredProgram();
        if (localProgram) {
          // Tamamlanan günü ekle
          if (!localProgram.completedDays.includes(dayNumber)) {
            localProgram.completedDays.push(dayNumber);
          }
          
          // Sonraki günü ayarla
          const nextDay = Math.min(dayNumber + 1, localProgram.program.length);
          localProgram.currentDay = nextDay;
          
          // Programı kaydet
          await saveStoredProgram(localProgram);
          logInfo(`AsyncStorage güncellendi: Gün ${dayNumber} tamamlandı, sonraki gün: ${nextDay}`);
        } else {
          logWarn('Local program bulunamadı, AsyncStorage güncellenemedi');
        }
        
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
        
        // Seri günü hesaplama
        const today = new Date();
        const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD formatı
        
        let newCurrentStreak = 1; // Bugün egzersiz yapıldı
        let newLongestStreak = stats?.longestStreak || 0;
        
        if (stats?.lastSessionDate) {
          const lastSessionDate = new Date(stats.lastSessionDate);
          const lastSessionString = lastSessionDate.toISOString().split('T')[0];
          
          logDebug('Seri hesaplama:', {
            today: todayString,
            lastSession: lastSessionString,
            currentStreak: stats.currentStreak
          });
          
          // Eğer son egzersiz bugün yapıldıysa seriyi artırma
          if (lastSessionString === todayString) {
            newCurrentStreak = stats.currentStreak || 0;
            logDebug('Bugün zaten egzersiz yapıldı, seri değişmedi:', newCurrentStreak);
          } else {
            // Eğer son egzersiz dün yapıldıysa seriyi artır
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayString = yesterday.toISOString().split('T')[0];
            
            logDebug('Dün kontrolü:', {
              yesterday: yesterdayString,
              lastSession: lastSessionString,
              isYesterday: lastSessionString === yesterdayString
            });
            
            if (lastSessionString === yesterdayString) {
              newCurrentStreak = (stats.currentStreak || 0) + 1;
              logDebug('Dün egzersiz yapıldı, seri artıyor:', newCurrentStreak);
            } else {
              // Seri kırıldı, yeni seri başladı
              newCurrentStreak = 1;
              logDebug('Seri kırıldı, yeni seri başladı:', newCurrentStreak);
            }
          }
        } else {
          logDebug('İlk egzersiz, seri başladı:', newCurrentStreak);
        }
        
        // En uzun seriyi güncelle
        newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);
        logDebug('Seri güncelleme:', {
          newCurrentStreak,
          newLongestStreak,
          oldLongestStreak: stats?.longestStreak || 0
        });
        
        // Favori teknikleri güncelle
        let favoriteTechniques = stats?.favoriteTechniques || [];
        let techniqueCounts: { [key: string]: number } = stats?.techniqueCounts || {};
        
        // Mevcut tekniği ekle/güncelle
        techniqueCounts[technique] = (techniqueCounts[technique] || 0) + 1;
        
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
          lastSessionTechnique: technique,
          favoriteTechniques,
          techniqueCounts, // Teknik sayılarını da kaydet
        };
        await saveUserStats(currentUser.uid, newStats);
        await saveExerciseSession(currentUser.uid, {
          technique,
          duration,
          date: new Date().toISOString(),
          completed: true,
        });
        
        // AsyncStorage'ı da güncelle - Normal program için
      await completeDayLocal(dayNumber);
        
        // AsyncStorage'daki program verisini de güncelle
        const userProgramData = await AsyncStorage.getItem('user_program');
        if (userProgramData) {
          const userProgram = JSON.parse(userProgramData);
          if (!userProgram.isPremium) {
            // Normal program için completedDays'i güncelle
            const updatedCompletedDays = [...(userProgram.completedDays || []), dayNumber];
            const nextDay = Math.min(dayNumber + 1, userProgram.program.length);
            
            const updatedProgram = {
              ...userProgram,
              completedDays: updatedCompletedDays,
              currentDay: nextDay,
              lastUpdated: new Date().toISOString()
            };
            
            await AsyncStorage.setItem('user_program', JSON.stringify(updatedProgram));
            logInfo('AsyncStorage program verisi güncellendi');
          }
        }
      }
      
      logInfo(`Gün ${dayNumber} başarıyla tamamlandı`);
      
      // Programı yeniden yükle
      await loadPersonalizedProgram();
      
      // Ana sayfaya reset ile dön ve veri tazelensin
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (error) {
      logError('Gün tamamlama hatası:', error);
      
      // Network hatası kontrolü
      const errorInfo = analyzeNetworkError(error);
      
      if (errorInfo.isNetworkError) {
        await handleError(error, 'handleDayComplete', {
          title: 'Bağlantı Hatası',
          message: 'İnternet bağlantınızı kontrol edin. İlerlemeniz yerel olarak kaydedildi.',
          actions: [
            { title: 'Tamam', onPress: () => loadPersonalizedProgram() }
          ]
        });
      } else {
        await handleError(error, 'handleDayComplete', {
          title: 'Gün Tamamlama Hatası',
          message: 'Gün tamamlanırken bir hata oluştu. Lütfen tekrar deneyin.',
          actions: [
            { title: 'Tekrar Dene', onPress: () => handleDayComplete(dayNumber) },
            { title: 'İptal', onPress: () => {}, style: 'cancel' }
          ]
        });
      }
    }
  };

  const updateResetButtonText = async () => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setResetButtonText('Programı Sıfırla');
        return;
      }

      const isPremium = false;
      const resetCheck = await canUserResetProgram(currentUser.uid, isPremium);
      
      if (resetCheck.remainingResets === -1) {
        setResetButtonText('Programı Sıfırla (Sınırsız)');
      } else {
        setResetButtonText(`Programı Sıfırla (${resetCheck.remainingResets}/3)`);
      }
    } catch (error) {
      logError('Reset buton metni güncelleme hatası:', error);
      setResetButtonText('Programı Sıfırla');
    }
  };

  const handleResetProgram = async () => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı.');
        return;
      }

      // Premium durumunu kontrol et (normal program için false)
      const isPremium = false;
      
      // Reset yapabilir mi kontrol et
      const resetCheck = await canUserResetProgram(currentUser.uid, isPremium);
      
      if (!resetCheck.canReset) {
        Alert.alert(
          'Sıfırlama Hakkı Bitti',
          resetCheck.message,
          [
            {
              text: 'İptal',
              style: 'cancel',
            },
            {
              text: 'Premium Ol',
              onPress: () => navigation.navigate('Premium'),
            },
          ]
        );
        return;
      }

      // Kalan hak sayısını göster
      const remainingText = resetCheck.remainingResets === -1 
        ? 'Sınırsız' 
        : `${resetCheck.remainingResets}/3`;

    Alert.alert(
      'Programı Sıfırla',
        `Programınızı sıfırlamak istediğinizden emin misiniz?\n\nKalan sıfırlama hakkı: ${remainingText}\n\nBu işlem tüm ilerlemenizi silecek ve yeni bir program oluşturmanız gerekecek.`,
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
                
                logInfo('Program sıfırlanıyor...');
                
                // Firestore'dan programı sil
                await resetUserProgram(currentUser.uid);
                logInfo('Firestore\'dan program silindi');
                
                // AsyncStorage'dan programı sil
              await resetProgram();
                logInfo('AsyncStorage\'dan program silindi');
                
                // Ek olarak tüm program verilerini temizle
                await AsyncStorage.multiRemove([
                  'assessment_scores',
                  'personalized_program',
                  'current_day',
                  'completed_days',
                  'program_start_date',
                ]);
                logInfo('Tüm program verileri temizlendi');
                
              Alert.alert(
                'Program Sıfırlandı',
                  'Programınız başarıyla sıfırlandı. Ana sayfaya dönüyorsunuz.',
                [
                  {
                    text: 'Tamam',
                      onPress: () => {
                        // HomeScreen'e navigate ile dön
                        navigation.navigate('Home');
                      },
                  },
                ]
              );
            } catch (error) {
                logError('Program sıfırlama hatası:', error);
              Alert.alert('Hata', 'Program sıfırlanırken bir hata oluştu.');
            }
          },
        },
      ]
    );
    } catch (error) {
      logError('Reset kontrolü hatası:', error);
      Alert.alert('Hata', 'Sıfırlama kontrolü yapılırken bir hata oluştu.');
    }
  };

  const startDayExercise = async (day: DayProgram) => {
    try {
      setIsLoading(true);
    triggerHapticFeedback(HapticType.MEDIUM);
      
      // Kapsamlı validation
      if (!day) {
        logError('Day program is null or undefined');
        Alert.alert('Hata', 'Program bilgisi bulunamadı.');
        return;
      }
      
      if (!day.techniques || day.techniques.length === 0) {
        logError('Day program has no techniques', { day });
        Alert.alert('Hata', 'Bu gün için teknik bilgisi bulunamadı.');
        return;
      }
      
      if (!day.techniques[0]) {
        logError('First technique is null or undefined', { techniques: day.techniques });
        Alert.alert('Hata', 'Teknik bilgisi eksik.');
        return;
      }
      
      if (!day.duration) {
        logError('Day duration is missing', { day });
        Alert.alert('Hata', 'Egzersiz süresi belirlenemedi.');
        return;
      }
      
      if (!day.day || day.day < 1) {
        logError('Invalid day number', { day: day.day });
        Alert.alert('Hata', 'Geçersiz gün numarası.');
        return;
      }
      
      // Navigation parametrelerini hazırla ve validate et
      const navigationParams = {
        technique: day.techniques[0],
      duration: day.duration,
        techniqueTitle: day.title || `Gün ${day.day} Egzersizi`,
        techniqueDescription: day.description || 'Kişiselleştirilmiş nefes egzersizi',
        isPremium: false,
        programDay: day.day,
        session: 'morning',
        autoStart: false,
      };
      
      // Son validation kontrolü
      if (!navigationParams.technique || !navigationParams.duration) {
        logError('Invalid navigation parameters', navigationParams);
        Alert.alert('Hata', 'Egzersiz parametreleri eksik.');
        return;
      }
      
      logDebug('Navigating to BreathingExercise with validated params:', navigationParams);
      
      // Kısa bir gecikme ile loading göster
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigation
      navigation.navigate('BreathingExercise', navigationParams);
    } catch (error) {
      logError('Egzersiz başlatma hatası:', error);
      Alert.alert('Hata', 'Egzersiz başlatılırken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTechniqueName = (technique: string) => {
    const techniqueNames: { [key: string]: string } = {
      // Normal program teknikleri
      'diaphragmatic': 'Diyafram Nefesi',
      '4-7-8': '4-7-8 Tekniği',
      'box-breathing': 'Kutu Nefesi',
      'nadi-shodhana': 'Nadi Shodhana',
      'kapalabhati': 'Kapalabhati',
      'anxiety-relief': 'Anksiyete Rahatlatma',
      'coherent_breathing': 'Uyumlu Nefes',
      'alternate_nostril': 'Alternatif Burun Nefesi',
      'bhramari': 'Bhramari',
      'ujjayi': 'Ujjayi',
      'sitali': 'Sitali',
      'sitkari': 'Sitkari',
      'lion_breath': 'Aslan Nefesi',
      'victorious_breath': 'Zafer Nefesi',
      'three_part_breath': 'Üç Parça Nefes',
      'equal_breathing': 'Eşit Nefes',
      'pursed_lip_breathing': 'Dudak Büzme Nefesi',
      'deep_breathing': 'Derin Nefes',
      'mindful_breathing': 'Farkındalık Nefesi',
      // Ek gelişmiş teknik adları
      'alternate_nostril_advanced': 'Gelişmiş Alternatif Burun',
      'bhramari_advanced': 'Gelişmiş Bhramari',
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
      <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover">
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F5F5DC" />
            <Text style={[standardTextStyles.bodyLarge, styles.loadingText]}>
              Programınız yükleniyor...
            </Text>
        </View>
      </View>
      </ImageBackground>
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
    <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover">
      <ScrollView style={{ flex: 1, backgroundColor: 'transparent' }} contentContainerStyle={{ paddingHorizontal: 15, paddingTop: 90 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[standardTextStyles.mainTitle, { color: '#F5F5DC', marginBottom: 8, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            {userName ? `${userName}'nin Kişisel Programı` : 'Kişiselleştirilmiş Program'}
          </Text>
          <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', textAlign: 'center', marginBottom: 20, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            5 günlük nefes egzersizi yolculuğunuz
          </Text>
          
          {/* Offline mode göstergesi */}
          {isOfflineMode && (
            <View style={{ backgroundColor: 'rgba(255, 193, 7, 0.2)', borderColor: '#FFC107', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16 }}>
              <Text style={[standardTextStyles.bodySmall, { color: '#FFC107', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                📱 Çevrimdışı Mod - Yerel Verilerle Çalışıyor
              </Text>
            </View>
          )}
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${getProgressPercentage()}%` }
                ]} 
              />
            </View>
            <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              {String(totalCompleted)} / {String(program.length)} gün tamamlandı ({String(getProgressPercentage())}%)
            </Text>
          </View>

          <TouchableOpacity
            style={styles.premiumButton}
            onPress={() => navigation.navigate('Premium')}
          >
            <Text style={[standardTextStyles.buttonMedium, styles.premiumButtonText, styles.textShadow]}>
            Premium Özellikleri Deneyin
            </Text>
          </TouchableOpacity>
        </View>

        {/* Program tamamlandı mesajı */}
        {totalCompleted >= 5 && (
          <View style={styles.completionCard}>
            <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 12, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>🎉 Program Tamamlandı! 🎉</Text>
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', textAlign: 'center', lineHeight: 24, marginBottom: 20, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              Tebrikler! 5 günlük nefes egzersizi programınızı başarıyla tamamladınız. 
              İlerlemenizi değerlendirmek ve yeni bir program oluşturmak için tekrar test yapabilirsiniz.
            </Text>
            <TouchableOpacity
              style={[styles.retakeAssessmentButton, { backgroundColor: 'rgba(245, 245, 220, 0.15)' }]}
              onPress={() => navigation.navigate('Assessment')}
              activeOpacity={0.8}
            >
              <Text style={[standardTextStyles.buttonMedium, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Tekrar Test Yap</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.programContainer}>
          {program.map((day) => (
            <View key={day.day} style={[
              styles.dayCard,
              { backgroundColor: 'rgba(245, 245, 220, 0.1)', borderColor: '#DDD', borderWidth: 1 },
              day.isLocked && !day.completed && styles.lockedCard
            ]}>
              <View style={styles.dayHeader}>
                <View style={styles.dayNumberContainer}>
                  <Text style={[standardTextStyles.bodyLarge, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Gün {String(day.day)}</Text>
                  {day.completed && (
                    <View style={styles.completedBadge}>
                      <Text style={[standardTextStyles.bodySmall, { color: COLORS.white }]}>✓</Text>
                    </View>
                  )}
                  {day.isLocked && !day.completed && (
                    <View style={styles.lockedBadge}>
                      <Text style={[standardTextStyles.bodySmall, { color: COLORS.white }]}>🔒</Text>
                    </View>
                  )}
                </View>
                <View style={[
                  styles.intensityBadge,
                  { backgroundColor: getIntensityColor(day.intensity) }
                ]}>
                  <Text style={[standardTextStyles.bodySmall, { color: COLORS.white }]}>
                    {day.intensity === 'low' ? 'Düşük' : 
                     day.intensity === 'medium' ? 'Orta' : 'Yüksek'}
                  </Text>
                </View>
              </View>

              <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>{day.title}</Text>
              <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', marginBottom: 16, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>{day.description}</Text>
              
              <View style={styles.dayDetails}>
                <View style={styles.detailItem}>
                  <Text style={[standardTextStyles.label, { color: '#F5F5DC', width: 80, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Odak:</Text>
                  <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', flex: 1, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>{day.focus}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[standardTextStyles.label, { color: '#F5F5DC', width: 80, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Süre:</Text>
                  <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', flex: 1, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>{day.duration}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[standardTextStyles.label, { color: '#F5F5DC', width: 80, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Teknikler:</Text>
                  <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', flex: 1, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                    {day.techniques.map(getTechniqueName).join(', ')}
                  </Text>
                </View>
              </View>

              <View style={styles.benefitsContainer}>
                <Text style={[standardTextStyles.label, { color: '#F5F5DC', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Faydalar:</Text>
                {day.benefits.map((benefit, index) => (
                  <Text key={index} style={[standardTextStyles.bodySmall, { color: '#F5F5DC', marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>• {benefit}</Text>
                ))}
              </View>

              <View style={styles.actionButtons}>
                {day.isLocked && !day.completed ? (
                  <View style={styles.lockedMessage}>
                    <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textAlign: 'center' }]}>
                      Bu gün henüz kilitli. Önceki günleri tamamlayın.
                    </Text>
                  </View>
                ) : !day.completed ? (
                    <TouchableOpacity
                    style={[styles.startButton, { backgroundColor: 'rgba(245, 245, 220, 0.15)' }]}
                      onPress={() => startDayExercise(day)}
                      activeOpacity={0.8}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#F5F5DC" style={{ marginRight: 8 }} />
                        <Text style={[standardTextStyles.buttonSmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Yükleniyor...</Text>
                      </View>
                    ) : (
                      <Text style={[standardTextStyles.buttonSmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Egzersizi Başlat</Text>
                    )}
                    </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.completedButton, { backgroundColor: 'rgba(245, 245, 220, 0.15)' }]}
                    onPress={() => startDayExercise(day)}
                    activeOpacity={0.8}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#F5F5DC" style={{ marginRight: 8 }} />
                        <Text style={[standardTextStyles.buttonSmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Yükleniyor...</Text>
                      </View>
                    ) : (
                      <Text style={[standardTextStyles.buttonSmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Tekrar Yap</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Reset butonunu sayfanın en altına taşıdık */}
        <TouchableOpacity
          style={[styles.resetButton, { marginHorizontal: 15, marginTop: 20, marginBottom: 30 }]}
          onPress={handleResetProgram}
        >
          <Text style={[standardTextStyles.buttonMedium, styles.resetButtonText, styles.textShadow]}>
            {resetButtonText}
          </Text>
        </TouchableOpacity>
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
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
    backgroundColor: 'transparent',
  },
  title: {
    ...standardTextStyles.mainTitle,
    color: '#F5F5DC',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...standardTextStyles.bodyMedium,
    color: '#F5F5DC',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#DDD',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    ...standardTextStyles.bodySmall,
    color: '#F5F5DC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...standardTextStyles.bodyLarge,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    ...standardTextStyles.cardTitle,
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyText: {
    ...standardTextStyles.bodyMedium,
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
    ...standardTextStyles.bodyMedium,
    color: COLORS.white,
  },
  programContainer: {
    gap: 20,
  },
  dayCard: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#DDD',
    shadowColor: 'transparent',
  },
  lockedCard: {
    opacity: 0.5,
    backgroundColor: 'transparent',
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
    ...standardTextStyles.bodyLarge,
    color: '#F5F5DC',
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
    ...standardTextStyles.bodySmall,
    color: COLORS.white,
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
    ...standardTextStyles.bodySmall,
    color: COLORS.white,
  },
  intensityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  intensityText: {
    ...standardTextStyles.bodySmall,
    color: COLORS.white,
  },
  dayTitle: {
    ...standardTextStyles.cardTitle,
    color: '#F5F5DC',
    marginBottom: 8,
  },
  dayDescription: {
    ...standardTextStyles.bodySmall,
    color: '#F5F5DC',
    marginBottom: 16,
  },
  dayDetails: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    ...standardTextStyles.label,
    color: '#F5F5DC',
    width: 80,
  },
  detailValue: {
    ...standardTextStyles.bodySmall,
    color: '#F5F5DC',
    flex: 1,
  },
  benefitsContainer: {
    marginBottom: 20,
  },
  benefitsTitle: {
    ...standardTextStyles.label,
    color: '#F5F5DC',
    marginBottom: 8,
  },
  benefitText: {
    ...standardTextStyles.bodySmall,
    color: '#F5F5DC',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  startButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 14,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    shadowColor: 'transparent',
  },
  startButtonText: {
    ...standardTextStyles.buttonSmall,
    color: '#F5F5DC',
  },
  completedButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 14,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  completedButtonText: {
    ...standardTextStyles.buttonSmall,
    color: '#F5F5DC',
  },
  markCompleteButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    shadowColor: 'transparent',
  },
  markCompleteButtonText: {
    ...standardTextStyles.buttonSmall,
    color: '#F5F5DC',
  },
  lockedMessage: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  lockedMessageText: {
    ...standardTextStyles.bodySmall,
    color: '#F5F5DC',
    textAlign: 'center',
  },
  completionCard: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  completionTitle: {
    ...standardTextStyles.cardTitle,
    color: '#F5F5DC',
    marginBottom: 12,
    textAlign: 'center',
  },
  completionText: {
    ...standardTextStyles.bodyMedium,
    color: '#F5F5DC',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  retakeAssessmentButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    shadowColor: 'transparent',
  },
  retakeAssessmentButtonText: {
    ...standardTextStyles.buttonMedium,
    color: '#F5F5DC',
  },
  resetButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    shadowColor: 'transparent',
    marginTop: 20,
  },
  resetButtonText: {
    ...standardTextStyles.buttonMedium,
    color: '#F5F5DC',
  },
  premiumButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    shadowColor: 'transparent',
    marginTop: 10,
  },
  premiumButtonText: {
    ...standardTextStyles.buttonMedium,
    color: '#F5F5DC',
    fontWeight: 'bold',
  },
  textShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  programCard: {
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#DDD',
    shadowColor: 'transparent',
  },
  programTitle: {
    ...standardTextStyles.cardTitle,
    color: '#F5F5DC',
    marginBottom: 8,
  },
  programSubtitle: {
    ...standardTextStyles.bodyMedium,
    color: '#F5F5DC',
    marginBottom: 8,
  },
  programProgress: {
    ...standardTextStyles.bodySmall,
    color: '#F5F5DC',
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
    color: '#F5F5DC',
    textAlign: 'center',
  },
}); 