import AsyncStorage from '@react-native-async-storage/async-storage';
import { AssessmentScores, PersonalizedProgram } from './programGenerator';
import { logInfo, logError, logDebug } from './logger';

const STORAGE_KEYS = {
  ASSESSMENT_SCORES: 'assessment_scores',
  PERSONALIZED_PROGRAM: 'personalized_program',
  CURRENT_DAY: 'current_day',
  COMPLETED_DAYS: 'completed_days',
  PROGRAM_START_DATE: 'program_start_date',
};

export interface StoredProgram {
  scores: AssessmentScores;
  program: PersonalizedProgram[];
  currentDay: number;
  completedDays: number[];
  startDate: string;
  lastUpdated?: string;
  isActive: boolean;
}

// Değerlendirme sonuçlarını kaydet
export const saveAssessmentResults = async (scores: AssessmentScores, program: PersonalizedProgram[]) => {
  try {
    const storedProgram: StoredProgram = {
      scores,
      program,
      currentDay: 1, // İlk günden başla
      completedDays: [], // İlk gün tamamlanmamış
      startDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      isActive: true,
    };

    await AsyncStorage.setItem(STORAGE_KEYS.ASSESSMENT_SCORES, JSON.stringify(scores));
    await AsyncStorage.setItem(STORAGE_KEYS.PERSONALIZED_PROGRAM, JSON.stringify(program));
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_DAY, '1');
    await AsyncStorage.setItem(STORAGE_KEYS.COMPLETED_DAYS, JSON.stringify([]));
    await AsyncStorage.setItem(STORAGE_KEYS.PROGRAM_START_DATE, storedProgram.startDate);

    logInfo('Değerlendirme sonuçları kaydedildi (ilk gün başlatıldı):', storedProgram);
    return storedProgram;
  } catch (error) {
    console.error('Değerlendirme sonuçları kaydedilemedi:', error);
    throw error;
  }
};

// Kaydedilmiş programı getir
export const getStoredProgram = async (): Promise<StoredProgram | null> => {
  try {
    const scores = await AsyncStorage.getItem(STORAGE_KEYS.ASSESSMENT_SCORES);
    const program = await AsyncStorage.getItem(STORAGE_KEYS.PERSONALIZED_PROGRAM);
    const currentDay = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_DAY);
    const completedDays = await AsyncStorage.getItem(STORAGE_KEYS.COMPLETED_DAYS);
    const startDate = await AsyncStorage.getItem(STORAGE_KEYS.PROGRAM_START_DATE);

    if (!scores || !program) {
      return null;
    }

    const parsedProgram = JSON.parse(program);
    
    // Eğer program 5 günden uzunsa, 5 günlük programa dönüştür
    if (parsedProgram.length > 5) {
      logDebug('Uzun program 5 günlük programa dönüştürülüyor...');
      
      // İlk 5 günü al
      const newProgram = parsedProgram.slice(0, 5);
      
      // Tamamlanan günleri 5 günle sınırla
      const parsedCompletedDays = JSON.parse(completedDays || '[]');
      const newCompletedDays = parsedCompletedDays.filter((day: number) => day <= 5);
      
      // Mevcut günü 5 günle sınırla
      const newCurrentDay = Math.min(parseInt(currentDay || '1'), 5);
      
      // Yeni programı kaydet
      const updatedStoredProgram: StoredProgram = {
        scores: JSON.parse(scores),
        program: newProgram,
        currentDay: newCurrentDay,
        completedDays: newCompletedDays,
        startDate: startDate || new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        isActive: true,
      };
      
      // AsyncStorage'ı güncelle
      await AsyncStorage.setItem(STORAGE_KEYS.PERSONALIZED_PROGRAM, JSON.stringify(newProgram));
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_DAY, newCurrentDay.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.COMPLETED_DAYS, JSON.stringify(newCompletedDays));
      
      return updatedStoredProgram;
    }

    return {
      scores: JSON.parse(scores),
      program: parsedProgram,
      currentDay: parseInt(currentDay || '1'),
      completedDays: JSON.parse(completedDays || '[]'),
      startDate: startDate || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      isActive: true,
    };
  } catch (error) {
    console.error('Kaydedilmiş program getirilemedi:', error);
    return null;
  }
};

// Programı güncelle ve kaydet
export const saveStoredProgram = async (updatedProgram: StoredProgram) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ASSESSMENT_SCORES, JSON.stringify(updatedProgram.scores));
    await AsyncStorage.setItem(STORAGE_KEYS.PERSONALIZED_PROGRAM, JSON.stringify(updatedProgram.program));
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_DAY, updatedProgram.currentDay.toString());
    await AsyncStorage.setItem(STORAGE_KEYS.COMPLETED_DAYS, JSON.stringify(updatedProgram.completedDays));
    await AsyncStorage.setItem(STORAGE_KEYS.PROGRAM_START_DATE, updatedProgram.startDate);

    logInfo('Program güncellendi:', updatedProgram);
    return updatedProgram;
  } catch (error) {
    console.error('Program güncellenemedi:', error);
    throw error;
  }
};

// Günü tamamla
export const completeDay = async (dayNumber: number) => {
  try {
    const storedProgram = await getStoredProgram();
    if (!storedProgram) return;

    // Günü tamamlananlar listesine ekle
    const updatedCompletedDays = [...storedProgram.completedDays, dayNumber];
    await AsyncStorage.setItem(STORAGE_KEYS.COMPLETED_DAYS, JSON.stringify(updatedCompletedDays));

    // Mevcut günü güncelle
    const nextDay = Math.min(dayNumber + 1, storedProgram.program.length);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_DAY, nextDay.toString());

    logInfo(`Gün ${dayNumber} tamamlandı. Sonraki gün: ${nextDay}`);
  } catch (error) {
    logError('Gün tamamlanamadı:', error);
    throw error;
  }
};

// Günün kilitli olup olmadığını kontrol et
export const isDayLocked = async (dayNumber: number) => {
  try {
    const storedProgram = await getStoredProgram();
    if (!storedProgram) return true;

    // İlk gün her zaman açık
    if (dayNumber === 1) return false;

    // 5 günlük program kontrolü
    if (dayNumber > 5) {
      logDebug(`Gün ${dayNumber} program dışında (5 günlük program)`);
      return true;
    }

    // Önceki günün tamamlanmış olması gerekli
    const previousDay = dayNumber - 1;
    const isPreviousDayCompleted = storedProgram.completedDays.includes(previousDay);
    
    // Eğer önceki gün tamamlanmamışsa, bu gün kilitli
    if (!isPreviousDayCompleted) {
      logDebug(`Gün ${dayNumber} kilitli: Önceki gün (${previousDay}) tamamlanmamış`);
      return true;
    }

    // Program başlangıç tarihini al ve takvim günü bazlı kıyasla (00:00 normalize)
    const startDate = new Date(storedProgram.startDate);
    const today = new Date();
    const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const startDay = normalize(startDate);
    const todayDay = normalize(today);
    const daysDiff = Math.floor((todayDay.getTime() - startDay.getTime()) / (1000 * 3600 * 24));
    
    // Gün açma kuralı: Sadece tarih değişimiyle açılır (öğlen şartı yok)
    // Örn: Program 1 Ocak'ta başladıysa, 2. gün 2 Ocak'ta açılır
    const shouldBeUnlocked = daysDiff >= (dayNumber - 1);
    
    if (!shouldBeUnlocked) {
      logDebug(`Gün ${dayNumber} kilitli: Zaman henüz gelmedi (geçen gün: ${daysDiff})`);
    }
    
    return !shouldBeUnlocked;
  } catch (error) {
    console.error('Gün kilidi kontrol edilemedi:', error);
    return true;
  }
};

// Mevcut açık günü getir
export const getCurrentOpenDay = async (): Promise<number> => {
  try {
    const storedProgram = await getStoredProgram();
    if (!storedProgram) return 1;

    // Program boyunca döngü yap ve ilk açık günü bul
    for (let day = 1; day <= storedProgram.program.length; day++) {
      const isLocked = await isDayLocked(day);
      if (!isLocked) {
        return day;
      }
    }
    
    // Hiç açık gün yoksa, tamamlanan günlerden sonraki günü döndür
    const lastCompletedDay = Math.max(...storedProgram.completedDays, 0);
    return Math.min(lastCompletedDay + 1, storedProgram.program.length);
  } catch (error) {
    console.error('Mevcut açık gün getirilemedi:', error);
    return 1;
  }
};

// Programı sıfırla
export const resetProgram = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ASSESSMENT_SCORES,
      STORAGE_KEYS.PERSONALIZED_PROGRAM,
      STORAGE_KEYS.CURRENT_DAY,
      STORAGE_KEYS.COMPLETED_DAYS,
      STORAGE_KEYS.PROGRAM_START_DATE,
    ]);
    logInfo('Program sıfırlandı');
  } catch (error) {
    logError('Program sıfırlanamadı:', error);
  }
};

// Program durumunu kontrol et
export const hasActiveProgram = async (): Promise<boolean> => {
  try {
    const program = await getStoredProgram();
    return program !== null && program.isActive;
  } catch (error) {
    return false;
  }
}; 

// Premium abonelik durumunu kontrol et
export const isPremiumUser = async (): Promise<boolean> => {
  try {
    const premiumStatus = await AsyncStorage.getItem('premium_status');
    return premiumStatus === 'active';
  } catch (error) {
    console.error('Premium durum kontrol edilemedi:', error);
    return false;
  }
};

// Premium abonelik başlat
export const activatePremium = async () => {
  try {
    await AsyncStorage.setItem('premium_status', 'active');
    await AsyncStorage.setItem('premium_start_date', new Date().toISOString());
    logInfo('Premium abonelik aktifleştirildi');
  } catch (error) {
    logError('Premium abonelik aktifleştirilemedi:', error);
    throw error;
  }
};

// Premium abonelik durumunu getir
export const getPremiumStatus = async () => {
  try {
    const status = await AsyncStorage.getItem('premium_status');
    const startDate = await AsyncStorage.getItem('premium_start_date');
    return {
      isActive: status === 'active',
      startDate: startDate ? new Date(startDate) : null,
    };
  } catch (error) {
    console.error('Premium durum getirilemedi:', error);
    return { isActive: false, startDate: null };
  }
}; 