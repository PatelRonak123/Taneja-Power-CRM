import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, X } from 'lucide-react-native';
import { theme } from '../../theme/theme';

export interface ErrorMessageProps {
  message: string | null;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <View style={styles.container}>
      <AlertCircle size={20} color={theme.colors.error} style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
      {onDismiss ? (
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentRoseSoft,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 4,
    marginBottom: theme.spacing.md,
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
  text: {
    flex: 1,
    color: '#FECDD3', // Light rose
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    lineHeight: 18,
  },
});
