const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Cloud Function: Send Push Notification to Admins
 * 
 * Triggers when a new notification document is created in Firestore
 * Sends push notification to all admins in the same organization
 */
exports.sendNotificationToAdmins = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    try {
      const notification = snap.data();
      const { organizationId, userName, type, message } = notification;

      console.log('New notification created:', { organizationId, type, userName });

      // SKIP types meant for specific users, not admins
      if (['MONEY_APPROVED', 'MONEY_REJECTED'].includes(type)) {
        console.log(`Skipping admin notification for user-targeted type: ${type}`);
        return null;
      }

      // Query all admins in the same organization
      const adminsSnapshot = await admin.firestore()
        .collection('users')
        .where('organizationId', '==', organizationId)
        .where('role', 'in', ['company_admin', 'super_admin'])
        .get();

      if (adminsSnapshot.empty) {
        console.log('No admins found for organization:', organizationId);
        return null;
      }

      // Collect FCM tokens from admins
      const tokens = [];
      adminsSnapshot.forEach(doc => {
        const adminData = doc.data();
        if (adminData.fcmToken) {
          tokens.push(adminData.fcmToken);
        }
      });

      if (tokens.length === 0) {
        console.log('No FCM tokens found for admins');
        return null;
      }

      console.log(`Sending notification to ${tokens.length} admin(s)`);

      // Prepare notification payload
      const notificationTitle = getNotificationTitle(type);
      const notificationBody = message;

      const payload = {
        notification: {
          title: notificationTitle,
          body: notificationBody,
          sound: 'default',
          android_channel_id: 'attendance-notifications',
        },
        data: {
          type: type,
          userId: notification.userId || '',
          userName: userName || '',
          timestamp: String(notification.timestamp || Date.now()),
          notificationId: context.params.notificationId,
        },
      };

      // Send to all admin tokens
      const response = await admin.messaging().sendToDevice(tokens, payload, {
        priority: 'high',
        timeToLive: 60 * 60 * 24, // 24 hours
      });

      console.log('Notification sent successfully:', response);

      // Clean up invalid tokens
      const tokensToRemove = [];
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          console.error('Error sending to token:', tokens[index], error);
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            tokensToRemove.push(tokens[index]);
          }
        }
      });

      // Remove invalid tokens from Firestore
      if (tokensToRemove.length > 0) {
        console.log(`Removing ${tokensToRemove.length} invalid token(s)`);
        const batch = admin.firestore().batch();
        
        adminsSnapshot.forEach(doc => {
          const adminData = doc.data();
          if (tokensToRemove.includes(adminData.fcmToken)) {
            batch.update(doc.ref, { fcmToken: null });
          }
        });
        
        await batch.commit();
      }

      return response;
    } catch (error) {
      console.error('Error in sendNotificationToAdmins:', error);
      return null;
    }
  });

/**
 * Cloud Function: Send Push Notification to User
 * 
 * Triggers when a new notification document is created in Firestore.
 * Handles notifications specifically meant for a single user (e.g. Money Request Status).
 */
exports.sendNotificationToUser = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    try {
      const notification = snap.data();
      const { userId, type, message } = notification;

      // Only handle user-targeted types
      if (!['MONEY_APPROVED', 'MONEY_REJECTED'].includes(type)) {
        return null; // Ignore other types (handled by sendNotificationToAdmins)
      }

      console.log(`Processing user notification: ${type} for user: ${userId}`);

      if (!userId) {
        console.log('No userId in notification');
        return null;
      }

      // Get user's FCM token
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      if (!userDoc.exists) {
        console.log('User not found:', userId);
        return null;
      }

      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;

      if (!fcmToken) {
        console.log(`No FCM token for user: ${userId}`);
        return null;
      }

      // Prepare payload
      const notificationTitle = getNotificationTitle(type);
      const payload = {
        notification: {
          title: notificationTitle,
          body: message,
          sound: 'default',
          android_channel_id: 'attendance-notifications',
        },
        data: {
          type: type,
          userId: userId,
          timestamp: String(notification.timestamp || Date.now()),
          notificationId: context.params.notificationId,
        },
      };

      // Send to user
      const response = await admin.messaging().sendToDevice(fcmToken, payload, {
        priority: 'high',
        timeToLive: 60 * 60 * 24,
      });

      console.log('User notification sent successfully:', response.successCount);

      // Clean up invalid token
      if (response.results[0].error) {
        const error = response.results[0].error;
        console.error('Error sending to user token:', error);
        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
          await userDoc.ref.update({ fcmToken: null });
          console.log('Removed invalid user token');
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error in sendNotificationToUser:', error);
      return null;
    }
  });

/**
 * Helper function to get notification title based on type
 */
function getNotificationTitle(type) {
  switch (type) {
    case 'CHECK_IN':
      return '✅ User Checked In';
    case 'CHECK_OUT':
      return '👋 User Checked Out';
    case 'BREAK_START':
      return '☕ Break Started';
    case 'BREAK_END':
      return '💼 Break Ended';
    case 'DEVICE_RESET':
      return '📱 Device Reset Request';
    case 'MONEY_REQUEST':
      return '💰 Money Advance Request';
    case 'MONEY_APPROVED':
      return '✅ Money Request Approved';
    case 'MONEY_REJECTED':
      return '❌ Money Request Rejected';
    default:
      return '🔔 New Notification';
  }
}

/**
 * Cloud Function: Auto Check-Out Users at 11:00 PM
 * 
 * Runs daily at 11:00 PM (23:00) to automatically check out users
 * who have checked in but not checked out on the same day.
 * 
 * For auto check-out cases:
 * - Sets checkout time to 11:00 PM (23:00)
 * - Adds fixed 7 hours to working time (instead of calculating actual time)
 * - Marks record with autoCheckout: true flag
 * - Does NOT trigger if user checked in after 11:00 PM
 * - Does NOT trigger if user already checked out manually
 * - Runs idempotently (no duplicate checkouts)
 */
exports.autoCheckoutUsers = functions.pubsub
  .schedule('0 23 * * *') // Runs every day at 11:00 PM (23:00)
  .timeZone('Asia/Kolkata') // Set to your timezone (IST in this case)
  .onRun(async (context) => {
    try {
      console.log('Starting auto checkout process at 11:00 PM');
      
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Fetch organization settings for dynamic hours & cutoff
      const orgSnapshot = await admin.firestore().collection('organizations').get();
      const orgSettings = {};
      const orgCutoffSettings = {};
      
      orgSnapshot.forEach(doc => {
          const data = doc.data();
          orgSettings[doc.id] = typeof data.autoCheckoutHours === 'number' ? data.autoCheckoutHours : 7;
          orgCutoffSettings[doc.id] = typeof data.autoCheckoutCutoffHour === 'number' ? data.autoCheckoutCutoffHour : 19;
      });
      
      // Default Cutoff (for filtering query only) - We can't easily filter by dynamic cutoff in one query
      // So we will use the *latest* possible cutoff in our query logic or just filter in memory.
      // Since default is 19 (7 PM), let's stick to that for the initial filter logic or move logic inside loop.
      
      // Query all attendance records that need auto checkout
      const attendanceSnapshot = await admin.firestore()
        .collection('attendance')
        .where('date', '==', todayStr)
        .where('status', 'in', ['PRESENT', 'ON_BREAK'])
        .get();
      
      if (attendanceSnapshot.empty) {
        console.log('No users to auto checkout');
        return null;
      }
      
      console.log(`Found ${attendanceSnapshot.size} user(s) to auto checkout`);
      
      const batch = admin.firestore().batch();
      let autoCheckoutCount = 0;
      
      for (const docSnap of attendanceSnapshot.docs) {
        const data = docSnap.data();
        
        // Skip if already auto checked out
        if (data.autoCheckout || data.autoCheckedOut) {
          continue;
        }
        
        // Fetch user profile to get specific assigned shift times
        const userDoc = await admin.firestore().collection('users').doc(data.userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        
        const userAssignedCheckout = userData.assignedCheckOutTime; // "17:00"
        
        // 1. Determine the "Official" Checkout Time for this User
        // Priority: User Assigned Time > Org Cutoff Time > CheckIn + Default Duration
        
        let finalCheckOutTime;
        let penaltyHours = 0;
        let calculationMethod = "default"; // 'assigned', 'cutoff', 'max_duration'
        
        if (userAssignedCheckout) {
             // User has a specific assigned checkout time (e.g., 17:00)
             const [h, m] = userAssignedCheckout.split(':').map(Number);
             const assignedTime = new Date(todayStr);
             assignedTime.setHours(h, m, 0, 0);
             const assignedTimestamp = assignedTime.getTime();
             
             // Check if this time is valid (must be after check-in)
             // If user checked in LATE (e.g. 10 AM) for a 9-5 shift, they still leave at 5 PM.
             if (assignedTimestamp > data.checkInTime) {
                 finalCheckOutTime = assignedTimestamp;
                 calculationMethod = "assigned";
                 
                 // Apply 1 Hour Penalty for missing the punch
                 penaltyHours = 1; 
             } else {
                 // Edge Case: Checked in AFTER shift ended?? Or night shift?
                 // Fallback to purely duration based if assigned time is passed
                 // Or just check them out immediately with 0 hours?
                 // Let's fallback to standard "CheckIn + 7h" capped by global cutoff
                 calculationMethod = "fallback_late_checkin";
             }
        }
        
        if (!finalCheckOutTime) {
             // No assigned time (or invalid), use Standard Logic
             // Min(CheckIn + 7h, Org Cutoff)
             
             const targetHoursRequest = orgSettings[data.organizationId] || 7;
             const targetCheckOutTime = data.checkInTime + (targetHoursRequest * 60 * 60 * 1000);
             
             const cutoffHour = orgCutoffSettings[data.organizationId] || 19;
             const cutoffTime = new Date(todayStr);
             cutoffTime.setHours(cutoffHour, 0, 0, 0); 
             
             finalCheckOutTime = Math.min(targetCheckOutTime, cutoffTime.getTime());
             
             // Also apply penalty here? User request implies penalty is general rule for auto-checkout?
             // "total working hours will be calculate ... -1 hrs penality for that day"
             // Let's apply 1 hr penalty globally for auto-checkout cases to be safe/strict
             penaltyHours = 1;
             calculationMethod = "standard_capped";
        }
        
        // Safety Check: Checkout > Checkin
        if (finalCheckOutTime <= data.checkInTime) {
             finalCheckOutTime = data.checkInTime; // 0 duration
             penaltyHours = 0; // Can't penalize 0
        }
        
        // 2. Calculate Working Duration
        const totalDurationMs = finalCheckOutTime - data.checkInTime;
        
        // 3. Deduct Breaks
        let breakDurationMs = 0;
        let breaks = data.breaks || [];
        
        // Auto-close open break if exists
        if (data.status === 'ON_BREAK' && breaks.length > 0) {
           const lastBreak = breaks[breaks.length - 1];
           if (!lastBreak.endTime) {
              lastBreak.endTime = finalCheckOutTime; // Close break at checkout
           }
        }
        
        // Sum breaks
        breaks.forEach(b => {
             if (b.startTime && b.endTime) {
                 breakDurationMs += (b.endTime - b.startTime);
             }
        });
        
        // 4. Calculate Net Hours
        let netDurationMs = totalDurationMs - breakDurationMs;
        let netHours = netDurationMs / (1000 * 60 * 60);
        
        // 5. Apply Penalty
        let creditedHours = netHours - penaltyHours;
        if (creditedHours < 0) creditedHours = 0;
        
        // Round to 2 decimal places
        creditedHours = Math.round(creditedHours * 100) / 100;
        
        // Log for debugging
        console.log(`AutoCheckout User: ${data.userName} | CheckIn: ${new Date(data.checkInTime).toLocaleTimeString()} | TargetOut: ${new Date(finalCheckOutTime).toLocaleTimeString()} | Method: ${calculationMethod} | Penalty: ${penaltyHours}h | Credited: ${creditedHours}h`);
        
        // Update attendance record with auto checkout
        batch.update(docSnap.ref, {
          status: 'CHECKED_OUT',
          checkOutTime: finalCheckOutTime,
          breaks: breaks,
          autoCheckout: true,
          fixedHours: creditedHours, // FINAL CREDITED HOURS
          penaltyHours: penaltyHours, // Store penalty for reference
          notes: `System Auto-Checkout. Credited: ${creditedHours}h (Duration: ${Math.round(netHours*100)/100}h - ${penaltyHours}h Penalty)`
        });
        
        // Update user status
        const userRef = admin.firestore().collection('users').doc(data.userId);
        batch.update(userRef, {
          currentStatus: 'CHECKED_OUT',
          lastActive: Date.now(),
          missedCheckouts: admin.firestore.FieldValue.increment(1),
          lastAutoCheckoutTime: Date.now()
        });
        
        // Create notification for admin
        const notificationRef = admin.firestore().collection('notifications').doc();
        batch.set(notificationRef, {
          type: 'CHECK_OUT',
          userId: data.userId,
          userName: data.userName,
          organizationId: data.organizationId,
          message: `${data.userName} auto-checked out. ${creditedHours}h credited (incl. ${penaltyHours}h penalty).`,
          timestamp: Date.now(),
          read: false
        });
        
        autoCheckoutCount++;
      }
      
      // Commit all updates in a single batch
      if (autoCheckoutCount > 0) {
        await batch.commit();
        console.log(`Successfully auto checked out ${autoCheckoutCount} user(s)`);
      } else {
        console.log('No users needed auto checkout');
      }
      
      return { success: true, count: autoCheckoutCount };
    } catch (error) {
      console.error('Error in autoCheckoutUsers:', error);
      return { success: false, error: error.message };
    }
  });

/**
 * Cloud Function: Monitor Attendance Changes
 * 
 * Triggers when an attendance document is created or updated.
 * Creates a notification for Admins when status changes.
 * This ensures admins get notified even if the user's app is closed/killed.
 */
exports.onAttendanceChange = functions.firestore
  .document('attendance/{attendanceId}')
  .onWrite(async (change, context) => {
    try {
      const after = change.after.exists ? change.after.data() : null;
      const before = change.before.exists ? change.before.data() : null;

      // Handle Delete (optional, usually no notification needed)
      if (!after) return null;

      // Skip if this is an auto-checkout update (already handled by autoCheckoutUsers function)
      // autoCheckoutUsers sets 'autoCheckout: true' which we can use to identify valid system updates
      if (after.autoCheckout || after.autoCheckedOut) {
        return null;
      }

      const { userId, userName, organizationId, status, locationName } = after;
      let notificationType = null;
      let message = null;
      let shouldNotify = false;

      // CHECK IN: Document created
      if (!before) {
        notificationType = 'CHECK_IN';
        message = locationName ? `${userName} Checked In at ${locationName}` : `${userName} Checked In`;
        shouldNotify = true;
      }
      // STATUS CHANGE: Update
      else if (before.status !== status) {
        // Check Out
        if (status === 'CHECKED_OUT') {
          notificationType = 'CHECK_OUT';
          message = `${userName} Checked Out`;
          shouldNotify = true;
        }
        // Break Start
        else if (status === 'ON_BREAK') {
          notificationType = 'BREAK_START';
          message = `${userName} Started Break`;
          shouldNotify = true;
        }
        // Break End (Back to Present)
        else if (before.status === 'ON_BREAK' && status === 'PRESENT') {
          notificationType = 'BREAK_END';
          message = `${userName} Ended Break`;
          shouldNotify = true;
        }
      }

      if (shouldNotify && notificationType) {
        console.log(`Creating ${notificationType} notification for ${userName}`);
        
        // Create the notification document
        // This will trigger 'sendNotificationToAdmins' automatically
        await admin.firestore().collection('notifications').add({
          type: notificationType,
          userId,
          userName,
          organizationId,
          message,
          timestamp: Date.now(),
          read: false,
          attendanceId: context.params.attendanceId
        });
      }

      return null;
    } catch (error) {
      console.error('Error in onAttendanceChange:', error);
      return null;
    }
  });

/**
 * Cloud Function: Send Notice to Users
 * 
 * Triggers when a new notice is created in 'notices' collection.
 * Sends push notification to ALL users in the organization.
 */
exports.sendNoticeToUsers = functions.firestore
  .document('notices/{noticeId}')
  .onCreate(async (snap, context) => {
    try {
      const notice = snap.data();
      const { 
        title, 
        message, 
        organizationId, 
        priority = 'medium',
        targetUsers = [] 
      } = notice;

      console.log('New notice created:', { title, organizationId, priority });

      if (!organizationId) {
        console.log('No organizationId in notice');
        return null;
      }

      // Query users
      let usersQuery = admin.firestore().collection('users')
        .where('organizationId', '==', organizationId);
      
      const usersSnapshot = await usersQuery.get();

      if (usersSnapshot.empty) {
        console.log('No users found for organization:', organizationId);
        return null;
      }

      // Collect tokens
      const tokens = [];
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        
        // Filter by targetUsers if specified
        if (targetUsers && targetUsers.length > 0) {
          if (!targetUsers.includes(doc.id) && !targetUsers.includes(userData.uid)) {
            return;
          }
        }
        
        if (userData.fcmToken) {
          tokens.push(userData.fcmToken);
        }
      });

      if (tokens.length === 0) {
        console.log('No FCM tokens found for users');
        return null;
      }

      console.log(`Sending notice to ${tokens.length} users`);

      // Prepare notification payload
      let emoji = '📢';
      if (priority === 'urgent') emoji = '🚨';
      else if (priority === 'high') emoji = '⚠️';
      
      const payload = {
        notification: {
          title: `${emoji} New Notice: ${title}`,
          body: message,
          sound: 'default',
          android_channel_id: 'attendance-notifications', // User reported issue: missing background notifs
        },
        data: {
          type: 'notice',
          noticeId: context.params.noticeId,
          priority: priority,
          organizationId: organizationId
        },
      };

      // Send to all tokens
      const response = await admin.messaging().sendToDevice(tokens, payload, {
        priority: 'high',
        timeToLive: 60 * 60 * 24 * 7, // 1 week
      });

      console.log('Notice sent successfully:', response.successCount);

      // Clean up invalid tokens
      const tokensToRemove = [];
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          console.error('Error sending to token:', tokens[index], error);
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            tokensToRemove.push(tokens[index]);
          }
        }
      });

      // Remove invalid tokens from Firestore
      if (tokensToRemove.length > 0) {
        console.log(`Removing ${tokensToRemove.length} invalid token(s)`);
        const batch = admin.firestore().batch();
        
        usersSnapshot.forEach(doc => {
          const userData = doc.data();
          if (tokensToRemove.includes(userData.fcmToken)) {
            batch.update(doc.ref, { fcmToken: null });
          }
        });
        
        await batch.commit();
      }

      return { success: true, count: tokens.length };
    } catch (error) {
      console.error('Error in sendNoticeToUsers:', error);
      return null;
    }
  });

