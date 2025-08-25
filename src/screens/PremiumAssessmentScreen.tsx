import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
  ImageBackground,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getCurrentUser } from '../services/authService';
import { saveUserProgram, PremiumUserProgram } from '../services/firestoreService';
import { generatePremiumProgram } from '../utils/programGenerator';
import { getUserPreferences } from '../services/firestoreService';
import { COLORS, FONTS, standardTextStyles } from '../constants/typography';
import { triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';
import { checkPremiumStatus } from '../utils/premiumUtils';
import { validatePremiumAssessmentScores, sanitizeNumber } from '../utils/validation';
import { logAssessment, logError, logInfo, logUserAction, logWarn, logDebug } from '../utils/logger';

const { width, height } = Dimensions.get('window');

type PremiumAssessmentScreenNavigationProp = StackNavigationProp<any, 'PremiumAssessment'>;

// Premium için detaylı sorular
const premiumAssessmentQuestions = [
  {
    id: 'stress',
    question: 'Günlük stres seviyeniz nasıl?',
    options: [
      { value: 1, label: 'Çok düşük', description: 'Neredeyse hiç stres yaşamıyorum' },
      { value: 2, label: 'Düşük', description: 'Ara sıra hafif stres' },
      { value: 3, label: 'Orta', description: 'Düzenli stres yaşıyorum' },
      { value: 4, label: 'Yüksek', description: 'Sık sık yoğun stres' },
      { value: 5, label: 'Çok yüksek', description: 'Sürekli aşırı stres' }
    ]
  },
  {
    id: 'sleep',
    question: 'Uyku kaliteniz nasıl?',
    options: [
      { value: 1, label: 'Mükemmel', description: 'Derin ve dinlendirici uyku' },
      { value: 2, label: 'İyi', description: 'Genellikle iyi uyuyorum' },
      { value: 3, label: 'Orta', description: 'Bazen uyku sorunları yaşarım' },
      { value: 4, label: 'Kötü', description: 'Sık sık uyku problemi' },
      { value: 5, label: 'Çok kötü', description: 'Kronik uyku sorunları' }
    ]
  },
  {
    id: 'focus',
    question: 'Odaklanma ve konsantrasyon seviyeniz?',
    options: [
      { value: 1, label: 'Mükemmel', description: 'Uzun süre odaklanabiliyorum' },
      { value: 2, label: 'İyi', description: 'Genellikle iyi odaklanıyorum' },
      { value: 3, label: 'Orta', description: 'Ara sıra dikkat dağınıklığı' },
      { value: 4, label: 'Kötü', description: 'Sık sık odaklanma sorunu' },
      { value: 5, label: 'Çok kötü', description: 'Kronik dikkat dağınıklığı' }
    ]
  },
  {
    id: 'anxiety',
    question: 'Anksiyete ve kaygı seviyeniz?',
    options: [
      { value: 1, label: 'Hiç yok', description: 'Neredeyse hiç kaygı yaşamıyorum' },
      { value: 2, label: 'Düşük', description: 'Ara sıra hafif kaygı' },
      { value: 3, label: 'Orta', description: 'Düzenli kaygı yaşıyorum' },
      { value: 4, label: 'Yüksek', description: 'Sık sık yoğun kaygı' },
      { value: 5, label: 'Çok yüksek', description: 'Kronik anksiyete' }
    ]
  },
  {
    id: 'energy',
    question: 'Günlük enerji seviyeniz nasıl?',
    options: [
      { value: 1, label: 'Çok yüksek', description: 'Gün boyu enerjik hissediyorum' },
      { value: 2, label: 'Yüksek', description: 'Genellikle enerjik hissediyorum' },
      { value: 3, label: 'Orta', description: 'Bazen yorgun hissediyorum' },
      { value: 4, label: 'Düşük', description: 'Sık sık yorgun hissediyorum' },
      { value: 5, label: 'Çok düşük', description: 'Sürekli yorgun ve bitkin' }
    ]
  },
  {
    id: 'physical_activity',
    question: 'Fiziksel aktivite seviyeniz?',
    options: [
      { value: 1, label: 'Çok aktif', description: 'Günde 1+ saat egzersiz yapıyorum' },
      { value: 2, label: 'Aktif', description: 'Haftada 3-4 kez egzersiz yapıyorum' },
      { value: 3, label: 'Orta', description: 'Haftada 1-2 kez egzersiz yapıyorum' },
      { value: 4, label: 'Az aktif', description: 'Ara sıra egzersiz yapıyorum' },
      { value: 5, label: 'Hareketsiz', description: 'Neredeyse hiç egzersiz yapmıyorum' }
    ]
  },
  {
    id: 'meditation_experience',
    question: 'Meditasyon ve nefes egzersizi deneyiminiz?',
    options: [
      { value: 1, label: 'Uzman', description: 'Yıllardır düzenli pratik yapıyorum' },
      { value: 2, label: 'Deneyimli', description: 'Birkaç yıldır pratik yapıyorum' },
      { value: 3, label: 'Orta', description: 'Ara sıra pratik yapıyorum' },
      { value: 4, label: 'Yeni başlayan', description: 'Yeni başladım' },
      { value: 5, label: 'Hiç denemedim', description: 'İlk kez deneyeceğim' }
    ]
  },
  {
    id: 'work_life_balance',
    question: 'İş-yaşam dengesi nasıl?',
    options: [
      { value: 1, label: 'Mükemmel', description: 'Mükemmel bir denge kurmuşum' },
      { value: 2, label: 'İyi', description: 'Genellikle iyi bir denge var' },
      { value: 3, label: 'Orta', description: 'Bazen dengesizlik yaşıyorum' },
      { value: 4, label: 'Kötü', description: 'Sık sık dengesizlik yaşıyorum' },
      { value: 5, label: 'Çok kötü', description: 'Sürekli iş baskısı altındayım' }
    ]
  },
  {
    id: 'health_goals',
    question: 'Sağlık hedefleriniz neler?',
    options: [
      { value: 1, label: 'Stres azaltma', description: 'Stres ve anksiyeteyi azaltmak istiyorum' },
      { value: 2, label: 'Uyku kalitesi', description: 'Daha iyi uyku kalitesi istiyorum' },
      { value: 3, label: 'Odaklanma', description: 'Odaklanma ve konsantrasyonu artırmak istiyorum' },
      { value: 4, label: 'Enerji artırma', description: 'Günlük enerji seviyemi artırmak istiyorum' },
      { value: 5, label: 'Genel sağlık', description: 'Genel sağlığımı iyileştirmek istiyorum' }
    ]
  },
  // Premium özel sorular
  {
    id: 'favorite_technique',
    question: 'Daha önce denediğiniz nefes tekniklerinden hangisi size en iyi geliyor?',
    options: [
      { value: 1, label: 'Diyafram nefesi', description: 'Karından nefes alma' },
      { value: 2, label: '4-7-8 tekniği', description: 'Uyku için nefes tekniği' },
      { value: 3, label: 'Box breathing', description: 'Kutu nefes tekniği' },
      { value: 4, label: 'Alternatif burun', description: 'Nadi shodhana' },
      { value: 5, label: 'Hiç denemedim', description: 'Yeni başlayacağım' }
    ]
  },
  {
    id: 'preferred_duration',
    question: 'Günde ne kadar süre nefes egzersizi yapmak istiyorsunuz?',
    options: [
      { value: 1, label: '5-10 dakika', description: 'Kısa ve etkili' },
      { value: 2, label: '10-15 dakika', description: 'Orta süre' },
      { value: 3, label: '15-20 dakika', description: 'Uzun süre' },
      { value: 4, label: '20-30 dakika', description: 'Çok uzun süre' },
      { value: 5, label: 'Esnek', description: 'Duruma göre değişir' }
    ]
  },
  {
    id: 'best_time',
    question: 'Günün hangi saatinde nefes egzersizi yapmayı tercih edersiniz?',
    options: [
      { value: 1, label: 'Sabah', description: 'Güne başlarken' },
      { value: 2, label: 'Öğle', description: 'Gün ortasında' },
      { value: 3, label: 'Akşam', description: 'Gün sonunda' },
      { value: 4, label: 'Gece', description: 'Uyumadan önce' },
      { value: 5, label: 'Esnek', description: 'Duruma göre' }
    ]
  },
  {
    id: 'stress_triggers',
    question: 'En çok hangi durumlarda stres yaşıyorsunuz?',
    options: [
      { value: 1, label: 'İş stresi', description: 'İş hayatından kaynaklı' },
      { value: 2, label: 'Kişisel ilişkiler', description: 'Aile ve arkadaş ilişkileri' },
      { value: 3, label: 'Sağlık endişeleri', description: 'Sağlık ile ilgili kaygılar' },
      { value: 4, label: 'Finansal', description: 'Para ve maddi konular' },
      { value: 5, label: 'Genel anksiyete', description: 'Sürekli endişe hali' }
    ]
  },
  {
    id: 'sleep_issues',
    question: 'Uyku ile ilgili en büyük sorununuz nedir?',
    options: [
      { value: 1, label: 'Uykuya dalamama', description: 'Uykuya geçiş zorluğu' },
      { value: 2, label: 'Sık uyanma', description: 'Gece sık sık uyanma' },
      { value: 3, label: 'Erken uyanma', description: 'Çok erken uyanma' },
      { value: 4, label: 'Yüzeysel uyku', description: 'Derin uyku alamama' },
      { value: 5, label: 'Uyku yok', description: 'Hiç uyku problemi yok' }
    ]
  },
  {
    id: 'focus_challenges',
    question: 'Odaklanma konusunda en büyük zorluğunuz nedir?',
    options: [
      { value: 1, label: 'Dikkat dağınıklığı', description: 'Sürekli dikkat dağılması' },
      { value: 2, label: 'Zihin karmaşası', description: 'Düşünceler karışık' },
      { value: 3, label: 'Motivasyon eksikliği', description: 'İstek ve motivasyon yok' },
      { value: 4, label: 'Yorgunluk', description: 'Sürekli yorgun hissetme' },
      { value: 5, label: 'Hiç sorun yok', description: 'Odaklanma sorunu yok' }
    ]
  },
  {
    id: 'energy_patterns',
    question: 'Gün içinde enerji seviyeniz nasıl değişiyor?',
    options: [
      { value: 1, label: 'Sabah yüksek', description: 'Sabah enerjik, akşam yorgun' },
      { value: 2, label: 'Öğle yüksek', description: 'Öğleden sonra enerjik' },
      { value: 3, label: 'Akşam yüksek', description: 'Akşam saatlerinde enerjik' },
      { value: 4, label: 'Sürekli düşük', description: 'Gün boyu yorgun' },
      { value: 5, label: 'Dengeli', description: 'Gün boyu dengeli enerji' }
    ]
  },
  {
    id: 'lifestyle_factors',
    question: 'Günlük yaşamınızda en çok hangi faktör sizi etkiliyor?',
    options: [
      { value: 1, label: 'Yoğun iş temposu', description: 'İş hayatı baskısı' },
      { value: 2, label: 'Teknoloji kullanımı', description: 'Ekran süresi fazla' },
      { value: 3, label: 'Hareketsizlik', description: 'Fiziksel aktivite az' },
      { value: 4, label: 'Sosyal medya', description: 'Sosyal medya kullanımı' },
      { value: 5, label: 'Çevresel faktörler', description: 'Gürültü, hava kirliliği' }
    ]
  },
  {
    id: 'wellness_goals',
    question: 'Bu programdan en çok ne bekliyorsunuz?',
    options: [
      { value: 1, label: 'Stres yönetimi', description: 'Stresle başa çıkma' },
      { value: 2, label: 'Uyku iyileştirme', description: 'Daha iyi uyku' },
      { value: 3, label: 'Odaklanma artırma', description: 'Daha iyi konsantrasyon' },
      { value: 4, label: 'Enerji artırma', description: 'Daha fazla enerji' },
      { value: 5, label: 'Genel iyilik', description: 'Genel sağlık iyileştirme' }
    ]
  },
  // Sağlık durumu soruları - Güvenlik için zorunlu
  {
    id: 'heart_condition',
    question: 'Kalp rahatsızlığınız var mı?',
    options: [
      { value: 0, label: 'Hayır', description: 'Kalp rahatsızlığım yok' },
      { value: 1, label: 'Evet', description: 'Kalp rahatsızlığım var' }
    ]
  },
  {
    id: 'asthma_bronchitis',
    question: 'Astım veya bronşit rahatsızlığınız var mı?',
    options: [
      { value: 0, label: 'Hayır', description: 'Solunum rahatsızlığım yok' },
      { value: 1, label: 'Evet', description: 'Astım veya bronşitim var' }
    ]
  },
  {
    id: 'pregnancy',
    question: 'Hamile misiniz?',
    options: [
      { value: 0, label: 'Hayır', description: 'Hamile değilim' },
      { value: 1, label: 'Evet', description: 'Hamileyim' }
    ]
  },
  {
    id: 'high_blood_pressure',
    question: 'Yüksek tansiyon rahatsızlığınız var mı?',
    options: [
      { value: 0, label: 'Hayır', description: 'Tansiyon problemim yok' },
      { value: 1, label: 'Evet', description: 'Yüksek tansiyonum var' }
    ]
  },
  {
    id: 'diabetes',
    question: 'Diyabet rahatsızlığınız var mı?',
    options: [
      { value: 0, label: 'Hayır', description: 'Diyabetim yok' },
      { value: 1, label: 'Evet', description: 'Diyabetim var' }
    ]
  },
  {
    id: 'age_group',
    question: 'Yaş grubunuz nedir?',
    options: [
      { value: 1, label: '18-30 yaş', description: 'Genç yetişkin' },
      { value: 2, label: '31-50 yaş', description: 'Orta yaş' },
      { value: 3, label: '50+ yaş', description: 'İleri yaş' }
    ]
  },
  {
    id: 'physical_limitations',
    question: 'Fiziksel kısıtlamalarınız var mı?',
    options: [
      { value: 0, label: 'Hayır', description: 'Fiziksel kısıtlamam yok' },
      { value: 1, label: 'Evet', description: 'Fiziksel kısıtlamam var' }
    ]
  }
];

export default function PremiumAssessmentScreen() {
  const navigation = useNavigation<PremiumAssessmentScreenNavigationProp>();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  
  // Premium assessment için genişletilmiş cevaplar
  const [answers, setAnswers] = useState<{[key: string]: number}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);

  const preloadBackground = async () => {
    setBackgroundLoaded(true);
  };

  // Premium kontrolü
  useEffect(() => {
    const checkPremium = async () => {
      const premiumStatus = await checkPremiumStatus();
      setIsPremium(premiumStatus);
      
      if (!premiumStatus) {
        Alert.alert(
          'Premium Gerekli',
          'Bu özelliği kullanmak için premium üye olmanız gerekmektedir.',
          [
            {
              text: 'Premium Ol',
              onPress: () => navigation.navigate('Premium')
            },
            {
              text: 'Geri Dön',
              onPress: () => navigation.goBack(),
              style: 'cancel'
            }
          ]
        );
      }
    };
    
    checkPremium();
  }, [navigation]);

  // Değerlendirme tamamlandıktan sonra geri tuşuna basılırsa ana sayfaya yönlendir
  useFocusEffect(
    React.useCallback(() => {
      if (assessmentCompleted) {
        navigation.navigate('Home');
      }
    }, [assessmentCompleted, navigation])
  );

  // Component mount olduğunda state'i temizle
  useEffect(() => {
    logInfo('PremiumAssessmentScreen: Component mount');
    const initializeScreen = async () => {
      await preloadBackground();
      setCurrentQuestion(0);
      setAnswers({});
      setIsSubmitting(false);
    };
    
    initializeScreen();
  }, []);

  const [isAnswering, setIsAnswering] = useState(false);

  const handleAnswer = (value: number) => {
    // Hızlı tıklamaları engelle
    if (isAnswering) {
      logWarn('Hızlı tıklama engellendi');
      return;
    }
    
    setIsAnswering(true);
    triggerHapticFeedback(HapticType.SELECTION);
    
    // Input sanitization
    const sanitizedValue = sanitizeNumber(value);
    const questionId = premiumAssessmentQuestions[currentQuestion].id;
    
    logUserAction('Premium Assessment Answer', {
      questionId,
      value: sanitizedValue,
      questionNumber: currentQuestion + 1
    });
    
    const updatedAnswers = {
      ...answers,
      [questionId]: sanitizedValue
    };
    setAnswers(updatedAnswers);
    
    setTimeout(() => {
      if (currentQuestion < premiumAssessmentQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        logInfo('Premium test tamamlandı, program hazırlanıyor...');
        handleSubmit(updatedAnswers);
      }
      setIsAnswering(false); // Cevap işlemi tamamlandı
    }, 500);
  };

  const handlePrevious = () => {
    // Çift tıklamayı önle
    if (isAnswering) {
      logDebug('Geri butonu çift tıklama engellendi');
      return;
    }
    
    // Değerlendirme tamamlandıysa ana sayfaya yönlendir
    if (assessmentCompleted) {
      navigation.navigate('Home');
      return;
    }
    
    triggerHapticFeedback(HapticType.LIGHT);
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async (submitAnswers: {[key: string]: number}) => {
    logInfo('Premium program hazırlanıyor, tüm cevaplar alındı');
    
    // Data validation
          const validation = validatePremiumAssessmentScores(submitAnswers);
    if (!validation.isValid) {
      logError('Assessment validation failed', null, { errors: validation.errors });
      Alert.alert('Veri Hatası', 'Değerlendirme verilerinde hata bulundu. Lütfen tekrar deneyin.');
      return;
    }
    
    const unansweredQuestions = premiumAssessmentQuestions.filter(question => {
      const answer = submitAnswers[question.id];
      return answer === undefined || answer === null;
    });
    
    if (unansweredQuestions.length > 0) {
      logWarn('Eksik sorular var', { count: unansweredQuestions.length });
      Alert.alert('Eksik Cevap', `Lütfen tüm soruları cevaplayın. ${unansweredQuestions.length} soru eksik.`);
      return;
    }

    logInfo('Tüm premium sorular cevaplandı, program oluşturuluyor...');
    triggerHapticFeedback(HapticType.MEDIUM);
    setIsSubmitting(true);

    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        logError('Kullanıcı bilgisi bulunamadı');
        Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
        return;
      }

      // Kullanıcı tercihlerini al (döngü sayısı dahil)
      let userCycleCount: number | undefined;
      try {
        const userPrefs = await getUserPreferences(currentUser.uid);
        if (userPrefs && userPrefs.cycleCount) {
          userCycleCount = userPrefs.cycleCount;
          logInfo('Kullanıcı tercihleri alındı, döngü sayısı:', userCycleCount);
        }
      } catch (error) {
        logWarn('Kullanıcı tercihleri alınamadı, varsayılan döngü sayısı kullanılıyor:', error);
      }

      // Premium program oluştur (21 günlük, döngü sayısı ile)
      const premiumProgram = generatePremiumProgram(submitAnswers as any, userCycleCount);

      // Firestore'a kaydet - AssessmentScores tipini uygun hale getir
      const assessmentScores = {
        stress: submitAnswers.stress ?? 3,
        sleep: submitAnswers.sleep ?? 3,
        focus: submitAnswers.focus ?? 3,
        anxiety: submitAnswers.anxiety ?? 3,
        energy: submitAnswers.energy ?? 3,
        breathing: 3, // Varsayılan değer
        heart_condition: submitAnswers.heart_condition ?? 0,
        asthma_bronchitis: submitAnswers.asthma_bronchitis ?? 0,
        pregnancy: submitAnswers.pregnancy ?? 0,
        high_blood_pressure: submitAnswers.high_blood_pressure ?? 0,
        diabetes: submitAnswers.diabetes ?? 0,
        age_group: submitAnswers.age_group ?? 3,
        physical_limitations: submitAnswers.physical_limitations ?? 0,
        physical_activity: submitAnswers.physical_activity ?? 3,
        meditation_experience: submitAnswers.meditation_experience ?? 3,
        work_life_balance: submitAnswers.work_life_balance ?? 3,
        health_goals: submitAnswers.health_goals ?? 3,
        favorite_technique: submitAnswers.favorite_technique ?? 3,
        preferred_duration: submitAnswers.preferred_duration ?? 3,
        best_time: submitAnswers.best_time ?? 3,
        stress_triggers: submitAnswers.stress_triggers ?? 3,
        sleep_issues: submitAnswers.sleep_issues ?? 3,
        focus_challenges: submitAnswers.focus_challenges ?? 3,
        energy_patterns: submitAnswers.energy_patterns ?? 3,
        lifestyle_factors: submitAnswers.lifestyle_factors ?? 3,
        wellness_goals: submitAnswers.wellness_goals ?? 3
      };

      // Undefined değerleri temizle
      Object.keys(assessmentScores).forEach(key => {
        if (assessmentScores[key as keyof typeof assessmentScores] === undefined) {
          assessmentScores[key as keyof typeof assessmentScores] = 3;
        }
      });

      // Program verilerini hazırla
      const programData = {
        assessmentScores,
        program: premiumProgram,
        currentDay: 1,
        completedDays: [],
        startDate: new Date().toISOString(),
        isActive: true,
        isPremium: true,
      };

      // Program verilerini kontrol et ve undefined değerleri temizle
      if (!programData.program || !Array.isArray(programData.program)) {
        throw new Error('Premium program oluşturulamadı');
      }

      // Program array'indeki undefined değerleri kontrol et
      programData.program.forEach((day, index) => {
        if (!day) {
          throw new Error(`Gün ${index + 1} verisi eksik`);
        }
        // Undefined değerleri uygun varsayılan değerlerle değiştir
        if (day.title === undefined) day.title = 'Nefes Egzersizi';
        if (day.description === undefined) day.description = 'Nefes egzersizi';
        if (day.techniques === undefined) day.techniques = ['diaphragmatic'];
        if (day.duration === undefined) day.duration = '5 dakika';
        if (day.focus === undefined) day.focus = 'Nefes';
        if (day.intensity === undefined) day.intensity = 'medium';
        if (day.benefits === undefined) day.benefits = ['Rahatlatma'];
        if (day.isLocked === undefined) day.isLocked = false;
        if (day.severity === undefined) day.severity = 'normal';
        if (day.timeOfDay === undefined) day.timeOfDay = 'morning';
      });

      // Tüm programData objesini temizle - undefined değerleri kaldır
      const cleanProgramData = JSON.parse(JSON.stringify(programData));
      
      // Recursive olarak undefined değerleri temizle
      const removeUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) {
          return null;
        }
        if (Array.isArray(obj)) {
          return obj.map(removeUndefined).filter(item => item !== null);
        }
        if (typeof obj === 'object') {
          const cleaned: any = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
              cleaned[key] = removeUndefined(value);
            }
          }
          return cleaned;
        }
        return obj;
      };

      const finalProgramData = removeUndefined(cleanProgramData);

      // Firestore'a kaydet
      await saveUserProgram(currentUser.uid, finalProgramData as any);
      
      // Assessment logging (without sensitive data)
      const hasHealthConditions = Object.values(submitAnswers).some(value => 
        ['heart_condition', 'asthma_bronchitis', 'pregnancy', 'blood_pressure', 
         'high_blood_pressure', 'diabetes', 'physical_limitations'].includes(value.toString())
      );
      
      logAssessment('Premium', premiumAssessmentQuestions.length, hasHealthConditions);

      setAssessmentCompleted(true);
      
      Alert.alert(
        'Başarılı!',
        '21 günlük premium programınız oluşturuldu.',
        [
          {
            text: 'Programımı Görüntüle',
            onPress: () => navigation.navigate('PremiumProgram')
          }
        ]
      );
    } catch (error: any) {
      logError('Premium program oluşturma hatası', error, { 
        questionCount: premiumAssessmentQuestions.length,
        hasAnswers: Object.keys(submitAnswers).length
      });
      Alert.alert('Hata', 'Program oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };



  const currentQuestionData = premiumAssessmentQuestions[currentQuestion];
  const currentAnswer = answers[currentQuestionData.id];

  if (!isPremium) {
    return null; // Premium değilse hiçbir şey gösterme
  }

  return (
    <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover" onLoad={() => setBackgroundLoaded(true)}>
      <ScrollView style={{ flex: 1, backgroundColor: 'transparent' }} contentContainerStyle={{ paddingHorizontal: 15, paddingTop: 90 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[standardTextStyles.mainTitle, { color: '#F5F5DC', marginBottom: 8, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            Premium Kişisel Değerlendirme
          </Text>
          <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', textAlign: 'center', marginBottom: 10, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            21 günlük detaylı premium programınız için kapsamlı değerlendirme
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentQuestion + 1) / premiumAssessmentQuestions.length) * 100}%` }
              ]} 
            />
          </View>
          <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            {currentQuestion + 1} / {premiumAssessmentQuestions.length}
          </Text>
        </View>

        <View style={styles.questionContainer}>
          <Text style={[standardTextStyles.cardTitle, { color: '#FFFFFF', marginBottom: 24, lineHeight: 28, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            {currentQuestionData.question}
          </Text>
          
          <View style={styles.optionsContainer}>
            {currentQuestionData.options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionCard,
                  currentAnswer === option.value && styles.selectedOption,
                  isAnswering && styles.disabledOption
                ]}
                onPress={() => handleAnswer(option.value)}
                activeOpacity={0.8}
                disabled={isAnswering}
              >
                <View style={styles.optionHeader}>
                  <Text style={[
                    standardTextStyles.bodyLarge,
                    { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
                    currentAnswer === option.value && styles.selectedOptionText
                  ]}>
                    {option.label}
                  </Text>
                  <View style={[
                    styles.radioButton,
                    currentAnswer === option.value && styles.selectedRadio
                  ]}>
                    {currentAnswer === option.value && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </View>
                <Text style={[
                  standardTextStyles.bodySmall,
                  { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
                  currentAnswer === option.value && styles.selectedOptionText
                ]}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isSubmitting && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F5F5DC" />
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginTop: 16, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              Premium programınız oluşturuluyor...
            </Text>
          </View>
        )}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 20,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
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
  questionContainer: {
    backgroundColor: 'rgba(245, 245, 220, 0.1)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#DDD',
    shadowColor: 'transparent',
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: 'rgba(245, 245, 220, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DDD',
    marginBottom: 8,
  },
  selectedOption: {
    backgroundColor: 'rgba(245, 245, 220, 0.15)',
    borderColor: '#F5F5DC',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedOptionText: {
    fontFamily: 'Tahoma',
    color: '#F5F5DC',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRadio: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F5F5DC',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  disabledOption: {
    opacity: 0.5,
  },
}); 