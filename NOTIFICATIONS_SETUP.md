# 📱 Push Notifications Setup Guide

## Overview
Added local push notifications for all attendance actions (check-in, check-out, break start/end).

---

## 📦 Installation Required

You need to install the **Notifee** library for local notifications:

### Step 1: Install Notifee

```bash
npm install @notifee/react-native
```

### Step 2: For iOS (if supporting iOS)

```bash
cd ios
pod install
cd ..
```

### Step 3: Android Permissions

The permissions are already handled in the code, but ensure your `AndroidManifest.xml` has:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
```

---

## ✨ Features Implemented

### 1. **Check-In Notification** ✅
**When:** User successfully checks in  
**Shows:**
```
✅ Checked In Successfully!
John Doe checked in at Office Building (9:15 AM)
```

### 2. **Check-Out Notification** 👋
**When:** User checks out  
**Shows:**
```
👋 Checked Out Successfully!
John Doe checked out after 8h 30m of work (6:00 PM)
```

### 3. **Break Start Notification** ☕
**When:** User starts a break  
**Shows:**
```
☕ Break Started
John Doe started a break at 12:30 PM. Enjoy your break!
```

### 4. **Break End Notification** 💼
**When:** User resumes work  
**Shows:**
```
💼 Break Ended
John Doe resumed work after 30 min break (1:00 PM)
```

---

## 🎯 Notification Features

### **Visual Elements:**
- ✅ Custom icons (✅, 👋, ☕, 💼)
- ✅ User name in notification
- ✅ Timestamp
- ✅ Duration calculations (work hours, break time)
- ✅ Location name (for check-in)

### **Behavior:**
- ✅ Sound enabled
- ✅ Vibration pattern
- ✅ High importance (shows as heads-up)
- ✅ Tap to open app
- ✅ Auto-dismiss after viewing

### **Android Specific:**
- ✅ Notification channel created
- ✅ Proper importance level
- ✅ Custom vibration pattern

### **iOS Specific:**
- ✅ Foreground presentation
- ✅ Badge support
- ✅ Sound enabled

---

## 📱 How It Works

### **Notification Flow:**

```
User Action (Check-In/Out/Break)
         ↓
Firebase Update (Attendance Record)
         ↓
Local Notification Triggered
         ↓
User Sees Notification
         ↓
Tap to Open App (Optional)
```

### **Code Integration:**

All notifications are triggered in `UserHomeScreen.tsx`:

1. **Check-In** (Line ~220)
2. **Break Start** (Line ~265)
3. **Resume Work** (Line ~330)
4. **Check-Out** (Line ~385)

---

## 🔧 Notification Service API

Located in: `src/services/notificationService.ts`

### **Available Methods:**

```typescript
// Initialize (call on app start)
await notificationService.initialize();

// Check-in notification
await notificationService.showCheckInNotification(
  userName: string,
  locationName: string,
  time: string
);

// Check-out notification
await notificationService.showCheckOutNotification(
  userName: string,
  totalHours: string,
  time: string
);

// Break start notification
await notificationService.showBreakStartNotification(
  userName: string,
  time: string
);

// Break end notification
await notificationService.showBreakEndNotification(
  userName: string,
  breakDuration: string,
  time: string
);

// Generic notification
await notificationService.showNotification(
  title: string,
  body: string,
  data?: any
);

// Cancel all notifications
await notificationService.cancelAllNotifications();
```

---

## 🎨 Customization

### **Change Notification Sound:**

In `notificationService.ts`, modify:

```typescript
android: {
  sound: 'your_custom_sound', // Add sound file to android/app/src/main/res/raw/
}
```

### **Change Vibration Pattern:**

```typescript
vibrationPattern: [300, 500], // [delay, vibrate, delay, vibrate...]
```

### **Change Importance:**

```typescript
importance: AndroidImportance.HIGH, // HIGH, DEFAULT, LOW, MIN
```

---

## 🚀 Future Enhancements

### **Planned Features:**

1. **Scheduled Reminders**
   - "Don't forget to check in!" (9:00 AM)
   - "Time to check out" (6:00 PM)
   - "You've been working for 4 hours, take a break"

2. **Notice Board Notifications**
   - Alert when admin posts urgent notice
   - Already implemented in code!

3. **Leave Request Notifications**
   - "Your leave request was approved"
   - "New leave request pending" (for admins)

4. **Custom Notification Settings**
   - Enable/disable specific notification types
   - Custom notification times
   - Sound preferences

---

## 📊 Testing

### **Test Checklist:**

- [ ] Install Notifee package
- [ ] Run app on device (not emulator for best results)
- [ ] Grant notification permission
- [ ] Test check-in → Should show notification
- [ ] Test break start → Should show notification
- [ ] Test resume work → Should show notification with duration
- [ ] Test check-out → Should show notification with total hours
- [ ] Tap notification → Should open app
- [ ] Check notification sound
- [ ] Check vibration

### **Testing Commands:**

```bash
# Install dependencies
npm install

# Run on Android
npm run android

# Check logs
npx react-native log-android
```

---

## 🐛 Troubleshooting

### **Notifications Not Showing:**

1. **Check Permission:**
   - Go to App Settings → Notifications
   - Ensure notifications are enabled

2. **Check Channel:**
   - Notification channel might be disabled
   - Reinstall app to recreate channel

3. **Check Logs:**
   ```bash
   npx react-native log-android | grep -i notif
   ```

### **No Sound:**

1. Check device is not in silent mode
2. Check notification channel settings
3. Verify sound file exists (if custom)

### **No Vibration:**

1. Check device vibration settings
2. Ensure `VIBRATE` permission in manifest

---

## 📝 Code Changes Summary

### **Files Created:**
- `src/services/notificationService.ts` - Notification service

### **Files Modified:**
- `src/screens/UserHomeScreen.tsx` - Added notification calls

### **Dependencies to Add:**
- `@notifee/react-native` - Local notifications library

---

## 🎯 Benefits

✅ **User Engagement** - Visual confirmation of actions  
✅ **Better UX** - Immediate feedback  
✅ **Professional** - Modern app feature  
✅ **Informative** - Shows duration, time, location  
✅ **Customizable** - Easy to modify  
✅ **Reliable** - Works offline (local notifications)  

---

## 📱 Example Notifications

### **Check-In:**
```
┌─────────────────────────────────┐
│ ✅ Checked In Successfully!     │
│ John Doe checked in at Office   │
│ Building (9:15 AM)              │
└─────────────────────────────────┘
```

### **Check-Out:**
```
┌─────────────────────────────────┐
│ 👋 Checked Out Successfully!    │
│ John Doe checked out after 8h   │
│ 30m of work (6:00 PM)           │
└─────────────────────────────────┘
```

### **Break:**
```
┌─────────────────────────────────┐
│ ☕ Break Started                │
│ John Doe started a break at     │
│ 12:30 PM. Enjoy your break!     │
└─────────────────────────────────┘
```

### **Resume:**
```
┌─────────────────────────────────┐
│ 💼 Break Ended                  │
│ John Doe resumed work after 30  │
│ min break (1:00 PM)             │
└─────────────────────────────────┘
```

---

## 🚀 Next Steps

1. **Install Notifee:**
   ```bash
   npm install @notifee/react-native
   ```

2. **Rebuild App:**
   ```bash
   npm run android
   ```

3. **Test Notifications:**
   - Check in/out and verify notifications appear

4. **Customize (Optional):**
   - Modify notification text
   - Change sounds/vibration
   - Add more notification types

---

**Date Implemented:** December 4, 2025  
**Status:** ✅ Ready to Install and Test
