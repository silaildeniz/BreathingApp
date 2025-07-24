import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChange, getCurrentUser } from './src/services/authService';
import { AuthContext } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';

import HomeScreen from './src/screens/HomeScreen';
import BreathingExerciseScreen from './src/screens/BreathingExerciseScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AssessmentScreen from './src/screens/AssessmentScreen';
import PersonalizedProgramScreen from './src/screens/PersonalizedProgramScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Home: undefined;
  BreathingExercise: { 
    technique: string;
    duration?: string;
    title?: string;
    description?: string;
  };
  Settings: undefined;
  NotificationSettings: undefined;
  Assessment: undefined;
  PersonalizedProgram: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Firebase auth state listener
    const unsubscribe = onAuthStateChange((user) => {
      setIsAuthenticated(!!user);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  const setGuestMode = (guest: boolean) => {
    setIsGuest(guest);
  };

  // Loading state
  if (isAuthenticated === null) {
    return null; // veya loading screen
  }

  const shouldShowApp = isAuthenticated || isGuest;

  return (
    <AuthContext.Provider value={{ isAuthenticated, isGuest, setGuestMode }}>
      <ThemeProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <Stack.Navigator 
              initialRouteName={shouldShowApp ? "Home" : "Welcome"}
              screenOptions={{
                headerStyle: {
                  backgroundColor: '#1a1a2e',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            >
              {!shouldShowApp ? (
                // Auth screens
                <>
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
                </>
              ) : (
                // App screens
                <>
                  <Stack.Screen 
                    name="Home" 
                    component={HomeScreen} 
                    options={{ title: 'Nefes Egzersizi' }}
                  />
                  <Stack.Screen 
                    name="BreathingExercise" 
                    component={BreathingExerciseScreen} 
                    options={{ title: 'Nefes Egzersizi' }}
                  />
                  <Stack.Screen 
                    name="Settings" 
                    component={SettingsScreen} 
                    options={{ title: 'Ayarlar' }}
                  />
                  <Stack.Screen 
                    name="NotificationSettings" 
                    component={NotificationSettingsScreen} 
                    options={{ title: 'Bildirim Ayarları' }}
                  />
                  <Stack.Screen 
                    name="Assessment" 
                    component={AssessmentScreen} 
                    options={{ title: 'Değerlendirme' }}
                  />
                  <Stack.Screen 
                    name="PersonalizedProgram" 
                    component={PersonalizedProgramScreen} 
                    options={{ title: 'Kişisel Program' }}
                  />
                </>
              )}
            </Stack.Navigator>
            <StatusBar style="light" />
          </NavigationContainer>
        </SafeAreaProvider>
      </ThemeProvider>
    </AuthContext.Provider>
  );
}
