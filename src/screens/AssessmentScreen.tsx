import React, { useState, useEffect } from 'react';
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
import { generatePersonalizedProgram, AssessmentScores } from '../utils/programGenerator';
import { getUserPreferences } from '../services/firestoreService';
import { getCurrentUser } from '../services/authService';
import { saveUserProgram } from '../services/firestoreService';
import { saveAssessmentResults } from '../utils/programStorage';
import { COLORS, FONTS, standardTextStyles } from '../constants/typography';
import { triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';
import { validateAssessmentScores, sanitizeNumber } from '../utils/validation';
import { logAssessment, logError, logInfo, logUserAction, logWarn, logDebug } from '../utils/logger';

const { width, height } = Dimensions.get('window');

type AssessmentScreenNavigationProp = StackNavigationProp<any, 'Assessment'>;

const assessmentQuestions = [
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
    id: 'breathing',
    question: 'Nefes alma kaliteniz nasıl?',
    options: [
      { value: 1, label: 'Mükemmel', description: 'Derin ve düzenli nefes alıyorum' },
      { value: 2, label: 'İyi', description: 'Genellikle iyi nefes alıyorum' },
      { value: 3, label: 'Orta', description: 'Bazen nefes sorunları yaşarım' },
      { value: 4, label: 'Kötü', description: 'Sık sık nefes problemi' },
      { value: 5, label: 'Çok kötü', description: 'Kronik nefes sorunları' }
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
  // Fiziksel sağlık durumu soruları
  {
    id: 'heart_condition',
    question: 'Kalp hastalığı veya kalp problemi yaşıyor musunuz?',
    options: [
      { value: 0, label: 'Hayır', description: 'Kalp problemi yok' },
      { value: 1, label: 'Evet', description: 'Kalp hastalığı var' }
    ]
  },
  {
    id: 'asthma_bronchitis',
    question: 'Astım, bronşit veya solunum problemi yaşıyor musunuz?',
    options: [
      { value: 0, label: 'Hayır', description: 'Solunum problemi yok' },
      { value: 1, label: 'Evet', description: 'Astım/bronşit var' }
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
    question: 'Yüksek tansiyon probleminiz var mı?',
    options: [
      { value: 0, label: 'Hayır', description: 'Tansiyon problemi yok' },
      { value: 1, label: 'Evet', description: 'Yüksek tansiyon var' }
    ]
  },
  {
    id: 'diabetes',
    question: 'Diyabet hastalığınız var mı?',
    options: [
      { value: 0, label: 'Hayır', description: 'Diyabet yok' },
      { value: 1, label: 'Evet', description: 'Diyabet var' }
    ]
  },
  {
    id: 'age_group',
    question: 'Yaş grubunuz hangisi?',
    options: [
      { value: 1, label: '18-30 yaş', description: 'Genç yetişkin' },
      { value: 2, label: '31-50 yaş', description: 'Orta yaş' },
      { value: 3, label: '50+ yaş', description: 'İleri yaş' }
    ]
  },
  {
    id: 'physical_limitations',
    question: 'Fiziksel kısıtlama veya sakatlığınız var mı?',
    options: [
      { value: 0, label: 'Hayır', description: 'Fiziksel kısıtlama yok' },
      { value: 1, label: 'Evet', description: 'Fiziksel kısıtlama var' }
    ]
  }
];

export default function AssessmentScreen() {
  const navigation = useNavigation<AssessmentScreenNavigationProp>();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  
  // Varsayılan değerleri sıfırla
  const [answers, setAnswers] = useState<AssessmentScores>({
    stress: 0,
    sleep: 0,
    focus: 0,
    breathing: 0,
    anxiety: 0,
    energy: 0,
    physical_activity: 0,
    meditation_experience: 0,
    work_life_balance: 0,
    health_goals: 0,
    // Fiziksel sağlık durumu - TÜMÜ 0 OLMALI
    heart_condition: 0,
    asthma_bronchitis: 0,
    pregnancy: 0,
    high_blood_pressure: 0,
    diabetes: 0,
    age_group: 0, // Kullanıcı seçim yapmalı
    physical_limitations: 0
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false); // Çift tıklamayı önlemek için
  const [interactedQuestions, setInteractedQuestions] = useState<Set<string>>(new Set());

  // Sağlık soruları (otomatik 0 set edilir ama UI'da seçili gibi görünmesin)
  const HEALTH_QUESTION_IDS: Array<keyof AssessmentScores> = [
    'heart_condition',
    'asthma_bronchitis',
    'pregnancy',
    'high_blood_pressure',
    'diabetes',
    'physical_limitations'
  ];

  const preloadBackground = async () => {
    // Local dosyalar için preloading'e gerek yok, sadece onLoad handler kullanılacak
    setBackgroundLoaded(true);
  };

  // Component mount olduğunda state'i temizle
  useEffect(() => {
    logDebug('AssessmentScreen: Component mount, state temizleniyor');
    const initializeScreen = async () => {
      await preloadBackground();
      setCurrentQuestion(0);
      setAnswers({
        stress: 0,
        sleep: 0,
        focus: 0,
        breathing: 0,
        anxiety: 0,
        energy: 0,
        physical_activity: 0,
        meditation_experience: 0,
        work_life_balance: 0,
        health_goals: 0,
        heart_condition: 0,
        asthma_bronchitis: 0,
        pregnancy: 0,
        high_blood_pressure: 0,
        diabetes: 0,
        age_group: 0,
        physical_limitations: 0
      });
      setIsSubmitting(false);
    };
    
    initializeScreen();
  }, []);

  // Hastalık sorularında varsayılan değerleri otomatik seç
  useEffect(() => {
    const currentQuestionData = assessmentQuestions[currentQuestion];
    if (currentQuestionData) {
      const questionId = currentQuestionData.id as keyof AssessmentScores;
      
      // Hastalık soruları için varsayılan değer (0 = Hayır) otomatik seç
      if (HEALTH_QUESTION_IDS.includes(questionId) && answers[questionId] === 0) {
        // Hastalık sorularında varsayılan olarak "Hayır" seç
        setAnswers(prev => ({
          ...prev,
          [questionId]: 0 // 0 = Hayır
        }));
        logDebug(`Hastalık sorusu: ${questionId}, varsayılan değer (Hayır) otomatik seçildi`);
      }
    }
  }, [currentQuestion]);

  const handleAnswer = (value: number) => {
    // Çift tıklamayı önle
    if (isAnswering) {
      logDebug('Çift tıklama engellendi');
      return;
    }
    
    setIsAnswering(true);
    triggerHapticFeedback(HapticType.SELECTION);
    const questionId = assessmentQuestions[currentQuestion].id as keyof AssessmentScores;
    
    // Input sanitization
    const sanitizedValue = sanitizeNumber(value);
    
    logUserAction('Assessment Answer', {
      questionId,
      value: sanitizedValue,
      questionNumber: currentQuestion + 1
    });
    
    // Yeni cevapları hemen bir değişkende tut
    const updatedAnswers = {
      ...answers,
      [questionId]: sanitizedValue
    };
    setAnswers(updatedAnswers);
    setInteractedQuestions(prev => {
      const next = new Set(prev);
      next.add(String(questionId));
      return next;
    });
    
    setTimeout(() => {
      if (currentQuestion < assessmentQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        // Son soru cevaplandı, programı hazırla
        logInfo('Son soru cevaplandı, program hazırlanıyor...');
        handleSubmit(updatedAnswers);
      }
      // Cevap işlemi tamamlandıktan sonra tekrar tıklamaya izin ver
      setIsAnswering(false);
    }, 500);
  };

  const handlePrevious = () => {
    // Çift tıklamayı önle
    if (isAnswering) {
      logDebug('Geri butonu çift tıklama engellendi');
      return;
    }
    
    triggerHapticFeedback(HapticType.LIGHT);
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // handleSubmit fonksiyonunu parametreli hale getir
  const handleSubmit = async (submitAnswers?: AssessmentScores) => {
    const finalAnswers = submitAnswers || answers;
    logInfo('Program hazırlanıyor, tüm cevaplar alındı');
    
    // Önce eksik soruları kontrol et
    const unansweredQuestions = assessmentQuestions.filter(question => {
      const answer = finalAnswers[question.id as keyof AssessmentScores];
      const questionId = question.id as keyof AssessmentScores;
      
      // Hastalık sorularında 0 (Hayır) geçerli bir cevap
      const healthQuestions = ['heart_condition', 'asthma_bronchitis', 'pregnancy', 'high_blood_pressure', 'diabetes', 'physical_limitations'];
      
      if (healthQuestions.includes(questionId)) {
        // Hastalık sorularında 0 veya 1 geçerli
        return answer === undefined || answer === null || (answer !== 0 && answer !== 1);
      }
      
      // Diğer sorularda 0 geçersiz (kullanıcı seçim yapmalı)
      return answer === undefined || answer === null || answer <= 0;
    });
    
    if (unansweredQuestions.length > 0) {
      logWarn('Eksik sorular var', { count: unansweredQuestions.length });
      Alert.alert('Eksik Cevap', `Lütfen tüm soruları cevaplayın. ${unansweredQuestions.length} soru eksik.`);
      return;
    }
    
    // Tüm sorular cevaplandıktan sonra validation yap
    const validation = validateAssessmentScores(finalAnswers);
    if (!validation.isValid) {
      logError('Assessment validation failed', null, { errors: validation.errors });
      Alert.alert('Veri Hatası', 'Değerlendirme verilerinde hata bulundu. Lütfen tekrar deneyin.');
      return;
    }

    logInfo('Tüm sorular cevaplandı, program oluşturuluyor...');
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

      // Kişiselleştirilmiş program oluştur (döngü sayısı ile)
      const personalizedProgram = generatePersonalizedProgram(finalAnswers, userCycleCount);

      // Firestore'a kaydet - İlk gün başlatılsın
      await saveUserProgram(currentUser.uid, {
        assessmentScores: finalAnswers,
        program: personalizedProgram,
        currentDay: 1, // İlk günden başla
        completedDays: [], // İlk gün tamamlanmamış
        startDate: new Date().toISOString(),
        isActive: true,
      });

      // AsyncStorage'a da kaydet
      await saveAssessmentResults(finalAnswers, personalizedProgram);

      // Assessment logging (without sensitive data)
      const hasHealthConditions = Object.values(finalAnswers).some(value => 
        ['heart_condition', 'asthma_bronchitis', 'pregnancy', 'high_blood_pressure', 
         'diabetes', 'physical_limitations'].includes(value.toString())
      );
      
      logAssessment('Standard', assessmentQuestions.length, hasHealthConditions);

      Alert.alert(
        'Başarılı!',
        'Kişiselleştirilmiş programınız oluşturuldu.',
        [
          {
            text: 'Programımı Görüntüle',
            onPress: () => navigation.replace('PersonalizedProgram')
          }
        ]
      );
    } catch (error: any) {
      logError('Program kaydetme hatası', error, {
        questionCount: assessmentQuestions.length,
        hasAnswers: Object.keys(finalAnswers).length
      });
      Alert.alert('Hata', 'Program kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestionData = assessmentQuestions[currentQuestion];
  const currentAnswer = answers[currentQuestionData.id as keyof AssessmentScores];
  const isHealthQuestion = HEALTH_QUESTION_IDS.includes(currentQuestionData.id as keyof AssessmentScores);

  return (
    <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover" onLoad={() => setBackgroundLoaded(true)}>
      <ScrollView style={{ flex: 1, backgroundColor: 'transparent' }} contentContainerStyle={{ paddingHorizontal: 15, paddingTop: 90 }} showsVerticalScrollIndicator={false}>
                 <View style={styles.header}>
           <Text style={[standardTextStyles.mainTitle, { color: '#F5F5DC', marginBottom: 8, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Kişisel Değerlendirme</Text>
           <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', textAlign: 'center', marginBottom: 10, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
             Size en uygun nefes egzersizi programını oluşturmak için birkaç soru soracağız
           </Text>
         </View>

         <View style={styles.progressContainer}>
           <View style={styles.progressBar}>
             <View 
               style={[
                 styles.progressFill, 
                 { width: `${((currentQuestion + 1) / assessmentQuestions.length) * 100}%` }
               ]} 
             />
           </View>
           <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
             {currentQuestion + 1} / {assessmentQuestions.length}
           </Text>
         </View>

        <View style={styles.questionContainer}>
          <Text style={[standardTextStyles.cardTitle, { color: '#FFFFFF', marginBottom: 24, lineHeight: 28, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>{currentQuestionData.question}</Text>
          
          <View style={styles.optionsContainer}>
            {currentQuestionData.options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionCard,
                  (currentAnswer === option.value && (!isHealthQuestion || interactedQuestions.has(String(currentQuestionData.id)))) && styles.selectedOption,
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
                    (currentAnswer === option.value && (!isHealthQuestion || interactedQuestions.has(String(currentQuestionData.id)))) && styles.selectedOptionText
                  ]}>
                    {option.label}
                  </Text>
                  <View style={[
                    styles.radioButton,
                    (currentAnswer === option.value && (!isHealthQuestion || interactedQuestions.has(String(currentQuestionData.id)))) && styles.selectedRadio
                  ]}>
                    {(currentAnswer === option.value && (!isHealthQuestion || interactedQuestions.has(String(currentQuestionData.id)))) && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </View>
                <Text style={[
                  standardTextStyles.bodySmall,
                  { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
                  (currentAnswer === option.value && (!isHealthQuestion || interactedQuestions.has(String(currentQuestionData.id)))) && styles.selectedOptionText
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
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginTop: 16, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Programınız oluşturuluyor...</Text>
          </View>
        )}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 20,
  },
  title: {
    ...standardTextStyles.mainTitle,
    color: '#F5F5DC',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    ...standardTextStyles.bodyMedium,
    color: '#F5F5DC',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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
  progressText: {
    ...standardTextStyles.bodySmall,
    color: '#F5F5DC',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  questionContainer: {
    backgroundColor: 'rgba(245, 245, 220, 0.1)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#DDD',
    shadowColor: 'transparent',
  },
  questionText: {
    ...standardTextStyles.cardTitle,
    color: '#F5F5DC',
    marginBottom: 24,
    lineHeight: 28,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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
  disabledOption: {
    opacity: 0.5,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    ...standardTextStyles.bodyLarge,
    color: '#F5F5DC',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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
  optionDescription: {
    ...standardTextStyles.bodySmall,
    color: '#F5F5DC',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  navButton: {
    backgroundColor: 'rgba(245, 245, 220, 0.15)',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  navButtonText: {
    ...standardTextStyles.bodyMedium,
    color: '#F5F5DC',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    backgroundColor: '#DDD',
    borderColor: '#DDD',
  },
  primaryButtonText: {
    ...standardTextStyles.buttonLarge,
    color: '#F5F5DC',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    ...standardTextStyles.bodyMedium,
    color: '#F5F5DC',
    marginTop: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
}); 