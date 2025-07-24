import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { generatePersonalizedProgram, AssessmentScores } from '../utils/programGenerator';
import { getCurrentUser } from '../services/authService';
import { saveUserProgram } from '../services/firestoreService';
import { saveAssessmentResults } from '../utils/programStorage';
import { COLORS, FONTS } from '../constants/typography';
import { triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';

const { width, height } = Dimensions.get('window');

type AssessmentScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Assessment'>;

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
  }
];

export default function AssessmentScreen() {
  const navigation = useNavigation<AssessmentScreenNavigationProp>();
  const [currentQuestion, setCurrentQuestion] = useState(0);
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
    health_goals: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswer = (value: number) => {
    triggerHapticFeedback(HapticType.SELECTION);
    const questionId = assessmentQuestions[currentQuestion].id as keyof AssessmentScores;
    // Yeni cevapları hemen bir değişkende tut
    const updatedAnswers = {
      ...answers,
      [questionId]: value
    };
    setAnswers(updatedAnswers);
    
    setTimeout(() => {
      if (currentQuestion < assessmentQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        // handleSubmit'e güncel cevapları parametre olarak ilet
        handleSubmit(updatedAnswers);
      }
    }, 500);
  };

  const handleNext = () => {
    triggerHapticFeedback(HapticType.LIGHT);
    if (currentQuestion < assessmentQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    triggerHapticFeedback(HapticType.LIGHT);
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // handleSubmit fonksiyonunu parametreli hale getir
  const handleSubmit = async (submitAnswers?: AssessmentScores) => {
    const finalAnswers = submitAnswers || answers;
    // Tüm soruların cevaplanıp cevaplanmadığını kontrol et
    const unansweredQuestions = Object.values(finalAnswers).filter(value => value === 0);
    if (unansweredQuestions.length > 0) {
      Alert.alert('Eksik Cevap', 'Lütfen tüm soruları cevaplayın.');
      return;
    }

    triggerHapticFeedback(HapticType.MEDIUM);
    setIsSubmitting(true);

    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
        return;
      }

      // Kişiselleştirilmiş program oluştur
      const personalizedProgram = generatePersonalizedProgram(finalAnswers);

      // Firestore'a kaydet - İlk gün otomatik olarak tamamlanmış sayılsın
      await saveUserProgram(currentUser.uid, {
        assessmentScores: finalAnswers,
        program: personalizedProgram,
        currentDay: 2, // İkinci günden başla
        completedDays: [1], // İlk gün tamamlanmış
        startDate: new Date().toISOString(),
        isActive: true,
      });

      // AsyncStorage'a da kaydet
      await saveAssessmentResults(finalAnswers, personalizedProgram);

      Alert.alert(
        'Başarılı!',
        'Kişiselleştirilmiş programınız oluşturuldu.',
        [
          {
            text: 'Programımı Görüntüle',
            onPress: () => navigation.reset({
              index: 0,
              routes: [{ name: 'PersonalizedProgram' }],
            })
          }
        ]
      );
    } catch (error: any) {
      console.error('Program kaydetme hatası:', error);
      Alert.alert('Hata', 'Program kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestionData = assessmentQuestions[currentQuestion];
  const currentAnswer = answers[currentQuestionData.id as keyof AssessmentScores];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Kişisel Değerlendirme</Text>
        <Text style={styles.subtitle}>
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
        <Text style={styles.progressText}>
          {currentQuestion + 1} / {assessmentQuestions.length}
        </Text>
      </View>

      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{currentQuestionData.question}</Text>
        
        <View style={styles.optionsContainer}>
          {currentQuestionData.options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                currentAnswer === option.value && styles.selectedOption
              ]}
              onPress={() => handleAnswer(option.value)}
              activeOpacity={0.8}
            >
              <View style={styles.optionHeader}>
                <Text style={[
                  styles.optionLabel,
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
                styles.optionDescription,
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
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Programınız oluşturuluyor...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Tahoma',
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.gray[200],
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
  },
  questionContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  questionText: {
    fontSize: 22,
    fontFamily: 'Tahoma',
    color: COLORS.text,
    marginBottom: 24,
    lineHeight: 28,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    padding: 20,
    borderWidth: 3,
    borderColor: COLORS.gray[200],
    marginBottom: 8,
  },
  selectedOption: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 18,
    fontFamily: 'Tahoma',
    color: COLORS.text,
  },
  selectedOptionText: {
    fontFamily: 'Tahoma',
    color: COLORS.white,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRadio: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.white,
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  navButton: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  navButtonText: {
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.primary,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: COLORS.gray[300],
    borderColor: COLORS.gray[300],
  },
  primaryButtonText: {
    fontSize: 18,
    fontFamily: 'Tahoma',
    color: COLORS.white,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.textSecondary,
    marginTop: 16,
  },
}); 