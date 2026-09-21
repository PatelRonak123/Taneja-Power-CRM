import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { tokenStorage } from '../auth/tokenStorage';
import { env } from '../config/env';

export const fsrPdfService = {
  /**
   * Downloads official FSR PDF from the server and opens the native device share sheet
   */
  async downloadAndSharePdf(fsrId: string, fsrNumber: string): Promise<void> {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not supported on this device.');
    }

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

    await Sharing.shareAsync(downloadResult.uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share Field Service Report ${fsrNumber}`,
      UTI: 'com.adobe.pdf',
    });
  },
};
