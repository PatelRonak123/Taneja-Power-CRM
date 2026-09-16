import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getDevApiBaseUrl = (): string => {
  // If explicitly defined in .env
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  // Automatic platform fallbacks
  if (Platform.OS === 'android') {
    // 10.0.2.2 points to host machine localhost from standard Android emulator
    return 'http://10.0.2.2:5000/api/v1';
  }

  return 'http://localhost:5000/api/v1';
};

export const env = {
  API_BASE_URL: getDevApiBaseUrl(),
  IS_DEV: __DEV__,
  APP_NAME: Constants.expoConfig?.name || 'Taneja Power Sales',
  APP_VERSION: Constants.expoConfig?.version || '1.0.0',
};
