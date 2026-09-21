import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  PanResponder,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { RotateCcw, Check, X, PenTool } from 'lucide-react-native';
import { Button } from './Button';
import { Input } from './Input';
import { theme } from '../../theme/theme';

export interface SignaturePadModalProps {
  visible: boolean;
  title: string;
  signerNameLabel: string;
  initialSignerName?: string;
  initialSignerPhone?: string;
  showPhoneInput?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    signerName: string;
    signerPhone?: string;
    signatureDataUrl: string;
  }) => Promise<void>;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  visible,
  title,
  signerNameLabel,
  initialSignerName = '',
  initialSignerPhone = '',
  showPhoneInput = false,
  onClose,
  onConfirm,
}) => {
  const [signerName, setSignerName] = useState(initialSignerName);
  const [signerPhone, setSignerPhone] = useState(initialSignerPhone);

  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canvasRef = useRef<View>(null);

  // Sync initial props
  React.useEffect(() => {
    if (visible) {
      setSignerName(initialSignerName);
      setSignerPhone(initialSignerPhone);
      setPaths([]);
      setCurrentPath('');
      setCapturedPreview(null);
      setIsSubmitting(false);
    }
  }, [visible, initialSignerName, initialSignerPhone]);

  // Touch gesture responder
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

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
    setCapturedPreview(null);
  };

  const handleCapturePreview = async () => {
    if (paths.length === 0 && !currentPath) {
      Alert.alert('Signature Required', 'Please draw your signature before confirming.');
      return;
    }

    if (!signerName.trim()) {
      Alert.alert('Name Required', `Please enter the ${signerNameLabel.toLowerCase()}.`);
      return;
    }

    try {
      if (canvasRef.current) {
        const dataUrl = await captureRef(canvasRef.current, {
          format: 'png',
          quality: 0.9,
          result: 'data-uri',
        });
        setCapturedPreview(dataUrl);
      }
    } catch (err: any) {
      Alert.alert('Capture Error', 'Could not snapshot signature canvas. Please try again.');
    }
  };

  const handleFinalSubmit = async () => {
    if (!capturedPreview) return;
    try {
      setIsSubmitting(true);
      await onConfirm({
        signerName: signerName.trim(),
        signerPhone: signerPhone.trim() || undefined,
        signatureDataUrl: capturedPreview,
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Sign-off Error', err?.message || 'Failed to upload signature.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <PenTool size={20} color={theme.colors.primaryLight} />
              <Text style={styles.titleText}>{title}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Signer inputs */}
          <Input
            label={`${signerNameLabel} *`}
            placeholder={`Enter full name`}
            value={signerName}
            onChangeText={setSignerName}
            containerStyle={{ marginBottom: theme.spacing.xs }}
          />

          {showPhoneInput && (
            <Input
              label="Contact Number"
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              value={signerPhone}
              onChangeText={setSignerPhone}
              containerStyle={{ marginBottom: theme.spacing.xs }}
            />
          )}

          {/* Canvas or Preview */}
          <View style={styles.canvasContainer}>
            <Text style={styles.canvasInstruction}>
              {capturedPreview ? 'Signature Preview' : 'Sign inside the box below:'}
            </Text>

            {capturedPreview ? (
              <View style={styles.previewBox}>
                <Image source={{ uri: capturedPreview }} style={styles.previewImage} resizeMode="contain" />
              </View>
            ) : (
              <View ref={canvasRef} collapsable={false} style={styles.canvasWrapper} {...panResponder.panHandlers}>
                <Svg style={styles.svgCanvas}>
                  {paths.map((p, index) => (
                    <Path
                      key={index}
                      d={p}
                      stroke="#FFFFFF"
                      strokeWidth={3.5}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {currentPath ? (
                    <Path
                      d={currentPath}
                      stroke="#3B82F6"
                      strokeWidth={3.5}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                </Svg>
                {paths.length === 0 && !currentPath && (
                  <View style={styles.canvasPlaceholder} pointerEvents="none">
                    <Text style={styles.placeholderText}>Draw Signature with Touch</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Canvas Action Controls */}
          <View style={styles.controlsRow}>
            {capturedPreview ? (
              <>
                <Button
                  title="Re-draw"
                  variant="outline"
                  icon={<RotateCcw size={16} color={theme.colors.primaryLight} />}
                  onPress={() => setCapturedPreview(null)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Confirm & Upload"
                  variant="primary"
                  loading={isSubmitting}
                  icon={<Check size={16} color={theme.colors.textOnPrimary} />}
                  onPress={handleFinalSubmit}
                  style={{ flex: 1 }}
                />
              </>
            ) : (
              <>
                <Button
                  title="Clear"
                  variant="ghost"
                  icon={<RotateCcw size={16} color={theme.colors.textSecondary} />}
                  onPress={handleClear}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Review Signature"
                  variant="primary"
                  icon={<Check size={16} color={theme.colors.textOnPrimary} />}
                  onPress={handleCapturePreview}
                  style={{ flex: 1 }}
                />
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '92%',
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
    marginBottom: theme.spacing.md,
  },
  canvasInstruction: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: 6,
    fontWeight: theme.fontWeight.medium,
  },
  canvasWrapper: {
    height: 180,
    backgroundColor: '#0F172A',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: '#334155',
    overflow: 'hidden',
    position: 'relative',
  },
  svgCanvas: {
    width: '100%',
    height: '100%',
  },
  canvasPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  previewBox: {
    height: 180,
    backgroundColor: '#0F172A',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.accentEmerald,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 10,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
});
