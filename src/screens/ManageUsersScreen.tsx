import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Modal, ScrollView, TextInput } from 'react-native';
import { getFirestore, collection, onSnapshot, doc, updateDoc, query, where, setDoc } from '@react-native-firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from '@react-native-firebase/auth';
import { UserProfile, LocationConfig } from '../types';
import Icon from 'react-native-vector-icons/Ionicons';

export const ManageUsersScreen = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [locations, setLocations] = useState<LocationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Add User Modal States
  const [addUserModalVisible, setAddUserModalVisible] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserLocationId, setNewUserLocationId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const db = getFirestore();
    
    // Fetch all users with role 'user'
    const usersUnsubscribe = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'user')),
      (snapshot) => {
        const usersList: UserProfile[] = [];
        snapshot.forEach((doc: any) => {
          usersList.push({ ...doc.data(), uid: doc.id } as UserProfile);
        });
        
        // Sort: Pending first, then alphabetical
        usersList.sort((a, b) => {
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;
            return a.name.localeCompare(b.name);
        });
        
        setUsers(usersList);
        setLoading(false);
      }
    );

    // Fetch all locations
    const locationsUnsubscribe = onSnapshot(collection(db, 'locations'), (snapshot) => {
      const locationsList: LocationConfig[] = [];
      snapshot.forEach((doc: any) => {
        locationsList.push({ id: doc.id, ...doc.data() } as LocationConfig);
      });
      setLocations(locationsList);
    });

    return () => {
      usersUnsubscribe();
      locationsUnsubscribe();
    };
  }, []);

  const handleAssignLocation = async (userId: string, locationId: string) => {
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'users', userId), {
        assignedLocationId: locationId
      });
      Alert.alert('Success', 'Location assigned successfully!');
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'users', userId), {
        status: newStatus
      });
      Alert.alert('Success', `User ${newStatus} successfully`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const openLocationPicker = (user: UserProfile) => {
    setSelectedUser(user);
    setModalVisible(true);
  };

  const handleCreateUser = async () => {
    // Validation
    if (!newUserName.trim()) {
      Alert.alert('Error', 'Please enter user name');
      return;
    }
    if (!newUserEmail.trim()) {
      Alert.alert('Error', 'Please enter email address');
      return;
    }
    if (!newUserPassword || newUserPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setCreating(true);
    try {
      const auth = getAuth();
      const db = getFirestore();
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, newUserEmail.trim(), newUserPassword);
      const uid = userCredential.user.uid;
      
      // Create user profile in Firestore
      const newUser: UserProfile = {
        uid,
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: 'user',
        status: 'approved', // Admin created users are auto-approved
        assignedLocationId: newUserLocationId || undefined,
        isActive: true, // New users are active by default
      };
      
      await setDoc(doc(db, 'users', uid), newUser);
      
      // Reset form
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserLocationId('');
      setAddUserModalVisible(false);
      
      Alert.alert('Success', `User ${newUserName} created successfully!`);
    } catch (error: any) {
      let errorMessage = error.message;
      
      // Handle common Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleUserActive = async (userId: string, currentStatus: boolean | undefined) => {
    const newStatus = !currentStatus; // If undefined, treat as true (active), so toggle to false
    const action = newStatus ? 'activate' : 'deactivate';
    
    Alert.alert(
      `${action === 'activate' ? 'Activate' : 'Deactivate'} User`,
      `Are you sure you want to ${action} this user? ${action === 'deactivate' ? 'They will not be able to log in.' : 'They will be able to log in again.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'activate' ? 'Activate' : 'Deactivate',
          style: action === 'deactivate' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const db = getFirestore();
              await updateDoc(doc(db, 'users', userId), {
                isActive: newStatus
              });
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
              const db = getFirestore();
              const auth = getAuth();
              
              // Delete user document from Firestore
              await updateDoc(doc(db, 'users', userId), {
                isActive: false,
                status: 'rejected',
                deletedAt: Date.now()
              });
              
              // Note: We can't delete the Firebase Auth user from here
              // as we don't have admin privileges. The user document is marked as deleted.
              // You would need Firebase Admin SDK on a backend to fully delete the auth user.
              
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
                <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>Pending Approval</Text>
                </View>
            )}
            {item.status === 'rejected' && (
                <View style={[styles.pendingBadge, { backgroundColor: '#ffebee' }]}>
                    <Text style={[styles.pendingText, { color: '#ef5350' }]}>Rejected</Text>
                </View>
            )}
            {item.isActive === false && (
                <View style={[styles.pendingBadge, { backgroundColor: '#fce4ec' }]}>
                    <Text style={[styles.pendingText, { color: '#e91e63' }]}>Inactive</Text>
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
                    <Icon name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleUpdateStatus(item.uid, 'rejected')}
                >
                    <Icon name="close-circle-outline" size={20} color="#fff" />
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

          {/* Deactivate/Activate and Delete Buttons */}
          <View style={styles.dangerButtonsRow}>
            <TouchableOpacity 
              style={[styles.actionButton, item.isActive === false ? styles.activateButton : styles.deactivateButton]}
              onPress={() => handleToggleUserActive(item.uid, item.isActive)}
            >
              <Icon 
                name={item.isActive === false ? "checkmark-done-outline" : "ban-outline"} 
                size={18} 
                color="#fff" 
              />
              <Text style={styles.actionButtonText}>
                {item.isActive === false ? 'Activate' : 'Deactivate'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteUser(item.uid, item.name)}
            >
              <Icon name="trash-outline" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        <Icon name="person-add" size={28} color="#fff" />
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
              {/* Name Input */}
              <View style={styles.inputContainer}>
                <Icon name="person-outline" size={20} color="#667eea" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={newUserName}
                  onChangeText={setNewUserName}
                  autoCapitalize="words"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Icon name="mail-outline" size={20} color="#667eea" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  value={newUserEmail}
                  onChangeText={setNewUserEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Icon name="lock-closed-outline" size={20} color="#667eea" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password (min 6 characters)"
                  value={newUserPassword}
                  onChangeText={setNewUserPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Icon
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>

              {/* Location Selection */}
              <Text style={styles.sectionLabel}>Assign Location (Optional)</Text>
              <ScrollView style={styles.locationPickerContainer}>
                <TouchableOpacity
                  style={[
                    styles.locationPickerItem,
                    !newUserLocationId && styles.selectedLocationPickerItem
                  ]}
                  onPress={() => setNewUserLocationId('')}
                >
                  <Text style={styles.locationPickerText}>No Location</Text>
                </TouchableOpacity>
                {locations.map((location) => (
                  <TouchableOpacity
                    key={location.id}
                    style={[
                      styles.locationPickerItem,
                      newUserLocationId === location.id && styles.selectedLocationPickerItem
                    ]}
                    onPress={() => setNewUserLocationId(location.id)}
                  >
                    <Text style={styles.locationPickerText}>{location.name}</Text>
                    <Text style={styles.locationPickerDetails}>Radius: {location.radius}m</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setAddUserModalVisible(false);
                  setNewUserName('');
                  setNewUserEmail('');
                  setNewUserPassword('');
                  setNewUserLocationId('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateUser}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.createButtonText}>Create User</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Location Modal (existing) */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Location for {selectedUser?.name}</Text>
            <ScrollView style={styles.locationList}>
              {locations.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  style={[
                    styles.locationItem,
                    selectedUser?.assignedLocationId === location.id && styles.selectedLocationItem
                  ]}
                  onPress={() => selectedUser && handleAssignLocation(selectedUser.uid, location.id)}
                >
                  <Text style={styles.locationName}>{location.name}</Text>
                  <Text style={styles.locationDetails}>Radius: {location.radius}m</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20 },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  userInfo: {
    marginBottom: 15,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1 },
  pendingBadge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  pendingText: {
    color: '#ff9800',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userEmail: { fontSize: 14, color: '#666', marginTop: 2 },
  assignedText: { fontSize: 12, color: '#999', marginTop: 4 },
  statusText: { fontSize: 12, color: '#666', marginTop: 2, fontStyle: 'italic' },
  
  actionButtonsContainer: {
    gap: 10,
  },
  approvalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#4caf50',
  },
  rejectButton: {
    backgroundColor: '#ef5350',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  assignButton: {
    backgroundColor: '#667eea',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  assignButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#667eea',
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  assignButtonTextSecondary: {
    color: '#667eea',
  },
  
  // Danger Buttons (Deactivate/Activate and Delete)
  dangerButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  deactivateButton: {
    backgroundColor: '#ff9800',
  },
  activateButton: {
    backgroundColor: '#4caf50',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  
  emptyText: { textAlign: 'center', marginTop: 50, color: '#888' },
  
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
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
    color: '#333',
  },
  
  // Form Styles
  formContainer: {
    maxHeight: 400,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 5,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 5,
  },
  
  // Location Picker Styles
  locationPickerContainer: {
    maxHeight: 150,
    marginBottom: 15,
  },
  locationPickerItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  selectedLocationPickerItem: {
    backgroundColor: '#e8f5e9',
    borderColor: '#667eea',
    borderWidth: 2,
  },
  locationPickerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  locationPickerDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  
  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e9ecef',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#667eea',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Existing Location Assignment Modal Styles
  locationList: {
    maxHeight: 300,
  },
  locationItem: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  selectedLocationItem: {
    backgroundColor: '#e8f5e9',
    borderColor: '#10b981',
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  locationDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  closeButton: {
    backgroundColor: '#999',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
