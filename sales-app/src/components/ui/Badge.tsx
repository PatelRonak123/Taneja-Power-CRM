import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../../theme/theme';

export interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'sm',
  style,
  textStyle,
}) => {
  return (
    <View style={[styles.badge, styles[variant], styles[`size_${size}`], style]}>
      <Text style={[styles.text, styles[`text_${variant}`], textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  size_sm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  size_md: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  primary: {
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  success: {
    backgroundColor: theme.colors.accentEmeraldSoft,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  warning: {
    backgroundColor: theme.colors.accentAmberSoft,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  error: {
    backgroundColor: theme.colors.accentRoseSoft,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  neutral: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  text: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  text_primary: {
    color: theme.colors.primaryLight,
  },
  text_success: {
    color: theme.colors.accentEmerald,
  },
  text_warning: {
    color: theme.colors.accentAmber,
  },
  text_error: {
    color: theme.colors.accentRose,
  },
  text_neutral: {
    color: theme.colors.textSecondary,
  },
});
