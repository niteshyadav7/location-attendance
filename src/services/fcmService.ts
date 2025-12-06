import messaging from '@react-native-firebase/messaging';
import { getFirestore, doc, updateDoc } from '@react-native-firebase/firestore';
import { Platform, PermissionsAndroid } from 'react-native';

class FCMService {
  private fcmToken: string | null = null;

  /**
   * Request notification permission (required for iOS and Android 13+)
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Notification permission denied');
          return false;
        }
      }

      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Notification permission granted');
        return true;
      } else {
        console.log('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Get FCM token and save it to Firestore for the current user
   */
  async initializeFCM(userId: string): Promise<void> {
    try {
      // Request permission first
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.log('Cannot initialize FCM without permission');
        return;
      }

      // Register for remote notifications (iOS)
      if (Platform.OS === 'ios') {
        await messaging().registerDeviceForRemoteMessages();
      }

      // Get FCM token
      const token = await messaging().getToken();
      this.fcmToken = token;
      console.log('FCM Token:', token);

      // Save token to Firestore
      await this.saveFCMToken(userId, token);

      // Listen for token refresh
      messaging().onTokenRefresh(async (newToken) => {
        console.log('FCM Token refreshed:', newToken);
        this.fcmToken = newToken;
        await this.saveFCMToken(userId, newToken);
      });

      // Setup notification listeners
      this.setupNotificationListeners();
    } catch (error) {
      console.error('Error initializing FCM:', error);
    }
  }

  /**
   * Save FCM token to user document in Firestore
   */
  private async saveFCMToken(userId: string, token: string): Promise<void> {
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'users', userId), {
        fcmToken: token,
        fcmTokenUpdatedAt: Date.now(),
      });
      console.log('FCM token saved to Firestore');
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  /**
   * Setup listeners for foreground and background notifications
   */
  private setupNotificationListeners(): void {
    // Handle foreground notifications
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground notification received:', remoteMessage);
      
      // You can display a local notification here if needed
      // The Cloud Function already sends the notification, so this is just for logging
    });

    // Handle notification opened when app is in background
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app from background:', remoteMessage);
      // You can navigate to a specific screen here based on notification data
    });

    // Handle notification opened when app was completely closed
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('Notification opened app from quit state:', remoteMessage);
          // You can navigate to a specific screen here based on notification data
        }
      });

    // Handle background messages (Android)
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message received:', remoteMessage);
    });
  }

  /**
   * Remove FCM token from Firestore (call on logout)
   */
  async removeFCMToken(userId: string): Promise<void> {
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'users', userId), {
        fcmToken: null,
        fcmTokenUpdatedAt: Date.now(),
      });
      
      // Delete the token from FCM
      if (this.fcmToken) {
        await messaging().deleteToken();
        this.fcmToken = null;
      }
      
      console.log('FCM token removed');
    } catch (error) {
      console.error('Error removing FCM token:', error);
    }
  }

  /**
   * Get the current FCM token
   */
  getFCMToken(): string | null {
    return this.fcmToken;
  }
}

export const fcmService = new FCMService();
