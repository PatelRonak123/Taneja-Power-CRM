import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Briefcase,
  Clock,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  MapPin,
  Sparkles,
  Wrench,
  Plus,
} from 'lucide-react-native';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { useAuthStore } from '../../../src/auth/auth.store';
import { useMyTasks } from '../../../src/hooks/useTasks';
import { useTodayAttendance } from '../../../src/hooks/useAttendance';
import { useFsrList } from '../../../src/hooks/useFsr';
import { canAccessFSR, canCreateFSR, isFSE } from '../../../src/utils/fsrPermissions';
import { theme } from '../../../src/theme/theme';
import { formatDate, formatTime } from '../../../src/utils/date';
import { TaskItem } from '../../../src/types/task.types';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const {
    data: tasksData,
    isLoading: tasksLoading,
    isRefetching: tasksRefetching,
    refetch: refetchTasks,
    error: tasksError,
  } = useMyTasks();

  const {
    data: attendanceData,
    isLoading: attendanceLoading,
    isRefetching: attendanceRefetching,
    refetch: refetchAttendance,
  } = useTodayAttendance();

  const hasFsr = canAccessFSR(user);
  const canCreateReport = canCreateFSR(user);
  const isEngineer = isFSE(user);

  const {
    data: fsrData,
    isRefetching: fsrRefetching,
    refetch: refetchFsr,
  } = useFsrList({
    assignedEngineerId: isEngineer && user?.role !== 'ADMIN' && user?.role !== 'MANAGER' ? user?.id : undefined,
    limit: 10,
  });

  const fsrReports = fsrData?.reports || [];
  const fsrActiveCount = fsrReports.filter(
    (r) => r.fsr.status === 'IN_PROGRESS' || r.fsr.status === 'DRAFT'
  ).length;
  const fsrCompletedCount = fsrReports.filter(
    (r) => r.fsr.status === 'COMPLETED' || r.fsr.status === 'CLOSED'
  ).length;

  const isRefreshing = tasksRefetching || attendanceRefetching || fsrRefetching;

  const handleRefresh = async () => {
    const promises: Promise<any>[] = [refetchTasks(), refetchAttendance()];
    if (hasFsr) promises.push(refetchFsr());
    await Promise.all(promises);
  };

  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  // Metrics derived from backend response
  const tasks = tasksData?.tasks || [];
  const assignedCount = tasks.filter((t) => t.status === 'ASSIGNED' || t.status === 'CREATED').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;

  const upcomingTasks = tasks.slice(0, 3);

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'primary';
      default:
        return 'neutral';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'warning';
      case 'COMPLETED':
        return 'success';
      case 'ASSIGNED':
        return 'primary';
      case 'CANCELLED':
        return 'error';
      default:
        return 'neutral';
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primaryLight}
            colors={[theme.colors.primaryLight]}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={styles.headerBrand}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.companyTitle}>TANEJA POWER</Text>
              <Text style={styles.dateSubtitle}>{todayFormatted}</Text>
            </View>
          </View>
          <Badge label={user?.role || 'USER'} variant="primary" size="sm" />
        </View>

        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>
            Welcome back, <Text style={styles.greetingName}>{user?.fullName || 'Sales Executive'}</Text>
          </Text>
          <Text style={styles.greetingRole}>
            {user?.designation || 'Field Service & Sales Operations'}
          </Text>
        </View>

        {/* Attendance Status Card */}
        <Card elevated style={styles.attendanceCard}>
          <View style={styles.attendanceHeader}>
            <View style={styles.attendanceIconWrapper}>
              <CalendarCheck size={20} color={theme.colors.primaryLight} />
            </View>
            <View style={styles.attendanceTitleBox}>
              <Text style={styles.attendanceCardTitle}>Daily Attendance</Text>
              <Text style={styles.attendanceCardDate}>{formatDate(attendanceData?.date || new Date().toISOString())}</Text>
            </View>
            {attendanceLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primaryLight} />
            ) : (
              <Badge
                label={
                  attendanceData?.status === 'CHECKED_IN'
                    ? 'CHECKED IN'
                    : attendanceData?.status === 'CHECKED_OUT'
                    ? 'CHECKED OUT'
                    : 'NOT CHECKED IN'
                }
                variant={
                  attendanceData?.status === 'CHECKED_IN'
                    ? 'success'
                    : attendanceData?.status === 'CHECKED_OUT'
                    ? 'primary'
                    : 'neutral'
                }
              />
            )}
          </View>

          {attendanceData?.todayRecord ? (
            <View style={styles.attendanceDetailsGrid}>
              <View style={styles.attendanceDetailItem}>
                <Text style={styles.attendanceDetailLabel}>Check-In Time</Text>
                <Text style={styles.attendanceDetailValue}>
                  {formatTime(attendanceData.todayRecord.checkInAt)}
                </Text>
              </View>
              {attendanceData.todayRecord.checkOutAt ? (
                <View style={styles.attendanceDetailItem}>
                  <Text style={styles.attendanceDetailLabel}>Check-Out Time</Text>
                  <Text style={styles.attendanceDetailValue}>
                    {formatTime(attendanceData.todayRecord.checkOutAt)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.attendanceHelperText}>
              Attendance status is tracked independently from task execution.
            </Text>
          )}

          <TouchableOpacity
            style={styles.attendanceLink}
            onPress={() => router.push('/(app)/attendance/history')}
            activeOpacity={0.7}
          >
            <Text style={styles.attendanceLinkText}>View Attendance History</Text>
            <ChevronRight size={16} color={theme.colors.primaryLight} />
          </TouchableOpacity>
        </Card>

        {/* Field Service Quick Overview (for Service Field role & managers) */}
        {hasFsr && (
          <Card elevated style={styles.fsrCard}>
            <View style={styles.fsrCardHeader}>
              <View style={styles.fsrIconWrapper}>
                <Wrench size={18} color={theme.colors.primaryLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fsrCardTitle}>Field Service Operations</Text>
                <Text style={styles.fsrCardSub}>
                  {fsrActiveCount > 0
                    ? `${fsrActiveCount} active service ${fsrActiveCount === 1 ? 'visit' : 'visits'}`
                    : 'Manage customer UPS site service visits'}
                </Text>
              </View>
              {canCreateReport && (
                <TouchableOpacity
                  style={styles.fsrNewBtn}
                  onPress={() => router.push('/(app)/field-service/new')}
                  activeOpacity={0.8}
                >
                  <Plus size={13} color="#FFFFFF" />
                  <Text style={styles.fsrNewBtnText}>New FSR</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.fsrStatsRow}>
              <View style={styles.fsrStatItem}>
                <Text style={styles.fsrStatVal}>{fsrReports.length}</Text>
                <Text style={styles.fsrStatLabel}>Visits</Text>
              </View>
              <View style={styles.fsrStatItem}>
                <Text style={[styles.fsrStatVal, { color: theme.colors.accentAmber }]}>
                  {fsrActiveCount}
                </Text>
                <Text style={styles.fsrStatLabel}>In Progress</Text>
              </View>
              <View style={styles.fsrStatItem}>
                <Text style={[styles.fsrStatVal, { color: theme.colors.accentEmerald }]}>
                  {fsrCompletedCount}
                </Text>
                <Text style={styles.fsrStatLabel}>Completed</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.fsrLink}
              onPress={() => router.push('/(app)/(tabs)/field-service')}
              activeOpacity={0.7}
            >
              <Text style={styles.fsrLinkText}>Open Field Service Dashboard</Text>
              <ChevronRight size={16} color={theme.colors.primaryLight} />
            </TouchableOpacity>
          </Card>
        )}

        {/* Task Metrics Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Task Overview</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/tasks')} activeOpacity={0.7}>
            <Text style={styles.sectionLink}>View All ({tasks.length})</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricsGrid}>
          <Card style={styles.metricCard}>
            <View style={[styles.metricIconBox, { backgroundColor: theme.colors.primarySoft }]}>
              <Briefcase size={18} color={theme.colors.primaryLight} />
            </View>
            <Text style={styles.metricValue}>{assignedCount}</Text>
            <Text style={styles.metricLabel}>Assigned</Text>
          </Card>

          <Card style={styles.metricCard}>
            <View style={[styles.metricIconBox, { backgroundColor: theme.colors.accentAmberSoft }]}>
              <Clock size={18} color={theme.colors.accentAmber} />
            </View>
            <Text style={styles.metricValue}>{inProgressCount}</Text>
            <Text style={styles.metricLabel}>In Progress</Text>
          </Card>

          <Card style={styles.metricCard}>
            <View style={[styles.metricIconBox, { backgroundColor: theme.colors.accentEmeraldSoft }]}>
              <CheckCircle2 size={18} color={theme.colors.accentEmerald} />
            </View>
            <Text style={styles.metricValue}>{completedCount}</Text>
            <Text style={styles.metricLabel}>Completed</Text>
          </Card>
        </View>

        {/* Recent / Upcoming Tasks */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Assigned Appointments</Text>
        </View>

        {tasksLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.colors.primaryLight} />
            <Text style={styles.loadingText}>Loading assigned tasks...</Text>
          </View>
        ) : tasksError ? (
          <Card style={styles.errorBox}>
            <AlertCircle size={20} color={theme.colors.error} />
            <Text style={styles.errorBoxText}>Failed to load tasks from backend.</Text>
          </Card>
        ) : upcomingTasks.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Sparkles size={28} color={theme.colors.textMuted} />
            <Text style={styles.emptyCardTitle}>No Assigned Tasks</Text>
            <Text style={styles.emptyCardSubtitle}>
              You currently have no tasks assigned to your account.
            </Text>
          </Card>
        ) : (
          <View style={styles.tasksList}>
            {upcomingTasks.map((task: TaskItem) => (
              <TouchableOpacity
                key={task.id}
                activeOpacity={0.75}
                onPress={() => router.push({
                  pathname: '/(app)/tasks/[id]',
                  params: { id: task.id },
                })}
              >
                <Card style={styles.taskCard}>
                  <View style={styles.taskCardHeader}>
                    <View style={styles.taskBadgesRow}>
                      <Badge
                        label={task.priority}
                        variant={getPriorityVariant(task.priority)}
                        size="sm"
                      />
                      <Badge
                        label={task.status.replace('_', ' ')}
                        variant={getStatusVariant(task.status)}
                        size="sm"
                      />
                    </View>
                    <ChevronRight size={18} color={theme.colors.textMuted} />
                  </View>

                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {task.title}
                  </Text>

                  {task.customer ? (
                    <Text style={styles.taskCustomerName}>
                      {task.customer.companyName || task.customer.name}
                    </Text>
                  ) : null}

                  <View style={styles.taskMetaRow}>
                    {task.destination ? (
                      <View style={styles.taskMetaItem}>
                        <MapPin size={14} color={theme.colors.textMuted} />
                        <Text style={styles.taskMetaText} numberOfLines={1}>
                          {task.destination.city || task.destination.name}
                        </Text>
                      </View>
                    ) : null}

                    {task.scheduledAt ? (
                      <View style={styles.taskMetaItem}>
                        <Clock size={14} color={theme.colors.textMuted} />
                        <Text style={styles.taskMetaText}>
                          {formatTime(task.scheduledAt)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Card>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.viewAllTasksButton}
              onPress={() => router.push('/(app)/(tabs)/tasks')}
              activeOpacity={0.75}
            >
              <Text style={styles.viewAllTasksText}>View all assigned tasks</Text>
              <ArrowRight size={16} color={theme.colors.primaryLight} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm + 2,
  },
  headerLogo: {
    width: 32,
    height: 32,
  },
  companyTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  dateSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  greetingSection: {
    marginBottom: theme.spacing.lg,
  },
  greetingText: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
  },
  greetingName: {
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primaryLight,
  },
  greetingRole: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  attendanceCard: {
    marginBottom: theme.spacing.lg,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  attendanceIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  attendanceTitleBox: {
    flex: 1,
  },
  attendanceCardTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  attendanceCardDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  attendanceDetailsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  attendanceDetailItem: {
    flex: 1,
  },
  attendanceDetailLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  attendanceDetailValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  attendanceHelperText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 16,
  },
  attendanceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingTop: theme.spacing.xs,
  },
  attendanceLinkText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primaryLight,
  },
  fsrCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  fsrCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: theme.spacing.sm,
  },
  fsrIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fsrCardTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  fsrCardSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  fsrNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  fsrNewBtnText: {
    fontSize: 11,
    fontWeight: theme.fontWeight.bold,
    color: '#FFFFFF',
  },
  fsrStatsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginVertical: 4,
  },
  fsrStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  fsrStatVal: {
    fontSize: 16,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  fsrStatLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  fsrLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.xs + 2,
  },
  fsrLinkText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primaryLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm + 2,
    marginTop: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  sectionLink: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primaryLight,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  metricCard: {
    flex: 1,
    padding: theme.spacing.sm + 2,
    alignItems: 'center',
  },
  metricIconBox: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
  },
  metricLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
    marginTop: 2,
  },
  loadingBox: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.accentRoseSoft,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorBoxText: {
    fontSize: theme.fontSize.sm,
    color: '#FECDD3',
  },
  emptyCard: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  emptyCardSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  tasksList: {
    gap: theme.spacing.sm,
  },
  taskCard: {
    padding: theme.spacing.md,
    borderColor: theme.colors.border,
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  taskBadgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  taskTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  taskCustomerName: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primaryLight,
    fontWeight: theme.fontWeight.medium,
    marginBottom: 8,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceElevated,
  },
  taskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  taskMetaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  viewAllTasksButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing.sm + 4,
  },
  viewAllTasksText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primaryLight,
  },
});
