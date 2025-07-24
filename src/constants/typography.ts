// Modern Color Palette
export const COLORS = {
  // Primary Colors
  primary: '#4ECDC4',
  secondary: '#45B7D1',
  accent: '#FF6B6B',
  
  // Background Colors
  background: '#FAFBFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F8F9FA',
  
  // Text Colors
  text: '#1A1A2E',
  textSecondary: '#6C757D',
  textTertiary: '#ADB5BD',
  
  // Status Colors
  success: '#51CF66',
  warning: '#FFD43B',
  error: '#FF6B6B',
  info: '#74C0FC',
  
  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F8F9FA',
    100: '#F1F3F4',
    200: '#E9ECEF',
    300: '#DEE2E6',
    400: '#CED4DA',
    500: '#ADB5BD',
    600: '#6C757D',
    700: '#495057',
    800: '#343A40',
    900: '#212529',
  },
  
  // Overlay Colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

// Font Constants
export const FONTS = {
  regular: 'Tahoma',
  medium: 'Tahoma',
  semibold: 'Tahoma',
  bold: 'Tahoma',
  light: 'Tahoma',
};

// Modern Typography System
export const typography = {
  // Font Families
  fonts: {
    primary: 'Tahoma', // iOS: San Francisco, Android: Roboto
    secondary: 'Tahoma',
    mono: 'Tahoma',
  },

  // Font Sizes
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },

  // Font Weights
  weights: {
    thin: '100' as const,
    extralight: '200' as const,
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
  },

  // Line Heights
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
};

// Typography Styles
export const textStyles = {
  // Display Styles
  display: {
    large: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes['6xl'],
      fontWeight: typography.weights.bold,
      lineHeight: typography.lineHeights.tight,
      letterSpacing: typography.letterSpacing.tight,
    },
    medium: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes['5xl'],
      fontWeight: typography.weights.bold,
      lineHeight: typography.lineHeights.tight,
      letterSpacing: typography.letterSpacing.tight,
    },
    small: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes['4xl'],
      fontWeight: typography.weights.bold,
      lineHeight: typography.lineHeights.tight,
      letterSpacing: typography.letterSpacing.tight,
    },
  },

  // Heading Styles
  heading: {
    h1: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes['3xl'],
      fontWeight: typography.weights.bold,
      lineHeight: typography.lineHeights.tight,
      letterSpacing: typography.letterSpacing.tight,
    },
    h2: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes['2xl'],
      fontWeight: typography.weights.semibold,
      lineHeight: typography.lineHeights.tight,
      letterSpacing: typography.letterSpacing.tight,
    },
    h3: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.semibold,
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.normal,
    },
    h4: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.medium,
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.normal,
    },
  },

  // Body Styles
  body: {
    large: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.normal,
      lineHeight: typography.lineHeights.relaxed,
      letterSpacing: typography.letterSpacing.normal,
    },
    medium: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes.base,
      fontWeight: typography.weights.normal,
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.normal,
    },
    small: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.normal,
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.normal,
    },
    xs: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.normal,
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.wide,
    },
  },

  // Label Styles
  label: {
    large: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes.base,
      fontWeight: typography.weights.medium,
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.wide,
    },
    medium: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.wide,
    },
    small: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.medium,
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.wider,
    },
  },

  // Button Styles
  button: {
    large: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.semibold,
      lineHeight: typography.lineHeights.tight,
      letterSpacing: typography.letterSpacing.wide,
    },
    medium: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes.base,
      fontWeight: typography.weights.semibold,
      lineHeight: typography.lineHeights.tight,
      letterSpacing: typography.letterSpacing.wide,
    },
    small: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.semibold,
      lineHeight: typography.lineHeights.tight,
      letterSpacing: typography.letterSpacing.wide,
    },
  },

  // Caption Styles
  caption: {
    large: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.normal,
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.wide,
    },
    medium: {
      fontFamily: 'Tahoma',
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.normal,
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.wide,
    },
  },
}; 