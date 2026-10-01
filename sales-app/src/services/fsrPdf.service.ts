import { Linking } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { tokenStorage } from '../auth/tokenStorage';
import { env } from '../config/env';

export const fsrPdfService = {
  /**
   * Downloads official FSR PDF from the server and opens the native device share sheet
   * with multi-tier fallback (downloadAsync -> fetch+writeAsString -> browser Linking)
   * to guarantee PDF opening even when native file system modules are partially unlinked.
   */
  async downloadAndSharePdf(fsrId: string, fsrNumber: string): Promise<void> {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      throw new Error('User not authenticated.');
    }

    const sanitizedNumber = fsrNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const pdfUrl = `${env.API_BASE_URL}/field-service/${fsrId}/pdf`;
    const authenticatedWebUrl = `${pdfUrl}?token=${encodeURIComponent(token)}`;

    let localUri: string | null = null;

    // 1. Attempt FileSystem.downloadAsync if available
    try {
      if (FileSystem && typeof FileSystem.downloadAsync === 'function' && FileSystem.cacheDirectory) {
        const targetUri = `${FileSystem.cacheDirectory}FSR-${sanitizedNumber}.pdf`;
        const downloadResult = await FileSystem.downloadAsync(pdfUrl, targetUri, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/pdf',
          },
        });

        if (downloadResult && downloadResult.status === 200) {
          localUri = downloadResult.uri;
        }
      }
    } catch {
      localUri = null;
    }

    // 2. If downloadAsync is missing or failed, try standard fetch -> base64 -> FileSystem.writeAsStringAsync
    if (!localUri) {
      try {
        const baseDir = FileSystem?.cacheDirectory || FileSystem?.documentDirectory;
        if (baseDir && typeof FileSystem?.writeAsStringAsync === 'function') {
          const targetUri = `${baseDir}FSR-${sanitizedNumber}.pdf`;
          const response = await fetch(pdfUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/pdf',
            },
          });

          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
            }
            const base64 = btoa(binary);

            await FileSystem.writeAsStringAsync(targetUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            localUri = targetUri;
          }
        }
      } catch {
        localUri = null;
      }
    }

    // 3. If local file exists, try native sharing sheet
    if (localUri) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Sharing = require('expo-sharing');
        if (Sharing && (await Sharing.isAvailableAsync())) {
          await Sharing.shareAsync(localUri, {
            mimeType: 'application/pdf',
            dialogTitle: `Share Field Service Report ${fsrNumber}`,
            UTI: 'com.adobe.pdf',
          });
          return;
        }
      } catch {
        // Continue to browser fallback
      }
    }

    // 4. Universal Fallback: Open authenticated PDF URL directly in external browser / system PDF viewer
    const canOpen = await Linking.canOpenURL(authenticatedWebUrl).catch(() => false);
    if (canOpen) {
      await Linking.openURL(authenticatedWebUrl);
    } else {
      await Linking.openURL(pdfUrl);
    }
  },
};
