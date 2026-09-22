import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';

interface SelectedImageAsset {
  uri: string;
  base64?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number;
  width?: number;
  height?: number;
}
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  Upload,
  Plus,
  X,
} from 'lucide-react-native';
import { ScreenContainer } from '../../../../src/components/ui/ScreenContainer';
import { Card } from '../../../../src/components/ui/Card';
import { Badge } from '../../../../src/components/ui/Badge';
import { Button } from '../../../../src/components/ui/Button';
import { useAuthStore } from '../../../../src/auth/auth.store';
import {
  useFsrDetail,
  useUploadAttachment,
  useDeleteAttachment,
} from '../../../../src/hooks/useFsr';
import { canEditFSR } from '../../../../src/utils/fsrPermissions';
import { theme } from '../../../../src/theme/theme';
import { env } from '../../../../src/config/env';
import { FsrAttachment, FsrAttachmentCategory } from '../../../../src/types/fsr.types';

const ATTACHMENT_CATEGORIES: { label: string; value: FsrAttachmentCategory }[] = [
  { label: 'UPS Photo', value: 'UPS_PHOTO' },
  { label: 'Battery Photo', value: 'BATTERY_PHOTO' },
  { label: 'Site Photo', value: 'SITE_PHOTO' },
  { label: 'Part Photo', value: 'PART_PHOTO' },
  { label: 'Signed Document', value: 'SIGNED_DOCUMENT' },
  { label: 'Other', value: 'OTHER' },
];

export default function FsrPhotosScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const fsrId = id || '';
  const user = useAuthStore((state) => state.user);

  const { data: fsrDetail, isLoading, refetch } = useFsrDetail(fsrId);
  const uploadMutation = useUploadAttachment();
  const deleteMutation = useDeleteAttachment();

  const [selectedCategory, setSelectedCategory] = useState<FsrAttachmentCategory>('UPS_PHOTO');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImageAsset | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const attachments = fsrDetail?.attachments || [];
  const canEdit = canEditFSR(user, fsrDetail?.fsr);

  const filteredAttachments =
    filterCategory === 'ALL'
      ? attachments
      : attachments.filter((att) => att.category === filterCategory);

  // Take photo with camera
  const handleTakePhoto = async () => {
    let ImagePicker: any = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ImagePicker = require('expo-image-picker');
    } catch {
      ImagePicker = null;
    }

    if (!ImagePicker?.launchCameraAsync) {
      Alert.alert(
        'Camera Module Required',
        'Camera native module (ExponentImagePicker) is not linked in this app build. Please rebuild your native app with `npx expo run:android`.'
      );
      return;
    }
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to capture service photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
        setUploadModalVisible(true);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err?.message || 'Failed to launch camera.');
    }
  };

  // Pick photo from gallery
  const handlePickPhoto = async () => {
    let ImagePicker: any = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ImagePicker = require('expo-image-picker');
    } catch {
      ImagePicker = null;
    }

    if (!ImagePicker?.launchImageLibraryAsync) {
      Alert.alert(
        'Gallery Module Required',
        'Media library native module (ExponentImagePicker) is not linked in this app build. Please rebuild your native app with `npx expo run:android`.'
      );
      return;
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Media library permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
        setUploadModalVisible(true);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err?.message || 'Failed to open image library.');
    }
  };

  // Confirm and upload photo
  const handleConfirmUpload = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'No image selected.');
      return;
    }

    setIsProcessingImage(true);
    let base64 = selectedImage.base64;

    // Fallback: Read file directly using FileSystem if base64 was not provided by picker
    if (!base64 && selectedImage.uri) {
      try {
        base64 = await FileSystem.readAsStringAsync(selectedImage.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch (err: any) {
        setIsProcessingImage(false);
        Alert.alert('File Read Error', 'Failed to read image data from device.');
        return;
      }
    }

    if (!base64) {
      setIsProcessingImage(false);
      Alert.alert('Error', 'Image data could not be processed.');
      return;
    }

    const mime = selectedImage.mimeType || 'image/jpeg';
    const fileName =
      selectedImage.fileName || `fsr-${selectedCategory.toLowerCase()}-${Date.now()}.jpg`;
    const fileSize =
      selectedImage.fileSize && selectedImage.fileSize > 0
        ? selectedImage.fileSize
        : Math.max(1024, Math.round((base64.length * 3) / 4));

    try {
      await uploadMutation.mutateAsync({
        id: fsrId,
        payload: {
          category: selectedCategory,
          fileName,
          fileData: `data:${mime};base64,${base64}`,
          fileSize,
          mimeType: mime,
        },
      });

      setSelectedImage(null);
      setUploadModalVisible(false);
      Alert.alert('Uploaded', 'Photo attached to report successfully.');
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.message || 'Failed to upload photo.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Delete attachment
  const handleDeleteAttachment = (attachmentId: string) => {
    Alert.alert('Delete Attachment', 'Are you sure you want to delete this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync({ id: fsrId, attachmentId });
            Alert.alert('Deleted', 'Photo removed.');
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete attachment.');
          }
        },
      },
    ]);
  };

  const resolveImageUrl = (filePath: string) => {
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const serverRoot = env.API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    return `${serverRoot}${cleanPath}`;
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.navTitleWrapper}>
            <Text style={styles.navTitle}>Photos & Attachments</Text>
            <Text style={styles.navSubtitle}>{fsrDetail?.fsr?.fsrNumber || 'FSR'}</Text>
          </View>
        </View>

        {/* Action Header: Camera & Gallery */}
        {canEdit && (
          <View style={styles.actionHeader}>
            <Button
              title="Take Photo"
              variant="primary"
              size="sm"
              icon={<Camera size={16} color={theme.colors.textOnPrimary} />}
              onPress={handleTakePhoto}
              style={{ flex: 1 }}
            />
            <Button
              title="From Gallery"
              variant="secondary"
              size="sm"
              icon={<ImageIcon size={16} color={theme.colors.primaryLight} />}
              onPress={handlePickPhoto}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {/* Filter Categories Chips */}
        <View style={styles.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            <TouchableOpacity
              onPress={() => setFilterCategory('ALL')}
              style={[styles.filterChip, filterCategory === 'ALL' && styles.filterChipActive]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterCategory === 'ALL' && styles.filterChipTextActive,
                ]}
              >
                All ({attachments.length})
              </Text>
            </TouchableOpacity>
            {ATTACHMENT_CATEGORIES.map((cat) => {
              const count = attachments.filter((a) => a.category === cat.value).length;
              const isActive = filterCategory === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => setFilterCategory(cat.value)}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {cat.label} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Grid List */}
        {filteredAttachments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Camera size={50} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No Photos Found</Text>
            <Text style={styles.emptySubtitle}>
              {canEdit
                ? 'Take or upload photos of UPS, battery banks, site environment, or replacement parts.'
                : 'No photos attached to this report.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredAttachments}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.gridContent}
            renderItem={({ item }) => (
              <Card style={styles.photoCard}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setPreviewImage(resolveImageUrl(item.filePath))}
                  style={styles.imageWrapper}
                >
                  <Image
                    source={{ uri: resolveImageUrl(item.filePath) }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>

                <View style={styles.cardInfo}>
                  <Badge
                    label={item.category.replace('_', ' ')}
                    variant="primary"
                    size="sm"
                    style={{ marginBottom: 4 }}
                  />
                  <Text style={styles.fileNameText} numberOfLines={1}>
                    {item.fileName}
                  </Text>
                  <Text style={styles.fileSizeText}>
                    {(item.fileSize / 1024).toFixed(0)} KB
                  </Text>
                </View>

                {canEdit && (
                  <TouchableOpacity
                    onPress={() => handleDeleteAttachment(item.id)}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={16} color={theme.colors.accentRose} />
                  </TouchableOpacity>
                )}
              </Card>
            )}
          />
        )}

        {/* Upload Category Selection Modal */}
        <Modal
          visible={uploadModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setUploadModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Photo Category</Text>

              {selectedImage && (
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.uploadPreview}
                  resizeMode="contain"
                />
              )}

              <Text style={styles.modalLabel}>Category</Text>
              <View style={styles.categoriesGrid}>
                {ATTACHMENT_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.value;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      onPress={() => setSelectedCategory(cat.value)}
                      style={[styles.categoryBtn, isSelected && styles.categoryBtnActive]}
                    >
                      <Text
                        style={[
                          styles.categoryBtnText,
                          isSelected && styles.categoryBtnTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  disabled={uploadMutation.isPending || isProcessingImage}
                  onPress={() => {
                    setSelectedImage(null);
                    setUploadModalVisible(false);
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  title={
                    uploadMutation.isPending || isProcessingImage ? 'Uploading...' : 'Upload Photo'
                  }
                  variant="primary"
                  loading={uploadMutation.isPending || isProcessingImage}
                  disabled={uploadMutation.isPending || isProcessingImage}
                  onPress={handleConfirmUpload}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Full Image Preview Modal */}
        <Modal
          visible={Boolean(previewImage)}
          animationType="fade"
          transparent
          onRequestClose={() => setPreviewImage(null)}
        >
          <View style={styles.fullPreviewOverlay}>
            <TouchableOpacity
              onPress={() => setPreviewImage(null)}
              style={styles.closePreviewBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={26} color="#FFFFFF" />
            </TouchableOpacity>
            {previewImage && (
              <Image
                source={{ uri: previewImage }}
                style={styles.fullPreviewImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 6,
    marginRight: theme.spacing.xs,
  },
  navTitleWrapper: {
    flex: 1,
  },
  navTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  navSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  actionHeader: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filtersWrapper: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingVertical: theme.spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filtersScroll: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  filterChipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  filterChipTextActive: {
    color: theme.colors.textOnPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  gridContent: {
    padding: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  photoCard: {
    flex: 0.5,
    margin: theme.spacing.xs,
    padding: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  imageWrapper: {
    width: '100%',
    height: 125,
    backgroundColor: '#000',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  cardInfo: {
    padding: theme.spacing.sm,
  },
  fileNameText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  fileSizeText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 6,
    borderRadius: theme.borderRadius.full,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    maxWidth: 260,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  uploadPreview: {
    width: '100%',
    height: 180,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#000',
    marginBottom: theme.spacing.md,
  },
  modalLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  categoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  categoryBtnActive: {
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.primarySoft,
  },
  categoryBtnText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  categoryBtnTextActive: {
    color: theme.colors.primaryLight,
    fontWeight: theme.fontWeight.bold,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  fullPreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePreviewBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullPreviewImage: {
    width: '100%',
    height: '80%',
  },
});
