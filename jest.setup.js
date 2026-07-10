// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
  };
});

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('react-native-vector-icons/FontAwesome', () => 'FontAwesome');
jest.mock('react-native-vector-icons/FontAwesome5', () => 'FontAwesome5');

// Mock react-native-linear-gradient
jest.mock('react-native-linear-gradient', () => 'LinearGradient');

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(() => 'mock-device-id'),
  getUniqueIdSync: jest.fn(() => 'mock-device-id'),
  getVersion: jest.fn(() => '1.0.0'),
  getBuildNumber: jest.fn(() => '1'),
}));

// Mock react-native-geolocation-service
jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
}));

// Mock react-native-background-fetch
jest.mock('react-native-background-fetch', () => ({
  configure: jest.fn(),
  finish: jest.fn(),
  status: jest.fn(),
}));

// Mock react-native-share
jest.mock('react-native-share', () => ({
  open: jest.fn(() => Promise.resolve()),
}));

// Mock @notifee/react-native
jest.mock('@notifee/react-native', () => ({
  displayNotification: jest.fn(),
  createChannel: jest.fn(),
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
      return Promise.resolve(null);
    }),
    getItem: jest.fn((key) => {
      return Promise.resolve(store[key] || null);
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
      return Promise.resolve(null);
    }),
    clear: jest.fn(() => {
      store = {};
      return Promise.resolve(null);
    }),
  };
});

// Mock @react-native-google-signin/google-signin
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({
      type: 'success',
      data: {
        idToken: 'mock-google-id-token',
        user: {
          email: 'test-google@example.com',
          name: 'Google User',
        },
      },
    })),
    signOut: jest.fn(() => Promise.resolve()),
    revokeAccess: jest.fn(() => Promise.resolve()),
  },
}));

// Mock Firebase Modular SDK imports
jest.mock('@react-native-firebase/app', () => ({
  initializeApp: jest.fn(),
  getApp: jest.fn(),
  getApps: jest.fn(() => []),
}));

// Mock modular Firebase Auth
const mockAuthUser = {
  uid: 'mock-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
  reauthenticateWithCredential: jest.fn(() => Promise.resolve()),
  updatePassword: jest.fn(() => Promise.resolve()),
};

const mockAuthInstance = {
  currentUser: mockAuthUser,
  signOut: jest.fn(() => Promise.resolve()),
};

jest.mock('@react-native-firebase/auth', () => ({
  getAuth: jest.fn(() => mockAuthInstance),
  signInWithEmailAndPassword: jest.fn((auth, email, password) => {
    if (password === 'wrong-password') {
      const err = new Error('auth/wrong-password');
      err.code = 'auth/wrong-password';
      throw err;
    }
    return Promise.resolve({
      user: {
        uid: 'mock-uid-123',
        email: email,
        displayName: 'Test User',
      },
    });
  }),
  createUserWithEmailAndPassword: jest.fn((auth, email, password) => {
    if (email === 'existing@example.com') {
      const err = new Error('auth/email-already-in-use');
      err.code = 'auth/email-already-in-use';
      throw err;
    }
    return Promise.resolve({
      user: {
        uid: 'mock-uid-123',
        email: email,
        displayName: 'Test User',
      },
    });
  }),
  signOut: jest.fn(() => Promise.resolve()),
  EmailAuthProvider: {
    credential: jest.fn((email, password) => ({ providerId: 'password', signInMethod: 'password', email, password })),
  },
  GoogleAuthProvider: {
    credential: jest.fn((idToken) => ({ providerId: 'google.com', signInMethod: 'google.com', idToken })),
  },
  signInWithCredential: jest.fn((auth, credential) => {
    return Promise.resolve({
      user: {
        uid: 'mock-uid-123',
        email: 'test-google@example.com',
        displayName: 'Google User',
      },
    });
  }),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(mockAuthUser);
    return jest.fn(); // Unsubscribe
  }),
}));

// Mock modular Firebase Firestore
const mockDocData = jest.fn(() => ({
  uid: 'mock-uid-123',
  name: 'Google User',
  email: 'test-google@example.com',
  role: 'normal_user',
  organizationId: 'org-123',
  status: 'approved',
  isActive: true,
  dateOfJoining: Date.now(),
}));

const mockDocExists = jest.fn(() => true);

const mockGetDoc = jest.fn(() => Promise.resolve({
  exists: mockDocExists,
  data: mockDocData,
}));

const mockSetDoc = jest.fn(() => Promise.resolve());
const mockUpdateDoc = jest.fn(() => Promise.resolve());

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn((db, collectionName, id) => ({ path: `${collectionName}/${id}`, id })),
  collection: jest.fn((db, collectionName) => ({ path: collectionName })),
  query: jest.fn((col, ...queries) => col),
  where: jest.fn((field, op, val) => ({ field, op, val })),
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  getDocs: jest.fn(() => Promise.resolve({
    empty: true,
    docs: [],
  })),
  onSnapshot: jest.fn((docRef, callback) => {
    callback({
      exists: () => true,
      data: () => ({
        uid: 'mock-uid-123',
        name: 'Google User',
        email: 'test-google@example.com',
        role: 'normal_user',
        organizationId: 'org-123',
        status: 'approved',
        isActive: true,
        dateOfJoining: Date.now(),
      }),
    });
    return jest.fn();
  }),
}));

// Mock @react-native-firebase/messaging
jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({
    getToken: jest.fn(() => Promise.resolve('mock-fcm-token')),
    onTokenRefresh: jest.fn(() => jest.fn()),
    onMessage: jest.fn(() => jest.fn()),
    requestPermission: jest.fn(() => Promise.resolve(1)),
  })),
}));

// Mock react-native-google-mobile-ads
jest.mock('react-native-google-mobile-ads', () => ({
  BannerAd: 'BannerAd',
  BannerAdSize: {
    BANNER: 'BANNER',
    LARGE_BANNER: 'LARGE_BANNER',
    MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE',
    FULL_BANNER: 'FULL_BANNER',
    LEADERBOARD: 'LEADERBOARD',
    ADAPTIVE_BANNER: 'ADAPTIVE_BANNER',
  },
  TestIds: {
    BANNER: 'ca-app-pub-3940256099942544/6300978111',
    INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
    APP_OPEN: 'ca-app-pub-3940256099942544/3419835294',
  },
  useAds: () => ({ isLoaded: false, show: jest.fn() }),
  useAppOpenAd: jest.fn(() => ({
    isLoaded: false,
    load: jest.fn(),
    show: jest.fn(),
    isOpened: false,
    isClosed: false,
    error: null,
  })),
  useInterstitialAd: jest.fn(() => ({
    isLoaded: false,
    load: jest.fn(),
    show: jest.fn(),
    isOpened: false,
    isClosed: false,
    error: null,
  })),
  AppOpenAd: {
    createForAdRequest: jest.fn(() => ({
      load: jest.fn(),
      show: jest.fn(),
      addAdEventListener: jest.fn(() => jest.fn()),
    })),
  },
  InterstitialAd: {
    createForAdRequest: jest.fn(() => ({
      load: jest.fn(),
      show: jest.fn(),
      addAdEventListener: jest.fn(() => jest.fn()),
    })),
  },
  AdEventType: {
    LOADED: 'LOADED',
    CLOSED: 'CLOSED',
    ERROR: 'ERROR',
  },
}));

// Mock react-native-webview
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: (props) => React.createElement(View, props),
  };
});

// Mock react-native-fs
jest.mock('react-native-fs', () => ({
  mkdir: jest.fn(() => Promise.resolve()),
  moveFile: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  pathForBundle: jest.fn(() => Promise.resolve('')),
  pathForGroup: jest.fn(() => Promise.resolve('')),
  getFSInfo: jest.fn(() => Promise.resolve({})),
  getAllExternalFilesDirs: jest.fn(() => Promise.resolve([])),
  unlink: jest.fn(() => Promise.resolve()),
  write: jest.fn(() => Promise.resolve()),
  writeFile: jest.fn(() => Promise.resolve()),
  appendFile: jest.fn(() => Promise.resolve()),
  readFile: jest.fn(() => Promise.resolve('')),
  readDir: jest.fn(() => Promise.resolve([])),
  DocumentDirectoryPath: 'DocumentDirectoryPath',
  ExternalDirectoryPath: 'ExternalDirectoryPath',
  DownloadDirectoryPath: 'DownloadDirectoryPath',
}));
