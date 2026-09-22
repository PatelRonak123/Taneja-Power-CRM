import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  Calendar,
  ChevronRight,
  Wrench,
  X,
  AlertCircle,
  ShieldAlert,
  Cpu,
  UserCheck,
  MapPin,
  SlidersHorizontal,
  RotateCcw,
  Check,
} from 'lucide-react-native';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { useAuthStore } from '../../../src/auth/auth.store';
import {
  canAccessFSR,
  isAdminOrManager,
  isFSE,
  isSalesperson,
} from '../../../src/utils/fsrPermissions';
import { useInfiniteFsrList } from '../../../src/hooks/useFsr';
import { theme } from '../../../src/theme/theme';
import { formatDate } from '../../../src/utils/date';
import { FsrListItem, FsrStatus, FsrCallType } from '../../../src/types/fsr.types';

// Status Filter Options
const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Reports', value: 'ALL' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Closed', value: 'CLOSED' },
];

// Call Type Filter Options (using backend canonical enum values)
const CALL_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Types', value: 'ALL' },
  { label: 'Breakdown (BD)', value: 'BREAKDOWN' },
  { label: 'Preventive Maint. (PM)', value: 'PREVENTIVE_MAINTENANCE' },
  { label: 'Installation', value: 'INSTALLATION' },
  { label: 'Courtesy / Other', value: 'OTHER' },
];

export default function FieldServiceScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hasAccess = canAccessFSR(user);
  const isAdminManager = isAdminOrManager(user);
  const isEngineer = isFSE(user);
  const isSales = isSalesperson(user);

  // Scope: 'MY_VISITS' vs 'ALL_VISITS'
  const [activeScope, setActiveScope] = useState<'MY_VISITS' | 'ALL_VISITS'>(
    isSales ? 'ALL_VISITS' : 'MY_VISITS'
  );

  // Search state with debouncing
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filter state
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCallType, setSelectedCallType] = useState<string>('ALL');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  // Temp filter states for modal
  const [modalStatus, setModalStatus] = useState<string>('ALL');
  const [modalCallType, setModalCallType] = useState<string>('ALL');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Determine engineer ID filter based on role and scope
  const targetEngineerId = useMemo(() => {
    // FSE / Technician ALWAYS scopes to their own assigned visits
    if (isEngineer && !isAdminManager) {
      return user?.id;
    }
    // Admin / Manager in 'MY_VISITS' scopes to their own visits
    if (activeScope === 'MY_VISITS' && user?.id) {
      return user.id;
    }
    // Admin / Manager 'ALL_VISITS' or Sales: do NOT send assignedEngineerId
    return undefined;
  }, [activeScope, isEngineer, isAdminManager, user?.id]);

  // Infinite query for paginated FSR list
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
    error,
  } = useInfiniteFsrList({
    status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
    search: debouncedSearch || undefined,
    callType: selectedCallType !== 'ALL' ? selectedCallType : undefined,
    assignedEngineerId: targetEngineerId,
    limit: 10,
  });

  // Flattened reports from all pages
  const reports = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.reports);
  }, [data]);

  const totalReports = data?.pages?.[0]?.total ?? 0;

  // Variant helpers
  const getStatusVariant = (status: FsrStatus | string): 'primary' | 'success' | 'warning' | 'error' | 'neutral' => {
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

  const getCallTypeVariant = (callType: FsrCallType | string): 'primary' | 'success' | 'warning' | 'error' | 'neutral' => {
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
      case 'OTHER':
      case 'SITE_SURVEY':
      case 'BATTERY_REPLACEMENT':
      default:
        return 'neutral';
    }
  };

  const formatCallTypeLabel = (callType: string) => {
    switch (callType) {
      case 'BD':
      case 'BREAKDOWN':
        return 'Breakdown';
      case 'PM':
      case 'PREVENTIVE_MAINTENANCE':
        return 'Preventive Maint.';
      case 'INSTALLATION':
        return 'Installation';
      case 'COURTESY':
      case 'OTHER':
      case 'SITE_SURVEY':
      case 'BATTERY_REPLACEMENT':
        return 'Courtesy Visit';
      default:
        return callType;
    }
  };

  // Open filter modal
  const handleOpenFilterModal = () => {
    setModalStatus(selectedStatus);
    setModalCallType(selectedCallType);
    setIsFilterModalVisible(true);
  };

  // Apply filters from modal
  const handleApplyFilters = () => {
    setSelectedStatus(modalStatus);
    setSelectedCallType(modalCallType);
    setIsFilterModalVisible(false);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedStatus('ALL');
    setSelectedCallType('ALL');
    setModalStatus('ALL');
    setModalCallType('ALL');
    setIsFilterModalVisible(false);
  };

  // Check if any filter is active
  const hasActiveFilters = selectedStatus !== 'ALL' || selectedCallType !== 'ALL';

  // Load more items
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Unauthorized state
  if (!hasAccess) {
    return (
      <ScreenContainer>
        <View style={styles.restrictedContainer}>
          <View style={styles.restrictedIconWrapper}>
            <ShieldAlert size={48} color={theme.colors.accentRose} />
          </View>
          <Text style={styles.restrictedTitle}>Access Restricted</Text>
          <Text style={styles.restrictedSubtitle}>
            Field Service Reports and maintenance workflows are restricted to Field Service Engineers, Technicians, and Service Managers.
          </Text>
          <Button
            title="Go to Home"
            variant="primary"
            onPress={() => router.replace('/(app)/(tabs)')}
            style={styles.restrictedButton}
          />
        </View>
      </ScreenContainer>
    );
  }

  // Render individual FSR summary card
  const renderFsrCard = ({ item }: { item: FsrListItem }) => {
    const customerName =
      item.customer?.companyName || item.customer?.name || item.fsr.customerName || 'Unknown Customer';
    const siteAddress =
      item.destination?.city
        ? `${item.destination.name} (${item.destination.city})`
        : item.destination?.name || item.fsr.customerAddress;
    const productName = item.fsr.productModel || item.product?.name;
    const serialNumber = item.fsr.productSerialNumber;
    const problem = item.fsr.problemReported || item.fsr.reasonForVisit;

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() =>
          router.push({
            pathname: '/(app)/field-service/[id]' as any,
            params: { id: item.fsr.id },
          })
        }
        style={styles.cardWrapper}
      >
        <Card style={styles.reportCard}>
          {/* Header Badges & FSR# */}
          <View style={styles.cardHeader}>
            <View style={styles.badgesRow}>
              <Badge
                label={formatCallTypeLabel(item.fsr.callType)}
                variant={getCallTypeVariant(item.fsr.callType)}
                size="sm"
              />
              <Badge
                label={item.fsr.status.replace('_', ' ')}
                variant={getStatusVariant(item.fsr.status)}
                size="sm"
              />
            </View>
            <Text style={styles.fsrNumberText}>{item.fsr.fsrNumber}</Text>
          </View>

          {/* Customer & Contact */}
          <Text style={styles.customerNameText} numberOfLines={1}>
            {customerName}
          </Text>

          {/* Site / Location */}
          {Boolean(siteAddress) && (
            <View style={styles.infoRow}>
              <MapPin size={13} color={theme.colors.textMuted} style={styles.infoIcon} />
              <Text style={styles.infoText} numberOfLines={1}>
                {siteAddress}
              </Text>
            </View>
          )}

          {/* Equipment / UPS Specs */}
          {Boolean(productName) && (
            <View style={styles.infoRow}>
              <Cpu size={13} color={theme.colors.primaryLight} style={styles.infoIcon} />
              <Text style={styles.infoText} numberOfLines={1}>
                {productName}
                {serialNumber ? ` (${serialNumber})` : ''}
              </Text>
            </View>
          )}

          {/* Reported Problem / Visit Reason */}
          {Boolean(problem) && (
            <View style={styles.problemBox}>
              <Text style={styles.problemText} numberOfLines={2}>
                {problem}
              </Text>
            </View>
          )}

          {/* Footer Meta */}
          <View style={styles.cardFooter}>
            <View style={styles.metaGroup}>
              <Calendar size={13} color={theme.colors.textMuted} style={styles.metaIcon} />
              <Text style={styles.metaText}>{formatDate(item.fsr.visitDate)}</Text>
            </View>

            {Boolean(item.serviceEngineer?.fullName) && (
              <View style={styles.metaGroup}>
                <UserCheck size={13} color={theme.colors.textMuted} style={styles.metaIcon} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.serviceEngineer.fullName}
                </Text>
              </View>
            )}

            <ChevronRight size={16} color={theme.colors.textMuted} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  // Render Footer for Infinite Pagination
  const renderFooter = () => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={theme.colors.primaryLight} />
          <Text style={styles.footerLoaderText}>Loading more visits...</Text>
        </View>
      );
    }
    if (!hasNextPage && reports.length > 5) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>
            Showing all {totalReports} service {totalReports === 1 ? 'visit' : 'visits'}
          </Text>
        </View>
      );
    }
    return null;
  };

  // Render Differentiated Empty State
  const renderEmptyState = () => {
    if (debouncedSearch) {
      return (
        <View style={styles.emptyContainer}>
          <Search size={44} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No visits match your search</Text>
          <Text style={styles.emptySubtitle}>
            We couldn't find any service visits matching "{debouncedSearch}". Try a different keyword or FSR number.
          </Text>
          <Button
            title="Clear Search"
            variant="outline"
            onPress={() => setSearchQuery('')}
            style={styles.emptyActionButton}
          />
        </View>
      );
    }

    if (hasActiveFilters) {
      return (
        <View style={styles.emptyContainer}>
          <SlidersHorizontal size={44} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No visits match the selected filters</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting or clearing your status and call type filters to see more results.
          </Text>
          <Button
            title="Reset Filters"
            variant="outline"
            onPress={handleResetFilters}
            style={styles.emptyActionButton}
          />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Wrench size={44} color={theme.colors.textMuted} />
        <Text style={styles.emptyTitle}>No service visits found</Text>
        <Text style={styles.emptySubtitle}>
          {activeScope === 'MY_VISITS'
            ? 'You currently have no scheduled or assigned site visits.'
            : 'No service visits currently recorded in the system.'}
        </Text>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Screen Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleArea}>
            <Text style={styles.title}>
              {isSales
                ? 'Service Visits'
                : !isAdminManager
                ? 'My Service Visits'
                : activeScope === 'MY_VISITS'
                ? 'My Service Visits'
                : 'All Service Visits'}
            </Text>
            <Text style={styles.subtitle}>
              {totalReports > 0
                ? `${totalReports} ${totalReports === 1 ? 'visit' : 'visits'} available`
                : 'Manage and track site service visits'}
            </Text>
          </View>
        </View>

        {/* Scope Switcher: only for Admin / Manager who can toggle between All Visits and My Visits */}
        {isAdminManager && (
          <View style={styles.scopeSwitcherContainer}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveScope('MY_VISITS')}
              style={[
                styles.scopeTab,
                activeScope === 'MY_VISITS' && styles.scopeTabActive,
              ]}
            >
              <Text
                style={[
                  styles.scopeTabText,
                  activeScope === 'MY_VISITS' && styles.scopeTabTextActive,
                ]}
              >
                My Visits
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveScope('ALL_VISITS')}
              style={[
                styles.scopeTab,
                activeScope === 'ALL_VISITS' && styles.scopeTabActive,
              ]}
            >
              <Text
                style={[
                  styles.scopeTabText,
                  activeScope === 'ALL_VISITS' && styles.scopeTabTextActive,
                ]}
              >
                All Visits
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search Bar + Filter Trigger Button */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Search size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search FSR#, customer, model, site..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {isFetching && !isRefetching && !isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primaryLight} style={styles.searchLoadingIcon} />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleOpenFilterModal}
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          >
            <SlidersHorizontal
              size={18}
              color={hasActiveFilters ? theme.colors.textOnPrimary : theme.colors.textSecondary}
            />
            {hasActiveFilters && <View style={styles.filterBadgeDot} />}
          </TouchableOpacity>
        </View>

        {/* Active Filter Pills Display */}
        {hasActiveFilters && (
          <View style={styles.activeFilterPillsRow}>
            {selectedStatus !== 'ALL' && (
              <TouchableOpacity
                style={styles.activeFilterPill}
                onPress={() => setSelectedStatus('ALL')}
              >
                <Text style={styles.activeFilterPillText}>
                  Status: {selectedStatus.replace('_', ' ')}
                </Text>
                <X size={12} color={theme.colors.primaryLight} />
              </TouchableOpacity>
            )}
            {selectedCallType !== 'ALL' && (
              <TouchableOpacity
                style={styles.activeFilterPill}
                onPress={() => setSelectedCallType('ALL')}
              >
                <Text style={styles.activeFilterPillText}>
                  Call: {formatCallTypeLabel(selectedCallType)}
                </Text>
                <X size={12} color={theme.colors.primaryLight} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleResetFilters} style={styles.clearAllFiltersBtn}>
              <Text style={styles.clearAllFiltersText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Horizontal Status Filter Chips */}
        <View style={styles.filtersWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={STATUS_OPTIONS}
            keyExtractor={(item) => item.value}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => {
              const isActive = selectedStatus === item.value;
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSelectedStatus(item.value)}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Main FSR List with Infinite Scrolling */}
        {isLoading && !isRefetching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading service visits...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <AlertCircle size={44} color={theme.colors.accentRose} />
            <Text style={styles.emptyTitle}>Failed to load reports</Text>
            <Text style={styles.emptySubtitle}>
              {error instanceof Error ? error.message : 'Please check your connection and try again.'}
            </Text>
            <Button
              title="Try Again"
              variant="outline"
              onPress={() => refetch()}
              style={styles.retryButton}
            />
          </View>
        ) : (
          <FlatList
            data={reports}
            keyExtractor={(item) => item.fsr.id}
            renderItem={renderFsrCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={renderFooter}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
            ListEmptyComponent={renderEmptyState}
          />
        )}

        {/* Filter Selection Modal Sheet */}
        <Modal
          visible={isFilterModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setIsFilterModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter Service Visits</Text>
                <TouchableOpacity
                  onPress={() => setIsFilterModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Status Section */}
              <Text style={styles.modalSectionLabel}>Report Status</Text>
              <View style={styles.modalChipsGrid}>
                {STATUS_OPTIONS.map((item) => {
                  const isSelected = modalStatus === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      activeOpacity={0.7}
                      onPress={() => setModalStatus(item.value)}
                      style={[
                        styles.modalChip,
                        isSelected && styles.modalChipActive,
                      ]}
                    >
                      {isSelected && <Check size={14} color={theme.colors.textOnPrimary} style={{ marginRight: 4 }} />}
                      <Text
                        style={[
                          styles.modalChipText,
                          isSelected && styles.modalChipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Call Type Section */}
              <Text style={styles.modalSectionLabel}>Call Type</Text>
              <View style={styles.modalChipsGrid}>
                {CALL_TYPE_OPTIONS.map((item) => {
                  const isSelected = modalCallType === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      activeOpacity={0.7}
                      onPress={() => setModalCallType(item.value)}
                      style={[
                        styles.modalChip,
                        isSelected && styles.modalChipActive,
                      ]}
                    >
                      {isSelected && <Check size={14} color={theme.colors.textOnPrimary} style={{ marginRight: 4 }} />}
                      <Text
                        style={[
                          styles.modalChipText,
                          isSelected && styles.modalChipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Modal Actions */}
              <View style={styles.modalActionRow}>
                <Button
                  title="Reset"
                  variant="ghost"
                  onPress={() => {
                    setModalStatus('ALL');
                    setModalCallType('ALL');
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Apply Filters"
                  variant="primary"
                  onPress={handleApplyFilters}
                  style={{ flex: 1.5 }}
                />
              </View>
            </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  headerTitleArea: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  scopeSwitcherContainer: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  scopeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  scopeTabActive: {
    backgroundColor: theme.colors.surfaceElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  scopeTabText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
  },
  scopeTabTextActive: {
    color: theme.colors.primaryLight,
    fontWeight: theme.fontWeight.bold,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 44,
  },
  searchIcon: {
    marginRight: theme.spacing.xs,
  },
  searchLoadingIcon: {
    marginLeft: theme.spacing.xs,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.sm,
    paddingVertical: 8,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  filterBadgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.accentAmber,
  },
  activeFilterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.xs,
    gap: 6,
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  activeFilterPillText: {
    fontSize: 11,
    color: theme.colors.primaryLight,
    fontWeight: theme.fontWeight.medium,
  },
  clearAllFiltersBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  clearAllFiltersText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textDecorationLine: 'underline',
  },
  filtersWrapper: {
    paddingVertical: theme.spacing.xs,
  },
  filterList: {
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
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xl,
  },
  cardWrapper: {
    marginBottom: theme.spacing.sm,
  },
  reportCard: {
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  fsrNumberText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primaryLight,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: theme.fontWeight.semibold,
  },
  customerNameText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  infoIcon: {
    marginRight: 6,
    flexShrink: 0,
  },
  infoText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  problemBox: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primaryLight,
  },
  problemText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    justifyContent: 'space-between',
  },
  metaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '42%',
  },
  metaIcon: {
    flexShrink: 0,
  },
  metaText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  footerLoaderText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  footerEnd: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  footerEndText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  emptyActionButton: {
    minWidth: 140,
  },
  retryButton: {
    marginTop: theme.spacing.md,
  },
  restrictedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  restrictedIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.accentRoseSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  restrictedTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  restrictedSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.xl,
  },
  restrictedButton: {
    minWidth: 160,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  modalSectionLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  modalChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  modalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  modalChipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  modalChipTextActive: {
    color: theme.colors.textOnPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
