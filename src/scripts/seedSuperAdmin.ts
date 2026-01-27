import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from '@react-native-firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection } from '@react-native-firebase/firestore';
import { Alert } from 'react-native';

export const seedSuperAdmin = async () => {
    try {
        const db = getFirestore();
        const auth = getAuth();

        const SUPER_ADMIN_EMAIL = 'superadmin@admin.com';
        const SUPER_ADMIN_PASS = 'Admin@123';
        const ORG_ID = 'default-org';

        console.log('🌱 Seeding Super Admin...');

        // 1. Create Authentication User
        let uid = '';
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASS);
            uid = userCredential.user.uid;
            console.log('✅ Auth User Created');
        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                console.log('ℹ️ User email already exists, signing in...');
                try { 
                     const userCred = await signInWithEmailAndPassword(auth, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASS);
                     uid = userCred.user.uid;
                     console.log('✅ Signed in as existing Super Admin');
                } catch (signinError) {
                    Alert.alert('Error', 'Super Admin exists but password does not match "Admin@123". Cannot overwrite.');
                    return;
                }
            } else {
                throw error;
            }
        }

        if (!uid) {
            throw new Error('Failed to get User ID');
        }

        // 2. Create User Profile with Super Admin Role
        // We do this BEFORE creating the organization so that the next step passes "isSuperAdmin()" check
        await setDoc(doc(db, 'users', uid), {
            uid,
            name: 'Super Admin',
            email: SUPER_ADMIN_EMAIL,
            organizationId: ORG_ID,
            role: 'super_admin', // This is the key!
            status: 'approved',
            isActive: true,
            dateOfJoining: Date.now(),
        }, { merge: true });
        console.log('✅ Super Admin Profile Seeded');

        // 3. Create Default Organization
        // Now that the user exists and has 'super_admin' role in Firestore, 
        // the security rules should allow writing to /organizations
        const orgRef = doc(db, 'organizations', ORG_ID);
        const orgDoc = await getDoc(orgRef);

        if (!orgDoc.exists()) {
            await setDoc(orgRef, {
                id: ORG_ID,
                name: 'Main Organization',
                code: 'ADMIN1',
                email: 'admin@admin.com',
                subscriptionPlan: 'enterprise',
                subscriptionStatus: 'active',
                subscriptionStartDate: Date.now(),
                maxUsers: 9999,
                maxLocations: 9999,
                createdAt: Date.now(),
                createdBy: 'system',
                isActive: true,
            });
            console.log('✅ Default Organization Created');
        } else {
            console.log('ℹ️ Default Organization already exists');
        }
        
        // Sign out so the user can log in properly with the UI flow (optional, but cleaner)
        await signOut(auth);

        Alert.alert(
            '🚀 Success', 
            `Super Admin Seeded!\n\nEmail: ${SUPER_ADMIN_EMAIL}\nPassword: ${SUPER_ADMIN_PASS}`
        );

    } catch (error: any) {
        console.error('❌ Seeding Failed:', error);
        // Special handling for permission denied to give better advice
        if (error.code === 'firestore/permission-denied' || error.message.includes('permission-denied')) {
             Alert.alert(
                 'Permission Denied', 
                 'Could not write to Firestore. Ensure your Firestore Rules allow "create" for users if request.auth.uid matches.'
             );
        } else {
            Alert.alert('Seeding Failed', error.message);
        }
    }
};
