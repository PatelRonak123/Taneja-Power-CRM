import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Image,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Cpu,
  UserCheck,
  Building2,
  FileText,
  AlertCircle,
  BatteryCharging,
  Package,
  Wrench,
  Clock,
  ShieldCheck,
  Zap,
  Play,
  Edit3,
  CheckCircle2,
  Save,
  X,
  CreditCard,
  MessageSquare,
  User as UserIcon,
  Activity,
  Camera,
  ChevronRight,
  PenTool,
  RotateCcw,
  Share2,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { useAuthStore } from '../../../src/auth/auth.store';
import {
  useFsrDetail,
  useStartFsr,
  useUpdateFsr,
  useCompleteFsr,
  useCustomerSignOff,
  useFseSignOff,
  useAddPart,
  useDeletePart,
} from '../../../src/hooks/useFsr';
import {
  canStartFSR,
  canEditFSR,
  canCompleteFSR,
  canSignOffFSR,
  canDownloadFSR,
} from '../../../src/utils/fsrPermissions';
import { SignaturePadModal } from '../../../src/components/ui/SignaturePadModal';
import { env } from '../../../src/config/env';
import { fsrPdfService } from '../../../src/services/fsrPdf.service';
import { LocationService, LocationServiceError } from '../../../src/services/location.service';
import { theme } from '../../../src/theme/theme';
import { formatDate } from '../../../src/utils/date';
import { FsrCallType, FsrStatus, UpdateFsrPayload, PartPayload } from '../../../src/types/fsr.types';

const EQUIPMENT_STATUS_OPTIONS = [
  { label: 'Working', value: 'WORKING' },
  { label: 'Not Working', value: 'NOT_WORKING' },
  { label: 'Degraded', value: 'DEGRADED' },
  { label: 'Standby', value: 'STANDBY' },
];

const OLD_PART_STATUS_OPTIONS = [
  { label: 'Defective Returned', value: 'DEFECTIVE_RETURNED' },
  { label: 'Scrapped at Site', value: 'SCRAPPED' },
  { label: 'Left With Customer', value: 'WITH_CUSTOMER' },
  { label: 'Pending Inspection', value: 'PENDING_INSPECTION' },
];

export default function FsrDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);

  const { data: fsrDetail, isLoading, refetch, error } = useFsrDetail(id || '');
  const startMutation = useStartFsr();
  const updateMutation = useUpdateFsr();
  const fseSignOffMutation = useFseSignOff();
  const customerSignOffMutation = useCustomerSignOff();
  const completeMutation = useCompleteFsr();
  const addPartMutation = useAddPart();
  const deletePartMutation = useDeletePart();

  const [isStarting, setIsStarting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFseSigModalOpen, setIsFseSigModalOpen] = useState(false);
  const [isCustSigModalOpen, setIsCustSigModalOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Replacement Part Modal State
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [partForm, setPartForm] = useState<PartPayload>({
    partName: '',
    partNumber: '',
    quantity: 1,
    oldPartStatus: 'DEFECTIVE_RETURNED',
    replacementDetails: '',
    remarks: '',
  });
  const [partError, setPartError] = useState<string | null>(null);

  // Form State for Edit Mode
  const [formData, setFormData] = useState({
    problemReported: '',
    reasonForVisit: '',
    productModel: '',
    productSerialNumber: '',
    equipmentStatus: 'WORKING',
    charges: '',
    chargesRemarks: '',
    standbyDetails: '',
    fseFeedback: '',
    customerFeedback: '',
    customerContactName: '',
  });

  const fsr = fsrDetail?.fsr;

  // Resolve absolute image URL for signatures/attachments
  const resolveImageUrl = useCallback((filePath?: string | null) => {
    if (!filePath) return null;
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const serverRoot = env.API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    return `${serverRoot}${cleanPath}`;
  }, []);

  // Initialize/sync form state when fsrDetail loads or changes
  useEffect(() => {
    if (fsr) {
      setFormData({
        problemReported: fsr.problemReported || '',
        reasonForVisit: fsr.reasonForVisit || '',
        productModel: fsr.productModel || '',
        productSerialNumber: fsr.productSerialNumber || '',
        equipmentStatus: fsr.equipmentStatus || 'WORKING',
        charges: fsr.charges != null && Number(fsr.charges) > 0 ? String(fsr.charges) : '',
        chargesRemarks: fsr.chargesRemarks || '',
        standbyDetails: fsr.standbyDetails || '',
        fseFeedback: fsr.fseFeedback || '',
        customerFeedback: fsr.customerFeedback || '',
        customerContactName: fsr.customerContactName || '',
      });
    }
  }, [fsr]);

  // Authorization flags
  const canStart = useMemo(() => {
    if (!user || !fsr) return false;
    return canStartFSR(user, fsr);
  }, [user, fsr]);

  const canEdit = useMemo(() => {
    if (!user || !fsr) return false;
    return canEditFSR(user, fsr);
  }, [user, fsr]);

  const canSign = useMemo(() => {
    if (!user || !fsr) return false;
    return canSignOffFSR(user, fsr);
  }, [user, fsr]);

  const canComplete = useMemo(() => {
    if (!user || !fsr) return false;
    return canCompleteFSR(user, fsr);
  }, [user, fsr]);

  const canDownload = useMemo(() => {
    if (!user || !fsr) return false;
    return canDownloadFSR(user, fsr);
  }, [user, fsr]);

  // Track if form is dirty
  const isDirty = useMemo(() => {
    if (!fsr) return false;
    return (
      formData.problemReported !== (fsr.problemReported || '') ||
      formData.reasonForVisit !== (fsr.reasonForVisit || '') ||
      formData.productModel !== (fsr.productModel || '') ||
      formData.productSerialNumber !== (fsr.productSerialNumber || '') ||
      formData.equipmentStatus !== (fsr.equipmentStatus || 'WORKING') ||
      formData.charges !== (fsr.charges != null && Number(fsr.charges) > 0 ? String(fsr.charges) : '') ||
      formData.chargesRemarks !== (fsr.chargesRemarks || '') ||
      formData.standbyDetails !== (fsr.standbyDetails || '') ||
      formData.fseFeedback !== (fsr.fseFeedback || '') ||
      formData.customerFeedback !== (fsr.customerFeedback || '') ||
      formData.customerContactName !== (fsr.customerContactName || '')
    );
  }, [formData, fsr]);

  // Handle Cancel Edit with Unsaved Changes check
  const handleCancelEdit = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              if (fsr) {
                setFormData({
                  problemReported: fsr.problemReported || '',
                  reasonForVisit: fsr.reasonForVisit || '',
                  productModel: fsr.productModel || '',
                  productSerialNumber: fsr.productSerialNumber || '',
                  equipmentStatus: fsr.equipmentStatus || 'WORKING',
                  charges: fsr.charges != null && Number(fsr.charges) > 0 ? String(fsr.charges) : '',
                  chargesRemarks: fsr.chargesRemarks || '',
                  standbyDetails: fsr.standbyDetails || '',
                  fseFeedback: fsr.fseFeedback || '',
                  customerFeedback: fsr.customerFeedback || '',
                  customerContactName: fsr.customerContactName || '',
                });
              }
              setValidationError(null);
              setIsEditing(false);
            },
          },
        ]
      );
    } else {
      setValidationError(null);
      setIsEditing(false);
    }
  }, [isDirty, fsr]);

  // Handle Back Button navigation with Unsaved Changes check
  const handleBackPress = useCallback(() => {
    if (isEditing && isDirty) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  }, [isEditing, isDirty, router]);

  // Android hardware back handler
  useEffect(() => {
    const onHardwareBack = () => {
      if (isEditing && isDirty) {
        handleBackPress();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [isEditing, isDirty, handleBackPress]);

  // Start Visit Action
  const handleStartVisit = () => {
    if (!fsr) return;

    Alert.alert(
      'Start Service Visit?',
      'You are about to begin this service visit.\nLocation access is required to continue.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Visit',
          onPress: async () => {
            setIsStarting(true);
            try {
              // 1. Client-side visit-start gate: check foreground location permission & availability
              await LocationService.getCurrentPosition();

              // 2. Call existing backend start endpoint (POST /api/v1/field-service/:id/start)
              await startMutation.mutateAsync(fsr.id);
              Alert.alert('Success', 'Service visit started');
            } catch (err: any) {
              let errorMsg = 'Failed to start service visit. Please try again.';
              if (err instanceof LocationServiceError) {
                errorMsg = err.message;
                if (err.code === 'PERMISSION_PERMANENTLY_DENIED') {
                  Alert.alert('Location Permission Required', errorMsg, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => LocationService.openAppSettings() },
                  ]);
                  return;
                }
              } else if (err?.response?.data?.message) {
                errorMsg = err.response.data.message;
              } else if (err?.message) {
                errorMsg = err.message;
              }
              Alert.alert('Unable to Start Visit', errorMsg);
            } finally {
              setIsStarting(false);
            }
          },
        },
      ]
    );
  };

  // Save Edit Action
  const handleSave = async () => {
    if (!fsr) return;

    let numericCharges: number | undefined = undefined;
    if (formData.charges.trim()) {
      const parsed = Number(formData.charges.trim());
      if (isNaN(parsed) || parsed < 0) {
        setValidationError('Charges must be a valid non-negative number.');
        return;
      }
      numericCharges = parsed;
    }
    setValidationError(null);

    const payload: Partial<UpdateFsrPayload> = {
      problemReported: formData.problemReported.trim() || undefined,
      reasonForVisit: formData.reasonForVisit.trim() || undefined,
      productModel: formData.productModel.trim() || undefined,
      productSerialNumber: formData.productSerialNumber.trim() || undefined,
      equipmentStatus: formData.equipmentStatus,
      charges: numericCharges ?? (fsr.charges ? Number(fsr.charges) : 0),
      chargesRemarks: formData.chargesRemarks.trim() || undefined,
      standbyDetails: formData.standbyDetails.trim() || undefined,
      fseFeedback: formData.fseFeedback.trim() || undefined,
      customerFeedback: formData.customerFeedback.trim() || undefined,
      customerContactName: formData.customerContactName.trim() || undefined,
    };

    try {
      await updateMutation.mutateAsync({ id: fsr.id, payload });
      setIsEditing(false);
      Alert.alert('Success', 'FSR updated successfully');
    } catch (err: any) {
      let errorMsg = 'Failed to update FSR. Please try again.';
      if (err?.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err?.message) {
        errorMsg = err.message;
      }
      Alert.alert('Update Failed', errorMsg);
    }
  };

  // Submit FSE Sign-Off
  const handleFseSignOffConfirm = async (payload: {
    signerName: string;
    signerPhone?: string;
    signatureDataUrl: string;
  }) => {
    if (!fsr) return;
    await fseSignOffMutation.mutateAsync({
      id: fsr.id,
      payload: {
        fseName: payload.signerName,
        fseNumber: payload.signerPhone || null,
        fseSignature: payload.signatureDataUrl,
        fseSignatureDate: new Date().toISOString(),
      },
    });
    Alert.alert('Success', 'Service Engineer sign-off recorded successfully.');
  };

  // Submit Customer Sign-Off
  const handleCustomerSignOffConfirm = async (payload: {
    signerName: string;
    signerPhone?: string;
    signatureDataUrl: string;
    stampDataUrl?: string | null;
  }) => {
    if (!fsr) return;
    await customerSignOffMutation.mutateAsync({
      id: fsr.id,
      payload: {
        customerContactName: payload.signerName,
        customerSignature: payload.signatureDataUrl,
        customerStamp: payload.stampDataUrl || null,
        customerSignedAt: new Date().toISOString(),
      },
    });
    Alert.alert('Success', 'Customer sign-off recorded successfully.');
  };

  // Add Replacement Part Handlers
  const handleOpenAddPartModal = () => {
    setPartForm({
      partName: '',
      partNumber: '',
      quantity: 1,
      oldPartStatus: 'DEFECTIVE_RETURNED',
      replacementDetails: '',
      remarks: '',
    });
    setPartError(null);
    setIsPartModalOpen(true);
  };

  const handleSavePart = async () => {
    if (!fsr) return;
    if (!partForm.partName.trim()) {
      setPartError('Part name is required');
      return;
    }
    const qty = Number(partForm.quantity);
    if (isNaN(qty) || qty <= 0) {
      setPartError('Quantity must be greater than 0');
      return;
    }

    try {
      await addPartMutation.mutateAsync({
        id: fsr.id,
        payload: {
          partName: partForm.partName.trim(),
          partNumber: partForm.partNumber?.trim() || undefined,
          quantity: qty,
          oldPartStatus: partForm.oldPartStatus || 'DEFECTIVE_RETURNED',
          replacementDetails: partForm.replacementDetails?.trim() || undefined,
          remarks: partForm.remarks?.trim() || undefined,
        },
      });
      setIsPartModalOpen(false);
      Alert.alert('Success', 'Replacement part added successfully');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to add part';
      Alert.alert('Error', msg);
    }
  };

  const handleDeletePart = (partId?: string, partName?: string) => {
    if (!fsr || !partId) return;
    Alert.alert(
      'Remove Part',
      `Are you sure you want to remove "${partName || 'this part'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePartMutation.mutateAsync({ id: fsr.id, partId });
              Alert.alert('Success', 'Part removed');
            } catch (err: any) {
              const msg = err?.response?.data?.message || err?.message || 'Failed to remove part';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  // Complete FSR Action with Validations & Confirmation
  const handleCompleteVisit = () => {
    if (!fsr) return;

    if (!fsr.customerName) {
      Alert.alert('Missing Information', 'Customer details are incomplete on this FSR.');
      return;
    }
    if (!fsr.visitDate) {
      Alert.alert('Missing Information', 'Visit date is missing on this FSR.');
      return;
    }
    if (!fsr.callType) {
      Alert.alert('Missing Information', 'Call type is missing on this FSR.');
      return;
    }

    const hasFseSig = Boolean(fsr.fseSignature);
    const hasCustSig = Boolean(fsr.customerSignature);

    const proceedCompletion = () => {
      Alert.alert(
        'Complete Service Visit?',
        'You are about to mark this Field Service Report as COMPLETED.\nOnce completed, further operational modifications will be restricted.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete Visit',
            style: 'default',
            onPress: async () => {
              setIsCompleting(true);
              try {
                await completeMutation.mutateAsync(fsr.id);
                Alert.alert('Visit Completed', 'Field Service Report has been marked as COMPLETED.');
              } catch (err: any) {
                const errorMsg =
                  err?.response?.data?.message || err?.message || 'Failed to complete FSR.';
                Alert.alert('Completion Error', errorMsg);
              } finally {
                setIsCompleting(false);
              }
            },
          },
        ]
      );
    };

    if (!hasFseSig || !hasCustSig) {
      const missingList: string[] = [];
      if (!hasFseSig) missingList.push('Service Engineer (FSE) Signature');
      if (!hasCustSig) missingList.push('Customer Representative Signature');

      Alert.alert(
        'Signatures Incomplete',
        `The following sign-off is pending:\n• ${missingList.join('\n• ')}\n\nDo you want to proceed with completion anyway?`,
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Complete Anyway',
            style: 'destructive',
            onPress: proceedCompletion,
          },
        ]
      );
      return;
    }

    proceedCompletion();
  };

  // Download & Share Official FSR PDF
  const handleDownloadPdf = async () => {
    if (!fsr) return;
    try {
      setIsDownloadingPdf(true);
      await fsrPdfService.downloadAndSharePdf(fsr.id, fsr.fsrNumber);
    } catch (err: any) {
      Alert.alert('PDF Error', err?.message || 'Failed to download or share official FSR PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const getStatusVariant = (status?: FsrStatus | string): 'primary' | 'success' | 'warning' | 'error' | 'neutral' => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'warning';
      case 'COMPLETED':
        return 'success';
      case 'CLOSED':
        return 'primary';
      case 'CANCELLED':
        return 'error';
      case 'DRAFT':
      default:
        return 'neutral';
    }
  };

  const getCallTypeVariant = (callType?: FsrCallType | string): 'primary' | 'success' | 'warning' | 'error' | 'neutral' => {
    switch (callType) {
      case 'BD':
      case 'BREAKDOWN':
        return 'error';
      case 'PM':
      case 'PREVENTIVE_MAINTENANCE':
        return 'primary';
      case 'INSTALLATION':
        return 'success';
      case 'COURTESY':
      default:
        return 'neutral';
    }
  };

  const formatCallTypeLabel = (callType?: string) => {
    switch (callType) {
      case 'BD':
      case 'BREAKDOWN':
        return 'Breakdown Service';
      case 'PM':
      case 'PREVENTIVE_MAINTENANCE':
        return 'Preventive Maintenance';
      case 'INSTALLATION':
        return 'Installation & Commissioning';
      case 'COURTESY':
        return 'Courtesy Visit';
      default:
        return callType || 'Service Visit';
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading report details...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // 2. Error State
  if (error || !fsrDetail || !fsr) {
    return (
      <ScreenContainer>
        <View style={styles.centerContainer}>
          <AlertCircle size={52} color={theme.colors.accentRose} />
          <Text style={styles.errorTitle}>Unable to load report</Text>
          <Text style={styles.errorSubtitle}>
            {error instanceof Error ? error.message : 'The requested Field Service Report could not be found.'}
          </Text>
          <View style={styles.errorActionRow}>
            <Button title="Try Again" variant="primary" onPress={() => refetch()} style={styles.actionBtn} />
            <Button title="Go Back" variant="outline" onPress={() => router.back()} style={styles.actionBtn} />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const { customer, destination, product, serviceEngineer, siteObservation, batteryBanks, parts, attachments } = fsrDetail;

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Navigation Bar */}
          <View style={styles.navBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ArrowLeft size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.navTitleContainer}>
              <Text style={styles.navTitle} numberOfLines={1}>
                {fsr.fsrNumber}
              </Text>
              <Text style={styles.navSubtitle}>
                {isEditing ? 'Editing Service Report' : 'Field Service Report'}
              </Text>
            </View>

            {/* Header Actions: PDF Download & Edit/Cancel */}
            <View style={styles.navActionsRow}>
              {!isEditing && canDownload && (
                <TouchableOpacity
                  style={styles.navPdfButton}
                  onPress={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  activeOpacity={0.7}
                >
                  {isDownloadingPdf ? (
                    <ActivityIndicator size="small" color={theme.colors.primaryLight} />
                  ) : (
                    <>
                      <Share2 size={15} color={theme.colors.primaryLight} />
                      <Text style={styles.navActionText}>PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {!isEditing && canEdit && (
                <TouchableOpacity
                  style={styles.navActionButton}
                  onPress={() => setIsEditing(true)}
                  activeOpacity={0.7}
                >
                  <Edit3 size={16} color={theme.colors.primaryLight} />
                  <Text style={styles.navActionText}>Edit</Text>
                </TouchableOpacity>
              )}

              {isEditing && (
                <TouchableOpacity
                  style={styles.navActionButton}
                  onPress={handleCancelEdit}
                  activeOpacity={0.7}
                >
                  <X size={16} color={theme.colors.accentRose} />
                  <Text style={[styles.navActionText, { color: theme.colors.accentRose }]}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Summary Banner */}
            <Card style={styles.heroCard}>
              <View style={styles.badgeRow}>
                <Badge
                  label={formatCallTypeLabel(fsr.callType)}
                  variant={getCallTypeVariant(fsr.callType)}
                  size="md"
                />
                <Badge
                  label={fsr.status.replace('_', ' ')}
                  variant={getStatusVariant(fsr.status)}
                  size="md"
                />
              </View>

              <Text style={styles.heroCustomerName}>
                {customer?.companyName || customer?.name || fsr.customerName}
              </Text>

              <View style={styles.heroMetaRow}>
                <View style={styles.heroMetaItem}>
                  <Calendar size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.heroMetaText}>{formatDate(fsr.visitDate)}</Text>
                </View>
                {fsr.warrantyStatus && (
                  <View style={styles.heroMetaItem}>
                    <ShieldCheck size={14} color={theme.colors.accentEmerald} />
                    <Text style={styles.heroMetaText}>{fsr.warrantyStatus.replace(/_/g, ' ')}</Text>
                  </View>
                )}
                {fsr.billingStatus && (
                  <View style={styles.heroMetaItem}>
                    <Zap size={14} color={theme.colors.accentAmber} />
                    <Text style={styles.heroMetaText}>{fsr.billingStatus.replace(/_/g, ' ')}</Text>
                  </View>
                )}
              </View>
            </Card>

            {/* IN_PROGRESS Active Service Banner */}
            {fsr.status === 'IN_PROGRESS' && (
              <Card style={styles.inProgressCard}>
                <View style={styles.inProgressHeader}>
                  <View style={styles.inProgressPulse}>
                    <Activity size={18} color="#F59E0B" />
                  </View>
                  <View style={styles.inProgressTitleBlock}>
                    <Text style={styles.inProgressTitle}>Service Visit In Progress</Text>
                    <Text style={styles.inProgressSubtitle}>
                      Active on-site visit. Review and update technical service details below.
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* DRAFT Start Visit Action Card */}
            {fsr.status === 'DRAFT' && canStart && (
              <Card style={styles.startVisitCard}>
                <View style={styles.startVisitHeader}>
                  <View style={styles.startVisitIconBlock}>
                    <Play size={20} color={theme.colors.primaryLight} fill={theme.colors.primaryLight} />
                  </View>
                  <View style={styles.startVisitTitleBlock}>
                    <Text style={styles.startVisitTitle}>Ready to Start Visit?</Text>
                    <Text style={styles.startVisitSubtitle}>
                      Begin your service visit on site. Location access will be verified before starting.
                    </Text>
                  </View>
                </View>
                <Button
                  title={isStarting ? 'Starting Visit...' : 'Start Service Visit'}
                  variant="primary"
                  loading={isStarting}
                  disabled={isStarting}
                  onPress={handleStartVisit}
                  style={styles.startVisitButton}
                />
              </Card>
            )}

            {/* Read-Only Notice for Draft when user is not authorized to start */}
            {fsr.status === 'DRAFT' && !canStart && (
              <View style={styles.noticeContainer}>
                <AlertCircle size={16} color={theme.colors.accentAmber} style={styles.noticeIcon} />
                <Text style={styles.noticeText}>
                  This visit is in DRAFT status and can only be started by the assigned service engineer.
                </Text>
              </View>
            )}

            {/* Validation Error Banner */}
            {validationError && (
              <View style={styles.validationErrorBanner}>
                <AlertCircle size={16} color={theme.colors.error} style={styles.inlineIcon} />
                <Text style={styles.validationErrorText}>{validationError}</Text>
              </View>
            )}

            {/* Customer & Destination Site Card */}
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Building2 size={18} color={theme.colors.primaryLight} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Customer & Destination</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Client Name</Text>
                <Text style={styles.detailValue}>{customer?.name || fsr.customerName}</Text>
              </View>

              {customer?.companyName && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Company</Text>
                  <Text style={styles.detailValue}>{customer.companyName}</Text>
                </View>
              )}

              {/* Editable or display customerContactName */}
              {isEditing ? (
                <Input
                  label="Contact Person Name"
                  placeholder="On-site contact person"
                  value={formData.customerContactName}
                  onChangeText={(val) => setFormData((prev) => ({ ...prev, customerContactName: val }))}
                />
              ) : (
                Boolean(fsr.customerContactName) && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Contact Person</Text>
                    <Text style={styles.detailValue}>
                      {fsr.customerContactName}
                    </Text>
                  </View>
                )
              )}

              {(customer?.phone || fsr.customerPhone) && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Contact Phone</Text>
                  <View style={styles.iconValueRow}>
                    <Phone size={13} color={theme.colors.textMuted} style={styles.inlineIcon} />
                    <Text style={styles.detailValue}>{customer?.phone || fsr.customerPhone}</Text>
                  </View>
                </View>
              )}

              {(customer?.email || fsr.customerEmail) && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Contact Email</Text>
                  <View style={styles.iconValueRow}>
                    <Mail size={13} color={theme.colors.textMuted} style={styles.inlineIcon} />
                    <Text style={styles.detailValue}>{customer?.email || fsr.customerEmail}</Text>
                  </View>
                </View>
              )}

              {destination && (
                <View style={[styles.detailRow, styles.destinationBlock]}>
                  <Text style={styles.detailLabel}>Service Location</Text>
                  <View style={styles.iconValueRow}>
                    <MapPin size={14} color={theme.colors.accentRose} style={styles.inlineIcon} />
                    <Text style={styles.destinationText}>
                      {destination.name}
                      {destination.city ? `, ${destination.city}` : ''}
                      {destination.address ? `\n${destination.address}` : ''}
                    </Text>
                  </View>
                </View>
              )}
            </Card>

            {/* Equipment & UPS Information Card */}
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Cpu size={18} color={theme.colors.primaryLight} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Equipment & Product</Text>
              </View>

              {isEditing ? (
                <>
                  <Input
                    label="Equipment / Product Model"
                    placeholder="e.g. Vertiv Liebert GXT4 10kVA"
                    value={formData.productModel}
                    onChangeText={(val) => setFormData((prev) => ({ ...prev, productModel: val }))}
                  />

                  <Input
                    label="Serial Number"
                    placeholder="e.g. SN-2024-9982"
                    value={formData.productSerialNumber}
                    onChangeText={(val) => setFormData((prev) => ({ ...prev, productSerialNumber: val }))}
                  />

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Equipment Status</Text>
                    <View style={styles.chipRow}>
                      {EQUIPMENT_STATUS_OPTIONS.map((opt) => {
                        const isSelected = formData.equipmentStatus === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            style={[styles.statusChip, isSelected && styles.statusChipActive]}
                            onPress={() => setFormData((prev) => ({ ...prev, equipmentStatus: opt.value }))}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.statusChipText,
                                isSelected && styles.statusChipTextActive,
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Model / System</Text>
                    <Text style={styles.detailValue}>
                      {fsr.productModel || product?.name || 'Not specified'}
                    </Text>
                  </View>

                  {fsr.productMake && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Make</Text>
                      <Text style={styles.detailValue}>{fsr.productMake}</Text>
                    </View>
                  )}

                  {fsr.productSerialNumber && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Serial Number</Text>
                      <Text style={styles.detailMonoValue}>{fsr.productSerialNumber}</Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Equipment Status</Text>
                    <Text style={styles.detailValue}>{fsr.equipmentStatus || 'WORKING'}</Text>
                  </View>
                </>
              )}

              {siteObservation?.upsLocation && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>UPS Room Location</Text>
                  <Text style={styles.detailValue}>
                    {siteObservation.upsLocation.replace(/_/g, ' ')}
                    {siteObservation.otherLocationSpecification
                      ? ` (${siteObservation.otherLocationSpecification})`
                      : ''}
                  </Text>
                </View>
              )}
            </Card>

            {/* Assigned Engineer & Dispatch Card */}
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <UserCheck size={18} color={theme.colors.primaryLight} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Field Assignment</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service Engineer</Text>
                <Text style={styles.detailValue}>
                  {serviceEngineer?.fullName || fsr.fseName || 'Assigned Engineer'}
                </Text>
              </View>

              {serviceEngineer?.phone && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Engineer Contact</Text>
                  <Text style={styles.detailValue}>{serviceEngineer.phone}</Text>
                </View>
              )}

              {serviceEngineer?.designation && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Designation</Text>
                  <Text style={styles.detailValue}>{serviceEngineer.designation}</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Visit Schedule</Text>
                <View style={styles.iconValueRow}>
                  <Clock size={13} color={theme.colors.textMuted} style={styles.inlineIcon} />
                  <Text style={styles.detailValue}>{formatDate(fsr.visitDate)}</Text>
                </View>
              </View>
            </Card>

            {/* Problem Reported & Visit Reason Card */}
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <FileText size={18} color={theme.colors.primaryLight} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Reported Reason & Details</Text>
              </View>

              {isEditing ? (
                <>
                  <Input
                    label="Reason for Visit"
                    placeholder="Describe purpose of this visit"
                    value={formData.reasonForVisit}
                    onChangeText={(val) => setFormData((prev) => ({ ...prev, reasonForVisit: val }))}
                    multiline
                    numberOfLines={3}
                    style={styles.multilineInput}
                  />

                  <Input
                    label="Problem Reported"
                    placeholder="Customer reported symptoms or faults"
                    value={formData.problemReported}
                    onChangeText={(val) => setFormData((prev) => ({ ...prev, problemReported: val }))}
                    multiline
                    numberOfLines={3}
                    style={styles.multilineInput}
                  />
                </>
              ) : (
                <>
                  <View style={styles.notesBlock}>
                    <Text style={styles.notesLabel}>Reason for Visit</Text>
                    <Text style={styles.notesContent}>
                      {fsr.reasonForVisit || 'Scheduled service visit.'}
                    </Text>
                  </View>

                  {fsr.problemReported && (
                    <View style={[styles.notesBlock, styles.notesBlockSpaced]}>
                      <Text style={styles.notesLabel}>Problem Reported</Text>
                      <Text style={styles.notesContent}>{fsr.problemReported}</Text>
                    </View>
                  )}

                  {siteObservation?.observationsNotes && (
                    <View style={[styles.notesBlock, styles.notesBlockSpaced]}>
                      <Text style={styles.notesLabel}>Site Observations</Text>
                      <Text style={styles.notesContent}>{siteObservation.observationsNotes}</Text>
                    </View>
                  )}
                </>
              )}
            </Card>

            {/* Standby, Charges & Feedback Card */}
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <CreditCard size={18} color={theme.colors.primaryLight} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Standby, Charges & Feedback</Text>
              </View>

              {isEditing ? (
                <>
                  <Input
                    label="Standby Equipment"
                    placeholder="e.g. 10kVA Standby UPS provided / None"
                    value={formData.standbyDetails}
                    onChangeText={(val) => setFormData((prev) => ({ ...prev, standbyDetails: val }))}
                  />

                  <Input
                    label="Service Charges (₹)"
                    placeholder="0"
                    keyboardType="numeric"
                    value={formData.charges}
                    onChangeText={(val) => setFormData((prev) => ({ ...prev, charges: val }))}
                  />

                  <Input
                    label="Charges Remarks"
                    placeholder="e.g. Free warranty service, billable travel"
                    value={formData.chargesRemarks}
                    onChangeText={(val) => setFormData((prev) => ({ ...prev, chargesRemarks: val }))}
                  />

                  <Input
                    label="Engineer Recommendations & Feedback (FSE)"
                    placeholder="Technical diagnosis, recommendations or action summary"
                    value={formData.fseFeedback}
                    onChangeText={(val) => setFormData((prev) => ({ ...prev, fseFeedback: val }))}
                    multiline
                    numberOfLines={3}
                    style={styles.multilineInput}
                  />

                  <Input
                    label="Customer Feedback"
                    placeholder="Customer comments or feedback"
                    value={formData.customerFeedback}
                    onChangeText={(val) => setFormData((prev) => ({ ...prev, customerFeedback: val }))}
                    multiline
                    numberOfLines={2}
                    style={styles.multilineInput}
                  />
                </>
              ) : (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Standby Equipment</Text>
                    <Text style={styles.detailValue}>
                      {fsr.standbyDetails || 'None provided'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Service Charges</Text>
                    <Text style={[styles.detailValue, { fontWeight: '700', color: theme.colors.accentEmerald }]}>
                      {fsr.charges && Number(fsr.charges) > 0 ? `₹${Number(fsr.charges).toLocaleString()}` : '₹0 (Free / Covered)'}
                    </Text>
                  </View>

                  {fsr.chargesRemarks && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Charges Remarks</Text>
                      <Text style={styles.detailValue}>{fsr.chargesRemarks}</Text>
                    </View>
                  )}

                  <View style={[styles.notesBlock, styles.notesBlockSpaced]}>
                    <Text style={styles.notesLabel}>Engineer Recommendations & Feedback (FSE)</Text>
                    <Text style={styles.notesContent}>
                      {fsr.fseFeedback || 'No engineer recommendations entered'}
                    </Text>
                  </View>

                  <View style={[styles.notesBlock, styles.notesBlockSpaced]}>
                    <Text style={styles.notesLabel}>Customer Feedback</Text>
                    <Text style={styles.notesContent}>
                      {fsr.customerFeedback || 'No customer feedback entered'}
                    </Text>
                  </View>

                  {!fsr.standbyDetails && !fsr.charges && !fsr.fseFeedback && !fsr.customerFeedback && (
                    <Text style={styles.summaryItemMuted}>No standby equipment, feedback, or charges entered yet.</Text>
                  )}
                </>
              )}
            </Card>

            {/* Technical Sections Overview (Preserved from Phase 1/2) */}
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Wrench size={18} color={theme.colors.primaryLight} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Technical Sections Overview</Text>
              </View>

              {/* Site Observations Summary */}
              <TouchableOpacity
                style={styles.summaryItemInteractive}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/field-service/[id]/observations' as any,
                    params: { id: fsr.id },
                  })
                }
              >
                <View style={styles.summaryHeaderRowBetween}>
                  <View style={styles.summaryHeaderRow}>
                    <Activity size={16} color={theme.colors.accentAmber} />
                    <Text style={styles.summaryItemTitle}>Site Observations & Electrical Readings</Text>
                  </View>
                  <View style={styles.actionChipRow}>
                    <Text style={styles.actionChipText}>Open</Text>
                    <ChevronRight size={14} color={theme.colors.primaryLight} />
                  </View>
                </View>
                <Text style={styles.summaryItemText}>
                  {siteObservation && (siteObservation.inputVoltageLN || siteObservation.outputVoltageLN || siteObservation.dcVoltage)
                    ? `Input: ${siteObservation.inputVoltageLN || '—'}V | Output: ${siteObservation.outputVoltageLN || '—'}V | DC: ${siteObservation.dcVoltage || '—'}V | Load: ${siteObservation.outputLoadPercent != null ? `${siteObservation.outputLoadPercent}%` : '—'}`
                    : 'Pending on-site measurements. Tap to enter electrical readings & site observations.'}
                </Text>
              </TouchableOpacity>

              {/* Battery Banks Summary (Interactive Phase 4 Workflow) */}
              <TouchableOpacity
                style={styles.summaryItemInteractive}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/field-service/[id]/battery' as any,
                    params: { id: fsr.id },
                  })
                }
              >
                <View style={styles.summaryHeaderRowBetween}>
                  <View style={styles.summaryHeaderRow}>
                    <BatteryCharging size={16} color={theme.colors.accentEmerald} />
                    <Text style={styles.summaryItemTitle}>Battery Banks & Diagnostics</Text>
                  </View>
                  <View style={styles.actionChipRow}>
                    <Text style={styles.actionChipText}>Open</Text>
                    <ChevronRight size={14} color={theme.colors.primaryLight} />
                  </View>
                </View>
                <Text style={styles.summaryItemText}>
                  {batteryBanks && batteryBanks.length > 0
                    ? `${batteryBanks.length} bank(s) recorded (${batteryBanks.reduce((acc, b) => acc + (b.readings?.length || 0), 0)} cell readings)`
                    : 'No battery bank data recorded yet. Tap to configure banks and cell readings.'}
                </Text>
              </TouchableOpacity>

              {/* Photos & Attachments Summary (Interactive Phase 4 Workflow) */}
              <TouchableOpacity
                style={styles.summaryItemInteractive}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/field-service/[id]/photos' as any,
                    params: { id: fsr.id },
                  })
                }
              >
                <View style={styles.summaryHeaderRowBetween}>
                  <View style={styles.summaryHeaderRow}>
                    <Camera size={16} color={theme.colors.info} />
                    <Text style={styles.summaryItemTitle}>Photos & Attachments</Text>
                  </View>
                  <View style={styles.actionChipRow}>
                    <Text style={styles.actionChipText}>Open</Text>
                    <ChevronRight size={14} color={theme.colors.primaryLight} />
                  </View>
                </View>
                <Text style={styles.summaryItemText}>
                  {attachments && attachments.length > 0
                    ? `${attachments.length} attachment(s) uploaded`
                    : 'No photos attached. Tap to capture or upload service photos.'}
                </Text>
              </TouchableOpacity>

              {/* Parts Replacement Section */}
              <View style={styles.summaryItemContainer}>
                <View style={styles.summaryHeaderRowBetween}>
                  <View style={styles.summaryHeaderRow}>
                    <Package size={16} color={theme.colors.accentRose} />
                    <Text style={styles.summaryItemTitle}>Parts Replacement ({parts?.length || 0})</Text>
                  </View>
                  {canEdit && (
                    <TouchableOpacity
                      style={styles.addPartBtn}
                      onPress={handleOpenAddPartModal}
                      activeOpacity={0.7}
                    >
                      <Plus size={14} color={theme.colors.primaryLight} />
                      <Text style={styles.addPartBtnText}>Add Part</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {parts && parts.length > 0 ? (
                  <View style={styles.partsListContainer}>
                    {parts.map((p, idx) => (
                      <View key={p.id || idx} style={styles.partItemCard}>
                        <View style={styles.partItemHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.partItemName}>{p.partName}</Text>
                            {Boolean(p.partNumber) && (
                              <Text style={styles.partItemNumber}>P/N: {p.partNumber}</Text>
                            )}
                          </View>
                          {canEdit && p.id && (
                            <TouchableOpacity
                              onPress={() => handleDeletePart(p.id, p.partName)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={styles.partDeleteBtn}
                            >
                              <Trash2 size={16} color={theme.colors.accentRose} />
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={styles.partMetaRow}>
                          <View style={styles.partQtyChip}>
                            <Text style={styles.partQtyText}>Qty: {p.quantity}</Text>
                          </View>
                          <Badge
                            label={
                              p.oldPartStatus === 'DEFECTIVE_RETURNED'
                                ? 'Defective Returned'
                                : p.oldPartStatus === 'SCRAPPED'
                                ? 'Scrapped'
                                : p.oldPartStatus === 'WITH_CUSTOMER'
                                ? 'With Customer'
                                : p.oldPartStatus === 'PENDING_INSPECTION'
                                ? 'Pending Insp.'
                                : p.oldPartStatus
                                ? p.oldPartStatus.replace(/_/g, ' ')
                                : 'Defective'
                            }
                            variant={
                              p.oldPartStatus === 'SCRAPPED'
                                ? 'error'
                                : p.oldPartStatus === 'WITH_CUSTOMER'
                                ? 'warning'
                                : 'neutral'
                            }
                            size="sm"
                          />
                        </View>

                        {Boolean(p.replacementDetails) && (
                          <Text style={styles.partDetailsText}>
                            Details: {p.replacementDetails}
                          </Text>
                        )}

                        {Boolean(p.remarks) && (
                          <Text style={styles.partRemarksText}>
                            Note: {p.remarks}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.partEmptyBox}>
                    <Text style={styles.summaryItemText}>
                      No spare parts replaced during this visit.
                    </Text>
                    {canEdit && (
                      <Button
                        title="Add Replacement Part"
                        variant="outline"
                        size="sm"
                        icon={<Plus size={14} color={theme.colors.primaryLight} />}
                        onPress={handleOpenAddPartModal}
                        style={{ marginTop: 8 }}
                      />
                    )}
                  </View>
                )}
              </View>
            </Card>

            {/* Digital Signatures & Authentications Card */}
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <PenTool size={18} color={theme.colors.primaryLight} />
                <Text style={styles.sectionTitle}>Digital Sign-Offs & Authentications</Text>
              </View>

              {/* FSE Sign-off Box */}
              <View style={styles.signOffBox}>
                <View style={styles.signOffHeader}>
                  <View style={styles.signOffTitleRow}>
                    <UserCheck size={16} color={theme.colors.primaryLight} />
                    <Text style={styles.signOffTitle}>Service Engineer (FSE)</Text>
                  </View>
                  <Badge
                    label={fsr.fseSignature ? 'SIGNED' : 'PENDING'}
                    variant={fsr.fseSignature ? 'success' : 'warning'}
                    size="sm"
                  />
                </View>

                {fsr.fseSignature ? (
                  <View style={styles.signatureDetails}>
                    <View style={styles.signaturePreviewContainer}>
                      <Image
                        source={{ uri: resolveImageUrl(fsr.fseSignature) || '' }}
                        style={styles.signatureImage}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.signatureMetaRow}>
                      <Text style={styles.signatureMetaLabel}>Signed by:</Text>
                      <Text style={styles.signatureMetaValue}>
                        {fsr.fseName || serviceEngineer?.fullName || 'Field Service Engineer'}
                      </Text>
                    </View>
                    {fsr.fseSignatureDate && (
                      <View style={styles.signatureMetaRow}>
                        <Text style={styles.signatureMetaLabel}>Date:</Text>
                        <Text style={styles.signatureMetaValue}>
                          {new Date(fsr.fseSignatureDate).toLocaleDateString('en-GB')}
                        </Text>
                      </View>
                    )}
                    {canSign && (
                      <TouchableOpacity
                        style={styles.reSignBtn}
                        onPress={() => setIsFseSigModalOpen(true)}
                        activeOpacity={0.7}
                      >
                        <RotateCcw size={13} color={theme.colors.primaryLight} />
                        <Text style={styles.reSignText}>Update / Re-sign</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={styles.signaturePendingBox}>
                    <Text style={styles.signaturePendingText}>
                      Engineer signature has not been recorded for this visit.
                    </Text>
                    {canSign && (
                      <Button
                        title="Sign as Service Engineer"
                        variant="outline"
                        size="sm"
                        icon={<PenTool size={14} color={theme.colors.primaryLight} />}
                        onPress={() => setIsFseSigModalOpen(true)}
                        style={styles.signActionBtn}
                      />
                    )}
                  </View>
                )}
              </View>

              {/* Customer Sign-off Box */}
              <View style={styles.signOffBox}>
                <View style={styles.signOffHeader}>
                  <View style={styles.signOffTitleRow}>
                    <Building2 size={16} color={theme.colors.accentEmerald} />
                    <Text style={styles.signOffTitle}>Customer Representative</Text>
                  </View>
                  <Badge
                    label={fsr.customerSignature ? 'SIGNED' : 'PENDING'}
                    variant={fsr.customerSignature ? 'success' : 'warning'}
                    size="sm"
                  />
                </View>

                {fsr.customerSignature ? (
                  <View style={styles.signatureDetails}>
                    <View style={styles.signatureRowWithStamp}>
                      <View style={styles.signaturePreviewContainer}>
                        <Image
                          source={{ uri: resolveImageUrl(fsr.customerSignature) || '' }}
                          style={styles.signatureImage}
                          resizeMode="contain"
                        />
                      </View>
                      {fsr.customerStamp && (
                        <View style={styles.stampPreviewContainer}>
                          <Image
                            source={{ uri: resolveImageUrl(fsr.customerStamp) || '' }}
                            style={styles.stampThumbnailImage}
                            resizeMode="contain"
                          />
                          <Text style={styles.stampBadgeText}>Stamp</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.signatureMetaRow}>
                      <Text style={styles.signatureMetaLabel}>Representative:</Text>
                      <Text style={styles.signatureMetaValue}>
                        {fsr.customerContactName || fsr.customerName}
                      </Text>
                    </View>
                    {fsr.customerSignedAt && (
                      <View style={styles.signatureMetaRow}>
                        <Text style={styles.signatureMetaLabel}>Date & Time:</Text>
                        <Text style={styles.signatureMetaValue}>
                          {new Date(fsr.customerSignedAt).toLocaleString('en-GB')}
                        </Text>
                      </View>
                    )}
                    {canSign && (
                      <TouchableOpacity
                        style={styles.reSignBtn}
                        onPress={() => setIsCustSigModalOpen(true)}
                        activeOpacity={0.7}
                      >
                        <RotateCcw size={13} color={theme.colors.primaryLight} />
                        <Text style={styles.reSignText}>Update / Re-sign</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={styles.signaturePendingBox}>
                    <Text style={styles.signaturePendingText}>
                      Customer sign-off has not been captured for this visit.
                    </Text>
                    {canSign && (
                      <Button
                        title="Capture Customer Signature"
                        variant="outline"
                        size="sm"
                        icon={<PenTool size={14} color={theme.colors.primaryLight} />}
                        onPress={() => setIsCustSigModalOpen(true)}
                        style={styles.signActionBtn}
                      />
                    )}
                  </View>
                )}
              </View>
            </Card>

            {/* FSR Lifecycle Status / Completion Card */}
            {fsr.status === 'COMPLETED' ? (
              <Card style={styles.completedCard}>
                <View style={styles.statusBannerRow}>
                  <CheckCircle2 size={24} color={theme.colors.accentEmerald} />
                  <View style={styles.statusBannerContent}>
                    <Text style={styles.completedTitle}>Service Visit Completed</Text>
                    <Text style={styles.completedSubtitle}>
                      This Field Service Report is COMPLETED and locked from operational edits.
                    </Text>
                  </View>
                </View>
                {canDownload && (
                  <Button
                    title={isDownloadingPdf ? 'Generating PDF...' : 'Download & Share PDF'}
                    variant="outline"
                    loading={isDownloadingPdf}
                    disabled={isDownloadingPdf}
                    icon={<Share2 size={16} color={theme.colors.textPrimary} />}
                    onPress={handleDownloadPdf}
                    style={{ marginTop: theme.spacing.md }}
                  />
                )}
              </Card>
            ) : fsr.status === 'CLOSED' ? (
              <Card style={styles.closedCard}>
                <View style={styles.statusBannerRow}>
                  <ShieldCheck size={24} color="#818CF8" />
                  <View style={styles.statusBannerContent}>
                    <Text style={styles.closedTitle}>Field Service Report Closed</Text>
                    <Text style={styles.closedSubtitle}>
                      This report has been reviewed, accepted, and formally closed by management.
                    </Text>
                  </View>
                </View>
                {canDownload && (
                  <Button
                    title={isDownloadingPdf ? 'Generating PDF...' : 'Download & Share PDF'}
                    variant="outline"
                    loading={isDownloadingPdf}
                    disabled={isDownloadingPdf}
                    icon={<Share2 size={16} color={theme.colors.textPrimary} />}
                    onPress={handleDownloadPdf}
                    style={{ marginTop: theme.spacing.md }}
                  />
                )}
              </Card>
            ) : fsr.status === 'IN_PROGRESS' ? (
              <Card style={styles.completionActionCard}>
                <View style={styles.completionHeaderRow}>
                  <CheckCircle2 size={20} color={theme.colors.accentEmerald} />
                  <Text style={styles.completionCardTitle}>Complete Service Visit</Text>
                </View>
                <Text style={styles.completionCardText}>
                  Ensure all diagnostic checks, battery readings, photos, and digital sign-offs are in order before marking the service visit as completed.
                </Text>
                {canComplete && (
                  <Button
                    title={isCompleting ? 'Completing Visit...' : 'Complete Service Visit'}
                    variant="primary"
                    size="lg"
                    loading={isCompleting}
                    disabled={isCompleting}
                    icon={<CheckCircle2 size={18} color={theme.colors.textOnPrimary} />}
                    onPress={handleCompleteVisit}
                    style={styles.completeFsrBtn}
                  />
                )}
              </Card>
            ) : null}

            {/* Phase 6 Scope Notice */}
            <View style={styles.noticeContainer}>
              <AlertCircle size={16} color={theme.colors.primaryLight} style={styles.noticeIcon} />
              <Text style={styles.noticeText}>
                Phase 6 Production Ready: Official Field Service Report document generation, authenticated signatures, battery diagnostics, and service visit workflow are 100% active.
              </Text>
            </View>
          </ScrollView>

          {/* FSE Sign-Off Modal */}
          <SignaturePadModal
            visible={isFseSigModalOpen}
            title="Service Engineer Sign-Off"
            signerNameLabel="Engineer Name"
            initialSignerName={fsr.fseName || user?.fullName || ''}
            initialSignerPhone={fsr.fseNumber || user?.phone || ''}
            showPhoneInput={true}
            onClose={() => setIsFseSigModalOpen(false)}
            onConfirm={handleFseSignOffConfirm}
          />

          {/* Customer Digital Sign-Off Modal */}
          <SignaturePadModal
            visible={isCustSigModalOpen}
            title="Customer Digital Sign-Off"
            signerNameLabel="Representative Name"
            initialSignerName={fsr.customerContactName || fsr.customerName || ''}
            initialSignerPhone={fsr.customerPhone || ''}
            showPhoneInput={false}
            showStampOption={true}
            initialStampUrl={fsr.customerStamp ? resolveImageUrl(fsr.customerStamp) : null}
            onClose={() => setIsCustSigModalOpen(false)}
            onConfirm={handleCustomerSignOffConfirm}
          />

          {/* Add Replacement Part Modal */}
          <Modal
            visible={isPartModalOpen}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setIsPartModalOpen(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalOverlay}
            >
              <View style={styles.partModalContainer}>
                <View style={styles.partModalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Package size={20} color={theme.colors.primaryLight} />
                    <Text style={styles.partModalTitle}>Add Replacement Part</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsPartModalOpen(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {Boolean(partError) && (
                  <View style={styles.partErrorBox}>
                    <AlertCircle size={14} color={theme.colors.accentRose} />
                    <Text style={styles.partErrorText}>{partError}</Text>
                  </View>
                )}

                <ScrollView
                  style={styles.partModalScroll}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 24 }}
                >
                  <Input
                    label="Part Name *"
                    placeholder="e.g. Inverter Main PCB, Cooling Fan 12V"
                    value={partForm.partName}
                    onChangeText={(val) => {
                      setPartForm((prev) => ({ ...prev, partName: val }));
                      if (partError) setPartError(null);
                    }}
                  />

                  <Input
                    label="Part / Serial Number"
                    placeholder="e.g. PCB-7749-X or S/N 120938"
                    value={partForm.partNumber || ''}
                    onChangeText={(val) => setPartForm((prev) => ({ ...prev, partNumber: val }))}
                  />

                  <Input
                    label="Quantity *"
                    placeholder="1"
                    keyboardType="numeric"
                    value={String(partForm.quantity || '1')}
                    onChangeText={(val) =>
                      setPartForm((prev) => ({ ...prev, quantity: parseInt(val, 10) || 1 }))
                    }
                  />

                  <View style={{ marginBottom: theme.spacing.md }}>
                    <Text style={styles.inputGroupLabel}>Old Part Status</Text>
                    <View style={styles.statusChipsContainer}>
                      {OLD_PART_STATUS_OPTIONS.map((opt) => {
                        const isSelected = partForm.oldPartStatus === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            style={[
                              styles.statusChip,
                              isSelected && styles.statusChipActive,
                            ]}
                            onPress={() =>
                              setPartForm((prev) => ({ ...prev, oldPartStatus: opt.value }))
                            }
                          >
                            <Text
                              style={[
                                styles.statusChipText,
                                isSelected && styles.statusChipTextActive,
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <Input
                    label="Replacement Details"
                    placeholder="e.g. Installed new IGBT board and calibrated"
                    value={partForm.replacementDetails || ''}
                    onChangeText={(val) =>
                      setPartForm((prev) => ({ ...prev, replacementDetails: val }))
                    }
                  />

                  <Input
                    label="Remarks"
                    placeholder="e.g. Covered under warranty"
                    value={partForm.remarks || ''}
                    onChangeText={(val) => setPartForm((prev) => ({ ...prev, remarks: val }))}
                  />
                </ScrollView>

                <View style={styles.partModalActions}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setIsPartModalOpen(false)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Save Part"
                    variant="primary"
                    loading={addPartMutation.isPending}
                    disabled={addPartMutation.isPending}
                    onPress={handleSavePart}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* Sticky Bottom Action Bar when in Edit Mode */}
          {isEditing && (
            <View style={styles.editBottomBar}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={handleCancelEdit}
                style={styles.editBottomBtn}
                disabled={updateMutation.isPending}
              />
              <Button
                title={updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                variant="primary"
                onPress={handleSave}
                loading={updateMutation.isPending}
                disabled={updateMutation.isPending || !isDirty}
                style={styles.editBottomBtn}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  errorTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  errorSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  errorActionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionBtn: {
    minWidth: 120,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  navTitleContainer: {
    flex: 1,
  },
  navTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  navSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  navActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  navActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  navActionText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primaryLight,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl + 20,
  },
  heroCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  heroCustomerName: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroMetaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  inProgressCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: '#F59E0B',
    borderWidth: 1.2,
  },
  inProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inProgressPulse: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  inProgressTitleBlock: {
    flex: 1,
  },
  inProgressTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: '#F59E0B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inProgressSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  startVisitCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.primaryLight,
    borderWidth: 1,
  },
  startVisitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  startVisitIconBlock: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  startVisitTitleBlock: {
    flex: 1,
  },
  startVisitTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  startVisitSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  startVisitButton: {
    width: '100%',
  },
  validationErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: theme.colors.error,
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  validationErrorText: {
    flex: 1,
    fontSize: theme.fontSize.xs,
    color: theme.colors.error,
    fontWeight: theme.fontWeight.medium,
  },
  sectionCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.xs,
  },
  sectionIcon: {
    marginRight: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  detailLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    width: '35%',
  },
  detailValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
    width: '63%',
    textAlign: 'right',
  },
  detailMonoValue: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primaryLight,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: theme.fontWeight.semibold,
    width: '63%',
    textAlign: 'right',
  },
  iconValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '63%',
    justifyContent: 'flex-end',
  },
  inlineIcon: {
    marginRight: 4,
  },
  destinationBlock: {
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  destinationText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  notesBlock: {
    marginBottom: theme.spacing.xs,
  },
  notesBlockSpaced: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  notesLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  notesContent: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  summaryItem: {
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  summaryItemInteractive: {
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  summaryHeaderRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  actionChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionChipText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primaryLight,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  summaryItemTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  summaryItemText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  summaryItemMuted: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  formGroup: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  formLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs + 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  statusChip: {
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  statusChipActive: {
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.primarySoft,
  },
  statusChipText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  statusChipTextActive: {
    color: theme.colors.primaryLight,
    fontWeight: theme.fontWeight.bold,
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  noticeIcon: {
    marginRight: theme.spacing.sm,
    flexShrink: 0,
  },
  noticeText: {
    flex: 1,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  signOffBox: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  signOffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  signOffTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signOffTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  signatureDetails: {
    marginTop: theme.spacing.xs,
  },
  signaturePreviewContainer: {
    flex: 1,
    height: 75,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    marginBottom: theme.spacing.xs,
  },
  signatureImage: {
    width: '100%',
    height: '100%',
  },
  signatureRowWithStamp: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  stampPreviewContainer: {
    width: 75,
    height: 75,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    position: 'relative',
  },
  stampThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  stampBadgeText: {
    position: 'absolute',
    bottom: 2,
    fontSize: 8,
    color: '#64748B',
    fontWeight: theme.fontWeight.bold,
  },
  signatureMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  signatureMetaLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  signatureMetaValue: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  reSignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    marginTop: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reSignText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primaryLight,
    fontWeight: theme.fontWeight.medium,
  },
  signaturePendingBox: {
    paddingVertical: theme.spacing.xs,
  },
  signaturePendingText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  signActionBtn: {
    marginTop: theme.spacing.xs,
  },
  completedCard: {
    backgroundColor: '#064E3B',
    borderColor: '#059669',
    borderWidth: 1,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  closedCard: {
    backgroundColor: '#1E1B4B',
    borderColor: '#4338CA',
    borderWidth: 1,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  statusBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  statusBannerContent: {
    flex: 1,
  },
  completedTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: '#A7F3D0',
    marginBottom: 2,
  },
  completedSubtitle: {
    fontSize: theme.fontSize.xs,
    color: '#D1FAE5',
    lineHeight: 16,
  },
  closedTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: '#C7D2FE',
    marginBottom: 2,
  },
  closedSubtitle: {
    fontSize: theme.fontSize.xs,
    color: '#E0E7FF',
    lineHeight: 16,
  },
  completionActionCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  completionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  completionCardTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  completionCardText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  completeFsrBtn: {
    width: '100%',
  },
  editBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  editBottomBtn: {
    flex: 1,
  },
  summaryItemContainer: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  addPartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  addPartBtnText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primaryLight,
    fontWeight: theme.fontWeight.semibold,
  },
  partsListContainer: {
    marginTop: 8,
    gap: 8,
  },
  partItemCard: {
    padding: 10,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  partItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  partItemName: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  partItemNumber: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 1,
  },
  partDeleteBtn: {
    padding: 4,
  },
  partMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  partQtyChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  partQtyText: {
    fontSize: 11,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  partDetailsText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  partRemarksText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  partEmptyBox: {
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  partModalContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    maxHeight: '90%',
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  partModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  partModalTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  partErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 8,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  partErrorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.accentRose,
  },
  partModalScroll: {
    maxHeight: 400,
  },
  inputGroupLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  statusChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  partModalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
