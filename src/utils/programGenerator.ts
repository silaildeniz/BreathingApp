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
}

// Tüm nefes teknikleri
const ALL_TECHNIQUES = [
  'diaphragmatic',
  '4-7-8',
  'box-breathing', 
  'nadi-shodhana',
  'kapalabhati',
  'anxiety-relief'
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

};

export const generatePersonalizedProgram = (scores: AssessmentScores): PersonalizedProgram[] => {
  const program: PersonalizedProgram[] = [];
  
  // Ana sorunları belirle
  const primaryIssues = getPrimaryIssues(scores);
  const secondaryIssues = getSecondaryIssues(scores);
  
  // Program yoğunluğunu belirle
  const intensity = getIntensityLevel(scores);
  
  // 10 günlük program oluştur
  for (let day = 1; day <= 10; day++) {
    const dayProgram = createDayProgram(day, primaryIssues, secondaryIssues, intensity, scores);
    program.push(dayProgram);
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
  scores: AssessmentScores
): PersonalizedProgram => {
  
  // Gün için sorun stratejisi
  const selectedIssues = getDayStrategy(day, primaryIssues, scores);
  
  // Gün için teknik seçimi
  const techniques = selectTechniquesForDay(day, primaryIssues, secondaryIssues, scores);
  
  // Günlük yoğunluk seviyesi
  const dayIntensity = getDayIntensity(day, intensity, scores);
  
  // Süre hesaplama
  const duration = calculateDuration(techniques, dayIntensity, day);
  
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
  const techniques: string[] = [];
  const experienceLevel = scores.meditation_experience;
  
  // Günlere göre teknik dağıtım stratejisi
  const dayStrategy = getDayStrategy(day, primaryIssues, scores);
  
  // Her gün için uygun teknikleri seç
  dayStrategy.forEach(issue => {
    const suitableTechniques = getTechniquesForIssue(issue, experienceLevel, day);
    if (suitableTechniques.length > 0) {
      const selectedTechnique = suitableTechniques[Math.floor(Math.random() * suitableTechniques.length)];
      if (!techniques.includes(selectedTechnique)) {
        techniques.push(selectedTechnique);
      }
    }
  });
  
  // Eğer henüz teknik seçilmediyse, varsayılan teknik seç
  if (techniques.length === 0) {
    const defaultTechniques = experienceLevel <= 2 ? ['diaphragmatic', '4-7-8'] : ['box-breathing', 'nadi-shodhana'];
    techniques.push(defaultTechniques[Math.floor(Math.random() * defaultTechniques.length)]);
  }
  
  return techniques;
};

// Günlere göre sorun dağıtım stratejisi
const getDayStrategy = (day: number, primaryIssues: string[], scores: AssessmentScores): string[] => {
  const strategy = [];
  
  // Her gün için farklı odak alanları seç
  const availableIssues = [...primaryIssues];
  
  // Gün 1-3: Ana sorunlara odaklan
  if (day <= 3) {
    strategy.push(availableIssues[0]); // Ana sorun
    if (day === 2 && availableIssues[1]) {
      strategy.push(availableIssues[1]); // İkincil sorun
    }
  }
  
  // Gün 4-7: Çeşitlilik artır
  else if (day <= 7) {
    // Günlere göre farklı sorunları seç
    const dayIndex = (day - 1) % availableIssues.length;
    strategy.push(availableIssues[dayIndex]);
    
    // Ek sorun ekle
    if (day % 2 === 0 && availableIssues.length > 1) {
      const nextIndex = (dayIndex + 1) % availableIssues.length;
      strategy.push(availableIssues[nextIndex]);
    }
  }
  
  // Gün 8-10: Tüm sorunları karıştır
  else {
    // Rastgele sorun seçimi
    const shuffledIssues = [...availableIssues].sort(() => Math.random() - 0.5);
    strategy.push(shuffledIssues[0]);
    
    if (day >= 9 && shuffledIssues[1]) {
      strategy.push(shuffledIssues[1]);
    }
  }
  
  return strategy;
};

// Soruna göre uygun teknikleri seç
const getTechniquesForIssue = (issue: string, experienceLevel: number, day: number): string[] => {
  const suitableTechniques: string[] = [];
  
  // Tüm teknikleri kontrol et ve uygun olanları seç
  Object.entries(TECHNIQUE_CATEGORIES).forEach(([technique, info]) => {
    if (info.benefits.includes(issue)) {
      // Deneyim seviyesine göre filtrele
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

const calculateDuration = (techniques: string[], intensity: 'low' | 'medium' | 'high', day: number): string => {
  let totalMinutes = 0;
  
  techniques.forEach(technique => {
    const techniqueInfo = TECHNIQUE_CATEGORIES[technique as keyof typeof TECHNIQUE_CATEGORIES];
    if (techniqueInfo) {
      // Temel süre
      let baseDuration = techniqueInfo.baseDuration;
      
      // Gün ilerledikçe yoğunluk artışı
      const dayProgress = Math.min(day / 10, 1.3);
      const intensityMultiplier = getIntensityMultiplier(day, techniqueInfo.intensity);
      
      // Toplam süre hesaplama
      const totalDuration = Math.round(baseDuration * dayProgress * intensityMultiplier);
      totalMinutes += totalDuration;
    }
  });
  
  return `${totalMinutes} dakika`;
};

// Günlük yoğunluk seviyesi belirleme
const getDayIntensity = (day: number, baseIntensity: 'low' | 'medium' | 'high', scores: AssessmentScores): 'low' | 'medium' | 'high' => {
  // Günlere göre yoğunluk artışı
  if (day <= 3) {
    return 'low'; // İlk 3 gün düşük yoğunluk
  } else if (day <= 7) {
    return 'medium'; // 4-7. günler orta yoğunluk
  } else {
    return 'high'; // 8-10. günler yüksek yoğunluk
  }
};

// Gün ilerledikçe yoğunluk artışı
const getIntensityMultiplier = (day: number, baseIntensity: string): number => {
  let multiplier = 1;
  
  // İlk 5 gün: Düşük yoğunluk (1.0x)
  if (day <= 5) {
    multiplier = 1.0;
  }
  // Son 5 gün: Orta-yüksek yoğunluk (1.3x)
  else {
    multiplier = 1.3;
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
    anxiety: ['Sakinlik Temelleri', 'Anksiyete Yönetimi', 'İç Huzur', 'Panik Kontrolü'],
    breathing: ['Nefes Farkındalığı', 'Nefes Kontrolü', 'Nefes Ustalaşması', 'Nefes Ritmi'],
    sleep: ['Uyku Hazırlığı', 'Derin Rahatlama', 'Uyku Optimizasyonu', 'Uyku Düzeni'],
    focus: ['Odaklanma Temelleri', 'Konsantrasyon Güçlendirme', 'Zihinsel Netlik', 'Dikkat Kontrolü'],
    stress: ['Stres Yönetimi', 'Stres Dönüşümü', 'Stres Mastery', 'Gevşeme'],
    energy: ['Enerji Artırma', 'Vitalite', 'Canlılık', 'Dinamizm'],
    work_life_balance: ['Denge', 'Harmoni', 'Yaşam Kalitesi', 'İç Denge']
  };
  
  const issueTitles = titles[issue as keyof typeof titles] || ['Temel Egzersiz', 'Gelişmiş Egzersiz', 'Uzman Egzersiz', 'Mastery'];
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
      'Panik atakları önlemek için gelişmiş teknikler'
    ],
    breathing: [
      'Nefes farkındalığı ve temel nefes kontrolü',
      'Gelişmiş nefes teknikleri ve akciğer kapasitesi',
      'Nefes ustalaşması ve optimal nefes düzeni',
      'Nefes ritmi ve solunum sistemini güçlendirme'
    ],
    sleep: [
      'Uyku kalitesini artırmak için sakinleştirici teknikler',
      'Derin uyku için gelişmiş rahatlama yöntemleri',
      'Uyku optimizasyonu ve kalıcı uyku düzeni',
      'Uyku hijyeni ve uyku düzenini iyileştirme'
    ],
    focus: [
      'Odaklanma ve konsantrasyon için temel teknikler',
      'Gelişmiş odaklanma ve zihinsel netlik',
      'Maksimum odaklanma ve zihinsel performans',
      'Dikkat kontrolü ve bilişsel performans artırma'
    ],
    stress: [
      'Günlük stres yönetimi için temel teknikler',
      'Stres dönüşümü ve stres toleransı artırma',
      'Stres mastery ve kalıcı stres kontrolü',
      'Gevşeme ve stres hormonlarını dengeleme'
    ],
    energy: [
      'Enerji seviyesini artırmak için temel teknikler',
      'Vitalite ve canlılık artırma',
      'Yorgunluğu azaltma ve dinamizm',
      'Fiziksel performansı artırma'
    ],
    work_life_balance: [
      'İş-yaşam dengesini iyileştirmek için temel teknikler',
      'Yaşam kalitesini artırma ve harmoni',
      'İç dengeyi sağlama ve stres yönetimi',
      'Harmoni duygusunu artırma'
    ]
  };
  
  const issueDescriptions = descriptions[issue as keyof typeof descriptions] || [
    'Temel nefes egzersizi ve farkındalık',
    'Gelişmiş nefes teknikleri',
    'Uzman seviye nefes kontrolü',
    'Mastery seviye teknikler'
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