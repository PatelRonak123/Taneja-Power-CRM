import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  Save,
  ShieldCheck,
  Check,
  User,
  Wrench,
  Sparkles,
} from 'lucide-react-native';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { theme } from '../../theme/theme';
import { amcService } from '../../services/amc.service';
import { taskTrackingService } from '../../services/taskTracking.service';
import {
  AmcServiceReportData,
  AmcServiceReportItem,
  AmcServiceReportEquipment,
} from '../../types/amc.types';

export interface AmcServiceReportModalProps {
  visible: boolean;
  visitId: string;
  taskId: string;
  taskStatus?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AmcServiceReportModal: React.FC<AmcServiceReportModalProps> = ({
  visible,
  visitId,
  taskId,
  taskStatus = 'IN_PROGRESS',
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [savingDraft, setSavingDraft] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [report, setReport] = useState<AmcServiceReportData | null>(null);

  // Form Fields
  const [serviceSummary, setServiceSummary] = useState<string>('');
  const [observations, setObservations] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerRemarks, setCustomerRemarks] = useState<string>('');
  const [items, setItems] = useState<AmcServiceReportItem[]>([]);
  const [equipment, setEquipment] = useState<AmcServiceReportEquipment[]>([]);

  useEffect(() => {
    if (visible && visitId) {
      loadReport();
    }
  }, [visible, visitId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await amcService.getOrCreateReport(visitId);
      setReport(data);
      setServiceSummary(data.serviceSummary || 'Preventive maintenance completed satisfactorily.');
      setObservations(data.observations || 'All stabilizer voltage & electrical parameters verified.');
      setRecommendations(data.recommendations || 'Regular quarterly maintenance recommended.');
      setCustomerName(data.customerName || '');
      setCustomerRemarks(data.customerRemarks || 'Work completed satisfactorily.');
      setItems(data.items || []);
      setEquipment(data.equipment || []);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load AMC report.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const isCompleted = report?.status === 'COMPLETED';
  const canEdit = taskStatus === 'IN_PROGRESS' && !isCompleted;

  const toggleItemStatus = (itemId: string) => {
    if (!canEdit) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const nextStatus =
            item.status === 'COMPLETED' ? 'ATTENTION_REQUIRED' : 'COMPLETED';
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  const toggleEquipmentStatus = (eqId: string) => {
    if (!canEdit) return;
    setEquipment((prev) =>
      prev.map((eq) => {
        if (eq.id === eqId) {
          const nextCondition =
            eq.conditionStatus === 'OPERATIONAL' ? 'NEEDS_REPAIR' : 'OPERATIONAL';
          return { ...eq, conditionStatus: nextCondition };
        }
        return eq;
      })
    );
  };

  const handleSaveDraft = async () => {
    if (isCompleted || !report) return;
    try {
      setSavingDraft(true);
      await amcService.updateReport(visitId, {
        reportId: report.id,
        serviceSummary,
        observations,
        recommendations,
        customerName,
        customerRemarks,
        items: items.map((it) => ({ id: it.id, status: it.status, remarks: it.remarks })),
        equipment: equipment.map((eq) => ({
          id: eq.id,
          conditionStatus: eq.conditionStatus,
          observations: eq.observations,
        })),
      });
      Alert.alert('Draft Saved', 'AMC service report draft saved successfully.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save draft.';
      Alert.alert('Save Failed', msg);
    } finally {
      setSavingDraft(false);
    }
  };

  const hasDefectiveUnits = equipment.some(
    (eq) => eq.conditionStatus === 'NEEDS_REPAIR' || eq.conditionStatus === 'FAULTY'
  );

  const handleSubmitReportAndEndTask = () => {
    if (isCompleted) return;

    // Validation: Defect observations required when equipment needs repair
    if (hasDefectiveUnits) {
      const hasOverallObservations = Boolean(observations && observations.trim().length > 0);
      const hasEqSpecificObservations = equipment.some(
        (eq) =>
          (eq.conditionStatus === 'NEEDS_REPAIR' || eq.conditionStatus === 'FAULTY') &&
          Boolean(eq.observations && eq.observations.trim().length > 0)
      );

      if (!hasOverallObservations && !hasEqSpecificObservations) {
        Alert.alert(
          'Defect Observation Required',
          'One or more equipment units are marked as NEEDS REPAIR. Please enter technical defect observations describing the fault before submitting.'
        );
        return;
      }
    }

    const visitOutcome = hasDefectiveUnits ? 'REQUIRES_FOLLOWUP' : 'SATISFACTORY';
    const dialogTitle = hasDefectiveUnits
      ? 'Submit Defect & Request Follow-Up'
      : 'Submit AMC Report & End Task';
    const dialogMsg = hasDefectiveUnits
      ? 'You have reported equipment defects. This visit will be finalized with outcome REQUIRES FOLLOW-UP and forwarded to the Service Office to determine repair coverage. Proceed?'
      : 'Are you sure you want to finalize this AMC Service Report? This will mark the visit as COMPLETED and conclude GPS tracking.';

    Alert.alert(
      dialogTitle,
      dialogMsg,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: hasDefectiveUnits ? 'Submit Defect Finding' : 'Confirm & Complete',
          style: hasDefectiveUnits ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setSubmitting(true);
              await amcService.completeVisit(visitId, {
                serviceSummary:
                  serviceSummary ||
                  (hasDefectiveUnits
                    ? 'Preventive maintenance completed with defect observations.'
                    : 'Preventive maintenance completed satisfactorily.'),
                observations,
                recommendations,
                customerName,
                customerRemarks,
                visitOutcome,
                items: items.map((it) => ({ id: it.id, status: it.status, remarks: it.remarks })),
                equipment: equipment.map((eq) => ({
                  id: eq.id,
                  conditionStatus: eq.conditionStatus,
                  observations: eq.observations,
                })),
              });

              // Stop tracking service
              try {
                await taskTrackingService.stopTracking(taskId);
              } catch {
                // non-blocking
              }

              Alert.alert(
                hasDefectiveUnits ? 'Defect Report Forwarded' : 'Work Order Completed',
                hasDefectiveUnits
                  ? 'AMC report submitted with outcome REQUIRES FOLLOW-UP. The Service Office will review the finding for repair planning.'
                  : 'AMC Service Report submitted successfully and task marked as completed!'
              );
              onSuccess();
              onClose();
            } catch (err: any) {
              const msg =
                err?.response?.data?.message || err?.message || 'Failed to submit report.';
              Alert.alert('Submission Error', msg);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconBox}>
              <FileText size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.headerTitle}>
                {report?.reportNumber
                  ? `Report: ${report.reportNumber}`
                  : 'AMC Service Report'}
              </Text>
              <Text style={styles.headerSubtitle}>Preventive Maintenance Execution</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={22} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={theme.colors.primaryLight} />
            <Text style={styles.loaderText}>Loading AMC Service Report details...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Completed Notice */}
            {isCompleted && (
              <View style={styles.completedNotice}>
                <ShieldCheck size={20} color={theme.colors.accentEmerald} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.completedNoticeTitle}>Report Finalized</Text>
                  <Text style={styles.completedNoticeText}>
                    This official AMC service report was finalized and submitted.
                  </Text>
                </View>
              </View>
            )}

            {/* Task Not Started Notice */}
            {!canEdit && !isCompleted && (
              <View style={styles.notStartedNotice}>
                <AlertTriangle size={20} color={theme.colors.accentAmber} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notStartedNoticeTitle}>Task Not Started</Text>
                  <Text style={styles.notStartedNoticeText}>
                    You must start the work order first to edit and submit this AMC Service Report.
                  </Text>
                </View>
              </View>
            )}

            {/* Scope Checklist Items */}
            {items.length > 0 && (
              <Card style={styles.card}>
                <Text style={styles.sectionTitle}>Preventive Scope Checklist</Text>
                <Text style={styles.sectionSubtitle}>
                  {canEdit ? 'Tap any item to toggle Pass / Attention status' : 'Checklist snapshot from contract'}
                </Text>
                <View style={styles.itemsList}>
                  {items.map((item, idx) => {
                    const isPassed = item.status === 'COMPLETED';
                    return (
                      <TouchableOpacity
                        key={item.id || idx}
                        style={[
                          styles.checklistItem,
                          isPassed ? styles.checklistItemPassed : styles.checklistItemWarning,
                        ]}
                        disabled={!canEdit}
                        onPress={() => toggleItemStatus(item.id)}
                      >
                        <View style={styles.checkIconBox}>
                          {isPassed ? (
                            <CheckCircle2 size={18} color={theme.colors.accentEmerald} />
                          ) : (
                            <AlertTriangle size={18} color={theme.colors.accentAmber} />
                          )}
                        </View>
                        <Text style={styles.checklistText}>
                          {item.scopeDescription || item.descriptionSnapshot || 'Scope Checklist Item'}
                        </Text>
                        <Badge
                          label={isPassed ? 'COMPLETED' : 'ATTENTION'}
                          variant={isPassed ? 'success' : 'warning'}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Card>
            )}

            {/* Equipment Condition Inspection */}
            {equipment.length > 0 && (
              <Card style={styles.card}>
                <Text style={styles.sectionTitle}>Equipment Condition</Text>
                <Text style={styles.sectionSubtitle}>
                  {canEdit ? 'Verify operational health of contracted units' : 'Equipment condition snapshot'}
                </Text>

                {hasDefectiveUnits && (
                  <View style={styles.defectNoticeBanner}>
                    <AlertTriangle size={18} color="#F59E0B" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.defectNoticeTitle}>Equipment Defect Detected</Text>
                      <Text style={styles.defectNoticeText}>
                        This visit will conclude with outcome REQUIRES FOLLOW-UP. Please describe the defect in the technical observations below.
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.itemsList}>
                  {equipment.map((eq, idx) => {
                    const isOperational = eq.conditionStatus === 'OPERATIONAL';
                    return (
                      <View key={eq.id || idx} style={{ gap: 6 }}>
                        <TouchableOpacity
                          style={[
                            styles.checklistItem,
                            isOperational ? styles.checklistItemPassed : styles.checklistItemWarning,
                          ]}
                          disabled={!canEdit}
                          onPress={() => toggleEquipmentStatus(eq.id)}
                        >
                          <View style={styles.checkIconBox}>
                            <Wrench
                              size={18}
                              color={isOperational ? theme.colors.accentEmerald : theme.colors.accentAmber}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.checklistText}>
                              {eq.equipmentName || eq.equipmentNameSnapshot || 'Equipment Unit'}
                            </Text>
                            {(eq.rating || eq.ratingSnapshot || eq.configuration) && (
                              <Text style={styles.eqSubtext}>
                                {[eq.configuration, eq.rating || eq.ratingSnapshot].filter(Boolean).join(' • ')}
                              </Text>
                            )}
                          </View>
                          <Badge
                            label={isOperational ? 'OPERATIONAL' : 'NEEDS REPAIR'}
                            variant={isOperational ? 'success' : 'error'}
                          />
                        </TouchableOpacity>

                        {!isOperational && canEdit && (
                          <View style={styles.defectInputBox}>
                            <Input
                              label={`Defect Observation for ${eq.equipmentName || 'Unit'}`}
                              value={eq.observations || ''}
                              onChangeText={(val) => {
                                setEquipment((prev) =>
                                  prev.map((e) => (e.id === eq.id ? { ...e, observations: val } : e))
                                );
                              }}
                              placeholder="Specify malfunction, noise, voltage abnormality, required parts..."
                              multiline
                              numberOfLines={2}
                              editable={canEdit}
                            />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </Card>
            )}

            {/* Service Summary Input */}
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Service Findings & Observations</Text>

              <Input
                label="Service Summary"
                value={serviceSummary}
                onChangeText={setServiceSummary}
                placeholder="Summary of work performed..."
                multiline
                numberOfLines={3}
                editable={canEdit}
                containerStyle={styles.inputSpacing}
              />

              <Input
                label="Technical Observations"
                value={observations}
                onChangeText={setObservations}
                placeholder="Voltage readings, physical inspection notes..."
                multiline
                numberOfLines={3}
                editable={canEdit}
                containerStyle={styles.inputSpacing}
              />

              <Input
                label="Recommendations for Client"
                value={recommendations}
                onChangeText={setRecommendations}
                placeholder="Preventive maintenance advice..."
                multiline
                numberOfLines={2}
                editable={canEdit}
                containerStyle={styles.inputSpacing}
              />
            </Card>

            {/* Customer Sign-off & Remarks */}
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Customer Sign-Off</Text>

              <Input
                label="Customer Representative Name"
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Full name of representative"
                leftIcon={<User size={16} color={theme.colors.textMuted} />}
                editable={canEdit}
                containerStyle={styles.inputSpacing}
              />

              <Input
                label="Customer Remarks / Feedback"
                value={customerRemarks}
                onChangeText={setCustomerRemarks}
                placeholder="Client comments on maintenance quality..."
                multiline
                numberOfLines={2}
                editable={canEdit}
                containerStyle={styles.inputSpacing}
              />
            </Card>
          </ScrollView>
        )}

        {/* Footer Actions */}
        <View style={styles.footer}>
          {!canEdit ? (
            <Button
              title="Close Report"
              variant="secondary"
              size="lg"
              onPress={onClose}
              style={styles.fullWidthBtn}
            />
          ) : (
            <View style={styles.actionButtonsRow}>
              <Button
                title={savingDraft ? 'Saving...' : 'Save Draft'}
                variant="secondary"
                size="md"
                icon={<Save size={16} color={theme.colors.primaryLight} />}
                onPress={handleSaveDraft}
                loading={savingDraft}
                disabled={savingDraft || submitting}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title={
                  submitting
                    ? 'Submitting...'
                    : hasDefectiveUnits
                    ? 'Submit Defect Finding'
                    : 'Submit & End Task'
                }
                variant={hasDefectiveUnits ? 'danger' : 'primary'}
                size="md"
                icon={
                  hasDefectiveUnits ? (
                    <AlertTriangle size={16} color="#FFFFFF" />
                  ) : (
                    <CheckCircle2 size={16} color="#FFFFFF" />
                  )
                }
                onPress={handleSubmitReportAndEndTask}
                loading={submitting}
                disabled={savingDraft || submitting}
                style={{ flex: 1.4 }}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  closeBtn: {
    padding: 6,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  completedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: theme.borderRadius.md,
  },
  completedNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.accentEmerald,
  },
  completedNoticeText: {
    fontSize: 11,
    color: '#A7F3D0',
  },
  notStartedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: theme.borderRadius.md,
  },
  notStartedNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.accentAmber,
  },
  notStartedNoticeText: {
    fontSize: 11,
    color: '#FDE68A',
  },
  defectNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: theme.borderRadius.md,
    marginBottom: 10,
  },
  defectNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  defectNoticeText: {
    fontSize: 11,
    color: '#FDE68A',
    marginTop: 2,
  },
  defectInputBox: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderBottomLeftRadius: theme.borderRadius.md,
    borderBottomRightRadius: theme.borderRadius.md,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  itemsList: {
    gap: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    gap: 12,
  },
  checklistItemPassed: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  checklistItemWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  checkIconBox: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  eqSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  inputSpacing: {
    marginTop: 4,
  },
  footer: {
    padding: 14,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullWidthBtn: {
    width: '100%',
  },
});
