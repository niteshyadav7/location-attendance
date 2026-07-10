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
      const adminDocs = [];
      
      adminsSnapshot.forEach(doc => {
        const adminData = doc.data();
        if (adminData.fcmToken) {
          tokens.push(adminData.fcmToken);
          adminDocs.push(doc); // Keep track of docs to remove invalid tokens
        }
      });

      if (tokens.length === 0) {
        console.log('No FCM tokens found for admins');
        return null;
      }

      console.log(`Sending notification to ${tokens.length} admin(s)`);

      // Prepare notification payload (FCM V1 API)
      const notificationTitle = getNotificationTitle(type);
      const notificationBody = message;

      const payload = {
        tokens: tokens,
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'attendance-notifications',
            sound: 'default',
            priority: 'high', // Android specific priority
            defaultSound: true,
            defaultVibrateTimings: true
          }
        },
        data: {
          type: type,
          userId: notification.userId || '',
          userName: userName || '',
          timestamp: String(notification.timestamp || Date.now()),
          notificationId: context.params.notificationId,
        },
      };

      // Send to all admin tokens using V1 API
      const response = await admin.messaging().sendEachForMulticast(payload);

      console.log('Notification sent successfully:', response.successCount, 'Success', response.failureCount, 'Failures');

      // Clean up invalid tokens
      if (response.failureCount > 0) {
        const batch = admin.firestore().batch();
        let deletedCount = 0;
        
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error;
            console.error('Error sending to token:', tokens[idx], error);
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
              // Be careful: index matches the tokens array. 
              // We need to map back to the doc. adminDocs array is parallel to tokens? 
              // Wait, adminsSnapshot order might differ?
              // YES, I built "adminDocs" specifically to match "tokens" pushing order above.
              const docRef = adminDocs[idx].ref;
              batch.update(docRef, { fcmToken: null });
              deletedCount++;
            }
          }
        });
        
        if (deletedCount > 0) {
           console.log(`Removing ${deletedCount} invalid token(s)`);
           await batch.commit();
        }
      }

      return { success: true, count: response.successCount };
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

      // Prepare payload (FCM V1 API)
      const notificationTitle = getNotificationTitle(type);
      
      const payload = {
        token: fcmToken,
        notification: {
          title: notificationTitle,
          body: message,
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'attendance-notifications',
            sound: 'default',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true
          }
        },
        data: {
          type: type,
          userId: userId,
          timestamp: String(notification.timestamp || Date.now()),
          notificationId: context.params.notificationId,
        },
      };

      // Send to user
      // Note: send() for single token, sendEachForMulticast() for multiple
      const response = await admin.messaging().send(payload);

      console.log('User notification sent successfully:', response);
      
      return { success: true, messageId: response };
    } catch (error) {
      console.error('Error in sendNotificationToUser:', error);
      // Handle invalid token cleanup if possible, but send() throws on error usually
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
           const db = admin.firestore();
           // We need to fetch user doc ref again or just use path
           // userId is available
           await db.collection('users').doc(userId).update({ fcmToken: null });
           console.log('Removed invalid user token');
      }
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
        
        let finalCheckOutTime;
        let penaltyHours = 0;
        let calculationMethod = "default";
        
        if (userAssignedCheckout) {
             const [h, m] = userAssignedCheckout.split(':').map(Number);
             const assignedTime = new Date(todayStr);
             assignedTime.setHours(h, m, 0, 0);
             const assignedTimestamp = assignedTime.getTime();
             
             if (assignedTimestamp > data.checkInTime) {
                 finalCheckOutTime = assignedTimestamp;
                 calculationMethod = "assigned";
                 penaltyHours = 1; 
             } else {
                 calculationMethod = "fallback_late_checkin";
             }
        }
        
        if (!finalCheckOutTime) {
             const targetHoursRequest = orgSettings[data.organizationId] || 7;
             const targetCheckOutTime = data.checkInTime + (targetHoursRequest * 60 * 60 * 1000);
             
             const cutoffHour = orgCutoffSettings[data.organizationId] || 19;
             const cutoffTime = new Date(todayStr);
             cutoffTime.setHours(cutoffHour, 0, 0, 0); 
             
             finalCheckOutTime = Math.min(targetCheckOutTime, cutoffTime.getTime());
             penaltyHours = 1;
             calculationMethod = "standard_capped";
        }
        
        if (finalCheckOutTime <= data.checkInTime) {
             finalCheckOutTime = data.checkInTime; 
             penaltyHours = 0; 
        }
        
        const totalDurationMs = finalCheckOutTime - data.checkInTime;
        let breakDurationMs = 0;
        let breaks = data.breaks || [];
        
        if (data.status === 'ON_BREAK' && breaks.length > 0) {
           const lastBreak = breaks[breaks.length - 1];
           if (!lastBreak.endTime) {
              lastBreak.endTime = finalCheckOutTime; 
           }
        }
        
        breaks.forEach(b => {
             if (b.startTime && b.endTime) {
                 breakDurationMs += (b.endTime - b.startTime);
             }
        });
        
        let netDurationMs = totalDurationMs - breakDurationMs;
        let netHours = netDurationMs / (1000 * 60 * 60);
        
        let creditedHours = netHours - penaltyHours;
        if (creditedHours < 0) creditedHours = 0;
        creditedHours = Math.round(creditedHours * 100) / 100;
        
        console.log(`AutoCheckout User: ${data.userName} | CheckIn: ${new Date(data.checkInTime).toLocaleTimeString()} | TargetOut: ${new Date(finalCheckOutTime).toLocaleTimeString()} | Method: ${calculationMethod} | Penalty: ${penaltyHours}h | Credited: ${creditedHours}h`);
        
        batch.update(docSnap.ref, {
          status: 'CHECKED_OUT',
          checkOutTime: finalCheckOutTime,
          breaks: breaks,
          autoCheckout: true,
          fixedHours: creditedHours, 
          penaltyHours: penaltyHours, 
          notes: `System Auto-Checkout. Credited: ${creditedHours}h (Duration: ${Math.round(netHours*100)/100}h - ${penaltyHours}h Penalty)`
        });
        
        const userRef = admin.firestore().collection('users').doc(data.userId);
        batch.update(userRef, {
          currentStatus: 'CHECKED_OUT',
          lastActive: Date.now(),
          missedCheckouts: admin.firestore.FieldValue.increment(1),
          lastAutoCheckoutTime: Date.now()
        });
        
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
 */
exports.onAttendanceChange = functions.firestore
  .document('attendance/{attendanceId}')
  .onWrite(async (change, context) => {
    try {
      const after = change.after.exists ? change.after.data() : null;
      const before = change.before.exists ? change.before.data() : null;

      if (!after) return null;

      if (after.autoCheckout || after.autoCheckedOut) {
        return null;
      }

      const { userId, userName, organizationId, status, locationName } = after;
      let notificationType = null;
      let message = null;
      let shouldNotify = false;

      // CHECK IN
      if (!before) {
        notificationType = 'CHECK_IN';
        message = locationName ? `${userName} Checked In at ${locationName}` : `${userName} Checked In`;
        shouldNotify = true;
      }
      // STATUS CHANGE
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
        // Break End
        else if (before.status === 'ON_BREAK' && status === 'PRESENT') {
          notificationType = 'BREAK_END';
          message = `${userName} Ended Break`;
          shouldNotify = true;
        }
      }

      if (shouldNotify && notificationType) {
        console.log(`Creating ${notificationType} notification for ${userName}`);
        
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
 * Sends push notification to ALL users in the organization using V1 API.
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
        return null;
      }

      let usersQuery = admin.firestore().collection('users')
        .where('organizationId', '==', organizationId);
      
      const usersSnapshot = await usersQuery.get();

      if (usersSnapshot.empty) {
        return null;
      }

      const tokens = [];
      const userDocs = [];
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (targetUsers && targetUsers.length > 0) {
          if (!targetUsers.includes(doc.id) && !targetUsers.includes(userData.uid)) {
            return;
          }
        }
        
        if (userData.fcmToken) {
          tokens.push(userData.fcmToken);
          userDocs.push(doc);
        }
      });

      if (tokens.length === 0) {
        return null;
      }

      console.log(`Sending notice to ${tokens.length} users`);

      let emoji = '📢';
      if (priority === 'urgent') emoji = '🚨';
      else if (priority === 'high') emoji = '⚠️';
      
      // Payload for FCM V1 API
      const payload = {
        tokens: tokens,
        notification: {
            title: `${emoji} New Notice: ${title}`,
            body: message,
        },
        android: {
            priority: priority === 'urgent' ? 'high' : 'normal',
            notification: {
                channelId: 'attendance-notifications',
                sound: 'default',
                priority: priority === 'urgent' ? 'high' : 'default',
            }
        },
        data: {
            type: 'notice',
            noticeId: context.params.noticeId,
            priority: priority,
            organizationId: organizationId
        }
      };

      const response = await admin.messaging().sendEachForMulticast(payload);
      console.log('Notice sent successfully:', response.successCount);

      if (response.failureCount > 0) {
          const batch = admin.firestore().batch();
          let deletedCount = 0;
          
          response.responses.forEach((resp, idx) => {
             if (!resp.success) {
                  const error = resp.error;
                  if (error.code === 'messaging/invalid-registration-token' ||
                      error.code === 'messaging/registration-token-not-registered') {
                      const docRef = userDocs[idx].ref;
                      batch.update(docRef, { fcmToken: null });
                      deletedCount++;
                  }
             }
          });
          
          if (deletedCount > 0) {
             await batch.commit();
          }
      }

      return { success: true, count: tokens.length };
    } catch (error) {
      console.error('Error in sendNoticeToUsers:', error);
      return null;
    }
  });

// =========================================================================
// Transactional SMTP Emails (Nodemailer)
// =========================================================================

const nodemailer = require('nodemailer');

/**
 * Helper to send transactional emails via SMTP loaded from Firestore config
 */
async function sendSmtpEmail(to, subject, html) {
  try {
    const db = admin.firestore();
    const configDoc = await db.collection('admin_settings').doc('email_config').get();
    
    if (!configDoc.exists) {
      console.warn('⚠️ SMTP Email Configuration not found in Firestore (/admin_settings/email_config). Emails will not be sent.');
      return false;
    }

    const config = configDoc.data();
    const { host, port, secure, user, pass, senderName, senderEmail } = config;

    if (!host || !user || !pass) {
      console.warn('⚠️ SMTP Email configuration is incomplete (host, user, or pass missing).');
      return false;
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(port) || 465,
      secure: secure !== false, // default to true if secure is not false
      auth: {
        user,
        pass
      }
    });

    const mailOptions = {
      from: `"${senderName || 'GeoAttendance Support'}" <${senderEmail || user}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send SMTP email:', error);
    return false;
  }
}

/**
 * Cloud Function: Send Email to Super Admin when a new Company Admin signs up
 */
exports.onCompanySignupEmail = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    try {
      const userData = snap.data();
      
      // We only care about new company_admins who are pending approval
      if (userData.role !== 'company_admin' || userData.status !== 'pending') {
        return null;
      }

      console.log(`New Company Admin signed up: ${userData.name} (${userData.email}). Preparing notification email...`);

      // Load admin recipient email from config or default to a safe value
      const db = admin.firestore();
      const configDoc = await db.collection('admin_settings').doc('email_config').get();
      let adminRecipient = 'work.thyp01@gmail.com'; // Safe default
      
      if (configDoc.exists && configDoc.data().adminRecipientEmail) {
        adminRecipient = configDoc.data().adminRecipientEmail;
      }

      const subject = `🔔 New Company Signup: ${userData.name}`;
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1F2937; background-color: #F9FAFB; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB;">
          <h2 style="color: #4F46E5; margin-bottom: 20px; text-align: center;">🔔 New Company Registration</h2>
          <p>Hi Administrator,</p>
          <p>A new company registration is awaiting your review on the <b>GeoAttendance Super Admin Dashboard</b>.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02); border: 1px solid #E5E7EB;">
            <tr style="background-color: #EEF2F6;">
              <th style="padding: 12px; text-align: left; border-bottom: 1px solid #E5E7EB; width: 150px; font-size: 14px;">Field</th>
              <th style="padding: 12px; text-align: left; border-bottom: 1px solid #E5E7EB; font-size: 14px;">Details</th>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; font-weight: bold; font-size: 13px;">Admin Name</td>
              <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px;">${userData.name}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; font-weight: bold; font-size: 13px;">Admin Email</td>
              <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px;"><a href="mailto:${userData.email}" style="color: #4F46E5; text-decoration: none;">${userData.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; font-weight: bold; font-size: 13px;">User UID</td>
              <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px;"><code>${userData.uid}</code></td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; font-weight: bold; font-size: 13px;">Organization ID</td>
              <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px;"><code>${userData.organizationId}</code></td>
            </tr>
          </table>

          <p style="margin-top: 20px;">Please open your Super Admin App and check the <b>Pending</b> tab to approve or reject this company.</p>
          
          <div style="height: 1px; background-color: #E5E7EB; margin: 30px 0;"></div>
          <p style="font-size: 11px; color: #9CA3AF; text-align: center; margin: 0;">GeoAttendance System Notification</p>
        </div>
      `;

      await sendSmtpEmail(adminRecipient, subject, html);
      return { success: true };
    } catch (error) {
      console.error('Error in onCompanySignupEmail trigger:', error);
      return null;
    }
  });

/**
 * Cloud Function: Send Email to Company Admin when their company is approved
 */
exports.onCompanyApprovalEmail = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();

      // We only care about company admins whose status changed to approved
      if (after.role !== 'company_admin' || after.status !== 'approved' || before.status === 'approved') {
        return null;
      }

      console.log(`Company Admin Approved: ${after.name} (${after.email}). Preparing approval notification email...`);

      const subject = `🎉 Your GeoAttendance Account is Approved!`;
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1F2937; background-color: #F9FAFB; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB;">
          <h2 style="color: #10B981; margin-bottom: 10px; text-align: center;">🎉 Congratulations, ${after.name}!</h2>
          <h3 style="color: #374151; font-weight: normal; margin-top: 0; margin-bottom: 25px; text-align: center;">Your GeoAttendance Company Account is Approved</h3>
          
          <p>Hi ${after.name},</p>
          <p>We are absolutely thrilled to inform you that your registration has been successfully reviewed and <b>approved</b> by the system administrator.</p>
          
          <div style="background-color: #FFFFFF; padding: 20px; border-radius: 8px; border-left: 4px solid #10B981; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.01); border: 1px solid #E5E7EB;">
            <h4 style="margin-top: 0; color: #111827; margin-bottom: 8px; font-size: 15px;">What to do next:</h4>
            <ol style="margin: 0; padding-left: 20px; line-height: 1.6; font-size: 14px;">
              <li>Open the <b>GeoAttendance</b> app on your Android device.</li>
              <li>Log in using your registered email: <b>${after.email}</b>.</li>
              <li>Go to the <b>Settings</b> tab (the gear icon ⚙️) and click the floating <b>+</b> button to add your shop coordinates.</li>
              <li>Invite your employees to download the app and join using your unique <b>Organization Code</b>.</li>
            </ol>
          </div>

          <p>If you have any questions or need onboarding assistance, please feel free to reply directly to this email or contact support.</p>
          
          <p style="margin-top: 30px;">Best regards,<br><b>GeoAttendance Support Team</b></p>
          
          <div style="height: 1px; background-color: #E5E7EB; margin: 30px 0;"></div>
          <p style="font-size: 11px; color: #9CA3AF; text-align: center; margin: 0;">This is an automated operational email sent from GeoAttendance.</p>
        </div>
      `;

      await sendSmtpEmail(after.email, subject, html);
      return { success: true };
    } catch (error) {
      console.error('Error in onCompanyApprovalEmail trigger:', error);
      return null;
    }
  });


