import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  ShieldCheck,
  LogOut,
  Server,
  KeyRound,
  CheckCircle2,
} from 'lucide-react-native';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { useAuthStore } from '../../../src/auth/auth.store';
import { theme } from '../../../src/theme/theme';
import { env } from '../../../src/config/env';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to end your current session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Screen Title Header */}
        <View style={styles.headerBox}>
          <Text style={styles.screenTitle}>Employee Profile</Text>
          <Text style={styles.screenSubtitle}>Authorized field staff identity</Text>
        </View>

        {/* Profile Identity Card */}
        <Card elevated style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <User size={36} color={theme.colors.primaryLight} />
            </View>
          </View>

          <Text style={styles.fullName}>{user?.fullName || 'Field Employee'}</Text>
          <Text style={styles.designationText}>
            {user?.designation || 'Field Service & Sales Operations'}
          </Text>

          <View style={styles.badgesRow}>
            <Badge
              label={user?.status || 'ACTIVE'}
              variant={user?.status === 'ACTIVE' ? 'success' : 'neutral'}
              size="md"
            />
            <Badge label={user?.role || 'USER'} variant="primary" size="md" />
          </View>
        </Card>

        {/* Contact & Employee Details */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Contact & Credentials</Text>

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Mail size={18} color={theme.colors.primaryLight} />
              <View style={styles.infoTextBox}>
                <Text style={styles.infoLabel}>Corporate Email</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Phone size={18} color={theme.colors.primaryLight} />
              <View style={styles.infoTextBox}>
                <Text style={styles.infoLabel}>Contact Number</Text>
                <Text style={styles.infoValue}>{user?.phone || '+91 (Company Assigned)'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Briefcase size={18} color={theme.colors.primaryLight} />
              <View style={styles.infoTextBox}>
                <Text style={styles.infoLabel}>Designation</Text>
                <Text style={styles.infoValue}>{user?.designation || 'Sales Representative'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <KeyRound size={18} color={theme.colors.primaryLight} />
              <View style={styles.infoTextBox}>
                <Text style={styles.infoLabel}>Account Reference ID</Text>
                <Text style={styles.infoValue}>#{user?.id ? user.id.slice(0, 12) : '—'}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Security & Token Storage Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.securityHeader}>
            <ShieldCheck size={18} color={theme.colors.accentEmerald} />
            <Text style={styles.sectionHeading}>Security Architecture</Text>
          </View>

          <View style={styles.securityItems}>
            <View style={styles.securityRow}>
              <CheckCircle2 size={16} color={theme.colors.success} />
              <Text style={styles.securityRowText}>Tokens encrypted in hardware SecureStore</Text>
            </View>
            <View style={styles.securityRow}>
              <CheckCircle2 size={16} color={theme.colors.success} />
              <Text style={styles.securityRowText}>Automated 401 refresh token rotation queue</Text>
            </View>
            <View style={styles.securityRow}>
              <Server size={16} color={theme.colors.info} />
              <Text style={styles.securityRowText}>Backend: {env.API_BASE_URL}</Text>
            </View>
          </View>
        </Card>

        {/* Sign Out Action */}
        <Button
          title={isLoggingOut ? 'Signing out...' : 'Sign Out of Account'}
          variant="danger"
          size="md"
          icon={<LogOut size={18} color="#FFFFFF" />}
          loading={isLoggingOut}
          onPress={handleLogout}
          style={styles.logoutButton}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  headerBox: {
    marginBottom: theme.spacing.xs,
  },
  screenTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  screenSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  avatarWrapper: {
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 2,
    borderColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullName: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  designationText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginBottom: theme.spacing.md,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionCard: {
    borderColor: theme.colors.border,
  },
  sectionHeading: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.md,
  },
  infoList: {
    gap: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm + 2,
  },
  infoTextBox: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  securityItems: {
    gap: 8,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securityRowText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  logoutButton: {
    marginTop: theme.spacing.xs,
  },
});
