import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { standardTextStyles } from '../constants/typography';
import { activatePremium } from '../utils/premiumUtils';
import { restorePurchases } from '../services/iapService';
import { saveUserProgram } from '../services/firestoreService';
import { getCurrentUser } from '../services/authService';

type PremiumScreenNavigationProp = StackNavigationProp<any, 'Premium'>;

export default function PremiumScreen() {
  const navigation = useNavigation<PremiumScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      // Premium aboneliği aktifleştir
      await activatePremium();
      
      // Mevcut kullanıcıyı al
      const currentUser = getCurrentUser();
      if (!currentUser) {
        Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı.');
        return;
      }

      Alert.alert(
        'Tebrikler!',
        'Premium aboneliğiniz başarıyla aktifleştirildi. Şimdi detaylı değerlendirme yaparak 21 günlük premium programınızı oluşturabilirsiniz.',
        [
          {
            text: 'Premium Değerlendirme Yap',
            onPress: () => navigation.navigate('PremiumAssessment'),
          },
          {
            text: 'Ana Sayfa',
            onPress: () => navigation.navigate('Home'),
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Premium satın alma hatası:', error);
      Alert.alert('Hata', 'Premium abonelik aktifleştirilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsLoading(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        await activatePremium();
        Alert.alert(
          'Satın Alımlar Geri Yüklendi',
          'Premium erişiminiz geri yüklendi.',
          [
            { text: 'Premium Program', onPress: () => navigation.navigate('PremiumProgram') },
            { text: 'Kapat', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Bilgi', 'Aktif bir satın alma bulunamadı.');
      }
    } catch (error) {
      console.error('Restore purchases error:', error);
      Alert.alert('Hata', 'Satın alımlar geri yüklenemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  const premiumFeatures = [
    '21 günlük detaylı kişisel program',
    'Premium nefes teknikleri',
    'Sınırsız Program Sıfırlama Seçeneği',
    'Sabah - Akşam egzersiz fırsatı'
  ];

  return (
    <ImageBackground
      source={require('../../assets/backgrounds/arkaplan.jpg')}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <Text style={[standardTextStyles.mainTitle, styles.title]}>
            21 Günde Daha Sakin Zihin
          </Text>
          <Text style={[standardTextStyles.bodyLarge, styles.subtitle]}>
            Nefes egzersizlerinde uzmanlaşın
          </Text>
        </View>

                <View style={styles.priceCard}>
          <Text style={[standardTextStyles.sectionTitle, styles.priceTitle]}>
            Şimdilik
          </Text>
          <View style={styles.priceContainer}>
            <Text style={[styles.originalPrice]}>
              ₺149.99
            </Text>
            <Text style={[styles.priceText]}>
              yerine
            </Text>
            <Text style={[styles.price]}>
              ₺99.99
            </Text>
          </View>
          <Text style={[standardTextStyles.bodyMedium, styles.priceSubtitle]}>
            Tek seferlik ödeme
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={[standardTextStyles.sectionTitle, styles.featuresTitle]}>
            Premium Özellikler
          </Text>
          {premiumFeatures.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={[standardTextStyles.bodyMedium, styles.featureText]}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        

        <TouchableOpacity
          style={[styles.purchaseButton, isLoading && styles.disabledButton]}
          onPress={handlePurchase}
          disabled={isLoading}
        >
          <Text style={[standardTextStyles.buttonLarge, styles.purchaseButtonText]}>
            {isLoading ? 'İşleniyor...' : 'Premium\'a Geç - ₺99.99'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.purchaseButton, isLoading && styles.disabledButton]}
          onPress={handleRestore}
          disabled={isLoading}
        >
          <Text style={[standardTextStyles.buttonLarge, styles.purchaseButtonText]}>
            {isLoading ? 'İşleniyor...' : 'Satın Alımları Geri Yükle'}
          </Text>
        </TouchableOpacity>



        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[standardTextStyles.bodyMedium, styles.backButtonText]}>
            Geri Dön
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.backButton, { marginTop: 10 }]}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={[standardTextStyles.bodyMedium, styles.backButtonText]}>
            Ana Sayfa
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 110,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    fontWeight: '600',
  },
  textShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  priceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  priceText: {
    color: '#F5F5DC',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '400',
    marginHorizontal: 8,
  },
  priceTitle: {
    color: '#FFFFFF',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    fontWeight: 'bold',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  originalPrice: {
    fontSize: 28,
    fontWeight: '400',
    color: '#FFFFFF',
    textDecorationLine: 'line-through',
    marginRight: 10,
    opacity: 0.7,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  price: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  priceSubtitle: {
    color: '#FFFFFF',
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  featuresContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featuresTitle: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    fontWeight: 'bold',
  },
  featureItem: {
    marginBottom: 12,
  },
  featureText: {
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    fontWeight: '500',
  },
  comparisonContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  comparisonTitle: {
    color: '#F5F5DC',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#F5F5DC',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  comparisonText: {
    color: '#F5F5DC',
    flex: 1,
    textAlign: 'center',
    textShadowColor: '#F5F5DC',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  purchaseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: '#FFD700',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  backButton: {
    alignItems: 'center',
  },
  backButtonText: {
    color: '#F5F5DC',
    opacity: 0.8,
    textShadowColor: '#F5F5DC',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
}); 