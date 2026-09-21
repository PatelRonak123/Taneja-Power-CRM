import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Cpu,
  BatteryCharging,
  Package,
  Camera,
  CheckCircle2,
  Clock,
  Edit3,
  Play,
  FileCheck,
  AlertCircle,
  Plus,
  Trash2,
  Share2,
} from 'lucide-react-native';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { SignaturePadModal } from '../../../src/components/ui/SignaturePadModal';
import { useAuthStore } from '../../../src/auth/auth.store';
import {
  useFsrDetail,
  useStartFsr,
  useCompleteFsr,
  useUpdateSiteObservation,
  useAddPart,
  useDeletePart,
  useCustomerSignOff,
  useFseSignOff,
} from '../../../src/hooks/useFsr';
import {
  canStartFSR,
  canCompleteFSR,
  canEditFSR,
  canSignOffFSR,
  canDownloadFSR,
} from '../../../src/utils/fsrPermissions';
import { LocationService } from '../../../src/services/location.service';
import { fsrPdfService } from '../../../src/services/fsrPdf.service';
import { theme } from '../../../src/theme/theme';
import { formatDate } from '../../../src/utils/date';
import {
  FsrUpsLocation,
  UpdateSiteObservationPayload,
  PartPayload,
} from '../../../src/types/fsr.types';

export default function FsrDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);

  const { data: fsrDetail, isLoading, refetch, error } = useFsrDetail(id);

  const startMutation = useStartFsr();
  const completeMutation = useCompleteFsr();
  const observationMutation = useUpdateSiteObservation();
  const addPartMutation = useAddPart();
  const deletePartMutation = useDeletePart();
  const customerSignMutation = useCustomerSignOff();
  const fseSignMutation = useFseSignOff();

  const fsrId = id || '';

  const [isGpsCapturing, setIsGpsCapturing] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [customerSignModalVisible, setCustomerSignModalVisible] = useState(false);
  const [fseSignModalVisible, setFseSignModalVisible] = useState(false);

  // Observation Modal state
  const [obsModalVisible, setObsModalVisible] = useState(false);
  const [obsForm, setObsForm] = useState<UpdateSiteObservationPayload>({});

  // Add Part Modal state
  const [partModalVisible, setPartModalVisible] = useState(false);
  const [partForm, setPartForm] = useState<PartPayload>({
    partName: '',
    partNumber: '',
    quantity: 1,
    replacementDetails: '',
    oldPartStatus: '',
    remarks: '',
  });

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

  if (error || !fsrDetail) {
    return (
      <ScreenContainer>
        <View style={styles.centerContainer}>
          <AlertCircle size={48} color={theme.colors.accentRose} />
          <Text style={styles.errorTitle}>Report Not Found</Text>
          <Text style={styles.errorSubtitle}>
            {error instanceof Error ? error.message : 'Could not retrieve report details.'}
          </Text>
          <Button
            title="Go Back"
            variant="outline"
            onPress={() => router.back()}
            style={styles.retryButton}
          />
        </View>
      </ScreenContainer>
    );
  }

  const { fsr, customer, destination, siteObservation, batteryBanks, parts, attachments } = fsrDetail;

  const canStart = canStartFSR(user, fsr);
  const canComplete = canCompleteFSR(user, fsr);
  const canEdit = canEditFSR(user, fsr);
  const canSign = canSignOffFSR(user, fsr);
  const canDownload = canDownloadFSR(user, fsr);

  // Handler: Start FSR with GPS
  const handleStartFsr = async () => {
    Alert.alert(
      'Start Service Visit',
      'This will record your current GPS coordinates and transition the report to IN PROGRESS.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Now',
          onPress: async () => {
            try {
              setIsGpsCapturing(true);
              const position = await LocationService.getCurrentPosition();
              await startMutation.mutateAsync(id);
              Alert.alert(
                'Visit Started',
                `GPS position logged at (${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}). Report is now In Progress.`
              );
            } catch (err: any) {
              Alert.alert(
                'Location Error',
                err?.message || 'Current GPS position is required to start the report. Please enable GPS and try again.'
              );
            } finally {
              setIsGpsCapturing(false);
            }
          },
        },
      ]
    );
  };

  // Handler: Complete FSR with Validation & GPS
  const handleCompleteFsr = async () => {
    // Validate completion prerequisites
    const missing: string[] = [];
    if (!fsr.customerSignature) missing.push('Customer signature');
    if (!fsr.fseSignature) missing.push('Service engineer signature');

    if (missing.length > 0) {
      Alert.alert(
        'Incomplete Report',
        `Please complete the following required items before completing the report:\n\n• ${missing.join('\n• ')}`
      );
      return;
    }

    Alert.alert(
      'Complete Service Visit',
      'Are you sure you want to mark this report as COMPLETED? Your current GPS position will be logged.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Complete',
          onPress: async () => {
            try {
              setIsGpsCapturing(true);
              const position = await LocationService.getCurrentPosition();
              await completeMutation.mutateAsync(id);
              Alert.alert(
                'Report Completed',
                `Service report marked COMPLETED. Verified GPS: (${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}).`
              );
            } catch (err: any) {
              Alert.alert(
                'Completion Error',
                err?.message || 'Failed to complete report. Please check your GPS and internet connection.'
              );
            } finally {
              setIsGpsCapturing(false);
            }
          },
        },
      ]
    );
  };

  // Open Observation Editor
  const openObsModal = () => {
    setObsForm({
      inputOnMains: siteObservation?.inputOnMains || '',
      inputVoltageLN: siteObservation?.inputVoltageLN ? Number(siteObservation.inputVoltageLN) : undefined,
      inputVoltageLL: siteObservation?.inputVoltageLL ? Number(siteObservation.inputVoltageLL) : undefined,
      outputVoltageLN: siteObservation?.outputVoltageLN ? Number(siteObservation.outputVoltageLN) : undefined,
      outputVoltageLL: siteObservation?.outputVoltageLL ? Number(siteObservation.outputVoltageLL) : undefined,
      vac: siteObservation?.vac ? Number(siteObservation.vac) : undefined,
      frequency: siteObservation?.frequency ? Number(siteObservation.frequency) : undefined,
      dcVoltage: siteObservation?.dcVoltage ? Number(siteObservation.dcVoltage) : undefined,
      outputLoadPercent: siteObservation?.outputLoadPercent ? Number(siteObservation.outputLoadPercent) : undefined,
      inputFrequency: siteObservation?.inputFrequency ? Number(siteObservation.inputFrequency) : undefined,
      outputFrequency: siteObservation?.outputFrequency ? Number(siteObservation.outputFrequency) : undefined,
      environmentCondition: siteObservation?.environmentCondition || '',
      environmentRemarks: siteObservation?.environmentRemarks || '',
      upsLocation: siteObservation?.upsLocation || null,
      otherLocationSpecification: siteObservation?.otherLocationSpecification || '',
      observationsNotes: siteObservation?.observationsNotes || '',
    });
    setObsModalVisible(true);
  };

  // Save Observation Form
  const handleSaveObservation = async () => {
    try {
      await observationMutation.mutateAsync({ id, payload: obsForm });
      setObsModalVisible(false);
      Alert.alert('Success', 'Site observations updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save site observations.');
    }
  };

  // Add Part
  const handleAddPart = async () => {
    if (!partForm.partName.trim()) {
      Alert.alert('Validation Error', 'Part name is required.');
      return;
    }
    try {
      await addPartMutation.mutateAsync({
        id,
        payload: {
          ...partForm,
          quantity: Number(partForm.quantity) || 1,
        },
      });
      setPartForm({
        partName: '',
        partNumber: '',
        quantity: 1,
        replacementDetails: '',
        oldPartStatus: '',
        remarks: '',
      });
      setPartModalVisible(false);
      Alert.alert('Success', 'Replaced part added.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add part.');
    }
  };

  // Delete Part
  const handleDeletePart = (partId?: string) => {
    if (!partId) return;
    Alert.alert('Delete Part', 'Are you sure you want to remove this replacement entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePartMutation.mutateAsync({ id: fsrId, partId });
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete part.');
          }
        },
      },
    ]);
  };

  // Customer Sign-off handler
  const handleSaveCustomerSign = async ({
    signerName,
    signatureDataUrl,
  }: {
    signerName: string;
    signatureDataUrl: string;
  }) => {
    await customerSignMutation.mutateAsync({
      id: fsrId,
      payload: {
        customerContactName: signerName,
        customerSignature: signatureDataUrl,
      },
    });
    Alert.alert('Signed', 'Customer sign-off recorded successfully.');
  };

  // FSE Sign-off handler
  const handleSaveFseSign = async ({
    signerName,
    signerPhone,
    signatureDataUrl,
  }: {
    signerName: string;
    signerPhone?: string;
    signatureDataUrl: string;
  }) => {
    await fseSignMutation.mutateAsync({
      id: fsrId,
      payload: {
        fseName: signerName,
        fseNumber: signerPhone,
        fseSignature: signatureDataUrl,
      },
    });
    Alert.alert('Signed', 'Service engineer sign-off recorded successfully.');
  };

  // Download and Share PDF handler
  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      await fsrPdfService.downloadAndSharePdf(fsr.id, fsr.fsrNumber);
    } catch (err: any) {
      Alert.alert('PDF Error', err?.message || 'Failed to download or share official PDF report.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Top App Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.navTitleWrapper}>
            <Text style={styles.navFsrNumber}>{fsr.fsrNumber}</Text>
            <Text style={styles.navCustomerName} numberOfLines={1}>
              {customer?.companyName || customer?.name}
            </Text>
          </View>
          <Badge
            label={fsr.status.replace('_', ' ')}
            variant={
              fsr.status === 'COMPLETED'
                ? 'success'
                : fsr.status === 'IN_PROGRESS'
                ? 'warning'
                : fsr.status === 'CLOSED'
                ? 'primary'
                : 'neutral'
            }
            size="sm"
          />
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
        >
          {/* Workflow Status Banner */}
          <Card style={styles.statusBannerCard}>
            <View style={styles.statusBannerHeader}>
              <View style={styles.statusBadgeRow}>
                <Badge
                  label={fsr.callType}
                  variant={fsr.callType === 'BD' ? 'error' : 'primary'}
                  size="sm"
                />
                <Badge label={fsr.warrantyStatus.replace('_', ' ')} variant="neutral" size="sm" />
                <Badge label={fsr.billingStatus.replace('_', ' ')} variant="neutral" size="sm" />
              </View>
              <View style={styles.visitDateRow}>
                <Calendar size={13} color={theme.colors.textMuted} />
                <Text style={styles.visitDateText}>{formatDate(fsr.visitDate)}</Text>
              </View>
            </View>

            {/* Checklist Overview */}
            <View style={styles.checklistRow}>
              <View style={styles.checklistItem}>
                <CheckCircle2
                  size={14}
                  color={fsr.status !== 'DRAFT' ? theme.colors.accentEmerald : theme.colors.textMuted}
                />
                <Text style={styles.checklistText}>Started</Text>
              </View>
              <View style={styles.checklistItem}>
                <CheckCircle2
                  size={14}
                  color={siteObservation ? theme.colors.accentEmerald : theme.colors.textMuted}
                />
                <Text style={styles.checklistText}>Observations</Text>
              </View>
              <View style={styles.checklistItem}>
                <CheckCircle2
                  size={14}
                  color={batteryBanks?.length > 0 ? theme.colors.accentEmerald : theme.colors.textMuted}
                />
                <Text style={styles.checklistText}>Batteries</Text>
              </View>
              <View style={styles.checklistItem}>
                <CheckCircle2
                  size={14}
                  color={fsr.customerSignature ? theme.colors.accentEmerald : theme.colors.textMuted}
                />
                <Text style={styles.checklistText}>Cust. Sign</Text>
              </View>
              <View style={styles.checklistItem}>
                <CheckCircle2
                  size={14}
                  color={fsr.fseSignature ? theme.colors.accentEmerald : theme.colors.textMuted}
                />
                <Text style={styles.checklistText}>FSE Sign</Text>
              </View>
            </View>
          </Card>

          {/* Section 1: Customer & Site */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Customer & Site</Text>
            <Text style={styles.primaryCustomerTitle}>{customer?.companyName || customer?.name}</Text>
            {customer?.name && customer.companyName && (
              <Text style={styles.contactPersonText}>Contact: {customer.name}</Text>
            )}
            {destination && (
              <View style={styles.detailRow}>
                <MapPin size={14} color={theme.colors.primaryLight} style={styles.detailIcon} />
                <Text style={styles.detailText}>
                  {destination.name} {destination.city ? `(${destination.city})` : ''} - {destination.address}
                </Text>
              </View>
            )}
            {customer?.phone && (
              <View style={styles.detailRow}>
                <Phone size={14} color={theme.colors.textMuted} style={styles.detailIcon} />
                <Text style={styles.detailText}>{customer.phone}</Text>
              </View>
            )}
            {customer?.email && (
              <View style={styles.detailRow}>
                <Mail size={14} color={theme.colors.textMuted} style={styles.detailIcon} />
                <Text style={styles.detailText}>{customer.email}</Text>
              </View>
            )}
          </Card>

          {/* Section 2: Equipment & Problem */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Equipment & Problem</Text>
            <View style={styles.equipmentRow}>
              <Cpu size={16} color={theme.colors.primaryLight} style={styles.detailIcon} />
              <Text style={styles.equipmentText}>
                {fsr.productModel || 'Standard UPS'} {fsr.productMake ? `(${fsr.productMake})` : ''}
              </Text>
            </View>
            {fsr.productSerialNumber && (
              <Text style={styles.serialNumberText}>S/N: {fsr.productSerialNumber}</Text>
            )}
            {fsr.problemReported && (
              <View style={styles.problemBox}>
                <Text style={styles.problemBoxLabel}>Reported Problem:</Text>
                <Text style={styles.problemBoxText}>{fsr.problemReported}</Text>
              </View>
            )}
            {fsr.reasonForVisit && (
              <View style={styles.problemBox}>
                <Text style={styles.problemBoxLabel}>Reason for Visit:</Text>
                <Text style={styles.problemBoxText}>{fsr.reasonForVisit}</Text>
              </View>
            )}
          </Card>

          {/* Section 3: Site Observations */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Site Observations</Text>
              {canEdit && (
                <TouchableOpacity
                  onPress={openObsModal}
                  style={styles.sectionActionBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Edit3 size={15} color={theme.colors.primaryLight} />
                  <Text style={styles.sectionActionText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {siteObservation ? (
              <View style={styles.obsGrid}>
                <View style={styles.obsItem}>
                  <Text style={styles.obsLabel}>Input L-N</Text>
                  <Text style={styles.obsValue}>
                    {siteObservation.inputVoltageLN ? `${siteObservation.inputVoltageLN} V` : '—'}
                  </Text>
                </View>
                <View style={styles.obsItem}>
                  <Text style={styles.obsLabel}>Input L-L</Text>
                  <Text style={styles.obsValue}>
                    {siteObservation.inputVoltageLL ? `${siteObservation.inputVoltageLL} V` : '—'}
                  </Text>
                </View>
                <View style={styles.obsItem}>
                  <Text style={styles.obsLabel}>Output L-N</Text>
                  <Text style={styles.obsValue}>
                    {siteObservation.outputVoltageLN ? `${siteObservation.outputVoltageLN} V` : '—'}
                  </Text>
                </View>
                <View style={styles.obsItem}>
                  <Text style={styles.obsLabel}>Output L-L</Text>
                  <Text style={styles.obsValue}>
                    {siteObservation.outputVoltageLL ? `${siteObservation.outputVoltageLL} V` : '—'}
                  </Text>
                </View>
                <View style={styles.obsItem}>
                  <Text style={styles.obsLabel}>Frequency</Text>
                  <Text style={styles.obsValue}>
                    {siteObservation.frequency ? `${siteObservation.frequency} Hz` : '—'}
                  </Text>
                </View>
                <View style={styles.obsItem}>
                  <Text style={styles.obsLabel}>Output Load</Text>
                  <Text style={styles.obsValue}>
                    {siteObservation.outputLoadPercent !== undefined && siteObservation.outputLoadPercent !== null
                      ? `${siteObservation.outputLoadPercent} %`
                      : '—'}
                  </Text>
                </View>
                <View style={styles.obsItem}>
                  <Text style={styles.obsLabel}>DC Voltage</Text>
                  <Text style={styles.obsValue}>
                    {siteObservation.dcVoltage ? `${siteObservation.dcVoltage} V` : '—'}
                  </Text>
                </View>
                <View style={styles.obsItem}>
                  <Text style={styles.obsLabel}>Location</Text>
                  <Text style={styles.obsValue}>
                    {siteObservation.upsLocation ? siteObservation.upsLocation.replace('_', ' ') : '—'}
                  </Text>
                </View>
                {siteObservation.observationsNotes && (
                  <View style={styles.obsFullRow}>
                    <Text style={styles.obsLabel}>Notes:</Text>
                    <Text style={styles.obsNotesText}>{siteObservation.observationsNotes}</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.emptySectionText}>No site observations recorded yet.</Text>
            )}
          </Card>

          {/* Section 4: Battery Banks */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Battery Banks</Text>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/(app)/field-service/[id]/battery' as any,
                    params: { id },
                  })
                }
                style={styles.sectionActionBtn}
              >
                <BatteryCharging size={15} color={theme.colors.primaryLight} />
                <Text style={styles.sectionActionText}>
                  {canEdit ? 'Manage Banks' : 'View Readings'}
                </Text>
              </TouchableOpacity>
            </View>

            {batteryBanks && batteryBanks.length > 0 ? (
              <View>
                {batteryBanks.map((bank, index) => (
                  <View key={bank.id || index} style={styles.bankSummaryRow}>
                    <View>
                      <Text style={styles.bankNameText}>
                        Bank #{bank.bankNumber} {bank.bankDescription ? `(${bank.bankDescription})` : ''}
                      </Text>
                      <Text style={styles.bankMetaText}>
                        {bank.make || 'Standard'} • {bank.ah || '—'} Ah • {bank.quantity} Cells (
                        {bank.readings?.length || 0} readings logged)
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptySectionText}>No battery banks configured.</Text>
            )}
          </Card>

          {/* Section 5: Replaced Parts */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Parts Replacement</Text>
              {canEdit && (
                <TouchableOpacity
                  onPress={() => setPartModalVisible(true)}
                  style={styles.sectionActionBtn}
                >
                  <Plus size={15} color={theme.colors.primaryLight} />
                  <Text style={styles.sectionActionText}>Add Part</Text>
                </TouchableOpacity>
              )}
            </View>

            {parts && parts.length > 0 ? (
              <View>
                {parts.map((p, index) => (
                  <View key={p.id || index} style={styles.partItemRow}>
                    <View style={styles.partInfo}>
                      <Text style={styles.partNameText}>{p.partName}</Text>
                      <Text style={styles.partMetaText}>
                        Qty: {p.quantity} {p.partNumber ? `• P/N: ${p.partNumber}` : ''}{' '}
                        {p.oldPartStatus ? `• Old: ${p.oldPartStatus}` : ''}
                      </Text>
                      {p.replacementDetails && (
                        <Text style={styles.partDetailsText}>{p.replacementDetails}</Text>
                      )}
                    </View>
                    {canEdit && (
                      <TouchableOpacity
                        onPress={() => handleDeletePart(p.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={16} color={theme.colors.accentRose} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptySectionText}>No parts replaced on this visit.</Text>
            )}
          </Card>

          {/* Section 6: Photos & Attachments */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Photos & Attachments</Text>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/(app)/field-service/[id]/photos' as any,
                    params: { id },
                  })
                }
                style={styles.sectionActionBtn}
              >
                <Camera size={15} color={theme.colors.primaryLight} />
                <Text style={styles.sectionActionText}>
                  {canEdit ? 'Manage Photos' : 'View Photos'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.attachmentsCountText}>
              {attachments?.length || 0} attachments uploaded
            </Text>
          </Card>

          {/* Section 7: Sign-offs */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Sign-offs</Text>

            {/* Customer Sign-off status */}
            <View style={styles.signOffStatusRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.signOffTitle}>Customer Sign-off</Text>
                <Text style={styles.signOffSubtitle}>
                  {fsr.customerContactName ? `Signed by: ${fsr.customerContactName}` : 'Signature not captured'}
                </Text>
              </View>
              <View style={styles.signActionGroup}>
                <Badge
                  label={fsr.customerSignature ? 'SIGNED' : 'PENDING'}
                  variant={fsr.customerSignature ? 'success' : 'neutral'}
                  size="sm"
                />
                {canSign && (
                  <TouchableOpacity
                    onPress={() => setCustomerSignModalVisible(true)}
                    style={styles.signActionBtn}
                  >
                    <Text style={styles.signActionBtnText}>
                      {fsr.customerSignature ? 'Re-sign' : 'Sign'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* FSE Sign-off status */}
            <View style={styles.signOffStatusRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.signOffTitle}>Service Engineer Sign-off</Text>
                <Text style={styles.signOffSubtitle}>
                  {fsr.fseName ? `Signed by: ${fsr.fseName}` : 'Signature not captured'}
                </Text>
              </View>
              <View style={styles.signActionGroup}>
                <Badge
                  label={fsr.fseSignature ? 'SIGNED' : 'PENDING'}
                  variant={fsr.fseSignature ? 'success' : 'neutral'}
                  size="sm"
                />
                {canSign && (
                  <TouchableOpacity
                    onPress={() => setFseSignModalVisible(true)}
                    style={styles.signActionBtn}
                  >
                    <Text style={styles.signActionBtnText}>
                      {fsr.fseSignature ? 'Re-sign' : 'Sign'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Card>
        </ScrollView>

        {/* Bottom Workflow Action Bar */}
        <View style={styles.bottomBar}>
          {canStart && (
            <Button
              title="Start Visit (Log GPS)"
              variant="primary"
              loading={isGpsCapturing || startMutation.isPending}
              icon={<Play size={18} color={theme.colors.textOnPrimary} />}
              onPress={handleStartFsr}
              style={styles.fullWidthButton}
            />
          )}

          {canComplete && (
            <Button
              title="Complete Visit (Log GPS)"
              variant="primary"
              loading={isGpsCapturing || completeMutation.isPending}
              icon={<FileCheck size={18} color={theme.colors.textOnPrimary} />}
              onPress={handleCompleteFsr}
              style={styles.fullWidthButton}
            />
          )}

          {canDownload && (
            <Button
              title="Download / Share PDF"
              variant={fsr.status === 'COMPLETED' || fsr.status === 'CLOSED' ? 'secondary' : 'outline'}
              loading={isDownloadingPdf}
              icon={<Share2 size={18} color={theme.colors.primaryLight} />}
              onPress={handleDownloadPdf}
              style={styles.fullWidthButton}
            />
          )}
        </View>

        {/* Customer Signature Modal */}
        <SignaturePadModal
          visible={customerSignModalVisible}
          title="Customer Sign-off"
          signerNameLabel="Customer Contact Person"
          initialSignerName={fsr.customerContactName || customer?.name || ''}
          onClose={() => setCustomerSignModalVisible(false)}
          onConfirm={handleSaveCustomerSign}
        />

        {/* FSE Signature Modal */}
        <SignaturePadModal
          visible={fseSignModalVisible}
          title="Service Engineer Sign-off"
          signerNameLabel="Service Engineer Name"
          initialSignerName={fsr.fseName || user?.fullName || ''}
          initialSignerPhone={fsr.fseNumber || user?.phone || ''}
          showPhoneInput
          onClose={() => setFseSignModalVisible(false)}
          onConfirm={handleSaveFseSign}
        />

        {/* Site Observation Modal */}
        <Modal
          visible={obsModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setObsModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Site Observations</Text>
              <ScrollView style={styles.modalScroll}>
                <Input
                  label="Input Voltage L-N (V)"
                  keyboardType="numeric"
                  value={obsForm.inputVoltageLN !== undefined ? String(obsForm.inputVoltageLN) : ''}
                  onChangeText={(val) =>
                    setObsForm((prev) => ({ ...prev, inputVoltageLN: val ? Number(val) : undefined }))
                  }
                />
                <Input
                  label="Input Voltage L-L (V)"
                  keyboardType="numeric"
                  value={obsForm.inputVoltageLL !== undefined ? String(obsForm.inputVoltageLL) : ''}
                  onChangeText={(val) =>
                    setObsForm((prev) => ({ ...prev, inputVoltageLL: val ? Number(val) : undefined }))
                  }
                />
                <Input
                  label="Output Voltage L-N (V)"
                  keyboardType="numeric"
                  value={obsForm.outputVoltageLN !== undefined ? String(obsForm.outputVoltageLN) : ''}
                  onChangeText={(val) =>
                    setObsForm((prev) => ({ ...prev, outputVoltageLN: val ? Number(val) : undefined }))
                  }
                />
                <Input
                  label="Output Voltage L-L (V)"
                  keyboardType="numeric"
                  value={obsForm.outputVoltageLL !== undefined ? String(obsForm.outputVoltageLL) : ''}
                  onChangeText={(val) =>
                    setObsForm((prev) => ({ ...prev, outputVoltageLL: val ? Number(val) : undefined }))
                  }
                />
                <Input
                  label="Frequency (Hz)"
                  keyboardType="numeric"
                  value={obsForm.frequency !== undefined ? String(obsForm.frequency) : ''}
                  onChangeText={(val) =>
                    setObsForm((prev) => ({ ...prev, frequency: val ? Number(val) : undefined }))
                  }
                />
                <Input
                  label="Output Load (%)"
                  keyboardType="numeric"
                  value={obsForm.outputLoadPercent !== undefined ? String(obsForm.outputLoadPercent) : ''}
                  onChangeText={(val) =>
                    setObsForm((prev) => ({ ...prev, outputLoadPercent: val ? Number(val) : undefined }))
                  }
                />
                <Input
                  label="DC Voltage (V)"
                  keyboardType="numeric"
                  value={obsForm.dcVoltage !== undefined ? String(obsForm.dcVoltage) : ''}
                  onChangeText={(val) =>
                    setObsForm((prev) => ({ ...prev, dcVoltage: val ? Number(val) : undefined }))
                  }
                />
                <Input
                  label="Environment Condition"
                  placeholder="e.g. Normal, Dusty, High Temp"
                  value={obsForm.environmentCondition || ''}
                  onChangeText={(val) =>
                    setObsForm((prev) => ({ ...prev, environmentCondition: val }))
                  }
                />
                <Input
                  label="Observations / Notes"
                  placeholder="General site observations notes..."
                  multiline
                  numberOfLines={3}
                  value={obsForm.observationsNotes || ''}
                  onChangeText={(val) =>
                    setObsForm((prev) => ({ ...prev, observationsNotes: val }))
                  }
                />
              </ScrollView>

              <View style={styles.modalActionRow}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={() => setObsModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save"
                  variant="primary"
                  loading={observationMutation.isPending}
                  onPress={handleSaveObservation}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Add Part Modal */}
        <Modal
          visible={partModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setPartModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Replaced Part</Text>
              <ScrollView style={styles.modalScroll}>
                <Input
                  label="Part Name *"
                  placeholder="e.g. Cooling Fan 120mm"
                  value={partForm.partName}
                  onChangeText={(val) => setPartForm((prev) => ({ ...prev, partName: val }))}
                />
                <Input
                  label="Part Number"
                  placeholder="e.g. FAN-120-24V"
                  value={partForm.partNumber || ''}
                  onChangeText={(val) => setPartForm((prev) => ({ ...prev, partNumber: val }))}
                />
                <Input
                  label="Quantity"
                  keyboardType="numeric"
                  value={String(partForm.quantity || 1)}
                  onChangeText={(val) => setPartForm((prev) => ({ ...prev, quantity: Number(val) || 1 }))}
                />
                <Input
                  label="Replacement Details"
                  placeholder="e.g. Replaced noisy bearing fan"
                  value={partForm.replacementDetails || ''}
                  onChangeText={(val) => setPartForm((prev) => ({ ...prev, replacementDetails: val }))}
                />
                <Input
                  label="Old Part Status"
                  placeholder="e.g. Defective, Scrapped"
                  value={partForm.oldPartStatus || ''}
                  onChangeText={(val) => setPartForm((prev) => ({ ...prev, oldPartStatus: val }))}
                />
              </ScrollView>

              <View style={styles.modalActionRow}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={() => setPartModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Add Part"
                  variant="primary"
                  loading={addPartMutation.isPending}
                  onPress={handleAddPart}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
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
    paddingHorizontal: theme.spacing.lg,
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
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: theme.spacing.md,
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
    marginRight: theme.spacing.sm,
  },
  navFsrNumber: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  navCustomerName: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  statusBannerCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  statusBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  visitDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visitDateText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  checklistRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  checklistItem: {
    alignItems: 'center',
    gap: 2,
  },
  checklistText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  sectionCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  sectionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primarySoft,
  },
  sectionActionText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primaryLight,
  },
  primaryCustomerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  contactPersonText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  detailIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  detailText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  equipmentText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  serialNumberText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  problemBox: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
  },
  problemBoxLabel: {
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  problemBoxText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  obsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  obsItem: {
    width: '47%',
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  obsLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  obsValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  obsFullRow: {
    width: '100%',
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  obsNotesText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  emptySectionText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  bankSummaryRow: {
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  bankNameText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  bankMetaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  partItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  partInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  partNameText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  partMetaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  partDetailsText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  attachmentsCountText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  signOffStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  signOffTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  signOffSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  signActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  signActionBtnText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primaryLight,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  fullWidthButton: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
});
