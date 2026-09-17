import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
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
  Play,
  CheckCircle2,
  Navigation,
  Radio,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react-native';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import {
  useTaskDetails,
  useStartTask,
  useCompleteTask,
} from '../../../src/hooks/useTasks';
import {
  LocationService,
  LocationServiceError,
  CapturedLocation,
} from '../../../src/services/location.service';
import { taskTrackingService } from '../../../src/services/taskTracking.service';
import { theme } from '../../../src/theme/theme';
import { formatDateTime, formatTime } from '../../../src/utils/date';

/**
 * Calculate straight-line distance in kilometers between two GPS coordinates using the Haversine formula
 */
function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function TaskDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: task, isLoading, error, refetch } = useTaskDetails(id);
  const startTaskMutation = useStartTask();
  const completeTaskMutation = useCompleteTask();

  const [actionLoadingState, setActionLoadingState] = useState<
    'IDLE' | 'ACQUIRING_GPS' | 'SUBMITTING'
  >('IDLE');
  const [actionError, setActionError] = useState<string | null>(null);
  const [liveLocation, setLiveLocation] = useState<CapturedLocation | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [isBackgroundActive, setIsBackgroundActive] = useState<boolean>(false);

  // Subscribe to live tracking updates when task is in progress
  useEffect(() => {
    if (task && task.status === 'IN_PROGRESS') {
      taskTrackingService.startTracking(task.id);
      const unsubscribe = taskTrackingService.subscribe((loc, err, bgActive) => {
        setLiveLocation(loc);
        setTrackingError(err || null);
        setIsBackgroundActive(Boolean(bgActive));
      });

      return () => {
        // Clean up UI listener only on screen unmount — background tracking continues
        unsubscribe();
      };
    } else if (task && (task.status === 'COMPLETED' || task.status === 'CANCELLED')) {
      taskTrackingService.stopTracking(id);
    }
  }, [task?.status, task?.id]);

  const isActionBusy =
    actionLoadingState !== 'IDLE' ||
    startTaskMutation.isPending ||
    completeTaskMutation.isPending;

  const handleStartTask = async () => {
    if (!task || isActionBusy) return;
    setActionError(null);
    setActionLoadingState('ACQUIRING_GPS');

    // 1. Request background location permission contextually if not already granted
    try {
      const bgPerm = await LocationService.checkBackgroundPermission();
      if (!bgPerm.granted && bgPerm.canAskAgain) {
        await LocationService.requestBackgroundPermission();
      }
    } catch (bgErr) {
      console.warn('Background permission request notice:', bgErr);
    }

    // 2. Capture initial GPS coordinates
    let capturedLoc: CapturedLocation | null = null;
    try {
      capturedLoc = await LocationService.getCurrentPosition();
      setLiveLocation(capturedLoc);
    } catch (err: any) {
      setActionLoadingState('IDLE');
      if (err instanceof LocationServiceError) {
        setActionError(err.message);
        if (err.code === 'PERMISSION_PERMANENTLY_DENIED') {
          Alert.alert(
            'Location Permission Required',
            'Location access is permanently disabled for this app. Please open device settings and grant location access to start the task and enable route navigation.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => LocationService.openAppSettings() },
            ]
          );
        }
      } else {
        setActionError('Failed to obtain GPS coordinates to start task.');
      }
      return;
    }

    // 3. Submit start task mutation to backend
    setActionLoadingState('SUBMITTING');
    try {
      await startTaskMutation.mutateAsync({
        taskId: task.id,
        payload: {
          latitude: capturedLoc.latitude,
          longitude: capturedLoc.longitude,
        },
      });

      const bgStarted = await taskTrackingService.startTracking(task.id);
      setIsBackgroundActive(bgStarted);
      setActionLoadingState('IDLE');
      Alert.alert(
        'Task Started',
        bgStarted
          ? 'Work order is now in progress. Android background location service & dispatch notification have been activated.'
          : 'Work order is now in progress. Foreground GPS route tracking is active.'
      );
    } catch (apiErr: any) {
      setActionLoadingState('IDLE');
      const msg =
        apiErr?.response?.data?.message ||
        apiErr?.message ||
        'Failed to start task. Please try again.';
      setActionError(msg);
    }
  };

  const handleCompleteTask = () => {
    if (!task || isActionBusy) return;

    Alert.alert(
      'Complete Work Order',
      'Are you sure you want to mark this task as completed? This will terminate active location tracking and remove the background notification.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Complete',
          style: 'default',
          onPress: async () => {
            setActionError(null);
            setActionLoadingState('ACQUIRING_GPS');

            let finalLoc: CapturedLocation | null = null;
            try {
              finalLoc = await LocationService.getCurrentPosition();
            } catch {
              // Non-blocking fallback for completion GPS
            }

            setActionLoadingState('SUBMITTING');
            try {
              await completeTaskMutation.mutateAsync({
                taskId: task.id,
                payload: {
                  latitude: finalLoc?.latitude || null,
                  longitude: finalLoc?.longitude || null,
                  notes: 'Task marked completed from mobile sales app.',
                },
              });

              await taskTrackingService.stopTracking(task.id);
              setIsBackgroundActive(false);
              setActionLoadingState('IDLE');
              Alert.alert(
                'Task Completed',
                'Work order has been successfully recorded as completed. Tracking service stopped.'
              );
            } catch (apiErr: any) {
              setActionLoadingState('IDLE');
              const msg =
                apiErr?.response?.data?.message ||
                apiErr?.message ||
                'Failed to complete task. Please try again.';
              setActionError(msg);
            }
          },
        },
      ]
    );
  };

  const handleOpenExternalNavigation = () => {
    if (!task?.destination?.latitude || !task?.destination?.longitude) {
      Alert.alert(
        'No GPS Coordinates',
        'This destination site does not have registered GPS latitude/longitude coordinates.'
      );
      return;
    }

    const lat = task.destination.latitude;
    const lng = task.destination.longitude;
    const label = encodeURIComponent(task.destination.name || 'Task Destination');

    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
    });

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`);
      }
    });
  };

  const handleCallSiteContact = () => {
    const phone = task?.destination?.contactPhone || task?.customer?.phone;
    if (!phone) {
      Alert.alert('No Phone Number', 'No contact phone number is available for this site.');
      return;
    }
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
  };

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

  // Calculate distance if both current location and destination coordinates are available
  let distanceKm: number | null = null;
  if (
    liveLocation &&
    task?.destination?.latitude &&
    task?.destination?.longitude
  ) {
    const destLat = parseFloat(task.destination.latitude);
    const destLng = parseFloat(task.destination.longitude);
    if (!isNaN(destLat) && !isNaN(destLng)) {
      distanceKm = calculateDistanceKm(
        liveLocation.latitude,
        liveLocation.longitude,
        destLat,
        destLng
      );
    }
  }

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
        {/* Error Alert */}
        {actionError && (
          <Card style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <AlertCircle size={18} color={theme.colors.accentRose} />
              <Text style={styles.errorCardTitle}>Action Failed</Text>
            </View>
            <Text style={styles.errorCardBody}>{actionError}</Text>
          </Card>
        )}

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

        {/* Live Tracking Telemetry Card (Active when IN_PROGRESS) */}
        {task.status === 'IN_PROGRESS' && (
          <Card elevated style={styles.trackingCard}>
            <View style={styles.trackingHeaderRow}>
              <View style={styles.livePulseBox}>
                <Radio size={18} color={theme.colors.accentAmber} />
                <Text style={styles.livePulseText}>
                  {isBackgroundActive ? 'LIVE BACKGROUND GPS ACTIVE' : 'LIVE GPS TRACKING ACTIVE'}
                </Text>
              </View>
              <Badge
                label={isBackgroundActive ? 'BG SERVICE RUNNING' : 'FOREGROUND ONLY'}
                variant={isBackgroundActive ? 'success' : 'warning'}
                size="sm"
              />
            </View>

            <Text style={styles.trackingSubtitle}>
              {isBackgroundActive
                ? 'Persistent Android service is transmitting live coordinates to Admin Dispatch, even when the screen is locked.'
                : 'GPS coordinates are transmitting to Admin Dispatch while the app is active.'}
            </Text>

            {liveLocation ? (
              <View style={styles.telemetryBox}>
                <View style={styles.telemetryRow}>
                  <Text style={styles.telemetryLabel}>Current Coordinates:</Text>
                  <Text style={styles.telemetryValue}>
                    {liveLocation.latitude.toFixed(5)}°, {liveLocation.longitude.toFixed(5)}°
                  </Text>
                </View>
                {liveLocation.accuracy !== null && (
                  <View style={styles.telemetryRow}>
                    <Text style={styles.telemetryLabel}>GPS Accuracy:</Text>
                    <Text style={styles.telemetryValue}>±{Math.round(liveLocation.accuracy)}m</Text>
                  </View>
                )}
                {distanceKm !== null && (
                  <View style={styles.telemetryRow}>
                    <Text style={styles.telemetryLabel}>Est. Distance to Site:</Text>
                    <Text style={[styles.telemetryValue, { color: theme.colors.primaryLight, fontWeight: 'bold' }]}>
                      {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} meters` : `${distanceKm.toFixed(1)} km`}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.telemetryPendingBox}>
                <ActivityIndicator size="small" color={theme.colors.accentAmber} />
                <Text style={styles.telemetryPendingText}>Acquiring high-accuracy GPS fix...</Text>
              </View>
            )}

            {trackingError && (
              <Text style={styles.trackingErrorText}>⚠️ {trackingError}</Text>
            )}
          </Card>
        )}

        {/* Action Controls Card */}
        <Card style={styles.actionsCard}>
          <Text style={styles.actionsCardTitle}>Work Order Execution</Text>

          {/* Progress Indicator */}
          {actionLoadingState !== 'IDLE' && (
            <View style={styles.progressBox}>
              <ActivityIndicator size="small" color={theme.colors.primaryLight} />
              <Text style={styles.progressText}>
                {actionLoadingState === 'ACQUIRING_GPS'
                  ? 'Acquiring high-accuracy GPS coordinates...'
                  : 'Updating task state with backend...'}
              </Text>
            </View>
          )}

          {/* Start Task Button */}
          {(task.status === 'CREATED' || task.status === 'ASSIGNED') && (
            <Button
              title={isActionBusy ? 'Starting Task...' : 'Start Task & Enable GPS Route'}
              variant="primary"
              size="lg"
              icon={<Play size={18} color="#FFFFFF" />}
              onPress={handleStartTask}
              loading={isActionBusy}
              disabled={isActionBusy}
              style={styles.actionBtn}
            />
          )}

          {/* In Progress Action Buttons */}
          {task.status === 'IN_PROGRESS' && (
            <View style={styles.inProgressActions}>
              <Button
                title="Launch Maps Navigation"
                variant="primary"
                size="md"
                icon={<Navigation size={18} color="#FFFFFF" />}
                onPress={handleOpenExternalNavigation}
                style={styles.actionBtn}
              />
              <Button
                title={isActionBusy ? 'Completing...' : 'Mark Task Completed'}
                variant="secondary"
                size="md"
                icon={<CheckCircle2 size={18} color={theme.colors.accentEmerald} />}
                onPress={handleCompleteTask}
                loading={isActionBusy}
                disabled={isActionBusy}
                style={styles.actionBtn}
              />
            </View>
          )}

          {/* Completed State Notice */}
          {task.status === 'COMPLETED' && (
            <View style={styles.completedBox}>
              <ShieldCheck size={20} color={theme.colors.accentEmerald} />
              <Text style={styles.completedText}>
                Work order successfully completed at {formatDateTime(task.completedAt)}.
              </Text>
            </View>
          )}
        </Card>

        {/* Destination Location Card */}
        {task.destination ? (
          <Card style={styles.sectionCard}>
            <View style={styles.destHeaderRow}>
              <Text style={styles.cardSectionTitle}>Service Location Site</Text>
              {task.destination.latitude && task.destination.longitude ? (
                <TouchableOpacity onPress={handleOpenExternalNavigation} style={styles.mapsLink}>
                  <Navigation size={14} color={theme.colors.primaryLight} />
                  <Text style={styles.mapsLinkText}>Open Maps</Text>
                </TouchableOpacity>
              ) : null}
            </View>

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
                    <TouchableOpacity onPress={handleCallSiteContact}>
                      <Text style={[styles.infoValue, { color: theme.colors.primaryLight }]}>
                        {task.destination.contactPhone} (Tap to call)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </View>
          </Card>
        ) : null}

        {/* Schedule & Timing Info */}
        <Card style={styles.sectionCard}>
          <Text style={styles.cardSectionTitle}>Schedule & Timeline</Text>
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Calendar size={18} color={theme.colors.primaryLight} />
              <View style={styles.infoTextBox}>
                <Text style={styles.infoLabel}>Scheduled Date & Time</Text>
                <Text style={styles.infoValue}>{formatDateTime(task.scheduledAt)}</Text>
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

        {/* Operational Guidelines Notice */}
        <View style={styles.noticeBox}>
          <Info size={16} color={theme.colors.textMuted} />
          <Text style={styles.noticeText}>
            • Live GPS tracking operates in the background with a persistent Android notification while the work order is in progress. Tracking stops automatically upon completion.
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
  trackingCard: {
    backgroundColor: '#111827',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    padding: theme.spacing.md,
  },
  trackingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  livePulseBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseText: {
    fontSize: 11,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accentAmber,
    letterSpacing: 0.5,
  },
  trackingSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  telemetryBox: {
    backgroundColor: '#1F2937',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  telemetryLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  telemetryValue: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: theme.colors.textPrimary,
  },
  telemetryPendingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: theme.spacing.sm,
    backgroundColor: '#1F2937',
    borderRadius: theme.borderRadius.sm,
  },
  telemetryPendingText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  trackingErrorText: {
    fontSize: 10,
    color: theme.colors.accentRose,
    marginTop: 6,
  },
  actionsCard: {
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  actionsCardTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primarySoft,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  progressText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primaryLight,
  },
  actionBtn: {
    width: '100%',
  },
  inProgressActions: {
    gap: theme.spacing.sm,
  },
  completedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.accentEmeraldSoft,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  completedText: {
    fontSize: theme.fontSize.xs,
    color: '#A7F3D0',
    fontWeight: theme.fontWeight.medium,
    flex: 1,
  },
  errorCard: {
    backgroundColor: theme.colors.accentRoseSoft,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: theme.spacing.md,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  errorCardTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: '#FECDD3',
  },
  errorCardBody: {
    fontSize: theme.fontSize.xs,
    color: '#FDA4AF',
  },
  sectionCard: {
    borderColor: theme.colors.border,
  },
  destHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  cardSectionTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mapsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapsLinkText: {
    fontSize: 11,
    color: theme.colors.primaryLight,
    fontWeight: theme.fontWeight.bold,
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
