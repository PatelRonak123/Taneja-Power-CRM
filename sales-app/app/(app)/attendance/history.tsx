import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  CalendarCheck,
  Clock,
  CheckCircle2,
  Calendar,
  MapPin,
} from 'lucide-react-native';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { useAttendanceHistory } from '../../../src/hooks/useAttendance';
import { theme } from '../../../src/theme/theme';
import { formatDate, formatTime, formatDuration } from '../../../src/utils/date';
import { AttendanceRecord } from '../../../src/types/attendance.types';

export default function AttendanceHistoryScreen() {
  const router = useRouter();
  const { data: records, isLoading, isRefetching, refetch, error } = useAttendanceHistory();

  const formatCoords = (lat?: string | null, lng?: string | null) => {
    if (!lat || !lng) return null;
    const nLat = parseFloat(lat);
    const nLng = parseFloat(lng);
    if (isNaN(nLat) || isNaN(nLng)) return `${lat}, ${lng}`;
    const latDir = nLat >= 0 ? 'N' : 'S';
    const lngDir = nLng >= 0 ? 'E' : 'W';
    return `${Math.abs(nLat).toFixed(4)}° ${latDir}, ${Math.abs(nLng).toFixed(4)}° ${lngDir}`;
  };

  const renderAttendanceCard = ({ item }: { item: AttendanceRecord }) => (
    <Card style={styles.recordCard}>
      <View style={styles.cardHeader}>
        <View style={styles.dateBox}>
          <Calendar size={16} color={theme.colors.primaryLight} />
          <Text style={styles.dateText}>{formatDate(item.attendanceDate)}</Text>
        </View>
        <Badge
          label={item.status === 'CHECKED_OUT' ? 'COMPLETED' : 'CHECKED IN'}
          variant={item.status === 'CHECKED_OUT' ? 'primary' : 'success'}
          size="sm"
        />
      </View>

      <View style={styles.timesGrid}>
        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>Check-In</Text>
          <Text style={styles.timeValue}>{formatTime(item.checkInAt)}</Text>
          {item.checkInLatitude && item.checkInLongitude ? (
            <View style={styles.gpsRow}>
              <MapPin size={10} color={theme.colors.primaryLight} />
              <Text style={styles.gpsText} numberOfLines={1}>
                {formatCoords(item.checkInLatitude, item.checkInLongitude)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>Check-Out</Text>
          <Text style={styles.timeValue}>
            {item.checkOutAt ? formatTime(item.checkOutAt) : '—'}
          </Text>
          {item.checkOutLatitude && item.checkOutLongitude ? (
            <View style={styles.gpsRow}>
              <MapPin size={10} color={theme.colors.accentAmber} />
              <Text style={styles.gpsText} numberOfLines={1}>
                {formatCoords(item.checkOutLatitude, item.checkOutLongitude)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>Duration</Text>
          <Text style={styles.timeValue}>{formatDuration(item.totalMinutes)}</Text>
        </View>
      </View>

      {item.notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesText} numberOfLines={2}>
            {item.notes}
          </Text>
        </View>
      ) : null}
    </Card>
  );

  return (
    <ScreenContainer>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance History</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={records || []}
        keyExtractor={(item) => item.id}
        renderItem={renderAttendanceCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primaryLight}
            colors={[theme.colors.primaryLight]}
          />
        }
        ListEmptyComponent={() => {
          if (isLoading) {
            return (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={theme.colors.primaryLight} />
                <Text style={styles.centerText}>Loading attendance records...</Text>
              </View>
            );
          }

          if (error) {
            return (
              <Card style={styles.errorBox}>
                <Text style={styles.errorTitle}>Unable to load history</Text>
                <Text style={styles.errorSubtitle}>
                  Please pull down to refresh or check your internet connection.
                </Text>
              </Card>
            );
          }

          return (
            <Card style={styles.emptyBox}>
              <CalendarCheck size={36} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No Attendance Records</Text>
              <Text style={styles.emptySubtitle}>
                No historical attendance records have been registered for your account.
              </Text>
            </Card>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  recordCard: {
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  timesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceElevated,
    paddingTop: theme.spacing.sm,
  },
  timeBox: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  timeValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  gpsText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: theme.colors.textMuted,
  },
  notesBox: {
    marginTop: theme.spacing.sm,
    padding: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.sm,
  },
  notesText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  centerBox: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  errorBox: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.accentRoseSoft,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: '#FECDD3',
  },
  errorSubtitle: {
    fontSize: theme.fontSize.xs,
    color: '#FDA4AF',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyBox: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
