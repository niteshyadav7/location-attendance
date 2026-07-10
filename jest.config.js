module.exports = {
  preset: 'react-native',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-native-community|@react-navigation|react-native-device-info|react-native-safe-area-context|@react-native-google-signin/google-signin|@react-native-firebase/auth|@react-native-firebase/firestore|@react-native-firebase/app|@react-native-firebase/messaging|@react-native-firebase/storage|@notifee/react-native)',
  ],
};
