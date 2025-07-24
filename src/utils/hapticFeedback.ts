import * as Haptics from 'expo-haptics';

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  }

  // Medium impact (for button presses)
  static medium() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  }

  // Heavy impact (for important actions)
  static heavy() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  }

  // Success notification
  static success() {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  }

  // Warning notification
  static warning() {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  }

  // Error notification
  static error() {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  }

  // Selection change
  static selection() {
    try {
      Haptics.selectionAsync();
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