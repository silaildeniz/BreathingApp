import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS, FONTS, standardTextStyles } from '../constants/typography';
import { triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';
import { checkPremiumStatus } from '../utils/premiumUtils';

type PremiumBreathingScreenNavigationProp = StackNavigationProp<any, 'PremiumBreathing'>;

interface PremiumTechnique {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'low' | 'medium' | 'high';
  benefits: string[];
  instructions: string[];
  category: 'stress' | 'focus' | 'sleep' | 'energy' | 'anxiety';
}

const premiumTechniques: PremiumTechnique[] = [
  {
    id: 'box-breathing',
    title: 'Kutu Nefesi',
    description: 'Stres yönetimi ve odaklanma için mükemmel teknik',
    duration: '5-10 dakika',
    difficulty: 'low',
    benefits: ['Stres azaltma', 'Odaklanma artırma', 'Kontrol hissi'],
    instructions: [
      'Rahat bir pozisyon alın',
      '4 saniye nefes alın',
      '4 saniye nefesinizi tutun',
      '4 saniye nefes verin',
      '4 saniye bekleyin',
      'Bu döngüyü tekrarlayın'
    ],
    category: 'stress'
  },
  {
    id: '4_7_8_breathing',
    title: '4-7-8 Nefes Tekniği',
    description: 'Hızlı rahatlama ve uyku kalitesi için',
    duration: '3-5 dakika',
    difficulty: 'medium',
    benefits: ['Hızlı rahatlama', 'Uyku kalitesi', 'Anksiyete azaltma'],
    instructions: [
      'Dilinizi damağınızın arkasına yerleştirin',
      '4 saniye nefes alın',
      '7 saniye nefesinizi tutun',
      '8 saniye nefes verin',
      'Bu döngüyü 4 kez tekrarlayın'
    ],
    category: 'sleep'
  },
  {
    id: 'alternate_nostril',
    title: 'Alternatif Burun Nefesi',
    description: 'Enerji dengeleme ve zihinsel netlik',
    duration: '5-15 dakika',
    difficulty: 'medium',
    benefits: ['Enerji dengeleme', 'Zihinsel netlik', 'Stres azaltma'],
    instructions: [
      'Sağ elinizi kullanın',
      'Sağ burun deliğini kapatın',
      'Sol burun deliğinden nefes alın',
      'Sol burun deliğini kapatın',
      'Sağ burun deliğinden nefes verin',
      'Bu döngüyü tekrarlayın'
    ],
    category: 'energy'
  },
  {
    id: 'coherent_breathing',
    title: 'Uyumlu Nefes',
    description: 'Kalp atış hızı değişkenliğini optimize eder',
    duration: '10-20 dakika',
    difficulty: 'low',
    benefits: ['Kalp sağlığı', 'Stres azaltma', 'Dengeleme'],
    instructions: [
      'Dakikada 5-6 nefes alın',
      'Her nefes 5-6 saniye sürsün',
      'Nefes alış ve veriş eşit olsun',
      'Rahat ve doğal hissedin',
      'Bu ritmi koruyun'
    ],
    category: 'stress'
  },
  {
    id: 'kapalabhati',
    title: 'Kapalabhati (Ateş Nefesi)',
    description: 'Enerji artırma ve detoksifikasyon',
    duration: '3-5 dakika',
    difficulty: 'high',
    benefits: ['Enerji artırma', 'Detoksifikasyon', 'Odaklanma'],
    instructions: [
      'Hızlı ve güçlü nefes verin',
      'Nefes alış pasif olsun',
      'Karın kaslarını kullanın',
      'Dakikada 60-120 nefes',
      'Dikkatli olun, yavaş başlayın'
    ],
    category: 'energy'
  },
  {
    id: 'bhramari',
    title: 'Bhramari (Arı Nefesi)',
    description: 'Zihinsel sakinlik ve iç huzur',
    duration: '5-10 dakika',
    difficulty: 'medium',
    benefits: ['Zihinsel sakinlik', 'İç huzur', 'Stres azaltma'],
    instructions: [
      'Gözlerinizi kapatın',
      'Kulaklarınızı kapatın',
      'Mmm sesi çıkarın',
      'Nefes alırken de ses çıkarın',
      'Bu titreşimi hissedin'
    ],
    category: 'anxiety'
  }
];

export default function PremiumBreathingScreen() {
  const navigation = useNavigation<PremiumBreathingScreenNavigationProp>();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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
      } else {
        setLoading(false);
      }
    };
    
    checkPremium();
  }, [navigation]);

  const handleTechniquePress = (technique: PremiumTechnique) => {
    triggerHapticFeedback(HapticType.SELECTION);
    
    // Teknik ID'sini BreathingExerciseScreen'in anlayacağı formata çevir
    let techniqueId = technique.id;
    if (technique.id === '4_7_8_breathing') techniqueId = '4-7-8';
    else if (technique.id === 'alternate_nostril') techniqueId = 'alternate_nostril';
    else if (technique.id === 'box-breathing') techniqueId = 'box-breathing';
    else if (technique.id === 'coherent_breathing') techniqueId = 'coherent_breathing';
    else if (technique.id === 'kapalabhati') techniqueId = 'kapalabhati';
    else if (technique.id === 'bhramari') techniqueId = 'bhramari';
    
    // Süreyi dakika olarak çıkar
    const durationMatch = technique.duration.match(/(\d+)/);
    const duration = durationMatch ? `${durationMatch[1]} dakika` : '10 dakika';
    
    console.log('Premium teknik başlatılıyor:', {
      technique: techniqueId,
      duration: duration,
      title: technique.title
    });
    
    // BreathingExerciseScreen'e yönlendir
    navigation.navigate('BreathingExercise', {
      technique: techniqueId,
      duration: duration,
      isPremium: true,
      techniqueTitle: technique.title,
      techniqueDescription: technique.description
    });
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'stress': return 'Stres Yönetimi';
      case 'focus': return 'Odaklanma';
      case 'sleep': return 'Uyku';
      case 'energy': return 'Enerji';
      case 'anxiety': return 'Anksiyete';
      default: return 'Tümü';
    }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'stress': return '😌';
      case 'focus': return '🎯';
      case 'sleep': return '😴';
      case 'energy': return '⚡';
      case 'anxiety': return '🧘';
      default: return '🌟';
    }
  };

  const filteredTechniques = selectedCategory === 'all' 
    ? premiumTechniques 
    : premiumTechniques.filter(tech => tech.category === selectedCategory);

  if (!isPremium) {
    return null;
  }

  if (loading) {
    return (
      <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F5F5DC" />
          <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginTop: 16, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            Premium teknikler yükleniyor...
          </Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover">
      <ScrollView style={{ flex: 1, backgroundColor: 'transparent' }} contentContainerStyle={{ paddingHorizontal: 15, paddingTop: 90 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[standardTextStyles.mainTitle, { color: '#F5F5DC', marginBottom: 8, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            Premium Nefes Teknikleri
          </Text>
          <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', textAlign: 'center', marginBottom: 20, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            Gelişmiş nefes egzersizleri ile daha derin bir deneyim
          </Text>
        </View>

        {/* Kategori Filtreleri */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
          <TouchableOpacity
            style={[styles.categoryButton, selectedCategory === 'all' && styles.categoryButtonActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextActive]}>
              🌟 Tümü
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.categoryButton, selectedCategory === 'stress' && styles.categoryButtonActive]}
            onPress={() => setSelectedCategory('stress')}
          >
            <Text style={[styles.categoryText, selectedCategory === 'stress' && styles.categoryTextActive]}>
              😌 Stres
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.categoryButton, selectedCategory === 'focus' && styles.categoryButtonActive]}
            onPress={() => setSelectedCategory('focus')}
          >
            <Text style={[styles.categoryText, selectedCategory === 'focus' && styles.categoryTextActive]}>
              🎯 Odaklanma
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.categoryButton, selectedCategory === 'sleep' && styles.categoryButtonActive]}
            onPress={() => setSelectedCategory('sleep')}
          >
            <Text style={[styles.categoryText, selectedCategory === 'sleep' && styles.categoryTextActive]}>
              😴 Uyku
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.categoryButton, selectedCategory === 'energy' && styles.categoryButtonActive]}
            onPress={() => setSelectedCategory('energy')}
          >
            <Text style={[styles.categoryText, selectedCategory === 'energy' && styles.categoryTextActive]}>
              ⚡ Enerji
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.categoryButton, selectedCategory === 'anxiety' && styles.categoryButtonActive]}
            onPress={() => setSelectedCategory('anxiety')}
          >
            <Text style={[styles.categoryText, selectedCategory === 'anxiety' && styles.categoryTextActive]}>
              🧘 Anksiyete
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Teknikler Listesi */}
        {filteredTechniques.map((technique) => (
          <TouchableOpacity
            key={technique.id}
            style={styles.techniqueCard}
            onPress={() => handleTechniquePress(technique)}
          >
            <View style={styles.techniqueHeader}>
              <View style={styles.techniqueInfo}>
                <Text style={styles.techniqueEmoji}>{getCategoryEmoji(technique.category)}</Text>
                <View style={styles.techniqueDetails}>
                  <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                    {technique.title}
                  </Text>
                  <View style={styles.difficultyContainer}>
                    <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                      {technique.duration} •
                    </Text>
                    <View style={[
                      styles.difficultyBadge,
                      technique.difficulty === 'low' && styles.difficultyLow,
                      technique.difficulty === 'medium' && styles.difficultyMedium,
                      technique.difficulty === 'high' && styles.difficultyHigh
                    ]}>
                      <Text style={[standardTextStyles.bodySmall, styles.difficultyText]}>
                        {technique.difficulty === 'low' ? 'Başlangıç' : technique.difficulty === 'medium' ? 'Orta' : 'İleri'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <Text style={styles.arrowText}>→</Text>
            </View>
            
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', marginTop: 12, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              {technique.description}
            </Text>
            
            <View style={styles.benefitsContainer}>
              {technique.benefits.slice(0, 2).map((benefit, index) => (
                <View key={index} style={styles.benefitTag}>
                  <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                    {benefit}
                  </Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        {/* Bilgi Kartı */}
        <View style={styles.infoCard}>
          <Text style={[standardTextStyles.cardTitle, { color: '#F5F5DC', marginBottom: 12, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            💡 Premium Teknik İpuçları
          </Text>
          <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            • Her teknik farklı durumlar için optimize edilmiştir
          </Text>
          <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            • Zorluk seviyesine göre başlayın ve ilerleyin
          </Text>
          <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            • Düzenli pratik en iyi sonuçları verir
          </Text>
          <Text style={[standardTextStyles.bodySmall, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
            • Rahatsızlık hissederseniz durun ve normal nefes alın
          </Text>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryButton: {
    backgroundColor: 'rgba(245, 245, 220, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderColor: '#4CAF50',
  },
  categoryText: {
    color: '#F5F5DC',
    fontSize: 14,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  techniqueCard: {
    backgroundColor: 'rgba(245, 245, 220, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  techniqueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  techniqueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  techniqueEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  techniqueDetails: {
    flex: 1,
  },
  arrowText: {
    fontSize: 24,
    color: '#F5F5DC',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  benefitsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    flexWrap: 'wrap',
  },
  benefitTag: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  infoCard: {
    backgroundColor: 'rgba(245, 245, 220, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  difficultyBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
    borderWidth: 2,
  },
  difficultyLow: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: '#4CAF50',
  },
  difficultyMedium: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderColor: '#FFC107',
  },
  difficultyHigh: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderColor: '#F44336',
  },
  difficultyText: {
    color: '#F5F5DC',
    fontWeight: '600',
    fontSize: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
}); 