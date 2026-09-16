import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Calendar,
  Building2,
  Phone,
  Mail,
  User,
  Info,
  ExternalLink,
  AlertCircle,
} from 'lucide-react-native';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { useTaskDetails } from '../../../src/hooks/useTasks';
import { theme } from '../../../src/theme/theme';
import { formatDateTime } from '../../../src/utils/date';

export default function TaskDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: task, isLoading, error } = useTaskDetails(id);

  const getPriorityVariant = (priority?: string) => {
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

  const getStatusVariant = (status?: string) => {
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

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.colors.primaryLight} />
          <Text style={styles.centerText}>Loading task details...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error || !task) {
    return (
      <ScreenContainer>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Details</Text>
        </View>
        <View style={styles.centerBox}>
          <AlertCircle size={40} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Task Not Found</Text>
          <Text style={styles.errorSubtitle}>
            This task may not exist or you might not be authorized to view it.
          </Text>
          <Button
            title="Go Back"
            variant="secondary"
            onPress={() => router.back()}
            style={{ marginTop: 16 }}
          />
        </View>
      </ScreenContainer>
    );
  }

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
        <Text style={styles.headerTitle}>Work Order</Text>
        <Badge
          label={task.status.replace('_', ' ')}
          variant={getStatusVariant(task.status)}
          size="sm"
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Task Title & Priority Banner */}
        <Card elevated style={styles.mainCard}>
          <View style={styles.priorityRow}>
            <Badge
              label={`${task.priority} PRIORITY`}
              variant={getPriorityVariant(task.priority)}
              size="sm"
            />
            <Text style={styles.taskIdText}>ID: #{task.id.slice(0, 8)}</Text>
          </View>

          <Text style={styles.taskTitle}>{task.title}</Text>

          {task.description ? (
            <Text style={styles.taskDescription}>{task.description}</Text>
          ) : null}
        </Card>

        {/* Schedule & Timing Info */}
        <Card style={styles.sectionCard}>
          <Text style={styles.cardSectionTitle}>Schedule & Timeline</Text>
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Calendar size={18} color={theme.colors.primaryLight} />
              <View style={styles.infoTextBox}>
                <Text style={styles.infoLabel}>Scheduled Date & Time</Text>
                <Text style={styles.infoValue}>
                  {formatDateTime(task.scheduledAt)}
                </Text>
              </View>
            </View>

            {task.dueAt ? (
              <View style={styles.infoRow}>
                <Clock size={18} color={theme.colors.accentAmber} />
                <View style={styles.infoTextBox}>
                  <Text style={styles.infoLabel}>Due Date & Time</Text>
                  <Text style={styles.infoValue}>{formatDateTime(task.dueAt)}</Text>
                </View>
              </View>
            ) : null}

            {task.startedAt ? (
              <View style={styles.infoRow}>
                <Clock size={18} color={theme.colors.accentEmerald} />
                <View style={styles.infoTextBox}>
                  <Text style={styles.infoLabel}>Work Started</Text>
                  <Text style={styles.infoValue}>{formatDateTime(task.startedAt)}</Text>
                </View>
              </View>
            ) : null}

            {task.completedAt ? (
              <View style={styles.infoRow}>
                <Clock size={18} color={theme.colors.success} />
                <View style={styles.infoTextBox}>
                  <Text style={styles.infoLabel}>Work Completed</Text>
                  <Text style={styles.infoValue}>{formatDateTime(task.completedAt)}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </Card>

        {/* Destination Location Card */}
        {task.destination ? (
          <Card style={styles.sectionCard}>
            <Text style={styles.cardSectionTitle}>Service Location Site</Text>
            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <MapPin size={18} color={theme.colors.primaryLight} />
                <View style={styles.infoTextBox}>
                  <Text style={styles.destinationName}>{task.destination.name}</Text>
                  <Text style={styles.destinationAddress}>
                    {task.destination.address ? `${task.destination.address}, ` : ''}
                    {task.destination.city || ''} {task.destination.state || ''} {task.destination.pincode || ''}
                  </Text>
                </View>
              </View>

              {task.destination.contactPerson ? (
                <View style={styles.infoRow}>
                  <User size={18} color={theme.colors.textMuted} />
                  <View style={styles.infoTextBox}>
                    <Text style={styles.infoLabel}>Site Contact Person</Text>
                    <Text style={styles.infoValue}>{task.destination.contactPerson}</Text>
                  </View>
                </View>
              ) : null}

              {task.destination.contactPhone ? (
                <View style={styles.infoRow}>
                  <Phone size={18} color={theme.colors.textMuted} />
                  <View style={styles.infoTextBox}>
                    <Text style={styles.infoLabel}>Site Contact Phone</Text>
                    <Text style={styles.infoValue}>{task.destination.contactPhone}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </Card>
        ) : null}

        {/* Customer Overview Card with Navigation */}
        {task.customer ? (
          <Card style={styles.sectionCard}>
            <View style={styles.customerHeader}>
              <View>
                <Text style={styles.cardSectionTitle}>Customer Organization</Text>
                <Text style={styles.customerCompanyName}>
                  {task.customer.companyName || task.customer.name}
                </Text>
              </View>
            </View>

            <View style={styles.infoList}>
              {task.customer.name && task.customer.companyName ? (
                <View style={styles.infoRow}>
                  <User size={18} color={theme.colors.textMuted} />
                  <View style={styles.infoTextBox}>
                    <Text style={styles.infoLabel}>Contact Representative</Text>
                    <Text style={styles.infoValue}>{task.customer.name}</Text>
                  </View>
                </View>
              ) : null}

              {task.customer.phone ? (
                <View style={styles.infoRow}>
                  <Phone size={18} color={theme.colors.textMuted} />
                  <View style={styles.infoTextBox}>
                    <Text style={styles.infoLabel}>Phone Number</Text>
                    <Text style={styles.infoValue}>{task.customer.phone}</Text>
                  </View>
                </View>
              ) : null}

              {task.customer.email ? (
                <View style={styles.infoRow}>
                  <Mail size={18} color={theme.colors.textMuted} />
                  <View style={styles.infoTextBox}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{task.customer.email}</Text>
                  </View>
                </View>
              ) : null}
            </View>

            <Button
              title="View Customer Profile"
              variant="secondary"
              icon={<ExternalLink size={16} color={theme.colors.textPrimary} />}
              onPress={() => router.push({
                pathname: '/(app)/customers/[id]',
                params: { id: task.customerId },
              })}
              style={styles.customerButton}
            />
          </Card>
        ) : null}

        {/* Phase 5B Read-Only Info Notice */}
        <View style={styles.noticeBox}>
          <Info size={16} color={theme.colors.textMuted} />
          <Text style={styles.noticeText}>
            Work order execution actions (start/complete) are part of field operations workflows.
          </Text>
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  mainCard: {
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  taskIdText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    fontWeight: theme.fontWeight.medium,
  },
  taskTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    lineHeight: 28,
  },
  taskDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceElevated,
  },
  sectionCard: {
    borderColor: theme.colors.border,
  },
  cardSectionTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
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
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  infoValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  destinationName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  destinationAddress: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  customerHeader: {
    marginBottom: theme.spacing.sm,
  },
  customerCompanyName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primaryLight,
    marginTop: 2,
  },
  customerButton: {
    marginTop: theme.spacing.md,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noticeText: {
    flex: 1,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
  },
  centerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  errorTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  errorSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
});
