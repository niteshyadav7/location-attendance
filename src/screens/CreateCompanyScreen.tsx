import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import firestore from '@react-native-firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';
import { COLORS } from '../constants/theme';
import { validateEmail } from '../utils/validation';
import { UserProfile } from '../types';

export const CreateCompanyScreen = () => {
    const user = useAuthStore((state) => state.user);
    const setUser = useAuthStore((state) => state.setUser);
    
    const [companyName, setCompanyName] = useState('');
    const [companyEmail, setCompanyEmail] = useState('');
    const [companyPhone, setCompanyPhone] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmitRequest = async () => {
        if (!user) return;
        
        if (!companyName.trim()) {
            Alert.alert('Error', 'Please enter your Company Name.');
            return;
        }

        if (!companyEmail.trim()) {
            Alert.alert('Error', 'Please enter your Company Email.');
            return;
        }

        const emailValidation = validateEmail(companyEmail);
        if (!emailValidation.isValid) {
            Alert.alert('Error', emailValidation.error || 'Invalid Email Format');
            return;
        }

        if (!companyPhone.trim() || companyPhone.trim().length < 10) {
            Alert.alert('Error', 'Please enter a valid 10-digit Phone Number.');
            return;
        }

        setSubmitting(true);
        try {
            const db = firestore();
            const requestData: Partial<UserProfile> = {
                companyRequestStatus: 'pending',
                companyRequestName: companyName.trim(),
                companyRequestEmail: companyEmail.trim().toLowerCase(),
                companyRequestPhone: companyPhone.trim(),
                companyRequestAddress: companyAddress.trim(),
                companyRequestDate: Date.now(),
                companyRequestError: null,
            };

            await db.collection('users').doc(user.uid).update(requestData);
            
            // Update local Zustand store state
            setUser({
                ...user,
                ...requestData,
            } as UserProfile);

            Alert.alert(
                'Request Submitted',
                'Your request to create a company has been submitted successfully. The Super Admin will review and approve it shortly.'
            );
        } catch (error: any) {
            console.error('Company request error:', error);
            Alert.alert('Error', error.message || 'Failed to submit request.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResetRequest = async () => {
        if (!user) return;
        
        setSubmitting(true);
        try {
            const db = firestore();
            const resetData = {
                companyRequestStatus: 'none',
                companyRequestError: null,
            };

            await db.collection('users').doc(user.uid).update({
                companyRequestStatus: firestore.FieldValue.delete(),
                companyRequestName: firestore.FieldValue.delete(),
                companyRequestEmail: firestore.FieldValue.delete(),
                companyRequestPhone: firestore.FieldValue.delete(),
                companyRequestAddress: firestore.FieldValue.delete(),
                companyRequestDate: firestore.FieldValue.delete(),
                companyRequestError: firestore.FieldValue.delete(),
            });

            setUser({
                ...user,
                companyRequestStatus: undefined,
                companyRequestName: undefined,
                companyRequestEmail: undefined,
                companyRequestPhone: undefined,
                companyRequestAddress: undefined,
                companyRequestDate: undefined,
                companyRequestError: undefined,
            });
        } catch (error: any) {
            console.error('Reset request error:', error);
            Alert.alert('Error', error.message || 'Failed to reset request.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderContent = () => {
        if (!user) return null;
        const requestStatus = user.companyRequestStatus;

        if (requestStatus === 'pending') {
            return (
                <View style={styles.statusContainer}>
                    <View style={[styles.statusCard, styles.pendingCard]}>
                        <Icon name="time" size={64} color="#d97706" style={styles.statusIcon} />
                        <Text style={styles.statusTitle}>Registration Pending</Text>
                        <Text style={styles.statusText}>
                            Your request to register <Text style={styles.boldText}>{user.companyRequestName}</Text> is currently under review by the Super Admin.
                        </Text>
                        
                        <View style={styles.detailsBox}>
                            <Text style={styles.detailsLabel}>Company Details Submitted:</Text>
                            <Text style={styles.detailsText}>🏢 {user.companyRequestName}</Text>
                            <Text style={styles.detailsText}>✉️ {user.companyRequestEmail}</Text>
                            <Text style={styles.detailsText}>📞 {user.companyRequestPhone}</Text>
                            {user.companyRequestAddress ? (
                                <Text style={styles.detailsText}>📍 {user.companyRequestAddress}</Text>
                            ) : null}
                        </View>
                        
                        <Text style={styles.waitingNotice}>
                            You will automatically be logged in as Company Admin once approved!
                        </Text>
                    </View>
                </View>
            );
        }

        if (requestStatus === 'rejected') {
            return (
                <View style={styles.statusContainer}>
                    <View style={[styles.statusCard, styles.rejectedCard]}>
                        <Icon name="close-circle" size={64} color="#dc2626" style={styles.statusIcon} />
                        <Text style={[styles.statusTitle, { color: '#dc2626' }]}>Registration Rejected</Text>
                        
                        <View style={styles.errorBox}>
                            <Text style={styles.errorLabel}>Rejection Reason:</Text>
                            <Text style={styles.errorText}>
                                {user.companyRequestError || 'Your request did not meet the criteria. Please verify your details.'}
                            </Text>
                        </View>
                        
                        <TouchableOpacity style={styles.resetBtn} onPress={handleResetRequest} disabled={submitting}>
                            {submitting ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Text style={styles.resetBtnText}>Submit New Request</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        // Form Mode (none or undefined)
        return (
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Register Your Company</Text>
                    <Text style={styles.formSubtitle}>
                        Submit a request to become a Company Admin. Once approved, you can configure check-in locations and manage employees.
                    </Text>

                    <View style={styles.inputContainer}>
                        <Icon name="business-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Company / Business Name"
                            value={companyName}
                            onChangeText={setCompanyName}
                            placeholderTextColor={COLORS.text.light}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="mail-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Company Contact Email"
                            value={companyEmail}
                            onChangeText={setCompanyEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            placeholderTextColor={COLORS.text.light}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="call-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Company Phone Number"
                            value={companyPhone}
                            onChangeText={companyPhoneText => setCompanyPhone(companyPhoneText.replace(/[^0-9]/g, ''))}
                            keyboardType="phone-pad"
                            maxLength={10}
                            placeholderTextColor={COLORS.text.light}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="location-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Office Address / Locality (Optional)"
                            value={companyAddress}
                            onChangeText={setCompanyAddress}
                            placeholderTextColor={COLORS.text.light}
                        />
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitRequest} disabled={submitting}>
                        {submitting ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <View style={styles.submitBtnContent}>
                                <Icon name="send" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
                                <Text style={styles.submitBtnText}>Submit Registration Request</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={COLORS.gradients.primary} style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Create Company</Text>
                    <Text style={styles.headerSubtitle}>Start managing your attendance records</Text>
                </View>
            </LinearGradient>
            
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {renderContent()}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingVertical: 20,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    headerContent: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 4,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    formCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    formTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text.primary,
        marginBottom: 8,
        textAlign: 'center',
    },
    formSubtitle: {
        fontSize: 13,
        color: COLORS.text.secondary,
        lineHeight: 18,
        marginBottom: 24,
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        marginBottom: 16,
        paddingHorizontal: 14,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 14,
        color: COLORS.text.primary,
    },
    submitBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    submitBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    submitBtnText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: 'bold',
    },
    statusContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    statusCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 28,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    pendingCard: {
        borderTopWidth: 4,
        borderTopColor: '#d97706',
    },
    rejectedCard: {
        borderTopWidth: 4,
        borderTopColor: '#dc2626',
    },
    statusIcon: {
        marginBottom: 16,
    },
    statusTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text.primary,
        marginBottom: 8,
    },
    statusText: {
        fontSize: 14,
        color: COLORS.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    boldText: {
        fontWeight: 'bold',
        color: COLORS.text.primary,
    },
    detailsBox: {
        width: '100%',
        backgroundColor: '#fffbeb',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#fef3c7',
        marginBottom: 20,
    },
    detailsLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#b45309',
        marginBottom: 8,
    },
    detailsText: {
        fontSize: 13,
        color: '#78350f',
        marginBottom: 6,
        lineHeight: 18,
    },
    waitingNotice: {
        fontSize: 12,
        color: COLORS.text.light,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    errorBox: {
        width: '100%',
        backgroundColor: '#fef2f2',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#fee2e2',
        marginBottom: 20,
    },
    errorLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#b91c1c',
        marginBottom: 6,
    },
    errorText: {
        fontSize: 13,
        color: '#7f1d1d',
        lineHeight: 18,
    },
    resetBtn: {
        width: '100%',
        backgroundColor: '#dc2626',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    resetBtnText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: 'bold',
    },
});
