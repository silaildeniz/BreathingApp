import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ImageBackground, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS, FONTS, standardTextStyles } from '../constants/typography';
import { colors, theme } from '../constants/colors';
import { triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';

const { width, height } = Dimensions.get('window');

type WelcomeScreenNavigationProp = StackNavigationProp<any, 'Login'>;

export default function WelcomeScreen() {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [breathAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Fade in animasyonu başlat
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 2500, // 2.5 saniye
      useNativeDriver: true,
    }).start();

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

  const handleStartPress = () => {
    triggerHapticFeedback(HapticType.LIGHT);
    navigation.replace('Login');
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
            top: 200,
            left: 20,
            right: 20,
            zIndex: 9999,
            paddingVertical: 10
          }
        ]}
      >
        BUHU
      </Animated.Text>
      <Text 
        style={[
          standardTextStyles.mainTitle, 
          { 
            color: '#F5F5DC', 
            marginBottom: 24, 
            textAlign: 'center', 
            textShadowColor: 'rgba(0, 0, 0, 0.8)', 
            textShadowOffset: { width: 1, height: 1 }, 
            textShadowRadius: 1,
            position: 'absolute',
            top: 250,
            left: 20,
            right: 20,
            zIndex: 9999,
            fontWeight: '400'
          }
        ]}
      >
        Nefes Egzersizi
      </Text>
      <Image 
        source={require('../../assets/icon.png')} 
        style={{ 
          width: 100, 
          height: 100, 
          borderRadius: 20, 
          marginBottom: 20,
          position: 'absolute',
          top: 320,
          left: '50%',
          marginLeft: -50,
          zIndex: 9999
        }} 
      />
      <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 140 }}>
          <TouchableOpacity 
            style={{ 
              borderRadius: 18, 
              paddingVertical: 18, 
              paddingHorizontal: 64, 
              alignItems: 'center', 
              backgroundColor: 'rgba(255, 255, 255, 0.1)', 
              borderWidth: 1, 
              borderColor: '#DDD', 
              shadowColor: 'transparent', 
              marginBottom: 40,
              position: 'absolute',
              bottom: 220,
              left: '40%',
              marginLeft: -100,
              zIndex: 9999
            }} 
            onPress={() => navigation.navigate('Login')} 
            activeOpacity={0.5}
          >
            <Text style={[standardTextStyles.buttonLarge, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Yolculuğa Başla</Text>
          </TouchableOpacity>
          <Animated.Text 
            style={[
              standardTextStyles.bodyLarge, 
              { 
                color: '#F5F5DC', 
                marginBottom: 20, 
                textAlign: 'center', 
                textShadowColor: 'rgba(0, 0, 0, 0.8)', 
                textShadowOffset: { width: 1, height: 1 }, 
                textShadowRadius: 2,
                opacity: fadeAnim
              }
            ]}
          >
            Hoş geldin...
          </Animated.Text>
          <Animated.Text 
            style={[
              standardTextStyles.bodyLarge, 
              { 
                color: '#F5F5DC', 
                marginBottom: 40, 
                textAlign: 'center', 
                textShadowColor: 'rgba(0, 0, 0, 0.8)', 
                textShadowOffset: { width: 1, height: 1 }, 
                textShadowRadius: 2,
                opacity: fadeAnim
              }
            ]}
          >
            Şifa dolu yolculuğun burada başlıyor
          </Animated.Text>
        </View>
      </ImageBackground>
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
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#DDD',
    shadowColor: 'transparent',
  },
  appName: {
    ...standardTextStyles.mainTitle,
    marginBottom: 16,
    textAlign: 'center',
    color: '#F5F5DC',
  },
  welcomeMessage: {
    ...standardTextStyles.bodyLarge,
    textAlign: 'center',
    marginBottom: 60,
    color: '#F5F5DC',
  },
  startButton: {
    borderRadius: 30,
    paddingVertical: 18,
    paddingHorizontal: 64,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#DDD',
    shadowColor: 'transparent',
  },
  startButtonText: {
    ...standardTextStyles.buttonLarge,
    color: '#F5F5DC',
  },
}); 