import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme } from '../../theme/theme';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  ...rest
}) => {
  const isActionDisabled = disabled || loading;

  const containerStyles = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    isActionDisabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.textBase,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    isActionDisabled && styles.textDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isActionDisabled}
      style={containerStyles}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? theme.colors.primary : theme.colors.textOnPrimary}
        />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  primary: {
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  secondary: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  danger: {
    backgroundColor: theme.colors.accentRose,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  size_sm: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 36,
  },
  size_md: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 50,
  },
  size_lg: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    minHeight: 58,
  },
  disabled: {
    opacity: 0.5,
  },
  textBase: {
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
  },
  text_primary: {
    color: theme.colors.textOnPrimary,
  },
  text_secondary: {
    color: theme.colors.textPrimary,
  },
  text_danger: {
    color: theme.colors.textOnPrimary,
  },
  text_outline: {
    color: theme.colors.primaryLight,
  },
  text_ghost: {
    color: theme.colors.textSecondary,
  },
  textSize_sm: {
    fontSize: theme.fontSize.sm,
  },
  textSize_md: {
    fontSize: theme.fontSize.md,
  },
  textSize_lg: {
    fontSize: theme.fontSize.lg,
  },
  textDisabled: {
    color: theme.colors.textMuted,
  },
});
