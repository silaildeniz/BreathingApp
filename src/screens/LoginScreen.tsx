import React, { useState, useContext } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { AuthContext } from '../contexts/AuthContext';
import { registerWithEmail, loginWithEmail, loginWithGoogle, loginWithApple } from '../services/authService';
import { COLORS, FONTS } from '../constants/typography';
import { triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';

const { width, height } = Dimensions.get('window');

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { setGuestMode } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      
      // Başarılı giriş sonrası App.tsx'teki auth state listener otomatik olarak Home'a yönlendirecek
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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isLogin ? 'Hoş Geldiniz' : 'Hesap Oluşturun'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin 
              ? 'Nefes egzersizi yolculuğunuza devam edin'
              : 'Kişiselleştirilmiş deneyim için hesap oluşturun'
            }
          </Text>
        </View>

        <View style={styles.form}>
          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Adınız"
              placeholderTextColor={COLORS.textTertiary}
              value={name}
              onChangeText={setName}
            />
          )}
          
          <TextInput
            style={styles.input}
            placeholder="E-posta"
            placeholderTextColor={COLORS.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Şifre"
            placeholderTextColor={COLORS.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.authButton, isLoading && styles.disabledButton]}
            onPress={handleEmailAuth}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.authButtonText}>
                {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialButtons}>
          <TouchableOpacity
            style={[styles.socialButton, styles.googleButton, isLoading && styles.disabledButton]}
            onPress={handleGoogleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.googleButtonText}>🔍 Google ile Devam Et</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, styles.appleButton, isLoading && styles.disabledButton]}
            onPress={handleAppleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.appleButtonText}>🍎 Apple ile Devam Et</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.switchMode}>
          <Text style={styles.switchText}>
            {isLogin ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}
          </Text>
          <TouchableOpacity onPress={handleSwitchMode} disabled={isLoading}>
            <Text style={styles.switchButton}>
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
          <Text style={styles.skipButtonText}>Misafir Olarak Devam Et</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    lineHeight: 22,
  },
  socialButtons: {
    marginBottom: 30,
  },
  socialButton: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  googleButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  googleButtonText: {
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.text,
  },
  appleButton: {
    backgroundColor: COLORS.black,
  },
  appleButtonText: {
    fontSize: 16,
    fontFamily: 'Tahoma',
    color: COLORS.white,
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
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'Tahoma',
  },
  form: {
    marginBottom: 30,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    fontSize: 16,
    fontFamily: 'Tahoma',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    color: COLORS.text,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  authButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  authButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontFamily: 'Tahoma',
  },
  switchMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'Tahoma',
  },
  switchButton: {
    color: COLORS.primary,
    fontSize: 14,
    fontFamily: 'Tahoma',
    marginLeft: 4,
  },
  skipButton: {
    alignItems: 'center',
  },
  skipButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'Tahoma',
    textDecorationLine: 'underline',
  },
  disabledButton: {
    opacity: 0.7,
  },
}); 