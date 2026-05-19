// iOS Human Interface Guidelines palette, extended for Diskwento

export const Colors = {
  // Brand
  accent: '#007AFF',       // iOS blue — primary actions
  ios_blue: '#007AFF',     // alias — explicit iOS blue for interactive elements
  accentLight: '#E5F1FF',  // tinted backgrounds

  // Semantic
  success: '#34C759',      // green
  warning: '#FF9500',      // orange
  danger: '#FF3B30',       // red

  // PWD / Senior badge colours
  pwd: '#5856D6',          // purple — PWD identity
  senior: '#FF9500',       // orange — Senior identity

  // Neutrals (light mode)
  background: '#F2F2F7',   // iOS grouped background
  surface: '#FFFFFF',      // card / sheet surface
  surfaceSecondary: '#F2F2F7',

  text: '#000000',
  textSecondary: '#3C3C43', // iOS label secondary (opacity 0.6 equiv)
  textTertiary: '#3C3C4399',
  placeholder: '#C7C7CC',

  // Separators
  separator: '#C6C6C8',
  separatorOpaque: '#E5E5EA',

  // Structured light / dark themes (used by screens via useColorScheme)
  light: {
    background: '#F2F2F7',
    card: '#FFFFFF',
    text: '#1C1C1E',
    secondary: '#6C6C70',
    separator: 'rgba(60,60,67,0.12)',
  },
  dark: {
    background: '#000000',
    card: '#1C1C1E',
    text: '#FFFFFF',
    secondary: '#8E8E93',
    separator: 'rgba(84,84,88,0.65)',
    // legacy flat-token equivalents
    surface: '#1C1C1E',
    surfaceSecondary: '#2C2C2E',
    textSecondary: '#8E8E93',
    separatorOpaque: '#2C2C2E',
  },
} as const;

export type ColorKey = keyof typeof Colors;
