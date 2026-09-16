import React, { useState } from 'react';
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
  MapPin,
  Clock,
  ChevronRight,
  Briefcase,
  X,
} from 'lucide-react-native';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { useMyTasks } from '../../../src/hooks/useTasks';
import { theme } from '../../../src/theme/theme';
import { formatDateTime } from '../../../src/utils/date';
import { TaskItem, TaskStatus } from '../../../src/types/task.types';

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All Tasks', value: 'ALL' },
  { label: 'Assigned', value: 'ASSIGNED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function MyTasksScreen() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useMyTasks({
    status: selectedStatus,
    search: searchQuery,
  });

  const tasks = data?.tasks || [];

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'primary';
      default:
        return 'neutral';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'warning';
      case 'COMPLETED':
        return 'success';
      case 'ASSIGNED':
        return 'primary';
      case 'CANCELLED':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const renderTaskCard = ({ item }: { item: TaskItem }) => (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => router.push({
        pathname: '/(app)/tasks/[id]',
        params: { id: item.id },
      })}
      style={styles.cardWrapper}
    >
      <Card style={styles.taskCard}>
        {/* Header Badges */}
        <View style={styles.cardHeader}>
          <View style={styles.badgesRow}>
            <Badge
              label={item.priority}
              variant={getPriorityVariant(item.priority)}
              size="sm"
            />
            <Badge
              label={item.status.replace('_', ' ')}
              variant={getStatusVariant(item.status)}
              size="sm"
            />
          </View>
          <ChevronRight size={18} color={theme.colors.textMuted} />
        </View>

        {/* Task Title */}
        <Text style={styles.taskTitle}>{item.title}</Text>

        {/* Customer Name */}
        {item.customer ? (
          <Text style={styles.customerName}>
            {item.customer.companyName || item.customer.name}
          </Text>
        ) : null}

        {/* Metadata Footer */}
        <View style={styles.cardFooter}>
          {item.destination ? (
            <View style={styles.footerItem}>
              <MapPin size={14} color={theme.colors.textMuted} />
              <Text style={styles.footerText} numberOfLines={1}>
                {item.destination.city ? `${item.destination.name}, ${item.destination.city}` : item.destination.name}
              </Text>
            </View>
          ) : null}

          {item.scheduledAt ? (
            <View style={styles.footerItem}>
              <Clock size={14} color={theme.colors.textMuted} />
              <Text style={styles.footerText}>
                {formatDateTime(item.scheduledAt)}
              </Text>
            </View>
          ) : null}
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>My Assigned Tasks</Text>
        <Text style={styles.screenSubtitle}>
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} found
        </Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Search size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search by title, description or customer..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={(text: string) => setSearchQuery(text)}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Status Filter Horizontal Tabs */}
      <View style={styles.filtersWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isSelected = selectedStatus === item.value;
            return (
              <TouchableOpacity
                onPress={() => setSelectedStatus(item.value)}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Tasks List */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTaskCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primaryLight}
            colors={[theme.colors.primaryLight]}
          />
        }
        ListEmptyComponent={() => {
          if (isLoading) {
            return (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primaryLight} />
                <Text style={styles.emptyText}>Fetching your tasks...</Text>
              </View>
            );
          }

          if (error) {
            return (
              <Card style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Unable to load tasks</Text>
                <Text style={styles.errorSubtitle}>
                  Please pull down to refresh or verify network connection.
                </Text>
              </Card>
            );
          }

          return (
            <Card style={styles.emptyCard}>
              <Briefcase size={36} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No Tasks Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || selectedStatus !== 'ALL'
                  ? 'No tasks matched your search or status filter.'
                  : 'You have no assigned tasks at this time.'}
              </Text>
            </Card>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  screenTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  screenSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  searchWrapper: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 46,
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
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.xs + 2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  filterChipText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.textOnPrimary,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  cardWrapper: {
    marginBottom: 2,
  },
  taskCard: {
    padding: theme.spacing.md,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs + 2,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  taskTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  customerName: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primaryLight,
    marginBottom: theme.spacing.sm,
  },
  cardFooter: {
    flexDirection: 'column',
    gap: 4,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceElevated,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  centerContainer: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  errorContainer: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.accentRoseSoft,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: '#FECDD3',
  },
  errorSubtitle: {
    fontSize: theme.fontSize.xs,
    color: '#FDA4AF',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyCard: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
});
