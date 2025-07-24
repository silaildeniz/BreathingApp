import AsyncStorage from '@react-native-async-storage/async-storage';
import { AssessmentScores, PersonalizedProgram } from './programGenerator';

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
  isActive: boolean;
}

// Değerlendirme sonuçlarını kaydet
export const saveAssessmentResults = async (scores: AssessmentScores, program: PersonalizedProgram[]) => {
  try {
    const storedProgram: StoredProgram = {
      scores,
      program,
      currentDay: 2, // İkinci günden başla
      completedDays: [1], // İlk gün otomatik olarak tamamlanmış
      startDate: new Date().toISOString(),
      isActive: true,
    };

    await AsyncStorage.setItem(STORAGE_KEYS.ASSESSMENT_SCORES, JSON.stringify(scores));
    await AsyncStorage.setItem(STORAGE_KEYS.PERSONALIZED_PROGRAM, JSON.stringify(program));
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_DAY, '2');
    await AsyncStorage.setItem(STORAGE_KEYS.COMPLETED_DAYS, JSON.stringify([1]));
    await AsyncStorage.setItem(STORAGE_KEYS.PROGRAM_START_DATE, storedProgram.startDate);

    console.log('Değerlendirme sonuçları kaydedildi (ilk gün otomatik tamamlandı):', storedProgram);
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
    
    // Eğer program 20 günlükse, 10 günlük programa dönüştür
    if (parsedProgram.length > 10) {
      console.log('20 günlük program 10 günlük programa dönüştürülüyor...');
      
      // İlk 10 günü al
      const newProgram = parsedProgram.slice(0, 10);
      
      // Tamamlanan günleri 10 günle sınırla
      const parsedCompletedDays = JSON.parse(completedDays || '[]');
      const newCompletedDays = parsedCompletedDays.filter((day: number) => day <= 10);
      
      // Mevcut günü 10 günle sınırla
      const newCurrentDay = Math.min(parseInt(currentDay || '1'), 10);
      
      // Yeni programı kaydet
      const updatedStoredProgram: StoredProgram = {
        scores: JSON.parse(scores),
        program: newProgram,
        currentDay: newCurrentDay,
        completedDays: newCompletedDays,
        startDate: startDate || new Date().toISOString(),
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
      isActive: true,
    };
  } catch (error) {
    console.error('Kaydedilmiş program getirilemedi:', error);
    return null;
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

    console.log(`Gün ${dayNumber} tamamlandı. Sonraki gün: ${nextDay}`);
  } catch (error) {
    console.error('Gün tamamlanamadı:', error);
    throw error;
  }
};

// Günün kilitli olup olmadığını kontrol et
export const isDayLocked = async (dayNumber: number): Promise<boolean> => {
  try {
    const storedProgram = await getStoredProgram();
    if (!storedProgram) return true;

    // İlk gün her zaman açık (otomatik tamamlanmış)
    if (dayNumber === 1) return false;

    // Program başlangıç tarihini al
    const startDate = new Date(storedProgram.startDate);
    const today = new Date();
    
    // Bugünün tarihini hesapla (program başlangıcından itibaren kaçıncı gün)
    const timeDiff = today.getTime() - startDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
    
    // Günlük kilitleme: Gün sadece o günün bitiminde açılır
    // Örneğin: Program 1 Ocak'ta başladıysa, 2. gün 2 Ocak'ta açılır
    const shouldBeUnlocked = daysDiff >= (dayNumber - 1);
    
    // Ayrıca önceki günün tamamlanmış olması da gerekli
    const previousDay = dayNumber - 1;
    const isPreviousDayCompleted = storedProgram.completedDays.includes(previousDay);
    
    // Gün hem tarih olarak açık olmalı hem de önceki gün tamamlanmış olmalı
    return !shouldBeUnlocked || !isPreviousDayCompleted;
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

    // Tamamlanan günlerden sonraki ilk gün
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
    console.log('Program sıfırlandı');
  } catch (error) {
    console.error('Program sıfırlanamadı:', error);
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