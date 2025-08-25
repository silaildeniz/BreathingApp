import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthContext } from '../contexts/AuthContext';
import { registerWithEmail, loginWithEmail, loginWithGoogle, loginWithApple } from '../services/authService';
import { COLORS, FONTS, standardTextStyles } from '../constants/typography';
import { triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';

const { width, height } = Dimensions.get('window');

type LoginScreenNavigationProp = StackNavigationProp<any, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { setGuestMode } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [breathAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Breathing animasyonu başlat
    const breathAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    );
    breathAnimation.start();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      triggerHapticFeedback(HapticType.LIGHT);
      setIsLoading(true);
      await loginWithGoogle();
      // Başarılı giriş sonrası App.tsx'teki auth state listener otomatik olarak Home'a yönlendirecek
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      triggerHapticFeedback(HapticType.LIGHT);
      setIsLoading(true);
      await loginWithApple();
      // Başarılı giriş sonrası App.tsx'teki auth state listener otomatik olarak Home'a yönlendirecek
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    if (!isLogin && !name) {
      Alert.alert('Hata', 'Lütfen adınızı girin.');
      return;
    }

    try {
      triggerHapticFeedback(HapticType.MEDIUM);
      setIsLoading(true);
      
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, name);
      }

      // Misafir modunu kapat (daha önce misafir seçilmiş olabilir)
      setGuestMode(false);

      // Başarılı giriş sonrası navigation stack'i temizleyerek Home'a yönlendir
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipLogin = () => {
    triggerHapticFeedback(HapticType.LIGHT);
    Alert.alert(
      'Misafir Modu',
      'Misafir olarak devam etmek istiyor musunuz? Bazı özellikler kısıtlı olabilir.',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Devam Et',
          onPress: () => {
            setIsLoading(true);
            setGuestMode(true);
            setIsLoading(false);
            // Home sayfasına yönlendir
            navigation.navigate('Home');
          }
        }
      ]
    );
  };

  const handleSwitchMode = () => {
    triggerHapticFeedback(HapticType.SELECTION);
    setIsLogin(!isLogin);
  };

  return (
    <View style={{ flex: 1 }}>
      <Animated.Text 
        style={[
          standardTextStyles.mainTitle,
          {
            fontSize: 35,
            color: '#FFD700',
            marginBottom: 16,
            textAlign: 'center',
            textShadowColor: 'rgba(0, 0, 0, 0.9)',
            textShadowOffset: { width: 2, height: 2 },
            textShadowRadius: 4,
            fontWeight: 'bold',
            letterSpacing: 4,
            opacity: breathAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 1]
            }),
            transform: [{ scale: breathAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 1.2]
            })}],
            position: 'absolute',
            top: 150,
            left: 0,
            right: 0,
            zIndex: 9999
          }
        ]}
      >
        BUHU
      </Animated.Text>
      <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover">
        <ScrollView style={{ flex: 1, backgroundColor: 'transparent' }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[standardTextStyles.mainTitle, { color: '#F5F5DC', marginBottom: 8, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              {isLogin ? 'Hoş Geldiniz' : 'Hesap Oluşturun'}
            </Text>
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              {isLogin 
                ? 'Nefes egzersizi yolculuğunuza devam edin'
                : 'Kişiselleştirilmiş deneyim için hesap oluşturun'
              }
            </Text>
          </View>

          <View style={styles.form}>
            {!isLogin && (
              <TextInput
                style={[styles.input, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}
                placeholder="Adınız"
                placeholderTextColor="#F5F5DC"
                value={name}
                onChangeText={setName}
              />
            )}
            
            <TextInput
              style={[styles.input, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}
              placeholder="E-posta"
              placeholderTextColor="#F5F5DC"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}
              placeholder="Şifre"
              placeholderTextColor="#F5F5DC"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.authButton, isLoading && styles.disabledButton, { marginTop: 20 }]}
              onPress={handleEmailAuth}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={[standardTextStyles.buttonMedium, { color: COLORS.white, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                  {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
                </Text>
              )}
            </TouchableOpacity>
          </View>



          <View style={styles.switchMode}>
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
              {isLogin ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}
            </Text>
            <TouchableOpacity onPress={handleSwitchMode} disabled={isLoading}>
              <Text style={[standardTextStyles.bodyMedium, { color: isLogin ? '#4CAF50' : '#2E7D32', marginLeft: 4, textDecorationLine: 'underline', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
                {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipLogin}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={[standardTextStyles.bodyMedium, { color: '#F5F5DC', textDecorationLine: 'underline', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Misafir Olarak Devam Et</Text>
          </TouchableOpacity>
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    ...standardTextStyles.mainTitle,
    color: '#F5F5DC',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...standardTextStyles.bodyMedium,
    color: '#F5F5DC',
    textAlign: 'center',
  },
  socialButtons: {
    marginBottom: 30,
  },
  socialButton: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#DDD',
    shadowColor: 'transparent',
  },
  googleButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  googleButtonText: {
    ...standardTextStyles.bodyMedium,
    color: '#F5F5DC',
  },
  appleButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  appleButtonText: {
    ...standardTextStyles.bodyMedium,
    color: '#F5F5DC',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray[200],
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#F5F5DC',
    ...standardTextStyles.bodySmall,
  },
  form: {
    marginBottom: 30,
  },
  input: {
    marginBottom: 16,
    ...standardTextStyles.bodyMedium,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'transparent',
    color: '#F5F5DC',
  },
  authButton: {
    backgroundColor: '#2C3E50',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#2C3E50',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  authButtonText: {
    ...standardTextStyles.buttonLarge,
    color: COLORS.white,
  },
  switchMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchText: {
    ...standardTextStyles.bodyMedium,
    color: COLORS.textSecondary,
  },
  switchButton: {
    ...standardTextStyles.bodyMedium,
    color: COLORS.primary,
    marginLeft: 4,
  },
  skipButton: {
    alignItems: 'center',
  },
  skipButtonText: {
    ...standardTextStyles.bodyMedium,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
  disabledButton: {
    opacity: 0.7,
  },
}); 