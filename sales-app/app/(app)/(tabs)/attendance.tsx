import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  Info,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react-native';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { useTodayAttendance } from '../../../src/hooks/useAttendance';
import { theme } from '../../../src/theme/theme';
import { formatDate, formatTime, formatDuration } from '../../../src/utils/date';

export default function AttendanceScreen() {
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch, error } = useTodayAttendance();

  const todayRecord = data?.todayRecord;
  const status = data?.status || 'NOT_CHECKED_IN';

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'CHECKED_IN':
        return <Badge label="CHECKED IN" variant="success" size="md" />;
      case 'CHECKED_OUT':
        return <Badge label="CHECKED OUT" variant="primary" size="md" />;
      default:
        return <Badge label="NOT CHECKED IN" variant="neutral" size="md" />;
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primaryLight}
            colors={[theme.colors.primaryLight]}
          />
        }
      >
        {/* Screen Header */}
        <View style={styles.headerBox}>
          <Text style={styles.screenTitle}>Daily Attendance</Text>
          <Text style={styles.screenSubtitle}>
            {formatDate(data?.date || new Date().toISOString())}
          </Text>
        </View>

        {/* Status Card */}
        <Card elevated style={styles.statusCard}>
          <View style={styles.statusCardHeader}>
            <View style={styles.statusIconBox}>
              <CalendarCheck size={24} color={theme.colors.primaryLight} />
            </View>
            <View style={styles.statusTitleBox}>
              <Text style={styles.statusLabel}>Today's Status</Text>
              <Text style={styles.statusText}>
                {status === 'CHECKED_IN'
                  ? 'Currently on duty'
                  : status === 'CHECKED_OUT'
                  ? 'Shift completed for today'
                  : 'No attendance recorded today'}
              </Text>
            </View>
          </View>

          <View style={styles.statusBadgeRow}>
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primaryLight} />
            ) : (
              getStatusBadge(status)
            )}
          </View>

          {/* Timestamps Breakdown */}
          {todayRecord ? (
            <View style={styles.timestampsGrid}>
              <View style={styles.timestampItem}>
                <Clock size={16} color={theme.colors.primaryLight} />
                <View>
                  <Text style={styles.timeLabel}>Check-In Time</Text>
                  <Text style={styles.timeValue}>{formatTime(todayRecord.checkInAt)}</Text>
                </View>
              </View>

              {todayRecord.checkOutAt ? (
                <View style={styles.timestampItem}>
                  <Clock size={16} color={theme.colors.accentAmber} />
                  <View>
                    <Text style={styles.timeLabel}>Check-Out Time</Text>
                    <Text style={styles.timeValue}>{formatTime(todayRecord.checkOutAt)}</Text>
                  </View>
                </View>
              ) : null}

              {todayRecord.totalMinutes ? (
                <View style={styles.timestampItem}>
                  <CheckCircle2 size={16} color={theme.colors.accentEmerald} />
                  <View>
                    <Text style={styles.timeLabel}>Total Duration</Text>
                    <Text style={styles.timeValue}>{formatDuration(todayRecord.totalMinutes)}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {todayRecord?.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{todayRecord.notes}</Text>
            </View>
          ) : null}
        </Card>

        {/* History Navigation Card */}
        <Card style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <History size={20} color={theme.colors.primaryLight} />
            <Text style={styles.historyTitle}>Attendance History</Text>
          </View>
          <Text style={styles.historySubtitle}>
            View past daily attendance records, clock-in times, and verified durations.
          </Text>
          <Button
            title="View Attendance History"
            variant="secondary"
            icon={<History size={16} color={theme.colors.textPrimary} />}
            onPress={() => router.push('/(app)/attendance/history')}
            style={styles.historyButton}
          />
        </Card>

        {/* Policy & Separation Notice */}
        <Card style={styles.noticeCard}>
          <View style={styles.noticeHeader}>
            <Info size={18} color={theme.colors.info} />
            <Text style={styles.noticeTitle}>Operational Guidelines</Text>
          </View>
          <Text style={styles.noticeBody}>
            • Attendance and task management are independent workflows. Checking in does not automatically start a task, and checking out does not close open tasks.
          </Text>
          <Text style={styles.noticeBody}>
            • Server-validated timestamps and location telemetry are recorded during clock-in/out.
          </Text>
        </Card>
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
  statusCard: {
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  statusIconBox: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitleBox: {
    flex: 1,
  },
  statusLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  statusBadgeRow: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'flex-start',
  },
  timestampsGrid: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceElevated,
  },
  timestampItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  timeLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  timeValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: 1,
  },
  notesBox: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.sm,
  },
  notesLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: theme.fontWeight.bold,
  },
  notesText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  historyCard: {
    borderColor: theme.colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  historyTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  historySubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  historyButton: {
    width: '100%',
  },
  noticeCard: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    padding: theme.spacing.md,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noticeTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  noticeBody: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
});
