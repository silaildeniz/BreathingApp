import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User,
  updateProfile,
  UserCredential
} from 'firebase/auth';
import { auth } from '../config/firebase';

// Firestore'u geçici olarak devre dışı bırak
// import { db } from '../config/firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// E-posta/şifre ile kayıt
export const registerWithEmail = async (email: string, password: string, displayName?: string) => {
  try {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Kullanıcı adını güncelle (isteğe bağlı)
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, {
        displayName: displayName
      });
    }
    
    return userCredential.user;
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error.code));
  }
};

// E-posta/şifre ile giriş
export const loginWithEmail = async (email: string, password: string) => {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error.code));
  }
};

// Google ile giriş
export const loginWithGoogle = async () => {
  try {
    // Expo için Google Sign-In entegrasyonu gerekli
    // Şimdilik placeholder
    throw new Error('Google Sign-In henüz entegre edilmedi');
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error.code));
  }
};

// Apple ile giriş
export const loginWithApple = async () => {
  try {
    // Expo için Apple Sign-In entegrasyonu gerekli
    // Şimdilik placeholder
    throw new Error('Apple Sign-In henüz entegre edilmedi');
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error.code));
  }
};

// Çıkış yap
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error.code));
  }
};

// Auth state listener
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Mevcut kullanıcıyı al
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Firebase hata mesajlarını Türkçe'ye çevir
const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.';
    case 'auth/wrong-password':
      return 'Hatalı şifre.';
    case 'auth/email-already-in-use':
      return 'Bu e-posta adresi zaten kullanımda.';
    case 'auth/weak-password':
      return 'Şifre çok zayıf. En az 6 karakter kullanın.';
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi.';
    case 'auth/too-many-requests':
      return 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.';
    case 'auth/network-request-failed':
      return 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.';
    default:
      return 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }
}; 