import { Linking } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { tokenStorage } from '../auth/tokenStorage';
import { env } from '../config/env';

export const fsrPdfService = {
  /**
   * Downloads official FSR PDF from the server and opens the native device share sheet
   * with fallback to Linking if native sharing module is not linked in the current APK binary.
   */
  async downloadAndSharePdf(fsrId: string, fsrNumber: string): Promise<void> {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      throw new Error('User not authenticated.');
    }

    const sanitizedNumber = fsrNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const localUri = `${FileSystem.cacheDirectory}FSR-${sanitizedNumber}.pdf`;

    const downloadResult = await FileSystem.downloadAsync(
      `${env.API_BASE_URL}/field-service/${fsrId}/pdf`,
      localUri,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/pdf',
        },
      }
    );

    if (downloadResult.status !== 200) {
      throw new Error(
        `Failed to download PDF report. Server responded with status ${downloadResult.status}.`
      );
    }

    // Lazy load expo-sharing to avoid top-level TurboModule crashes if unlinked in client binary
    let shared = false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sharing = require('expo-sharing');
      if (Sharing && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share Field Service Report ${fsrNumber}`,
          UTI: 'com.adobe.pdf',
        });
        shared = true;
      }
    } catch {
      shared = false;
    }

    if (!shared) {
      // Fallback: Attempt opening file directly or open direct PDF download URL in device browser
      const canOpen = await Linking.canOpenURL(downloadResult.uri).catch(() => false);
      if (canOpen) {
        await Linking.openURL(downloadResult.uri);
      } else {
        await Linking.openURL(`${env.API_BASE_URL}/field-service/${fsrId}/pdf`);
      }
    }
  },
};
