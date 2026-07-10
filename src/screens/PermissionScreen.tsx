import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestLocationPermission } from '../services/location';
import { COLORS } from '../constants/theme';


interface PermissionScreenProps {
  onComplete: () => void;
}

export const PermissionScreen: React.FC<PermissionScreenProps> = ({ onComplete }) => {
  const [locationGranted, setLocationGranted] = useState(false);
  const [loading, setLoading] = useState(false);

  const requestBatteryOptimization = async () => {
     Alert.alert(
         "Enable Background Notifications",
         "To ensure you receive notifications when the app is closed, please verify that Battery Optimization is disabled for this app.",
         [
             {
                 text: "Open Settings",
                 onPress: () => Linking.openSettings()
             },
             {
                 text: "Cancel",
                 style: 'cancel'
             }
         ]
     );
  };

  const handleRequestPermissions = async () => {
    setLoading(true);

    // Request Location Permission
    const locationResult = await requestLocationPermission();
    setLocationGranted(locationResult);

    setLoading(false);

    if (locationResult) {
      // Mark permissions as requested
      await AsyncStorage.setItem('permissions_requested', 'true');
      onComplete();
    } else {
      Alert.alert(
        'Location Permission Required',
        'Location permission is required to verify you are at the correct job site. Please grant it in Settings.',
        [
          { text: 'OK' }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to GeoAttendance</Text>
        <Text style={styles.subtitle}>We need access to your location</Text>

        <View style={styles.permissionCard}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📍</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.permissionTitle}>Location Access</Text>
            <Text style={styles.permissionDescription}>
              This app collects location data to enable attendance verification at your job site during Check-In and Check-Out. This data is used only when the app is in use.
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={requestBatteryOptimization} style={styles.permissionCard}>
           <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔋</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.permissionTitle}>Ignore Battery Optimization</Text>
            <Text style={styles.permissionDescription}>
               Required for receiving notifications when the app is closed (especially for Admin alerts).
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleRequestPermissions}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Requesting...' : 'Grant Permission'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onComplete} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  permissionCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD', // You might want to define a light primary in theme, but this is fine.
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 5,
  },
  permissionDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    elevation: 2,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButton: {
    marginTop: 15,
    alignItems: 'center',
    padding: 10,
  },
  skipText: {
    color: COLORS.text.secondary,
    fontSize: 14,
  },
});
