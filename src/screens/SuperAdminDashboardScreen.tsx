import React, { useState } from 'react';
import { getAuth, signOut } from '@react-native-firebase/auth';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSuperAdminDashboard } from '../hooks/useSuperAdminDashboard';
import { COLORS } from '../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AdSettingsModal } from '../components/AdSettingsModal';
import { AppUpdateSettingsModal } from '../components/AppUpdateSettingsModal';
import { useAuthStore } from '../store/useAuthStore';

export const SuperAdminDashboardScreen = ({ navigation }: any) => {
  const impersonateTenant = useAuthStore((state) => state.impersonateTenant);
  const { 
    pendingCompanies, 
    allCompanies, 
    loading, 
    processingId,
    approveCompany, 
    rejectCompany,
    deleteCompanyAdmin,
    toggleCompanyStatus,
    updateCompanyAdminName,
    updateCompanyAdminPassword,
    approveAllPending
  } = useSuperAdminDashboard();
  
  const auth = getAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredPending = pendingCompanies.filter(item => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (item.orgName && item.orgName.toLowerCase().includes(query)) ||
      (item.name && item.name.toLowerCase().includes(query)) ||
      (item.email && item.email.toLowerCase().includes(query))
    );
  });

  const filteredAll = allCompanies.filter(item => {
    const query = searchQuery.toLowerCase().trim();
    
    // Apply Status Filter first
    const isActive = item.isActive !== false;
    if (statusFilter === 'active' && !isActive) return false;
    if (statusFilter === 'inactive' && isActive) return false;

    if (!query) return true;
    return (
      (item.orgName && item.orgName.toLowerCase().includes(query)) ||
      (item.name && item.name.toLowerCase().includes(query)) ||
      (item.email && item.email.toLowerCase().includes(query))
    );
  });
  
  // Edit Name Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const [newName, setNewName] = useState('');
  
  // Ad Settings Modal (Super Admin Only)
  const [showAdSettings, setShowAdSettings] = useState(false);
  const [showUpdateSettings, setShowUpdateSettings] = useState(false);

  // Reject Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectUserId, setRejectUserId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const handleRejectSubmit = () => {
    if (rejectUserId) {
      rejectCompany(rejectUserId, rejectReason.trim());
      setRejectModalVisible(false);
      setRejectUserId('');
      setRejectReason('');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
            try {
              if (auth.currentUser) {
                await signOut(auth);
              }
            } catch (error) {
              console.log('Error during super admin logout:', error);
            }
          } 
        }
      ]
    );
  };

  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setNewName(user.name);
    setEditModalVisible(true);
  };

  const handleUpdateName = () => {
    if (selectedUser && newName.trim()) {
      updateCompanyAdminName(selectedUser.uid, newName.trim());
      setEditModalVisible(false);
    }
  };

  const handleDelete = (user: any) => {
    Alert.alert(
      'Delete Company Admin',
      `Are you sure you want to PERMANENTLY delete ${user.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => deleteCompanyAdmin(user.uid) 
        }
      ]
    );
  };

  const renderPendingItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="business" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.orgName}>{item.orgName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 }}>
            <Text style={styles.adminName}>{item.name}</Text>
            {item.companyRequestStatus === 'pending' && (
              <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 9, color: '#2563eb', fontWeight: 'bold' }}>NEW FLOW</Text>
              </View>
            )}
          </View>
          <Text style={styles.email}>{item.email}</Text>
          {item.companyRequestPhone ? (
            <Text style={[styles.email, { marginTop: 2 }]}>📞 {item.companyRequestPhone}</Text>
          ) : null}
          {item.companyRequestAddress ? (
            <Text style={[styles.email, { marginTop: 2 }]}>📍 {item.companyRequestAddress}</Text>
          ) : null}
        </View>
      </View>
      
      <View style={styles.actions}>
        {processingId === item.uid ? (
          <View style={{ flex: 1, paddingVertical: 8, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : (
          <>
            <TouchableOpacity 
              style={[styles.button, styles.rejectButton]}
              onPress={() => {
                setRejectUserId(item.uid);
                setRejectReason('');
                setRejectModalVisible(true);
              }}
              disabled={processingId !== null}
            >
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.approveButton]}
              onPress={() => approveCompany(item.uid, item.organizationId)}
              disabled={processingId !== null}
            >
              <Text style={styles.approveText}>Approve</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  const renderAllItem = ({ item }: { item: any }) => {
    const isActive = item.isActive !== false; // Default to true if undefined

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: isActive ? '#dcfce7' : '#fee2e2' }]}>
            <Ionicons name="business" size={24} color={isActive ? COLORS.status.working : COLORS.status.offline} />
          </View>
          <View style={styles.info}>
            <Text style={styles.orgName}>{item.orgName}</Text>
            <Text style={styles.adminName}>{item.name} {item.role === 'super_admin' ? '(Super Admin)' : ''}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <View style={[styles.statusBadge, { backgroundColor: isActive ? '#dcfce7' : '#fee2e2' }]}>
                <Text style={[styles.statusText, { color: isActive ? '#15803d' : '#b91c1c' }]}>
                    {isActive ? 'Active' : 'Inactive'}
                </Text>
            </View>
          </View>
        </View>
        
        {processingId === item.uid ? (
          <View style={{ paddingVertical: 16, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : (
          <View style={styles.adminActionsGrid}>
            <TouchableOpacity 
              style={[styles.adminActionButton, { backgroundColor: '#eff6ff', borderColor: '#dbeafe' }]}
              onPress={() => {
                if (item.organization) {
                  impersonateTenant(item, item.organization);
                } else {
                  Alert.alert('Error', 'Company organization details not loaded yet. Please try again.');
                }
              }}
              disabled={processingId !== null}
            >
              <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
              <Text style={[styles.adminActionText, { color: COLORS.primary, fontWeight: 'bold' }]}>Explore</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.adminActionButton}
              onPress={() => openEditModal(item)}
              disabled={processingId !== null}
            >
              <Ionicons name="pencil" size={18} color={COLORS.primary} />
              <Text style={styles.adminActionText}>Edit Name</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.adminActionButton}
              onPress={() => toggleCompanyStatus(item.uid, isActive)}
              disabled={processingId !== null}
            >
              <Ionicons name={isActive ? "ban-outline" : "checkmark-circle-outline"} size={18} color={isActive ? COLORS.status.checkedOut : COLORS.status.working} />
              <Text style={[styles.adminActionText, { color: isActive ? COLORS.status.checkedOut : COLORS.status.working }]}
              >
                  {isActive ? 'Deactivate' : 'Activate'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.adminActionButton}
              onPress={() => updateCompanyAdminPassword(item.email)}
              disabled={processingId !== null}
            >
              <Ionicons name="key-outline" size={18} color="#f59e0b" />
              <Text style={[styles.adminActionText, { color: '#f59e0b' }]}>Reset Pass</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.adminActionButton}
              onPress={() => handleDelete(item)}
              disabled={processingId !== null}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
              <Text style={[styles.adminActionText, { color: '#ef4444' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
      return (
          <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
      );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <View>
                <Text style={styles.title}>Super Admin</Text>
                <Text style={styles.subtitle}>Dashboard</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <TouchableOpacity onPress={() => setShowUpdateSettings(true)} style={styles.settingsButtonHeader}>
                    <Ionicons name="cloud-download-outline" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowAdSettings(true)} style={styles.settingsButtonHeader}>
                    <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogout} style={{padding: 8}}>
                    <Ionicons name="log-out-outline" size={28} color={COLORS.status.offline} />
                </TouchableOpacity>
            </View>
        </View>

        {/* Navigation Cards */}
        <View style={styles.navigationSection}>
          <TouchableOpacity 
            style={styles.navCard}
            onPress={() => navigation.navigate('AppUpdates')}
            activeOpacity={0.7}
          >
            <View style={[styles.navIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="phone-portrait" size={28} color="#10B981" />
            </View>
            <View style={styles.navTextContainer}>
              <Text style={styles.navTitle}>App Updates</Text>
              <Text style={styles.navSubtitle}>Manage app update announcements</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.text.light} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.navCard}
            onPress={() => navigation.navigate('Feedback')}
            activeOpacity={0.7}
          >
            <View style={[styles.navIconContainer, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="chatbubbles" size={28} color="#3B82F6" />
            </View>
            <View style={styles.navTextContainer}>
              <Text style={styles.navTitle}>User Feedback</Text>
              <Text style={styles.navSubtitle}>View and manage feedback</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.text.light} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
                onPress={() => setActiveTab('pending')}
            >
                <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
                    Pending ({filteredPending.length})
                </Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'all' && styles.activeTab]}
                onPress={() => setActiveTab('all')}
            >
                <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
                    All ({filteredAll.length})
                </Text>
            </TouchableOpacity>
        </View>

        {/* Search and Action Bar */}
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={COLORS.text.light} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search company, admin, or email..."
              placeholderTextColor={COLORS.text.light}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                <Ionicons name="close-circle" size={18} color={COLORS.text.light} />
              </TouchableOpacity>
            )}
          </View>

          {activeTab === 'pending' ? (
            filteredPending.length > 0 && (
              <TouchableOpacity 
                style={styles.approveAllBtn} 
                onPress={approveAllPending}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-done-circle" size={20} color={COLORS.white} />
                <Text style={styles.approveAllText}>Approve All ({filteredPending.length})</Text>
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.filterPillsRow}>
              <TouchableOpacity 
                style={[styles.filterPill, statusFilter === 'all' && styles.activeFilterPill]}
                onPress={() => setStatusFilter('all')}
              >
                <Text style={[styles.filterPillText, statusFilter === 'all' && styles.activeFilterPillText]}>All ({allCompanies.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterPill, statusFilter === 'active' && styles.activeFilterPill]}
                onPress={() => setStatusFilter('active')}
              >
                <Text style={[styles.filterPillText, statusFilter === 'active' && styles.activeFilterPillText]}>
                  Active ({allCompanies.filter(c => c.isActive !== false).length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterPill, statusFilter === 'inactive' && styles.activeFilterPill]}
                onPress={() => setStatusFilter('inactive')}
              >
                <Text style={[styles.filterPillText, statusFilter === 'inactive' && styles.activeFilterPillText]}>
                  Inactive ({allCompanies.filter(c => c.isActive === false).length})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={activeTab === 'pending' ? filteredPending : filteredAll}
        renderItem={activeTab === 'pending' ? renderPendingItem : renderAllItem}
        keyExtractor={item => item.uid}
        contentContainerStyle={styles.list}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={
            <View style={styles.empty}>
                <Ionicons name="list-outline" size={60} color={COLORS.text.light} />
                <Text style={styles.emptyText}>No {activeTab} records found</Text>
            </View>
        }
      />

      {/* Edit Name Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setEditModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Name</Text>
                        <TextInput
                            style={styles.input}
                            value={newName}
                            onChangeText={setNewName}
                            placeholder="Enter new name"
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setEditModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleUpdateName}
                            >
                                <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </View>
        </TouchableWithoutFeedback>

      </Modal>

      {/* Reject Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setRejectModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Reject Request</Text>
                        <TextInput
                            style={styles.input}
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            placeholder="Enter rejection reason (optional)"
                            multiline
                            numberOfLines={3}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setRejectModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, { backgroundColor: '#dc2626' }]}
                                onPress={handleRejectSubmit}
                            >
                                <Text style={styles.saveButtonText}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* App Update Settings Modal */}
      <AppUpdateSettingsModal
        visible={showUpdateSettings}
        onClose={() => setShowUpdateSettings(false)}
      />

      {/* Ad Settings Modal */}
      <AdSettingsModal
        visible={showAdSettings}
        onClose={() => setShowAdSettings(false)}
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  topHeader: {
      padding: 20,
      backgroundColor: COLORS.white,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
  },
  title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: COLORS.primary,
  },
  subtitle: {
      fontSize: 14,
      color: COLORS.text.secondary,
      marginTop: 4,
  },
  navigationSection: {
      marginBottom: 20,
      gap: 12,
  },
  navCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.white,
      padding: 16,
      borderRadius: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      gap: 12,
  },
  navIconContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
  },
  navTextContainer: {
      flex: 1,
  },
  navTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: COLORS.text.primary,
      marginBottom: 2,
  },
  navSubtitle: {
      fontSize: 13,
      color: COLORS.text.secondary,
  },
  tabContainer: {
      flexDirection: 'row',
      marginTop: 20,
      backgroundColor: '#f3f4f6',
      borderRadius: 12,
      padding: 4,
  },
  tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
  },
  activeTab: {
      backgroundColor: COLORS.white,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
  },
  tabText: {
      fontWeight: '600',
      color: COLORS.text.secondary,
  },
  activeTabText: {
      color: COLORS.primary,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  orgName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  adminName: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  email: {
      fontSize: 12,
      color: COLORS.text.light,
  },
  statusBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      marginTop: 4,
  },
  statusText: {
      fontSize: 10,
      fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: COLORS.status.working,
  },
  rejectButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  approveText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  rejectText: {
    color: COLORS.status.offline,
    fontWeight: 'bold',
  },
  empty: {
      alignItems: 'center',
      marginTop: 50,
      gap: 10,
  },
  emptyText: {
      color: COLORS.text.light,
      fontSize: 16,
  },
  adminActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: '#f3f4f6',
  },
  adminActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f9fafb',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      gap: 6,
      borderWidth: 1,
      borderColor: '#e5e7eb',
  },
  adminActionText: {
      fontSize: 12,
      fontWeight: '600',
      color: COLORS.text.secondary,
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 20,
  },
  modalContent: {
      backgroundColor: COLORS.white,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
      color: COLORS.text.primary,
  },
  input: {
      width: '100%',
      borderWidth: 1,
      borderColor: '#e5e7eb',
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      marginBottom: 20,
      backgroundColor: '#f9fafb',
  },
  modalActions: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
  },
  modalButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
  },
  cancelButton: {
      backgroundColor: '#f3f4f6',
  },
  saveButton: {
      backgroundColor: COLORS.primary,
  },
  cancelButtonText: {
      color: COLORS.text.secondary,
      fontWeight: '600',
  },
  saveButtonText: {
      color: COLORS.white,
      fontWeight: 'bold',
  },
  settingsButtonHeader: {
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  searchFilterContainer: {
    marginTop: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    paddingVertical: 8,
  },
  clearSearchButton: {
    padding: 4,
  },
  approveAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.status.working,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 8,
  },
  approveAllText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
  filterPillsRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilterPill: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  activeFilterPillText: {
    color: COLORS.white,
  },
});
