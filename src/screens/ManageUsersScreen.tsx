import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Modal, ScrollView, TextInput, Platform } from 'react-native';
import { UserProfile, JoinRequest } from '../types';
import Icon from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import { useUsers, useUserCreation } from '../hooks/useUserManagement';
import { useLocations } from '../hooks/useLocations';
import { COLORS } from '../constants/theme';
import { useAds } from '../hooks/useAds';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import DateTimePicker from '@react-native-community/datetimepicker';
import { EnrollFingerprintModal } from '../components/EnrollFingerprintModal';

export const ManageUsersScreen = () => {
  // Hooks
  const { 
    users, 
    joinRequests, 
    loading, 
    updateUserStatus, 
    approveJoinRequest, 
    rejectJoinRequest, 
    toggleUserActive, 
    deleteUser, 
    assignLocation,
    approveLeaveRequest,
    rejectLeaveRequest
  } = useUsers();
  const { locations } = useLocations();
  const { createUser, creating } = useUserCreation();
  const { effectiveBannerId, shouldShowAd } = useAds();
  const showAd = shouldShowAd('adminUsers');

  // Local State
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'requests'>('users');
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);

  // Leave Request Comment Modal State
  const [showLeaveCommentModal, setShowLeaveCommentModal] = useState(false);
  const [leaveCommentAction, setLeaveCommentAction] = useState<'approve' | 'reject'>('approve');
  const [leaveAdminComment, setLeaveAdminComment] = useState('');
  const [processingLeave, setProcessingLeave] = useState(false);

  const handleResetDevice = async (userId: string) => {
    try {
      const db = firestore();
      await db.collection('users').doc(userId).update({
        registeredDeviceId: null,
        deviceResetRequested: false,
        deviceResetRequestDate: null
      });
      Alert.alert('Success', 'Device lock reset successfully.');
      if (selectedUser && selectedUser.uid === userId) {
        setSelectedUser({
          ...selectedUser,
          registeredDeviceId: undefined,
          deviceResetRequested: false,
          deviceResetRequestDate: undefined
        });
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to reset device lock: ' + error.message);
    }
  };
  
  // Assign Location Modal Time States
  const [assignCheckInTime, setAssignCheckInTime] = useState('');
  const [assignCheckOutTime, setAssignCheckOutTime] = useState('');
  const [tempSelectedLocationId, setTempSelectedLocationId] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<'checkIn' | 'checkOut'>('checkIn');

  // Add User Modal States
  const [addUserModalVisible, setAddUserModalVisible] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserLocationId, setNewUserLocationId] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Time Picker Handlers
  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    
    // Only update if the user actually selected a date (clicked "OK" or "Set")
    // On Android, event.type will be 'set' or 'dismissed'
    if (event.type === 'set' || Platform.OS === 'ios') {
        if (selectedDate) {
            // Format as HH:mm
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            const timeStr = `${hours}:${minutes}`;
            
            if (timePickerMode === 'checkIn') {
                setAssignCheckInTime(timeStr);
            } else {
                setAssignCheckOutTime(timeStr);
            }
        }
    }
  };

  const setPlatformShowTimePicker = (show: boolean, mode: 'checkIn' | 'checkOut') => {
      setTimePickerMode(mode);
      setShowTimePicker(show);
  };

  const formatTimeDisplay = (time24: string) => {
      if (!time24) return 'Select Time';
      const [h, m] = time24.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  // Handlers
  const handleAssignLocation = async (userId: string, locationId: string) => {
    try {
      await assignLocation(userId, locationId, assignCheckInTime, assignCheckOutTime);
      Alert.alert('Success', 'Location and schedule assigned successfully!');
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: 'approved' | 'rejected') => {
    try {
      await updateUserStatus(userId, newStatus);
      Alert.alert('Success', `User ${newStatus} successfully`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const openLocationPicker = (user: UserProfile) => {
    setSelectedUser(user);
    setTempSelectedLocationId(user.assignedLocationId || '');
    setAssignCheckInTime(user.assignedCheckInTime || '');
    setAssignCheckOutTime(user.assignedCheckOutTime || '');
    setModalVisible(true);
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim()) { Alert.alert('Error', 'Please enter user name'); return; }
    if (!newUserEmail.trim()) { Alert.alert('Error', 'Please enter email address'); return; }
    if (!newUserPassword || newUserPassword.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }

    try {
      await createUser(newUserName, newUserEmail, newUserPassword, newUserLocationId);
      
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserLocationId('');
      setAddUserModalVisible(false);
      
      Alert.alert('Success', `User ${newUserName} created successfully!`);
    } catch (error: any) {
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') errorMessage = 'This email is already registered';
      else if (error.code === 'auth/invalid-email') errorMessage = 'Invalid email address';
      else if (error.code === 'auth/weak-password') errorMessage = 'Password is too weak';
      
      Alert.alert('Error', errorMessage);
    }
  };

  const handleToggleUserActive = async (userId: string, currentStatus: boolean | undefined) => {
    const isActive = currentStatus !== false; 
    // If active, we are deactivating
    const action = !isActive ? 'activate' : 'deactivate';
    
    Alert.alert(
      `${action === 'activate' ? 'Activate' : 'Deactivate'} User`,
      `Are you sure you want to ${action} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'activate' ? 'Activate' : 'Deactivate',
          style: action === 'deactivate' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await toggleUserActive(userId, currentStatus);
              Alert.alert('Success', `User ${action}d successfully`);
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to permanently delete ${userName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(userId);
              Alert.alert('Success', `User ${userName} has been deleted`);
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: UserProfile }) => {
    const isPending = item.status === 'pending';
    const isRejected = item.status === 'rejected';
    const isInactive = item.isActive === false;
    const hasDeviceReset = item.deviceResetRequested === true;
    const isLeavePending = item.status === 'leave_pending';

    // Get location name
    const assignedLocation = item.assignedLocationId
      ? locations.find((l) => l.id === item.assignedLocationId)?.name || 'Unknown'
      : 'Unassigned';

    // Status styling
    let statusText = 'Active';
    let statusColor = '#059669'; // Emerald-600
    let statusBg = '#ECFDF5';

    if (isPending) {
      statusText = 'Pending';
      statusColor = '#D97706'; // Amber-600
      statusBg = '#FFFBEB';
    } else if (isRejected) {
      statusText = 'Rejected';
      statusColor = '#DC2626'; // Red-600
      statusBg = '#FEF2F2';
    } else if (isInactive) {
      statusText = 'Inactive';
      statusColor = '#E91E63'; // Pink-600
      statusBg = '#FCE4EC';
    } else if (hasDeviceReset) {
      statusText = 'Reset Req';
      statusColor = '#EA580C'; // Orange-600
      statusBg = '#FFEDD5';
    } else if (isLeavePending) {
      statusText = 'Leave Req';
      statusColor = '#EF4444'; // Red-500
      statusBg = '#FEF2F2';
    }

    return (
      <TouchableOpacity
        style={styles.userRow}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedUser(item);
          setDetailsModalVisible(true);
        }}
      >
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarCircleText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.userRowContent}>
          <Text style={styles.userRowName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.userRowSub} numberOfLines={1}>
            {item.email}  •  📍 {assignedLocation}
          </Text>
        </View>

        <View style={[styles.statusBadgeCompact, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusBadgeCompactText, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>

        <Icon name="chevron-forward-outline" size={18} color={COLORS.text.light} style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    );
  };

  const renderJoinRequestItem = ({ item }: { item: JoinRequest }) => {
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestCardHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarCircleText}>
              {item.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.requestName} numberOfLines={1}>{item.userName}</Text>
            <Text style={styles.requestEmail} numberOfLines={1}>{item.userEmail}</Text>
            <Text style={styles.requestDateText}>
              Requested: {new Date(item.requestDate).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={styles.requestActionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={async () => {
              try {
                await approveJoinRequest(item.id, item.userId);
                Alert.alert('Approved', `${item.userName} is now part of your organization.`);
              } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to approve request.');
              }
            }}
          >
            <Icon name="checkmark-outline" size={16} color={COLORS.white} />
            <Text style={styles.actionBtnText}>Approve</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={async () => {
              try {
                await rejectJoinRequest(item.id, item.userId);
                Alert.alert('Rejected', 'Request rejected.');
              } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to reject request.');
              }
            }}
          >
            <Icon name="close-outline" size={16} color={COLORS.white} />
            <Text style={styles.actionBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

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
      
      <View style={styles.tabContainerCustom}>
        <TouchableOpacity
          style={[styles.tabCustom, activeTab === 'users' && styles.activeTabCustom]}
          onPress={() => setActiveTab('users')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabTextCustom, activeTab === 'users' && styles.activeTabTextCustom]}>
            Staff ({users.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabCustom, activeTab === 'requests' && styles.activeTabCustom]}
          onPress={() => setActiveTab('requests')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabTextCustom, activeTab === 'requests' && styles.activeTabTextCustom]}>
            Join Requests ({joinRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'users' ? (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.list}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
        />
      ) : (
        <FlatList
          data={joinRequests}
          renderItem={renderJoinRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Icon name="people-outline" size={48} color={COLORS.text.light} />
              <Text style={[styles.emptyText, { marginTop: 10 }]}>No pending join requests.</Text>
            </View>
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setAddUserModalVisible(true)}
      >
        <Icon name="person-add" size={28} color={COLORS.white} />
      </TouchableOpacity>

      {/* Add User Modal */}
      <Modal
        visible={addUserModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddUserModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New User</Text>
            
            <ScrollView style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Icon name="person-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={newUserName}
                  onChangeText={setNewUserName}
                  autoCapitalize="words"
                  placeholderTextColor={COLORS.text.light}
                />
              </View>

              <View style={styles.inputContainer}>
                <Icon name="mail-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  value={newUserEmail}
                  onChangeText={setNewUserEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor={COLORS.text.light}
                />
              </View>

              <View style={styles.inputContainer}>
                <Icon name="lock-closed-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password (min 6 characters)"
                  value={newUserPassword}
                  onChangeText={setNewUserPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor={COLORS.text.light}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Icon name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={COLORS.text.light} />
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionLabel}>Assign Location (Optional)</Text>
              <ScrollView style={styles.locationPickerContainer}>
                <TouchableOpacity
                  style={[styles.locationPickerItem, !newUserLocationId && styles.selectedLocationPickerItem]}
                  onPress={() => setNewUserLocationId('')}
                >
                  <Text style={styles.locationPickerText}>No Location</Text>
                </TouchableOpacity>
                {locations.map((location) => (
                  <TouchableOpacity
                    key={location.id}
                    style={[styles.locationPickerItem, newUserLocationId === location.id && styles.selectedLocationPickerItem]}
                    onPress={() => setNewUserLocationId(location.id)}
                  >
                    <Text style={styles.locationPickerText}>{location.name}</Text>
                    <Text style={styles.locationPickerDetails}>Radius: {location.radius}m</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setAddUserModalVisible(false);
                  setNewUserName(''); setNewUserEmail(''); setNewUserPassword(''); setNewUserLocationId('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateUser}
                disabled={creating}
              >
                {creating ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.createButtonText}>Create User</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Location Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Location & Schedule</Text>
            
            <View style={{ marginBottom: 15 }}>
                  <Text style={styles.sectionLabel}>Select Shift Schedule (Optional)</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, color: COLORS.text.secondary, marginBottom: 5 }}>Check-In Time</Text>
                          <TouchableOpacity 
                            style={styles.timeInput}
                            onPress={() => setPlatformShowTimePicker(true, 'checkIn')}
                          >
                              <Text style={{ color: assignCheckInTime ? COLORS.text.primary : COLORS.text.light }}>
                                {formatTimeDisplay(assignCheckInTime)}
                              </Text>
                              <Icon name="time-outline" size={18} color={COLORS.primary} />
                          </TouchableOpacity>
                      </View>
                      <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, color: COLORS.text.secondary, marginBottom: 5 }}>Check-Out Time</Text>
                          <TouchableOpacity 
                            style={styles.timeInput}
                            onPress={() => setPlatformShowTimePicker(true, 'checkOut')}
                          >
                              <Text style={{ color: assignCheckOutTime ? COLORS.text.primary : COLORS.text.light }}>
                                {formatTimeDisplay(assignCheckOutTime)}
                              </Text>
                              <Icon name="time-outline" size={18} color={COLORS.primary} />
                          </TouchableOpacity>
                      </View>
                  </View>
                  {(assignCheckInTime || assignCheckOutTime) && (
                      <TouchableOpacity onPress={() => { setAssignCheckInTime(''); setAssignCheckOutTime(''); }} style={{ alignItems: 'flex-end', marginTop: 5 }}>
                          <Text style={{ fontSize: 12, color: COLORS.status.offline }}>Clear Schedule</Text>
                      </TouchableOpacity>
                  )}
            </View>

            <Text style={styles.sectionLabel}>Select Location</Text>
            <ScrollView style={styles.locationList}>
              {locations.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  style={[styles.locationItem, tempSelectedLocationId === location.id && styles.selectedLocationItem]}
                  onPress={() => setTempSelectedLocationId(location.id)}
                >
                  <Text style={styles.locationName}>{location.name}</Text>
                  <Text style={styles.locationDetails}>Radius: {location.radius}m</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
                <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]} 
                    onPress={() => setModalVisible(false)}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.modalButton, styles.createButton]} 
                    onPress={() => selectedUser && handleAssignLocation(selectedUser.uid, tempSelectedLocationId)}
                >
                    <Text style={styles.createButtonText}>Save Changes</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* User Details & Management Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setDetailsModalVisible(false);
          setSelectedUser(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>👤 Staff Profile & Management</Text>
              <TouchableOpacity
                onPress={() => {
                  setDetailsModalVisible(false);
                  setSelectedUser(null);
                }}
              >
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Large Profile Header */}
                <View style={styles.profileHeaderBox}>
                  <View style={styles.largeAvatar}>
                    <Text style={styles.largeAvatarText}>
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.profileName}>{selectedUser.name}</Text>
                  <Text style={styles.profileEmail}>{selectedUser.email}</Text>
                  
                  {/* Status Badge in Profile Header */}
                  <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            selectedUser.status === 'pending'
                              ? '#FFFBEB'
                              : selectedUser.status === 'leave_pending'
                              ? '#FEF2F2'
                              : selectedUser.status === 'rejected'
                              ? '#FEF2F2'
                              : selectedUser.isActive === false
                              ? '#FCE4EC'
                              : '#ECFDF5',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 20
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color:
                              selectedUser.status === 'pending'
                                ? '#D97706'
                                : selectedUser.status === 'leave_pending'
                                ? '#EF4444'
                                : selectedUser.status === 'rejected'
                                ? '#DC2626'
                                : selectedUser.isActive === false
                                ? '#E91E63'
                                : '#059669',
                            fontWeight: 'bold'
                          },
                        ]}
                      >
                        {selectedUser.status === 'pending'
                          ? 'Pending Approval'
                          : selectedUser.status === 'leave_pending'
                          ? 'Leave Requested'
                          : selectedUser.status === 'rejected'
                          ? 'Rejected'
                          : selectedUser.isActive === false
                          ? 'Inactive'
                          : 'Active'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Details Section */}
                <View style={styles.detailsCard}>
                  {/* Location Assignment */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconLabel}>
                      <Icon name="business-outline" size={20} color={COLORS.primary} />
                      <Text style={styles.detailLabel}>Assigned Location</Text>
                    </View>
                    <Text style={styles.detailValue}>
                      {selectedUser.assignedLocationId
                        ? locations.find((l) => l.id === selectedUser.assignedLocationId)?.name || 'Unknown'
                        : 'Not assigned'}
                    </Text>
                  </View>

                  <View style={styles.cardDivider} />

                  {/* Shift Timing */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconLabel}>
                      <Icon name="alarm-outline" size={20} color={COLORS.primary} />
                      <Text style={styles.detailLabel}>Shift Hours</Text>
                    </View>
                    <Text style={styles.detailValue}>
                      {selectedUser.assignedCheckInTime && selectedUser.assignedCheckOutTime
                        ? `${formatTimeDisplay(selectedUser.assignedCheckInTime)} - ${formatTimeDisplay(selectedUser.assignedCheckOutTime)}`
                        : 'No Shift Set'}
                    </Text>
                  </View>

                  <View style={styles.cardDivider} />

                  {/* Device Lock Status */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconLabel}>
                      <Icon name="phone-portrait-outline" size={20} color={COLORS.primary} />
                      <Text style={styles.detailLabel}>Device Link Status</Text>
                    </View>
                    <Text
                      style={[
                        styles.detailValue,
                        {
                          color: selectedUser.registeredDeviceId ? '#0369A1' : '#C2410C',
                          fontWeight: 'bold',
                        },
                      ]}
                    >
                      {selectedUser.registeredDeviceId ? 'Linked to Device' : 'No Device Linked'}
                    </Text>
                  </View>

                  <View style={styles.cardDivider} />

                  {/* Fingerprint Status */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconLabel}>
                      <Icon name="finger-print-outline" size={20} color={COLORS.primary} />
                      <Text style={styles.detailLabel}>Fingerprint Status</Text>
                    </View>
                    <Text
                      style={[
                        styles.detailValue,
                        {
                          color: selectedUser.fingerprintTemplate ? COLORS.status.working : COLORS.status.onBreak,
                          fontWeight: 'bold',
                        },
                      ]}
                    >
                      {selectedUser.fingerprintTemplate ? 'Registered' : 'Not Registered'}
                    </Text>
                  </View>
                </View>

                {/* Location Assignment Trigger */}
                <TouchableOpacity
                  style={[styles.assignButton, { marginTop: 16 }]}
                  onPress={() => {
                    setDetailsModalVisible(false);
                    openLocationPicker(selectedUser);
                  }}
                >
                  <Text style={styles.assignButtonText}>
                    {selectedUser.assignedLocationId ? '✏️ Edit Location & Shift' : '📍 Assign Location & Shift'}
                  </Text>
                </TouchableOpacity>

                {/* Fingerprint Enrollment Trigger */}
                <TouchableOpacity
                  style={[styles.assignButton, { marginTop: 12, backgroundColor: '#0284c7' }]}
                  onPress={() => {
                    setDetailsModalVisible(false);
                    setEnrollModalVisible(true);
                  }}
                >
                  <Text style={styles.assignButtonText}>
                    {selectedUser.fingerprintTemplate ? '👍 Re-Enroll Fingerprint' : '➕ Enroll Fingerprint'}
                  </Text>
                </TouchableOpacity>

                {/* Device Reset Approval Card */}
                {selectedUser.deviceResetRequested && (
                  <View style={styles.deviceResetNoticeCard}>
                    <Icon name="warning-outline" size={24} color="#D97706" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deviceResetNoticeTitle}>Device Reset Requested</Text>
                      <Text style={styles.deviceResetNoticeDesc}>
                        This worker requested to unlock their device to login from a new phone.
                      </Text>
                      <TouchableOpacity
                        style={styles.approveResetBtn}
                        onPress={async () => {
                          await handleResetDevice(selectedUser.uid);
                        }}
                      >
                        <Text style={styles.approveResetBtnText}>Approve Device Reset</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                 {/* Admin Management Actions */}
                <Text style={styles.sectionLabel}>Account Management</Text>
                <View style={styles.actionsCard}>
                  {/* Leave Request Details & Actions */}
                  {selectedUser.status === 'leave_pending' && (
                    <View style={{ marginBottom: 16 }}>
                      {/* Employee's Leave Reason Card */}
                      <View style={{ backgroundColor: '#FEF2F2', padding: 14, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#EF4444' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                          <Icon name="document-text-outline" size={18} color="#DC2626" />
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#991B1B', marginLeft: 6 }}>Leave Reason</Text>
                        </View>
                        <Text style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 19 }}>
                          {selectedUser.leaveReason || 'No reason provided.'}
                        </Text>
                      </View>

                      {/* Approve / Reject buttons */}
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.approveButton, { flex: 1 }]}
                          onPress={() => {
                            setLeaveCommentAction('approve');
                            setLeaveAdminComment('');
                            setShowLeaveCommentModal(true);
                          }}
                        >
                          <Icon name="checkmark-circle-outline" size={18} color={COLORS.white} />
                          <Text style={styles.actionButtonText}>Approve Leave</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.rejectButton, { flex: 1 }]}
                          onPress={() => {
                            setLeaveCommentAction('reject');
                            setLeaveAdminComment('');
                            setShowLeaveCommentModal(true);
                          }}
                        >
                          <Icon name="close-circle-outline" size={18} color={COLORS.white} />
                          <Text style={styles.actionButtonText}>Reject Leave</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Approve/Reject for Pending Users */}
                  {selectedUser.status === 'pending' && (
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton, { flex: 1 }]}
                        onPress={async () => {
                          await handleUpdateStatus(selectedUser.uid, 'approved');
                          setDetailsModalVisible(false);
                        }}
                      >
                        <Icon name="checkmark-circle-outline" size={18} color={COLORS.white} />
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton, { flex: 1 }]}
                        onPress={async () => {
                          await handleUpdateStatus(selectedUser.uid, 'rejected');
                          setDetailsModalVisible(false);
                        }}
                      >
                        <Icon name="close-circle-outline" size={18} color={COLORS.white} />
                        <Text style={styles.actionButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Toggle Active/Inactive */}
                  <TouchableOpacity
                    style={[
                      styles.actionCardBtn,
                      selectedUser.isActive === false
                        ? { backgroundColor: '#10B981' }
                        : { backgroundColor: '#F59E0B' },
                    ]}
                    onPress={async () => {
                      await handleToggleUserActive(selectedUser.uid, selectedUser.isActive);
                      setDetailsModalVisible(false);
                    }}
                  >
                    <Icon
                      name={selectedUser.isActive === false ? 'checkmark-done-outline' : 'ban-outline'}
                      size={18}
                      color={COLORS.white}
                    />
                    <Text style={styles.actionCardBtnText}>
                      {selectedUser.isActive === false ? 'Activate User Account' : 'Deactivate User Account'}
                    </Text>
                  </TouchableOpacity>

                  {/* Delete User */}
                  <TouchableOpacity
                    style={[styles.actionCardBtn, { backgroundColor: '#EF4444', marginTop: 10 }]}
                    onPress={async () => {
                      await handleDeleteUser(selectedUser.uid, selectedUser.name);
                      setDetailsModalVisible(false);
                    }}
                  >
                    <Icon name="trash-outline" size={18} color={COLORS.white} />
                    <Text style={styles.actionCardBtnText}>Permanently Delete User</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <EnrollFingerprintModal
        visible={enrollModalVisible}
        user={selectedUser}
        onClose={() => setEnrollModalVisible(false)}
        onEnrollSuccess={(newTemplate) => {
          if (selectedUser) {
            setSelectedUser({
              ...selectedUser,
              fingerprintTemplate: newTemplate,
            });
          }
        }}
      />

      {showTimePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={new Date()}
          mode="time"
          is24Hour={false}
          display="spinner"
          onChange={onTimeChange}
        />
      )}

      {/* Leave Request Comment Modal */}
      <Modal
        visible={showLeaveCommentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLeaveCommentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '90%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: leaveCommentAction === 'approve' ? '#059669' : '#DC2626' }}>
                {leaveCommentAction === 'approve' ? '✅ Approve Leave' : '❌ Reject Leave'}
              </Text>
              <TouchableOpacity onPress={() => setShowLeaveCommentModal(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Show employee's reason */}
            {selectedUser?.leaveReason ? (
              <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 10, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#6B7280' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 4 }}>Employee's Reason:</Text>
                <Text style={{ fontSize: 13, color: '#374151', lineHeight: 18 }}>{selectedUser.leaveReason}</Text>
              </View>
            ) : null}

            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text.primary, marginBottom: 8 }}>
              Admin Comment {leaveCommentAction === 'reject' ? '*' : '(optional)'}
            </Text>
            <TextInput
              style={{
                backgroundColor: COLORS.background,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#e9ecef',
                padding: 12,
                fontSize: 14,
                color: COLORS.text.primary,
                minHeight: 80,
                textAlignVertical: 'top',
                marginBottom: 16,
              }}
              value={leaveAdminComment}
              onChangeText={setLeaveAdminComment}
              placeholder={leaveCommentAction === 'approve' 
                ? "Add a comment for the employee (optional)..." 
                : "Explain why this leave request is rejected..."
              }
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' }}
                onPress={() => setShowLeaveCommentModal(false)}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text.primary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 10,
                  backgroundColor: leaveCommentAction === 'approve' ? '#059669' : '#DC2626',
                  alignItems: 'center',
                  opacity: processingLeave ? 0.6 : 1,
                }}
                disabled={processingLeave}
                onPress={async () => {
                  if (leaveCommentAction === 'reject' && !leaveAdminComment.trim()) {
                    Alert.alert('Comment Required', 'Please provide a reason for rejecting this leave request.');
                    return;
                  }
                  if (!selectedUser) return;
                  setProcessingLeave(true);
                  try {
                    if (leaveCommentAction === 'approve') {
                      await approveLeaveRequest(selectedUser.uid, selectedUser.name, leaveAdminComment.trim());
                      Alert.alert('Approved', `${selectedUser.name} has been removed from the organization.`);
                    } else {
                      await rejectLeaveRequest(selectedUser.uid, selectedUser.name, leaveAdminComment.trim());
                      Alert.alert('Rejected', `${selectedUser.name}'s leave request has been rejected.`);
                    }
                    setShowLeaveCommentModal(false);
                    setDetailsModalVisible(false);
                  } catch (err: any) {
                    Alert.alert('Error', err.message || 'Failed to process leave request.');
                  } finally {
                    setProcessingLeave(false);
                  }
                }}
              >
                {processingLeave ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: COLORS.white }}>
                    {leaveCommentAction === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20 },
  card: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  userInfo: { marginBottom: 15 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  userName: { fontSize: 18, fontWeight: 'bold', color: COLORS.text.primary, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  
  userEmail: { fontSize: 14, color: COLORS.text.secondary, marginTop: 2 },
  assignedText: { fontSize: 12, color: COLORS.text.light, marginTop: 4 },
  
  actionButtonsContainer: { gap: 10 },
  approvalButtons: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveButton: { backgroundColor: COLORS.status.working },
  rejectButton: { backgroundColor: COLORS.status.offline },
  actionButtonText: { color: COLORS.white, fontSize: 14, fontWeight: 'bold' },
  
  assignButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  assignButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  assignButtonText: { color: COLORS.white, fontSize: 14, fontWeight: 'bold' },
  assignButtonTextSecondary: { color: COLORS.primary },
  
  dangerButtonsRow: { flexDirection: 'row', gap: 10 },
  deactivateButton: { backgroundColor: COLORS.status.onBreak },
  activateButton: { backgroundColor: COLORS.status.working },
  deleteButton: { backgroundColor: COLORS.status.offline },
  
  emptyText: { textAlign: 'center', marginTop: 50, color: COLORS.text.secondary },
  
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: COLORS.text.primary,
  },
  
  formContainer: { maxHeight: 400 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: COLORS.text.primary },
  eyeIcon: { padding: 5 },
  sectionLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.text.primary, marginBottom: 10, marginTop: 5 },
  
  locationPickerContainer: { maxHeight: 150, marginBottom: 15 },
  locationPickerItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
    backgroundColor: COLORS.white,
  },
  selectedLocationPickerItem: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  locationPickerText: { fontSize: 15, fontWeight: '600', color: COLORS.text.primary },
  locationPickerDetails: { fontSize: 12, color: COLORS.text.secondary, marginTop: 3 },
  
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 10 },
  modalButton: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  cancelButton: { backgroundColor: '#e9ecef' },
  cancelButtonText: { color: COLORS.text.secondary, fontSize: 16, fontWeight: 'bold' },
  createButton: { backgroundColor: COLORS.primary },
  createButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  
  locationList: { maxHeight: 300 },
  locationItem: { padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 10 },
  selectedLocationItem: { backgroundColor: COLORS.primary + '10', borderColor: COLORS.status.working },
  locationName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text.primary },
  locationDetails: { fontSize: 12, color: COLORS.text.secondary, marginTop: 4 },
  closeButton: { backgroundColor: COLORS.text.light, padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  closeButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  
  timeInput: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#e9ecef',
      backgroundColor: COLORS.background
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarCircleText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  userRowContent: {
    flex: 1,
    justifyContent: 'center',
  },
  userRowName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  userRowSub: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  statusBadgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  statusBadgeCompactText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 15,
  },
  profileHeaderBox: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
  },
  largeAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  largeAvatarText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 28,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  deviceResetNoticeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  deviceResetNoticeTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 4,
  },
  deviceResetNoticeDesc: {
    fontSize: 13,
    color: '#B45309',
    lineHeight: 18,
    marginBottom: 12,
  },
  approveResetBtn: {
    backgroundColor: '#D97706',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  approveResetBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
  actionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
    gap: 10,
  },
  actionCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionCardBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabContainerCustom: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  tabCustom: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTabCustom: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabTextCustom: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  activeTabTextCustom: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  requestCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f0f4f8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  requestCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  requestName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  requestEmail: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  requestDateText: {
    fontSize: 11,
    color: COLORS.text.light,
    marginTop: 4,
  },
  requestActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  approveBtn: {
    backgroundColor: COLORS.status.working,
  },
  rejectBtn: {
    backgroundColor: COLORS.status.offline,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
