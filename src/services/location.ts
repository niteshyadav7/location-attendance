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

export const getCurrentLocation = (retryCount = 0): Promise<Geolocation.GeoPosition> => {
  return new Promise((resolve, reject) => {
    // First attempt: High accuracy with GPS
    Geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ GPS location obtained:', position.coords.latitude, position.coords.longitude, 'Accuracy:', position.coords.accuracy);
        resolve(position);
      },
      (error) => {
          console.log('❌ Geolocation error:', error.code, error.message);
          
          // Error codes:
          // 1 = PERMISSION_DENIED
          // 2 = POSITION_UNAVAILABLE  
          // 3 = TIMEOUT
          
          if (error.code === 3 && retryCount < 2) {
            // Timeout - retry with lower accuracy
            console.log(`⚠️ GPS timeout, retrying with lower accuracy (attempt ${retryCount + 1}/2)...`);
            
            Geolocation.getCurrentPosition(
              (position) => {
                console.log('✅ Location obtained (low accuracy):', position.coords.latitude, position.coords.longitude);
                resolve(position);
              },
              (retryError) => {
                console.log('❌ Retry failed:', retryError.code, retryError.message);
                
                // If still failing, try one more time with even more relaxed settings
                if (retryCount === 0) {
                  getCurrentLocation(retryCount + 1).then(resolve).catch(reject);
                } else {
                  reject(new Error(getLocationErrorMessage(retryError.code)));
                }
              },
              {
                enableHighAccuracy: false, // Use network location
                timeout: 15000,
                maximumAge: 10000, // Allow cached location up to 10 seconds old
                showLocationDialog: true,
                forceRequestLocation: true,
              }
            );
          } else {
            reject(new Error(getLocationErrorMessage(error.code)));
          }
      },
      { 
          enableHighAccuracy: true, // Use GPS for highest accuracy
          timeout: 15000, // 15 seconds timeout (reduced from 20s)
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

const getLocationErrorMessage = (errorCode: number): string => {
  switch (errorCode) {
    case 1:
      return 'Location permission denied. Please enable location permissions in your device settings.';
    case 2:
      return 'Location unavailable. Please ensure GPS is enabled and you have a clear view of the sky.';
    case 3:
      return 'Location request timed out. Please check if GPS is enabled and try again.';
    default:
      return 'Failed to get your location. Please ensure GPS is enabled and location permissions are granted.';
  }
};

export const calculateDistance = (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
) => {
  return haversine(start, end, { unit: 'meter' });
};
