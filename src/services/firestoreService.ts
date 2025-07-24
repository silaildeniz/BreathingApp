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

// Kullanıcı programı interface'i
export interface UserProgram {
  userId: string;
  assessmentScores: AssessmentScores;
  program: PersonalizedProgram[];
  currentDay: number;
  completedDays: number[];
  startDate: string;
  lastUpdated: string;
  isActive: boolean;
}

// Kullanıcı istatistikleri interface'i
export interface UserStats {
  userId: string;
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  lastSessionDate: string;
  favoriteTechniques: string[];
  lastSessionTechnique?: string;
}

// Kullanıcı programını kaydet/güncelle
export const saveUserProgram = async (userId: string, programData: Partial<UserProgram>) => {
  try {
    const programRef = doc(db, 'userPrograms', userId);
    const programDoc = {
      userId,
      lastUpdated: new Date().toISOString(),
      ...programData,
    };
    
    await setDoc(programRef, programDoc, { merge: true });
    console.log('Kullanıcı programı kaydedildi:', userId);
  } catch (error) {
    console.error('Program kaydetme hatası:', error);
    throw error;
  }
};

// Kullanıcı programını getir
export const getUserProgram = async (userId: string): Promise<UserProgram | null> => {
  try {
    const programRef = doc(db, 'userPrograms', userId);
    const programSnap = await getDoc(programRef);
    
    if (programSnap.exists()) {
      return programSnap.data() as UserProgram;
    }
    
    return null;
  } catch (error) {
    console.error('Program getirme hatası:', error);
    throw error;
  }
};

// Günü tamamla
export const completeDay = async (userId: string, dayNumber: number) => {
  try {
    const programRef = doc(db, 'userPrograms', userId);
    const programSnap = await getDoc(programRef);
    
    if (programSnap.exists()) {
      const program = programSnap.data() as UserProgram;
      const updatedCompletedDays = [...program.completedDays, dayNumber];
      const nextDay = Math.min(dayNumber + 1, program.program.length);
      
      await updateDoc(programRef, {
        completedDays: updatedCompletedDays,
        currentDay: nextDay,
        lastUpdated: new Date().toISOString(),
      });
      
      console.log(`Gün ${dayNumber} tamamlandı`);
    }
  } catch (error) {
    console.error('Gün tamamlama hatası:', error);
    throw error;
  }
};

// Günün kilitli olup olmadığını kontrol et (Firestore)
export const isDayLockedFirestore = async (userId: string, dayNumber: number): Promise<boolean> => {
  try {
    const program = await getUserProgram(userId);
    if (!program) return true;

    // İlk gün her zaman açık (otomatik tamamlanmış)
    if (dayNumber === 1) return false;

    // Program başlangıç tarihini al
    const startDate = new Date(program.startDate);
    const today = new Date();
    
    // Bugünün tarihini hesapla (program başlangıcından itibaren kaçıncı gün)
    const timeDiff = today.getTime() - startDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
    
    // Günlük kilitleme: Gün sadece o günün bitiminde açılır
    const shouldBeUnlocked = daysDiff >= (dayNumber - 1);
    
    // Ayrıca önceki günün tamamlanmış olması da gerekli
    const previousDay = dayNumber - 1;
    const isPreviousDayCompleted = program.completedDays.includes(previousDay);
    
    // Gün hem tarih olarak açık olmalı hem de önceki gün tamamlanmış olmalı
    return !shouldBeUnlocked || !isPreviousDayCompleted;
  } catch (error) {
    console.error('Gün kilidi kontrol edilemedi:', error);
    return true;
  }
};

// Kullanıcı istatistiklerini kaydet
export const saveUserStats = async (userId: string, statsData: Partial<UserStats>) => {
  try {
    const statsRef = doc(db, 'userStats', userId);
    const statsDoc = {
      userId,
      lastUpdated: new Date().toISOString(),
      ...statsData,
    };
    
    await setDoc(statsRef, statsDoc, { merge: true });
    console.log('Kullanıcı istatistikleri kaydedildi:', userId);
  } catch (error) {
    console.error('İstatistik kaydetme hatası:', error);
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
    
    console.log('Egzersiz oturumu kaydedildi');
  } catch (error) {
    console.error('Oturum kaydetme hatası:', error);
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

// Kullanıcı programını sıfırla
export const resetUserProgram = async (userId: string) => {
  try {
    const programRef = doc(db, 'userPrograms', userId);
    await deleteDoc(programRef);
    
    console.log('Kullanıcı programı sıfırlandı');
  } catch (error) {
    console.error('Program sıfırlama hatası:', error);
    throw error;
  }
}; 