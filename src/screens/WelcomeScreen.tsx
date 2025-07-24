import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { COLORS, FONTS } from '../constants/typography';
import { colors, theme } from '../constants/colors';
import { triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';

const { width, height } = Dimensions.get('window');

type WelcomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

export default function WelcomeScreen() {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();

  const handleStartPress = () => {
    triggerHapticFeedback(HapticType.LIGHT);
    navigation.replace('Login');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.light.background }]}>
      {/* App Icon */}
      <View style={styles.iconContainer}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.appIcon}
          resizeMode="contain"
        />
      </View>

      {/* App Name */}
      <Text style={[styles.appName, { color: theme.light.text }]}>Breathing App</Text>

      {/* Welcome Message */}
      <Text style={[styles.welcomeMessage, { color: theme.light.textSecondary }]}>
        Nefes egzersizi uygulamasına hoşgeldiniz
      </Text>

      {/* Start Button */}
      <TouchableOpacity
        style={[styles.startButton, { backgroundColor: colors.primary[500] }]}
        onPress={handleStartPress}
        activeOpacity={0.8}
      >
        <Text style={styles.startButtonText}>Başla</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  appIcon: {
    width: 120,
    height: 120,
    borderRadius: 24,
    shadowColor: colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  appName: {
    fontSize: 32,
    fontFamily: 'Tahoma',
    marginBottom: 16,
    textAlign: 'center',
  },
  welcomeMessage: {
    fontSize: 18,
    fontFamily: 'Tahoma',
    textAlign: 'center',
    marginBottom: 60,
    lineHeight: 26,
  },
  startButton: {
    borderRadius: 30,
    paddingVertical: 18,
    paddingHorizontal: 64,
    alignItems: 'center',
    shadowColor: colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Tahoma',
    letterSpacing: 1,
  },
}); 