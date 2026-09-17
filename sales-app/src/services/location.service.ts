import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

export interface CapturedLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export type LocationErrorCode =
  | 'SERVICES_DISABLED'
  | 'PERMISSION_DENIED'
  | 'PERMISSION_PERMANENTLY_DENIED'
  | 'TIMEOUT_OR_UNAVAILABLE'
  | 'UNKNOWN';

export class LocationServiceError extends Error {
  constructor(
    public readonly code: LocationErrorCode,
    message: string,
    public readonly canAskAgain: boolean = true
  ) {
    super(message);
    this.name = 'LocationServiceError';
  }
}

export class LocationService {
  /**
   * Check the current foreground location permission status.
   */
  static async checkPermission(): Promise<Location.LocationPermissionResponse> {
    try {
      return await Location.getForegroundPermissionsAsync();
    } catch (error) {
      console.warn('Failed to check foreground location permission:', error);
      throw new LocationServiceError(
        'UNKNOWN',
        'Could not check location permissions. Please try again.'
      );
    }
  }

  /**
   * Request foreground location permission.
   */
  static async requestPermission(): Promise<Location.LocationPermissionResponse> {
    try {
      return await Location.requestForegroundPermissionsAsync();
    } catch (error) {
      console.warn('Failed to request foreground location permission:', error);
      throw new LocationServiceError(
        'UNKNOWN',
        'Could not request location permissions. Please try again.'
      );
    }
  }

  /**
   * Check the current background location permission status.
   */
  static async checkBackgroundPermission(): Promise<Location.LocationPermissionResponse> {
    try {
      return await Location.getBackgroundPermissionsAsync();
    } catch (error) {
      console.warn('Failed to check background location permission:', error);
      throw new LocationServiceError(
        'UNKNOWN',
        'Could not check background location permissions. Please try again.'
      );
    }
  }

  /**
   * Request background location permission.
   * Note: Android requires foreground location to be granted before requesting background location.
   */
  static async requestBackgroundPermission(): Promise<Location.LocationPermissionResponse> {
    try {
      const foregroundStatus = await this.checkPermission();
      if (foregroundStatus.status !== Location.PermissionStatus.GRANTED) {
        const reqFg = await this.requestPermission();
        if (reqFg.status !== Location.PermissionStatus.GRANTED) {
          return reqFg;
        }
      }
      return await Location.requestBackgroundPermissionsAsync();
    } catch (error) {
      console.warn('Failed to request background location permission:', error);
      throw new LocationServiceError(
        'UNKNOWN',
        'Could not request background location permissions. Please try again.'
      );
    }
  }

  /**
   * Check if device location services (GPS toggle) are active.
   */
  static async isLocationServicesEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.warn('Failed to check if location services are enabled:', error);
      return false;
    }
  }

  /**
   * Opens the device app settings screen so the employee can manually grant location permission.
   */
  static async openAppSettings(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      console.warn('Failed to open app settings:', error);
    }
  }

  /**
   * Acquire the current foreground position of the device.
   * Performs permission and service checks before reading coordinates.
   */
  static async getCurrentPosition(): Promise<CapturedLocation> {
    // 1. Check if location services (GPS) are enabled on the device
    const servicesEnabled = await this.isLocationServicesEnabled();
    if (!servicesEnabled) {
      throw new LocationServiceError(
        'SERVICES_DISABLED',
        'Device location services (GPS) are turned off. Please enable GPS in your device settings and try again.'
      );
    }

    // 2. Check current foreground permission
    let permStatus = await this.checkPermission();

    if (permStatus.status !== Location.PermissionStatus.GRANTED) {
      if (!permStatus.canAskAgain) {
        throw new LocationServiceError(
          'PERMISSION_PERMANENTLY_DENIED',
          'Location permission has been permanently denied. Please enable location access in system settings to record attendance.',
          false
        );
      }

      // Request permission
      permStatus = await this.requestPermission();

      if (permStatus.status !== Location.PermissionStatus.GRANTED) {
        if (!permStatus.canAskAgain) {
          throw new LocationServiceError(
            'PERMISSION_PERMANENTLY_DENIED',
            'Location permission was denied. Please enable location access in system settings to record attendance.',
            false
          );
        }

        throw new LocationServiceError(
          'PERMISSION_DENIED',
          'Location permission is required to verify physical attendance check-in / check-out.'
        );
      }
    }

    // 3. Obtain current high-accuracy position with fallback
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
        timestamp: position.timestamp,
      };
    } catch (err: any) {
      // If high accuracy times out, attempt balanced accuracy fallback
      try {
        const fallbackPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        return {
          latitude: fallbackPosition.coords.latitude,
          longitude: fallbackPosition.coords.longitude,
          accuracy: fallbackPosition.coords.accuracy ?? null,
          timestamp: fallbackPosition.timestamp,
        };
      } catch (fallbackErr: any) {
        console.warn('Failed to acquire position:', err, fallbackErr);
        throw new LocationServiceError(
          'TIMEOUT_OR_UNAVAILABLE',
          'Unable to acquire GPS coordinates. Please ensure you are not indoors with blocked GPS signals, or try again.'
        );
      }
    }
  }
}
