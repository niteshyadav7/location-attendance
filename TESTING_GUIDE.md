# 🧪 Admin Notifications - Testing Guide

## 📱 **What You Need**

### **Devices:**
- **Option 1:** 2 physical Android devices
- **Option 2:** 1 physical device + 1 Android emulator
- **Option 3:** 2 Android emulators

### **Accounts:**
- ✅ **1 Admin account** (email + password)
- ✅ **1 Regular user account** (email + password)

---

## 🚀 **Step-by-Step Testing**

### **STEP 1: Build & Install the App**

```bash
# Run this command (already running for you!)
npx react-native run-android
```

**Wait for:**
- ✅ Build to complete
- ✅ App to install on device/emulator
- ✅ App to launch automatically

---

### **STEP 2: Setup Admin Device**

#### **On Device 1 (Admin):**

1. **Open the app**
   - App should launch automatically after build

2. **Login as Admin**
   - Enter admin email
   - Enter admin password
   - Click "Login"

3. **Grant Notification Permission**
   - When prompted, click "Allow"
   - This is important for notifications to work!

4. **Verify Login**
   - You should see the Admin Dashboard
   - Bottom tabs: Dashboard, Locations, Notices, Leaves, History, Profile

5. **Keep App Running**
   - ✅ You can minimize the app (press Home button)
   - ✅ You can switch to other apps
   - ❌ Don't force-close it (swipe away from recent apps)

**Admin Setup Complete!** ✅

---

### **STEP 3: Setup User Device**

#### **On Device 2 (Regular User):**

**If using emulator:**
```bash
# Open another terminal and run:
npx react-native run-android
```

**If using physical device:**
- Install the APK manually, or
- Connect device and run the build command

1. **Open the app**

2. **Login as Regular User**
   - Enter user email
   - Enter user password
   - Click "Login"

3. **Verify Login**
   - You should see the User Home Screen
   - Bottom tabs: Attendance, Leaves, History, Profile

**User Setup Complete!** ✅

---

### **STEP 4: Test Notifications**

#### **🧪 Test 1: Check-In Notification**

**On User Device:**
1. Go to **Attendance** tab
2. Make sure you're within location radius
3. Click **"Check In"** button
4. Wait for success message

**On Admin Device:**
- 🔔 **You should see a notification!**
- Title: "✅ User Checked In"
- Message: "[User Name] checked in at [Location Name]"

**Expected Result:** ✅ Notification appears within 1-2 seconds

---

#### **🧪 Test 2: Break Start Notification**

**On User Device:**
1. After checking in, click **"Take Break"** button
2. Wait for success message

**On Admin Device:**
- 🔔 **You should see a notification!**
- Title: "☕ Break Started"
- Message: "[User Name] started a break"

**Expected Result:** ✅ Notification appears within 1-2 seconds

---

#### **🧪 Test 3: Break End Notification**

**On User Device:**
1. After taking break, click **"Resume Work"** button
2. Wait for success message

**On Admin Device:**
- 🔔 **You should see a notification!**
- Title: "💼 Break Ended"
- Message: "[User Name] resumed work"

**Expected Result:** ✅ Notification appears within 1-2 seconds

---

#### **🧪 Test 4: Check-Out Notification**

**On User Device:**
1. After resuming work, click **"Check Out"** button
2. Wait for success message

**On Admin Device:**
- 🔔 **You should see a notification!**
- Title: "👋 User Checked Out"
- Message: "[User Name] checked out"

**Expected Result:** ✅ Notification appears within 1-2 seconds

---

### **STEP 5: Test Background Behavior**

#### **🧪 Test 5: Admin App in Background**

**On Admin Device:**
1. Press **Home button** (minimize app)
2. Open another app (Chrome, Settings, etc.)

**On User Device:**
1. Perform check-in (or any action)

**On Admin Device:**
- 🔔 **Notification should still appear!**
- Pull down notification shade to see it

**Expected Result:** ✅ Notifications work even when app is minimized

---

#### **🧪 Test 6: Multiple Notifications**

**On User Device:**
1. Perform check-in
2. Wait 2 seconds
3. Take break
4. Wait 2 seconds
5. Resume work
6. Wait 2 seconds
7. Check out

**On Admin Device:**
- 🔔 **You should see 4 notifications!**
- All should appear in notification shade

**Expected Result:** ✅ All notifications received

---

## ✅ **Testing Checklist**

Mark each test as you complete it:

- [ ] **Build & Install** - App installed successfully
- [ ] **Admin Login** - Admin logged in successfully
- [ ] **User Login** - User logged in successfully
- [ ] **Notification Permission** - Permission granted
- [ ] **Check-In Notification** - Received ✅
- [ ] **Break Start Notification** - Received ☕
- [ ] **Break End Notification** - Received 💼
- [ ] **Check-Out Notification** - Received 👋
- [ ] **Background Notifications** - Work when app minimized
- [ ] **Multiple Notifications** - All received in sequence

---

## 🐛 **Troubleshooting**

### **Problem: No Notifications Appearing**

#### **Check 1: Notification Permission**
- Go to Android Settings → Apps → Location Attendance
- Check if "Notifications" are enabled
- If not, enable them

#### **Check 2: Admin App Running**
- Make sure admin app is still running
- Check recent apps - app should be there
- If not there, reopen and login again

#### **Check 3: Internet Connection**
- Both devices need internet
- Firestore requires network connection
- Check WiFi/mobile data

#### **Check 4: Check Logs**
```bash
# Run this to see logs:
npx react-native log-android
```
Look for:
- "Started listening for admin notifications"
- "Foreground notification received"

#### **Check 5: Firestore Console**
- Open Firebase Console
- Go to Firestore Database
- Check `notifications` collection
- Verify new documents are being created

---

### **Problem: Notifications Delayed**

**Possible Causes:**
- Slow internet connection
- Device in battery saver mode
- Background app restrictions

**Solutions:**
- Disable battery optimization for the app
- Ensure good internet connection
- Keep app in foreground during testing

---

### **Problem: App Crashes**

**Check:**
```bash
# View crash logs:
npx react-native log-android
```

**Common Issues:**
- Missing notification permission
- Firestore connection error
- Invalid user data

---

## 📊 **Expected Behavior Summary**

| Scenario | Expected Result |
|----------|----------------|
| User checks in | Admin gets notification within 1-2 sec |
| User takes break | Admin gets notification within 1-2 sec |
| User resumes work | Admin gets notification within 1-2 sec |
| User checks out | Admin gets notification within 1-2 sec |
| Admin app in background | Notifications still appear |
| Admin app in foreground | Notifications appear immediately |
| Multiple users | Admin gets notifications from all |
| Admin performs action | Admin does NOT get notification |

---

## 🎯 **Success Criteria**

Your implementation is working if:

✅ Admin receives notifications for all user actions  
✅ Notifications appear within 1-2 seconds  
✅ Notifications work when admin app is in background  
✅ Notification titles and messages are correct  
✅ Multiple notifications can be received in sequence  

---

## 📱 **Testing with Multiple Users**

If you have more user accounts:

1. **Login as User 2** on another device
2. **Perform check-in**
3. **Admin should get notification** from User 2
4. **Both User 1 and User 2** actions should notify admin

---

## 🎉 **All Tests Passed?**

Congratulations! Your admin notification system is working perfectly! 🚀

### **What's Working:**
✅ Real-time notifications  
✅ Background support  
✅ Multiple notification types  
✅ Multiple users support  
✅ 100% FREE  

---

## 📝 **Notes**

- **Notification Sound:** Default system sound
- **Notification Icon:** App icon
- **Notification Priority:** High (appears as heads-up)
- **Notification Channel:** "Attendance Notifications"

---

## 💡 **Tips**

1. **Keep admin app running** for best results
2. **Grant all permissions** when prompted
3. **Test with good internet** connection
4. **Check notification settings** if issues occur
5. **View logs** for debugging

---

## 🆘 **Still Having Issues?**

Check these files for debugging:
- `src/services/adminNotificationListener.ts` - Listener logic
- `src/services/notificationService.ts` - Notification display
- `src/navigation/AppNavigator.tsx` - Listener initialization

Run logs:
```bash
npx react-native log-android
```

Look for errors or warnings related to:
- Firestore
- Notifications
- Permissions

---

## ✅ **Ready to Use in Production**

Once all tests pass, your app is ready for:
- ✅ Real users
- ✅ Multiple admins
- ✅ Daily operations
- ✅ Production deployment

**Enjoy your new admin notification system!** 🎉
