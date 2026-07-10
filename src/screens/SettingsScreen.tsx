import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, TextInput, Modal, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useUserProfile, UserDetails } from '../hooks/useUserProfile';
import { COLORS } from '../constants/theme';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useAds } from '../hooks/useAds';
import { useFeedback } from '../hooks/useFeedback';
import { useAppUpdates } from '../hooks/useAppUpdates';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);
  const organization = useAuthStore((state) => state.organization);
  const { effectiveBannerId, shouldShowAd } = useAds();
  const isCompanyAdmin = user?.role === 'company_admin';
  const showAd = isCompanyAdmin ? shouldShowAd('adminProfile') : shouldShowAd('settings');
  
  // Custom Hook
  const { userDetails, loading: fetchingDetails, updateField, logout } = useUserProfile();
  const { submitFeedback, submitting: submittingFeedback } = useFeedback();
  const { appUpdates } = useAppUpdates();
  const { changePassword, changeEmail, leaveOrganization, setPasswordForGoogleUser, reauthenticateUser } = useAuth();

  // User auth details for provider check
  const currentUser = getAuth().currentUser;
  const isGoogleUser = currentUser?.providerData.some(p => p.providerId === 'google.com');
  const hasPasswordProvider = currentUser?.providerData.some(p => p.providerId === 'password');
  const isGoogleOnly = isGoogleUser && !hasPasswordProvider;

  // Local State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState<keyof UserDetails | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  
  // App Update State
  const [showAppUpdateModal, setShowAppUpdateModal] = useState(false);
  const [selectedAppUpdate, setSelectedAppUpdate] = useState<any>(null);
  
  // Change Password State
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Change Email State
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthLoading, setReauthLoading] = useState(false);

  // Set Password State (Google-only users)
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [googlePasswordInput, setGooglePasswordInput] = useState('');
  const [googleConfirmPasswordInput, setGoogleConfirmPasswordInput] = useState('');
  const [settingGooglePassword, setSettingGooglePassword] = useState(false);

  // Leave Organization State
  const [showLeaveOrgModal, setShowLeaveOrgModal] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  
  // Auto Checkout State
  const [showAutoCheckoutModal, setShowAutoCheckoutModal] = useState(false);
  const [autoCheckoutHours, setAutoCheckoutHours] = useState('7');
  const [savingAutoCheckout, setSavingAutoCheckout] = useState(false);
  
  // Cutoff Time State
  const [showCutoffModal, setShowCutoffModal] = useState(false);
  const [cutoffHourInput, setCutoffHourInput] = useState('19'); // Default 7 PM
  const [savingCutoff, setSavingCutoff] = useState(false);
  
  // Collapseable section states
  const [isBasicInfoExpanded, setIsBasicInfoExpanded] = useState(true);
  const [isProfessionalExpanded, setIsProfessionalExpanded] = useState(false);
  const [isPersonalExpanded, setIsPersonalExpanded] = useState(false);
  const [isEmergencyExpanded, setIsEmergencyExpanded] = useState(false);

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
              await logout();
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
    if (!editField) return;

    setSaving(true);
    try {
      await updateField(editField, editValue);
      Alert.alert('Success', 'Details updated successfully');
      setShowEditModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };



  const handleOpenAppUpdate = (update: any) => {
    setSelectedAppUpdate(update);
    setShowAppUpdateModal(true);
  };

  const handleOpenPlayStore = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open Play Store link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open Play Store');
    }
  };

  const [autoCheckoutHoursInput, setAutoCheckoutHoursInput] = useState('7');
  const [autoCheckoutMinutesInput, setAutoCheckoutMinutesInput] = useState('0');

  const handleOpenAutoCheckout = () => {
    const currentSettings = organization?.autoCheckoutHours || 7;
    const h = Math.floor(currentSettings);
    const m = Math.round((currentSettings - h) * 60);
    setAutoCheckoutHoursInput(String(h));
    setAutoCheckoutMinutesInput(String(m));
    setShowAutoCheckoutModal(true);
  };

  const handleSaveAutoCheckout = async () => {
    if (!organization?.id) return;
    
    const h = parseInt(autoCheckoutHoursInput || '0', 10);
    const m = parseInt(autoCheckoutMinutesInput || '0', 10);
    
    if (isNaN(h) || isNaN(m) || h < 0 || m < 0 || m > 59) {
        Alert.alert('Invalid Input', 'Please enter valid hours and minutes.');
        return;
    }
    
    // Convert to decimal hours (e.g. 7h 30m -> 7.5)
    const decimalHours = h + (m / 60);

    setSavingAutoCheckout(true);
    try {
        await firestore().collection('organizations').doc(organization.id).update({
            autoCheckoutHours: decimalHours
        });
        
        Alert.alert('Success', 'Auto Check-Out hours updated successfully.');
        setShowAutoCheckoutModal(false);
    } catch (error: any) {
        Alert.alert('Error', 'Failed to update settings: ' + error.message);
    } finally {
        setSavingAutoCheckout(false);
    }
  };

  const handleOpenCutoffModal = () => {
      const current = organization?.autoCheckoutCutoffHour || 19;
      setCutoffHourInput(String(current));
      setShowCutoffModal(true);
  };

  const handleSaveCutoffTime = async () => {
      if (!organization?.id) return;
      const h = parseInt(cutoffHourInput, 10);
      
      if (isNaN(h) || h < 0 || h > 23) {
          Alert.alert('Invalid Input', 'Please enter a valid hour (0-23).');
          return;
      }
      
      setSavingCutoff(true);
      try {
          await firestore().collection('organizations').doc(organization.id).update({
              autoCheckoutCutoffHour: h
          });
          Alert.alert('Success', 'Daily Cutoff Time updated.');
          setShowCutoffModal(false);
      } catch (error: any) {
          Alert.alert('Error', error.message);
      } finally {
          setSavingCutoff(false);
      }
  };

  const handleSaveEmail = async (emailToSave: string) => {
    setUpdatingEmail(true);
    try {
      await changeEmail(emailToSave.trim().toLowerCase());
      Alert.alert('Success', 'Email address updated successfully.');
      setShowChangeEmailModal(false);
      setNewEmailInput('');
    } catch (error: any) {
      if (error.message === 'REQUIRES_REAUTH') {
        setShowReauthModal(true);
      } else {
        Alert.alert('Error', error.message || 'Failed to change email.');
      }
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handleReauthSubmit = async () => {
    setReauthLoading(true);
    try {
      await reauthenticateUser(reauthPassword, undefined);
      setShowReauthModal(false);
      setReauthPassword('');
      await handleSaveEmail(newEmailInput);
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Incorrect password.');
    } finally {
      setReauthLoading(false);
    }
  };

  const handleGoogleReauth = async () => {
    setReauthLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();
      if (signInResult.type !== 'success') {
        throw new Error('Google Sign-In was cancelled or failed.');
      }
      const idToken = signInResult.data.idToken;
      if (!idToken) throw new Error('No ID Token received from Google Sign-In.');

      await reauthenticateUser(undefined, idToken);
      setShowReauthModal(false);
      await handleSaveEmail(newEmailInput);
    } catch (error: any) {
      Alert.alert('Google Verification Failed', error.message || 'Could not verify.');
    } finally {
      setReauthLoading(false);
    }
  };

  const handleLeaveOrganization = () => {
    if (!organization) return;
    if (user?.status === 'leave_pending') {
      Alert.alert('Already Requested', 'Your leave request is already pending admin approval.');
      return;
    }
    setLeaveReason('');
    setShowLeaveOrgModal(true);
  };

  const handleSubmitLeaveRequest = async () => {
    if (!leaveReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for leaving the organization.');
      return;
    }
    setSubmittingLeave(true);
    try {
      await leaveOrganization(leaveReason.trim());
      setShowLeaveOrgModal(false);
      setLeaveReason('');
      Alert.alert(
        'Request Submitted',
        `Your request to leave ${organization?.name} has been submitted. You will be notified once the admin approves or rejects your request.`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit leave request.');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleSetPasswordSubmit = async () => {
    if (!googlePasswordInput || !googleConfirmPasswordInput) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (googlePasswordInput !== googleConfirmPasswordInput) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (googlePasswordInput.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    setSettingGooglePassword(true);
    try {
      await setPasswordForGoogleUser(googlePasswordInput);
      Alert.alert('Success', 'Password created successfully! You can now log in with email/password too.');
      setShowSetPasswordModal(false);
      setGooglePasswordInput('');
      setGoogleConfirmPasswordInput('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to set password.');
    } finally {
      setSettingGooglePassword(false);
    }
  };

  const getFieldLabel = (field: keyof UserDetails) => {
    const labels: Record<string, string> = {
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

  const getRoleBadgeColor = () => {
    if (user?.role === 'super_admin') return '#7c3aed'; // Violet
    if (user?.role === 'company_admin') return COLORS.primary;
    return COLORS.status.working;
  };

  const getRoleIcon = () => {
    if (user?.role === 'super_admin' || user?.role === 'company_admin') return 'shield-checkmark';
    return 'person';
  };
  const renderEditableField = (field: keyof UserDetails, icon: string, label: string, value?: string) => (
    <View>
      <View style={styles.infoRow}>
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
          <Icon name="create-outline" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />
    </View>
  );

  if (fetchingDetails) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
      <ScrollView showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={COLORS.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.profileIconContainer}>
              <View style={styles.profileIcon}>
                <Text style={styles.avatarText}>{user?.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor() }]}>
                <Icon name={getRoleIcon()} size={12} color={COLORS.white} style={styles.badgeIcon} />
                <Text style={styles.roleBadgeText}>
                  {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'company_admin' ? 'Company Admin' : 'Employee'}
                </Text>
              </View>
            </View>
            <Text style={styles.headerName}>{user?.name}</Text>
            <Text style={styles.headerEmail}>{user?.email}</Text>
          </View>
        </LinearGradient>
      </View>

      {/* App Update Alert */}
      {appUpdates.filter(u => u.isActive).map((update) => (
        <TouchableOpacity
          key={update.id}
          style={styles.updateAlert}
          onPress={() => handleOpenAppUpdate(update)}
          activeOpacity={0.9}
        >
          <View style={styles.updateIconContainer}>
             <Icon name="alert-circle" size={24} color={COLORS.white} />
          </View>
          <View style={{flex: 1}}>
             <Text style={styles.updateTitle}>Update Available</Text>
             <Text style={styles.updateMessage} numberOfLines={1}>{update.title}</Text>
          </View>
          <Icon name="chevron-forward" size={24} color={COLORS.white} />
        </TouchableOpacity>
      ))}

      {/* Basic Information */}
      <View style={styles.sectionContainer}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setIsBasicInfoExpanded(!isBasicInfoExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIcon, { backgroundColor: '#E0F2FE' }]}>
              <Icon name="person" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Basic Information</Text>
          </View>
          <Icon 
            name={isBasicInfoExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={COLORS.text.light} 
          />
        </TouchableOpacity>
        
        {isBasicInfoExpanded && (
          <View style={styles.cardContent}>
            <View style={styles.infoRow}>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{user?.name}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>

              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Account Type</Text>
                <Text style={styles.infoValue}>
                  {user?.role === 'super_admin' ? 'Super Administrator' : user?.role === 'company_admin' ? 'Company Administrator' : 'Standard User'}
                </Text>
              </View>
            </View>

            {organization && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Organization Name</Text>
                    <Text style={styles.infoValue}>{organization.name}</Text>
                  </View>
                </View>
              </>
            )}

            {isCompanyAdmin && organization && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Organization Code (Share to Join)</Text>
                    <Text style={[styles.infoValue, { color: COLORS.primary, fontWeight: 'bold', fontSize: 18, letterSpacing: 1 }]}>
                      {organization.code}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => {
                        Alert.alert('Organization Code Copied', organization.code);
                    }}
                    style={{ padding: 8 }}
                  >
                     <Icon name="copy-outline" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Organization ID</Text>
                    <Text style={[styles.infoValue, { fontSize: 13, color: COLORS.text.secondary }]}>{organization.id}</Text>
                  </View>
                </View>
              </>
            )}

            {user?.assignedLocationId && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>

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
      <View style={styles.sectionContainer}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setIsProfessionalExpanded(!isProfessionalExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
             <View style={[styles.sectionIcon, { backgroundColor: '#F3E8FF' }]}>
              <Icon name="briefcase" size={20} color="#9333EA" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Professional Info</Text>
              <Text style={styles.sectionSubtitle}>Employee details and role</Text>
            </View>
          </View>
          <Icon 
            name={isProfessionalExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={COLORS.text.light} 
          />
        </TouchableOpacity>
        
        {isProfessionalExpanded && (
          <View style={styles.cardContent}>
            {renderEditableField('employeeId', 'card-outline', 'Employee ID', userDetails.employeeId)}
            {renderEditableField('designation', 'ribbon-outline', 'Designation', userDetails.designation)}
            {renderEditableField('department', 'business-outline', 'Department', userDetails.department)}
            {renderEditableField('managerName', 'people-outline', 'Manager', userDetails.managerName)}
            {renderEditableField('workShift', 'time-outline', 'Work Shift', userDetails.workShift)}
            
            <View style={{marginTop: 5}}>
               <View style={styles.infoRow}>
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
                  <Icon name="create-outline" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Personal Information */}
      <View style={styles.sectionContainer}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setIsPersonalExpanded(!isPersonalExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIcon, { backgroundColor: '#DCFCE7' }]}>
              <Icon name="call" size={20} color="#16A34A" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Personal Info</Text>
              <Text style={styles.sectionSubtitle}>Contact and personal details</Text>
            </View>
          </View>
          <Icon 
            name={isPersonalExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={COLORS.text.light} 
          />
        </TouchableOpacity>
        
        {isPersonalExpanded && (
          <View style={styles.cardContent}>
            {renderEditableField('phoneNumber', 'call-outline', 'Phone Number', userDetails.phoneNumber)}
            {renderEditableField('dateOfBirth', 'calendar-outline', 'Date of Birth', userDetails.dateOfBirth)}
            {renderEditableField('gender', 'male-female-outline', 'Gender', userDetails.gender)}
            {renderEditableField('bloodGroup', 'water-outline', 'Blood Group', userDetails.bloodGroup)}
            
            <View style={{marginTop: 5}}>
               <View style={styles.infoRow}>
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
                  <Icon name="create-outline" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Emergency Contact */}
      <View style={styles.sectionContainer}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setIsEmergencyExpanded(!isEmergencyExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FEE2E2' }]}>
               <Icon name="alert-circle" size={20} color="#DC2626" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
              <Text style={styles.sectionSubtitle}>In case of emergency</Text>
            </View>
          </View>
          <Icon 
            name={isEmergencyExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={COLORS.text.light} 
          />
        </TouchableOpacity>
        
        {isEmergencyExpanded && (
          <View style={styles.cardContent}>
            {renderEditableField('emergencyContactName', 'person-add-outline', 'Contact Name', userDetails.emergencyContactName)}
            {renderEditableField('emergencyContactNumber', 'call-outline', 'Contact Number', userDetails.emergencyContactNumber)}
          </View>
        )}
      </View>

      {/* Organization Settings (Admin Only) */}
      {isCompanyAdmin && (
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                    <View style={[styles.sectionIcon, { backgroundColor: '#F0F9FF' }]}>
                        <Icon name="business" size={20} color="#0EA5E9" />
                    </View>
                    <View>
                        <Text style={styles.sectionTitle}>Organization Settings</Text>
                        <Text style={styles.sectionSubtitle}>Manage company policies</Text>
                    </View>
                </View>
            </View>
            <View style={styles.cardContent}>
                 <TouchableOpacity 
                    onPress={handleOpenAutoCheckout}
                    activeOpacity={0.7}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 12,
                        paddingHorizontal: 4
                    }}
                 >
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                        <View style={{
                            width: 40, 
                            height: 40, 
                            borderRadius: 20, 
                            backgroundColor: '#E0F2FE', 
                            justifyContent: 'center', 
                            alignItems: 'center'
                        }}>
                             <Icon name="timer-outline" size={22} color="#0284C7" />
                        </View>
                        <View>
                             <Text style={{color: COLORS.text.primary, fontSize: 15, fontWeight: '500'}}>Shift Duration (Max)</Text>
                             <Text style={{color: COLORS.text.secondary, fontSize: 12, marginTop: 1}}>Target working hours (e.g. 7h)</Text>
                        </View>
                    </View>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                        <Text style={{color: COLORS.primary, fontWeight: '600'}}>{String(Math.floor(organization?.autoCheckoutHours || 7))}h {Math.round(((organization?.autoCheckoutHours || 7) % 1) * 60)}m</Text>
                        <Icon name="chevron-forward" size={16} color={COLORS.text.light} />
                    </View>
                 </TouchableOpacity>

                 <View style={styles.divider} />

                 <TouchableOpacity 
                    onPress={handleOpenCutoffModal}
                    activeOpacity={0.7}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 12,
                        paddingHorizontal: 4
                    }}
                 >
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                        <View style={{
                            width: 40, 
                            height: 40, 
                            borderRadius: 20, 
                            backgroundColor: '#FEE2E2', 
                            justifyContent: 'center', 
                            alignItems: 'center'
                        }}>
                             <Icon name="stop-circle-outline" size={22} color="#DC2626" />
                        </View>
                        <View>
                             <Text style={{color: COLORS.text.primary, fontSize: 15, fontWeight: '500'}}>Daily Cutoff Time</Text>
                             <Text style={{color: COLORS.text.secondary, fontSize: 12, marginTop: 1}}>Hard limit for auto-checkout</Text>
                        </View>
                    </View>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                        <Text style={{color: '#DC2626', fontWeight: '600'}}>
                            {(() => {
                                const h = organization?.autoCheckoutCutoffHour || 19;
                                const ampm = h >= 12 ? 'PM' : 'AM';
                                const h12 = h % 12 || 12;
                                return `${h12}:00 ${ampm}`;
                            })()}
                        </Text>
                        <Icon name="chevron-forward" size={16} color={COLORS.text.light} />
                    </View>
                 </TouchableOpacity>
            </View>
        </View>
      )}

      {/* Account Actions */}
      <View style={styles.actionsContainer}>
        {!isCompanyAdmin && user?.role !== 'super_admin' && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#EEF2FF', borderColor: COLORS.primary }]} 
            onPress={() => navigation.navigate('JobProfile')}
            activeOpacity={0.8}
          >
            <Icon name="briefcase-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.feedbackButtonText, { color: COLORS.primary }]}>Hiring & Job Profile</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.actionButton, styles.walletButton]} 
          onPress={() => navigation.navigate('MoneyManagement')}
          activeOpacity={0.8}
        >
          <Icon name="wallet-outline" size={20} color="#059669" />
          <Text style={styles.walletButtonText}>Wallet & Advances</Text>
        </TouchableOpacity>

        {/* Change Email Action */}
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#F0FDF4', borderColor: '#16A34A', borderWidth: 1 }]} 
          onPress={() => setShowChangeEmailModal(true)}
          activeOpacity={0.8}
        >
          <Icon name="mail-outline" size={20} color="#16A34A" />
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#16A34A', marginLeft: 12 }}>Change Email</Text>
        </TouchableOpacity>

        {/* Leave Organization Action */}
        {!isCompanyAdmin && user?.role !== 'super_admin' && user?.organizationId ? (
          <TouchableOpacity 
            style={[styles.actionButton, { 
              backgroundColor: user?.status === 'leave_pending' ? '#FFF7ED' : '#FEF2F2', 
              borderColor: user?.status === 'leave_pending' ? '#F59E0B' : '#EF4444', 
              borderWidth: 1 
            }]} 
            onPress={handleLeaveOrganization}
            activeOpacity={0.8}
          >
            <Icon 
              name={user?.status === 'leave_pending' ? 'time-outline' : 'exit-outline'} 
              size={20} 
              color={user?.status === 'leave_pending' ? '#F59E0B' : '#EF4444'} 
            />
            <Text style={{ fontSize: 16, fontWeight: '600', color: user?.status === 'leave_pending' ? '#F59E0B' : '#EF4444', marginLeft: 12 }}>
              {user?.status === 'leave_pending' ? 'Leave Request Pending...' : 'Leave Organization'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Change Password / Set Password */}
        {hasPasswordProvider ? (
          <TouchableOpacity 
            style={[styles.actionButton, styles.changePasswordButton]} 
            onPress={() => setShowChangePasswordModal(true)}
            activeOpacity={0.8}
          >
            <Icon name="lock-closed-outline" size={20} color="#8B5CF6" />
            <Text style={styles.changePasswordButtonText}>Change Password</Text>
          </TouchableOpacity>
        ) : isGoogleOnly ? (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#F5F3FF', borderColor: '#8B5CF6', borderWidth: 1 }]} 
            onPress={() => setShowSetPasswordModal(true)}
            activeOpacity={0.8}
          >
            <Icon name="lock-open-outline" size={20} color="#8B5CF6" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#8B5CF6', marginLeft: 12 }}>Set Password</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity 
            style={[styles.actionButton, styles.feedbackButton]} 
            onPress={() => navigation.navigate('Feedback')}
            activeOpacity={0.8}
        >
          <Icon name="chatbubble-ellipses-outline" size={20} color={COLORS.primary} />
          <Text style={styles.feedbackButtonText}>Give Feedback</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.logoutButton]} 
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Icon name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Location Attendance v3.0</Text>
        <Text style={styles.footerSubtext}>Location-Based Attendance System</Text>
      </View>

      {/* Leave Organization Reason Modal */}
      <Modal
        visible={showLeaveOrgModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLeaveOrgModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Leave Organization</Text>
              <TouchableOpacity onPress={() => setShowLeaveOrgModal(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#EF4444' }}>
                <Text style={{ color: '#991B1B', fontSize: 13, lineHeight: 18 }}>
                  ⚠️ Your leave request will be sent to the admin for approval. You will be notified once a decision is made.
                </Text>
              </View>

              <Text style={styles.inputLabel}>Reason for leaving *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={leaveReason}
                onChangeText={setLeaveReason}
                placeholder="Please explain why you want to leave this organization..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowLeaveOrgModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: '#EF4444' }, submittingLeave && { opacity: 0.6 }]}
                onPress={handleSubmitLeaveRequest}
                disabled={submittingLeave}
              >
                {submittingLeave ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                <Icon name="close" size={24} color={COLORS.text.primary} />
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
                placeholderTextColor={COLORS.text.light}
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
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>



      {/* Cutoff Time Modal */}
      <Modal
        visible={showCutoffModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCutoffModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Cutoff Time</Text>
              <TouchableOpacity onPress={() => setShowCutoffModal(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Cutoff Hour (24-hour format)</Text>
                <Text style={{fontSize: 12, color: COLORS.text.secondary, marginBottom: 8}}>
                    The hour at which auto-checkout calculation is capped (e.g., 19 for 7 PM).
                </Text>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                    <TextInput
                        style={[styles.input, {flex: 1}]}
                        value={cutoffHourInput}
                        onChangeText={setCutoffHourInput}
                        placeholder="19"
                        keyboardType="number-pad"
                        placeholderTextColor={COLORS.text.light}
                    />
                    <Text style={{fontSize: 16, fontWeight: 'bold', color: COLORS.text.primary}}>: 00</Text>
                </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowCutoffModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveCutoffTime}
                disabled={savingCutoff}
              >
                {savingCutoff ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* App Update Modal */}
      <Modal
        visible={showAppUpdateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAppUpdateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderLeftWidth: 6, borderLeftColor: '#F44336' }]}>
            <View style={styles.modalHeader}>
              <View style={{flexDirection:'row', alignItems:'center'}}>
                <Icon name="rocket-outline" size={24} color="#F44336" style={{marginRight: 10}}/>
                <Text style={[styles.modalTitle, {color: '#F44336'}]}>App Update</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAppUpdateModal(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {selectedAppUpdate && (
                <>
                  <Text style={styles.updateModalTitle}>{selectedAppUpdate.title}</Text>
                  <Text style={styles.updateModalMessage}>{selectedAppUpdate.message}</Text>
                  
                  <View style={styles.updateWarning}>
                    <Icon name="warning-outline" size={20} color="#856404" />
                    <Text style={styles.updateWarningText}>Please update to the latest version for the best experience.</Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: '#F44336' }]}
                onPress={() => {
                   if(selectedAppUpdate?.appUrl) handleOpenPlayStore(selectedAppUpdate.appUrl);
                }}
              >
                <Icon name="logo-google-playstore" size={20} color={COLORS.white} style={{marginRight: 8}}/>
                <Text style={styles.saveButtonText}>Update Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowChangePasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowChangePasswordModal(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                secureTextEntry
                placeholderTextColor={COLORS.text.light}
              />

              <Text style={[styles.inputLabel, { marginTop: 15 }]}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
                placeholderTextColor={COLORS.text.light}
              />

              <Text style={[styles.inputLabel, { marginTop: 15 }]}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
                placeholderTextColor={COLORS.text.light}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowChangePasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={async () => {
                  if (!currentPassword || !newPassword || !confirmPassword) {
                    Alert.alert('Error', 'Please fill in all fields');
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    Alert.alert('Error', 'New passwords do not match');
                    return;
                  }
                  if (newPassword.length < 6) {
                    Alert.alert('Error', 'New password must be at least 6 characters');
                    return;
                  }
                  
                  setChangingPassword(true);
                  try {
                    await changePassword(currentPassword, newPassword);
                    Alert.alert('Success', 'Password changed successfully!');
                    setShowChangePasswordModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  } catch (error: any) {
                    Alert.alert('Error', error.message);
                  } finally {
                    setChangingPassword(false);
                  }
                }}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Auto Checkout Modal */}
      <Modal
        visible={showAutoCheckoutModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAutoCheckoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Auto Check-Out Settings</Text>
              <TouchableOpacity onPress={() => setShowAutoCheckoutModal(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>
                Set the fixed working hours credited to users when they are automatically checked out at 11:00 PM.
              </Text>
              
              <Text style={[styles.inputLabel, { marginTop: 15 }]}>Fixed Working Duration</Text>
              
              <View style={{flexDirection: 'row', height: 200, marginTop: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 12, overflow: 'hidden'}}>
                  {/* Hours Scroller */}
                  <View style={{flex: 1, borderRightWidth: 1, borderRightColor: '#eee'}}>
                      <Text style={{textAlign: 'center', padding: 10, backgroundColor: '#f8fafc', color: COLORS.text.secondary, fontWeight: '600'}}>Hours</Text>
                      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingVertical: 0}}>
                          {Array.from({length: 24}, (_, i) => i).map((h) => {
                              const isSelected = parseInt(autoCheckoutHoursInput) === h;
                              return (
                                  <TouchableOpacity 
                                    key={h} 
                                    onPress={() => setAutoCheckoutHoursInput(String(h))}
                                    style={{
                                        paddingVertical: 12,
                                        alignItems: 'center',
                                        backgroundColor: isSelected ? COLORS.primary + '10' : 'transparent',
                                        borderLeftWidth: 4,
                                        borderLeftColor: isSelected ? COLORS.primary : 'transparent'
                                    }}
                                  >
                                      <Text style={{
                                          fontSize: 18, 
                                          fontWeight: isSelected ? 'bold' : '400',
                                          color: isSelected ? COLORS.primary : COLORS.text.primary
                                      }}>{h}</Text>
                                  </TouchableOpacity>
                              );
                          })}
                      </ScrollView>
                  </View>

                  {/* Minutes Scroller */}
                  <View style={{flex: 1}}>
                      <Text style={{textAlign: 'center', padding: 10, backgroundColor: '#f8fafc', color: COLORS.text.secondary, fontWeight: '600'}}>Minutes</Text>
                      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingVertical: 0}}>
                          {Array.from({length: 60}, (_, i) => i).map((m) => {
                              const isSelected = parseInt(autoCheckoutMinutesInput) === m;
                              return (
                                  <TouchableOpacity 
                                    key={m} 
                                    onPress={() => setAutoCheckoutMinutesInput(String(m))}
                                    style={{
                                        paddingVertical: 12,
                                        alignItems: 'center',
                                        backgroundColor: isSelected ? COLORS.primary + '10' : 'transparent',
                                        borderLeftWidth: 4,
                                        borderLeftColor: isSelected ? COLORS.primary : 'transparent'
                                    }}
                                  >
                                      <Text style={{
                                          fontSize: 18, 
                                          fontWeight: isSelected ? 'bold' : '400',
                                          color: isSelected ? COLORS.primary : COLORS.text.primary
                                      }}>{String(m).padStart(2, '0')}</Text>
                                  </TouchableOpacity>
                              );
                          })}
                      </ScrollView>
                  </View>
              </View>

              <Text style={styles.helperText}>Selected: {autoCheckoutHoursInput}h {autoCheckoutMinutesInput}m</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowAutoCheckoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveAutoCheckout}
                disabled={savingAutoCheckout}
              >
                {savingAutoCheckout ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Settings</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Email Modal */}
      <Modal
        visible={showChangeEmailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowChangeEmailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Email Address</Text>
              <TouchableOpacity onPress={() => setShowChangeEmailModal(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>New Email Address</Text>
              <TextInput
                style={styles.input}
                value={newEmailInput}
                onChangeText={setNewEmailInput}
                placeholder="Enter new email address"
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor={COLORS.text.light}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowChangeEmailModal(false);
                  setNewEmailInput('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={() => handleSaveEmail(newEmailInput)}
                disabled={updatingEmail}
              >
                {updatingEmail ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Update Email</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Re-authentication Modal */}
      <Modal
        visible={showReauthModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReauthModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Identity</Text>
              <TouchableOpacity onPress={() => setShowReauthModal(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>
                A recent login is required to change your email. Please verify your identity.
              </Text>
              
              {isGoogleUser ? (
                <TouchableOpacity 
                  style={[styles.saveButton, { width: '100%', paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', gap: 8 }]} 
                  onPress={handleGoogleReauth}
                  disabled={reauthLoading}
                >
                  <Icon name="logo-google" size={18} color={COLORS.white} />
                  <Text style={styles.saveButtonText}>Verify with Google</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: '100%' }}>
                  <Text style={styles.inputLabel}>Enter Account Password</Text>
                  <TextInput
                    style={styles.input}
                    value={reauthPassword}
                    onChangeText={setReauthPassword}
                    placeholder="Enter password"
                    secureTextEntry
                    placeholderTextColor={COLORS.text.light}
                  />
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowReauthModal(false);
                  setReauthPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              {!isGoogleUser && (
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleReauthSubmit}
                  disabled={reauthLoading}
                >
                  {reauthLoading ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Verify</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Set Password Modal for Google Users */}
      <Modal
        visible={showSetPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSetPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Account Password</Text>
              <TouchableOpacity onPress={() => setShowSetPasswordModal(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>
                Add password credentials to log in using email & password alongside Google.
              </Text>

              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                value={googlePasswordInput}
                onChangeText={setGooglePasswordInput}
                placeholder="Enter password (min 6 chars)"
                secureTextEntry
                placeholderTextColor={COLORS.text.light}
              />

              <Text style={[styles.inputLabel, { marginTop: 15 }]}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={googleConfirmPasswordInput}
                onChangeText={setGoogleConfirmPasswordInput}
                placeholder="Confirm password"
                secureTextEntry
                placeholderTextColor={COLORS.text.light}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowSetPasswordModal(false);
                  setGooglePasswordInput('');
                  setGoogleConfirmPasswordInput('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSetPasswordSubmit}
                disabled={settingGooglePassword}
              >
                {settingGooglePassword ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Set Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 10,
    lineHeight: 20,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.text.light,
    marginTop: 5,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  headerContainer: {
    marginBottom: 20,
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 40,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    width: '100%',
  },
  profileIconContainer: {
    marginBottom: 15,
    position: 'relative',
  },
  profileIcon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  roleBadge: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  badgeIcon: {
    marginRight: 4,
  },
  roleBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  headerName: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  sectionContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  cardContent: {
    padding: 16,
    paddingTop: 0,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.text.light,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  placeholderText: {
    color: COLORS.text.light,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  editButton: {
    padding: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  actionsContainer: {
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  feedbackButton: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.primary,
  },
  feedbackButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.text.light,
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
    backgroundColor: COLORS.white,
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
    color: COLORS.text.primary,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background,
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
    color: COLORS.text.secondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  // Update Alert Styles
  updateAlert: {
    backgroundColor: '#F44336',
    marginHorizontal: 20,
    marginTop: -25, // Overlap the header slightly
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 5,
  },
  updateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  updateTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  updateMessage: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
  },
  updateModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  updateModalMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  updateWarning: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  updateWarningText: {
    color: '#856404',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  changePasswordButton: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  changePasswordButtonText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
  walletButton: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#059669',
  },
  walletButtonText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '600',
  },
});
