import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  User,
  FileText,
  AlertCircle,
  Layers,
} from 'lucide-react-native';
import { ScreenContainer } from '../../../src/components/ui/ScreenContainer';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { useCustomerDetails } from '../../../src/hooks/useCustomer';
import { theme } from '../../../src/theme/theme';
import { CustomerDestination } from '../../../src/types/customer.types';

export default function CustomerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: customer, isLoading, error } = useCustomerDetails(id);

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.colors.primaryLight} />
          <Text style={styles.centerText}>Loading customer profile...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error || !customer) {
    return (
      <ScreenContainer>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Profile</Text>
        </View>
        <View style={styles.centerBox}>
          <AlertCircle size={40} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Customer Not Found</Text>
          <Text style={styles.errorSubtitle}>
            Customer details are unavailable or your account does not have clearance.
          </Text>
          <Button
            title="Go Back"
            variant="secondary"
            onPress={() => router.back()}
            style={{ marginTop: 16 }}
          />
        </View>
      </ScreenContainer>
    );
  }

  const destinations = customer.destinations || [];

  return (
    <ScreenContainer>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Profile</Text>
        <Badge
          label={customer.status}
          variant={customer.status === 'ACTIVE' ? 'success' : 'neutral'}
          size="sm"
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Company Card */}
        <Card elevated style={styles.mainCard}>
          <View style={styles.companyIconBox}>
            <Building2 size={24} color={theme.colors.primaryLight} />
          </View>
          <Text style={styles.companyName}>{customer.companyName || customer.name}</Text>
          {customer.companyName ? (
            <Text style={styles.contactPersonName}>Key Account: {customer.name}</Text>
          ) : null}
        </Card>

        {/* Contact Information */}
        <Card style={styles.sectionCard}>
          <Text style={styles.cardSectionTitle}>Primary Contact Details</Text>
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Phone size={18} color={theme.colors.primaryLight} />
              <View style={styles.infoTextBox}>
                <Text style={styles.infoLabel}>Direct Phone</Text>
                <Text style={styles.infoValue}>{customer.phone || '—'}</Text>
              </View>
            </View>

            {customer.email ? (
              <View style={styles.infoRow}>
                <Mail size={18} color={theme.colors.primaryLight} />
                <View style={styles.infoTextBox}>
                  <Text style={styles.infoLabel}>Corporate Email</Text>
                  <Text style={styles.infoValue}>{customer.email}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.infoRow}>
              <MapPin size={18} color={theme.colors.primaryLight} />
              <View style={styles.infoTextBox}>
                <Text style={styles.infoLabel}>Registered Office Address</Text>
                <Text style={styles.infoValue}>
                  {customer.address}, {customer.city}, {customer.state} {customer.pincode}
                </Text>
              </View>
            </View>

            {customer.notes ? (
              <View style={styles.infoRow}>
                <FileText size={18} color={theme.colors.textMuted} />
                <View style={styles.infoTextBox}>
                  <Text style={styles.infoLabel}>Account Notes</Text>
                  <Text style={styles.notesValue}>{customer.notes}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </Card>

        {/* Registered Site Destinations */}
        <View style={styles.destinationsHeader}>
          <Text style={styles.destinationsTitle}>Service Site Destinations</Text>
          <Badge label={`${destinations.length} Sites`} variant="primary" size="sm" />
        </View>

        {destinations.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Layers size={24} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No registered site destinations found.</Text>
          </Card>
        ) : (
          destinations.map((dest: CustomerDestination) => (
            <Card key={dest.id} style={styles.destinationCard}>
              <View style={styles.destinationHeader}>
                <Text style={styles.destinationName}>{dest.name}</Text>
                <Badge
                  label={dest.status}
                  variant={dest.status === 'ACTIVE' ? 'success' : 'neutral'}
                  size="sm"
                />
              </View>

              <View style={styles.destinationInfoRow}>
                <MapPin size={16} color={theme.colors.textMuted} style={{ marginTop: 2 }} />
                <Text style={styles.destinationAddress}>
                  {dest.address ? `${dest.address}, ` : ''}
                  {dest.city} {dest.state} {dest.pincode}
                </Text>
              </View>

              {dest.contactPerson ? (
                <View style={styles.destinationInfoRow}>
                  <User size={16} color={theme.colors.textMuted} />
                  <Text style={styles.destinationContactText}>
                    {dest.contactPerson} {dest.contactPhone ? `(${dest.contactPhone})` : ''}
                  </Text>
                </View>
              ) : null}

              {dest.notes ? (
                <View style={styles.siteNotesBox}>
                  <Text style={styles.siteNotesText}>Site Note: {dest.notes}</Text>
                </View>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  mainCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  companyIconBox: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  companyName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  contactPersonName: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  sectionCard: {
    borderColor: theme.colors.border,
  },
  cardSectionTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm + 2,
  },
  infoList: {
    gap: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm + 2,
  },
  infoTextBox: {
    flex: 1,
  },
  infoLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  infoValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: 2,
    lineHeight: 20,
  },
  notesValue: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  destinationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  destinationsTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  destinationCard: {
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  destinationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  destinationName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  destinationInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  destinationAddress: {
    flex: 1,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  destinationContactText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primaryLight,
  },
  siteNotesBox: {
    marginTop: theme.spacing.sm,
    padding: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.sm,
  },
  siteNotesText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  emptyCard: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
  },
  centerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
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
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
});
