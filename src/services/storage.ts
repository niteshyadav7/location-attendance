import { getStorage, ref, uploadBytesResumable, getDownloadURL } from '@react-native-firebase/storage';
import { launchCamera } from 'react-native-image-picker';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import RNFS from 'react-native-fs';

export const captureSelfie = async (): Promise<string | null> => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert('Permission Denied', 'Camera permission is required for selfie verification.');
      return null;
    }
  }

  return new Promise((resolve) => {
    launchCamera(
      {
        mediaType: 'photo',
        cameraType: 'front',
        quality: 0.3, // Highly compressed
        maxWidth: 400,
        maxHeight: 400,
        includeBase64: false,
        saveToPhotos: false,
      },
      (response) => {
        if (response.didCancel) {
          resolve(null);
        } else if (response.errorMessage) {
          Alert.alert('Camera Error', response.errorMessage);
          resolve(null);
        } else if (response.assets && response.assets.length > 0) {
          resolve(response.assets[0].uri || null);
        } else {
          resolve(null);
        }
      }
    );
  });
};

export const uploadImage = async (uri: string, path: string): Promise<string> => {
  try {
    const storage = getStorage();
    const storageRef = ref(storage, path);
    
    // Read file as base64
    const fileUri = Platform.OS === 'android' ? uri : uri.replace('file://', '');
    const base64 = await RNFS.readFile(fileUri, 'base64');
    
    // Convert base64 to blob
    const blob = await fetch(`data:image/jpeg;base64,${base64}`).then(res => res.blob());
    
    // Upload
    const uploadTask = uploadBytesResumable(storageRef, blob);
    
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        null,
        (error) => {
          console.error('Upload Error: ', error);
          reject(new Error('Failed to upload image: ' + error.message));
        },
        async () => {
          const url = await getDownloadURL(storageRef);
          resolve(url);
        }
      );
    });
  } catch (error: any) {
    console.error('Upload Error: ', error);
    throw new Error('Failed to upload image: ' + error.message);
  }
};
