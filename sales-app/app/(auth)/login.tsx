import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Mail, Lock, Zap, ShieldCheck } from 'lucide-react-native';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { ErrorMessage } from '../../src/components/ui/ErrorMessage';
import { useAuthStore } from '../../src/auth/auth.store';
import { theme } from '../../src/theme/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { login, logout, setError, isLoading, error, clearError } = useAuthStore();

  const validateForm = (): boolean => {
    let isValid = true;
    setEmailError(null);
    setPasswordError(null);
    clearError();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Email address is required');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!validateForm()) return;

    try {
      const authenticatedUser = await login({
        email: email.trim().toLowerCase(),
        password,
      });

      if (
        authenticatedUser?.workType === 'OFFICE' &&
        authenticatedUser?.role !== 'ADMIN' &&
        authenticatedUser?.role !== 'MANAGER'
      ) {
        await logout();
        setError('Access restricted: Office employees must use the Web CRM portal. Access to the Field Mobile App is restricted to FIELD staff.');
        return;
      }
      // On success, RootLayout's NavigationGuard automatically redirects to (app)
    } catch {
      // Error is stored in auth store and presented via ErrorMessage banner
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Brand Header */}
            <View style={styles.brandHeader}>
              <View style={styles.logoBadge}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.brandTextContainer}>
                <Text style={styles.brandTitle}>TANEJA POWER</Text>
                <View style={styles.tagBadge}>
                  <Zap size={12} color={theme.colors.primaryLight} style={styles.tagIcon} />
                  <Text style={styles.tagText}>SALES & FIELD PORTAL</Text>
                </View>
              </View>
            </View>

            {/* Welcome Text */}
            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>Sign in to your account</Text>
              <Text style={styles.heroSubtitle}>
                Enter your authorized credentials to access assigned field tasks, routing, and reporting.
              </Text>
            </View>

            {/* Auth Error Banner */}
            <ErrorMessage message={error} onDismiss={clearError} />

            {/* Form Fields */}
            <View style={styles.formCard}>
              <Input
                label="Corporate Email"
                placeholder="employee@tanejapower.com"
                value={email}
                onChangeText={(text: string) => {
                  setEmail(text);
                  if (emailError) setEmailError(null);
                  if (error) clearError();
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={emailError}
                leftIcon={<Mail size={20} color={theme.colors.textSecondary} />}
              />

              <Input
                label="Password"
                placeholder="••••••••••••"
                value={password}
                onChangeText={(text: string) => {
                  setPassword(text);
                  if (passwordError) setPasswordError(null);
                  if (error) clearError();
                }}
                isPassword
                autoCapitalize="none"
                error={passwordError}
                leftIcon={<Lock size={20} color={theme.colors.textSecondary} />}
              />

              <Button
                title={isLoading ? 'Authenticating...' : 'Sign In'}
                variant="primary"
                size="md"
                loading={isLoading}
                onPress={handleLogin}
                style={styles.submitButton}
              />
            </View>

            {/* Security Guarantee */}
            <View style={styles.securityNotice}>
              <ShieldCheck size={16} color={theme.colors.textMuted} />
              <Text style={styles.securityText}>
                Encrypted enterprise authentication & role isolation
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: theme.spacing.md,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTextContainer: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    letterSpacing: 1.5,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  tagIcon: {
    marginRight: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primaryLight,
    letterSpacing: 1,
  },
  heroSection: {
    marginBottom: theme.spacing.lg,
  },
  heroTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  heroSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  submitButton: {
    marginTop: theme.spacing.xs,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    gap: 6,
  },
  securityText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
});
