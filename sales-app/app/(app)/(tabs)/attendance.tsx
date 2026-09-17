import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
  MapPin,
  Navigation,
  RefreshCw,
  Settings,
  LogIn,
  LogOut,
} from 'lucide-react-native';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import {
  useTodayAttendance,
  useCheckIn,
  useCheckOut,
} from '../../../src/hooks/useAttendance';
import {
  LocationService,
  LocationServiceError,
  CapturedLocation,
  LocationErrorCode,
} from '../../../src/services/location.service';
import { theme } from '../../../src/theme/theme';
import { formatDate, formatTime, formatDuration } from '../../../src/utils/date';

export default function AttendanceScreen() {
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useTodayAttendance();
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  // Foreground GPS & Action States
  const [actionLoadingState, setActionLoadingState] = useState<
    'IDLE' | 'ACQUIRING_GPS' | 'SUBMITTING'
  >('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<LocationErrorCode | 'API_ERROR' | null>(null);
  const [lastAction, setLastAction] = useState<'CHECK_IN' | 'CHECK_OUT' | null>(null);

  const todayRecord = data?.todayRecord;
  const status = data?.status || 'NOT_CHECKED_IN';

  const isActionBusy =
    actionLoadingState !== 'IDLE' ||
    checkInMutation.isPending ||
    checkOutMutation.isPending;

  const handleAttendanceAction = async (action: 'CHECK_IN' | 'CHECK_OUT') => {
    if (isActionBusy) return;

    setErrorMessage(null);
    setErrorType(null);
    setLastAction(action);
    setActionLoadingState('ACQUIRING_GPS');

    let capturedLoc: CapturedLocation | null = null;

    try {
      // 1. Acquire current foreground GPS position
      capturedLoc = await LocationService.getCurrentPosition();
    } catch (err: any) {
      setActionLoadingState('IDLE');
      if (err instanceof LocationServiceError) {
        setErrorMessage(err.message);
        setErrorType(err.code);
        if (err.code === 'PERMISSION_PERMANENTLY_DENIED') {
          Alert.alert(
            'Location Permission Required',
            'Location access is permanently disabled for this app. Please open device settings and grant location access to record attendance.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => LocationService.openAppSettings() },
            ]
          );
        }
      } else {
        setErrorMessage('An unexpected error occurred while acquiring GPS location.');
        setErrorType('UNKNOWN');
      }
      return;
    }

    // 2. Submit attendance request to backend with coordinates
    setActionLoadingState('SUBMITTING');
    try {
      if (action === 'CHECK_IN') {
        await checkInMutation.mutateAsync({
          latitude: capturedLoc.latitude,
          longitude: capturedLoc.longitude,
        });
        Alert.alert(
          'Check-In Successful',
          `Your attendance check-in has been verified and recorded at ${formatTime(
            new Date().toISOString()
          )}.`
        );
      } else {
        await checkOutMutation.mutateAsync({
          latitude: capturedLoc.latitude,
          longitude: capturedLoc.longitude,
        });
        Alert.alert(
          'Check-Out Successful',
          `Your attendance check-out has been verified and recorded at ${formatTime(
            new Date().toISOString()
          )}.`
        );
      }
      setActionLoadingState('IDLE');
      setErrorMessage(null);
      setErrorType(null);
    } catch (apiErr: any) {
      setActionLoadingState('IDLE');
      const backendMessage =
        apiErr?.response?.data?.message ||
        apiErr?.message ||
        'Failed to submit attendance record. Please try again.';
      setErrorMessage(backendMessage);
      setErrorType('API_ERROR');
    }
  };

  const formatCoords = (lat?: string | null, lng?: string | null) => {
    if (!lat || !lng) return null;
    const nLat = parseFloat(lat);
    const nLng = parseFloat(lng);
    if (isNaN(nLat) || isNaN(nLng)) return `${lat}, ${lng}`;
    const latDir = nLat >= 0 ? 'N' : 'S';
    const lngDir = nLng >= 0 ? 'E' : 'W';
    return `${Math.abs(nLat).toFixed(4)}° ${latDir}, ${Math.abs(nLng).toFixed(4)}° ${lngDir}`;
  };

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

        {/* Error Banner with Retry */}
        {errorMessage && (
          <Card style={styles.errorCard}>
            <View style={styles.errorHeaderRow}>
              <AlertCircle size={20} color={theme.colors.accentRose} />
              <Text style={styles.errorTitle}>Attendance Action Failed</Text>
            </View>
            <Text style={styles.errorMessageText}>{errorMessage}</Text>
            <View style={styles.errorActionsRow}>
              {lastAction && (
                <Button
                  title="Retry"
                  variant="danger"
                  size="sm"
                  icon={<RefreshCw size={14} color="#FFFFFF" />}
                  onPress={() => handleAttendanceAction(lastAction)}
                  disabled={isActionBusy}
                />
              )}
              {errorType === 'PERMISSION_PERMANENTLY_DENIED' && (
                <Button
                  title="Open Settings"
                  variant="secondary"
                  size="sm"
                  icon={<Settings size={14} color={theme.colors.textPrimary} />}
                  onPress={() => LocationService.openAppSettings()}
                />
              )}
            </View>
          </Card>
        )}

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

          {/* Timestamps and GPS Breakdown */}
          {todayRecord ? (
            <View style={styles.timestampsGrid}>
              {/* Check-in info */}
              <View style={styles.eventBox}>
                <View style={styles.timestampItem}>
                  <Clock size={16} color={theme.colors.primaryLight} />
                  <View>
                    <Text style={styles.timeLabel}>Check-In Time</Text>
                    <Text style={styles.timeValue}>{formatTime(todayRecord.checkInAt)}</Text>
                  </View>
                </View>
                {todayRecord.checkInLatitude && todayRecord.checkInLongitude ? (
                  <View style={styles.gpsChip}>
                    <MapPin size={12} color={theme.colors.primaryLight} />
                    <Text style={styles.gpsChipText}>
                      {formatCoords(todayRecord.checkInLatitude, todayRecord.checkInLongitude)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Check-out info */}
              {todayRecord.checkOutAt ? (
                <View style={[styles.eventBox, styles.eventBoxTopBorder]}>
                  <View style={styles.timestampItem}>
                    <Clock size={16} color={theme.colors.accentAmber} />
                    <View>
                      <Text style={styles.timeLabel}>Check-Out Time</Text>
                      <Text style={styles.timeValue}>{formatTime(todayRecord.checkOutAt)}</Text>
                    </View>
                  </View>
                  {todayRecord.checkOutLatitude && todayRecord.checkOutLongitude ? (
                    <View style={styles.gpsChip}>
                      <MapPin size={12} color={theme.colors.accentAmber} />
                      <Text style={styles.gpsChipText}>
                        {formatCoords(
                          todayRecord.checkOutLatitude,
                          todayRecord.checkOutLongitude
                        )}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Total Duration */}
              {todayRecord.totalMinutes !== null && todayRecord.totalMinutes !== undefined ? (
                <View style={[styles.eventBox, styles.eventBoxTopBorder]}>
                  <View style={styles.timestampItem}>
                    <CheckCircle2 size={16} color={theme.colors.accentEmerald} />
                    <View>
                      <Text style={styles.timeLabel}>Total Duration</Text>
                      <Text style={styles.timeValue}>
                        {formatDuration(todayRecord.totalMinutes)}
                      </Text>
                    </View>
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

        {/* Interactive Action Card */}
        <Card style={styles.actionCard}>
          <Text style={styles.actionCardTitle}>Attendance Action</Text>
          <Text style={styles.actionCardSubtitle}>
            Foreground GPS verification is performed during check-in and check-out to record operational presence.
          </Text>

          {/* Progress Indicator */}
          {actionLoadingState !== 'IDLE' && (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color={theme.colors.primaryLight} />
              <Text style={styles.progressText}>
                {actionLoadingState === 'ACQUIRING_GPS'
                  ? 'Acquiring high-accuracy GPS coordinates...'
                  : 'Submitting attendance record to server...'}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          {status === 'NOT_CHECKED_IN' && (
            <Button
              title={isActionBusy ? 'Processing Check-In...' : 'Check In with GPS'}
              variant="primary"
              size="lg"
              icon={<LogIn size={20} color="#FFFFFF" />}
              onPress={() => handleAttendanceAction('CHECK_IN')}
              loading={isActionBusy}
              disabled={isActionBusy}
              style={styles.actionButton}
            />
          )}

          {status === 'CHECKED_IN' && (
            <Button
              title={isActionBusy ? 'Processing Check-Out...' : 'Check Out with GPS'}
              variant="secondary"
              size="lg"
              icon={<LogOut size={20} color={theme.colors.textPrimary} />}
              onPress={() => handleAttendanceAction('CHECK_OUT')}
              loading={isActionBusy}
              disabled={isActionBusy}
              style={styles.actionButton}
            />
          )}

          {status === 'CHECKED_OUT' && (
            <View style={styles.completedNotice}>
              <ShieldCheck size={20} color={theme.colors.accentEmerald} />
              <Text style={styles.completedNoticeText}>
                Attendance completed for today. No further action is required.
              </Text>
            </View>
          )}
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

        {/* Operational Guidelines Notice */}
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
  errorCard: {
    backgroundColor: theme.colors.accentRoseSoft,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    padding: theme.spacing.md,
  },
  errorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: '#FECDD3',
  },
  errorMessageText: {
    fontSize: theme.fontSize.xs,
    color: '#FDA4AF',
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  errorActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
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
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceElevated,
    gap: theme.spacing.sm,
  },
  eventBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  eventBoxTopBorder: {
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
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
  gpsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  gpsChipText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: theme.colors.textSecondary,
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
  actionCard: {
    borderColor: 'rgba(59, 130, 246, 0.3)',
    backgroundColor: theme.colors.surface,
  },
  actionCardTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  actionCardSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primarySoft,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  progressText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primaryLight,
    fontWeight: theme.fontWeight.medium,
    flex: 1,
  },
  actionButton: {
    width: '100%',
  },
  completedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.accentEmeraldSoft,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  completedNoticeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: '#A7F3D0',
    flex: 1,
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

