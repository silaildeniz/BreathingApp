import './src/utils/disableConsoleInProd';
import React, { useContext } from 'react';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { initializeIAP } from './src/services/iapService';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { AuthProvider, AuthContext } from './src/contexts/AuthContext';

// Navigation types
export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Home: undefined;
  Assessment: undefined;
  BreathingExercise: { 
    autoStart?: boolean; 
    technique?: string;
    duration?: string;
    isPremium?: boolean;
    techniqueTitle?: string;
    techniqueDescription?: string;
    programDay?: number;
    session?: 'morning' | 'evening';
  };
  PersonalizedProgram: undefined;
  Settings: undefined;
  NotificationSettings: undefined;
  Premium: undefined;
  SleepMusic: undefined;
  PremiumAssessment: undefined;
  PremiumProgram: undefined;
  PremiumBreathing: { day?: any };
  PremiumReminders: undefined;

};

import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import AssessmentScreen from './src/screens/AssessmentScreen';
import BreathingExerciseScreen from './src/screens/BreathingExerciseScreen';
import PersonalizedProgramScreen from './src/screens/PersonalizedProgramScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';
import SleepMusicScreen from './src/screens/SleepMusicScreen';
import PremiumScreen from './src/screens/PremiumScreen';
import PremiumAssessmentScreen from './src/screens/PremiumAssessmentScreen';
import PremiumProgramScreen from './src/screens/PremiumProgramScreen';
import PremiumBreathingScreen from './src/screens/PremiumBreathingScreen';

import PremiumRemindersScreen from './src/screens/PremiumRemindersScreen';


const Stack = createStackNavigator();

function AppContent() {
  const { isAuthenticated } = useContext(AuthContext);
  useEffect(() => {
    // Initialize RevenueCat SDK
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    if (Platform.OS === 'ios') {
      Purchases.configure({apiKey: 'appl_GDbhAIUscrdZZnueZSoavuyGbnr'});
    }

    // Safe initialize IAP (iOS-only). If key is missing, it safely no-ops.
    initializeIAP();
  }, []);

  return (
          <NavigationContainer>
            <Stack.Navigator 
        initialRouteName={isAuthenticated ? "Home" : "Welcome"}
              screenOptions={{
                headerStyle: {
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  borderBottomWidth: 0,
                },
                headerTintColor: '#F5F5DC',
                headerTitleStyle: {
                  color: '#F5F5DC',
                  fontSize: 18,
                  fontWeight: '600',
                },
              }}
            >
        {/* Auth screens - her zaman erişilebilir */}
        <Stack.Screen 
          name="Welcome" 
          component={WelcomeScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ 
            title: 'Buhu',
            headerTransparent: true,
            headerLeft: () => null, // Geri tuşunu gizle
            gestureEnabled: false, // Geri gesture'ını devre dışı bırak
          }}
        />
        
        {isAuthenticated && (
                // App screens
                <>
            <Stack.Screen 
              name="Assessment" 
              component={AssessmentScreen} 
              options={{ 
                title: 'Değerlendirme',
                headerTransparent: true,
              }}
                  />
                  <Stack.Screen 
                    name="BreathingExercise" 
                    component={BreathingExerciseScreen} 
              options={{ 
                title: 'Egzersiz',
                headerTransparent: true,
              }}
            />
            <Stack.Screen 
              name="PersonalizedProgram" 
              component={PersonalizedProgramScreen} 
              options={{ 
                title: 'Kişisel Program',
                headerTransparent: true,
              }}
                  />
                  <Stack.Screen 
                    name="Settings" 
                    component={SettingsScreen} 
              options={{ 
                title: 'Ayarlar',
                headerTransparent: true,
              }}
                  />
                  <Stack.Screen 
                    name="NotificationSettings" 
                    component={NotificationSettingsScreen} 
              options={{ 
                title: 'Bildirim Ayarları',
                headerTransparent: true,
              }}
            />
            <Stack.Screen 
              name="Premium" 
              component={PremiumScreen} 
              options={{ 
                title: 'Premium',
                headerTransparent: true,
              }}
            />
            <Stack.Screen 
              name="SleepMusic" 
              component={SleepMusicScreen} 
              options={{ 
                title: 'Sakinleştirici Müzikler',
                headerTransparent: true,
              }}
            />
            <Stack.Screen 
              name="PremiumAssessment" 
              component={PremiumAssessmentScreen} 
              options={{ 
                title: 'Premium Değerlendirme',
                headerTransparent: true,
              }}
            />
            <Stack.Screen 
              name="PremiumProgram" 
              component={PremiumProgramScreen} 
              options={{ 
                title: 'Premium Program',
                headerTransparent: true,
              }}
            />
            <Stack.Screen 
              name="PremiumBreathing" 
              component={PremiumBreathingScreen} 
              options={{ 
                title: 'Premium Nefes Teknikleri',
                headerTransparent: true,
              }}
                  />

                  <Stack.Screen 
              name="PremiumReminders" 
              component={PremiumRemindersScreen} 
              options={{ 
                title: 'Premium Hatırlatıcılar',
                headerTransparent: true,
              }}
                  />

                </>
              )}
            </Stack.Navigator>
          </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      </ThemeProvider>
  );
}
