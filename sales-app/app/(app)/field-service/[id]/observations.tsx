import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Activity,
  Zap,
  CheckCircle2,
  AlertCircle,
  Save,
  Edit3,
  Gauge,
  Cpu,
  MapPin,
  Building2,
  FileText,
  Info,
  Shield,
} from 'lucide-react-native';
import { ScreenContainer } from '../../../../src/components/ui/ScreenContainer';
import { Card } from '../../../../src/components/ui/Card';
import { Badge } from '../../../../src/components/ui/Badge';
import { Button } from '../../../../src/components/ui/Button';
import { Input } from '../../../../src/components/ui/Input';
import { useAuthStore } from '../../../../src/auth/auth.store';
import { useFsrDetail, useUpdateSiteObservation } from '../../../../src/hooks/useFsr';
import { canEditFSR } from '../../../../src/utils/fsrPermissions';
import { theme } from '../../../../src/theme/theme';
import { FsrSiteObservation, FsrUpsLocation, UpdateSiteObservationPayload } from '../../../../src/types/fsr.types';

const ENVIRONMENT_CONDITIONS = [
  { label: 'Good / Normal', value: 'Good' },
  { label: 'Fair / Acceptable', value: 'Fair' },
  { label: 'Poor / Dusty / Hot', value: 'Poor' },
];

const UPS_LOCATIONS: { label: string; value: FsrUpsLocation }[] = [
  { label: 'Computer Room', value: 'COMPUTER_ROOM' },
  { label: 'Electrical Room', value: 'ELECTRICAL_ROOM' },
  { label: 'Network Room', value: 'NETWORK_ROOM' },
  { label: 'Other', value: 'OTHER' },
];

export default function FsrObservationsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const fsrId = id || '';
  const user = useAuthStore((state) => state.user);

  const { data: fsrDetail, isLoading, refetch } = useFsrDetail(fsrId);
  const updateObservationMutation = useUpdateSiteObservation();

  const fsr = fsrDetail?.fsr;
  const siteObservation = fsrDetail?.siteObservation;
  const canEdit = canEditFSR(user, fsr);

  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [form, setForm] = useState<{
    inputOnMains: string;
    inputVoltageLN: string;
    inputVoltageLL: string;
    outputVoltageLN: string;
    outputVoltageLL: string;
    vac: string;
    inputFrequency: string;
    outputFrequency: string;
    dcVoltage: string;
    outputLoadPercent: string;
    environmentCondition: string;
    environmentRemarks: string;
    upsLocation: FsrUpsLocation;
    otherLocationSpecification: string;
    observationsNotes: string;
  }>({
    inputOnMains: '',
    inputVoltageLN: '',
    inputVoltageLL: '',
    outputVoltageLN: '',
    outputVoltageLL: '',
    vac: '',
    inputFrequency: '',
    outputFrequency: '',
    dcVoltage: '',
    outputLoadPercent: '',
    environmentCondition: 'Good',
    environmentRemarks: '',
    upsLocation: 'COMPUTER_ROOM',
    otherLocationSpecification: '',
    observationsNotes: '',
  });

  // Sync form state when loaded
  useEffect(() => {
    if (siteObservation) {
      setForm({
        inputOnMains: siteObservation.inputOnMains || '',
        inputVoltageLN: siteObservation.inputVoltageLN != null ? String(siteObservation.inputVoltageLN) : '',
        inputVoltageLL: siteObservation.inputVoltageLL != null ? String(siteObservation.inputVoltageLL) : '',
        outputVoltageLN: siteObservation.outputVoltageLN != null ? String(siteObservation.outputVoltageLN) : '',
        outputVoltageLL: siteObservation.outputVoltageLL != null ? String(siteObservation.outputVoltageLL) : '',
        vac: siteObservation.vac != null ? String(siteObservation.vac) : '',
        inputFrequency: siteObservation.inputFrequency != null ? String(siteObservation.inputFrequency) : '',
        outputFrequency: siteObservation.outputFrequency != null ? String(siteObservation.outputFrequency) : '',
        dcVoltage: siteObservation.dcVoltage != null ? String(siteObservation.dcVoltage) : '',
        outputLoadPercent: siteObservation.outputLoadPercent != null ? String(siteObservation.outputLoadPercent) : '',
        environmentCondition: siteObservation.environmentCondition || 'Good',
        environmentRemarks: siteObservation.environmentRemarks || '',
        upsLocation: (siteObservation.upsLocation as FsrUpsLocation) || 'COMPUTER_ROOM',
        otherLocationSpecification: siteObservation.otherLocationSpecification || '',
        observationsNotes: siteObservation.observationsNotes || '',
      });
    } else {
      // If no observation exists and user can edit, default into edit mode
      setIsEditing(true);
    }
  }, [siteObservation]);

  const handleSave = async () => {
    if (!fsrId) return;

    const parseNum = (val: string): number | undefined => {
      const clean = val.trim();
      if (!clean) return undefined;
      const num = Number(clean);
      return isNaN(num) ? undefined : num;
    };

    const payload: UpdateSiteObservationPayload = {
      inputOnMains: form.inputOnMains.trim() || undefined,
      inputVoltageLN: parseNum(form.inputVoltageLN),
      inputVoltageLL: parseNum(form.inputVoltageLL),
      outputVoltageLN: parseNum(form.outputVoltageLN),
      outputVoltageLL: parseNum(form.outputVoltageLL),
      vac: parseNum(form.vac),
      inputFrequency: parseNum(form.inputFrequency),
      outputFrequency: parseNum(form.outputFrequency),
      dcVoltage: parseNum(form.dcVoltage),
      outputLoadPercent: parseNum(form.outputLoadPercent),
      environmentCondition: form.environmentCondition || undefined,
      environmentRemarks: form.environmentRemarks.trim() || undefined,
      upsLocation: form.upsLocation || undefined,
      otherLocationSpecification:
        form.upsLocation === 'OTHER' ? form.otherLocationSpecification.trim() || undefined : undefined,
      observationsNotes: form.observationsNotes.trim() || undefined,
    };

    try {
      await updateObservationMutation.mutateAsync({
        id: fsrId,
        payload,
      });
      await refetch();
      setIsEditing(false);
      Alert.alert('Success', 'Site observations and electrical measurements saved successfully.');
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to save site observations.';
      Alert.alert('Error', msg);
    }
  };

  if (isLoading && !fsrDetail) {
    return (
      <ScreenContainer>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.colors.primaryLight} />
          <Text style={styles.centerText}>Loading site observations...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const hasRecordedData = Boolean(
    siteObservation &&
      (siteObservation.inputVoltageLN ||
        siteObservation.outputVoltageLN ||
        siteObservation.dcVoltage ||
        siteObservation.observationsNotes)
  );

  return (
    <ScreenContainer>
      {/* Top Navigation Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Site Observations & Readings
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {fsr?.fsrNumber || 'FSR'} • {fsr?.companyName || fsr?.customerName || fsr?.productModel || 'Service Report'}
          </Text>
        </View>
        {canEdit && (
          <TouchableOpacity
            style={[styles.editToggleBtn, isEditing && styles.editToggleBtnActive]}
            onPress={() => {
              if (isEditing) {
                setIsEditing(false);
              } else {
                setIsEditing(true);
              }
            }}
          >
            {isEditing ? (
              <Text style={styles.editToggleTextActive}>Cancel</Text>
            ) : (
              <View style={styles.editToggleInner}>
                <Edit3 size={14} color={theme.colors.primaryLight} />
                <Text style={styles.editToggleText}>Edit</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status Overview Card */}
          <Card style={styles.overviewCard}>
            <View style={styles.overviewHeaderRow}>
              <View style={styles.overviewIconBox}>
                <Activity size={20} color={theme.colors.primaryLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.overviewTitle}>Electrical & Site Telemetry</Text>
                <Text style={styles.overviewSub}>
                  Live voltage, load percentage, room condition & environment
                </Text>
              </View>
              <Badge
                label={hasRecordedData ? 'Recorded' : 'Pending Measurements'}
                variant={hasRecordedData ? 'success' : 'warning'}
                size="sm"
              />
            </View>
          </Card>

          {/* SECTION 1: ELECTRICAL MEASUREMENTS GRID */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Zap size={18} color={theme.colors.accentAmber} />
              <Text style={styles.sectionTitle}>Electrical Parameters</Text>
            </View>

            {isEditing ? (
              <View style={styles.formGrid}>
                <Input
                  label="Input on Mains"
                  placeholder="e.g. Yes / Normal / Phase Drop"
                  value={form.inputOnMains}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, inputOnMains: val }))}
                />

                <View style={styles.rowTwoCols}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Input Voltage (L-N)"
                      placeholder="e.g. 230 V"
                      keyboardType="numeric"
                      value={form.inputVoltageLN}
                      onChangeText={(val) => setForm((prev) => ({ ...prev, inputVoltageLN: val }))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Input Voltage (L-L)"
                      placeholder="e.g. 400 V"
                      keyboardType="numeric"
                      value={form.inputVoltageLL}
                      onChangeText={(val) => setForm((prev) => ({ ...prev, inputVoltageLL: val }))}
                    />
                  </View>
                </View>

                <View style={styles.rowTwoCols}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Output Voltage (L-N)"
                      placeholder="e.g. 230 V"
                      keyboardType="numeric"
                      value={form.outputVoltageLN}
                      onChangeText={(val) => setForm((prev) => ({ ...prev, outputVoltageLN: val }))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Output Voltage (L-L)"
                      placeholder="e.g. 400 V"
                      keyboardType="numeric"
                      value={form.outputVoltageLL}
                      onChangeText={(val) => setForm((prev) => ({ ...prev, outputVoltageLL: val }))}
                    />
                  </View>
                </View>

                <View style={styles.rowTwoCols}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="VAC Rating"
                      placeholder="e.g. 415 V"
                      keyboardType="numeric"
                      value={form.vac}
                      onChangeText={(val) => setForm((prev) => ({ ...prev, vac: val }))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="DC Bus Voltage"
                      placeholder="e.g. 216 V DC"
                      keyboardType="numeric"
                      value={form.dcVoltage}
                      onChangeText={(val) => setForm((prev) => ({ ...prev, dcVoltage: val }))}
                    />
                  </View>
                </View>

                <View style={styles.rowTwoCols}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Input Frequency"
                      placeholder="e.g. 50.0 Hz"
                      keyboardType="numeric"
                      value={form.inputFrequency}
                      onChangeText={(val) => setForm((prev) => ({ ...prev, inputFrequency: val }))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Output Frequency"
                      placeholder="e.g. 50.0 Hz"
                      keyboardType="numeric"
                      value={form.outputFrequency}
                      onChangeText={(val) => setForm((prev) => ({ ...prev, outputFrequency: val }))}
                    />
                  </View>
                </View>

                <Input
                  label="Output Load Percentage (%)"
                  placeholder="e.g. 65"
                  keyboardType="numeric"
                  value={form.outputLoadPercent}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, outputLoadPercent: val }))}
                />
              </View>
            ) : (
              /* View Mode: Metrics Tiles */
              <View style={styles.metricsGrid}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Input on Mains</Text>
                  <Text style={styles.metricValue}>{siteObservation?.inputOnMains || '—'}</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Input (L-N)</Text>
                  <Text style={styles.metricValue}>
                    {siteObservation?.inputVoltageLN != null ? `${siteObservation.inputVoltageLN} V` : '—'}
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Input (L-L)</Text>
                  <Text style={styles.metricValue}>
                    {siteObservation?.inputVoltageLL != null ? `${siteObservation.inputVoltageLL} V` : '—'}
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Output (L-N)</Text>
                  <Text style={styles.metricValue}>
                    {siteObservation?.outputVoltageLN != null ? `${siteObservation.outputVoltageLN} V` : '—'}
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Output (L-L)</Text>
                  <Text style={styles.metricValue}>
                    {siteObservation?.outputVoltageLL != null ? `${siteObservation.outputVoltageLL} V` : '—'}
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>VAC</Text>
                  <Text style={styles.metricValue}>
                    {siteObservation?.vac != null ? `${siteObservation.vac} V` : '—'}
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Input Frequency</Text>
                  <Text style={styles.metricValue}>
                    {siteObservation?.inputFrequency != null ? `${siteObservation.inputFrequency} Hz` : '—'}
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Output Frequency</Text>
                  <Text style={styles.metricValue}>
                    {siteObservation?.outputFrequency != null ? `${siteObservation.outputFrequency} Hz` : '—'}
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>DC Bus Voltage</Text>
                  <Text style={styles.metricValue}>
                    {siteObservation?.dcVoltage != null ? `${siteObservation.dcVoltage} V` : '—'}
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Output Load %</Text>
                  <Text style={[styles.metricValue, { color: theme.colors.primaryLight, fontWeight: 'bold' }]}>
                    {siteObservation?.outputLoadPercent != null ? `${siteObservation.outputLoadPercent}%` : '—'}
                  </Text>
                </View>
              </View>
            )}
          </Card>

          {/* SECTION 2: ROOM ENVIRONMENT & CONDITION */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Shield size={18} color={theme.colors.accentEmerald} />
              <Text style={styles.sectionTitle}>Room Environment Condition</Text>
            </View>

            {isEditing ? (
              <View>
                <Text style={styles.fieldLabel}>Condition Assessment</Text>
                <View style={styles.pillsRow}>
                  {ENVIRONMENT_CONDITIONS.map((cond) => {
                    const isSelected = form.environmentCondition === cond.value;
                    return (
                      <TouchableOpacity
                        key={cond.value}
                        style={[styles.pillChip, isSelected && styles.pillChipActive]}
                        onPress={() => setForm((prev) => ({ ...prev, environmentCondition: cond.value }))}
                      >
                        <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                          {cond.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{ marginTop: 12 }}>
                  <Input
                    label="Environment Remarks"
                    placeholder="e.g. AC working at 22°C, well-ventilated, minimal dust"
                    value={form.environmentRemarks}
                    onChangeText={(val) => setForm((prev) => ({ ...prev, environmentRemarks: val }))}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.envDisplayBox}>
                <View style={styles.envRow}>
                  <Text style={styles.envLabel}>Condition:</Text>
                  <Badge
                    label={siteObservation?.environmentCondition || 'Normal'}
                    variant={
                      siteObservation?.environmentCondition === 'Good'
                        ? 'success'
                        : siteObservation?.environmentCondition === 'Poor'
                        ? 'error'
                        : 'neutral'
                    }
                    size="md"
                  />
                </View>
                {siteObservation?.environmentRemarks ? (
                  <Text style={styles.envRemarks}>{siteObservation.environmentRemarks}</Text>
                ) : null}
              </View>
            )}
          </Card>

          {/* SECTION 3: UPS ROOM LOCATION */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Building2 size={18} color={theme.colors.primaryLight} />
              <Text style={styles.sectionTitle}>UPS Equipment Location</Text>
            </View>

            {isEditing ? (
              <View>
                <Text style={styles.fieldLabel}>Installed Location</Text>
                <View style={styles.pillsRow}>
                  {UPS_LOCATIONS.map((loc) => {
                    const isSelected = form.upsLocation === loc.value;
                    return (
                      <TouchableOpacity
                        key={loc.value}
                        style={[styles.pillChip, isSelected && styles.pillChipActive]}
                        onPress={() => setForm((prev) => ({ ...prev, upsLocation: loc.value }))}
                      >
                        <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                          {loc.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {form.upsLocation === 'OTHER' && (
                  <View style={{ marginTop: 12 }}>
                    <Input
                      label="Specify Location"
                      placeholder="e.g. Mezzanine floor / Plant room #2"
                      value={form.otherLocationSpecification}
                      onChangeText={(val) =>
                        setForm((prev) => ({ ...prev, otherLocationSpecification: val }))
                      }
                    />
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.locationDisplayBox}>
                <MapPin size={18} color={theme.colors.primaryLight} />
                <Text style={styles.locationText}>
                  {siteObservation?.upsLocation
                    ? siteObservation.upsLocation.replace(/_/g, ' ')
                    : 'COMPUTER ROOM'}
                  {siteObservation?.otherLocationSpecification
                    ? ` (${siteObservation.otherLocationSpecification})`
                    : ''}
                </Text>
              </View>
            )}
          </Card>

          {/* SECTION 4: OBSERVATION NOTES */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <FileText size={18} color={theme.colors.primaryLight} />
              <Text style={styles.sectionTitle}>Inspection & Observation Notes</Text>
            </View>

            {isEditing ? (
              <TextInput
                style={styles.textArea}
                placeholder="Enter detailed observations about mains wiring, phase balancing, earthing/grounding voltages, or environmental recommendations..."
                placeholderTextColor={theme.colors.textMuted}
                value={form.observationsNotes}
                onChangeText={(val) => setForm((prev) => ({ ...prev, observationsNotes: val }))}
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.notesText}>
                {siteObservation?.observationsNotes || 'No observation notes recorded for this service report.'}
              </Text>
            )}
          </Card>

          {/* Action Button when Editing */}
          {isEditing && (
            <View style={styles.saveActionBox}>
              <Button
                title={updateObservationMutation.isPending ? 'Saving Readings...' : 'Save Site Observations'}
                variant="primary"
                size="lg"
                icon={<Save size={18} color="#FFFFFF" />}
                loading={updateObservationMutation.isPending}
                onPress={handleSave}
              />
              <Button
                title="Cancel Changes"
                variant="outline"
                size="md"
                onPress={() => setIsEditing(false)}
                style={{ marginTop: 10 }}
              />
            </View>
          )}

          {!isEditing && canEdit && (
            <View style={styles.saveActionBox}>
              <Button
                title="Edit Site Observations & Readings"
                variant="secondary"
                size="md"
                icon={<Edit3 size={16} color={theme.colors.textPrimary} />}
                onPress={() => setIsEditing(true)}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceElevated,
  },
  headerTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  editToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editToggleBtnActive: {
    borderColor: theme.colors.accentAmber,
    backgroundColor: `${theme.colors.accentAmber}15`,
  },
  editToggleInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editToggleText: {
    fontSize: 12,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primaryLight,
  },
  editToggleTextActive: {
    fontSize: 12,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.accentAmber,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100, // Ample clearance for complete scrolling on any phone
    gap: theme.spacing.md,
  },
  overviewCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  overviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  overviewIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  overviewSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  sectionCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  formGrid: {
    gap: 12,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricBox: {
    width: '48%',
    padding: 10,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metricLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  fieldLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillChipActive: {
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.primarySoft,
  },
  pillText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  pillTextActive: {
    color: theme.colors.primaryLight,
    fontWeight: theme.fontWeight.bold,
  },
  envDisplayBox: {
    gap: 6,
  },
  envRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  envLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  envRemarks: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  locationDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  locationText: {
    fontSize: 13,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  textArea: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    padding: 12,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  notesText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  saveActionBox: {
    marginTop: 8,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 12,
  },
});
