import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { LocationService, CapturedLocation } from './location.service';
import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';

/**
 * Task name registered with Expo TaskManager for background GPS telemetry
 */
export const BACKGROUND_TASK_LOCATION_TASK = 'TANEJA_TASK_LOCATION_BACKGROUND_TRACKING';

/**
 * SecureStore key for persisting active task tracking session
 */
const ACTIVE_TRACKING_STORAGE_KEY = 'taneja_active_tracking_session';

export interface ActiveTrackingSession {
  taskId: string;
  startedAt: string;
  isBackgroundEnabled: boolean;
  lastCapturedLocation?: CapturedLocation;
}

type LocationUpdateListener = (
  location: CapturedLocation,
  error?: string,
  isBackgroundActive?: boolean
) => void;

/**
 * Top-level background task registration.
 * Executed by Android OS in the background when location changes occur.
 */
TaskManager.defineTask(BACKGROUND_TASK_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[BackgroundLocationTask] TaskManager error:', error.message);
    return;
  }

  if (data) {
    const { locations } = data as { locations?: Location.LocationObject[] };
    if (!locations || locations.length === 0) {
      return;
    }

    const latest = locations[locations.length - 1];
    if (!latest || !latest.coords) {
      return;
    }

    try {
      // 1. Retrieve the active task ID from SecureStore
      const sessionRaw = await SecureStore.getItemAsync(ACTIVE_TRACKING_STORAGE_KEY);
      if (!sessionRaw) {
        // No active tracking session exists; gracefully stop background task
        const isRunning = await Location.hasStartedLocationUpdatesAsync(
          BACKGROUND_TASK_LOCATION_TASK
        );
        if (isRunning) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_TASK_LOCATION_TASK);
        }
        return;
      }

      const session: ActiveTrackingSession = JSON.parse(sessionRaw);
      if (!session.taskId) {
        return;
      }

      const position: CapturedLocation = {
        latitude: latest.coords.latitude,
        longitude: latest.coords.longitude,
        accuracy: latest.coords.accuracy ?? null,
        timestamp: latest.timestamp,
      };

      // 2. Transmit location update to backend API
      await apiClient.post(API_ENDPOINTS.TASKS.LOCATION(session.taskId), {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        timestamp: position.timestamp,
      });

      // 3. Notify local listeners & update local state if app is running in foreground
      taskTrackingService.handleBackgroundLocationReceived(position);
    } catch (err: any) {
      console.warn(
        '[BackgroundLocationTask] Failed to transmit background location:',
        err?.message || err
      );
    }
  }
});

class TaskTrackingService {
  private activeTaskId: string | null = null;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private isBusySending = false;
  private listeners: LocationUpdateListener[] = [];
  private lastCapturedLocation: CapturedLocation | null = null;
  private lastError: string | null = null;
  private isBackgroundActive = false;

  /**
   * Foreground fallback interval (in milliseconds)
   */
  private readonly UPDATE_INTERVAL_MS = 15000;

  /**
   * Register a listener to receive location updates / telemetry changes.
   */
  subscribe(listener: LocationUpdateListener): () => void {
    this.listeners.push(listener);
    if (this.lastCapturedLocation) {
      listener(
        this.lastCapturedLocation,
        this.lastError || undefined,
        this.isBackgroundActive
      );
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(loc: CapturedLocation, error?: string) {
    this.lastCapturedLocation = loc;
    this.lastError = error || null;
    this.listeners.forEach((listener) => {
      try {
        listener(loc, error, this.isBackgroundActive);
      } catch (err) {
        console.warn('Error in task tracking listener:', err);
      }
    });
  }

  /**
   * Internal hook called by TaskManager when a background location update is processed.
   */
  handleBackgroundLocationReceived(position: CapturedLocation) {
    this.lastCapturedLocation = position;
    this.lastError = null;
    this.isBackgroundActive = true;
    this.notifyListeners(position);
  }

  /**
   * Start task-scoped background & foreground location tracking.
   */
  async startTracking(taskId: string): Promise<boolean> {
    this.activeTaskId = taskId;

    // Check whether background location permission is granted
    let bgPermissionGranted = false;
    try {
      const bgPerm = await LocationService.checkBackgroundPermission();
      bgPermissionGranted = bgPerm.status === Location.PermissionStatus.GRANTED;
      if (!bgPerm.granted && bgPerm.canAskAgain) {
        const reqBg = await LocationService.requestBackgroundPermission();
        bgPermissionGranted = reqBg.status === Location.PermissionStatus.GRANTED;
      }
    } catch (permErr) {
      console.warn('[TaskTracking] Background permission check failed:', permErr);
    }

    // Persist active session in SecureStore
    const sessionData: ActiveTrackingSession = {
      taskId,
      startedAt: new Date().toISOString(),
      isBackgroundEnabled: bgPermissionGranted,
    };
    try {
      await SecureStore.setItemAsync(
        ACTIVE_TRACKING_STORAGE_KEY,
        JSON.stringify(sessionData)
      );
    } catch (storeErr) {
      console.warn('[TaskTracking] Failed to persist session to SecureStore:', storeErr);
    }

    // Attempt to start Expo background location updates
    let bgStarted = false;
    if (bgPermissionGranted) {
      try {
        const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(
          BACKGROUND_TASK_LOCATION_TASK
        );
        if (!alreadyRunning) {
          await Location.startLocationUpdatesAsync(BACKGROUND_TASK_LOCATION_TASK, {
            accuracy: Location.Accuracy.High,
            timeInterval: 15000,
            distanceInterval: 10,
            deferredUpdatesInterval: 15000,
            foregroundService: {
              notificationTitle: 'Taneja Power Active Task',
              notificationBody: 'Transmitting live route tracking for dispatch...',
              notificationColor: '#3B82F6',
            },
            pausesUpdatesAutomatically: false,
            showsBackgroundLocationIndicator: true,
          });
        }
        bgStarted = true;
        this.isBackgroundActive = true;
      } catch (bgErr: any) {
        console.warn(
          '[TaskTracking] Failed to start native background location updates:',
          bgErr?.message || bgErr
        );
        this.isBackgroundActive = false;
      }
    } else {
      this.isBackgroundActive = false;
    }

    // Always perform immediate initial foreground tick for snappy UI feedback
    this.performLocationTick();

    // If background service could not be started, maintain foreground interval fallback
    if (!bgStarted) {
      if (this.intervalTimer) clearInterval(this.intervalTimer);
      this.intervalTimer = setInterval(() => {
        this.performLocationTick();
      }, this.UPDATE_INTERVAL_MS);
    } else {
      // Background service is active; also keep a soft foreground heartbeat if needed
      if (this.intervalTimer) {
        clearInterval(this.intervalTimer);
        this.intervalTimer = null;
      }
    }

    return bgStarted;
  }

  /**
   * Stop active tracking session and terminate background service.
   */
  async stopTracking(taskId?: string): Promise<void> {
    if (taskId && this.activeTaskId && this.activeTaskId !== taskId) {
      return;
    }

    // 1. Clear foreground timer
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }

    // 2. Stop native background location task
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_TASK_LOCATION_TASK
      );
      if (isRunning) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_TASK_LOCATION_TASK);
      }
    } catch (err) {
      console.warn('[TaskTracking] Error stopping background location updates:', err);
    }

    // 3. Clear SecureStore active session
    try {
      await SecureStore.deleteItemAsync(ACTIVE_TRACKING_STORAGE_KEY);
    } catch (err) {
      console.warn('[TaskTracking] Error clearing SecureStore tracking session:', err);
    }

    this.activeTaskId = null;
    this.isBackgroundActive = false;
    this.isBusySending = false;
  }

  /**
   * Check if tracking is active for a given task ID.
   */
  async isTrackingActive(taskId: string): Promise<boolean> {
    if (this.activeTaskId === taskId) return true;
    try {
      const sessionRaw = await SecureStore.getItemAsync(ACTIVE_TRACKING_STORAGE_KEY);
      if (sessionRaw) {
        const session: ActiveTrackingSession = JSON.parse(sessionRaw);
        return session.taskId === taskId;
      }
    } catch {}
    return false;
  }

  getActiveTaskId(): string | null {
    return this.activeTaskId;
  }

  getLastLocation(): CapturedLocation | null {
    return this.lastCapturedLocation;
  }

  isBackgroundTrackingActive(): boolean {
    return this.isBackgroundActive;
  }

  /**
   * Reconcile local tracking state against backend authoritative status on app startup/resume.
   */
  async reconcileActiveTracking(): Promise<void> {
    try {
      const sessionRaw = await SecureStore.getItemAsync(ACTIVE_TRACKING_STORAGE_KEY);
      if (!sessionRaw) {
        // No stored session, ensure background updates are stopped
        const isRunning = await Location.hasStartedLocationUpdatesAsync(
          BACKGROUND_TASK_LOCATION_TASK
        );
        if (isRunning) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_TASK_LOCATION_TASK);
        }
        return;
      }

      const session: ActiveTrackingSession = JSON.parse(sessionRaw);
      if (!session.taskId) {
        await SecureStore.deleteItemAsync(ACTIVE_TRACKING_STORAGE_KEY);
        return;
      }

      this.activeTaskId = session.taskId;

      // Verify with backend if this task is still IN_PROGRESS
      try {
        const response: any = await apiClient.get(
          API_ENDPOINTS.TASKS.GET_BY_ID(session.taskId)
        );
        const task = response?.data;
        if (!task || task.status !== 'IN_PROGRESS') {
          // Task has been completed, cancelled, or reassigned; stop background tracking
          await this.stopTracking(session.taskId);
        } else {
          // Task is valid and active; ensure background updates are running
          const isRunning = await Location.hasStartedLocationUpdatesAsync(
            BACKGROUND_TASK_LOCATION_TASK
          );
          if (!isRunning && session.isBackgroundEnabled) {
            await this.startTracking(session.taskId);
          }
        }
      } catch (apiErr) {
        console.warn(
          '[TaskTracking] Reconciliation API verification failed (possibly offline):',
          apiErr
        );
      }
    } catch (err) {
      console.warn('[TaskTracking] Failed during active tracking reconciliation:', err);
    }
  }

  /**
   * Single foreground tick: acquire location and transmit to backend.
   */
  private async performLocationTick(): Promise<void> {
    if (!this.activeTaskId || this.isBusySending) {
      return;
    }

    this.isBusySending = true;
    try {
      const position = await LocationService.getCurrentPosition();
      this.lastCapturedLocation = position;

      await apiClient.post(API_ENDPOINTS.TASKS.LOCATION(this.activeTaskId), {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        timestamp: position.timestamp,
      });

      this.notifyListeners(position);
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to capture or transmit GPS location';
      console.warn(
        `[TaskTracking] Location upload failed for task ${this.activeTaskId}:`,
        errMsg
      );
      if (this.lastCapturedLocation) {
        this.notifyListeners(this.lastCapturedLocation, errMsg);
      }
    } finally {
      this.isBusySending = false;
    }
  }
}

export const taskTrackingService = new TaskTrackingService();
