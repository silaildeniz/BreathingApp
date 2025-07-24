import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase konfigürasyonu - GoogleService-Info.plist'ten alınan bilgiler
const firebaseConfig = {
  apiKey: "AIzaSyBRryIImz0EG77bz0ROj0zhWVorzb1efEA",
  authDomain: "breathingapp-7662b.firebaseapp.com",
  projectId: "breathingapp-7662b",
  storageBucket: "breathingapp-7662b.firebasestorage.app",
  messagingSenderId: "361021309714",
  appId: "1:361021309714:ios:524065f94a94f1516069cb"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Auth ve Firestore servislerini export et
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app; 