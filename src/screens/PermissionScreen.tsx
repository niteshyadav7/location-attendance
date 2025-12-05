import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestLocationPermission } from '../services/location';
import Geolocation from 'react-native-geolocation-service';

interface PermissionScreenProps {
  onComplete: () => void;
}

export const PermissionScreen: React.FC<PermissionScreenProps> = ({ onComplete }) => {
  const [locationGranted, setLocationGranted] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [loading, setLoading] = useState(false);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs camera access to verify your identity during attendance.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS handles this differently
  };

  const handleRequestPermissions = async () => {
    setLoading(true);

    // Request Location Permission
    const locationResult = await requestLocationPermission();
    setLocationGranted(locationResult);

    // Request Camera Permission
    const cameraResult = await requestCameraPermission();
    setCameraGranted(cameraResult);

    setLoading(false);

    if (locationResult && cameraResult) {
      // Mark permissions as requested
      await AsyncStorage.setItem('permissions_requested', 'true');
      onComplete();
    } else {
      Alert.alert(
        'Permissions Required',
        'Both Location and Camera permissions are required for the app to function properly. Please grant them in Settings.',
        [
          { text: 'OK', onPress: onComplete }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to GeoAttendance</Text>
        <Text style={styles.subtitle}>We need a few permissions to get started</Text>

        <View style={styles.permissionCard}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📍</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.permissionTitle}>Location Access</Text>
            <Text style={styles.permissionDescription}>
              Required to verify you're at the correct location when marking attendance
            </Text>
          </View>
        </View>

        <View style={styles.permissionCard}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📷</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.permissionTitle}>Camera Access</Text>
            <Text style={styles.permissionDescription}>
              Required to capture your selfie for identity verification during check-in
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleRequestPermissions}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Requesting...' : 'Grant Permissions'}
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
    backgroundColor: '#f5f5f5',
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
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  permissionCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
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
    backgroundColor: '#E3F2FD',
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
    color: '#333',
    marginBottom: 5,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButton: {
    marginTop: 15,
    alignItems: 'center',
    padding: 10,
  },
  skipText: {
    color: '#666',
    fontSize: 14,
  },
});
