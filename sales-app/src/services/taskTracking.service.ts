import { LocationService, CapturedLocation } from './location.service';
import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';

type LocationUpdateListener = (location: CapturedLocation, error?: string) => void;

class TaskTrackingService {
  private activeTaskId: string | null = null;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private isBusySending = false;
  private listeners: LocationUpdateListener[] = [];
  private lastCapturedLocation: CapturedLocation | null = null;
  private lastError: string | null = null;

  /**
   * Interval between periodic foreground GPS uploads (in milliseconds).
   * 15 seconds provides responsive dispatch monitoring while conserving battery.
   */
  private readonly UPDATE_INTERVAL_MS = 15000;

  /**
   * Register a listener to receive location updates / telemetry changes.
   */
  subscribe(listener: LocationUpdateListener): () => void {
    this.listeners.push(listener);
    if (this.lastCapturedLocation) {
      listener(this.lastCapturedLocation, this.lastError || undefined);
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
        listener(loc, error);
      } catch (err) {
        console.warn('Error in task tracking listener:', err);
      }
    });
  }

  /**
   * Start periodic foreground location tracking for an active task.
   */
  startTracking(taskId: string): void {
    if (this.activeTaskId === taskId && this.intervalTimer) {
      return; // Already tracking this task
    }

    this.stopTracking();
    this.activeTaskId = taskId;

    // Send immediate location snapshot
    this.performLocationTick();

    // Start periodic timer
    this.intervalTimer = setInterval(() => {
      this.performLocationTick();
    }, this.UPDATE_INTERVAL_MS);
  }

  /**
   * Stop active tracking session.
   */
  stopTracking(taskId?: string): void {
    if (taskId && this.activeTaskId !== taskId) {
      return;
    }

    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }

    this.activeTaskId = null;
    this.isBusySending = false;
  }

  /**
   * Check if a specific task currently has active tracking enabled.
   */
  isTracking(taskId: string): boolean {
    return this.activeTaskId === taskId && this.intervalTimer !== null;
  }

  getActiveTaskId(): string | null {
    return this.activeTaskId;
  }

  getLastLocation(): CapturedLocation | null {
    return this.lastCapturedLocation;
  }

  /**
   * Single tick: acquire foreground location and transmit to backend.
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
      console.warn(`[TaskTracking] Location upload failed for task ${this.activeTaskId}:`, errMsg);
      if (this.lastCapturedLocation) {
        this.notifyListeners(this.lastCapturedLocation, errMsg);
      }
    } finally {
      this.isBusySending = false;
    }
  }
}

export const taskTrackingService = new TaskTrackingService();
