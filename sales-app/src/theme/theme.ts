export const theme = {
  colors: {
    // Brand Colors
    primary: '#2563EB',       // Electric Blue 600
    primaryLight: '#3B82F6',  // Blue 500
    primaryDark: '#1D4ED8',   // Blue 700
    primarySoft: 'rgba(37, 99, 235, 0.15)',
    primaryGlow: 'rgba(59, 130, 246, 0.25)',

    // Accents
    accentAmber: '#F59E0B',
    accentAmberSoft: 'rgba(245, 158, 11, 0.15)',
    accentEmerald: '#10B981',
    accentEmeraldSoft: 'rgba(16, 185, 129, 0.15)',
    accentRose: '#EF4444',
    accentRoseSoft: 'rgba(239, 68, 68, 0.15)',

    // Dark Backgrounds
    background: '#0B0F19',      // Ultra deep obsidian
    surface: '#111827',         // Card/Container background
    surfaceElevated: '#1E293B', // Elevated card / dropdown
    surfaceHighlight: '#334155',// Subtle hover/press highlight
    border: '#1E293B',          // Subtle border
    borderFocused: '#3B82F6',   // Focused border

    // Typography
    textPrimary: '#F8FAFC',     // Bright white text
    textSecondary: '#94A3B8',   // Slate secondary text
    textMuted: '#64748B',       // Muted helper text
    textOnPrimary: '#FFFFFF',

    // Status
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#38BDF8',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 26,
    xxxl: 32,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },
};

export type Theme = typeof theme;
