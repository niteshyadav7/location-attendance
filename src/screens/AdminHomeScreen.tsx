import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { LocationConfig } from '../types';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../constants/theme';
import { useAdminHome } from '../hooks/useAdminHome';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useAds } from '../hooks/useAds';
import { LocationBreakUpdateModal } from '../components/LocationBreakUpdateModal';
import { useState } from 'react';

export const AdminHomeScreen = () => {
  const { effectiveBannerId, shouldShowAd } = useAds();
  const showAd = shouldShowAd('adminLocations');
  const {
    locations,
    loading,
    error,
    pendingCount,
    unreadNotifCount,
    handleDeleteLocation
  } = useAdminHome();
  


  const navigation = useNavigation<any>();

  /* New State for Break Modal */
  const [selectedLocationForBreak, setSelectedLocationForBreak] = useState<LocationConfig | null>(null);
  const [showBreakModal, setShowBreakModal] = useState(false);

  const handleEdit = (id: string) => {
    navigation.navigate('EditLocation', { locationId: id });
  };

  const openBreakModal = (location: LocationConfig) => {
      setSelectedLocationForBreak(location);
      setShowBreakModal(true);
  };

  /* Moved Actions to Header to prevent obscuring content */
  /* Moved Actions to Header to prevent obscuring content */
  const renderHeader = () => (
    <View style={{ marginBottom: 20 }}>
      <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: COLORS.status.working }]}
            onPress={() => navigation.navigate('ManageUsers')}
          >
            <View style={styles.actionIcon}>
               <Text style={{fontSize: 20}}>👥</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.actionCardTitle} numberOfLines={1} adjustsFontSizeToFit>Manage Users</Text>
              {pendingCount > 0 && <Text style={styles.actionCardSubtitle} numberOfLines={1}>{pendingCount} Pending</Text>}
            </View>
          </TouchableOpacity>
  
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: COLORS.primary }]}
            onPress={() => navigation.navigate('Notices')}
          >
            <View style={styles.actionIcon}>
               <Text style={{fontSize: 20}}>📢</Text>
            </View>
            <View style={{flex: 1}}>
               <Text style={styles.actionCardTitle} numberOfLines={1} adjustsFontSizeToFit>Manage Notices</Text>
               <Text style={styles.actionCardSubtitle} numberOfLines={1}>Post updates</Text>
            </View>
          </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.actionCard, { backgroundColor: '#4F46E5', marginTop: 12 }]}
        onPress={() => navigation.navigate('HiringPortal')}
        activeOpacity={0.8}
      >
        <View style={styles.actionIcon}>
           <Text style={{fontSize: 20}}>💼</Text>
        </View>
        <View style={{flex: 1}}>
           <Text style={styles.actionCardTitle}>Find Local Workers (Hiring Directory)</Text>
           <Text style={styles.actionCardSubtitle}>Search and hire verified staff in Kaasganj</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionCard, { backgroundColor: '#10B981', marginTop: 12 }]}
        onPress={() => navigation.navigate('AdminPaybook')}
        activeOpacity={0.8}
      >
        <View style={styles.actionIcon}>
           <Text style={{fontSize: 20}}>🪙</Text>
        </View>
        <View style={{flex: 1}}>
           <Text style={styles.actionCardTitle}>Salary Paybook & Wages Ledger</Text>
           <Text style={styles.actionCardSubtitle}>Manage staff wages, bonuses, and approved advances</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: LocationConfig }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
            <Ionicons name="location" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>
                {item.address ? item.address : `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}
            </Text>
        </View>
        {item.breakSettings?.isEnabled && (
            <View style={styles.activeBadge}>
                <Ionicons name="cafe" size={12} color={COLORS.status.onBreak} />
                <Text style={styles.activeBadgeText}>Breaks On</Text>
            </View>
        )}
      </View>

      <View style={styles.divider} />
      
      <View style={styles.cardStats}>
          <View style={styles.statItem}>
             <Ionicons name="radio-outline" size={16} color={COLORS.text.secondary} />
             <Text style={styles.statText}>{item.radius}m Radius</Text>
          </View>
          {item.breakSettings?.isEnabled ? (
             <View style={styles.statItem}>
                <Ionicons name="time-outline" size={16} color={COLORS.text.secondary} />
                <Text style={styles.statText}>{item.breakSettings.durationMinutes}m Break</Text>
             </View>
          ) : (
             <View style={styles.statItem}>
                <Ionicons name="close-circle-outline" size={16} color={COLORS.text.light} />
                <Text style={styles.statText}>No Breaks</Text>
             </View>
          )}
      </View>

      <View style={styles.actionRow}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity 
                onPress={() => openBreakModal(item)} 
                style={[styles.actionBtn, styles.breakBtn]}
            >
                 <Ionicons name="cafe-outline" size={20} color={COLORS.status.onBreak} />
                 <Text style={styles.breakBtnText}>Breaks</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                onPress={() => navigation.navigate('KioskAttendance', { location: item })} 
                style={[styles.actionBtn, { backgroundColor: '#E0F2FE' }]}
            >
                 <Ionicons name="keypad-outline" size={20} color="#0369A1" />
                 <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#0369A1' }}>Kiosk Mode</Text>
            </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={() => handleEdit(item.id)} style={styles.iconBtn}>
                <Ionicons name="pencil" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteLocation(item.id)} style={[styles.iconBtn, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="trash-outline" size={20} color={COLORS.status.offline} />
            </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={{ alignItems: 'center', backgroundColor: COLORS.background }}>
        {showAd && (
          <BannerAd
            unitId={effectiveBannerId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
          />
        )}
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading locations:</Text>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={locations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={<Text style={styles.emptyText}>No locations added yet.</Text>}
        />
      )}
      
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddLocation')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <LocationBreakUpdateModal
        visible={showBreakModal}
        location={selectedLocationForBreak}
        onClose={() => setShowBreakModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 20, paddingBottom: 300 },
  card: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardInfo: {
    flex: 1,
    paddingHorizontal: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text.primary, marginBottom: 2 },
  cardSubtitle: { fontSize: 14, color: COLORS.text.secondary, marginTop: 4 },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  deleteButton: {
    backgroundColor: COLORS.status.offline,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: COLORS.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: { color: COLORS.white, fontSize: 30, marginTop: -2 },
  emptyText: { textAlign: 'center', marginTop: 50, color: COLORS.text.light },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  errorText: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.status.offline, 
    marginBottom: 10 
  },
  errorMessage: { 
    fontSize: 14, 
    color: COLORS.text.secondary, 
    textAlign: 'center' 
  },
  /* Header Actions Styles */
  headerActions: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
  },
  actionCard: {
      flex: 1,
      backgroundColor: COLORS.white,
      borderRadius: 16,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
  },
  actionIcon: {
      width: 40,
      height: 40,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
  },
  actionCardTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: COLORS.white,
  },
  actionCardSubtitle: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.8)',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#FEF3C7',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: 'flex-start',
  },
  activeBadgeText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: COLORS.status.onBreak,
      textTransform: 'uppercase',
  },
  divider: {
      height: 1,
      backgroundColor: '#F3F4F6',
      marginVertical: 12,
  },
  cardStats: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 16,
  },
  statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
  },
  statText: {
      fontSize: 13,
      color: COLORS.text.secondary,
      fontWeight: '500',
  },
  actionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
  },
  breakBtn: {
      backgroundColor: '#FEF3C7',
  },
  breakBtnText: {
      fontSize: 13,
      fontWeight: 'bold',
      color: COLORS.status.onBreak,
  },
  iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#EFF6FF',
      justifyContent: 'center',
      alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.status.offline,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    zIndex: 10,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  maintenanceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.white,
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
      gap: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
  },
  maintenanceText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: COLORS.text.primary,
  }
});
