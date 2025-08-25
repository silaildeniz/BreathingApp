import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from '../services/authService';
import { getUserProgram, saveUserProgram, deletePremiumProgram, saveUserResetCount } from '../services/firestoreService';

export interface PremiumUser {
  isPremium: boolean;
  purchaseDate?: string;
  expiryDate?: string;
  features: string[];
}

export const checkPremiumStatus = async (): Promise<boolean> => {
  try {
    const premiumData = await AsyncStorage.getItem('premium_status');
    if (premiumData) {
      const premium: PremiumUser = JSON.parse(premiumData);
      return premium.isPremium;
    }
    return false;
  } catch (error) {
    console.log('Error checking premium status:', error);
    return false;
  }
};

export const activatePremium = async (): Promise<void> => {
  try {
    console.log('Premium aktifleştiriliyor...');
    const premiumData: PremiumUser = {
      isPremium: true,
      purchaseDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 yıl
      features: [
        '30_day_program',
        'premium_techniques',
        'detailed_stats',
        'custom_reminders'
      ]
    };
    await AsyncStorage.setItem('premium_status', JSON.stringify(premiumData));
    console.log('Premium başarıyla aktifleştirildi!');
  } catch (error) {
    console.log('Error activating premium:', error);
  }
};

export const getPremiumFeatures = async (): Promise<string[]> => {
  try {
    const premiumData = await AsyncStorage.getItem('premium_status');
    if (premiumData) {
      const premium: PremiumUser = JSON.parse(premiumData);
      return premium.features || [];
    }
    return [];
  } catch (error) {
    console.log('Error getting premium features:', error);
    return [];
  }
};

export const hasPremiumFeature = async (feature: string): Promise<boolean> => {
  const features = await getPremiumFeatures();
  return features.includes(feature);
};

export const deactivatePremium = async (): Promise<void> => {
  try {
    console.log('Premium iptal ediliyor...');
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('Kullanıcı bilgisi bulunamadı');
    }
    
    // 1. AsyncStorage'dan premium durumunu tamamen kaldır
    await AsyncStorage.removeItem('premium_status');
    console.log('AsyncStorage premium durumu kaldırıldı');
    
    // 2. Firestore'daki premium program verisini tamamen sil
    try {
      await deletePremiumProgram(currentUser.uid);
      console.log('Firestore premium program verisi tamamen silindi');
    } catch (firestoreError) {
      console.log('Firestore temizleme hatası (devam ediliyor):', firestoreError);
      // Firestore hatası olsa bile devam et
    }
    
    // 3. AsyncStorage'daki program verilerini de temizle
    try {
      await AsyncStorage.removeItem('user_program');
      console.log('AsyncStorage program verisi temizlendi');
    } catch (storageError) {
      console.log('AsyncStorage temizleme hatası (devam ediliyor):', storageError);
    }
    
    // 4. Premium ile ilgili diğer verileri temizle
    const keysToRemove = [
      'premium_assessment_results',
      'premium_program_data',
      'premium_reminder_settings'
    ];
    
    for (const key of keysToRemove) {
      try {
        await AsyncStorage.removeItem(key);
      } catch (error) {
        console.log(`${key} temizleme hatası:`, error);
      }
    }
    
    // 5. Reset sayacını sıfırla (normal kullanıcı olarak 3 hak tanı)
    try {
      await saveUserResetCount(currentUser.uid, {
        userId: currentUser.uid,
        resetCount: 0,
        lastResetMonth: new Date().toISOString().slice(0, 7),
        lastUpdated: new Date().toISOString(),
      });
      console.log('Reset sayacı sıfırlandı, normal kullanıcı olarak 3 hak tanındı');
    } catch (resetError) {
      console.log('Reset sayacı sıfırlama hatası (devam ediliyor):', resetError);
    }
    
    console.log('Premium başarıyla iptal edildi ve tüm veriler temizlendi!');
  } catch (error) {
    console.log('Error deactivating premium:', error);
    throw error;
  }
}; 