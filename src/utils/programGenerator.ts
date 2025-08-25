export interface AssessmentScores {
  anxiety: number;
  breathing: number;
  sleep: number;
  focus: number;
  stress: number;
  energy: number;
  physical_activity: number;
  meditation_experience: number;
  work_life_balance: number;
  health_goals: number;
  // Fiziksel sağlık durumu
  heart_condition: number; // 0: Hayır, 1: Evet
  asthma_bronchitis: number; // 0: Hayır, 1: Evet
  pregnancy: number; // 0: Hayır, 1: Evet
  high_blood_pressure: number; // 0: Hayır, 1: Evet
  diabetes: number; // 0: Hayır, 1: Evet
  age_group: number; // 1: 18-30, 2: 31-50, 3: 50+
  physical_limitations: number; // 0: Hayır, 1: Evet
}

export interface PersonalizedProgram {
  day: number;
  title: string;
  description: string;
  techniques: string[];
  duration: string;
  focus: string;
  intensity: 'low' | 'medium' | 'high';
  benefits: string[];
  isLocked: boolean;
  session?: 'morning' | 'evening';
  timeOfDay?: 'morning' | 'evening';
  severity?: 'normal' | 'high';
}

// Tüm nefes teknikleri
const ALL_TECHNIQUES = [
  'diaphragmatic',
  '4-7-8',
  'box-breathing', 
  'nadi-shodhana',
  'kapalabhati',
  'anxiety-relief',
  'coherent_breathing',
  'alternate_nostril',
  'bhramari',
  'ujjayi',
  'sitali',
  'sitkari',
  'lion_breath',
  'victorious_breath',
  'three_part_breath',
  'equal_breathing',
  'pursed_lip_breathing',
  'deep_breathing',
  'mindful_breathing'
];

// Teknik kategorileri ve faydaları
const TECHNIQUE_CATEGORIES = {
  'diaphragmatic': { 
    category: 'breathing', 
    baseDuration: 5, 
    cycles: 3,
    benefits: ['breathing', 'anxiety', 'stress'],
    intensity: 'low'
  },
  '4-7-8': { 
    category: 'anxiety', 
    baseDuration: 5, 
    cycles: 3,
    benefits: ['anxiety', 'sleep', 'stress'],
    intensity: 'low'
  },
  'box-breathing': { 
    category: 'focus', 
    baseDuration: 4, 
    cycles: 4,
    benefits: ['focus', 'stress', 'anxiety'],
    intensity: 'medium'
  },
  'nadi-shodhana': { 
    category: 'focus', 
    baseDuration: 5, 
    cycles: 4,
    benefits: ['focus', 'energy', 'stress'],
    intensity: 'medium'
  },
  'kapalabhati': { 
    category: 'energy', 
    baseDuration: 3, 
    cycles: 3,
    benefits: ['energy', 'focus'],
    intensity: 'high'
  },
  'anxiety-relief': { 
    category: 'anxiety', 
    baseDuration: 5, 
    cycles: 3,
    benefits: ['anxiety', 'sleep', 'stress'],
    intensity: 'low'
  },
  'coherent_breathing': { 
    category: 'stress', 
    baseDuration: 6, 
    cycles: 5,
    benefits: ['stress', 'heart_health', 'balance'],
    intensity: 'low'
  },
  'alternate_nostril': { 
    category: 'focus', 
    baseDuration: 5, 
    cycles: 4,
    benefits: ['focus', 'energy_balance', 'stress'],
    intensity: 'medium'
  },
  'bhramari': { 
    category: 'sleep', 
    baseDuration: 4, 
    cycles: 3,
    benefits: ['sleep', 'anxiety', 'calmness'],
    intensity: 'low'
  },
  'ujjayi': { 
    category: 'breathing', 
    baseDuration: 5, 
    cycles: 4,
    benefits: ['breathing', 'focus', 'energy'],
    intensity: 'medium'
  },
  'sitali': { 
    category: 'cooling', 
    baseDuration: 4, 
    cycles: 3,
    benefits: ['cooling', 'stress', 'energy'],
    intensity: 'low'
  },
  'sitkari': { 
    category: 'cooling', 
    baseDuration: 4, 
    cycles: 3,
    benefits: ['cooling', 'anxiety', 'focus'],
    intensity: 'low'
  },
  
  'lion_breath': { 
    category: 'energy', 
    baseDuration: 3, 
    cycles: 2,
    benefits: ['energy', 'confidence', 'stress_relief'],
    intensity: 'medium'
  },
  'victorious_breath': { 
    category: 'breathing', 
    baseDuration: 5, 
    cycles: 4,
    benefits: ['breathing', 'focus', 'energy'],
    intensity: 'medium'
  },
  'three_part_breath': { 
    category: 'breathing', 
    baseDuration: 6, 
    cycles: 3,
    benefits: ['breathing', 'anxiety', 'stress'],
    intensity: 'low'
  },
  'equal_breathing': { 
    category: 'balance', 
    baseDuration: 4, 
    cycles: 4,
    benefits: ['balance', 'focus', 'stress'],
    intensity: 'low'
  },
  'pursed_lip_breathing': { 
    category: 'breathing', 
    baseDuration: 4, 
    cycles: 3,
    benefits: ['breathing', 'anxiety', 'energy'],
    intensity: 'low'
  },
  'deep_breathing': { 
    category: 'breathing', 
    baseDuration: 5, 
    cycles: 3,
    benefits: ['breathing', 'stress', 'anxiety'],
    intensity: 'low'
  },
  'mindful_breathing': { 
    category: 'meditation', 
    baseDuration: 5, 
    cycles: 4,
    benefits: ['meditation', 'focus', 'stress'],
    intensity: 'low'
  }
};

// Güvenlik kontrolleri ve teknik filtreleme
const SAFETY_RESTRICTIONS = {
  'kapalabhati': {
    forbidden: ['pregnancy', 'high_blood_pressure', 'heart_condition'],
    warning: 'Hamileler ve tansiyon problemi olanlar yapmamalı'
  },
  'nadi-shodhana': {
    forbidden: ['heart_condition'],
    warning: 'Kalp hastaları dikkatli olmalı'
  },
  'alternate_nostril': {
    forbidden: ['heart_condition'],
    warning: 'Kalp hastaları dikkatli olmalı'
  },
  'box-breathing': {
    forbidden: ['asthma_bronchitis'],
    warning: 'Solunum problemi olanlar dikkatli olmalı'
  },
  '4-7-8': {
    forbidden: ['asthma_bronchitis'],
    warning: 'Solunum problemi olanlar dikkatli olmalı'
  },
  'lion_breath': {
    forbidden: ['asthma_bronchitis'],
    warning: 'Solunum problemi olanlar dikkatli olmalı'
  },
  'victorious_breath': {
    forbidden: ['asthma_bronchitis'],
    warning: 'Solunum problemi olanlar dikkatli olmalı'
  }
};

// Yaş grubuna göre yoğunluk ayarlama
const AGE_INTENSITY_MODIFIERS = {
  1: 1.0, // 18-30 yaş: Normal yoğunluk
  2: 0.8, // 31-50 yaş: %20 azalt
  3: 0.6  // 50+ yaş: %40 azalt
};

// Fiziksel kısıtlama kontrolü
const checkSafetyRestrictions = (technique: string, scores: AssessmentScores): boolean => {
  const restrictions = SAFETY_RESTRICTIONS[technique as keyof typeof SAFETY_RESTRICTIONS];
  if (!restrictions) return true; // Kısıtlama yoksa güvenli

  // Yasaklı durumları kontrol et
  for (const condition of restrictions.forbidden) {
    if (scores[condition as keyof AssessmentScores] === 1) {
      return false; // Yasaklı durum varsa güvenli değil
    }
  }
  return true; // Güvenli
};

// Yaş grubuna göre yoğunluk ayarlama
const adjustIntensityForAge = (intensity: 'low' | 'medium' | 'high', ageGroup: number): 'low' | 'medium' | 'high' => {
  const modifier = AGE_INTENSITY_MODIFIERS[ageGroup as keyof typeof AGE_INTENSITY_MODIFIERS] || 1.0;
  
  if (modifier <= 0.6) {
    // 50+ yaş için tüm yoğunlukları düşür
    return 'low';
  } else if (modifier <= 0.8) {
    // 31-50 yaş için yüksek yoğunluğu orta yap
    if (intensity === 'high') return 'medium';
    return intensity;
  }
  return intensity;
};

// Fiziksel kısıtlama kontrolü
const hasPhysicalLimitations = (scores: AssessmentScores): boolean => {
  return scores.physical_limitations === 1 || 
         scores.heart_condition === 1 || 
         scores.asthma_bronchitis === 1 ||
         scores.pregnancy === 1;
};

export const generatePersonalizedProgram = (scores: AssessmentScores, userCycleCount?: number): PersonalizedProgram[] => {
  const program: PersonalizedProgram[] = [];
  
  // Ana sorunları belirle
  const primaryIssues = getPrimaryIssues(scores);
  const secondaryIssues = getSecondaryIssues(scores);
  
  // Program yoğunluğunu belirle
  let intensity = getIntensityLevel(scores);
  
  // Yaş grubuna göre yoğunluk ayarla
  intensity = adjustIntensityForAge(intensity, scores.age_group);
  
  // Fiziksel kısıtlama varsa yoğunluğu düşür
  if (hasPhysicalLimitations(scores)) {
    if (intensity === 'high') intensity = 'medium';
    if (intensity === 'medium') intensity = 'low';
  }
  
  // 5 günlük ücretsiz program oluştur
  for (let day = 1; day <= 5; day++) {
    const dayProgram = createDayProgram(day, primaryIssues, secondaryIssues, intensity, scores, userCycleCount);
    program.push(dayProgram);
  }
  
  return program;
};

// 15 günlük premium program oluştur
export const generatePremiumProgram = (scores: AssessmentScores, userCycleCount?: number): PersonalizedProgram[] => {
  const program: PersonalizedProgram[] = [];
  
  // Ana sorunları belirle
  const primaryIssues = getPrimaryIssues(scores);
  const secondaryIssues = getSecondaryIssues(scores);
  
  // Program yoğunluğunu belirle
  let intensity = getIntensityLevel(scores);
  
  // Yaş grubuna göre yoğunluk ayarla
  intensity = adjustIntensityForAge(intensity, scores.age_group);
  
  // Fiziksel kısıtlama varsa yoğunluğu düşür
  if (hasPhysicalLimitations(scores)) {
    if (intensity === 'high') intensity = 'medium';
    if (intensity === 'medium') intensity = 'low';
  }
  
  // 21 günlük premium program oluştur (sabah + akşam)
  for (let day = 1; day <= 21; day++) {
    const morningProgram = createPremiumDayProgram(day, primaryIssues, secondaryIssues, intensity, scores, userCycleCount, 'morning');
    const eveningProgram = createPremiumDayProgram(day, primaryIssues, secondaryIssues, intensity, scores, userCycleCount, 'evening');
    program.push(morningProgram);
    program.push(eveningProgram);
  }
  
  return program;
};

// Soru-cevap eşleştirme sistemi
const getPrimaryIssues = (scores: AssessmentScores): string[] => {
  const issues = [];
  
  // Anksiyete sorunu (yüksek anksiyete + düşük uyku + yüksek stres)
  if (scores.anxiety >= 4 || (scores.sleep >= 4 && scores.stress >= 3)) {
    issues.push('anxiety');
  }
  
  // Nefes sorunu (yüksek nefes problemi + düşük enerji)
  if (scores.breathing >= 4 || scores.energy <= 2) {
    issues.push('breathing');
  }
  
  // Uyku sorunu (yüksek uyku problemi + yüksek anksiyete)
  if (scores.sleep >= 4 || scores.anxiety >= 4) {
    issues.push('sleep');
  }
  
  // Odaklanma sorunu (yüksek odaklanma problemi + düşük enerji + yüksek stres)
  if (scores.focus >= 4 || (scores.energy <= 2 && scores.stress >= 3)) {
    issues.push('focus');
  }
  
  // Stres sorunu (yüksek stres + kötü iş-yaşam dengesi)
  if (scores.stress >= 4 || scores.work_life_balance >= 4) {
    issues.push('stress');
  }
  
  // Enerji sorunu (düşük enerji + düşük fiziksel aktivite)
  if (scores.energy <= 2 || scores.physical_activity >= 4) {
    issues.push('energy');
  }
  
  // İş-yaşam dengesi sorunu (kötü denge + yüksek stres)
  if (scores.work_life_balance >= 4 || scores.stress >= 4) {
    issues.push('work_life_balance');
  }
  
  // En yüksek 3 sorunu döndür
  return issues.slice(0, 3);
};

const getSecondaryIssues = (scores: AssessmentScores): string[] => {
  const issues = [];
  if (scores.anxiety >= 3 && scores.anxiety < 4) issues.push('anxiety');
  if (scores.breathing >= 3 && scores.breathing < 4) issues.push('breathing');
  if (scores.sleep >= 3 && scores.sleep < 4) issues.push('sleep');
  if (scores.focus >= 3 && scores.focus < 4) issues.push('focus');
  if (scores.stress >= 3 && scores.stress < 4) issues.push('stress');
  if (scores.energy >= 3 && scores.energy < 4) issues.push('energy');
  if (scores.work_life_balance >= 3 && scores.work_life_balance < 4) issues.push('work_life_balance');
  
  return issues.slice(0, 2);
};

const getIntensityLevel = (scores: AssessmentScores): 'low' | 'medium' | 'high' => {
  // Temel sorunların ortalaması
  const basicIssues = (scores.anxiety + scores.breathing + scores.sleep + scores.focus + scores.stress) / 5;
  
  // Deneyim seviyesi (tersine çevrilmiş - düşük deneyim = yüksek yoğunluk)
  const experienceLevel = 6 - scores.meditation_experience;
  
  // Fiziksel aktivite (düşük aktivite = yüksek yoğunluk)
  const activityLevel = 6 - scores.physical_activity;
  
  const averageScore = (basicIssues + experienceLevel + activityLevel) / 3;
  
  if (averageScore >= 4) return 'high';
  if (averageScore >= 2.5) return 'medium';
  return 'low';
};

const createDayProgram = (
  day: number,
  primaryIssues: string[],
  secondaryIssues: string[],
  intensity: 'low' | 'medium' | 'high',
  scores: AssessmentScores,
  userCycleCount?: number
): PersonalizedProgram => {
  
  // Gün için sorun stratejisi
  const selectedIssues = getDayStrategy(day, primaryIssues, scores);
  
  // Gün için teknik seçimi
  const techniques = selectTechniquesForDay(day, primaryIssues, secondaryIssues, scores);
  
  // Günlük yoğunluk seviyesi
  const dayIntensity = getDayIntensity(day, intensity, scores);
  
  // Süre bilgisini döngü sayısına bağlamadan göster
  const duration = `Nefes Egzersizi`;
  
  // Başlık ve açıklama
  const title = generateTitle(day, selectedIssues);
  const description = generateDescription(day, selectedIssues);
  
  // Odak alanı
  const focus = getFocus(day, primaryIssues, selectedIssues);
  
  // Faydalar
  const benefits = getBenefits(selectedIssues);
  
  return {
    day,
    title,
    description,
    techniques,
    duration,
    focus,
    intensity: dayIntensity,
    benefits,
    isLocked: day > 1, // İlk gün hariç hepsi kilitli
  };
};

const selectTechniquesForDay = (
  day: number, 
  primaryIssues: string[], 
  secondaryIssues: string[],
  scores: AssessmentScores
): string[] => {
  const experienceLevel = scores.meditation_experience;
  
  // Her gün için sadece 1 teknik seç
  const dayStrategy = getDayStrategy(day, primaryIssues, scores);
  
  // Gün için uygun teknikleri bul
  const suitableTechniques: string[] = [];
  dayStrategy.forEach(issue => {
    const techniques = getTechniquesForIssue(issue, experienceLevel, day, scores);
    suitableTechniques.push(...techniques);
  });
  
  // Eğer uygun teknik bulunamadıysa, varsayılan teknikler
  if (suitableTechniques.length === 0) {
    const defaultTechniques = experienceLevel <= 2 ? ['diaphragmatic', '4-7-8', 'box-breathing'] : ['box-breathing', 'nadi-shodhana', 'coherent_breathing'];
    suitableTechniques.push(...defaultTechniques);
  }
  
  // Teknikleri karıştır ve her gün için farklı teknik seç
  const shuffledTechniques = [...suitableTechniques].sort(() => Math.random() - 0.5);
  
  // Her gün için farklı teknik seç (5 gün için 5 farklı teknik)
  const dayIndex = (day - 1) % shuffledTechniques.length;
  const selectedTechnique = shuffledTechniques[dayIndex];
  
  return [selectedTechnique]; // Sadece 1 teknik döndür
};

// Günlere göre sorun dağıtım stratejisi
const getDayStrategy = (day: number, primaryIssues: string[], scores: AssessmentScores): string[] => {
  const strategy = [];
  
  // Her gün için sadece 1 sorun odaklan
  const availableIssues = [...primaryIssues];
  
  // 5 günlük program stratejisi - her gün 1 farklı sorun
  if (availableIssues.length > 0) {
    const dayIndex = (day - 1) % availableIssues.length;
    strategy.push(availableIssues[dayIndex]);
  }
  
  return strategy;
};

// Soruna göre uygun teknikleri seç
const getTechniquesForIssue = (issue: string, experienceLevel: number, day: number, scores: AssessmentScores): string[] => {
  const suitableTechniques: string[] = [];
  
  // Premium program için tüm teknikleri dahil et (sadece güvenlik kontrolü)
  Object.entries(TECHNIQUE_CATEGORIES).forEach(([technique, info]) => {
    // Güvenlik kontrolü yap
    if (!checkSafetyRestrictions(technique, scores)) {
      return; // Bu teknik güvenli değil, atla
    }
    
    // Premium programda tüm teknikleri kullan (sadece güvenlik kontrolü)
    // Normal programda ise sadece ilgili sorun için olan teknikleri kullan
    if (info.benefits.includes(issue)) {
      // Deneyim seviyesine göre filtrele (sadece normal program için)
      if (experienceLevel <= 2 && info.intensity === 'low') {
        suitableTechniques.push(technique);
      } else if (experienceLevel >= 3 && experienceLevel <= 4 && info.intensity !== 'high') {
        suitableTechniques.push(technique);
      } else if (experienceLevel >= 5) {
        suitableTechniques.push(technique);
      }
    }
  });
  
  return suitableTechniques;
};

// Duration hesaplama kaldırıldı - sabit değer kullanılıyor

// Günlük yoğunluk seviyesi belirleme
const getDayIntensity = (day: number, baseIntensity: 'low' | 'medium' | 'high', scores: AssessmentScores): 'low' | 'medium' | 'high' => {
  // 5 günlük programa göre yoğunluk artışı
  if (day <= 2) {
    return 'low'; // İlk 2 gün düşük yoğunluk
  } else if (day <= 4) {
    return 'medium'; // 3-4. günler orta yoğunluk
  } else {
    return 'high'; // 5. gün yüksek yoğunluk
  }
};

// Gün ilerledikçe yoğunluk artışı
const getIntensityMultiplier = (day: number, baseIntensity: string): number => {
  let multiplier = 1;
  
  // 5 günlük program için yoğunluk artışı
  if (day <= 3) {
    multiplier = 1.0; // İlk 3 gün: Normal yoğunluk
  } else {
    multiplier = 1.2; // Son 2 gün: %20 artış
  }
  
  // Tekniğin temel yoğunluğuna göre ayarla
  if (baseIntensity === 'low') {
    multiplier *= 0.8; // Düşük yoğunluk teknikleri daha yavaş artar
  } else if (baseIntensity === 'high') {
    multiplier *= 1.2; // Yüksek yoğunluk teknikleri daha hızlı artar
  }
  
  return multiplier;
};

const generateTitle = (day: number, selectedIssues: string[]): string => {
  const week = Math.ceil(day / 5); // 5 günlük haftalar
  const issue = selectedIssues[0];
  
  const titles = {
    anxiety: [
      'Sakinlik Temelleri', 'Anksiyete Yönetimi', 'İç Huzur', 'Panik Kontrolü',
      'Sakinlik Mastery', 'Anksiyete Dönüşümü', 'İç Denge', 'Huzur Ustalaşması'
    ],
    breathing: [
      'Nefes Farkındalığı', 'Nefes Kontrolü', 'Nefes Ustalaşması', 'Nefes Ritmi',
      'Diyafram Nefesi', 'Tam Nefes', 'Nefes Mastery', 'Solunum Optimizasyonu'
    ],
    sleep: [
      'Uyku Hazırlığı', 'Derin Rahatlama', 'Uyku Optimizasyonu', 'Uyku Düzeni',
      'Uyku Mastery', 'Uyku Hijyeni', 'Derin Uyku', 'Uyku Kalitesi'
    ],
    focus: [
      'Odaklanma Temelleri', 'Konsantrasyon Güçlendirme', 'Zihinsel Netlik', 'Dikkat Kontrolü',
      'Odaklanma Mastery', 'Bilişsel Performans', 'Zihinsel Keskinlik', 'Konsantrasyon Ustalaşması'
    ],
    stress: [
      'Stres Yönetimi', 'Stres Dönüşümü', 'Stres Mastery', 'Gevşeme',
      'Stres Azaltma', 'Stres Kontrolü', 'Rahatlama Mastery', 'Stres Dönüşümü'
    ],
    energy: [
      'Enerji Artırma', 'Vitalite', 'Canlılık', 'Dinamizm',
      'Enerji Mastery', 'Vitalite Artırma', 'Canlılık Optimizasyonu', 'Dinamizm Ustalaşması'
    ],
    work_life_balance: [
      'Denge', 'Harmoni', 'Yaşam Kalitesi', 'İç Denge',
      'Denge Mastery', 'Harmoni Ustalaşması', 'Yaşam Optimizasyonu', 'İç Denge Mastery'
    ],
    meditation: [
      'Meditasyon Temelleri', 'Farkındalık', 'Mindfulness', 'İç Görü',
      'Meditasyon Mastery', 'Derin Farkındalık', 'Mindfulness Ustalaşması', 'İç Görü Mastery'
    ],
    heart_health: [
      'Kalp Sağlığı', 'Kardiyovasküler Fitness', 'Kalp Optimizasyonu', 'Kalp Mastery',
      'Kalp Sağlığı Artırma', 'Kardiyovasküler Performans', 'Kalp Ustalaşması', 'Kalp Optimizasyonu'
    ],
    balance: [
      'Denge Temelleri', 'İç Denge', 'Harmoni', 'Denge Mastery',
      'Denge Ustalaşması', 'İç Harmoni', 'Denge Optimizasyonu', 'Harmoni Mastery'
    ],
    cooling: [
      'Soğutma Teknikleri', 'Serinlik', 'Soğutma Mastery', 'Serinlik Ustalaşması',
      'Soğutma Optimizasyonu', 'Serinlik Mastery', 'Soğutma Ustalaşması', 'Serinlik Optimizasyonu'
    ]
  };
  
  const issueTitles = titles[issue as keyof typeof titles] || [
    'Temel Egzersiz', 'Gelişmiş Egzersiz', 'Uzman Egzersiz', 'Mastery',
    'Temel Ustalaşma', 'Gelişmiş Mastery', 'Uzman Optimizasyonu', 'Mastery Ustalaşması'
  ];
  const titleIndex = (day - 1) % issueTitles.length;
  return `${issueTitles[titleIndex]} - Gün ${day}`;
};

const generateDescription = (day: number, selectedIssues: string[]): string => {
  const week = Math.ceil(day / 5); // 5 günlük haftalar
  const issue = selectedIssues[0];
  
  const descriptions = {
    anxiety: [
      'Anksiyete belirtilerini azaltmak için temel nefes teknikleri',
      'Gelişmiş anksiyete yönetimi ve sakinleştirici teknikler',
      'Anksiyete kontrolünde uzmanlaşma ve kalıcı sakinlik',
      'Panik atakları önlemek için gelişmiş teknikler',
      'Anksiyete mastery ve kalıcı iç huzur',
      'Anksiyete dönüşümü ve sakinlik ustalaşması',
      'İç dengeyi sağlama ve anksiyete kontrolü',
      'Huzur ustalaşması ve anksiyete mastery'
    ],
    breathing: [
      'Nefes farkındalığı ve temel nefes kontrolü',
      'Gelişmiş nefes teknikleri ve akciğer kapasitesi',
      'Nefes ustalaşması ve optimal nefes düzeni',
      'Nefes ritmi ve solunum sistemini güçlendirme',
      'Diyafram nefesi ve tam nefes teknikleri',
      'Nefes mastery ve solunum optimizasyonu',
      'Solunum sistemi güçlendirme ve nefes kontrolü',
      'Nefes ustalaşması ve solunum optimizasyonu'
    ],
    sleep: [
      'Uyku kalitesini artırmak için sakinleştirici teknikler',
      'Derin uyku için gelişmiş rahatlama yöntemleri',
      'Uyku optimizasyonu ve kalıcı uyku düzeni',
      'Uyku hijyeni ve uyku düzenini iyileştirme',
      'Uyku mastery ve derin uyku teknikleri',
      'Uyku hijyeni ve uyku kalitesi artırma',
      'Derin uyku ve uyku optimizasyonu',
      'Uyku kalitesi ve uyku mastery'
    ],
    focus: [
      'Odaklanma ve konsantrasyon için temel teknikler',
      'Gelişmiş odaklanma ve zihinsel netlik',
      'Maksimum odaklanma ve zihinsel performans',
      'Dikkat kontrolü ve bilişsel performans artırma',
      'Odaklanma mastery ve bilişsel performans',
      'Zihinsel keskinlik ve konsantrasyon ustalaşması',
      'Bilişsel performans ve odaklanma mastery',
      'Konsantrasyon ustalaşması ve zihinsel keskinlik'
    ],
    stress: [
      'Günlük stres yönetimi için temel teknikler',
      'Stres dönüşümü ve stres toleransı artırma',
      'Stres mastery ve kalıcı stres kontrolü',
      'Gevşeme ve stres hormonlarını dengeleme',
      'Stres azaltma ve rahatlama teknikleri',
      'Stres kontrolü ve rahatlama mastery',
      'Rahatlama mastery ve stres dönüşümü',
      'Stres dönüşümü ve rahatlama ustalaşması'
    ],
    energy: [
      'Enerji seviyesini artırmak için temel teknikler',
      'Vitalite ve canlılık artırma',
      'Yorgunluğu azaltma ve dinamizm',
      'Fiziksel performansı artırma',
      'Enerji mastery ve vitalite artırma',
      'Canlılık optimizasyonu ve dinamizm ustalaşması',
      'Vitalite artırma ve enerji mastery',
      'Dinamizm ustalaşması ve canlılık optimizasyonu'
    ],
    work_life_balance: [
      'İş-yaşam dengesini iyileştirmek için temel teknikler',
      'Yaşam kalitesini artırma ve harmoni',
      'İç dengeyi sağlama ve stres yönetimi',
      'Harmoni duygusunu artırma',
      'Denge mastery ve harmoni ustalaşması',
      'Yaşam optimizasyonu ve iç denge mastery',
      'Harmoni ustalaşması ve denge mastery',
      'İç denge mastery ve yaşam optimizasyonu'
    ],
    meditation: [
      'Meditasyon temelleri ve farkındalık teknikleri',
      'Mindfulness ve iç görü geliştirme',
      'Derin meditasyon ve farkındalık mastery',
      'İç görü ve meditasyon ustalaşması',
      'Meditasyon mastery ve derin farkındalık',
      'Mindfulness ustalaşması ve iç görü mastery',
      'Derin farkındalık ve meditasyon mastery',
      'İç görü mastery ve mindfulness ustalaşması'
    ],
    heart_health: [
      'Kalp sağlığı için nefes teknikleri',
      'Kardiyovasküler fitness ve kalp optimizasyonu',
      'Kalp mastery ve kardiyovasküler performans',
      'Kalp sağlığı artırma ve kalp ustalaşması',
      'Kardiyovasküler performans ve kalp optimizasyonu',
      'Kalp ustalaşması ve kalp sağlığı artırma',
      'Kalp optimizasyonu ve kardiyovasküler performans',
      'Kalp mastery ve kalp sağlığı optimizasyonu'
    ],
    balance: [
      'Denge temelleri ve iç denge teknikleri',
      'Harmoni ve denge mastery',
      'İç denge ve harmoni ustalaşması',
      'Denge optimizasyonu ve harmoni mastery',
      'Denge ustalaşması ve iç harmoni',
      'Harmoni mastery ve denge optimizasyonu',
      'İç harmoni ve denge ustalaşması',
      'Harmoni optimizasyonu ve denge mastery'
    ],
    cooling: [
      'Soğutma teknikleri ve serinlik sağlama',
      'Soğutma mastery ve serinlik ustalaşması',
      'Soğutma optimizasyonu ve serinlik mastery',
      'Serinlik ustalaşması ve soğutma optimizasyonu',
      'Soğutma mastery ve serinlik optimizasyonu',
      'Serinlik mastery ve soğutma ustalaşması',
      'Soğutma ustalaşması ve serinlik mastery',
      'Serinlik optimizasyonu ve soğutma mastery'
    ]
  };
  
  const issueDescriptions = descriptions[issue as keyof typeof descriptions] || [
    'Temel nefes egzersizi ve farkındalık',
    'Gelişmiş nefes teknikleri',
    'Uzman seviye nefes kontrolü',
    'Mastery seviye teknikler',
    'Temel ustalaşma ve gelişmiş mastery',
    'Uzman optimizasyonu ve mastery ustalaşması',
    'Gelişmiş mastery ve temel ustalaşma',
    'Mastery ustalaşması ve uzman optimizasyonu'
  ];
  
  const descIndex = (day - 1) % issueDescriptions.length;
  return issueDescriptions[descIndex];
};

const getFocus = (day: number, primaryIssues: string[], selectedIssues: string[]): string => {
  // Günlere göre farklı odak alanları
  const focusAreas = {
    anxiety: ['Anksiyete Yönetimi', 'Sakinlik', 'İç Huzur', 'Panik Kontrolü'],
    breathing: ['Nefes Kontrolü', 'Nefes Farkındalığı', 'Akciğer Kapasitesi', 'Nefes Ritmi'],
    sleep: ['Uyku Kalitesi', 'Uyku Hazırlığı', 'Derin Rahatlama', 'Uyku Optimizasyonu'],
    focus: ['Odaklanma', 'Konsantrasyon', 'Zihinsel Netlik', 'Dikkat Kontrolü'],
    stress: ['Stres Azaltma', 'Stres Yönetimi', 'Gevşeme', 'Stres Dönüşümü'],
    energy: ['Enerji Artırma', 'Vitalite', 'Canlılık', 'Dinamizm'],
    work_life_balance: ['Denge', 'Harmoni', 'Yaşam Kalitesi', 'İç Denge']
  };
  
  // Seçilen sorunlara göre odak alanı belirle
  const selectedIssue = selectedIssues[0] || primaryIssues[0];
  const availableFocuses = focusAreas[selectedIssue as keyof typeof focusAreas] || ['Genel Sakinlik'];
  
  // Günlere göre farklı odak alanları seç
  const focusIndex = (day - 1) % availableFocuses.length;
  return availableFocuses[focusIndex];
};

const getBenefits = (selectedIssues: string[]): string[] => {
  const allBenefits = {
    anxiety: [
      'Anksiyete belirtilerini azaltır',
      'Sakinleştirici etki sağlar',
      'Panik atakları önler',
      'İç huzuru artırır',
      'Güven duygusunu güçlendirir'
    ],
    breathing: [
      'Nefes kontrolünü artırır',
      'Akciğer kapasitesini artırır',
      'Oksijenasyonu iyileştirir',
      'Nefes farkındalığını geliştirir',
      'Solunum sistemini güçlendirir'
    ],
    sleep: [
      'Uyku kalitesini artırır',
      'Uykuya dalma süresini kısaltır',
      'Derin uykuyu artırır',
      'Uyku düzenini iyileştirir',
      'Uyku hijyenini destekler'
    ],
    focus: [
      'Odaklanmayı artırır',
      'Konsantrasyonu güçlendirir',
      'Zihinsel netliği artırır',
      'Dikkat süresini uzatır',
      'Bilişsel performansı artırır'
    ],
    stress: [
      'Stres seviyesini azaltır',
      'Stres toleransını artırır',
      'Gevşeme sağlar',
      'Stres hormonlarını dengeler',
      'Stres yönetim becerilerini geliştirir'
    ],
    energy: [
      'Enerji seviyesini artırır',
      'Vitaliteyi artırır',
      'Yorgunluğu azaltır',
      'Canlılığı artırır',
      'Fiziksel performansı artırır'
    ],
    work_life_balance: [
      'İş-yaşam dengesini iyileştirir',
      'Yaşam kalitesini artırır',
      'İç dengeyi sağlar',
      'Harmoni duygusunu artırır',
      'Stres yönetimini kolaylaştırır'
    ]
  };
  
  // Seçilen sorunlara göre faydaları seç
  const selectedIssue = selectedIssues[0];
  const availableBenefits = allBenefits[selectedIssue as keyof typeof allBenefits] || [
    'Genel sakinlik sağlar',
    'Stresi azaltır',
    'Odaklanmayı artırır'
  ];
  
  // Rastgele 3 fayda seç
  const shuffledBenefits = [...availableBenefits].sort(() => Math.random() - 0.5);
  return shuffledBenefits.slice(0, 3);
};

export const getTechniqueRecommendations = (scores: AssessmentScores): string[] => {
  const recommendations = [];
  
  if (scores.anxiety >= 50) {
    recommendations.push('4-7-8 Tekniği', 'Anksiyete Rahatlatma', 'Bhramari');
  }
  
  if (scores.breathing >= 50) {
    recommendations.push('Uyumlu Nefes', '4-7-8 Tekniği', 'Kutu Nefesi');
  }
  
  if (scores.sleep >= 50) {
    recommendations.push('4-7-8 Tekniği', 'Bhramari', 'Uyumlu Nefes');
  }
  
  if (scores.focus >= 50) {
    recommendations.push('Kutu Nefesi', 'Alternatif Burun Nefesi', 'Kapalabhati');
  }
  
  if (scores.stress >= 50) {
    recommendations.push('4-7-8 Tekniği', 'Kutu Nefesi', 'Uyumlu Nefes');
  }
  
  return recommendations;
}; 

// Premium gün programı oluştur
const createPremiumDayProgram = (
  day: number,
  primaryIssues: string[],
  secondaryIssues: string[],
  intensity: 'low' | 'medium' | 'high',
  scores: AssessmentScores,
  userCycleCount?: number,
  session: 'morning' | 'evening' = 'morning'
): PersonalizedProgram => {
  
  // Gün için sorun stratejisi
  const selectedIssues = getPremiumDayStrategy(day, primaryIssues, scores);
  
  // Gün için teknik seçimi
  const techniques = selectPremiumTechniquesForDay(day, primaryIssues, secondaryIssues, scores);
  
  // Günlük yoğunluk seviyesi
  const dayIntensity = getPremiumDayIntensity(day, intensity, scores);
  
  // Süre bilgisini döngü sayısına bağlamadan göster
  const duration = `Premium Nefes Egzersizi`;
  
  // Başlık ve açıklama
  const title = generatePremiumTitle(day, selectedIssues);
  const description = generatePremiumDescription(day, selectedIssues);
  
  // Odak alanı
  const focus = getPremiumFocus(day, primaryIssues, selectedIssues);
  
  // Faydalar
  const benefits = getPremiumBenefits(selectedIssues);
  
  return {
    day,
    title,
    description,
    techniques,
    duration,
    focus,
    intensity: dayIntensity,
    benefits,
    session,
    timeOfDay: session,
    isLocked: day > 1, // İlk gün hariç hepsi kilitli
  };
};

// Premium günlere göre sorun dağıtım stratejisi - KARIŞIK DAĞITIM
const getPremiumDayStrategy = (day: number, primaryIssues: string[], scores: AssessmentScores): string[] => {
  const strategy: string[] = [];
  
  // Tüm olası sorunları tanımla (sadece kullanıcının ana sorunu değil)
  const allPossibleIssues = [
    'anxiety', 'breathing', 'sleep', 'focus', 'stress', 'energy', 
    'work_life_balance', 'meditation', 'heart_health', 'balance', 'cooling'
  ];
  
  // Kullanıcının ana sorunlarını da dahil et ama sadece onlara odaklanma
  const userIssues = [...primaryIssues];
  const otherIssues = allPossibleIssues.filter(issue => !userIssues.includes(issue));
  
  // 21 günlük premium program stratejisi - KARIŞIK DAĞITIM
  if (day <= 3) {
    // İlk 3 gün: Kullanıcının ana sorunları + 1 farklı sorun
    strategy.push(userIssues[0]);
    if (otherIssues.length > 0) {
      const randomOther = otherIssues[Math.floor(Math.random() * otherIssues.length)];
      strategy.push(randomOther);
    }
  } else if (day <= 7) {
    // 4-7. günler: Ana sorun + 2 farklı sorun
    strategy.push(userIssues[0]);
    const shuffledOthers = [...otherIssues].sort(() => Math.random() - 0.5);
    strategy.push(shuffledOthers[0]);
    if (shuffledOthers[1]) {
      strategy.push(shuffledOthers[1]);
    }
  } else if (day <= 14) {
    // 8-14. günler: Tamamen karışık - ana sorun %30, diğer sorunlar %70
    const random = Math.random();
    if (random < 0.3 && userIssues.length > 0) {
      strategy.push(userIssues[0]);
    }
    
    const shuffledAll = [...allPossibleIssues].sort(() => Math.random() - 0.5);
    const selectedIssues = shuffledAll.slice(0, 2);
    selectedIssues.forEach(issue => {
      if (!strategy.includes(issue)) {
        strategy.push(issue);
      }
    });
  } else {
    // 15-21. günler: Tamamen rastgele karışık
    const shuffledAll = [...allPossibleIssues].sort(() => Math.random() - 0.5);
    const selectedIssues = shuffledAll.slice(0, 2);
    strategy.push(...selectedIssues);
  }
  
  // Eğer strateji boşsa, varsayılan sorunlar ekle
  if (strategy.length === 0) {
    strategy.push('breathing', 'stress');
  }
  
  return strategy;
};

// Premium teknik seçimi
const selectPremiumTechniquesForDay = (
  day: number, 
  primaryIssues: string[], 
  secondaryIssues: string[],
  scores: AssessmentScores
): string[] => {
  const techniques: string[] = [];
  const experienceLevel = scores.meditation_experience;
  
  // Premium program için daha gelişmiş teknik seçimi
  const dayStrategy = getPremiumDayStrategy(day, primaryIssues, scores);
  
  // Her sorun için uygun teknikleri bul
  dayStrategy.forEach(issue => {
    const suitableTechniques = getTechniquesForIssue(issue, experienceLevel, day, scores);
    if (suitableTechniques.length > 0) {
      // Rastgele teknik seç ama tekrar etmesin
      const availableTechniques = suitableTechniques.filter(tech => !techniques.includes(tech));
      if (availableTechniques.length > 0) {
        const selectedTechnique = availableTechniques[Math.floor(Math.random() * availableTechniques.length)];
        techniques.push(selectedTechnique);
      } else {
        // Eğer tüm teknikler kullanılmışsa, yeni teknikler ekle
        const allTechniques = Object.keys(TECHNIQUE_CATEGORIES);
        const unusedTechniques = allTechniques.filter(tech => !techniques.includes(tech));
        if (unusedTechniques.length > 0) {
          const randomTechnique = unusedTechniques[Math.floor(Math.random() * unusedTechniques.length)];
          if (checkSafetyRestrictions(randomTechnique, scores)) {
            techniques.push(randomTechnique);
          }
        }
      }
    }
  });
  
  // Premium programda TÜM teknikleri kullan - Eğer yeterli teknik seçilmemişse
  if (techniques.length < 2) {
    const allTechniques = Object.keys(TECHNIQUE_CATEGORIES);
    const unusedSafeTechniques = allTechniques.filter(tech => 
      !techniques.includes(tech) && checkSafetyRestrictions(tech, scores)
    );
    
    const neededCount = 2 - techniques.length;
    for (let i = 0; i < neededCount && unusedSafeTechniques.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * unusedSafeTechniques.length);
      const selectedTechnique = unusedSafeTechniques.splice(randomIndex, 1)[0];
      techniques.push(selectedTechnique);
    }
  }
  
  // Eğer hiç teknik seçilmemişse, tüm güvenli tekniklerden rastgele seç
  if (techniques.length === 0) {
    const allSafeTechniques = ['diaphragmatic', '4-7-8', 'coherent_breathing', 'mindful_breathing', 'ujjayi', 'lion_breath', 'sitkari', 'pursed_lip_breathing', 'anxiety-relief', 'sitali', 'equal_breathing', 'deep_breathing'];
    const availableSafe = allSafeTechniques.filter(tech => checkSafetyRestrictions(tech, scores));
    if (availableSafe.length > 0) {
      techniques.push(availableSafe[Math.floor(Math.random() * availableSafe.length)]);
    } else {
      techniques.push('diaphragmatic'); // En güvenli teknik
    }
  }
  
  return techniques;
};

// Premium günlük yoğunluk seviyesi
const getPremiumDayIntensity = (day: number, baseIntensity: 'low' | 'medium' | 'high', scores: AssessmentScores): 'low' | 'medium' | 'high' => {
  if (day <= 3) {
    return 'low';
  } else if (day <= 8) {
    return 'medium';
  } else if (day <= 12) {
    return 'high';
  } else {
    return 'high'; // Son 3 gün maksimum yoğunluk
  }
};

// Premium süre hesaplama
// Premium duration hesaplama kaldırıldı - sabit değer kullanılıyor

// Premium yoğunluk çarpanı
const getPremiumIntensityMultiplier = (day: number, baseIntensity: string): number => {
  let multiplier = 1;
  
  if (day <= 5) {
    multiplier = 1.0;
  } else if (day <= 10) {
    multiplier = 1.3;
  } else {
    multiplier = 1.5; // Premium program için daha yüksek yoğunluk
  }
  
  if (baseIntensity === 'low') {
    multiplier *= 0.9;
  } else if (baseIntensity === 'high') {
    multiplier *= 1.3;
  }
  
  return multiplier;
};

// Premium başlık oluşturma
const generatePremiumTitle = (day: number, selectedIssues: string[]): string => {
  const issue = selectedIssues[0];
  
  const premiumTitles = {
    anxiety: ['Premium Sakinlik', 'Anksiyete Mastery', 'İç Huzur Pro', 'Panik Kontrolü Elite'],
    breathing: ['Premium Nefes', 'Nefes Mastery', 'Nefes Pro', 'Nefes Elite'],
    sleep: ['Premium Uyku', 'Uyku Mastery', 'Uyku Pro', 'Uyku Elite'],
    focus: ['Premium Odaklanma', 'Odaklanma Mastery', 'Odaklanma Pro', 'Odaklanma Elite'],
    stress: ['Premium Stres Yönetimi', 'Stres Mastery', 'Stres Pro', 'Stres Elite'],
    energy: ['Premium Enerji', 'Enerji Mastery', 'Enerji Pro', 'Enerji Elite'],
    work_life_balance: ['Premium Denge', 'Denge Mastery', 'Denge Pro', 'Denge Elite']
  };
  
  const issueTitles = premiumTitles[issue as keyof typeof premiumTitles] || ['Premium Egzersiz', 'Mastery Egzersiz', 'Pro Egzersiz', 'Elite Egzersiz'];
  const titleIndex = Math.floor((day - 1) / 4) % issueTitles.length;
  return `${issueTitles[titleIndex]} - Gün ${day}`;
};

// Premium açıklama oluşturma
const generatePremiumDescription = (day: number, selectedIssues: string[]): string => {
  const issue = selectedIssues[0];
  
  const premiumDescriptions = {
    anxiety: [
      'Premium anksiyete yönetimi teknikleri ve gelişmiş sakinleştirici yöntemler',
      'Anksiyete kontrolünde uzmanlaşma ve kalıcı sakinlik sağlayan premium teknikler',
      'Panik atakları önlemek için gelişmiş premium teknikler ve sakinlik mastery',
      'Elite seviye anksiyete yönetimi ve iç huzur sağlayan premium program'
    ],
    breathing: [
      'Premium nefes teknikleri ve gelişmiş nefes kontrolü yöntemleri',
      'Nefes ustalaşması ve optimal nefes düzeni için premium teknikler',
      'Nefes ritmi ve solunum sistemini güçlendiren premium program',
      'Elite seviye nefes kontrolü ve nefes mastery sağlayan premium teknikler'
    ],
    sleep: [
      'Premium uyku kalitesi artırma ve gelişmiş rahatlama yöntemleri',
      'Derin uyku için premium teknikler ve uyku optimizasyonu',
      'Uyku hijyeni ve kalıcı uyku düzeni için premium program',
      'Elite seviye uyku kalitesi ve uyku mastery sağlayan premium teknikler'
    ],
    focus: [
      'Premium odaklanma ve konsantrasyon için gelişmiş teknikler',
      'Maksimum odaklanma ve zihinsel performans için premium yöntemler',
      'Dikkat kontrolü ve bilişsel performans artırma için premium program',
      'Elite seviye odaklanma ve zihinsel netlik sağlayan premium teknikler'
    ],
    stress: [
      'Premium stres yönetimi ve gelişmiş gevşeme yöntemleri',
      'Stres mastery ve kalıcı stres kontrolü için premium teknikler',
      'Gevşeme ve stres hormonlarını dengeleme için premium program',
      'Elite seviye stres yönetimi ve gevşeme mastery sağlayan premium teknikler'
    ],
    energy: [
      'Premium enerji artırma ve vitalite geliştirme teknikleri',
      'Yorgunluğu azaltma ve dinamizm için premium yöntemler',
      'Fiziksel performansı artırma için premium program',
      'Elite seviye enerji artırma ve vitalite mastery sağlayan premium teknikler'
    ],
    work_life_balance: [
      'Premium iş-yaşam dengesi ve gelişmiş harmoni yöntemleri',
      'Yaşam kalitesini artırma ve iç denge için premium teknikler',
      'Harmoni duygusunu artırma için premium program',
      'Elite seviye denge ve harmoni mastery sağlayan premium teknikler'
    ]
  };
  
  const issueDescriptions = premiumDescriptions[issue as keyof typeof premiumDescriptions] || [
    'Premium nefes egzersizi ve gelişmiş farkındalık',
    'Premium nefes teknikleri ve mastery seviye kontrol',
    'Elite seviye nefes kontrolü ve premium teknikler',
    'Mastery seviye premium teknikler ve elite program'
  ];
  
  const descIndex = Math.floor((day - 1) / 4) % issueDescriptions.length;
  return issueDescriptions[descIndex];
};

// Premium odak alanı
const getPremiumFocus = (day: number, primaryIssues: string[], selectedIssues: string[]): string => {
  const focusAreas = {
    anxiety: ['Premium Anksiyete Yönetimi', 'Sakinlik Mastery', 'İç Huzur Pro', 'Panik Kontrolü Elite'],
    breathing: ['Premium Nefes Kontrolü', 'Nefes Mastery', 'Akciğer Kapasitesi Pro', 'Nefes Ritmi Elite'],
    sleep: ['Premium Uyku Kalitesi', 'Uyku Mastery', 'Derin Rahatlama Pro', 'Uyku Optimizasyonu Elite'],
    focus: ['Premium Odaklanma', 'Konsantrasyon Mastery', 'Zihinsel Netlik Pro', 'Dikkat Kontrolü Elite'],
    stress: ['Premium Stres Azaltma', 'Stres Mastery', 'Gevşeme Pro', 'Stres Dönüşümü Elite'],
    energy: ['Premium Enerji Artırma', 'Vitalite Mastery', 'Canlılık Pro', 'Dinamizm Elite'],
    work_life_balance: ['Premium Denge', 'Harmoni Mastery', 'Yaşam Kalitesi Pro', 'İç Denge Elite']
  };
  
  const selectedIssue = selectedIssues[0] || primaryIssues[0];
  const availableFocuses = focusAreas[selectedIssue as keyof typeof focusAreas] || ['Premium Genel Sakinlik'];
  
  const focusIndex = Math.floor((day - 1) / 4) % availableFocuses.length;
  return availableFocuses[focusIndex];
};

// Premium faydalar
const getPremiumBenefits = (selectedIssues: string[]): string[] => {
  const allBenefits = {
    anxiety: [
      'Premium anksiyete yönetimi ve gelişmiş sakinlik',
      'Elite seviye panik kontrolü ve iç huzur',
      'Mastery seviye anksiyete azaltma teknikleri',
      'Premium güven duygusu ve sakinlik mastery',
      'Elite seviye anksiyete kontrolü ve sakinlik pro'
    ],
    breathing: [
      'Premium nefes kontrolü ve gelişmiş akciğer kapasitesi',
      'Elite seviye oksijenasyon ve nefes farkındalığı',
      'Mastery seviye solunum sistemi güçlendirme',
      'Premium nefes ritmi ve nefes mastery',
      'Elite seviye nefes kontrolü ve nefes pro'
    ],
    sleep: [
      'Premium uyku kalitesi ve gelişmiş uyku düzeni',
      'Elite seviye derin uyku ve uyku optimizasyonu',
      'Mastery seviye uyku hijyeni ve uyku mastery',
      'Premium uykuya dalma süresi kısaltma',
      'Elite seviye uyku kalitesi ve uyku pro'
    ],
    focus: [
      'Premium odaklanma ve gelişmiş konsantrasyon',
      'Elite seviye zihinsel netlik ve dikkat kontrolü',
      'Mastery seviye bilişsel performans artırma',
      'Premium dikkat süresi uzatma ve odaklanma mastery',
      'Elite seviye odaklanma ve konsantrasyon pro'
    ],
    stress: [
      'Premium stres yönetimi ve gelişmiş gevşeme',
      'Elite seviye stres toleransı ve stres mastery',
      'Mastery seviye stres hormonları dengeleme',
      'Premium stres azaltma ve gevşeme pro',
      'Elite seviye stres yönetimi ve gevşeme mastery'
    ],
    energy: [
      'Premium enerji artırma ve gelişmiş vitalite',
      'Elite seviye yorgunluk azaltma ve dinamizm',
      'Mastery seviye fiziksel performans artırma',
      'Premium canlılık ve enerji mastery',
      'Elite seviye enerji artırma ve vitalite pro'
    ],
    work_life_balance: [
      'Premium iş-yaşam dengesi ve gelişmiş harmoni',
      'Elite seviye yaşam kalitesi ve iç denge',
      'Mastery seviye harmoni duygusu ve denge pro',
      'Premium stres yönetimi kolaylaştırma',
      'Elite seviye denge ve harmoni mastery'
    ]
  };
  
  const selectedIssue = selectedIssues[0];
  const availableBenefits = allBenefits[selectedIssue as keyof typeof allBenefits] || [
    'Premium genel sakinlik ve gelişmiş rahatlama',
    'Elite seviye stres azaltma ve odaklanma artırma',
    'Mastery seviye premium teknikler ve elite program'
  ];
  
  const shuffledBenefits = [...availableBenefits].sort(() => Math.random() - 0.5);
  return shuffledBenefits.slice(0, 3);
}; 