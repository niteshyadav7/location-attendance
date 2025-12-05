import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform } from 'react-native';

class NotificationService {
  private channelId = 'attendance-notifications';

  async initialize() {
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: this.channelId,
        name: 'Attendance Notifications',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });
    }

    // Handle notification interactions
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('Notification pressed:', detail.notification);
      }
    });
  }

  async requestPermission(): Promise<boolean> {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= 1; // Authorized or provisional
  }

  async showNotification(title: string, body: string, data?: any) {
    try {
      // Request permission first
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.log('Notification permission denied');
        return;
      }

      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId: this.channelId,
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          sound: 'default',
          vibrationPattern: [300, 500],
        },
        ios: {
          sound: 'default',
          critical: false,
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
        data,
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  // Specific notification types
  async showCheckInNotification(userName: string, locationName: string, time: string) {
    await this.showNotification(
      '✅ Checked In Successfully!',
      `${userName} checked in at ${locationName} (${time})`,
      { type: 'check_in' }
    );
  }

  async showCheckOutNotification(userName: string, totalHours: string, time: string) {
    await this.showNotification(
      '👋 Checked Out Successfully!',
      `${userName} checked out after ${totalHours} of work (${time})`,
      { type: 'check_out' }
    );
  }

  async showBreakStartNotification(userName: string, time: string) {
    await this.showNotification(
      '☕ Break Started',
      `${userName} started a break at ${time}. Enjoy your break!`,
      { type: 'break_start' }
    );
  }

  async showBreakEndNotification(userName: string, breakDuration: string, time: string) {
    await this.showNotification(
      '💼 Break Ended',
      `${userName} resumed work after ${breakDuration} break (${time})`,
      { type: 'break_end' }
    );
  }

  async showReminderNotification(title: string, message: string) {
    await this.showNotification(
      `⏰ ${title}`,
      message,
      { type: 'reminder' }
    );
  }

  async showNoticeNotification(title: string, priority: string) {
    const emoji = priority === 'urgent' ? '🚨' : priority === 'high' ? '⚠️' : '📢';
    await this.showNotification(
      `${emoji} New Notice`,
      title,
      { type: 'notice', priority }
    );
  }

  async cancelAllNotifications() {
    await notifee.cancelAllNotifications();
  }

  async cancelNotification(notificationId: string) {
    await notifee.cancelNotification(notificationId);
  }

  // Schedule notifications
  async scheduleNotification(
    title: string,
    body: string,
    triggerTime: Date,
    data?: any
  ) {
    try {
      const trigger = {
        type: 'timestamp' as const,
        timestamp: triggerTime.getTime(),
      };

      await notifee.createTriggerNotification(
        {
          title,
          body,
          android: {
            channelId: this.channelId,
            importance: AndroidImportance.HIGH,
            pressAction: {
              id: 'default',
            },
          },
          data,
        },
        trigger
      );
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  // Daily reminders
  async scheduleDailyCheckInReminder(hour: number = 9, minute: number = 0) {
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(hour, minute, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    await this.scheduleNotification(
      '🌅 Good Morning!',
      "Don't forget to check in when you arrive at work",
      reminderTime,
      { type: 'daily_reminder' }
    );
  }

  async scheduleCheckOutReminder(hour: number = 18, minute: number = 0) {
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(hour, minute, 0, 0);

    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    await this.scheduleNotification(
      '🏃 Time to Check Out',
      'Remember to check out before leaving work',
      reminderTime,
      { type: 'checkout_reminder' }
    );
  }
}

export const notificationService = new NotificationService();
