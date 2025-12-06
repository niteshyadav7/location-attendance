import { getFirestore, collection, query, where, onSnapshot, orderBy, limit } from '@react-native-firebase/firestore';
import { notificationService } from './notificationService';
import { Notification } from '../types';

class AdminNotificationListener {
  private unsubscribe: (() => void) | null = null;
  private lastNotificationTime: number = Date.now();
  private isListening: boolean = false;

  /**
   * Start listening for new notifications (for admin users only)
   */
  startListening(userId: string): void {
    if (this.isListening) {
      console.log('Already listening for notifications');
      return;
    }

    const db = getFirestore();
    
    // Listen to notifications created after the current time
    this.lastNotificationTime = Date.now();
    
    const q = query(
      collection(db, 'notifications'),
      where('timestamp', '>', this.lastNotificationTime),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    this.unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change: any) => {
        if (change.type === 'added') {
          const notification = { id: change.doc.id, ...change.doc.data() } as Notification;
          
          // Don't show notifications for the admin's own actions
          if (notification.userId !== userId) {
            this.showNotificationForType(notification);
          }
        }
      });
    }, (error) => {
      console.error('Error listening to notifications:', error);
    });

    this.isListening = true;
    console.log('Started listening for admin notifications');
  }

  /**
   * Show appropriate notification based on type
   */
  private showNotificationForType(notification: Notification): void {
    const time = new Date(notification.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    switch (notification.type) {
      case 'CHECK_IN':
        notificationService.showNotification(
          '✅ User Checked In',
          notification.message,
          { type: 'admin_notification', notificationId: notification.id }
        );
        break;

      case 'CHECK_OUT':
        notificationService.showNotification(
          '👋 User Checked Out',
          notification.message,
          { type: 'admin_notification', notificationId: notification.id }
        );
        break;

      case 'BREAK_START':
        notificationService.showNotification(
          '☕ Break Started',
          notification.message,
          { type: 'admin_notification', notificationId: notification.id }
        );
        break;

      case 'BREAK_END':
        notificationService.showNotification(
          '💼 Break Ended',
          notification.message,
          { type: 'admin_notification', notificationId: notification.id }
        );
        break;

      default:
        notificationService.showNotification(
          '📢 Attendance Update',
          notification.message,
          { type: 'admin_notification', notificationId: notification.id }
        );
    }
  }

  /**
   * Stop listening for notifications
   */
  stopListening(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      this.isListening = false;
      console.log('Stopped listening for admin notifications');
    }
  }

  /**
   * Check if currently listening
   */
  isActive(): boolean {
    return this.isListening;
  }
}

export const adminNotificationListener = new AdminNotificationListener();
