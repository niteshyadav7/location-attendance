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
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';
import { UserProfile } from '../types';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { validateEmail, validatePassword, getPasswordStrengthColor, getPasswordStrengthText } from '../utils/validation';

const { width, height } = Dimensions.get('window');

export const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | 'very-strong'>('weak');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);

  const handleLogin = async () => {
    // Clear previous errors
    setEmailError('');
    setPasswordError('');

    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || 'Invalid email');
      Alert.alert('Invalid Email', emailValidation.error);
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCredential.user.uid;

      const db = getFirestore();
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        
        // Check if user is active (not deactivated)
        if (userData.isActive === false) {
          Alert.alert('Account Deactivated', 'Your account has been deactivated by the administrator. Please contact support.');
          await auth.signOut();
          setLoading(false);
          return;
        }
        
        // Check for approval status
        if (userData.role !== 'admin' && userData.status === 'pending') {
          Alert.alert('Account Pending', 'Your account is waiting for admin approval. Please contact your administrator.');
          await auth.signOut();
          setLoading(false);
          return;
        }
        
        if (userData.role !== 'admin' && userData.status === 'rejected') {
          Alert.alert('Account Rejected', 'Your account request has been rejected.');
          await auth.signOut();
          setLoading(false);
          return;
        }

        setUser(userData);
      } else {
        // This fallback is for legacy users or direct firebase creation
        // All auto-created users are regular users with pending status
        const newUser: UserProfile = {
          uid,
          name: email.split('@')[0],
          email: email.trim(),
          role: 'user', // Always user by default
          status: 'pending', // Always pending approval
        };
        await setDoc(doc(db, 'users', uid), newUser);
        
        // All new users need admin approval
        Alert.alert('Account Created', 'Your account is waiting for admin approval.');
        await auth.signOut();
        setLoading(false);
        return;
      }
    } catch (error: any) {
      let errorMessage = error.message;
      
      // Provide user-friendly error messages
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later';
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    // Clear previous errors
    setEmailError('');
    setPasswordError('');

    if (!name || !email || !password) {
      Alert.alert('Error', 'Please enter name, email and password');
      return;
    }

    // Validate name
    if (name.trim().length < 2) {
      Alert.alert('Invalid Name', 'Please enter your full name (at least 2 characters)');
      return;
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || 'Invalid email');
      Alert.alert('Invalid Email', emailValidation.error);
      return;
    }

    // Validate password
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

    setLoading(true);
    try {
      const auth = getAuth();
      
      // Create user account - this automatically signs them in
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCredential.user.uid;
      
      // All new signups are regular users with pending status
      // Admin role must be manually assigned through database
      const newUser: UserProfile = {
        uid,
        name: name.trim(),
        email: email.trim(),
        role: 'user', // Always user by default
        status: 'pending', // Always pending approval
      };
      
      const db = getFirestore();
      await setDoc(doc(db, 'users', uid), newUser);
      
      // IMPORTANT: Sign out immediately BEFORE showing modal
      // This prevents the app from navigating to the main screen
      await auth.signOut();
      
      // Clear form fields
      setEmail('');
      setPassword('');
      setName('');
      setEmailError('');
      setPasswordError('');
      
      // Stop loading before showing modal
      setLoading(false);
      
      // Show custom success modal
      setShowSuccessModal(true);
    } catch (error: any) {
      let errorMessage = error.message;
      
      // Provide user-friendly error messages
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please login instead';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password accounts are not enabled. Please contact support';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection';
      }
      
      Alert.alert('Sign Up Failed', errorMessage);
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setName(''); // Clear name when switching modes
    setEmailError('');
    setPasswordError('');
  };

  // Handle email change with validation
  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError(''); // Clear error when user starts typing
  };

  // Handle password change with validation
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setPasswordError(''); // Clear error when user starts typing
    
    // Update password strength in real-time for signup
    if (isSignUp && text.length > 0) {
      const validation = validatePassword(text);
      setPasswordStrength(validation.strength);
    }
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
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
          {/* Logo/Icon Section */}
          <View style={styles.logoContainer}>
            <View style={styles.iconCircle}>
              <Icon name="location" size={60} color="#fff" />
            </View>
            <Text style={styles.title}>GeoAttendance</Text>
            <Text style={styles.subtitle}>Track attendance with precision</Text>
          </View>

          {/* Form Card */}
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

            {/* Name Input - Only for Sign Up */}
            {isSignUp && (
              <View style={styles.inputContainer}>
                <Icon name="person-outline" size={20} color="#667eea" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  placeholderTextColor="#999"
                />
              </View>
            )}

            {/* Email Input */}
            <View>
              <View style={[styles.inputContainer, emailError ? styles.inputError : null]}>
                <Icon name="mail-outline" size={20} color={emailError ? '#FF3B30' : '#667eea'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  value={email}
                  onChangeText={handleEmailChange}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="#999"
                />
                {emailError && <Icon name="alert-circle" size={20} color="#FF3B30" />}
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            {/* Password Input */}
            <View>
              <View style={[styles.inputContainer, passwordError ? styles.inputError : null]}>
                <Icon name="lock-closed-outline" size={20} color={passwordError ? '#FF3B30' : '#667eea'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={handlePasswordChange}
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
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
              
              {/* Password Strength Indicator - Only for Sign Up */}
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

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={isSignUp ? handleSignUp : handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonText}>
                      {isSignUp ? 'Create Account' : 'Login'}
                    </Text>
                    <Icon name="arrow-forward" size={20} color="#fff" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Toggle Text */}
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

          {/* Footer */}
          <Text style={styles.footer}>
            Secure • Reliable • Accurate
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
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
              colors={['#667eea', '#764ba2']}
              style={styles.modalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Success Icon */}
              <View style={styles.successIconContainer}>
                <View style={styles.successIconCircle}>
                  <Icon name="checkmark-circle" size={80} color="#4CD964" />
                </View>
              </View>

              {/* Title */}
              <Text style={styles.modalTitle}>Registration Successful!</Text>

              {/* Message */}
              <View style={styles.modalMessageContainer}>
                <Text style={styles.modalMessage}>
                  Your account has been created successfully.
                </Text>
                <Text style={styles.modalSubMessage}>
                  Your account is pending admin approval. You will be able to login once approved.
                </Text>
              </View>

              {/* Info Box */}
              <View style={styles.infoBox}>
                <Icon name="information-circle-outline" size={20} color="#fff" />
                <Text style={styles.infoText}>
                  Please wait for admin approval before attempting to login
                </Text>
              </View>

              {/* Button */}
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  setIsSignUp(false);
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#4CD964', '#5DE76C']}
                  style={styles.modalButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.modalButtonText}>Go to Login</Text>
                  <Icon name="arrow-forward" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    padding: 4,
    marginBottom: 25,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  activeTabText: {
    color: '#667eea',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
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
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 5,
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 5,
    marginBottom: 10,
    marginLeft: 15,
  },
  strengthContainer: {
    marginTop: 8,
    marginBottom: 10,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 5,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  button: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
    marginTop: 10,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
  },
  toggleLink: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  footer: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 30,
    fontWeight: '500',
  },
  // Modal Styles
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
  modalGradient: {
    padding: 30,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 20,
  },
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
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalMessageContainer: {
    marginBottom: 20,
  },
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
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#fff',
    marginLeft: 10,
    lineHeight: 20,
  },
  modalButton: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#4CD964',
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
  modalButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
