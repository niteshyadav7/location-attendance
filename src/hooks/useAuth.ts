import { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, EmailAuthProvider, GoogleAuthProvider, signInWithCredential } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from '@react-native-firebase/firestore';
import { getUniqueId } from 'react-native-device-info';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuthStore } from '../store/useAuthStore';
import { UserProfile, Organization } from '../types';

// Configure Google Sign-In
GoogleSignin.configure({
    webClientId: '548037448846-0qpu8sum2digo7rhs40ipg63qmaik984.apps.googleusercontent.com',
    offlineAccess: true,
});

const DEFAULT_ORG_ID = 'default-org'; // MULTI-TENANCY: Default organization for new users

const getDocWithRetry = async (docRef: any, maxRetries = 3, delayMs = 250): Promise<any> => {
    let attempts = 0;
    while (attempts < maxRetries) {
        try {
            return await getDoc(docRef);
        } catch (error: any) {
            attempts++;
            if (error.code === 'firestore/permission-denied' && attempts < maxRetries) {
                console.log(`Firestore read permission denied on attempt ${attempts}. Retrying in ${delayMs}ms...`);
                await new Promise(resolve => setTimeout(() => resolve(null), delayMs));
            } else {
                throw error;
            }
        }
    }
};

export const useAuth = () => {
    const [loading, setLoading] = useState(false);
    const setUser = useAuthStore((state) => state.setUser);
    const setOrganization = useAuthStore((state) => state.setOrganization); // MULTI-TENANCY

    const verifyAndSetUserSession = async (userData: UserProfile, uid: string) => {
        const auth = getAuth();
        const db = getFirestore();

        if (userData.isActive === false) {
            await signOut(auth);
            throw new Error('Your account has been deactivated by the administrator. Please contact support.');
        }
        
        const isSuperAdmin = userData.role === 'super_admin';
        
        if (!isSuperAdmin && userData.status === 'pending') {
            await signOut(auth);
            throw new Error(userData.role === 'company_admin'
                ? 'Your admin account is pending approval by the Super Admin.'
                : 'Your account is waiting for admin approval. Please contact your administrator.');
        }
        
        if (!isSuperAdmin && userData.status === 'rejected') {
            await signOut(auth);
            throw new Error(userData.role === 'company_admin'
                ? 'Your admin account request has been rejected.'
                : 'Your account request has been rejected.');
        }

        const isAdmin = userData.role === 'super_admin' || userData.role === 'company_admin';

        // DEVICE LOCK CHECK (Multi-Tenancy & Security)
        const currentDeviceId = await getUniqueId();
        if (!isAdmin && userData.role !== 'company_admin' && userData.organizationId) { // Only lock device if user belongs to an organization
            if (userData.registeredDeviceId) {
                if (userData.registeredDeviceId !== currentDeviceId) {
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
            const orgDoc = await getDocWithRetry(doc(db, 'organizations', userData.organizationId));
            if (orgDoc.exists()) {
                const orgData = { id: orgDoc.id, ...orgDoc.data() } as Organization;
                setOrganization(orgData);
            }
        } else {
            // Free agent, clear organization
            setOrganization(null);
        }

        setUser(userData);
        return { success: true };
    };

    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            const auth = getAuth();
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            const db = getFirestore();
            const userDoc = await getDocWithRetry(doc(db, 'users', uid));

            if (userDoc.exists()) {
                const userData = userDoc.data() as UserProfile;
                return await verifyAndSetUserSession(userData, uid);
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

    const reauthenticateUser = async (password?: string, googleIdToken?: string) => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user || !user.email) throw new Error('Not authenticated');

            if (googleIdToken) {
                const credential = GoogleAuthProvider.credential(googleIdToken);
                await user.reauthenticateWithCredential(credential);
            } else if (password) {
                const credential = EmailAuthProvider.credential(user.email, password);
                await user.reauthenticateWithCredential(credential);
            } else {
                throw new Error('Re-authentication credential not provided');
            }
            return { success: true };
        } catch (error: any) {
            console.error('Re-auth Error:', error);
            let errorMessage = error.message;
            if (error.code === 'auth/wrong-password') errorMessage = 'Incorrect password.';
            throw new Error(errorMessage);
        }
    };

    const signInWithGoogle = async () => {
        setLoading(true);
        try {
            const auth = getAuth();
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            try {
                await GoogleSignin.revokeAccess();
            } catch (revokeError) {
                // Ignore if not signed in or failed to revoke
            }
            try {
                await GoogleSignin.signOut();
            } catch (signOutError) {
                // Ignore if already signed out
            }
            const signInResult = await GoogleSignin.signIn();
            if (signInResult.type !== 'success') {
                throw new Error('Google Sign-In was cancelled or failed.');
            }
            const idToken = signInResult.data.idToken;
            if (!idToken) throw new Error('No ID Token received from Google Sign-In.');

            const email = signInResult.data.user.email;
            if (!email) throw new Error('Google Sign-In did not return an email address.');

            const googleCredential = GoogleAuthProvider.credential(idToken);
            
            try {
                // Try to sign in with Google credential first
                const userCredential = await signInWithCredential(auth, googleCredential);
                const uid = userCredential.user.uid;
                
                const db = getFirestore();
                const userDoc = await getDocWithRetry(doc(db, 'users', uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data() as UserProfile;
                    const sessionResult = await verifyAndSetUserSession(userData, uid);
                    return { isNewUser: false, ...sessionResult };
                } else {
                    // Automatically register new user as employee (free agent)
                    const name = signInResult.data.user.name || email.split('@')[0];
                    const newUser: UserProfile = {
                        uid,
                        name,
                        email,
                        organizationId: '',
                        role: 'user',
                        status: 'approved',
                        isActive: true,
                        dateOfJoining: Date.now(),
                    };
                    await setDoc(doc(db, 'users', uid), newUser);
                    const sessionResult = await verifyAndSetUserSession(newUser, uid);
                    return { isNewUser: true, ...sessionResult };
                }
            } catch (authError: any) {
                // Catch account duplicate errors and request linking
                if (authError.code === 'auth/account-exists-with-different-credential' ||
                    authError.code === 'auth/email-already-in-use') {
                    return { needsLinking: true, email, idToken };
                }
                throw authError;
            }
        } catch (error: any) {
            console.error('Google Sign-In Error:', error);
            throw new Error(error.message || 'Google Sign-In failed');
        } finally {
            setLoading(false);
        }
    };

    const linkGoogleToExisting = async (email: string, password: string, googleIdToken: string) => {
        setLoading(true);
        try {
            const auth = getAuth();
            const db = getFirestore();

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const googleCredential = GoogleAuthProvider.credential(googleIdToken);
            await user.linkWithCredential(googleCredential);

            const userDoc = await getDocWithRetry(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
                throw new Error('User document not found in Firestore.');
            }

            const userData = userDoc.data() as UserProfile;
            return await verifyAndSetUserSession(userData, user.uid);
        } catch (error: any) {
            console.error('Linking Error:', error);
            let errorMessage = error.message;
            if (error.code === 'auth/wrong-password') errorMessage = 'Incorrect password. Please try again';
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const signUpAsCompanyAdminWithGoogle = async (
        organizationName: string,
        organizationEmail: string,
        organizationPhone?: string
    ) => {
        setLoading(true);
        try {
            const auth = getAuth();
            const db = getFirestore();

            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            try {
                await GoogleSignin.revokeAccess();
            } catch (revokeError) {
                // Ignore if not signed in or failed to revoke
            }
            try {
                await GoogleSignin.signOut();
            } catch (signOutError) {
                // Ignore
            }
            const signInResult = await GoogleSignin.signIn();
            if (signInResult.type !== 'success') {
                throw new Error('Google Sign-In was cancelled or failed.');
            }
            const idToken = signInResult.data.idToken;
            if (!idToken) throw new Error('No ID Token received from Google Sign-In.');

            const email = signInResult.data.user.email;
            const name = signInResult.data.user.name || email.split('@')[0];
            if (!email) throw new Error('Google Sign-In did not return an email address.');

            const googleCredential = GoogleAuthProvider.credential(idToken);
            let userCredential;
            try {
                userCredential = await signInWithCredential(auth, googleCredential);
            } catch (authError: any) {
                if (authError.code === 'auth/email-already-in-use' || 
                    authError.code === 'auth/account-exists-with-different-credential') {
                    throw new Error('This email is already registered. Please login instead.');
                }
                throw authError;
            }

            const uid = userCredential.user.uid;

            // Check if Firestore user document already exists
            const userDoc = await getDocWithRetry(doc(db, 'users', uid));
            if (userDoc.exists()) {
                await signOut(auth);
                throw new Error('This email is already registered. Please login instead.');
            }

            const orgId = `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const orgCode = Math.random().toString(36).substr(2, 6).toUpperCase();

            const newUser: UserProfile = {
                uid,
                name: name,
                email: email,
                organizationId: orgId,
                role: 'company_admin',
                status: 'pending',
                isActive: true,
                dateOfJoining: Date.now(),
            };

            await setDoc(doc(db, 'users', uid), newUser);

            const newOrganization: Organization = {
                id: orgId,
                name: organizationName,
                code: orgCode,
                email: organizationEmail,
                phone: organizationPhone || '',
                subscriptionPlan: 'free',
                subscriptionStatus: 'trial',
                subscriptionStartDate: Date.now(),
                maxUsers: 10,
                maxLocations: 2,
                createdAt: Date.now(),
                createdBy: uid,
                isActive: true,
                isDiscoverable: true,
            };

            await setDoc(doc(db, 'organizations', orgId), newOrganization);
            await signOut(auth);
            return { success: true, organizationCode: orgCode };
        } catch (error: any) {
            console.error('Google Admin Signup Error:', error);
            let errorMessage = error.message;
            if (error.code === 'auth/email-already-in-use') errorMessage = 'This email is already registered. Please login instead';
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const signUpAsNormalUserWithGoogle = async () => {
        setLoading(true);
        try {
            const auth = getAuth();
            const db = getFirestore();

            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            try {
                await GoogleSignin.revokeAccess();
            } catch (revokeError) {
                // Ignore if not signed in or failed to revoke
            }
            try {
                await GoogleSignin.signOut();
            } catch (signOutError) {
                // Ignore
            }
            const signInResult = await GoogleSignin.signIn();
            if (signInResult.type !== 'success') {
                throw new Error('Google Sign-In was cancelled or failed.');
            }
            const idToken = signInResult.data.idToken;
            if (!idToken) throw new Error('No ID Token received from Google Sign-In.');

            const email = signInResult.data.user.email;
            const name = signInResult.data.user.name || email.split('@')[0];
            if (!email) throw new Error('Google Sign-In did not return an email address.');

            const googleCredential = GoogleAuthProvider.credential(idToken);
            let userCredential;
            try {
                userCredential = await signInWithCredential(auth, googleCredential);
            } catch (authError: any) {
                if (authError.code === 'auth/email-already-in-use' || 
                    authError.code === 'auth/account-exists-with-different-credential') {
                    throw new Error('This email is already registered. Please login instead.');
                }
                throw authError;
            }

            const uid = userCredential.user.uid;

            // Check if Firestore user document already exists
            const userDoc = await getDocWithRetry(doc(db, 'users', uid));
            if (userDoc.exists()) {
                await signOut(auth);
                throw new Error('This email is already registered. Please login instead.');
            }

            const newUser: UserProfile = {
                uid,
                name: name,
                email: email,
                organizationId: '',
                role: 'user',
                status: 'approved',
                isActive: true,
                dateOfJoining: Date.now(),
            };

            await setDoc(doc(db, 'users', uid), newUser);
            // Keep the user signed in on success, updating the Zustand store
            const userStore = useAuthStore.getState();
            userStore.setUser(newUser);
            userStore.setOrganization(null);
            return { success: true };
        } catch (error: any) {
            console.error('Google User Signup Error:', error);
            let errorMessage = error.message;
            if (error.code === 'auth/email-already-in-use') errorMessage = 'This email is already registered. Please login instead';
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const changeEmail = async (newEmail: string) => {
        setLoading(true);
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) throw new Error('Not authenticated');

            await user.updateEmail(newEmail);

            const db = getFirestore();
            await updateDoc(doc(db, 'users', user.uid), {
                email: newEmail
            });

            const userStore = useAuthStore.getState();
            if (userStore.user) {
                userStore.setUser({
                    ...userStore.user,
                    email: newEmail
                });
            }

            return { success: true };
        } catch (error: any) {
            console.error('Change Email Error:', error);
            let errorMessage = error.message;
            if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'REQUIRES_REAUTH';
            } else if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email is already registered.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address format.';
            }
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const leaveOrganization = async (reason?: string) => {
        setLoading(true);
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) throw new Error('Not authenticated');

            const db = getFirestore();
            await updateDoc(doc(db, 'users', user.uid), {
                status: 'leave_pending',
                leaveReason: reason || '',
                leaveRequestedAt: Date.now(),
            });

            const userStore = useAuthStore.getState();
            if (userStore.user) {
                userStore.setUser({
                     ...userStore.user,
                     status: 'leave_pending',
                     leaveReason: reason || '',
                });
            }

            return { success: true };
        } catch (error: any) {
            console.error('Leave Organization Error:', error);
            throw new Error(error.message || 'Failed to request departure.');
        } finally {
            setLoading(false);
        }
    };

    const setPasswordForGoogleUser = async (password: string) => {
        setLoading(true);
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user || !user.email) throw new Error('Not authenticated');

            const credential = EmailAuthProvider.credential(user.email, password);
            await user.linkWithCredential(credential);
            return { success: true };
        } catch (error: any) {
            console.error('Set Password Error:', error);
            let errorMessage = error.message;
            if (error.code === 'auth/weak-password') errorMessage = 'Password is too weak.';
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return {
        login,
        signup,
        signupAsCompanyAdmin,
        signupAsUser,
        requestDeviceReset,
        sendPasswordReset,
        changePassword,
        reauthenticateUser,
        signInWithGoogle,
        linkGoogleToExisting,
        signUpAsCompanyAdminWithGoogle,
        signUpAsNormalUserWithGoogle,
        changeEmail,
        leaveOrganization,
        setPasswordForGoogleUser,
        loading
    };
};
