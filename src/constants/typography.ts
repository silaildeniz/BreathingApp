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

// Standardized text styles for consistent use across screens
export const standardTextStyles = {
  // Main titles (screen headers)
  mainTitle: {
    fontFamily: 'Tahoma',
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  
  // Section titles
  sectionTitle: {
    fontFamily: 'Tahoma',
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  
  // Card titles
  cardTitle: {
    fontFamily: 'Tahoma',
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 30,
    letterSpacing: 1,
  },
  
  // Body text
  bodyLarge: {
    fontFamily: 'Tahoma',
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  
  bodyMedium: {
    fontFamily: 'Tahoma',
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0,
  },
  
  bodySmall: {
    fontFamily: 'Tahoma',
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  
  // Button text
  buttonLarge: {
    fontFamily: 'Tahoma',
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: 0.5,
  },
  
  buttonMedium: {
    fontFamily: 'Tahoma',
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.5,
  },
  
  buttonSmall: {
    fontFamily: 'Tahoma',
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 18,
    letterSpacing: 0.5,
  },
  
  // Caption text
  caption: {
    fontFamily: 'Tahoma',
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  
  // Label text
  label: {
    fontFamily: 'Tahoma',
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 18,
    letterSpacing: 0.25,
  },
}; 