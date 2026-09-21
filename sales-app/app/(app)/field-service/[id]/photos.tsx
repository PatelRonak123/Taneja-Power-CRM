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
import * as ImagePicker from 'expo-image-picker';
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
  const user = useAuthStore((state) => state.user);

  const { data: fsrDetail, isLoading, refetch } = useFsrDetail(id);
  const uploadMutation = useUploadAttachment();
  const deleteMutation = useDeleteAttachment();

  const [selectedCategory, setSelectedCategory] = useState<FsrAttachmentCategory>('UPS_PHOTO');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const attachments = fsrDetail?.attachments || [];
  const canEdit = canEditFSR(user, fsrDetail?.fsr);

  const filteredAttachments =
    filterCategory === 'ALL'
      ? attachments
      : attachments.filter((att) => att.category === filterCategory);

  // Take photo with camera
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to capture photos.');
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
    if (!selectedImage || !selectedImage.base64) {
      Alert.alert('Error', 'Image data is missing.');
      return;
    }

    const mime = selectedImage.mimeType || 'image/jpeg';
    const fileName = selectedImage.fileName || `fsr-${selectedCategory.toLowerCase()}-${Date.now()}.jpg`;
    const fileSize = selectedImage.fileSize || Math.round(selectedImage.base64.length * 0.75);

    try {
      await uploadMutation.mutateAsync({
        id,
        payload: {
          category: selectedCategory,
          fileName,
          fileData: `data:${mime};base64,${selectedImage.base64}`,
          fileSize,
          mimeType: mime,
        },
      });

      setSelectedImage(null);
      setUploadModalVisible(false);
      Alert.alert('Uploaded', 'Photo attached to report successfully.');
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.message || 'Failed to upload photo.');
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
            await deleteMutation.mutateAsync({ id, attachmentId });
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
    // Prepend server base URL if relative path
    const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    // Strip trailing /api/v1 from env.API_BASE_URL to reach root server static uploads
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
            <TouchableOpacity
              onPress={() => setFilterCategory('ALL')}
              style={[styles.filterChip, filterCategory === 'ALL' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filterCategory === 'ALL' && styles.filterChipTextActive]}>
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
                      <Text style={[styles.categoryBtnText, isSelected && styles.categoryBtnTextActive]}>
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
                  onPress={() => {
                    setSelectedImage(null);
                    setUploadModalVisible(false);
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Upload Photo"
                  variant="primary"
                  loading={uploadMutation.isPending}
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
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filtersWrapper: {
    paddingVertical: theme.spacing.xs,
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
  },
  filterChipTextActive: {
    color: theme.colors.textOnPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  gridContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  photoCard: {
    flex: 1,
    margin: 4,
    padding: theme.spacing.sm,
  },
  imageWrapper: {
    height: 120,
    width: '100%',
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceElevated,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  cardInfo: {
    marginTop: theme.spacing.xs,
  },
  fileNameText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  fileSizeText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  deleteBtn: {
    position: 'absolute',
    top: theme.spacing.sm + 4,
    right: theme.spacing.sm + 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    padding: 6,
    borderRadius: theme.borderRadius.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  uploadPreview: {
    width: '100%',
    height: 160,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  modalLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
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
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  categoryBtnText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  categoryBtnTextActive: {
    color: theme.colors.textOnPrimary,
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
    width: '95%',
    height: '80%',
  },
});
