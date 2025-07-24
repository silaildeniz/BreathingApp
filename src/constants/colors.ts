// Modern Soft Blue-Green Color Palette
export const colors = {
  // Primary Colors
  primary: {
    50: '#F0F9FF',   // Very light blue
    100: '#E0F2FE',  // Light blue
    200: '#BAE6FD',  // Soft blue
    300: '#7DD3FC',  // Medium blue
    400: '#38BDF8',  // Bright blue
    500: '#0EA5E9',  // Primary blue
    600: '#0284C7',  // Dark blue
    700: '#0369A1',  // Darker blue
    800: '#075985',  // Very dark blue
    900: '#0C4A6E',  // Deep blue
  },

  // Secondary Colors (Green tones)
  secondary: {
    50: '#F0FDF4',   // Very light green
    100: '#DCFCE7',  // Light green
    200: '#BBF7D0',  // Soft green
    300: '#86EFAC',  // Medium green
    400: '#4ADE80',  // Bright green
    500: '#22C55E',  // Primary green
    600: '#16A34A',  // Dark green
    700: '#15803D',  // Darker green
    800: '#166534',  // Very dark green
    900: '#14532D',  // Deep green
  },

  // Accent Colors
  accent: {
    teal: '#14B8A6',     // Teal
    cyan: '#06B6D4',     // Cyan
    emerald: '#10B981',  // Emerald
    sky: '#0EA5E9',      // Sky blue
  },

  // Neutral Colors
  neutral: {
    50: '#F8FAFC',   // Very light gray
    100: '#F1F5F9',  // Light gray
    200: '#E2E8F0',  // Soft gray
    300: '#CBD5E1',  // Medium gray
    400: '#94A3B8',  // Gray
    500: '#64748B',  // Dark gray
    600: '#475569',  // Darker gray
    700: '#334155',  // Very dark gray
    800: '#1E293B',  // Deep gray
    900: '#0F172A',  // Almost black
  },

  // Semantic Colors
  semantic: {
    success: '#10B981',   // Green
    warning: '#F59E0B',   // Amber
    error: '#EF4444',     // Red
    info: '#3B82F6',      // Blue
  },

  // Background Colors
  background: {
    primary: '#F8FAFC',   // Very light blue-gray
    secondary: '#F1F5F9', // Light gray
    tertiary: '#E2E8F0',  // Soft gray
    dark: '#0F172A',      // Dark background
  },

  // Text Colors
  text: {
    primary: '#1E293B',   // Dark text
    secondary: '#475569', // Medium text
    tertiary: '#64748B',  // Light text
    inverse: '#F8FAFC',   // Light text on dark
  },

  // Gradient Colors
  gradients: {
    primary: ['#0EA5E9', '#22C55E'],     // Blue to Green
    secondary: ['#14B8A6', '#3B82F6'],   // Teal to Blue
    warm: ['#F59E0B', '#EF4444'],        // Amber to Red
    cool: ['#8B5CF6', '#06B6D4'],        // Purple to Cyan
  }
};

// Modern Color Scheme
export const theme = {
  light: {
    background: colors.background.primary,
    surface: '#FFFFFF',
    text: colors.text.primary,
    textSecondary: colors.text.secondary,
    primary: colors.primary[500],
    secondary: colors.secondary[500],
    accent: colors.accent.teal,
    border: colors.neutral[200],
    shadow: colors.neutral[300],
  },
  dark: {
    background: colors.background.dark,
    surface: colors.neutral[800],
    text: colors.text.inverse,
    textSecondary: colors.neutral[300],
    primary: colors.primary[400],
    secondary: colors.secondary[400],
    accent: colors.accent.cyan,
    border: colors.neutral[700],
    shadow: colors.neutral[900],
  }
}; 