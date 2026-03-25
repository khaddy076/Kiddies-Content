export const colors = {
  primary: '#6C63FF',
  primaryLight: '#A89CFF',
  primaryDark: '#4B44CC',
  secondary: '#FF6B6B',
  secondaryLight: '#FF9E9E',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F3F4F6',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  border: '#E5E7EB',
  borderDark: '#D1D5DB',
  overlay: 'rgba(0,0,0,0.5)',
  // Status colors
  pending: '#F59E0B',
  approved: '#10B981',
  denied: '#EF4444',
  expired: '#9CA3AF',
} as const;

export const typography = {
  xs: 10,
  sm: 12,
  base: 14,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;

export const theme = {
  colors,
  typography,
  fontWeight,
  spacing,
  borderRadius,
  shadows,
} as const;

export type Theme = typeof theme;
