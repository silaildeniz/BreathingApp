import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

let hapticEnabledCache: boolean = true;

// Startup: hydrate cache
AsyncStorage.getItem('haptic_enabled')
  .then(v => {
    if (v === 'true') hapticEnabledCache = true;
    if (v === 'false') hapticEnabledCache = false;
  })
  .catch(() => {});

export const setHapticEnabled = async (enabled: boolean) => {
  hapticEnabledCache = enabled;
  try { await AsyncStorage.setItem('haptic_enabled', enabled ? 'true' : 'false'); } catch {}
};

// Haptic Feedback Types
export enum HapticType {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  SELECTION = 'selection',
}



// Haptic Feedback Utility
export class HapticFeedback {
  // Light impact (for subtle interactions)
  static light() {
    try {
      if (!hapticEnabledCache) return;
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  }

  // Medium impact (for button presses)
  static medium() {
    try {
      if (!hapticEnabledCache) return;
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  }

  // Heavy impact (for important actions)
  static heavy() {
    try {
      if (!hapticEnabledCache) return;
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  }

  // Success notification
  static success() {
    try {
      if (!hapticEnabledCache) return;
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  }

  // Warning notification
  static warning() {
    try {
      if (!hapticEnabledCache) return;
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  }

  // Error notification
  static error() {
    try {
      if (!hapticEnabledCache) return;
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  }

  // Selection change
  static selection() {
    try {
      if (!hapticEnabledCache) return;
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        Haptics.selectionAsync();
      }
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  }

  // Breathing exercise specific haptics
  static breathingIn() {
    this.light();
  }

  static breathingOut() {
    this.medium();
  }

  static exerciseComplete() {
    this.success();
  }

  static exerciseStart() {
    this.heavy();
  }

  // Generic haptic trigger
  static trigger(type: HapticType) {
    switch (type) {
      case HapticType.LIGHT:
        this.light();
        break;
      case HapticType.MEDIUM:
        this.medium();
        break;
      case HapticType.HEAVY:
        this.heavy();
        break;
      case HapticType.SUCCESS:
        this.success();
        break;
      case HapticType.WARNING:
        this.warning();
        break;
      case HapticType.ERROR:
        this.error();
        break;
      case HapticType.SELECTION:
        this.selection();
        break;
      default:
        this.light();
    }
  }
}

// Convenience function for easier import
export const triggerHapticFeedback = (type: HapticType) => {
  HapticFeedback.trigger(type);
}; 