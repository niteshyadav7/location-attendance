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
  Dimensions,
  Modal,
  Share,
  ToastAndroid,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { validateEmail } from '../utils/validation';
import { COLORS } from '../constants/theme';
import { getVersion } from 'react-native-device-info';

const { width } = Dimensions.get('window');

export const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Google Sign-In / Account Linking State
  const [googleLinkingEmail, setGoogleLinkingEmail] = useState('');
  const [googleLinkingIdToken, setGoogleLinkingIdToken] = useState('');
  const [googleLinkingPassword, setGoogleLinkingPassword] = useState('');
  const [showLinkingModal, setShowLinkingModal] = useState(false);
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [linkingLoading, setLinkingLoading] = useState(false);

  const {
      login,
      requestDeviceReset,
      sendPasswordReset,
      signInWithGoogle,
      linkGoogleToExisting,
      loading
  } = useAuth();
  
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
      const result = await login(email.trim(), password) as any;
      if (result && result.success) {
        if (Platform.OS === 'android') {
          ToastAndroid.show('Logged in successfully!', ToastAndroid.SHORT);
        } else {
          Alert.alert('Success', 'Logged in successfully!');
        }
      }
    } catch (error: any) {
      handleAuthError(error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithGoogle() as any;
      if (result && result.needsLinking) {
        setGoogleLinkingEmail(result.email);
        setGoogleLinkingIdToken(result.idToken);
        setGoogleLinkingPassword('');
        setShowLinkingModal(true);
      } else if (result && result.success) {
        const msg = result.isNewUser 
          ? 'Account created and logged in successfully!' 
          : 'Welcome back! Logged in successfully.';
        if (Platform.OS === 'android') {
          ToastAndroid.show(msg, ToastAndroid.SHORT);
        } else {
          Alert.alert('Success', msg);
        }
      }
    } catch (error: any) {
      handleAuthError(error);
    }
  };

  const handleLinkAccountSubmit = async () => {
    if (!googleLinkingPassword) {
      Alert.alert('Error', 'Please enter your password to link your Google account.');
      return;
    }
    setLinkingLoading(true);
    try {
      await linkGoogleToExisting(googleLinkingEmail, googleLinkingPassword, googleLinkingIdToken);
      setShowLinkingModal(false);
      Alert.alert('Success', 'Google account linked successfully! You are now logged in.');
    } catch (error: any) {
      Alert.alert('Linking Failed', error.message || 'Incorrect password or linking failed.');
    } finally {
      setLinkingLoading(false);
    }
  };

  const handleAuthError = async (error: any) => {
    if (error.message && error.message.startsWith('DEVICE_MISMATCH')) {
      const parts = error.message.split('||');
      const uid = parts[1];
      const userName = parts[2] || 'User';
      const userOrgId = parts[3] || 'default-org';
      
      Alert.alert(
          'Device Mismatch',
          'You are attempting to login from a device that is not registered to your account.\n\nAttendance can only be marked from your registered device.',
          [
              { 
                  text: 'Cancel', 
                  style: 'cancel',
                  onPress: async () => {
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
        Alert.alert('Authentication Failed', error.message);
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError('');
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setPasswordError('');
  };

  return (
    <LinearGradient
      colors={COLORS.gradients.primary}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
          >
            <View style={styles.innerContainer}>
              <View style={styles.logoContainer}>
                <View style={styles.iconCircle}>
                  <Icon name="location" size={40} color={COLORS.white} />
                </View>
                <Text style={styles.title}>GeoAttendance</Text>
                <Text style={styles.subtitle}>Track attendance with precision</Text>
              </View>

              <View style={styles.card}>
                <View style={styles.formContainer}>
                  {!showEmailSection ? (
                    <>
                      <Text style={styles.welcomeText}>Welcome! Sign in to continue</Text>

                      {/* Primary Google Sign-In */}
                      <TouchableOpacity
                        style={styles.googleBtn}
                        onPress={handleGoogleLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                      >
                        <Icon name="logo-google" size={22} color="#EA4335" style={styles.googleIcon} />
                        <Text style={styles.googleBtnText}>Sign in with Google</Text>
                      </TouchableOpacity>

                      {/* Divider */}
                      <View style={styles.orDivider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.orDividerText}>or use email</Text>
                        <View style={styles.dividerLine} />
                      </View>

                      {/* Collapsible Email Section Trigger */}
                      <TouchableOpacity
                        style={styles.emailCollapseHeader}
                        onPress={() => setShowEmailSection(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.emailCollapseHeaderText}>
                          Login with Email & Password
                        </Text>
                        <Icon
                          name="chevron-down-outline"
                          size={18}
                          color={COLORS.primary}
                        />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.collapsibleContent}>
                      {/* Back button or header */}
                      <TouchableOpacity
                        style={styles.backToGoogleHeader}
                        onPress={() => setShowEmailSection(false)}
                        activeOpacity={0.7}
                      >
                        <Icon
                          name="arrow-back-outline"
                          size={20}
                          color={COLORS.primary}
                        />
                        <Text style={styles.backToGoogleHeaderText}>
                          Back to Google Sign-In
                        </Text>
                      </TouchableOpacity>

                      <Text style={styles.emailLoginTitle}>Login with Email</Text>

                      <View style={{ marginTop: 10 }}>
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
                      </View>

                      <TouchableOpacity
                        style={styles.button}
                        onPress={handleLogin}
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
                              <Text style={styles.buttonText}>Login</Text>
                              <Icon name="arrow-forward" size={20} color={COLORS.white} />
                            </View>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setShowForgotPasswordModal(true)}
                        style={styles.forgotPasswordContainer}
                      >
                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.footerContainer}>
                <Text style={styles.footer}>
                    Secure • Reliable • Accurate
                </Text>
                <Text style={[styles.footer, { fontSize: 10, marginTop: 4, opacity: 0.7 }]}>
                    v{getVersion()}
                </Text>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>

      {/* Account Linking Modal */}
      <Modal
        visible={showLinkingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLinkingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.linkModalHeader}>
              <Icon name="link" size={32} color={COLORS.primary} />
              <Text style={styles.linkModalTitle}>Link Accounts</Text>
              <Text style={styles.linkModalSubtitle}>
                An email/password account already exists for <Text style={{fontWeight:'bold'}}>{googleLinkingEmail}</Text>. Enter password to link Google.
              </Text>
            </View>

            <View style={styles.linkModalContent}>
              <View style={styles.inputContainer}>
                <Icon name="lock-closed-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter Account Password"
                  value={googleLinkingPassword}
                  onChangeText={setGoogleLinkingPassword}
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

              <TouchableOpacity
                style={styles.linkSubmitBtn}
                onPress={handleLinkAccountSubmit}
                disabled={linkingLoading}
              >
                {linkingLoading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.linkSubmitBtnText}>Verify and Link Google</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkCancelBtn}
                onPress={() => setShowLinkingModal(false)}
              >
                <Text style={styles.linkCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  logoContainer: { 
    alignItems: 'center', 
    marginTop: Platform.OS === 'ios' ? 20 : 30,
    marginBottom: 10 
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '400',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 25,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  formContainer: {
    width: '100%',
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  orDividerText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    paddingHorizontal: 12,
  },
  emailCollapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.08)',
    marginBottom: 16,
  },
  emailCollapseHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  collapsibleContent: {
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: COLORS.text.primary },
  eyeIcon: { padding: 5 },
  inputError: { borderColor: COLORS.status.offline, borderWidth: 1.5 },
  errorText: { color: COLORS.status.offline, fontSize: 12, marginTop: -12, marginBottom: 12, marginLeft: 15 },
  button: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  forgotPasswordContainer: { alignItems: 'center', paddingVertical: 8, marginBottom: 5 },
  forgotPasswordText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  footer: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  footerContainer: {
    marginTop: 15,
    alignItems: 'center',
    gap: 4,
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
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    backgroundColor: COLORS.white,
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
    fontSize: 24,
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
  modalButton: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: COLORS.status.working,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
  linkModalHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  linkModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginTop: 10,
  },
  linkModalSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  linkModalContent: {
    padding: 24,
  },
  linkSubmitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  linkSubmitBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  linkCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkCancelBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  backToGoogleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingVertical: 4,
  },
  backToGoogleHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  emailLoginTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 10,
  },
});
