import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import DeviceInfo from 'react-native-device-info';

export interface AppConfig {
  minAppVersion: string;
  latestAppVersion: string;
  forceUpdateEnabled: boolean;
  playStoreUrl: string;
  message: string;
}

/**
 * Robust semver comparison helper.
 * Returns true if the running currentVersion is less than the required minVersion.
 */
const isVersionOutdated = (currentVersion: string, minVersion: string): boolean => {
  const currentParts = currentVersion.split('.').map(Number);
  const minParts = minVersion.split('.').map(Number);

  const maxLength = Math.max(currentParts.length, minParts.length);
  for (let i = 0; i < maxLength; i++) {
    const cur = currentParts[i] || 0;
    const req = minParts[i] || 0;

    if (cur < req) return true;
    if (cur > req) return false;
  }
  return false;
};

export const useForceUpdate = () => {
  const [updateRequired, setUpdateRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [runningVersion, setRunningVersion] = useState('');

  useEffect(() => {
    const fetchLocalVersion = () => {
      try {
        const version = DeviceInfo.getVersion();
        setRunningVersion(version);
        return version;
      } catch (err) {
        console.warn('Error reading device version:', err);
        setRunningVersion('1.0.0');
        return '1.0.0';
      }
    };

    const currentLocalVersion = fetchLocalVersion();
    const db = firestore();

    // Subscribe to real-time configuration changes in admin_settings
    const unsubscribe = db
      .collection('admin_settings')
      .doc('app_config')
      .onSnapshot(
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as AppConfig;
            setConfig(data);
            
            if (data.forceUpdateEnabled && data.minAppVersion) {
              const isOutdated = isVersionOutdated(currentLocalVersion, data.minAppVersion);
              setUpdateRequired(isOutdated);
            } else {
              setUpdateRequired(false);
            }
          } else {
            setUpdateRequired(false);
            setConfig(null);
          }
          setLoading(false);
        },
        (error) => {
          console.log('App Config Listener failed:', error);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, []);

  return {
    updateRequired,
    loading,
    config,
    runningVersion,
  };
};
