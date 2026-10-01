import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  PanResponder,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as FileSystem from 'expo-file-system';
import { RotateCcw, Check, X, PenTool, Camera, ImageIcon, Trash2 } from 'lucide-react-native';
import { Button } from './Button';
import { Input } from './Input';
import { theme } from '../../theme/theme';
import { convertPathsToPngDataUrl } from '../../utils/signaturePng';

interface StampAssetInput {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
}

export interface SignaturePadModalProps {
  visible: boolean;
  title: string;
  signerNameLabel: string;
  initialSignerName?: string;
  initialSignerPhone?: string;
  showPhoneInput?: boolean;
  showStampOption?: boolean;
  initialStampUrl?: string | null;
  onClose: () => void;
  onConfirm: (payload: {
    signerName: string;
    signerPhone?: string;
    signatureDataUrl: string;
    stampDataUrl?: string | null;
  }) => Promise<void>;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  visible,
  title,
  signerNameLabel,
  initialSignerName = '',
  initialSignerPhone = '',
  showPhoneInput = false,
  showStampOption = false,
  initialStampUrl = null,
  onClose,
  onConfirm,
}) => {
  const [signerName, setSignerName] = useState(initialSignerName);
  const [signerPhone, setSignerPhone] = useState(initialSignerPhone);

  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [stampDataUrl, setStampDataUrl] = useState<string | null>(initialStampUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canvasRef = useRef<View>(null);

  // Sync initial props when opened
  useEffect(() => {
    if (visible) {
      setSignerName(initialSignerName);
      setSignerPhone(initialSignerPhone);
      setPaths([]);
      setCurrentPath('');
      setCapturedPreview(null);
      setStampDataUrl(initialStampUrl);
      setIsSubmitting(false);
    }
  }, [visible, initialSignerName, initialSignerPhone, initialStampUrl]);

  // Touch gesture responder for drawing smooth vector ink signatures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(`M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => `${prev} L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`);
      },
      onPanResponderRelease: () => {
        setCurrentPath((prev) => {
          if (prev) {
            setPaths((existing) => [...existing, prev]);
          }
          return '';
        });
      },
    })
  ).current;

  // Unsaved changes protection
  const hasUnsavedChanges =
    paths.length > 0 ||
    currentPath.length > 0 ||
    capturedPreview !== null ||
    (showStampOption && stampDataUrl !== initialStampUrl);

  const handleSafeClose = useCallback(() => {
    if (hasUnsavedChanges && !isSubmitting) {
      Alert.alert(
        'Discard Signature?',
        'You have an unsaved signature in progress.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: onClose,
          },
        ]
      );
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, isSubmitting, onClose]);

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
    setCapturedPreview(null);
  };

  const handleCapturePreview = async () => {
    const allPaths = [...paths];
    if (currentPath) allPaths.push(currentPath);

    if (allPaths.length === 0) {
      Alert.alert('Signature Required', 'Please draw a signature before proceeding.');
      return;
    }

    if (!signerName.trim()) {
      Alert.alert('Name Required', `Please enter the ${signerNameLabel.toLowerCase()}.`);
      return;
    }

    try {
      // Pure JavaScript PNG generator (RFC 2083 standard PNG, 0 native dependencies)
      const pngDataUrl = convertPathsToPngDataUrl(allPaths, 350, 180, 3);
      setCapturedPreview(pngDataUrl);
    } catch (err: any) {
      Alert.alert('Capture Error', 'Could not process signature canvas. Please try again.');
    }
  };

  // Stamp picker: Camera
  const handleCaptureStampCamera = async () => {
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
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is required to photograph company rubber stamp.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await processStampAsset(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err?.message || 'Failed to capture stamp photo.');
    }
  };

  // Stamp picker: Gallery
  const handlePickStampGallery = async () => {
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
        'Image picker native module (ExponentImagePicker) is not linked in this app build. Please rebuild your native app with `npx expo run:android`.'
      );
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery access is required to select company stamp image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await processStampAsset(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err?.message || 'Failed to select stamp image.');
    }
  };

  const processStampAsset = async (asset: StampAssetInput) => {
    let base64 = asset.base64;
    if (!base64 && asset.uri) {
      try {
        base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch {
        Alert.alert('Error', 'Could not read stamp image data.');
        return;
      }
    }

    if (!base64) {
      Alert.alert('Error', 'Image data could not be processed.');
      return;
    }

    const mime = asset.mimeType || 'image/png';
    setStampDataUrl(`data:${mime};base64,${base64}`);
  };

  const handleFinalSubmit = async () => {
    if (!signerName.trim()) {
      Alert.alert('Name Required', `Please enter the ${signerNameLabel.toLowerCase()}.`);
      return;
    }

    const allPaths = [...paths];
    if (currentPath) allPaths.push(currentPath);

    let sigData = capturedPreview;
    if (!sigData && allPaths.length > 0) {
      sigData = convertPathsToPngDataUrl(allPaths, 350, 180, 3);
    }

    if (!sigData) {
      Alert.alert('Signature Required', 'Please draw and review your signature before saving.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm({
        signerName: signerName.trim(),
        signerPhone: signerPhone.trim() || undefined,
        signatureDataUrl: sigData,
        stampDataUrl: stampDataUrl || null,
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Sign-off Error', err?.response?.data?.message || err?.message || 'Failed to submit signature.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleSafeClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <PenTool size={20} color={theme.colors.primaryLight} />
              <Text style={styles.titleText}>{title}</Text>
            </View>
            <TouchableOpacity
              onPress={handleSafeClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={isSubmitting}
            >
              <X size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Signer inputs */}
            <Input
              label={`${signerNameLabel} *`}
              placeholder={`Enter name`}
              value={signerName}
              onChangeText={setSignerName}
              containerStyle={{ marginBottom: theme.spacing.xs }}
            />

            {showPhoneInput && (
              <Input
                label="Contact Number"
                placeholder="Enter contact number"
                keyboardType="phone-pad"
                value={signerPhone}
                onChangeText={setSignerPhone}
                containerStyle={{ marginBottom: theme.spacing.xs }}
              />
            )}

            {/* Canvas or Preview Box */}
            <View style={styles.canvasContainer}>
              <View style={styles.canvasHeaderRow}>
                <Text style={styles.canvasInstruction}>
                  {capturedPreview ? 'Signature Preview' : 'Sign inside the white box below:'}
                </Text>
                {!capturedPreview && paths.length > 0 && (
                  <TouchableOpacity onPress={handleClear} style={styles.clearMiniBtn}>
                    <RotateCcw size={12} color={theme.colors.textMuted} />
                    <Text style={styles.clearMiniText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {capturedPreview ? (
                <View style={styles.previewBox}>
                  {paths.length > 0 ? (
                    <Svg style={styles.svgCanvas}>
                      {paths.map((p, index) => (
                        <Path
                          key={index}
                          d={p}
                          stroke="#0F172A"
                          strokeWidth={3}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                    </Svg>
                  ) : (
                    <Image source={{ uri: capturedPreview }} style={styles.previewImage} resizeMode="contain" />
                  )}
                </View>
              ) : (
                <View
                  ref={canvasRef}
                  collapsable={false}
                  style={styles.canvasWrapper}
                  {...panResponder.panHandlers}
                >
                  <Svg style={styles.svgCanvas}>
                    {paths.map((p, index) => (
                      <Path
                        key={index}
                        d={p}
                        stroke="#0F172A"
                        strokeWidth={3}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                    {currentPath ? (
                      <Path
                        d={currentPath}
                        stroke="#2563EB"
                        strokeWidth={3}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : null}
                  </Svg>

                  {/* Guide signing baseline */}
                  <View style={styles.signatureLine} pointerEvents="none">
                    <Text style={styles.signatureLineText}>✕ Sign Above</Text>
                  </View>

                  {paths.length === 0 && !currentPath && (
                    <View style={styles.canvasPlaceholder} pointerEvents="none">
                      <Text style={styles.placeholderText}>Draw Signature with Finger / Stylus</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Optional Customer Rubber Stamp Upload */}
            {showStampOption && (
              <View style={styles.stampSection}>
                <Text style={styles.stampTitle}>Company Rubber Stamp (Optional)</Text>
                {stampDataUrl ? (
                  <View style={styles.stampPreviewRow}>
                    <Image source={{ uri: stampDataUrl }} style={styles.stampThumbnail} resizeMode="contain" />
                    <View style={styles.stampDetails}>
                      <Text style={styles.stampAttachedText}>Stamp Attached</Text>
                      <TouchableOpacity
                        onPress={() => setStampDataUrl(null)}
                        style={styles.removeStampBtn}
                      >
                        <Trash2 size={13} color={theme.colors.error} />
                        <Text style={styles.removeStampText}>Remove Stamp</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.stampActionRow}>
                    <TouchableOpacity
                      style={styles.stampPickBtn}
                      onPress={handleCaptureStampCamera}
                    >
                      <Camera size={14} color={theme.colors.primaryLight} />
                      <Text style={styles.stampPickBtnText}>Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stampPickBtn}
                      onPress={handlePickStampGallery}
                    >
                      <ImageIcon size={14} color={theme.colors.primaryLight} />
                      <Text style={styles.stampPickBtnText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.controlsRow}>
              {capturedPreview ? (
                <>
                  <Button
                    title="Re-draw"
                    variant="outline"
                    icon={<RotateCcw size={16} color={theme.colors.primaryLight} />}
                    onPress={() => setCapturedPreview(null)}
                    disabled={isSubmitting}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title={isSubmitting ? 'Submitting...' : 'Confirm & Save'}
                    variant="primary"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    icon={<Check size={16} color={theme.colors.textOnPrimary} />}
                    onPress={handleFinalSubmit}
                    style={{ flex: 1 }}
                  />
                </>
              ) : (
                <>
                  <Button
                    title="Cancel"
                    variant="ghost"
                    onPress={handleSafeClose}
                    disabled={isSubmitting}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Review Signature"
                    variant="primary"
                    disabled={paths.length === 0 && !currentPath}
                    icon={<Check size={16} color={theme.colors.textOnPrimary} />}
                    onPress={handleCapturePreview}
                    style={{ flex: 1 }}
                  />
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '92%',
  },
  scrollContent: {
    paddingBottom: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
  },
  canvasContainer: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  canvasHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  canvasInstruction: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  clearMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  clearMiniText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  canvasWrapper: {
    height: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  svgCanvas: {
    width: '100%',
    height: '100%',
  },
  signatureLine: {
    position: 'absolute',
    bottom: 28,
    left: 16,
    right: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    borderStyle: 'dashed',
    paddingBottom: 2,
  },
  signatureLineText: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: theme.fontWeight.medium,
  },
  canvasPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: theme.fontSize.sm,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  previewBox: {
    height: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.accentEmerald,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  stampSection: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  stampTitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
    marginBottom: 8,
  },
  stampActionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  stampPickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stampPickBtnText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
  },
  stampPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  stampThumbnail: {
    width: 60,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stampDetails: {
    flex: 1,
  },
  stampAttachedText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accentEmerald,
    marginBottom: 4,
  },
  removeStampBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removeStampText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.error,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
});
