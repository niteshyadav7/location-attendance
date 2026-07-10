import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  BackHandler,
  Linking,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useForceUpdate } from '../hooks/useForceUpdate';
import { COLORS } from '../constants/theme';

export const ForceUpdateModal = () => {
  const { updateRequired, loading, config, runningVersion } = useForceUpdate();

  // Intercept Android hardware back press when an update is mandatory
  useEffect(() => {
    if (!updateRequired) return;

    const onBackPress = () => {
      // Return true to disable the back button
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      subscription.remove();
    };
  }, [updateRequired]);

  const handleUpdatePress = () => {
    if (!config?.playStoreUrl) return;
    
    Linking.canOpenURL(config.playStoreUrl).then((supported) => {
      if (supported) {
        Linking.openURL(config.playStoreUrl);
      } else {
        // Fallback Play Store link inside the browser
        Linking.openURL('https://play.google.com/store/apps');
      }
    }).catch((err) => {
      console.warn('Could not open update link:', err);
    });
  };

  if (loading || !updateRequired || !config) {
    return null;
  }

  return (
    <Modal
      visible={updateRequired}
      transparent={false}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={() => {
        // Blocks modal closing on Android back key
      }}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={['#1e1b4b', '#311042']} // Deep premium night sky
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Card Wrapper */}
          <View style={styles.card}>
            <View style={styles.badgeIconCircle}>
              <Icon name="cloud-download" size={44} color="#f59e0b" />
            </View>

            <Text style={styles.title}>Update Required</Text>
            <Text style={styles.subtitle}>A premium upgrade is available!</Text>
            
            <View style={styles.divider} />

            <Text style={styles.message}>
              {config.message || 'We have released a new version of the app containing important security enhancements, payroll engines, and Wi-Fi check-in stabilizers. Please update to continue.'}
            </Text>

            {/* Version indicators */}
            <View style={styles.versionContainer}>
              <View style={styles.versionRow}>
                <Text style={styles.versionLabel}>Installed Version</Text>
                <Text style={[styles.versionValue, { color: '#ef4444' }]}>v{runningVersion}</Text>
              </View>
              <View style={styles.versionRow}>
                <Text style={styles.versionLabel}>Required Version</Text>
                <Text style={[styles.versionValue, { color: '#10b981' }]}>v{config.minAppVersion}</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleUpdatePress}
              style={styles.button}
            >
              <LinearGradient
                colors={['#10b981', '#059669']} // Green upgrade button
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="logo-google-playstore" size={20} color="#fff" />
                <Text style={styles.buttonText}>Update to Latest Version</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.secureText}>
              🛡️ Secure & Verified by Google Play Protect
            </Text>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  badgeIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e1b4b',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    width: '100%',
    marginVertical: 16,
  },
  message: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  versionContainer: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  versionValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  button: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secureText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
});
