import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { queryClient } from '../src/api/queryClient';
import { useAuthStore } from '../src/auth/auth.store';
import { theme } from '../src/theme/theme';

import { taskTrackingService } from '../src/services/taskTracking.service';

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized, initializeAuth, user, logout } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isOfficeUser = user?.workType === 'OFFICE' && user?.role !== 'ADMIN' && user?.role !== 'MANAGER';

    if (!isAuthenticated && !inAuthGroup) {
      // Clear active background tracking when unauthenticated / logged out
      taskTrackingService.stopTracking();
      // Redirect unauthenticated users to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      if (isOfficeUser) {
        taskTrackingService.stopTracking();
        logout();
        return;
      }
      // Reconcile background tracking state upon successful authentication
      taskTrackingService.reconcileActiveTracking();
      // Redirect authenticated users into protected app
      router.replace('/(app)/(tabs)');
    } else if (isAuthenticated && !inAuthGroup) {
      if (isOfficeUser) {
        taskTrackingService.stopTracking();
        logout();
        router.replace('/(auth)/login');
        return;
      }
      // Active session check
      taskTrackingService.reconcileActiveTracking();
    }
  }, [isAuthenticated, isInitialized, user, logout, segments, router]);

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationGuard>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
        </NavigationGuard>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
