const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAmZgpCy7ssmGN6BMTKhEdw2qK_oMovntk",
  authDomain: "location-tenant-attendance.firebaseapp.com",
  projectId: "location-tenant-attendance",
  storageBucket: "location-tenant-attendance.firebasestorage.app",
  appId: "1:548037448846:android:2c70ef44bb5cc6356b65df"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const seed = async () => {
  const email = 'nitesh@hack.com';
  const password = 'hack@123';
  const orgId = 'default-org';
  
  console.log('🌱 Starting direct Super Admin seed...');
  let uid = '';
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    uid = cred.user.uid;
    console.log('✅ Auth User created successfully! UID:', uid);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log('ℹ️ Auth User already exists, signing in...');
      const cred = await signInWithEmailAndPassword(auth, email, password);
      uid = cred.user.uid;
      console.log('✅ Signed in successfully! UID:', uid);
    } else {
      console.error('❌ Failed to create/sign in Auth User:', err.message);
      return;
    }
  }

  try {
    // 2. Write Super Admin User Profile
    await setDoc(doc(db, 'users', uid), {
      uid,
      name: 'Super Admin',
      email,
      organizationId: orgId,
      role: 'super_admin',
      status: 'approved',
      isActive: true,
      dateOfJoining: Date.now()
    }, { merge: true });
    console.log('✅ Super Admin Profile document written in Firestore!');

    // 3. Write default organization
    const orgRef = doc(db, 'organizations', orgId);
    await setDoc(orgRef, {
      id: orgId,
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
    }, { merge: true });
    console.log('✅ Main Organization document written in Firestore!');

    // Sign out to clean up local session
    await signOut(auth);
    console.log('🎉 Super Admin Seed completed successfully!');
  } catch (err) {
    console.error('❌ Firestore Write Failed:', err.message);
  }
};

seed();
