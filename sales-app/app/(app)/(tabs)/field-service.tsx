import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
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
} from 'lucide-react-native';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { useAuthStore } from '../../../src/auth/auth.store';
import { canAccessFSR } from '../../../src/utils/fsrPermissions';
import { useFsrList } from '../../../src/hooks/useFsr';
import { theme } from '../../../src/theme/theme';
import { formatDate } from '../../../src/utils/date';
import { FsrListItem, FsrStatus, FsrCallType } from '../../../src/types/fsr.types';

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All Reports', value: 'ALL' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Closed', value: 'CLOSED' },
];

export default function FieldServiceScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hasAccess = canAccessFSR(user);

  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useFsrList({
    status: selectedStatus,
    search: searchQuery,
  });

  const reports = data?.reports || [];

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
        return 'error';
      case 'PM':
        return 'primary';
      case 'INSTALLATION':
        return 'success';
      case 'COURTESY':
      default:
        return 'neutral';
    }
  };

  const formatCallTypeLabel = (callType: string) => {
    switch (callType) {
      case 'BD':
        return 'Breakdown';
      case 'PM':
        return 'Preventive Maint.';
      case 'INSTALLATION':
        return 'Installation';
      case 'COURTESY':
        return 'Courtesy Visit';
      default:
        return callType;
    }
  };

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

  const renderFsrCard = ({ item }: { item: FsrListItem }) => (
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
        {/* Header Badges */}
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

        {/* Customer & Problem */}
        <Text style={styles.customerNameText} numberOfLines={1}>
          {item.customer?.companyName || item.customer?.name || item.fsr.customerName}
        </Text>

        {(item.fsr.productModel || item.product?.name) && (
          <View style={styles.infoRow}>
            <Cpu size={14} color={theme.colors.primaryLight} style={styles.infoIcon} />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.fsr.productModel || item.product?.name}
              {item.fsr.productSerialNumber ? ` (${item.fsr.productSerialNumber})` : ''}
            </Text>
          </View>
        )}

        {(item.fsr.reasonForVisit || item.fsr.problemReported) && (
          <Text style={styles.problemText} numberOfLines={2}>
            {item.fsr.problemReported || item.fsr.reasonForVisit}
          </Text>
        )}

        {/* Footer Meta */}
        <View style={styles.cardFooter}>
          <View style={styles.metaGroup}>
            <Calendar size={13} color={theme.colors.textMuted} style={styles.metaIcon} />
            <Text style={styles.metaText}>{formatDate(item.fsr.visitDate)}</Text>
          </View>

          {item.serviceEngineer?.fullName && (
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

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Screen Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Field Service</Text>
            <Text style={styles.subtitle}>
              {data?.total ? `${data.total} site reports found` : 'Manage your site service visits'}
            </Text>
          </View>
        </View>

        {/* Search Box */}
        <View style={styles.searchContainer}>
          <Search size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by FSR#, customer, model..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Horizontal Status Filter Chips */}
        <View style={styles.filtersWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={STATUS_FILTERS}
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

        {/* FSR List */}
        {isLoading && !isRefetching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <AlertCircle size={44} color={theme.colors.accentRose} />
            <Text style={styles.emptyTitle}>Failed to load reports</Text>
            <Text style={styles.emptySubtitle}>
              {error instanceof Error ? error.message : 'Please check your connection and try again.'}
            </Text>
            <Button title="Try Again" variant="outline" onPress={() => refetch()} style={styles.retryButton} />
          </View>
        ) : (
          <FlatList
            data={reports}
            keyExtractor={(item) => item.fsr.id}
            renderItem={renderFsrCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Wrench size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyTitle}>No service reports found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery || selectedStatus !== 'ALL'
                    ? 'Try adjusting your search or status filter'
                    : 'Assigned site visit reports will appear here.'}
                </Text>
              </View>
            }
          />
        )}
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
    paddingBottom: theme.spacing.md,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    height: 44,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.sm,
  },
  filtersWrapper: {
    marginBottom: theme.spacing.sm,
  },
  filterList: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.textOnPrimary,
    fontWeight: theme.fontWeight.bold,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
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
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
  },
  fsrNumberText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primaryLight,
  },
  customerNameText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  infoIcon: {
    marginRight: 6,
  },
  infoText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
    flex: 1,
  },
  problemText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 4,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  metaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    marginRight: 4,
  },
  metaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    fontWeight: theme.fontWeight.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryButton: {
    marginTop: theme.spacing.md,
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  restrictedIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.accentRoseSoft,
    justifyContent: 'center',
    alignItems: 'center',
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
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  restrictedButton: {
    minWidth: 160,
  },
});
