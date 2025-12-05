import { PermissionsAndroid, Platform } from 'react-native';

export const requestLocationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    return true; // iOS permissions are handled differently
  }

  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);

    return (
      granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED &&
      granted['android.permission.ACCESS_COARSE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (err) {
    console.warn(err);
    return false;
  }
};
