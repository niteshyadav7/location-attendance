import { 
  getMessaging, 
  requestPermission, 
  getToken, 
  onTokenRefresh, 
  onMessage, 
  onNotificationOpenedApp, 
  getInitialNotification, 
  setBackgroundMessageHandler, 
  deleteToken, 
  registerDeviceForRemoteMessages,
  AuthorizationStatus 
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { getFirestore, doc, updateDoc } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { Platform, PermissionsAndroid } from 'react-native';

class FCMService {
  private fcmToken: string | null = null;
  private tokenRefreshUnsubscribe: (() => void) | null = null;

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

      const messaging = getMessaging();
      const authStatus = await requestPermission(messaging);
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

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

      const messaging = getMessaging();

      // Register for remote notifications (iOS)
      if (Platform.OS === 'ios') {
        await registerDeviceForRemoteMessages(messaging);
      }

      // Get FCM token
      const token = await getToken(messaging);
      this.fcmToken = token;
      console.log('FCM Token:', token);

      // Save token to Firestore
      await this.saveFCMToken(userId, token);

      // Unsubscribe existing listener if any
      if (this.tokenRefreshUnsubscribe) {
        this.tokenRefreshUnsubscribe();
        this.tokenRefreshUnsubscribe = null;
      }

      // Listen for token refresh
      this.tokenRefreshUnsubscribe = onTokenRefresh(messaging, async (newToken) => {
        console.log('FCM Token refreshed:', newToken);
        this.fcmToken = newToken;
        const auth = getAuth();
        if (auth.currentUser && auth.currentUser.uid === userId) {
            await this.saveFCMToken(userId, newToken);
        } else {
            console.log('FCM Token refresh ignored: User is not authenticated or UID mismatch');
        }
      });

      // Create channel
      await this.createNotificationChannel();

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
      const auth = getAuth();
      if (!auth.currentUser || auth.currentUser.uid !== userId) {
        console.log('FCM: Bypass saving token because user is signed out or UID mismatch');
        return;
      }
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
   * Create Android Notification Channel
   */
  async createNotificationChannel() {
    try {
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: 'attendance-notifications',
          name: 'Attendance Notifications',
          importance: AndroidImportance.HIGH,
          sound: 'default',
        });
        console.log('Notification channel created');
      }
    } catch (error) {
       console.error('Error creating channel:', error);
    }
  }

  /**
   * Setup listeners for foreground and background notifications
   */
  private setupNotificationListeners(): void {
    const messaging = getMessaging();

    // Handle foreground notifications
    onMessage(messaging, async (remoteMessage) => {
      console.log('Foreground notification received:', remoteMessage);
      
      // Display local notification using Notifee
      if (remoteMessage.notification) {
          try {
            await notifee.displayNotification({
                title: remoteMessage.notification.title,
                body: remoteMessage.notification.body,
                android: {
                    channelId: 'attendance-notifications',
                    smallIcon: 'ic_launcher', // Make sure this resource exists, or remove if causing issues (defaults to launcher)
                    pressAction: {
                        id: 'default',
                    },
                },
            });
          } catch (error) {
              console.error('Error displaying local notification:', error);
          }
      }
    });

    // Handle notification opened when app is in background
    onNotificationOpenedApp(messaging, (remoteMessage) => {
      console.log('Notification opened app from background:', remoteMessage);
      // You can navigate to a specific screen here based on notification data
    });

    // Handle notification opened when app was completely closed
    getInitialNotification(messaging)
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('Notification opened app from quit state:', remoteMessage);
          // You can navigate to a specific screen here based on notification data
        }
      });

    // Handle background messages (Android)
    setBackgroundMessageHandler(messaging, async (remoteMessage) => {
      console.log('Background message received:', remoteMessage);
    });
  }

  /**
   * Remove FCM token from Firestore (call on logout)
   */
  async removeFCMToken(userId: string): Promise<void> {
    try {
      if (this.tokenRefreshUnsubscribe) {
        this.tokenRefreshUnsubscribe();
        this.tokenRefreshUnsubscribe = null;
      }

      const auth = getAuth();
      if (auth.currentUser && auth.currentUser.uid === userId) {
          const db = getFirestore();
          await updateDoc(doc(db, 'users', userId), {
            fcmToken: null,
            fcmTokenUpdatedAt: Date.now(),
          });
      }
      
      // Delete the token from FCM
      if (this.fcmToken) {
        const messaging = getMessaging();
        await deleteToken(messaging);
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
