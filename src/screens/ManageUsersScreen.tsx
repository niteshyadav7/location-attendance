import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Modal, ScrollView, TextInput, Platform } from 'react-native';
import { UserProfile } from '../types';
import Icon from 'react-native-vector-icons/Ionicons';
import { useUsers, useUserCreation } from '../hooks/useUserManagement';
import { useLocations } from '../hooks/useLocations';
import { COLORS } from '../constants/theme';
import { useAds } from '../hooks/useAds';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import DateTimePicker from '@react-native-community/datetimepicker';

export const ManageUsersScreen = () => {
  // Hooks
  const { users, loading, updateUserStatus, toggleUserActive, deleteUser, assignLocation } = useUsers();
  const { locations } = useLocations();
  const { createUser, creating } = useUserCreation();
  const { effectiveBannerId, shouldShowAd } = useAds();
  const showAd = shouldShowAd('adminUsers');

  // Local State
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
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

  const renderItem = ({ item }: { item: UserProfile }) => (
    <View style={styles.card}>
      <View style={styles.userInfo}>
        <View style={styles.headerRow}>
            <Text style={styles.userName}>{item.name}</Text>
            {item.status === 'pending' && (
                <View style={[styles.badge, { backgroundColor: COLORS.status.onBreak + '20' }]}>
                    <Text style={[styles.badgeText, { color: COLORS.status.onBreak }]}>Pending Approval</Text>
                </View>
            )}
            {item.status === 'rejected' && (
                <View style={[styles.badge, { backgroundColor: COLORS.status.offline + '20' }]}>
                    <Text style={[styles.badgeText, { color: COLORS.status.offline }]}>Rejected</Text>
                </View>
            )}
            {item.deviceResetRequested && (
                <View style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
                    <Text style={[styles.badgeText, { color: '#d97706' }]}>Device Reset</Text>
                </View>
            )}
            {item.isActive === false && (
                <View style={[styles.badge, { backgroundColor: '#fce4ec' }]}>
                    <Text style={[styles.badgeText, { color: '#e91e63' }]}>Inactive</Text>
                </View>
            )}
        </View>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.assignedText}>
          Assigned: {item.assignedLocationId 
            ? locations.find(l => l.id === item.assignedLocationId)?.name || 'Unknown'
            : 'Not assigned'}
        </Text>
      </View>
      
      <View style={styles.actionButtonsContainer}>
          {item.status === 'pending' ? (
            <View style={styles.approvalButtons}>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleUpdateStatus(item.uid, 'approved')}
                >
                    <Icon name="checkmark-circle-outline" size={20} color={COLORS.white} />
                    <Text style={styles.actionButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleUpdateStatus(item.uid, 'rejected')}
                >
                    <Icon name="close-circle-outline" size={20} color={COLORS.white} />
                    <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
            </View>
          ) : null}
          
          <TouchableOpacity 
            style={[styles.assignButton, item.status === 'pending' && styles.assignButtonSecondary]}
            onPress={() => openLocationPicker(item)}
          >
            <Text style={[styles.assignButtonText, item.status === 'pending' && styles.assignButtonTextSecondary]}>
                {item.assignedLocationId ? 'Change Location' : 'Assign Location'}
            </Text>
          </TouchableOpacity>

          <View style={styles.dangerButtonsRow}>
            <TouchableOpacity 
              style={[styles.actionButton, item.isActive === false ? styles.activateButton : styles.deactivateButton]}
              onPress={() => handleToggleUserActive(item.uid, item.isActive)}
            >
              <Icon 
                name={item.isActive === false ? "checkmark-done-outline" : "ban-outline"} 
                size={18} 
                color={COLORS.white} 
              />
              <Text style={styles.actionButtonText}>
                {item.isActive === false ? 'Activate' : 'Deactivate'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteUser(item.uid, item.name)}
            >
              <Icon name="trash-outline" size={18} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
      </View>
    </View>
  );

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
      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
      />

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
  }
});
