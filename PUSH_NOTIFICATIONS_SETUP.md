# 🔔 Push Notifications Setup Guide

## Overview
This guide will help you set up **push notifications** so that company admins receive notifications on their device's notification bar even when the app is closed.

## ✅ What's Been Implemented

### 1. **FCM Service** (`src/services/fcmService.ts`)
- ✅ Request notification permissions
- ✅ Get and save FCM tokens to Firestore
- ✅ Handle token refresh
- ✅ Setup notification listeners
- ✅ Remove tokens on logout

### 2. **App Integration**
- ✅ FCM initialized for admins on login (`AppNavigator.tsx`)
- ✅ FCM token cleanup on logout (`useUserProfile.ts`)
- ✅ Automatic token storage in user documents

### 3. **Cloud Function** (`functions/index.js`)
- ✅ Triggers when new notification is created
- ✅ Finds all admins in the organization
- ✅ Sends push notification to all admin devices
- ✅ Cleans up invalid tokens automatically

## 📋 Setup Steps

### Step 1: Install Firebase CLI (if not already installed)

```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```bash
firebase login
```

### Step 3: Initialize Firebase Functions (if not already done)

```bash
cd d:/yash-android-projects/locationAttendance
firebase init functions
```

**Select these options:**
- Use an existing project → Select your Firebase project
- Language → JavaScript
- ESLint → No (or Yes, your choice)
- Install dependencies → Yes

### Step 4: Install Function Dependencies

```bash
cd functions
npm install
```

### Step 5: Deploy Cloud Function

```bash
firebase deploy --only functions
```

This will deploy the `sendNotificationToAdmins` function to Firebase.

### Step 6: Configure Android for FCM

#### 6.1. Download `google-services.json`
1. Go to Firebase Console → Project Settings
2. Download `google-services.json`
3. Place it in `android/app/google-services.json`

#### 6.2. Update `android/build.gradle`

Add this to dependencies:
```gradle
classpath 'com.google.gms:google-services:4.3.15'
```

#### 6.3. Update `android/app/build.gradle`

Add at the bottom:
```gradle
apply plugin: 'com.google.gms.google-services'
```

### Step 7: Add Notification Icon (Android)

Create notification icons:
1. Go to https://romannurik.github.io/AndroidAssetStudio/icons-notification.html
2. Generate icons
3. Place in `android/app/src/main/res/` folders

### Step 8: Update AndroidManifest.xml

Add these permissions in `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
```

Add inside `<application>` tag:

```xml
<!-- FCM Default Channel -->
<meta-data
    android:name="com.google.firebase.messaging.default_notification_channel_id"
    android:value="attendance_notifications" />

<!-- FCM Default Icon -->
<meta-data
    android:name="com.google.firebase.messaging.default_notification_icon"
    android:resource="@drawable/ic_notification" />

<!-- FCM Default Color -->
<meta-data
    android:name="com.google.firebase.messaging.default_notification_color"
    android:resource="@color/colorPrimary" />
```

### Step 9: Test the Setup

#### 9.1. Test FCM Token Generation
1. Login as an admin
2. Check console logs for: `FCM Token: ...`
3. Verify token is saved in Firestore user document

#### 9.2. Test Push Notifications
1. Have a user check in/out or take a break
2. Admin should receive push notification even if app is closed
3. Check Firebase Functions logs: `firebase functions:log`

## 🔍 How It Works

### Flow Diagram:

```
User Action (Check-in/Break/Checkout)
           ↓
Firestore Notification Created
           ↓
Cloud Function Triggered
           ↓
Function Queries Admin FCM Tokens
           ↓
Push Notification Sent via FCM
           ↓
Admin Receives Notification (even if app closed)
```

### Notification Types:

| User Action | Notification Title | Icon |
|-------------|-------------------|------|
| Check-In | ✅ User Checked In | Green |
| Check-Out | 👋 User Checked Out | Gray |
| Break Start | ☕ Break Started | Orange |
| Break End | 💼 Break Ended | Blue |

## 🎯 Features

### ✅ **Automatic Token Management**
- Tokens are automatically saved when admin logs in
- Tokens are refreshed automatically
- Invalid tokens are cleaned up
- Tokens are removed on logout

### ✅ **Multi-Device Support**
- Admins can receive notifications on multiple devices
- Each device gets its own FCM token

### ✅ **Organization Scoping**
- Admins only receive notifications from their organization
- Multi-tenancy fully supported

### ✅ **Reliable Delivery**
- High priority notifications
- 24-hour time-to-live
- Automatic retry on failure

## 🐛 Troubleshooting

### Issue: "FCM Token not generated"
**Solution:**
- Check notification permissions are granted
- Verify `google-services.json` is in correct location
- Check Firebase project configuration

### Issue: "Notifications not received"
**Solution:**
- Check Cloud Function logs: `firebase functions:log`
- Verify FCM token exists in user document
- Test with Firebase Console → Cloud Messaging → Send test message

### Issue: "Function deployment failed"
**Solution:**
- Ensure billing is enabled on Firebase project
- Check Node.js version (should be 18)
- Run `npm install` in functions directory

### Issue: "Invalid token errors"
**Solution:**
- Tokens are automatically cleaned up
- User should re-login to generate new token

## 📱 Testing Commands

### Test FCM Token:
```bash
# Check if token is saved in Firestore
firebase firestore:get users/{userId}
```

### Test Cloud Function:
```bash
# View function logs
firebase functions:log --only sendNotificationToAdmins

# Test locally
cd functions
npm run serve
```

### Send Test Notification:
```bash
# Use Firebase Console
# Cloud Messaging → Send test message
# Enter FCM token from user document
```

## 🔐 Security Notes

1. **FCM Tokens are sensitive** - They're stored securely in Firestore
2. **Firestore Rules** - Ensure only authenticated users can read/write their own tokens
3. **Cloud Function** - Runs with admin privileges, no security rules apply

## 📊 Monitoring

### Check Function Performance:
- Firebase Console → Functions → sendNotificationToAdmins
- View invocations, errors, and execution time

### Check Notification Delivery:
- Firebase Console → Cloud Messaging
- View delivery statistics

## ✨ Summary

After completing these steps, your app will have:
- ✅ Push notifications for admins
- ✅ Notifications work even when app is closed
- ✅ Automatic token management
- ✅ Organization-scoped notifications
- ✅ Multi-device support
- ✅ Automatic cleanup of invalid tokens

**Your admins will now receive real-time push notifications on their device notification bar for all user activities!** 🎉
