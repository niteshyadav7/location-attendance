// Firebase is auto-initialized by @react-native-firebase/app
// This file is for any additional Firebase configuration if needed

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export { auth, firestore };

// Enable Firestore offline persistence
firestore().settings({
  persistence: true,
});
