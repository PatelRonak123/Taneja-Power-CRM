import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../../theme/theme';

export interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: Edge[];
  scrollable?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  edges = ['top', 'left', 'right'],
}) => {
  return (
    <SafeAreaView edges={edges} style={styles.safeArea}>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      <View style={[styles.container, style]}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
