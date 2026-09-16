import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/auth/auth.store';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '../src/theme/theme';

export default function Index() {
  const { isAuthenticated, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
