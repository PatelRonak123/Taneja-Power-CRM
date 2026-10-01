import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  Cpu,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  X,
  User,
  Shield,
  Phone,
  FileText,
  ChevronDown,
  Sparkles,
  CreditCard,
} from 'lucide-react-native';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { Card } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';
import { Badge } from '../../../src/components/ui/Badge';
import { Input } from '../../../src/components/ui/Input';
import { useAuthStore } from '../../../src/auth/auth.store';
import { useCustomerList, useCustomerDestinations, useCustomerDetails } from '../../../src/hooks/useCustomer';
import { useProductsList, ProductItem } from '../../../src/hooks/useProducts';
import { useCreateFsr } from '../../../src/hooks/useFsr';
import { canCreateFSR } from '../../../src/utils/fsrPermissions';
import { theme } from '../../../src/theme/theme';
import {
  FsrCallType,
  FsrWarrantyStatus,
  FsrBillingStatus,
  CreateFsrPayload,
} from '../../../src/types/fsr.types';
import { Customer, CustomerDestination } from '../../../src/types/customer.types';

const CALL_TYPES: { label: string; value: FsrCallType; desc: string }[] = [
  { label: 'Breakdown (BD)', value: 'BD', desc: 'Emergency failure or trip' },
  { label: 'Preventive (PM)', value: 'PM', desc: 'Scheduled maintenance check' },
  { label: 'Installation', value: 'INSTALLATION', desc: 'Commissioning new unit' },
  { label: 'Courtesy Visit', value: 'COURTESY', desc: 'Inspection or follow-up' },
];

const WARRANTY_OPTIONS: { label: string; value: FsrWarrantyStatus }[] = [
  { label: 'Under Warranty', value: 'UNDER_WARRANTY' },
  { label: 'Out of Warranty', value: 'OUT_OF_WARRANTY' },
  { label: 'AMC Active', value: 'AMC' },
  { label: 'Billable', value: 'BILLABLE' },
];

const BILLING_OPTIONS: { label: string; value: FsrBillingStatus }[] = [
  { label: 'Free Service', value: 'FREE_SERVICE' },
  { label: 'Under Warranty', value: 'WARRANTY' },
  { label: 'Chargeable', value: 'BILLABLE' },
  { label: 'AMC Covered', value: 'AMC' },
];

const EQUIPMENT_STATUSES = [
  { label: 'Operational', value: 'WORKING' },
  { label: 'Breakdown / Off', value: 'NOT_WORKING' },
  { label: 'Degraded', value: 'DEGRADED' },
  { label: 'Standby Unit', value: 'STANDBY' },
];

export default function CreateFsrScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    customerId?: string;
    destinationId?: string;
    taskId?: string;
  }>();
  const user = useAuthStore((state) => state.user);
  const hasCreateAccess = canCreateFSR(user);

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<CustomerDestination | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  const [callType, setCallType] = useState<FsrCallType>('BD');
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [productModel, setProductModel] = useState('');
  const [productMake, setProductMake] = useState('TANEJA POWER');
  const [productSerialNumber, setProductSerialNumber] = useState('');
  const [equipmentStatus, setEquipmentStatus] = useState('NOT_WORKING');
  const [problemReported, setProblemReported] = useState('');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [customerContactName, setCustomerContactName] = useState('');
  const [warrantyStatus, setWarrantyStatus] = useState<FsrWarrantyStatus>('UNDER_WARRANTY');
  const [billingStatus, setBillingStatus] = useState<FsrBillingStatus>('FREE_SERVICE');

  // Standby Equipment, Charges & Feedback State
  const [standbyDetails, setStandbyDetails] = useState('');
  const [charges, setCharges] = useState('');
  const [chargesRemarks, setChargesRemarks] = useState('');
  const [fseFeedback, setFseFeedback] = useState('');
  const [customerFeedback, setCustomerFeedback] = useState('');

  // Customer Modal & Query
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const { data: customerList, isLoading: customersLoading, error: customerListError } = useCustomerList(customerSearch);

  // Optional direct customer fetch when navigated from task with customerId
  const { data: routeCustomer, isLoading: routeCustomerLoading } = useCustomerDetails(
    params.customerId || ''
  );

  // Destination Query
  const { data: destinationsList, isLoading: destinationsLoading } = useCustomerDestinations(
    selectedCustomer?.id
  );
  const [isDestinationModalOpen, setIsDestinationModalOpen] = useState(false);

  // Product Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const { data: productsList, isLoading: productsLoading } = useProductsList(productSearch);

  // Mutation
  const createMutation = useCreateFsr();

  // Auto-populate customer & destination if passed in route params (e.g. from Task screen)
  React.useEffect(() => {
    if (routeCustomer && !selectedCustomer) {
      setSelectedCustomer(routeCustomer);
      setCustomerContactName(routeCustomer.contactPerson || routeCustomer.name || '');
      if (params.destinationId && routeCustomer.destinations?.length) {
        const matched = routeCustomer.destinations.find((d) => d.id === params.destinationId);
        if (matched) {
          setSelectedDestination(matched);
        }
      }
    }
  }, [routeCustomer, params.destinationId]);

  React.useEffect(() => {
    if (params.destinationId && destinationsList?.length && !selectedDestination) {
      const matched = destinationsList.find((d) => d.id === params.destinationId);
      if (matched) {
        setSelectedDestination(matched);
      }
    }
  }, [params.destinationId, destinationsList]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    const list = customerList || [];
    if (!customerSearch.trim()) return list;
    const query = customerSearch.toLowerCase();
    return list.filter(
      (c) =>
        (c.companyName && c.companyName.toLowerCase().includes(query)) ||
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.phone && c.phone.includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query))
    );
  }, [customerList, customerSearch]);

  // Handle Customer Selection
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedDestination(null);
    setCustomerContactName(customer.contactPerson || customer.name || '');
    setIsCustomerModalOpen(false);
  };

  // Handle Product Selection
  const handleSelectProduct = (product: ProductItem) => {
    setSelectedProduct(product);
    setProductModel(product.name);
    setProductSerialNumber(product.sku || '');
    setIsProductModalOpen(false);
  };

  // Quick date helper
  const setQuickDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setVisitDate(d.toISOString().split('T')[0]);
  };

  // Submit Handler
  const handleCreate = async () => {
    if (!selectedCustomer) {
      Alert.alert('Missing Customer', 'Please select a customer for this service visit.');
      return;
    }
    if (!visitDate) {
      Alert.alert('Missing Date', 'Please enter a valid visit date.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Authentication Error', 'User session not found.');
      return;
    }

    let numericCharges: number | undefined = undefined;
    if (charges.trim()) {
      const parsed = Number(charges.trim());
      if (isNaN(parsed) || parsed < 0) {
        Alert.alert('Invalid Charges', 'Service charges must be a valid non-negative number.');
        return;
      }
      numericCharges = parsed;
    }

    const payload: CreateFsrPayload = {
      customerId: selectedCustomer.id,
      destinationId: selectedDestination?.id || null,
      productId: selectedProduct?.id || null,
      serviceEngineerId: user.id,
      visitDate: new Date(visitDate).toISOString(),
      callType,
      status: 'IN_PROGRESS',
      warrantyStatus,
      billingStatus,
      productModel: productModel.trim() || selectedProduct?.name || 'UPS System',
      productMake: productMake.trim() || 'TANEJA POWER',
      productSerialNumber: productSerialNumber.trim() || null,
      equipmentStatus,
      problemReported: problemReported.trim() || null,
      reasonForVisit: reasonForVisit.trim() || problemReported.trim() || null,
      customerContactName: customerContactName.trim() || null,
      standbyDetails: standbyDetails.trim() || null,
      charges: numericCharges ?? 0,
      chargesRemarks: chargesRemarks.trim() || null,
      fseFeedback: fseFeedback.trim() || null,
      customerFeedback: customerFeedback.trim() || null,
    };

    try {
      const res = await createMutation.mutateAsync(payload);
      Alert.alert(
        'Report Created',
        `Field Service Report ${res.fsr?.fsrNumber || ''} has been created successfully.`,
        [
          {
            text: 'Open Report',
            onPress: () => {
              if (res.fsr?.id) {
                router.replace({
                  pathname: '/(app)/field-service/[id]' as any,
                  params: { id: res.fsr.id },
                });
              } else {
                router.replace('/(app)/(tabs)/field-service');
              }
            },
          },
        ]
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create Field Service Report.';
      Alert.alert('Creation Error', msg);
    }
  };

  if (!hasCreateAccess) {
    return (
      <ScreenContainer>
        <View style={styles.restrictedBox}>
          <AlertTriangle size={48} color={theme.colors.accentRose} />
          <Text style={styles.restrictedTitle}>Access Restricted</Text>
          <Text style={styles.restrictedText}>
            Only Field Service Engineers and Service Managers can initiate Field Service Reports.
          </Text>
          <Button title="Back" variant="primary" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>New Service Report</Text>
            <Text style={styles.headerSubtitle}>Field Service & Maintenance (FSR)</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Engineer Assignment Banner */}
          <Card style={styles.engineerBanner}>
            <View style={styles.engineerIconBox}>
              <User size={18} color={theme.colors.primaryLight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.engineerLabel}>Assigned Service Engineer</Text>
              <Text style={styles.engineerName}>{user?.fullName || 'Field Engineer'}</Text>
            </View>
            <Badge label="Active FSE" variant="success" size="sm" />
          </Card>

          {/* Section: Customer Selection */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Building2 size={18} color={theme.colors.primaryLight} />
              <Text style={styles.sectionTitle}>Customer Details *</Text>
            </View>

            {Boolean(params.taskId) && (
              <View style={styles.linkedTaskBanner}>
                <Sparkles size={14} color={theme.colors.accentEmerald} />
                <Text style={styles.linkedTaskBannerText}>Pre-filled from assigned work order</Text>
              </View>
            )}

            {selectedCustomer ? (
              <View style={styles.selectedEntityBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedEntityTitle}>
                    {selectedCustomer.companyName || selectedCustomer.name}
                  </Text>
                  {Boolean(selectedCustomer.address) && (
                    <Text style={styles.selectedEntitySub} numberOfLines={1}>
                      {selectedCustomer.address}
                    </Text>
                  )}
                  {Boolean(selectedCustomer.phone) && (
                    <Text style={styles.selectedEntitySub}>
                      Phone: {selectedCustomer.phone}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.changeBtn}
                  onPress={() => setIsCustomerModalOpen(true)}
                >
                  <Text style={styles.changeBtnText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.selectTrigger}
                onPress={() => setIsCustomerModalOpen(true)}
                activeOpacity={0.7}
              >
                <Search size={18} color={theme.colors.textMuted} />
                <Text style={styles.selectTriggerText}>Select or Search Customer...</Text>
                <ChevronDown size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}

            {/* Destination / Site Address */}
            {selectedCustomer && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Site / Delivery Destination</Text>
                {destinationsLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.primaryLight} />
                ) : (destinationsList || []).length > 0 ? (
                  <TouchableOpacity
                    style={styles.selectTrigger}
                    onPress={() => setIsDestinationModalOpen(true)}
                    activeOpacity={0.7}
                  >
                    <MapPin size={16} color={theme.colors.primaryLight} />
                    <Text
                      style={[
                        styles.selectTriggerText,
                        selectedDestination && { color: theme.colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {selectedDestination
                        ? `${selectedDestination.name} (${selectedDestination.city || ''})`
                        : 'Select Site Location...'}
                    </Text>
                    <ChevronDown size={16} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.hintText}>No specific sites registered. Using head address.</Text>
                )}
              </View>
            )}

            {/* Contact Person Name */}
            <View style={{ marginTop: 12 }}>
              <Text style={styles.inputLabel}>Customer Contact Person</Text>
              <Input
                placeholder="e.g. Ramesh Patel / Facility Manager"
                value={customerContactName}
                onChangeText={setCustomerContactName}
              />
            </View>
          </Card>

          {/* Section: Call Type & Scheduled Date */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Wrench size={18} color={theme.colors.primaryLight} />
              <Text style={styles.sectionTitle}>Service Call Type *</Text>
            </View>

            <View style={styles.pillsGrid}>
              {CALL_TYPES.map((type) => {
                const isSelected = callType === type.value;
                return (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.pillCard, isSelected && styles.pillCardActive]}
                    onPress={() => setCallType(type.value)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.pillCardHeader}>
                      <Text
                        style={[
                          styles.pillCardTitle,
                          isSelected && styles.pillCardTitleActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                      {isSelected && <CheckCircle2 size={16} color={theme.colors.primaryLight} />}
                    </View>
                    <Text
                      style={[
                        styles.pillCardDesc,
                        isSelected && styles.pillCardDescActive,
                      ]}
                    >
                      {type.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Visit Date */}
            <View style={{ marginTop: 16 }}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Visit Date (YYYY-MM-DD) *</Text>
                <View style={styles.quickDateRow}>
                  <TouchableOpacity
                    style={styles.quickDateBtn}
                    onPress={() => setQuickDate(0)}
                  >
                    <Text style={styles.quickDateText}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickDateBtn}
                    onPress={() => setQuickDate(1)}
                  >
                    <Text style={styles.quickDateText}>Tomorrow</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Input
                placeholder="YYYY-MM-DD"
                value={visitDate}
                onChangeText={setVisitDate}
                keyboardType="numeric"
              />
            </View>
          </Card>

          {/* Section: Equipment / UPS Specifications */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Cpu size={18} color={theme.colors.primaryLight} />
              <Text style={styles.sectionTitle}>Equipment / UPS Details</Text>
            </View>

            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Product / Model</Text>
              <TouchableOpacity
                onPress={() => setIsProductModalOpen(true)}
                style={styles.browseProductsLink}
              >
                <Sparkles size={13} color={theme.colors.primaryLight} />
                <Text style={styles.browseProductsText}>Browse Catalog</Text>
              </TouchableOpacity>
            </View>
            <Input
              placeholder="e.g. 20 KVA 3-Phase Online UPS"
              value={productModel}
              onChangeText={setProductModel}
            />

            <View style={{ marginTop: 12 }}>
              <Text style={styles.inputLabel}>Manufacturer / Make</Text>
              <Input
                placeholder="e.g. TANEJA POWER / Cummins"
                value={productMake}
                onChangeText={setProductMake}
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.inputLabel}>Product Serial Number</Text>
              <Input
                placeholder="e.g. TP-UPS-2026-9921"
                value={productSerialNumber}
                onChangeText={setProductSerialNumber}
                autoCapitalize="characters"
              />
            </View>

            {/* Equipment Status */}
            <View style={{ marginTop: 12 }}>
              <Text style={styles.inputLabel}>Current Equipment State</Text>
              <View style={styles.inlinePillsRow}>
                {EQUIPMENT_STATUSES.map((st) => {
                  const isSelected = equipmentStatus === st.value;
                  return (
                    <TouchableOpacity
                      key={st.value}
                      style={[
                        styles.statusPill,
                        isSelected && styles.statusPillActive,
                      ]}
                      onPress={() => setEquipmentStatus(st.value)}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isSelected && styles.statusPillTextActive,
                        ]}
                      >
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Card>

          {/* Section: Complaint & Reason */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <FileText size={18} color={theme.colors.primaryLight} />
              <Text style={styles.sectionTitle}>Observation & Problem Reported</Text>
            </View>

            <Text style={styles.inputLabel}>Customer Complaint / Problem</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe the complaint reported by customer (e.g. UPS tripping on inverter, battery backup short, beep alarm)..."
              placeholderTextColor={theme.colors.textMuted}
              value={problemReported}
              onChangeText={setProblemReported}
              multiline
              numberOfLines={3}
            />

            <View style={{ marginTop: 12 }}>
              <Text style={styles.inputLabel}>Reason / Objective of Visit</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Specific inspection or service planned (e.g. Emergency breakdown response, quarter PM visit)..."
                placeholderTextColor={theme.colors.textMuted}
                value={reasonForVisit}
                onChangeText={setReasonForVisit}
                multiline
                numberOfLines={2}
              />
            </View>
          </Card>

          {/* Section: Warranty & Billing */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Shield size={18} color={theme.colors.primaryLight} />
              <Text style={styles.sectionTitle}>Warranty & Commercial Status</Text>
            </View>

            <Text style={styles.inputLabel}>Warranty Status</Text>
            <View style={styles.inlinePillsRow}>
              {WARRANTY_OPTIONS.map((w) => {
                const isSelected = warrantyStatus === w.value;
                return (
                  <TouchableOpacity
                    key={w.value}
                    style={[styles.statusPill, isSelected && styles.statusPillActive]}
                    onPress={() => setWarrantyStatus(w.value)}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isSelected && styles.statusPillTextActive,
                      ]}
                    >
                      {w.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.inputLabel}>Billing Category</Text>
              <View style={styles.inlinePillsRow}>
                {BILLING_OPTIONS.map((b) => {
                  const isSelected = billingStatus === b.value;
                  return (
                    <TouchableOpacity
                      key={b.value}
                      style={[styles.statusPill, isSelected && styles.statusPillActive]}
                      onPress={() => setBillingStatus(b.value)}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isSelected && styles.statusPillTextActive,
                        ]}
                      >
                        {b.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Card>

          {/* Section: Standby Equipment, Charges & Feedback */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <CreditCard size={18} color={theme.colors.primaryLight} />
              <Text style={styles.sectionTitle}>Standby, Charges & Feedback</Text>
            </View>

            <View>
              <Text style={styles.inputLabel}>Standby Equipment</Text>
              <Input
                placeholder="e.g. 10kVA Standby UPS provided / None"
                value={standbyDetails}
                onChangeText={setStandbyDetails}
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.inputLabel}>Service Charges (₹)</Text>
              <Input
                placeholder="0"
                keyboardType="numeric"
                value={charges}
                onChangeText={setCharges}
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.inputLabel}>Charges Remarks</Text>
              <Input
                placeholder="e.g. Free warranty service, billable travel"
                value={chargesRemarks}
                onChangeText={setChargesRemarks}
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.inputLabel}>Engineer Recommendations & Feedback (FSE)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Technical diagnosis, recommendations or action summary..."
                placeholderTextColor={theme.colors.textMuted}
                value={fseFeedback}
                onChangeText={setFseFeedback}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.inputLabel}>Customer Feedback</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Customer comments, suggestions or feedback..."
                placeholderTextColor={theme.colors.textMuted}
                value={customerFeedback}
                onChangeText={setCustomerFeedback}
                multiline
                numberOfLines={2}
              />
            </View>
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionBox}>
            <Button
              title="Create & Start Service Report"
              variant="primary"
              size="lg"
              loading={createMutation.isPending}
              onPress={handleCreate}
            />
            <Button
              title="Cancel"
              variant="outline"
              size="md"
              onPress={() => router.back()}
              style={{ marginTop: 10 }}
            />
          </View>
        </ScrollView>

        {/* Customer Select Modal */}
        <Modal
          visible={isCustomerModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsCustomerModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Select Customer</Text>
                  <Text style={styles.modalSubtitle}>Pick customer for this service report</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsCustomerModalOpen(false)}
                  style={styles.modalCloseBtn}
                >
                  <X size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.modalSearchBox}>
                <Search size={16} color={theme.colors.textMuted} />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search by company, name, phone..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  autoCapitalize="none"
                />
              </View>

              {customersLoading ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="small" color={theme.colors.primaryLight} />
                  <Text style={styles.modalLoadingText}>Loading customers...</Text>
                </View>
              ) : customerListError ? (
                <View style={styles.modalEmpty}>
                  <Text style={[styles.modalEmptyText, { color: theme.colors.error }]}>
                    Failed to load customers. Please check permissions or network.
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.modalList}>
                  {filteredCustomers.map((cust) => (
                    <TouchableOpacity
                      key={cust.id}
                      style={styles.modalListItem}
                      onPress={() => handleSelectCustomer(cust)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.customerAvatar}>
                        <Building2 size={18} color={theme.colors.primaryLight} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalItemTitle}>
                          {cust.companyName || cust.name}
                        </Text>
                        {Boolean(cust.companyName) && Boolean(cust.name) && cust.companyName !== cust.name && (
                          <Text style={styles.modalItemSub}>
                            Customer: {cust.name}
                          </Text>
                        )}
                        {Boolean(cust.contactPerson) && (
                          <Text style={styles.modalItemSub}>
                            Contact: {cust.contactPerson}
                          </Text>
                        )}
                        {Boolean(cust.phone) && (
                          <Text style={styles.modalItemSub}>
                            Phone: {cust.phone}
                          </Text>
                        )}
                        {Boolean(cust.city || cust.address) && (
                          <Text style={styles.modalItemSub} numberOfLines={1}>
                            {cust.city ? `${cust.city}${cust.state ? `, ${cust.state}` : ''}` : cust.address}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <View style={styles.modalEmpty}>
                      <Text style={styles.modalEmptyText}>No matching customers found</Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Destination Select Modal */}
        <Modal
          visible={isDestinationModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsDestinationModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Select Site Destination</Text>
                  <Text style={styles.modalSubtitle}>Customer branches and locations</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsDestinationModalOpen(false)}
                  style={styles.modalCloseBtn}
                >
                  <X size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalList}>
                {(destinationsList || []).map((dest) => (
                  <TouchableOpacity
                    key={dest.id}
                    style={styles.modalListItem}
                    onPress={() => {
                      setSelectedDestination(dest);
                      setIsDestinationModalOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.customerAvatar}>
                      <MapPin size={18} color={theme.colors.accentEmerald} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalItemTitle}>{dest.name}</Text>
                      {Boolean(dest.city) && (
                        <Text style={styles.modalItemSub}>City: {dest.city}</Text>
                      )}
                      {Boolean(dest.address) && (
                        <Text style={styles.modalItemSub} numberOfLines={1}>
                          {dest.address}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Product Catalog Modal */}
        <Modal
          visible={isProductModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsProductModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Product Catalog</Text>
                  <Text style={styles.modalSubtitle}>Select equipment or UPS unit</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsProductModalOpen(false)}
                  style={styles.modalCloseBtn}
                >
                  <X size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalSearchBox}>
                <Search size={16} color={theme.colors.textMuted} />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search product model or SKU..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={productSearch}
                  onChangeText={setProductSearch}
                  autoCapitalize="none"
                />
              </View>

              {productsLoading ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="small" color={theme.colors.primaryLight} />
                  <Text style={styles.modalLoadingText}>Loading catalog...</Text>
                </View>
              ) : (
                <ScrollView style={styles.modalList}>
                  {(productsList || []).map((prod) => (
                    <TouchableOpacity
                      key={prod.id}
                      style={styles.modalListItem}
                      onPress={() => handleSelectProduct(prod)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.customerAvatar}>
                        <Cpu size={18} color={theme.colors.accentAmber} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalItemTitle}>{prod.name}</Text>
                        <Text style={styles.modalItemSub}>SKU: {prod.sku}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  engineerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  engineerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  engineerLabel: {
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  engineerName: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: '#FFFFFF',
    marginTop: 1,
  },
  sectionCard: {
    padding: 14,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  selectTriggerText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  selectedEntityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  selectedEntityTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  selectedEntitySub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  changeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  changeBtnText: {
    fontSize: 11,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primaryLight,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  hintText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  pillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillCard: {
    width: '48%',
    padding: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  pillCardActive: {
    borderColor: theme.colors.primaryLight,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  pillCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillCardTitle: {
    fontSize: 12,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  pillCardTitleActive: {
    color: theme.colors.primaryLight,
  },
  pillCardDesc: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  pillCardDescActive: {
    color: theme.colors.textSecondary,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickDateBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickDateText: {
    fontSize: 10,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primaryLight,
  },
  browseProductsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  browseProductsText: {
    fontSize: 11,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primaryLight,
  },
  inlinePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusPillActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryLight,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  statusPillTextActive: {
    color: '#FFFFFF',
    fontWeight: theme.fontWeight.bold,
  },
  textArea: {
    minHeight: 70,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.sm,
    textAlignVertical: 'top',
  },
  actionBox: {
    marginTop: 8,
    marginBottom: 20,
  },
  restrictedBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  restrictedTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  restrictedText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceElevated,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  modalList: {
    maxHeight: 360,
    paddingHorizontal: 12,
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  customerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  modalItemSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  modalLoading: {
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  modalLoadingText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  modalEmpty: {
    padding: 24,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  linkedTaskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${theme.colors.accentEmerald}15`,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: `${theme.colors.accentEmerald}30`,
  },
  linkedTaskBannerText: {
    fontSize: 12,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.accentEmerald,
  },
});
