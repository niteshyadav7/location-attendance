import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, TextInput, Modal, ActivityIndicator } from 'react-native';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { getFirestore, doc, updateDoc, getDoc } from '@react-native-firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

interface UserDetails {
  phoneNumber?: string;
  department?: string;
  employeeId?: string;
  joinDate?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  bloodGroup?: string;
  designation?: string;
  managerName?: string;
  workShift?: string;
}

export const SettingsScreen = () => {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  
  const [userDetails, setUserDetails] = useState<UserDetails>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState<keyof UserDetails | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(true);
  
  // Collapseable section states - only Basic Info open by default
  const [isBasicInfoExpanded, setIsBasicInfoExpanded] = useState(true);
  const [isProfessionalExpanded, setIsProfessionalExpanded] = useState(false);
  const [isPersonalExpanded, setIsPersonalExpanded] = useState(false);
  const [isEmergencyExpanded, setIsEmergencyExpanded] = useState(false);

  const db = getFirestore();

  useEffect(() => {
    fetchUserDetails();
  }, [user?.uid]);

  const fetchUserDetails = async () => {
    if (!user?.uid) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data) {
          setUserDetails({
            phoneNumber: data.phoneNumber || '',
            department: data.department || '',
            employeeId: data.employeeId || '',
            joinDate: data.joinDate || '',
            address: data.address || '',
            dateOfBirth: data.dateOfBirth || '',
            gender: data.gender || '',
            emergencyContactName: data.emergencyContactName || '',
            emergencyContactNumber: data.emergencyContactNumber || '',
            bloodGroup: data.bloodGroup || '',
            designation: data.designation || '',
            managerName: data.managerName || '',
            workShift: data.workShift || '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleLogout = async () => {
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
              const auth = getAuth();
              await signOut(auth);
              setUser(null);
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleEditField = (field: keyof UserDetails) => {
    setEditField(field);
    setEditValue(userDetails[field] || '');
    setShowEditModal(true);
  };

  const handleSaveField = async () => {
    if (!user?.uid || !editField) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        [editField]: editValue,
      });

      setUserDetails(prev => ({
        ...prev,
        [editField]: editValue,
      }));

      Alert.alert('Success', 'Details updated successfully');
      setShowEditModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFieldLabel = (field: keyof UserDetails) => {
    const labels = {
      phoneNumber: 'Phone Number',
      department: 'Department',
      employeeId: 'Employee ID',
      joinDate: 'Join Date',
      address: 'Address',
      dateOfBirth: 'Date of Birth',
      gender: 'Gender',
      emergencyContactName: 'Emergency Contact Name',
      emergencyContactNumber: 'Emergency Contact Number',
      bloodGroup: 'Blood Group',
      designation: 'Designation',
      managerName: 'Manager/Supervisor',
      workShift: 'Work Shift',
    };
    return labels[field];
  };

  const getFieldIcon = (field: keyof UserDetails) => {
    const icons = {
      phoneNumber: 'call-outline',
      department: 'business-outline',
      employeeId: 'id-card-outline',
      joinDate: 'calendar-outline',
      address: 'home-outline',
      dateOfBirth: 'gift-outline',
      gender: 'male-female-outline',
      emergencyContactName: 'person-add-outline',
      emergencyContactNumber: 'call-outline',
      bloodGroup: 'water-outline',
      designation: 'briefcase-outline',
      managerName: 'people-outline',
      workShift: 'time-outline',
    };
    return icons[field];
  };

  const getRoleBadgeColor = () => {
    return user?.role === 'admin' ? '#667eea' : '#10b981';
  };

  const getRoleIcon = () => {
    return user?.role === 'admin' ? 'shield-checkmark' : 'person';
  };

  const renderEditableField = (field: keyof UserDetails, icon: string, label: string, value?: string) => (
    <View>
      <View style={styles.infoRow}>
        <View style={styles.infoIconContainer}>
          <Icon name={icon} size={20} color="#667eea" />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={[styles.infoValue, !value && styles.placeholderText]}>
            {value || 'Not set'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => handleEditField(field)}
        >
          <Icon name="create-outline" size={20} color="#667eea" />
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />
    </View>
  );

  if (fetchingDetails) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.profileIconContainer}>
          <View style={styles.profileIcon}>
            <Text style={styles.avatarText}>{user?.name.charAt(0).toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.headerName}>{user?.name}</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor() }]}>
          <Icon name={getRoleIcon()} size={14} color="#fff" style={styles.badgeIcon} />
          <Text style={styles.roleBadgeText}>
            {user?.role === 'admin' ? 'Administrator' : 'User'}
          </Text>
        </View>
      </LinearGradient>

      {/* Basic Information */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeaderCollapseable}
          onPress={() => setIsBasicInfoExpanded(!isBasicInfoExpanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>📋 Basic Information</Text>
          <View style={styles.chevronContainer}>
            <Icon 
              name={isBasicInfoExpanded ? 'chevron-up-circle' : 'chevron-down-circle'} 
              size={28} 
              color="#667eea" 
            />
          </View>
        </TouchableOpacity>
        
        {isBasicInfoExpanded && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Icon name="person-outline" size={20} color="#667eea" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{user?.name}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Icon name="mail-outline" size={20} color="#667eea" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Icon name="shield-outline" size={20} color="#667eea" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Account Type</Text>
                <Text style={styles.infoValue}>
                  {user?.role === 'admin' ? 'Administrator' : 'Standard User'}
                </Text>
              </View>
            </View>

            {user?.assignedLocationId && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Icon name="location-outline" size={20} color="#667eea" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Assigned Location</Text>
                    <Text style={styles.infoValue}>Location ID: {user.assignedLocationId}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}
      </View>

      {/* Professional Information */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeaderCollapseable}
          onPress={() => setIsProfessionalExpanded(!isProfessionalExpanded)}
          activeOpacity={0.7}
        >
          <View>
            <Text style={styles.sectionTitle}>💼 Professional Information</Text>
            <Text style={styles.sectionSubtitle}>Tap the edit icon to update</Text>
          </View>
          <View style={styles.chevronContainer}>
            <Icon 
              name={isProfessionalExpanded ? 'chevron-up-circle' : 'chevron-down-circle'} 
              size={28} 
              color="#667eea" 
            />
          </View>
        </TouchableOpacity>
        
        {isProfessionalExpanded && (
          <View style={styles.infoCard}>
          {renderEditableField('employeeId', 'id-card-outline', 'Employee ID', userDetails.employeeId)}
          {renderEditableField('designation', 'briefcase-outline', 'Designation', userDetails.designation)}
          {renderEditableField('department', 'business-outline', 'Department', userDetails.department)}
          {renderEditableField('managerName', 'people-outline', 'Manager/Supervisor', userDetails.managerName)}
          {renderEditableField('workShift', 'time-outline', 'Work Shift', userDetails.workShift)}
          
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Icon name="calendar-outline" size={20} color="#667eea" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Join Date</Text>
              <Text style={[styles.infoValue, !userDetails.joinDate && styles.placeholderText]}>
                {userDetails.joinDate || 'Not set'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEditField('joinDate')}
            >
              <Icon name="create-outline" size={20} color="#667eea" />
            </TouchableOpacity>
          </View>
          </View>
        )}
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeaderCollapseable}
          onPress={() => setIsPersonalExpanded(!isPersonalExpanded)}
          activeOpacity={0.7}
        >
          <View>
            <Text style={styles.sectionTitle}>👤 Personal Information</Text>
            <Text style={styles.sectionSubtitle}>Tap the edit icon to update</Text>
          </View>
          <View style={styles.chevronContainer}>
            <Icon 
              name={isPersonalExpanded ? 'chevron-up-circle' : 'chevron-down-circle'} 
              size={28} 
              color="#667eea" 
            />
          </View>
        </TouchableOpacity>
        
        {isPersonalExpanded && (
          <View style={styles.infoCard}>
            {renderEditableField('phoneNumber', 'call-outline', 'Phone Number', userDetails.phoneNumber)}
            {renderEditableField('dateOfBirth', 'gift-outline', 'Date of Birth', userDetails.dateOfBirth)}
            {renderEditableField('gender', 'male-female-outline', 'Gender', userDetails.gender)}
            {renderEditableField('bloodGroup', 'water-outline', 'Blood Group', userDetails.bloodGroup)}
            
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Icon name="home-outline" size={20} color="#667eea" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={[styles.infoValue, !userDetails.address && styles.placeholderText]} numberOfLines={2}>
                  {userDetails.address || 'Not set'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => handleEditField('address')}
              >
                <Icon name="create-outline" size={20} color="#667eea" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Emergency Contact */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeaderCollapseable}
          onPress={() => setIsEmergencyExpanded(!isEmergencyExpanded)}
          activeOpacity={0.7}
        >
          <View>
            <Text style={styles.sectionTitle}>🚨 Emergency Contact</Text>
            <Text style={styles.sectionSubtitle}>Tap the edit icon to update</Text>
          </View>
          <View style={styles.chevronContainer}>
            <Icon 
              name={isEmergencyExpanded ? 'chevron-up-circle' : 'chevron-down-circle'} 
              size={28} 
              color="#667eea" 
            />
          </View>
        </TouchableOpacity>
        
        {isEmergencyExpanded && (
          <View style={styles.infoCard}>
            {renderEditableField('emergencyContactName', 'person-add-outline', 'Emergency Contact Name', userDetails.emergencyContactName)}
            {renderEditableField('emergencyContactNumber', 'call-outline', 'Emergency Contact Number', userDetails.emergencyContactNumber)}
          </View>
        )}
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Account Actions</Text>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="log-out-outline" size={22} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Location Attendance v3.0</Text>
        <Text style={styles.footerSubtext}>Location-Based Attendance System</Text>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Edit {editField && getFieldLabel(editField)}
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>
                {editField && getFieldLabel(editField)}
              </Text>
              <TextInput
                style={[styles.input, editField === 'address' && styles.textArea]}
                value={editValue}
                onChangeText={setEditValue}
                placeholder={`Enter ${editField && getFieldLabel(editField).toLowerCase()}`}
                multiline={editField === 'address'}
                numberOfLines={editField === 'address' ? 3 : 1}
                keyboardType={
                  editField === 'phoneNumber' || editField === 'emergencyContactNumber' 
                    ? 'phone-pad' 
                    : 'default'
                }
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveField}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  profileIconContainer: {
    marginBottom: 15,
  },
  profileIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#667eea',
  },
  headerName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  badgeIcon: {
    marginRight: 6,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionHeaderCollapseable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  chevronContainer: {
    padding: 4,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  placeholderText: {
    color: '#bbb',
    fontStyle: 'italic',
  },
  editButton: {
    padding: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 15,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    gap: 10,
  },
  logoutText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#bbb',
    marginTop: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#667eea',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
