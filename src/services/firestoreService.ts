import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  limit, 
  getDocs,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { AssessmentScores, PersonalizedProgram } from '../utils/programGenerator';
import { logInfo, logError, logDebug, logWarn } from '../utils/logger';

// Kullanıcı programı interface'i
// Normal program için interface
export interface UserProgram {
  userId: string;
  assessmentScores: AssessmentScores;
  program: PersonalizedProgram[];
  currentDay: number;
  completedDays: number[]; // Normal program sadece number dizisi kullanır
  startDate: string;
  lastUpdated: string;
  isActive: boolean;
  isPremium?: false; // Normal program için
}

// Premium program için ayrı interface
export interface PremiumUserProgram {
  userId: string;
  assessmentScores: AssessmentScores;
  program: PersonalizedProgram[];
  currentDay: number;
  completedDays: string[]; // Premium program sadece string dizisi kullanır (session keys)
  startDate: string;
  lastUpdated: string;
  isActive: boolean;
  isPremium: true; // Premium program için
}

// Union type - her iki program tipini de destekler
export type UserProgramUnion = UserProgram | PremiumUserProgram;

// Kullanıcı istatistikleri interface'i
export interface UserStats {
  userId: string;
  totalSessions: number;
  currentStreak: number;
  longestStreak: number;
  lastSessionDate: string;
  favoriteTechniques: string[];
  techniqueCounts: { [key: string]: number }; // Teknik sayılarını tutmak için
  lastSessionTechnique?: string;
  weeklyProgress?: number[];
}

// Kullanıcı reset sayacı interface'i
export interface UserResetCount {
  userId: string;
  resetCount: number; // Aylık sıfırlama sayısı
  lastResetMonth: string; // Son sıfırlama ayı (YYYY-MM)
  lastUpdated: string;
}

// Kullanıcı tercihleri interface'i
export interface UserPreferences {
  userId: string;
  cycleCount: number;
  defaultDuration: number;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  lastUpdated: string;
}

// Kullanıcı programını kaydet/güncelle
export const saveUserProgram = async (userId: string, programData: Partial<UserProgramUnion>) => {
  try {
    const programRef = doc(db, 'userPrograms', userId);
    const programDoc = {
      userId,
      lastUpdated: new Date().toISOString(),
      ...programData,
    };
    
    await setDoc(programRef, programDoc, { merge: true });
    logInfo('Kullanıcı programı kaydedildi:', { userId });
  } catch (error) {
    logError('Program kaydetme hatası:', error);
    throw error;
  }
};

// Kullanıcı programını getir
export const getUserProgram = async (userId: string): Promise<UserProgramUnion | null> => {
  try {
    const programRef = doc(db, 'userPrograms', userId);
    const programSnap = await getDoc(programRef);
    
    if (programSnap.exists()) {
      const data = programSnap.data();
      // Premium program kontrolü
      if (data.isPremium) {
        return data as PremiumUserProgram;
      } else {
        return data as UserProgram;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Program getirme hatası:', error);
    throw error;
  }
};

// Kullanıcının tüm Firestore verilerini sil (program, istatistik, reset sayaçları)
export const deleteAllUserData = async (userId: string) => {
  try {
    const programRef = doc(db, 'userPrograms', userId);
    const statsRef = doc(db, 'userStats', userId);
    const resetsRef = doc(db, 'userResetCounts', userId);

    try { await deleteDoc(programRef); } catch (e) { logWarn('userPrograms silinemedi veya yok', e as any); }
    try { await deleteDoc(statsRef); } catch (e) { logWarn('userStats silinemedi veya yok', e as any); }
    try { await deleteDoc(resetsRef); } catch (e) { logWarn('userResetCounts silinemedi veya yok', e as any); }

    logInfo('Kullanıcı Firestore verileri silindi', { userId });
  } catch (error) {
    logError('Kullanıcı verileri silme hatası:', error);
    throw error;
  }
};

// Günü tamamla (Normal program için) - GÜVENLİ VERSİYON
export const completeDay = async (userId: string, dayNumber: number) => {
  try {
    logInfo(`completeDay başladı: userId=${userId}, dayNumber=${dayNumber}`);
    
    const programRef = doc(db, 'userPrograms', userId);
    const programSnap = await getDoc(programRef);
    
    if (!programSnap.exists()) {
      logError('Program bulunamadı');
      throw new Error('Program bulunamadı');
    }
    
      const program = programSnap.data() as UserProgram;
    logInfo('Mevcut program:', {
      currentDay: program.currentDay,
      completedDays: program.completedDays,
      programLength: program.program.length
    });
    
    // Gün sınırı kontrolü (5 günlük program)
    if (dayNumber > 5) {
      logWarn(`Gün ${dayNumber} 5 günlük program sınırını aşıyor`);
      return;
    }
    
    // Gün zaten tamamlanmış mı kontrol et
    if (program.completedDays.includes(dayNumber)) {
      logInfo(`Gün ${dayNumber} zaten tamamlanmış`);
      return;
    }
    
    // Güvenli güncelleme
      const updatedCompletedDays = [...program.completedDays, dayNumber];
    const nextDay = Math.min(dayNumber + 1, 5); // Maksimum 5. gün
    
    logInfo('Güncelleme yapılıyor:', {
      oldCompletedDays: program.completedDays,
      newCompletedDays: updatedCompletedDays,
      oldCurrentDay: program.currentDay,
      newCurrentDay: nextDay
    });
      
      await updateDoc(programRef, {
        completedDays: updatedCompletedDays,
        currentDay: nextDay,
        lastUpdated: new Date().toISOString(),
      });
      
    logInfo(`Gün ${dayNumber} başarıyla tamamlandı`);
  } catch (error) {
    logError('Gün tamamlama hatası:', error);
    throw error;
  }
};

// Premium program gününü tamamla (String session key için)
export const completePremiumDay = async (userId: string, sessionKey: string): Promise<PremiumUserProgram | null> => {
  try {
    logInfo(`Premium session tamamlama başladı: ${sessionKey}`);
    
    const programRef = doc(db, 'userPrograms', userId);
    const programSnap = await getDoc(programRef);
    
    if (!programSnap.exists()) {
      console.error('Premium program bulunamadı');
      throw new Error('Premium program bulunamadı');
    }
    
    const program = programSnap.data() as PremiumUserProgram;
          logDebug('Mevcut premium program:', program);
    
    // Premium program kontrolü
    if (!program.isPremium) {
      console.error('Bu program premium değil');
      throw new Error('Bu program premium değil');
    }
    
    // completedDays'in string dizisi olduğunu kontrol et
    const completedDays = program.completedDays || [];
          logDebug('Mevcut completedDays:', completedDays);
    
    const isAlreadyCompleted = completedDays.includes(sessionKey);
    
    if (isAlreadyCompleted) {
      logDebug(`Premium session ${sessionKey} zaten tamamlanmış`);
      return program;
    }
    
    // Yeni session key'i ekle
    const updatedCompletedDays = [...completedDays, sessionKey];
    logDebug('Güncellenmiş completedDays:', updatedCompletedDays);
    
    // Firestore'u güncelle
    await updateDoc(programRef, {
      completedDays: updatedCompletedDays,
      lastUpdated: new Date().toISOString(),
    });
    
    logInfo(`Premium session ${sessionKey} başarıyla tamamlandı`);
    
    // Güncellenmiş programı döndür
    const updatedSnap = await getDoc(programRef);
    if (updatedSnap.exists()) {
      return updatedSnap.data() as PremiumUserProgram;
    }
    
    return null;
  } catch (error) {
    logError('Premium gün tamamlama hatası:', error);
    throw error;
  }
};

// Günün kilitli olup olmadığını kontrol et (Firestore)
export const isDayLockedFirestore = async (userId: string, dayNumber: number): Promise<boolean> => {
  try {
    const program = await getUserProgram(userId);
    if (!program) return true;

    // İlk gün her zaman açık
    if (dayNumber === 1) return false;

    // 5 günlük program kontrolü
    if (dayNumber > 5) {
      logDebug(`Gün ${dayNumber} program dışında (5 günlük program)`);
      return true;
    }

    // Önceki günün tamamlanmış olması gerekli
    const previousDay = dayNumber - 1;
    let isPreviousDayCompleted = false;
    
    if (program.isPremium) {
      // Premium program için string kontrolü
      const premiumProgram = program as PremiumUserProgram;
      isPreviousDayCompleted = premiumProgram.completedDays.some(day => 
        day === previousDay.toString()
      );
    } else {
      // Normal program için number kontrolü
      const normalProgram = program as UserProgram;
      isPreviousDayCompleted = normalProgram.completedDays.includes(previousDay);
    }
    
    // Eğer önceki gün tamamlanmamışsa, bu gün kilitli
    if (!isPreviousDayCompleted) {
      logDebug(`Gün ${dayNumber} kilitli: Önceki gün (${previousDay}) tamamlanmamış`);
      return true;
    }

    // Program başlangıç tarihini al ve takvim günü bazlı kıyasla (00:00 normalize)
    const startDate = new Date(program.startDate);
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

// Kullanıcı istatistiklerini kaydet
export const saveUserStats = async (userId: string, statsData: Partial<UserStats>) => {
  try {
    const statsRef = doc(db, 'userStats', userId);
    
    // Haftalık ilerleme verisi yoksa oluştur
    let weeklyProgress = statsData.weeklyProgress;
    if (!weeklyProgress) {
      const existingStats = await getDoc(statsRef);
      if (existingStats.exists()) {
        weeklyProgress = (existingStats.data() as UserStats).weeklyProgress || [0, 0, 0, 0, 0, 0, 0];
      } else {
        weeklyProgress = [0, 0, 0, 0, 0, 0, 0];
      }
    }
    
    const statsDoc = {
      userId,
      lastUpdated: new Date().toISOString(),
      weeklyProgress,
      ...statsData,
    };
    
    await setDoc(statsRef, statsDoc, { merge: true });
    logInfo('Kullanıcı istatistikleri kaydedildi:', { userId });
  } catch (error) {
    logError('İstatistik kaydetme hatası:', error);
    throw error;
  }
};

// Kullanıcı istatistiklerini getir
export const getUserStats = async (userId: string): Promise<UserStats | null> => {
  try {
    const statsRef = doc(db, 'userStats', userId);
    const statsSnap = await getDoc(statsRef);
    
    if (statsSnap.exists()) {
      return statsSnap.data() as UserStats;
    }
    
    return null;
  } catch (error) {
    console.error('İstatistik getirme hatası:', error);
    throw error;
  }
};

// Egzersiz oturumunu kaydet
export const saveExerciseSession = async (userId: string, sessionData: {
  technique: string;
  duration: number;
  date: string;
  completed: boolean;
}) => {
  try {
    const sessionsRef = collection(db, 'exerciseSessions');
    await addDoc(sessionsRef, {
      userId,
      ...sessionData,
      createdAt: new Date().toISOString(),
    });
    
    logInfo('Egzersiz oturumu kaydedildi');
  } catch (error) {
    logError('Oturum kaydetme hatası:', error);
    throw error;
  }
};

// Kullanıcının egzersiz oturumlarını getir
export const getUserSessions = async (userId: string, limitCount: number = 50) => {
  try {
    const sessionsRef = collection(db, 'exerciseSessions');
    const q = query(
      sessionsRef,
      where('userId', '==', userId),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    
    const sessions = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return sessions;
  } catch (error) {
    console.error('Oturum getirme hatası:', error);
    throw error;
  }
};

// Kullanıcı tercihlerini kaydet/güncelle
export const saveUserPreferences = async (userId: string, preferences: Partial<UserPreferences>) => {
  try {
    const prefsRef = doc(db, 'userPreferences', userId);
    const prefsDoc = {
      userId,
      lastUpdated: new Date().toISOString(),
      ...preferences,
    };
    
    await setDoc(prefsRef, prefsDoc, { merge: true });
    logInfo('Kullanıcı tercihleri kaydedildi:', { userId, preferences });
  } catch (error) {
    logError('Tercih kaydetme hatası:', error);
    throw error;
  }
};

// Kullanıcı tercihlerini getir
export const getUserPreferences = async (userId: string): Promise<UserPreferences | null> => {
  try {
    const prefsRef = doc(db, 'userPreferences', userId);
    const prefsSnap = await getDoc(prefsRef);
    
    if (prefsSnap.exists()) {
      return prefsSnap.data() as UserPreferences;
    }
    
    return null;
  } catch (error) {
    logError('Tercih getirme hatası:', error);
    throw error;
  }
};

// Döngü sayısını güncelle
export const updateUserCycleCount = async (userId: string, cycleCount: number) => {
  try {
    await saveUserPreferences(userId, { cycleCount });
    logInfo('Döngü sayısı güncellendi:', { userId, cycleCount });
  } catch (error) {
    logError('Döngü sayısı güncelleme hatası:', error);
    throw error;
  }
};

// Kullanıcı programını sıfırla
export const resetUserProgram = async (userId: string) => {
  try {
    const programRef = doc(db, 'userPrograms', userId);
    await deleteDoc(programRef);
    
    // Reset sayacını artır
    await incrementResetCount(userId);
    
    logInfo('Kullanıcı programı sıfırlandı ve reset sayacı artırıldı');
  } catch (error) {
    logError('Program sıfırlama hatası:', error);
    throw error;
  }
};

// Premium programı tamamen sil ve normal duruma döndür
export const deletePremiumProgram = async (userId: string) => {
  try {
    const programRef = doc(db, 'userPrograms', userId);
    
    // Önce mevcut programı kontrol et
    const programSnap = await getDoc(programRef);
    
    if (programSnap.exists()) {
      const data = programSnap.data();
      
      if (data.isPremium) {
        // Premium program varsa tamamen sil
        await deleteDoc(programRef);
        logInfo('Premium program tamamen silindi:', { userId });
      } else {
        // Normal program varsa sadece temizle
        await setDoc(programRef, {
          userId,
          isActive: false,
          isPremium: false,
          program: [],
          completedDays: [],
          currentDay: 1,
          lastUpdated: new Date().toISOString(),
        }, { merge: true });
        logInfo('Normal program temizlendi:', { userId });
      }
    } else {
      logInfo('Program bulunamadı, silme işlemi atlandı:', { userId });
    }
  } catch (error) {
    logError('Premium program silme hatası:', error);
    throw error;
  }
};

// Kullanıcının reset sayacını getir
export const getUserResetCount = async (userId: string): Promise<UserResetCount | null> => {
  try {
    const resetRef = doc(db, 'userResetCounts', userId);
    const resetSnap = await getDoc(resetRef);
    
    if (resetSnap.exists()) {
      return resetSnap.data() as UserResetCount;
    }
    
    return null;
  } catch (error) {
    logError('Reset sayacı getirme hatası:', error);
    throw error;
  }
};

// Kullanıcının reset sayacını kaydet/güncelle
export const saveUserResetCount = async (userId: string, resetData: Partial<UserResetCount>) => {
  try {
    const resetRef = doc(db, 'userResetCounts', userId);
    const resetDoc = {
      userId,
      lastUpdated: new Date().toISOString(),
      ...resetData,
    };
    
    await setDoc(resetRef, resetDoc, { merge: true });
    logInfo('Reset sayacı kaydedildi:', { userId, resetData });
  } catch (error) {
    logError('Reset sayacı kaydetme hatası:', error);
    throw error;
  }
};

// Reset sayacını artır
export const incrementResetCount = async (userId: string): Promise<UserResetCount> => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentResetCount = await getUserResetCount(userId);
    
    let newResetCount: UserResetCount;
    
    if (!currentResetCount) {
      // İlk kez reset yapılıyor
      newResetCount = {
        userId,
        resetCount: 1,
        lastResetMonth: currentMonth,
        lastUpdated: new Date().toISOString(),
      };
    } else if (currentResetCount.lastResetMonth === currentMonth) {
      // Aynı ay içinde reset artırılıyor
      newResetCount = {
        ...currentResetCount,
        resetCount: currentResetCount.resetCount + 1,
        lastUpdated: new Date().toISOString(),
      };
    } else {
      // Yeni ay başlangıcı, sayacı sıfırla
      newResetCount = {
        ...currentResetCount,
        resetCount: 1,
        lastResetMonth: currentMonth,
        lastUpdated: new Date().toISOString(),
      };
    }
    
    await saveUserResetCount(userId, newResetCount);
    return newResetCount;
  } catch (error) {
    logError('Reset sayacı artırma hatası:', error);
    throw error;
  }
};

// Kullanıcının reset yapabilir mi kontrol et
export const canUserResetProgram = async (userId: string, isPremium: boolean): Promise<{ canReset: boolean; remainingResets: number; message: string }> => {
  try {
    // Premium kullanıcılar sınırsız reset yapabilir
    if (isPremium) {
      return {
        canReset: true,
        remainingResets: -1, // Sınırsız
        message: 'Premium kullanıcılar sınırsız program sıfırlama hakkına sahiptir.'
      };
    }
    
    const resetCount = await getUserResetCount(userId);
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    if (!resetCount || resetCount.lastResetMonth !== currentMonth) {
      // Bu ay hiç reset yapmamış
      return {
        canReset: true,
        remainingResets: 3,
        message: 'Bu ay 3 program sıfırlama hakkınız var.'
      };
    }
    
    const remainingResets = 3 - resetCount.resetCount;
    
    if (remainingResets > 0) {
      return {
        canReset: true,
        remainingResets,
        message: `Bu ay ${remainingResets} program sıfırlama hakkınız kaldı.`
      };
    } else {
      return {
        canReset: false,
        remainingResets: 0,
        message: 'Bu ay program sıfırlama hakkınız bitti. Premium üye olarak sınırsız sıfırlama yapabilirsiniz.'
      };
    }
  } catch (error) {
    logError('Reset kontrolü hatası:', error);
    throw error;
  }
}; 