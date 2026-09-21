import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  BatteryCharging,
  Plus,
  Save,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react-native";
import { ScreenContainer } from "../../../../src/components/ui/ScreenContainer";
import { Card } from "../../../../src/components/ui/Card";
import { Badge } from "../../../../src/components/ui/Badge";
import { Button } from "../../../../src/components/ui/Button";
import { Input } from "../../../../src/components/ui/Input";
import { useAuthStore } from "../../../../src/auth/auth.store";
import {
  useFsrDetail,
  useAddBatteryBank,
  useUpdateBatteryBank,
  useDeleteBatteryBank,
  useSaveBatteryReadings,
} from "../../../../src/hooks/useFsr";
import { canEditFSR } from "../../../../src/utils/fsrPermissions";
import { theme } from "../../../../src/theme/theme";
import {
  FsrBatteryBank,
  BatteryReadingItem,
  BatteryBankPayload,
} from "../../../../src/types/fsr.types";

const QUANTITY_PRESETS = [10, 16, 20, 32, 40];

export default function BatteryModuleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const fsrId = id || "";
  const user = useAuthStore((state) => state.user);

  const { data: fsrDetail, isLoading, refetch, error } = useFsrDetail(fsrId);

  const addBankMutation = useAddBatteryBank();
  const updateBankMutation = useUpdateBatteryBank();
  const deleteBankMutation = useDeleteBatteryBank();
  const saveReadingsMutation = useSaveBatteryReadings();

  const [selectedBankIndex, setSelectedBankIndex] = useState(0);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [isEditingBank, setIsEditingBank] = useState(false);

  // Bank Form State
  const [bankForm, setBankForm] = useState<BatteryBankPayload>({
    bankNumber: 1,
    bankDescription: "",
    make: "",
    ah: "",
    quantity: 20,
    frontIndication: "",
    voltage: undefined,
    chargingCurrent: undefined,
    dischargingCurrent: undefined,
    remarks: "",
  });

  // Local Readings State for the active bank
  const [activeReadings, setActiveReadings] = useState<BatteryReadingItem[]>(
    [],
  );
  const [hasUnsavedReadings, setHasUnsavedReadings] = useState(false);

  const batteryBanks = fsrDetail?.batteryBanks || [];
  const activeBank: FsrBatteryBank | undefined =
    batteryBanks[selectedBankIndex];
  const canEdit = canEditFSR(user, fsrDetail?.fsr);

  // Initialize readings when switching bank or loading
  useEffect(() => {
    if (!activeBank) {
      setActiveReadings([]);
      setHasUnsavedReadings(false);
      return;
    }

    const qty = activeBank.quantity || 20;
    const existingMap = new Map<number, any>();
    (activeBank.readings || []).forEach((r) => {
      existingMap.set(r.batteryNumber, r);
    });

    const rows: BatteryReadingItem[] = [];
    for (let i = 1; i <= qty; i++) {
      const existing = existingMap.get(i);
      rows.push({
        batteryNumber: i,
        chargingVoltage:
          existing?.chargingVoltage !== undefined &&
          existing?.chargingVoltage !== null
            ? Number(existing.chargingVoltage)
            : undefined,
        dischargingVoltage:
          existing?.dischargingVoltage !== undefined &&
          existing?.dischargingVoltage !== null
            ? Number(existing.dischargingVoltage)
            : undefined,
        internalResistance:
          existing?.internalResistance !== undefined &&
          existing?.internalResistance !== null
            ? Number(existing.internalResistance)
            : undefined,
        remarks: existing?.remarks || "",
      });
    }

    setActiveReadings(rows);
    setHasUnsavedReadings(false);
  }, [activeBank]);

  // Open Create Bank Modal
  const openCreateBankModal = () => {
    const nextBankNum = (batteryBanks.length || 0) + 1;
    setBankForm({
      bankNumber: nextBankNum,
      bankDescription: `Bank ${nextBankNum}`,
      make: "",
      ah: "",
      quantity: 20,
      frontIndication: "",
      voltage: undefined,
      chargingCurrent: undefined,
      dischargingCurrent: undefined,
      remarks: "",
    });
    setIsEditingBank(false);
    setBankModalVisible(true);
  };

  // Open Edit Bank Modal
  const openEditBankModal = () => {
    if (!activeBank) return;
    setBankForm({
      bankNumber: activeBank.bankNumber,
      bankDescription: activeBank.bankDescription || "",
      make: activeBank.make || "",
      ah: activeBank.ah || "",
      quantity: activeBank.quantity || 20,
      frontIndication: activeBank.frontIndication || "",
      voltage: activeBank.voltage ? Number(activeBank.voltage) : undefined,
      chargingCurrent: activeBank.chargingCurrent
        ? Number(activeBank.chargingCurrent)
        : undefined,
      dischargingCurrent: activeBank.dischargingCurrent
        ? Number(activeBank.dischargingCurrent)
        : undefined,
      remarks: activeBank.remarks || "",
    });
    setIsEditingBank(true);
    setBankModalVisible(true);
  };

  // Handle Bank Save
  const handleSaveBank = async () => {
    const targetQty = Number(bankForm.quantity) || 20;
    if (targetQty < 1 || targetQty > 200) {
      Alert.alert(
        "Invalid Quantity",
        "Battery bank quantity must be between 1 and 200 cells.",
      );
      return;
    }

    try {
      if (isEditingBank && activeBank?.id) {
        // If quantity changed, adjust readings preserving existing items
        await updateBankMutation.mutateAsync({
          id: fsrId,
          bankId: activeBank.id,
          payload: bankForm,
        });
        Alert.alert("Updated", "Battery bank details updated.");
      } else {
        await addBankMutation.mutateAsync({
          id: fsrId,
          payload: {
            ...bankForm,
            quantity: targetQty,
          },
        });
        setSelectedBankIndex(batteryBanks.length);
        Alert.alert("Success", "New battery bank added.");
      }
      setBankModalVisible(false);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save battery bank.");
    }
  };

  // Handle Delete Bank
  const handleDeleteBank = () => {
    if (!activeBank?.id) return;
    Alert.alert(
      "Delete Bank",
      `Are you sure you want to delete Bank #${activeBank.bankNumber}? All ${activeBank.quantity} cell readings will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBankMutation.mutateAsync({
                id: fsrId,
                bankId: activeBank.id!,
              });
              setSelectedBankIndex(0);
              Alert.alert("Deleted", "Battery bank deleted.");
            } catch (err: any) {
              Alert.alert(
                "Error",
                err?.message || "Failed to delete battery bank.",
              );
            }
          },
        },
      ],
    );
  };

  // Update a single cell reading value
  const updateCellReading = (
    batteryNumber: number,
    field: keyof BatteryReadingItem,
    val: string,
  ) => {
    setActiveReadings((prev) =>
      prev.map((item) => {
        if (item.batteryNumber !== batteryNumber) return item;
        return {
          ...item,
          [field]: field === "remarks" ? val : val ? Number(val) : undefined,
        };
      }),
    );
    setHasUnsavedReadings(true);
  };

  // Save All Cell Readings for active bank
  const handleSaveAllReadings = async () => {
    if (!activeBank?.id) return;

    try {
      await saveReadingsMutation.mutateAsync({
        id: fsrId,
        bankId: activeBank.id!,
        readings: activeReadings,
      });
      setHasUnsavedReadings(false);
      Alert.alert(
        "Saved",
        `All ${activeReadings.length} battery cell readings saved successfully.`,
      );
    } catch (err: any) {
      Alert.alert("Save Failed", err?.message || "Failed to save readings.");
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading battery data...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Navigation Header */}
        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.navTitleWrapper}>
            <Text style={styles.navTitle}>Battery Banks & Readings</Text>
            <Text style={styles.navSubtitle}>
              {fsrDetail?.fsr?.fsrNumber || "FSR"}
            </Text>
          </View>
          {canEdit && (
            <TouchableOpacity
              onPress={openCreateBankModal}
              style={styles.addBankHeaderBtn}
            >
              <Plus size={18} color={theme.colors.primaryLight} />
              <Text style={styles.addBankHeaderText}>Bank</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bank Selector Tabs */}
        {batteryBanks.length > 0 && (
          <View style={styles.bankTabsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bankTabsScroll}
            >
              {batteryBanks.map((bank, idx) => {
                const isSelected = idx === selectedBankIndex;
                return (
                  <TouchableOpacity
                    key={bank.id || idx}
                    onPress={() => {
                      if (hasUnsavedReadings) {
                        Alert.alert(
                          "Unsaved Changes",
                          "You have unsaved cell readings on this bank. Save or switch anyway?",
                          [
                            { text: "Stay", style: "cancel" },
                            {
                              text: "Switch",
                              onPress: () => setSelectedBankIndex(idx),
                            },
                          ],
                        );
                      } else {
                        setSelectedBankIndex(idx);
                      }
                    }}
                    style={[
                      styles.bankTabChip,
                      isSelected && styles.bankTabChipActive,
                    ]}
                  >
                    <BatteryCharging
                      size={15}
                      color={
                        isSelected
                          ? theme.colors.textOnPrimary
                          : theme.colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.bankTabText,
                        isSelected && styles.bankTabTextActive,
                      ]}
                    >
                      Bank #{bank.bankNumber} ({bank.quantity} cells)
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Main Content */}
        {batteryBanks.length === 0 ? (
          <View style={styles.emptyState}>
            <BatteryCharging size={54} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No Battery Banks</Text>
            <Text style={styles.emptySubtitle}>
              Create a battery bank to log cell voltages, discharge voltages,
              and internal resistance.
            </Text>
            {canEdit && (
              <Button
                title="Add First Battery Bank"
                variant="primary"
                icon={<Plus size={18} color={theme.colors.textOnPrimary} />}
                onPress={openCreateBankModal}
                style={styles.emptyButton}
              />
            )}
          </View>
        ) : !activeBank ? null : (
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={false}
          >
            {/* Active Bank Overview Card */}
            <Card style={styles.bankOverviewCard}>
              <View style={styles.bankHeaderRow}>
                <View>
                  <Text style={styles.bankHeading}>
                    Bank #{activeBank.bankNumber}{" "}
                    {activeBank.bankDescription
                      ? `(${activeBank.bankDescription})`
                      : ""}
                  </Text>
                  <Text style={styles.bankSpecs}>
                    {activeBank.make || "Standard"} • {activeBank.ah || "—"} Ah
                    • {activeBank.quantity} Cells
                  </Text>
                </View>
                {canEdit && (
                  <View style={styles.bankActionsRow}>
                    <TouchableOpacity
                      onPress={openEditBankModal}
                      style={styles.bankIconBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Edit2 size={16} color={theme.colors.primaryLight} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleDeleteBank}
                      style={styles.bankIconBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={16} color={theme.colors.accentRose} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Extra Bank Fields */}
              <View style={styles.extraSpecsGrid}>
                <View style={styles.extraSpecItem}>
                  <Text style={styles.extraSpecLabel}>Bank Voltage</Text>
                  <Text style={styles.extraSpecVal}>
                    {activeBank.voltage ? `${activeBank.voltage} V` : "—"}
                  </Text>
                </View>
                <View style={styles.extraSpecItem}>
                  <Text style={styles.extraSpecLabel}>Charging Current</Text>
                  <Text style={styles.extraSpecVal}>
                    {activeBank.chargingCurrent
                      ? `${activeBank.chargingCurrent} A`
                      : "—"}
                  </Text>
                </View>
                <View style={styles.extraSpecItem}>
                  <Text style={styles.extraSpecLabel}>Discharging Current</Text>
                  <Text style={styles.extraSpecVal}>
                    {activeBank.dischargingCurrent
                      ? `${activeBank.dischargingCurrent} A`
                      : "—"}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Cell Readings Table Section */}
            <View style={styles.readingsSectionHeader}>
              <Text style={styles.readingsSectionTitle}>
                Cell Readings ({activeReadings.length} cells)
              </Text>
              {canEdit && hasUnsavedReadings && (
                <Badge label="UNSAVED" variant="warning" size="sm" />
              )}
            </View>

            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.thCell, { flex: 0.6 }]}>#</Text>
              <Text style={[styles.thCell, { flex: 1.2 }]}>Chg (V)</Text>
              <Text style={[styles.thCell, { flex: 1.2 }]}>Dis (V)</Text>
              <Text style={[styles.thCell, { flex: 1.2 }]}>IR (mΩ)</Text>
              <Text style={[styles.thCell, { flex: 1.8 }]}>Remarks</Text>
            </View>

            {/* Table Rows */}
            {activeReadings.map((reading) => (
              <View key={reading.batteryNumber} style={styles.tableDataRow}>
                <Text style={[styles.tdNumber, { flex: 0.6 }]}>
                  {reading.batteryNumber}
                </Text>

                <View style={[styles.tdInputWrapper, { flex: 1.2 }]}>
                  <TextInput
                    style={styles.cellTextInput}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={theme.colors.textMuted}
                    editable={canEdit}
                    value={
                      reading.chargingVoltage !== undefined
                        ? String(reading.chargingVoltage)
                        : ""
                    }
                    onChangeText={(val) =>
                      updateCellReading(
                        reading.batteryNumber,
                        "chargingVoltage",
                        val,
                      )
                    }
                  />
                </View>

                <View style={[styles.tdInputWrapper, { flex: 1.2 }]}>
                  <TextInput
                    style={styles.cellTextInput}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={theme.colors.textMuted}
                    editable={canEdit}
                    value={
                      reading.dischargingVoltage !== undefined
                        ? String(reading.dischargingVoltage)
                        : ""
                    }
                    onChangeText={(val) =>
                      updateCellReading(
                        reading.batteryNumber,
                        "dischargingVoltage",
                        val,
                      )
                    }
                  />
                </View>

                <View style={[styles.tdInputWrapper, { flex: 1.2 }]}>
                  <TextInput
                    style={styles.cellTextInput}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={theme.colors.textMuted}
                    editable={canEdit}
                    value={
                      reading.internalResistance !== undefined
                        ? String(reading.internalResistance)
                        : ""
                    }
                    onChangeText={(val) =>
                      updateCellReading(
                        reading.batteryNumber,
                        "internalResistance",
                        val,
                      )
                    }
                  />
                </View>

                <View style={[styles.tdInputWrapper, { flex: 1.8 }]}>
                  <TextInput
                    style={styles.cellTextInput}
                    placeholder="Notes..."
                    placeholderTextColor={theme.colors.textMuted}
                    editable={canEdit}
                    value={reading.remarks || ""}
                    onChangeText={(val) =>
                      updateCellReading(reading.batteryNumber, "remarks", val)
                    }
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Floating Save Readings Button */}
        {canEdit && activeBank && (
          <View style={styles.floatingBottomBar}>
            <Button
              title={
                hasUnsavedReadings
                  ? `Save All ${activeReadings.length} Cell Readings`
                  : "All Readings Saved"
              }
              variant={hasUnsavedReadings ? "primary" : "secondary"}
              loading={saveReadingsMutation.isPending}
              icon={
                <Save
                  size={18}
                  color={
                    hasUnsavedReadings
                      ? theme.colors.textOnPrimary
                      : theme.colors.accentEmerald
                  }
                />
              }
              onPress={handleSaveAllReadings}
              style={{ width: "100%" }}
            />
          </View>
        )}

        {/* Bank Config Modal */}
        <Modal
          visible={bankModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setBankModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {isEditingBank
                  ? `Edit Bank #${bankForm.bankNumber}`
                  : "Add Battery Bank"}
              </Text>

              <ScrollView style={styles.modalScroll}>
                <Input
                  label="Bank Number"
                  keyboardType="numeric"
                  value={String(bankForm.bankNumber || 1)}
                  onChangeText={(val) =>
                    setBankForm((prev) => ({
                      ...prev,
                      bankNumber: Number(val) || 1,
                    }))
                  }
                />
                <Input
                  label="Description"
                  placeholder="e.g. Ground Floor UPS Bank"
                  value={bankForm.bankDescription || ""}
                  onChangeText={(val) =>
                    setBankForm((prev) => ({ ...prev, bankDescription: val }))
                  }
                />
                <Input
                  label="Battery Make"
                  placeholder="e.g. Exide, Amaron, Quanta"
                  value={bankForm.make || ""}
                  onChangeText={(val) =>
                    setBankForm((prev) => ({ ...prev, make: val }))
                  }
                />
                <Input
                  label="Ah Rating"
                  placeholder="e.g. 100Ah, 120Ah"
                  value={bankForm.ah || ""}
                  onChangeText={(val) =>
                    setBankForm((prev) => ({ ...prev, ah: val }))
                  }
                />

                {/* Preset Quantity Buttons */}
                <Text style={styles.presetLabel}>Cell Quantity (Dynamic)</Text>
                <View style={styles.presetRow}>
                  {QUANTITY_PRESETS.map((preset) => {
                    const isSelected = bankForm.quantity === preset;
                    return (
                      <TouchableOpacity
                        key={preset}
                        onPress={() =>
                          setBankForm((prev) => ({ ...prev, quantity: preset }))
                        }
                        style={[
                          styles.presetChip,
                          isSelected && styles.presetChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            isSelected && styles.presetChipTextActive,
                          ]}
                        >
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Input
                  label="Custom Quantity"
                  keyboardType="numeric"
                  value={String(bankForm.quantity || 20)}
                  onChangeText={(val) =>
                    setBankForm((prev) => ({
                      ...prev,
                      quantity: Number(val) || 1,
                    }))
                  }
                />
                <Input
                  label="Overall Bank Voltage (V)"
                  keyboardType="numeric"
                  value={
                    bankForm.voltage !== undefined
                      ? String(bankForm.voltage)
                      : ""
                  }
                  onChangeText={(val) =>
                    setBankForm((prev) => ({
                      ...prev,
                      voltage: val ? Number(val) : undefined,
                    }))
                  }
                />
                <Input
                  label="Charging Current (A)"
                  keyboardType="numeric"
                  value={
                    bankForm.chargingCurrent !== undefined
                      ? String(bankForm.chargingCurrent)
                      : ""
                  }
                  onChangeText={(val) =>
                    setBankForm((prev) => ({
                      ...prev,
                      chargingCurrent: val ? Number(val) : undefined,
                    }))
                  }
                />
                <Input
                  label="Discharging Current (A)"
                  keyboardType="numeric"
                  value={
                    bankForm.dischargingCurrent !== undefined
                      ? String(bankForm.dischargingCurrent)
                      : ""
                  }
                  onChangeText={(val) =>
                    setBankForm((prev) => ({
                      ...prev,
                      dischargingCurrent: val ? Number(val) : undefined,
                    }))
                  }
                />
                <Input
                  label="Remarks"
                  placeholder="General remarks about this bank..."
                  value={bankForm.remarks || ""}
                  onChangeText={(val) =>
                    setBankForm((prev) => ({ ...prev, remarks: val }))
                  }
                />
              </ScrollView>

              <View style={styles.modalActionRow}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={() => setBankModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title={isEditingBank ? "Save Bank" : "Create Bank"}
                  variant="primary"
                  loading={
                    addBankMutation.isPending || updateBankMutation.isPending
                  }
                  onPress={handleSaveBank}
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
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  navTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  navSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  addBankHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primarySoft,
  },
  addBankHeaderText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primaryLight,
  },
  bankTabsContainer: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  bankTabsScroll: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  bankTabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bankTabChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  bankTabText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  bankTabTextActive: {
    color: theme.colors.textOnPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
    marginBottom: theme.spacing.lg,
  },
  emptyButton: {
    minWidth: 180,
  },
  contentScroll: {
    flex: 1,
  },
  contentInner: {
    padding: theme.spacing.md,
    paddingBottom: 110,
  },
  bankOverviewCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  bankHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bankHeading: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  bankSpecs: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  bankActionsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  bankIconBtn: {
    padding: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  extraSpecsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  extraSpecItem: {
    alignItems: "center",
  },
  extraSpecLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
  },
  extraSpecVal: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  readingsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  readingsSectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primaryLight,
    textTransform: "uppercase",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceElevated,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 4,
  },
  thCell: {
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    textAlign: "center",
  },
  tableDataRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tdNumber: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primaryLight,
    textAlign: "center",
  },
  tdInputWrapper: {
    paddingHorizontal: 2,
  },
  cellTextInput: {
    backgroundColor: theme.colors.surfaceElevated,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.xs,
    textAlign: "center",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  floatingBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: "85%",
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
  presetLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  presetRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  presetChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  presetChipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  presetChipTextActive: {
    color: theme.colors.textOnPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
});
