import { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, EmailAuthProvider } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from '@react-native-firebase/firestore';
import { getUniqueId } from 'react-native-device-info';
import { useAuthStore } from '../store/useAuthStore';
import { UserProfile, Organization } from '../types';

const DEFAULT_ORG_ID = 'default-org'; // MULTI-TENANCY: Default organization for new users

export const useAuth = () => {
    const [loading, setLoading] = useState(false);
    const setUser = useAuthStore((state) => state.setUser);
    const setOrganization = useAuthStore((state) => state.setOrganization); // MULTI-TENANCY

    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            const auth = getAuth();
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            const db = getFirestore();
            const userDoc = await getDoc(doc(db, 'users', uid));

            if (userDoc.exists()) {
                const userData = userDoc.data() as UserProfile;
                
                if (userData.isActive === false) {
                    await signOut(auth);
                    throw new Error('Your account has been deactivated by the administrator. Please contact support.');
                }
                
                // MULTI-TENANCY: Updated role checks
                const isAdmin = userData.role === 'super_admin' || userData.role === 'company_admin';
                
                if (!isAdmin && userData.status === 'pending') {
                    await signOut(auth);
                    throw new Error('Your account is waiting for admin approval. Please contact your administrator.');
                }
                
                if (!isAdmin && userData.status === 'rejected') {
                    await signOut(auth);
                    throw new Error('Your account request has been rejected.');
                }

                // DEVICE LOCK CHECK (Multi-Tenancy & Security)
                const currentDeviceId = await getUniqueId();
                if (!isAdmin && userData.role !== 'company_admin') { // Admins can login anywhere usually, or lock them too if preferred
                    if (userData.registeredDeviceId) {
                        if (userData.registeredDeviceId !== currentDeviceId) {
                            // Don't sign out yet - pass data in error for device reset request
                            // Custom error message format: DEVICE_MISMATCH||<uid>||<name>||<orgId>
                            throw new Error(`DEVICE_MISMATCH||${uid}||${userData.name}||${userData.organizationId}`); 
                        }
                    } else {
                        // First time login on a device, lock it!
                        try {
                            await updateDoc(doc(db, 'users', uid), {
                                registeredDeviceId: currentDeviceId
                            });
                        } catch (deviceLockError) {
                            console.warn('Failed to lock device on first login:', deviceLockError);
                        }
                    }

                    // Always update App Version and Last Active on login
                    const { getVersion } = require('react-native-device-info');
                    try {
                        await updateDoc(doc(db, 'users', uid), {
                            appVersion: getVersion(),
                            lastActive: Date.now()
                        });
                    } catch (updateError) {
                        console.log('Failed to update app version/activity:', updateError);
                    }
                }

                // MULTI-TENANCY: Load organization data
                if (userData.organizationId) {
                    const orgDoc = await getDoc(doc(db, 'organizations', userData.organizationId));
                    if (orgDoc.exists()) {
                        const orgData = { id: orgDoc.id, ...orgDoc.data() } as Organization;
                        setOrganization(orgData);
                    }
                }

                setUser(userData);
                return { success: true };
            } else {
                // MULTI-TENANCY: Create new user with organizationId
                const newUser: UserProfile = {
                    uid,
                    name: email.split('@')[0],
                    email: email,
                    organizationId: DEFAULT_ORG_ID, // MULTI-TENANCY: Assign to default org
                    role: 'user',
                    status: 'pending',
                };
                await setDoc(doc(db, 'users', uid), newUser);
                await signOut(auth);
                throw new Error('Account Created. Your account is waiting for admin approval.');
            }
        } catch (error: any) {
             let errorMessage = error.message;
             if (errorMessage.startsWith('DEVICE_MISMATCH')) throw error; // Re-throw specialized error
             
             if (error.code === 'auth/user-not-found') errorMessage = 'No account found with this email address';
             else if (error.code === 'auth/wrong-password') errorMessage = 'Incorrect password. Please try again';
             else if (error.code === 'auth/invalid-email') errorMessage = 'Invalid email address format';
             else if (error.code === 'auth/user-disabled') errorMessage = 'This account has been disabled';
             else if (error.code === 'auth/too-many-requests') errorMessage = 'Too many failed login attempts. Please try again later';
             throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const signup = async (name: string, email: string, password: string) => {
        setLoading(true);
        try {
            const auth = getAuth();
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;
            
            // MULTI-TENANCY: Create user with organizationId
            const newUser: UserProfile = {
                uid,
                name: name,
                email: email,
                organizationId: DEFAULT_ORG_ID, // MULTI-TENANCY: Assign to default org
                role: 'user',
                status: 'pending',
            };
            
            const db = getFirestore();
            await setDoc(doc(db, 'users', uid), newUser);
            await signOut(auth);
            return { success: true };
        } catch (error: any) {
            let errorMessage = error.message;
            if (error.code === 'auth/email-already-in-use') errorMessage = 'This email is already registered. Please login instead';
            else if (error.code === 'auth/invalid-email') errorMessage = 'Invalid email address format';
            else if (error.code === 'auth/weak-password') errorMessage = 'Password is too weak. Please use a stronger password';
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // MULTI-TENANCY: Sign up as Company Admin (creates new organization)
    const signupAsCompanyAdmin = async (
        name: string,
        email: string,
        password: string,
        organizationName: string,
        organizationEmail: string,
        organizationPhone?: string
    ) => {
        setLoading(true);
        try {
            const auth = getAuth();
            const db = getFirestore();

            // Create auth user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // Generate unique organization ID
            const orgId = `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Generate organization code (6-digit)
            const orgCode = Math.random().toString(36).substr(2, 6).toUpperCase();

            // Create user as company admin
            const newUser: UserProfile = {
                uid,
                name: name,
                email: email,
                organizationId: orgId,
                role: 'company_admin',
                status: 'pending', // Wait for Super Admin approval
                isActive: true,
                dateOfJoining: Date.now(),
            };

            // Save user FIRST (so they exist for any rule checks)
            await setDoc(doc(db, 'users', uid), newUser);

            // Create organization
            const newOrganization: Organization = {
                id: orgId,
                name: organizationName,
                code: orgCode, // MULTI-TENANCY: Save the code
                email: organizationEmail,
                phone: organizationPhone || '', // Fix: ensure not undefined
                subscriptionPlan: 'free', // Start with free plan
                subscriptionStatus: 'trial',
                subscriptionStartDate: Date.now(),
                maxUsers: 10, // Free plan limit
                maxLocations: 2, // Free plan limit
                createdAt: Date.now(),
                createdBy: uid,
                isActive: true,
            };

            // Save organization
            await setDoc(doc(db, 'organizations', orgId), newOrganization);

            await signOut(auth);
            return { success: true, organizationCode: orgCode };
        } catch (error: any) {
            let errorMessage = error.message;
            if (error.code === 'auth/email-already-in-use') errorMessage = 'This email is already registered. Please login instead';
            else if (error.code === 'auth/invalid-email') errorMessage = 'Invalid email address format';
            else if (error.code === 'auth/weak-password') errorMessage = 'Password is too weak. Please use a stronger password';
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // MULTI-TENANCY: Sign up as regular user (joins existing organization)
    const signupAsUser = async (
        name: string,
        email: string,
        password: string,
        organizationCode: string
    ) => {
        setLoading(true);
        let userCredential;
        try {
            const auth = getAuth();
            const db = getFirestore();

            // 1. Create auth user first (so we are authenticated to query)
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // 2. Find organization by code
            const orgsSnapshot = await getDocs(
                query(collection(db, 'organizations'), where('code', '==', organizationCode.toUpperCase()))
            );

            if (orgsSnapshot.empty) {
                // Rollback: Delete the user we just created
                await userCredential.user.delete();
                throw new Error('Invalid organization code. Please check with your administrator.');
            }

            const orgDoc = orgsSnapshot.docs[0];
            const orgData = orgDoc.data() as Organization;

            if (!orgData.isActive) {
                // Rollback
                await userCredential.user.delete();
                throw new Error('This organization is not active. Please contact support.');
            }

            // 3. Create user profile
            const newUser: UserProfile = {
                uid,
                name: name,
                email: email,
                organizationId: orgDoc.id,
                role: 'user',
                status: 'pending', // Needs admin approval
                isActive: true,
                dateOfJoining: Date.now(),
            };

            await setDoc(doc(db, 'users', uid), newUser);
            await signOut(auth);
            return { success: true };
        } catch (error: any) {
            // If it's our error (rollback happened), just rethrow
            // If it's auth error, handle it
            let errorMessage = error.message;
            if (error.code === 'auth/email-already-in-use') errorMessage = 'This email is already registered. Please login instead';
            else if (error.code === 'auth/invalid-email') errorMessage = 'Invalid email address format';
            else if (error.code === 'auth/weak-password') errorMessage = 'Password is too weak. Please use a stronger password';
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const requestDeviceReset = async (uid: string, userName: string, userOrgId: string) => {
        try {
            const db = getFirestore();
            
            // Mark the reset request
            await updateDoc(doc(db, 'users', uid), {
                deviceResetRequested: true,
                deviceResetRequestDate: Date.now()
            });
            
            // Create notification for Company Admin
            await setDoc(doc(collection(db, 'notifications')), {
                type: 'DEVICE_RESET',
                userId: uid,
                userName: userName,
                message: `${userName} is trying to login from a new device and requesting device change approval.`,
                timestamp: Date.now(),
                read: false,
                organizationId: userOrgId
            });

            // Now sign out after successful request
            const auth = getAuth();
            await signOut(auth);

            return true;
        } catch (error) {
            console.error('Error requesting device reset:', error);
            throw new Error('Failed to submit request.');
        }
    };

    const sendPasswordReset = async (email: string) => {
        try {
            await getAuth().sendPasswordResetEmail(email);
        } catch (error: any) {
             let errorMessage = error.message;
             if (error.code === 'auth/user-not-found') errorMessage = 'No account found with this email.';
             else if (error.code === 'auth/invalid-email') errorMessage = 'Invalid email address.';
             throw new Error(errorMessage);
        }
    };

    const changePassword = async (currentPassword: string, newPassword: string) => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user || !user.email) throw new Error('Not authenticated');

            // Re-authenticate user
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);

            // Update password
            await user.updatePassword(newPassword);
        } catch (error: any) {
             let errorMessage = error.message;
             if (error.code === 'auth/wrong-password') errorMessage = 'Current password is incorrect.';
             else if (error.code === 'auth/weak-password') errorMessage = 'New password is too weak.';
             else if (error.code === 'auth/requires-recent-login') errorMessage = 'Please logout and login again before changing password.';
             throw new Error(errorMessage);
        }
    };

    return { login, signup, signupAsCompanyAdmin, signupAsUser, requestDeviceReset, sendPasswordReset, changePassword, loading };
};
