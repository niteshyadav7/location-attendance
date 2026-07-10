import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '@react-native-firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from '@react-native-firebase/firestore';
import { getApp, initializeApp, deleteApp } from '@react-native-firebase/app';

export const seedSuperAdmin = async () => {
    let secondaryApp = null;
    try {
        const SUPER_ADMIN_EMAIL = 'nitesh@hack.com';
        const SUPER_ADMIN_PASS = 'hack@123';
        const ORG_ID = 'default-org';

        console.log('🌱 Silent Seeding: Seeding Super Admin...');

        // Initialize secondary app
        const app = getApp();
        const config = { ...app.options };
        if (!config.databaseURL && config.projectId) {
            config.databaseURL = `https://${config.projectId}.firebaseio.com`;
        }
        const secondaryAppName = 'seeder-' + Date.now();
        secondaryApp = await initializeApp(config, secondaryAppName);

        const auth = getAuth(secondaryApp);
        const db = getFirestore(secondaryApp);

        // 1. Create Authentication User
        let uid = '';
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASS);
            uid = userCredential.user.uid;
            console.log('✅ Silent Seeding: Auth User Created');
        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                console.log('ℹ️ Silent Seeding: Super Admin already exists. Skipping seeding.');
                return;
            } else {
                throw error;
            }
        }

        if (!uid) {
            throw new Error('Failed to get User ID');
        }

        // 2. Create User Profile with Super Admin Role
        await setDoc(doc(db, 'users', uid), {
            uid,
            name: 'Super Admin',
            email: SUPER_ADMIN_EMAIL,
            organizationId: ORG_ID,
            role: 'super_admin',
            status: 'approved',
            isActive: true,
            dateOfJoining: Date.now(),
        }, { merge: true });
        console.log('✅ Silent Seeding: Super Admin Profile Seeded');

        // 3. Create Default Organization
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
            console.log('✅ Silent Seeding: Default Organization Created');
        } else {
            console.log('ℹ️ Silent Seeding: Default Organization already exists');
        }
        
        // Sign out and cleanup secondary app
        await auth.signOut();
        console.log('🚀 Silent Seeding: Super Admin Seeded Successfully!');
    } catch (error: any) {
        console.error('❌ Silent Seeding Failed:', error);
    } finally {
        if (secondaryApp) {
            try {
                await deleteApp(secondaryApp);
            } catch (e) {
                console.log('Error deleting seeder app', e);
            }
        }
    }
};
