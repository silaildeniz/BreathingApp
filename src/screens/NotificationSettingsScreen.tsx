import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ImageBackground, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { COLORS, FONTS, standardTextStyles } from '../constants/typography';
import { notificationService } from '../utils/notificationService';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../App';

// KALICI STATE TANIMLARI
const WAKE_KEY = 'wake_time';
const SLEEP_KEY = 'sleep_time';

type NotificationSettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'NotificationSettings'>;

export default function NotificationSettingsScreen() {
  const navigation = useNavigation<NotificationSettingsScreenNavigationProp>();
  const { themeColors } = useTheme();
  const [wakeTime, setWakeTime] = useState(new Date(2023, 0, 1, 7, 0));
  const [sleepTime, setSleepTime] = useState(new Date(2023, 0, 1, 23, 0));
  const [showWakePicker, setShowWakePicker] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const wakeStr = await AsyncStorage.getItem(WAKE_KEY);
        const sleepStr = await AsyncStorage.getItem(SLEEP_KEY);
        if (wakeStr) setWakeTime(new Date(wakeStr));
        if (sleepStr) setSleepTime(new Date(sleepStr));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onWakeTimeChange = (event: any, selectedDate?: Date) => {
    setShowWakePicker(false);
    if (selectedDate) setWakeTime(selectedDate);
  };

  const onSleepTimeChange = (event: any, selectedDate?: Date) => {
    setShowSleepPicker(false);
    if (selectedDate) setSleepTime(selectedDate);
  };

  const handleSave = async () => {
    try {
      // İzin yoksa iste
      const perm = await Notifications.getPermissionsAsync();
      if (perm.status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        if (req.status !== 'granted') {
          Alert.alert('İzin Gerekli', 'Bildirim izni verilmedi. Ayarlar’dan izin verebilirsiniz.');
          return;
        }
      }

      await AsyncStorage.setItem(WAKE_KEY, wakeTime.toISOString());
      await AsyncStorage.setItem(SLEEP_KEY, sleepTime.toISOString());

      // Uyanıştan 1 saat sonra ve uykudan 1 saat önce hatırlat
      const morningHour = (wakeTime.getHours() + 1) % 24;
      const morningMinute = wakeTime.getMinutes();
      const beforeSleepHour = (sleepTime.getHours() - 1 + 24) % 24;
      const beforeSleepMinute = sleepTime.getMinutes();

      await notificationService.scheduleDualDailyReminders(
        morningHour,
        morningMinute,
        beforeSleepHour,
        beforeSleepMinute
      );
      
      // Kaydedildi uyarısı göster ve ana sayfaya dön
      Alert.alert(
        'Başarılı',
        'Bildirim ayarları kaydedildi!',
        [
          {
            text: 'Tamam',
            onPress: () => navigation.navigate('Home')
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        'Hata',
        'Ayarlar kaydedilirken bir hata oluştu.',
        [{ text: 'Tamam' }]
      );
    }
  };

  if (loading) {
    return (
      <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover">
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[standardTextStyles.bodyLarge, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Yükleniyor...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/backgrounds/arkaplan.jpg')} style={{ flex: 1 }} resizeMode="cover">
      <ScrollView style={{ flex: 1, backgroundColor: 'transparent' }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <Text style={[standardTextStyles.mainTitle, { color: '#F5F5DC', marginBottom: 24, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Uyku Ayarları</Text>
          <View style={[styles.settingItem, { backgroundColor: 'rgba(245, 245, 220, 0.1)', borderColor: '#DDD', borderWidth: 1, borderRadius: 12, padding: 16 }]}>
            <Text style={[standardTextStyles.label, { color: '#F5F5DC', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Uyanma Saati</Text>
            <View>
              <TouchableOpacity onPress={() => setShowWakePicker(!showWakePicker)} style={[styles.timeButton, { backgroundColor: 'rgba(245, 245, 220, 0.15)' }]}>
                <Text style={[standardTextStyles.bodyLarge, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}> {wakeTime.getHours().toString().padStart(2, '0')}:{wakeTime.getMinutes().toString().padStart(2, '0')}</Text>
              </TouchableOpacity>
              {showWakePicker && (
                <DateTimePicker
                  value={wakeTime}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  onChange={onWakeTimeChange}
                  style={{ alignSelf: 'center' }}
                />
              )}
            </View>
          </View>
          <View style={[styles.settingItem, { backgroundColor: 'rgba(245, 245, 220, 0.1)', borderColor: '#DDD', borderWidth: 1, borderRadius: 12, padding: 16 }]}>
            <Text style={[standardTextStyles.label, { color: '#F5F5DC', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Uyku Saati</Text>
            <View>
              <TouchableOpacity onPress={() => setShowSleepPicker(!showSleepPicker)} style={[styles.timeButton, { backgroundColor: 'rgba(245, 245, 220, 0.15)' }]}>
                <Text style={[standardTextStyles.bodyLarge, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}> {sleepTime.getHours().toString().padStart(2, '0')}:{sleepTime.getMinutes().toString().padStart(2, '0')}</Text>
              </TouchableOpacity>
              {showSleepPicker && (
                <DateTimePicker
                  value={sleepTime}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  onChange={onSleepTimeChange}
                  style={{ alignSelf: 'center' }}
                />
              )}
            </View>
          </View>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: 'rgba(245, 245, 220, 0.15)' }]} onPress={handleSave}>
            <Text style={[standardTextStyles.buttonLarge, { color: '#F5F5DC', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Kaydet</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: 'transparent',
  },
  title: {
    ...standardTextStyles.mainTitle,
    color: '#F5F5DC',
    marginBottom: 24,
    textAlign: 'center',
  },
  settingItem: {
    marginBottom: 32,
    alignItems: 'center',
  },
  label: {
    ...standardTextStyles.label,
    color: '#F5F5DC',
    marginBottom: 8,
  },
  timeButton: {
    borderRadius: 16,
    padding: 18,
    backgroundColor: 'rgba(245, 245, 220, 0.15)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    shadowColor: 'transparent',
  },
  timeText: {
    ...standardTextStyles.bodyLarge,
    color: '#F5F5DC',
  },
  info: {
    ...standardTextStyles.bodySmall,
    color: '#F5F5DC',
    textAlign: 'center',
    marginTop: 32,
  },
  saveButton: {
    backgroundColor: 'rgba(245, 245, 220, 0.15)',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  saveButtonText: {
    ...standardTextStyles.buttonLarge,
    color: COLORS.white,
  },
}); 