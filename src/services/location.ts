import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';
import haversine from 'haversine';

export const requestLocationPermission = async () => {
  if (Platform.OS === 'ios') {
    const auth = await Geolocation.requestAuthorization('whenInUse');
    return auth === 'granted';
  }

  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Location Permission",
        message: "App needs access to your location to mark attendance.",
        buttonNeutral: "Ask Me Later",
        buttonNegative: "Cancel",
        buttonPositive: "OK"
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return false;
};

export const getCurrentLocation = (): Promise<Geolocation.GeoPosition> => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => {
          console.log('Geolocation error:', error.code, error.message);
          reject(error);
      },
      { 
          enableHighAccuracy: true, // Use GPS for highest accuracy
          timeout: 20000, // 20 seconds timeout
          maximumAge: 0, // Don't use cached location - always get fresh data
          distanceFilter: 0, // Get location even if user hasn't moved
          showLocationDialog: true, // Show location settings dialog if disabled
          forceRequestLocation: true, // Force location request on Android
          accuracy: {
            android: 'high', // Use high accuracy mode on Android
            ios: 'best' // Use best accuracy on iOS
          }
      }
    );
  });
};

export const calculateDistance = (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
) => {
  return haversine(start, end, { unit: 'meter' });
};
