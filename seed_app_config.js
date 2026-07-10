const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, signOut } = require('firebase/auth');
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

const run = async () => {
  console.log('🌱 Starting App Update Config seeding...');
  
  // 1. Authenticate as Super Admin
  try {
    await signInWithEmailAndPassword(auth, 'nitesh@hack.com', 'hack@123');
    console.log('✅ Signed in successfully as Super Admin!');
  } catch (err) {
    console.error('❌ Failed to sign in as Super Admin:', err.message);
    return;
  }

  // 2. Write App Update Config
  try {
    const configRef = doc(db, 'admin_settings', 'app_config');
    await setDoc(configRef, {
      minAppVersion: '4.0.0',
      latestAppVersion: '4.0.1',
      forceUpdateEnabled: false, // Set to true to test/force updates
      playStoreUrl: 'market://details?id=com.locationattendence',
      message: 'We have released a new version of the app containing important security enhancements, payroll engines, and Wi-Fi check-in stabilizers. Please update to continue.'
    });
    console.log('✅ App Update Configuration written successfully in Firestore!');

    // Sign out to clean up session
    await signOut(auth);
    console.log('🎉 Seeding successfully completed!');
  } catch (err) {
    console.error('❌ Firestore Write Failed:', err.message);
  }
};

run();
