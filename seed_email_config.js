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
  console.log('🌱 Starting SMTP Email Configuration seeding...');
  
  // 1. Authenticate as Super Admin
  try {
    await signInWithEmailAndPassword(auth, 'nitesh@hack.com', 'hack@123');
    console.log('✅ Signed in successfully as Super Admin!');
  } catch (err) {
    console.error('❌ Failed to sign in as Super Admin:', err.message);
    return;
  }

  // 2. Write Email Config
  try {
    const configRef = doc(db, 'admin_settings', 'email_config');
    await setDoc(configRef, {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      user: 'work.thyp01@gmail.com',
      pass: 'fwdhgrgodurvyrwm',
      senderName: 'GeoAttendance Support',
      senderEmail: 'work.thyp01@gmail.com',
      adminRecipientEmail: 'work.thyp01@gmail.com'
    });
    console.log('✅ SMTP Email Configuration written successfully in Firestore!');

    // Sign out to clean up session
    await signOut(auth);
    console.log('🎉 Seeding successfully completed!');
  } catch (err) {
    console.error('❌ Firestore Write Failed:', err.message);
  }
};

run();
