# Admin Push Notifications Setup

This document explains how to set up push notifications for admin users to receive alerts when regular users check-in, take breaks, or checkout.

## Overview

The notification system consists of:
1. **React Native App** - Stores FCM tokens for admin users
2. **Firebase Cloud Functions** - Sends push notifications to admins when attendance events occur
3. **Firebase Cloud Messaging (FCM)** - Delivers notifications to devices

## Setup Instructions

### 1. Install Cloud Functions Dependencies

```bash
cd functions
npm install
```

### 2. Deploy Cloud Functions

Make sure you have Firebase CLI installed and are logged in:

```bash
npm install -g firebase-tools
firebase login
```

Initialize Firebase (if not already done):

```bash
firebase init
```

Select:
- Functions
- Use existing project (select your Firebase project)
- Choose TypeScript
- Use ESLint: Yes
- Install dependencies: Yes

Deploy the functions:

```bash
firebase deploy --only functions
```

### 3. Verify Function Deployment

After deployment, you should see:
```
✔  functions[sendAdminNotification(us-central1)]: Successful create operation.
```

### 4. Test the Notification System

1. **Login as Admin** - The app will automatically request notification permissions and store the FCM token
2. **Login as Regular User** - Perform check-in, break, or checkout
3. **Admin Device** - Should receive a push notification

## How It Works

### 1. FCM Token Registration (Admin Login)
- When an admin logs in, `fcmService.initializeFCM()` is called
- The app requests notification permission
- FCM token is generated and saved to Firestore (`users/{userId}/fcmToken`)

### 2. Attendance Event (User Action)
- User performs check-in, break, or checkout
- A notification document is created in Firestore (`notifications` collection)

### 3. Cloud Function Trigger
- The `sendAdminNotification` function is triggered by the new notification document
- Function queries all admin users with FCM tokens
- Sends push notification to all admin devices

### 4. Notification Delivery
- FCM delivers the notification to admin devices
- Notification appears even if the app is closed
- Clicking the notification opens the app

## Notification Types

- **CHECK_IN**: ✅ User Checked In
- **CHECK_OUT**: 👋 User Checked Out
- **BREAK_START**: ☕ Break Started
- **BREAK_END**: 💼 Break Ended

## Troubleshooting

### Notifications Not Received

1. **Check FCM Token**
   - Verify admin user has `fcmToken` field in Firestore
   - Check browser console for FCM initialization errors

2. **Check Cloud Function**
   - View function logs: `firebase functions:log`
   - Verify function is deployed: `firebase functions:list`

3. **Check Permissions**
   - Ensure notification permissions are granted on admin device
   - Android 13+: POST_NOTIFICATIONS permission required

4. **Check Firebase Console**
   - Verify Cloud Messaging is enabled
   - Check for any quota limits

### Invalid Tokens

The Cloud Function automatically removes invalid FCM tokens from Firestore if delivery fails.

## File Structure

```
functions/
├── src/
│   └── index.ts          # Cloud Function code
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript config

src/
├── services/
│   └── fcmService.ts     # FCM token management
└── navigation/
    └── AppNavigator.tsx  # FCM initialization
```

## Security Notes

- FCM tokens are stored securely in Firestore
- Only admin users receive notifications
- Tokens are automatically cleaned up on logout
- Invalid tokens are removed automatically

## Future Enhancements

- Add notification preferences (enable/disable specific types)
- Add notification sound customization
- Add notification grouping
- Add notification history in app
