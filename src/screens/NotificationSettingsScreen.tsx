import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { COLORS, FONTS } from '../constants/typography';
import { notificationService } from '../utils/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// KALICI STATE TANIMLARI
const WAKE_KEY = 'wake_time';
const SLEEP_KEY = 'sleep_time';

export default function NotificationSettingsScreen() {
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
    await AsyncStorage.setItem(WAKE_KEY, wakeTime.toISOString());
    await AsyncStorage.setItem(SLEEP_KEY, sleepTime.toISOString());
    // Sabah bildirimi planla
    await notificationService.scheduleDailyReminder(wakeTime.getHours(), wakeTime.getMinutes());
    // Akşam bildirimi planla (uyku saatinden 1 saat önce)
    let hour = sleepTime.getHours() - 1;
    let minute = sleepTime.getMinutes();
    if (hour < 0) { hour = 23; }
    await notificationService.scheduleMotivationalReminders();
    await notificationService.scheduleDailyReminder(hour, minute);
  };

  if (loading) {
    return <View style={[styles.container, { backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center' }]}><Text style={{ color: themeColors.text }}>Yükleniyor...</Text></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }] }>
      <Text style={[styles.title, { color: themeColors.text }]}>Uyku Ayarları</Text>
          <View style={styles.settingItem}>
        <Text style={[styles.label, { color: themeColors.text }]}>Uyanma Saati</Text>
        <View>
          <TouchableOpacity onPress={() => setShowWakePicker(!showWakePicker)} style={styles.timeButton}>
            <Text style={[styles.timeText, { color: themeColors.primary }]}> {wakeTime.getHours().toString().padStart(2, '0')}:{wakeTime.getMinutes().toString().padStart(2, '0')}</Text>
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
          <View style={styles.settingItem}>
        <Text style={[styles.label, { color: themeColors.text }]}>Uyku Saati</Text>
        <View>
          <TouchableOpacity onPress={() => setShowSleepPicker(!showSleepPicker)} style={styles.timeButton}>
            <Text style={[styles.timeText, { color: themeColors.primary }]}> {sleepTime.getHours().toString().padStart(2, '0')}:{sleepTime.getMinutes().toString().padStart(2, '0')}</Text>
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
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Kaydet</Text>
      </TouchableOpacity>
      <Text style={[styles.info, { color: themeColors.textSecondary }]}>Belirlediğiniz saatlere göre sabah ve akşam otomatik bildirim gönderilecektir.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Tahoma',
    marginBottom: 24,
    textAlign: 'center',
  },
  settingItem: {
    marginBottom: 32,
    alignItems: 'center',
  },
  label: {
    fontSize: 18,
    fontFamily: 'Tahoma',
    marginBottom: 8,
  },
  timeButton: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 20,
    fontFamily: 'Tahoma',
  },
  info: {
    fontSize: 14,
    fontFamily: 'Tahoma',
    textAlign: 'center',
    marginTop: 32,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontFamily: 'Tahoma',
  },
}); 