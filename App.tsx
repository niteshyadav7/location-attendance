import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppOpenAdManager } from './src/components/AppOpenAdManager';

const App = () => {
  return (
    <SafeAreaProvider>
      <AppOpenAdManager />
      <AppNavigator />
    </SafeAreaProvider>
  );
};

export default App;
