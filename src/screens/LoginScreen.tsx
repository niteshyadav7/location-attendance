import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Modal,
  Share,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { validateEmail, validatePassword, getPasswordStrengthColor, getPasswordStrengthText } from '../utils/validation';
import { COLORS } from '../constants/theme';
import { getVersion } from 'react-native-device-info';

const { width } = Dimensions.get('window');

export const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | 'very-strong'>('weak');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // MULTI-TENANCY STATE
  const [signupType, setSignupType] = useState<'create_org' | 'join_org'>('create_org');
  const [signupView, setSignupView] = useState<'selection' | 'form'>('selection');
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [createdOrgCode, setCreatedOrgCode] = useState('');

    const { login, signupAsCompanyAdmin, signupAsUser, requestDeviceReset, sendPasswordReset, loading } = useAuth();
  const [deviceMismatchUid, setDeviceMismatchUid] = useState<string | null>(null);
  
  // Forgot Password State
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = async () => {
    setEmailError('');
    setPasswordError('');

    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || 'Invalid email');
      Alert.alert('Invalid Email', emailValidation.error);
      return;
    }

    try {
      await login(email.trim(), password);
    } catch (error: any) {
      if (error.message && error.message.startsWith('DEVICE_MISMATCH')) {
          // Parse: DEVICE_MISMATCH||<uid>||<name>||<orgId>
          const parts = error.message.split('||');
          const uid = parts[1];
          const userName = parts[2] || 'User';
          const userOrgId = parts[3] || 'default-org';
          
          // Show alert with Request option
          Alert.alert(
              'Device Mismatch',
              'You are attempting to login from a device that is not registered to your account.\n\nAttendance can only be marked from your registered device.',
              [
                  { 
                      text: 'Cancel', 
                      style: 'cancel',
                      onPress: async () => {
                          // Force sign out if they cancel
                          const { getAuth } = require('@react-native-firebase/auth');
                          await getAuth().signOut();
                      }
                  },
                  { 
                      text: 'Request Device Change', 
                      onPress: async () => {
                          try {
                              await requestDeviceReset(uid, userName, userOrgId);
                              Alert.alert('Request Sent', 'Your admin has been notified. You can login once they approve the device change.');
                          } catch (reqError) {
                              Alert.alert('Error', 'Failed to send request.');
                          }
                      }
                  }
              ]
          );
      } else {
        Alert.alert('Login Failed', error.message);
      }
    }
  };

  const handleSignUp = async () => {
    setEmailError('');
    setPasswordError('');

    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Organization validation
    if (signupType === 'create_org' && !orgName.trim()) {
        Alert.alert('Error', 'Please enter your Organization/Company Name');
        return;
    }
    if (signupType === 'join_org' && !orgCode.trim()) {
        Alert.alert('Error', 'Please enter the Organization Code');
        return;
    }

    if (name.trim().length < 2) {
      Alert.alert('Invalid Name', 'Please enter your full name (at least 2 characters)');
      return;
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || 'Invalid email');
      Alert.alert('Invalid Email', emailValidation.error);
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error || 'Invalid password');
      let errorMessage = passwordValidation.error || 'Invalid password';
      if (passwordValidation.suggestions && passwordValidation.suggestions.length > 0) {
        errorMessage += '\n\nSuggestions:\n• ' + passwordValidation.suggestions.join('\n• ');
      }
      Alert.alert('Weak Password', errorMessage);
      return;
    }

    try {
      if (signupType === 'create_org') {
          const result = await signupAsCompanyAdmin(
              name.trim(), 
              email.trim(), 
              password, 
              orgName.trim(), 
              email.trim() // Use admin email as org email for now
          );
          setCreatedOrgCode(result.organizationCode || '');
      } else {
          await signupAsUser(
              name.trim(),
              email.trim(),
              password,
              orgCode.trim()
          );
          setCreatedOrgCode(''); // No code generated for joiner
      }
      
      setEmail('');
      setPassword('');
      setName('');
      setOrgName('');
      setOrgCode('');
      setEmailError('');
      setPasswordError('');
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setName('');
    setEmailError('');
    setPasswordError('');
    // Reset specific fields
    setOrgName('');
    setOrgCode('');
    setSignupView('selection');
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError('');
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setPasswordError('');
    if (isSignUp && text.length > 0) {
      const validation = validatePassword(text);
      setPasswordStrength(validation.strength);
    }
  };

  const copyToClipboard = async () => {
      if (createdOrgCode) {
          try {
              await Share.share({
                  message: `Join my organization on GeoAttendance! Use code: ${createdOrgCode}`,
              });
          } catch (error) {
              // ignore
          }
      }
  };

  return (
    <LinearGradient
      colors={COLORS.gradients.primary}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <View style={styles.iconCircle}>
              <Icon name="location" size={isSignUp ? 40 : 60} color={COLORS.white} />
            </View>
            <Text style={[styles.title, isSignUp && { fontSize: 28 }]}>GeoAttendance</Text>
            {!isSignUp && <Text style={styles.subtitle}>Track attendance with precision</Text>}
          </View>

          <View style={styles.card}>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, !isSignUp && styles.activeTab]}
                onPress={() => isSignUp && toggleMode()}
              >
                <Text style={[styles.tabText, !isSignUp && styles.activeTabText]}>
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, isSignUp && styles.activeTab]}
                onPress={() => !isSignUp && toggleMode()}
              >
                <Text style={[styles.tabText, isSignUp && styles.activeTabText]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {isSignUp && (
              <>
                {signupView === 'selection' ? (
                  <View style={styles.selectionContainer}>
                    
                    <TouchableOpacity 
                      style={styles.selectionCard}
                      onPress={() => {
                        setSignupType('create_org');
                        setSignupView('form');
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.selectionIconBox, { backgroundColor: '#E0F2FE' }]}>
                        <Icon name="business" size={32} color={COLORS.primary} />
                      </View>
                      <View style={{flex: 1}}>
                         <Text style={styles.selectionCardTitle}>Create New Company</Text>
                         <Text style={styles.selectionCardSubtitle}>Register your organization and invite employees.</Text>
                      </View>
                      <Icon name="chevron-forward" size={24} color="#9CA3AF" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.selectionCard}
                      onPress={() => {
                        setSignupType('join_org');
                        setSignupView('form');
                      }}
                      activeOpacity={0.7}
                    >
                       <View style={[styles.selectionIconBox, { backgroundColor: '#F0FDF4' }]}>
                        <Icon name="people" size={32} color="#16A34A" />
                      </View>
                      <View style={{flex: 1}}>
                         <Text style={styles.selectionCardTitle}>Join Existing Company</Text>
                         <Text style={styles.selectionCardSubtitle}>Join using an organization code provided to you.</Text>
                      </View>
                      <Icon name="chevron-forward" size={24} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity 
                      style={styles.backOptionButton} 
                      onPress={() => setSignupView('selection')}
                    >
                      <Icon name="arrow-back" size={16} color={COLORS.text.light} />
                      <Text style={styles.backOptionText}>
                        {signupType === 'create_org' ? 'Creating Company' : 'Joining Company'} (Change)
                      </Text>
                    </TouchableOpacity>

                    {signupType === 'create_org' ? (
                        <View style={styles.inputContainer}>
                            <Icon name="briefcase-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                            <TextInput
                            style={styles.input}
                            placeholder="Company Name"
                            value={orgName}
                            onChangeText={setOrgName}
                            autoCapitalize="words"
                            placeholderTextColor={COLORS.text.light}
                            />
                        </View>
                    ) : (
                        <View style={styles.inputContainer}>
                            <Icon name="key-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                            <TextInput
                            style={styles.input}
                            placeholder="Organization Code"
                            value={orgCode}
                            onChangeText={(text) => setOrgCode(text.toUpperCase())}
                            autoCapitalize="characters"
                            maxLength={6}
                            placeholderTextColor={COLORS.text.light}
                            />
                        </View>
                    )}

                    <View style={styles.divider} />
                    
                    <View style={styles.inputContainer}>
                      <Icon name="person-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Full Name"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        placeholderTextColor={COLORS.text.light}
                      />
                    </View>
                  </>
                )}
              </>
            )}

            {(!isSignUp || signupView === 'form') && (
              <>
                <View>
                  <View style={[styles.inputContainer, emailError ? styles.inputError : null]}>
                    <Icon name="mail-outline" size={20} color={emailError ? COLORS.status.offline : COLORS.primary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email Address"
                      value={email}
                      onChangeText={handleEmailChange}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholderTextColor={COLORS.text.light}
                    />
                    {emailError && <Icon name="alert-circle" size={20} color={COLORS.status.offline} />}
                  </View>
                  {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                </View>

                <View>
                  <View style={[styles.inputContainer, passwordError ? styles.inputError : null]}>
                    <Icon name="lock-closed-outline" size={20} color={passwordError ? COLORS.status.offline : COLORS.primary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      value={password}
                      onChangeText={handlePasswordChange}
                      secureTextEntry={!showPassword}
                      placeholderTextColor={COLORS.text.light}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      <Icon
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={20}
                        color={COLORS.text.light}
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                  
                  {isSignUp && password.length > 0 && !passwordError && (
                    <View style={styles.strengthContainer}>
                      <View style={styles.strengthBar}>
                        <View 
                          style={[
                            styles.strengthFill, 
                            { 
                              width: passwordStrength === 'weak' ? '25%' : 
                                     passwordStrength === 'medium' ? '50%' : 
                                     passwordStrength === 'strong' ? '75%' : '100%',
                              backgroundColor: getPasswordStrengthColor(passwordStrength)
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.strengthText, { color: getPasswordStrengthColor(passwordStrength) }]}>
                        {getPasswordStrengthText(passwordStrength)}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.button}
                  onPress={isSignUp ? handleSignUp : handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={COLORS.gradients.primary}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <View style={styles.buttonContent}>
                        <Text style={styles.buttonText}>
                          {isSignUp ? (signupType === 'create_org' ? 'Create Company' : 'Join Company') : 'Login'}
                        </Text>
                        <Icon name="arrow-forward" size={20} color={COLORS.white} />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {!isSignUp && (
              <TouchableOpacity
                onPress={() => setShowForgotPasswordModal(true)}
                style={styles.forgotPasswordContainer}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={toggleMode}
              style={styles.toggleContainer}
            >
              <Text style={styles.toggleText}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={styles.toggleLink}>
                  {isSignUp ? 'Login' : 'Sign Up'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.footer}>
                Secure • Reliable • Accurate
            </Text>
            <Text style={[styles.footer, { fontSize: 10, marginTop: 4, opacity: 0.7 }]}>
                v{getVersion()}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          setIsSignUp(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={COLORS.gradients.primary}
              style={styles.modalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.successIconContainer}>
                <View style={styles.successIconCircle}>
                  <Icon name="checkmark-circle" size={80} color={COLORS.status.working} />
                </View>
              </View>

              <Text style={styles.modalTitle}>Success!</Text>

              <View style={styles.modalMessageContainer}>
                <Text style={styles.modalMessage}>
                  {createdOrgCode 
                    ? 'Your company has been created successfully.' 
                    : 'Your account has been request sent successfully.'}
                </Text>
                
                {createdOrgCode ? (
                    <View style={styles.codeBox}>
                        <Text style={styles.codeLabel}>Your Organization Code:</Text>
                        <TouchableOpacity style={styles.codeContainer} onPress={copyToClipboard}>
                            <Text style={styles.codeText}>{createdOrgCode}</Text>
                            <Icon name="share-social-outline" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                <Text style={styles.codeInstruction}>Share this code with your employees.</Text>
                        <Text style={[styles.codeInstruction, { marginTop: 10, color: '#F59E0B', fontWeight: 'bold' }]}>
                            Note: Your account is pending Super Admin approval. You cannot login until approved.
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.modalSubMessage}>
                    Your account is pending admin approval. You will be able to login once approved.
                    </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  setIsSignUp(false);
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={COLORS.gradients.working}
                  style={styles.modalButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.modalButtonText}>Go to Login</Text>
                  <Icon name="arrow-forward" size={20} color={COLORS.white} />
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowForgotPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={COLORS.gradients.primary}
              style={styles.modalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.successIconContainer}>
                <View style={styles.successIconCircle}>
                  <Icon name="key" size={60} color={COLORS.primary} />
                </View>
              </View>

              <Text style={styles.modalTitle}>Reset Password</Text>

              <View style={styles.modalMessageContainer}>
                <Text style={styles.modalMessage}>
                  Enter your email address and we'll send you a link to reset your password.
                </Text>
                
                <View style={[styles.inputContainer, { marginTop: 20, backgroundColor: 'rgba(255,255,255,0.9)' }]}>
                  <Icon name="mail-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor={COLORS.text.light}
                  />
                </View>
              </View>

              <View style={{ gap: 12, width: '100%', marginTop: 10 }}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={async () => {
                    if (!resetEmail.trim()) {
                      Alert.alert('Error', 'Please enter your email address');
                      return;
                    }
                    try {
                      await sendPasswordReset(resetEmail.trim());
                      Alert.alert('Success', 'Password reset email sent! Please check your inbox.');
                      setShowForgotPasswordModal(false);
                      setResetEmail('');
                    } catch (error: any) {
                      Alert.alert('Error', error.message);
                    }
                  }}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={COLORS.gradients.working}
                    style={styles.modalButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                      <>
                        <Icon name="send" size={20} color={COLORS.white} />
                        <Text style={styles.modalButtonText}>Send Reset Link</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, { 
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    borderWidth: 2,
                    borderColor: '#EF4444',
                  }]}
                  onPress={() => {
                    setShowForgotPasswordModal(false);
                    setResetEmail('');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.modalButtonGradient, { backgroundColor: 'transparent' }]}>
                    <Icon name="close-circle" size={20} color="#EF4444" />
                    <Text style={[styles.modalButtonText, { color: '#EF4444' }]}>Cancel</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: { alignItems: 'center', marginBottom: 30 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '400',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 25,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  activeTab: {
    backgroundColor: COLORS.white,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: { fontSize: 16, fontWeight: '600', color: COLORS.text.light },
  activeTabText: { color: COLORS.primary },
  
  // Selection Styles
  selectionContainer: {
    marginBottom: 25,
    gap: 16,
  },
  selectionTitle: { // Kept for reference, though unused in current view
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 5,
  },
  selectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  selectionIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionCardTitle: {
    fontSize: 18, // Larger font
    fontWeight: '700',
    color: '#1F2937', // Darker text
    marginBottom: 4,
  },
  selectionCardSubtitle: {
    fontSize: 13,
    color: '#6B7280', // Cooler gray
    lineHeight: 18,
  },
  backOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 30,
  },
  backOptionText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  
  // Signup Type Styles - Kept for reference but strictly unused if we switched fully
  typeContainer: {
     flexDirection: 'row',
     gap: 10,
     marginBottom: 20,
  },
  typeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: COLORS.text.light,
      gap: 5,
  },
  activeTypeButton: {
      borderColor: COLORS.primary,
      backgroundColor: '#F0F9FF',
  },
  typeText: {
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.text.light,
  },
  activeTypeText: {
      color: COLORS.primary,
  },
  divider: {
      height: 1,
      backgroundColor: '#E5E7EB',
      marginBottom: 20, // Increased spacing
      marginTop: 5,
  },
  // Inputs
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB', // Slightly gray background
    borderRadius: 16,
    marginBottom: 16, // Increased spacing
    paddingHorizontal: 16,
    paddingVertical: 4, // Better vertical feel
    borderWidth: 1.5, // Slightly thicker border
    borderColor: '#F3F4F6', // Lighter border by default
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: COLORS.text.primary },
  eyeIcon: { padding: 5 },
  inputError: { borderColor: COLORS.status.offline, borderWidth: 2 },
  errorText: { color: COLORS.status.offline, fontSize: 12, marginTop: 5, marginBottom: 10, marginLeft: 15 },
  strengthContainer: { marginTop: 8, marginBottom: 10 },
  strengthBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 5,
  },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthText: { fontSize: 12, fontWeight: '600', textAlign: 'right' },
  button: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  forgotPasswordContainer: { alignItems: 'center', paddingVertical: 8, marginBottom: 5 },
  forgotPasswordText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  toggleContainer: { alignItems: 'center', paddingVertical: 10 },
  toggleText: { fontSize: 14, color: COLORS.text.secondary },
  toggleLink: { color: COLORS.primary, fontWeight: 'bold' },
  footer: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 30,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  modalGradient: { padding: 30, alignItems: 'center' },
  successIconContainer: { marginBottom: 20 },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalMessageContainer: { marginBottom: 20, width: '100%' },
  modalMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  modalSubMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 22,
  },
  codeBox: {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: 10,
      padding: 15,
      marginTop: 10,
      alignItems: 'center',
  },
  codeLabel: {
      fontSize: 14,
      color: COLORS.text.secondary,
      marginBottom: 5,
  },
  codeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#F3F4F6',
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderRadius: 8,
      marginBottom: 8,
  },
  codeText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: COLORS.primary,
      letterSpacing: 2,
  },
  codeInstruction: {
      fontSize: 12,
      color: COLORS.text.light,
      textAlign: 'center',
  },
  modalButton: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: COLORS.status.working,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  modalButtonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  footerContainer: {
      marginTop: 30,
      alignItems: 'center',
      gap: 10,
  },
  seedButton: {
      padding: 8,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 8,
  },
  seedButtonText: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 12,
      fontWeight: '600',
  },
});
