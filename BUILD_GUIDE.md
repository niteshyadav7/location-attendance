# Build APK and AAB - Complete Guide

## Current Version
- **Version Name:** 3.8.4
- **Version Code:** 20

---

## Prerequisites

### 1. Check Keystore File
Make sure you have the release keystore file at:
```
d:\yash-android-projects\locationAttendance\android\app\my-release-key.keystore
```

### 2. Check gradle.properties
Make sure this file exists:
```
d:\yash-android-projects\locationAttendance\android\gradle.properties
```

And contains:
```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your_store_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

---

## Build Commands

### **Option 1: Build Both APK and AAB (Recommended)**

Open terminal in project root and run:

```bash
# Clean previous builds
cd android
./gradlew clean
cd ..

# Build APK (for testing/distribution)
cd android
./gradlew assembleRelease
cd ..

# Build AAB (for Play Store)
cd android
./gradlew bundleRelease
cd ..
```

### **Option 2: Build APK Only**

```bash
cd android
./gradlew clean
./gradlew assembleRelease
cd ..
```

### **Option 3: Build AAB Only**

```bash
cd android
./gradlew clean
./gradlew bundleRelease
cd ..
```

---

## Output Locations

### **APK File:**
```
d:\yash-android-projects\locationAttendance\android\app\build\outputs\apk\release\app-release.apk
```

**Size:** ~50-70 MB
**Use for:** Direct installation, testing, sharing

### **AAB File:**
```
d:\yash-android-projects\locationAttendance\android\app\build\outputs\bundle\release\app-release.aab
```

**Size:** ~30-40 MB
**Use for:** Google Play Store upload

---

## Step-by-Step Build Process

### **Step 1: Clean Previous Builds**

```bash
cd d:\yash-android-projects\locationAttendance
cd android
./gradlew clean
```

**What this does:** Removes old build files

---

### **Step 2: Build APK**

```bash
./gradlew assembleRelease
```

**Expected output:**
```
> Task :app:assembleRelease
BUILD SUCCESSFUL in 2m 34s
```

**APK Location:**
```
android\app\build\outputs\apk\release\app-release.apk
```

---

### **Step 3: Build AAB**

```bash
./gradlew bundleRelease
```

**Expected output:**
```
> Task :app:bundleRelease
BUILD SUCCESSFUL in 1m 45s
```

**AAB Location:**
```
android\app\build\outputs\bundle\release\app-release.aab
```

---

## Troubleshooting

### **Error: Keystore not found**

**Problem:**
```
Keystore file 'd:\yash-android-projects\locationAttendance\android\app\my-release-key.keystore' not found
```

**Solution:**
1. Check if keystore file exists
2. If not, generate new keystore:
```bash
cd android\app
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

---

### **Error: gradle.properties not found**

**Problem:**
```
Could not get unknown property 'MYAPP_RELEASE_STORE_FILE'
```

**Solution:**
Create `android/gradle.properties` with:
```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your_password
MYAPP_RELEASE_KEY_PASSWORD=your_password
```

---

### **Error: Build failed**

**Problem:**
```
BUILD FAILED
```

**Solution:**
1. Clean build:
```bash
cd android
./gradlew clean
```

2. Try again:
```bash
./gradlew assembleRelease
```

---

## Verify Build

### **Check APK:**

```bash
# Check file size
dir android\app\build\outputs\apk\release\app-release.apk

# Install on device
adb install android\app\build\outputs\apk\release\app-release.apk
```

### **Check AAB:**

```bash
# Check file size
dir android\app\build\outputs\bundle\release\app-release.aab

# Test AAB locally (requires bundletool)
bundletool build-apks --bundle=android\app\build\outputs\bundle\release\app-release.aab --output=test.apks
```

---

## Upload to Play Store

### **Step 1: Go to Play Console**
https://play.google.com/console

### **Step 2: Select Your App**
Click on "Location Attendance"

### **Step 3: Create New Release**
1. Go to **Production** → **Create new release**
2. Upload AAB file: `app-release.aab`
3. Add release notes
4. Review and rollout

### **Step 4: Release Notes Template**

```
What's New in v3.8.4:

🛰️ GPS Improvements
- Enhanced location accuracy with retry logic
- Better error messages for GPS issues
- Improved indoor location detection

🔒 Security Updates
- Admin-only attendance reopen
- Enhanced permission controls
- Better data isolation

📱 UI Enhancements
- App version display on dashboard
- Fixed bottom navigation visibility
- Improved touch targets

🐛 Bug Fixes
- Fixed admin check-in permission error
- Resolved GPS timeout issues
- Fixed navigation bar hiding on some devices

📄 Updated privacy policy
```

---

## Quick Commands (Copy & Paste)

### **Build Everything:**

```bash
cd d:\yash-android-projects\locationAttendance
cd android
./gradlew clean
./gradlew assembleRelease
./gradlew bundleRelease
cd ..
```

### **Just APK:**

```bash
cd d:\yash-android-projects\locationAttendance\android
./gradlew clean assembleRelease
cd ..
```

### **Just AAB:**

```bash
cd d:\yash-android-projects\locationAttendance\android
./gradlew clean bundleRelease
cd ..
```

---

## File Sizes (Approximate)

| File | Size | Use |
|------|------|-----|
| **APK** | 50-70 MB | Direct install, testing |
| **AAB** | 30-40 MB | Play Store upload |
| **Installed App** | 80-100 MB | On device |

---

## Checklist Before Building

- [ ] Updated version in `build.gradle`
- [ ] Tested all features
- [ ] Fixed all bugs
- [ ] Updated privacy policy
- [ ] Deployed Firestore rules
- [ ] Keystore file exists
- [ ] gradle.properties configured
- [ ] Clean build directory

---

## After Building

### **For APK:**
- [ ] Install on test device
- [ ] Test all features
- [ ] Check GPS functionality
- [ ] Test bottom navigation
- [ ] Verify app version display

### **For AAB:**
- [ ] Upload to Play Console
- [ ] Add release notes
- [ ] Update screenshots (if needed)
- [ ] Review and publish

---

## Common Issues

### **1. Build Takes Too Long**

**Solution:**
- Close other applications
- Increase RAM allocation in `gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m
```

### **2. Out of Memory**

**Solution:**
```bash
# Increase heap size
set GRADLE_OPTS=-Xmx4096m
./gradlew assembleRelease
```

### **3. Build Successful but APK Not Found**

**Solution:**
Check exact path:
```bash
dir /s app-release.apk
```

---

## Summary

**To build both APK and AAB:**

1. Open terminal
2. Navigate to project:
   ```bash
   cd d:\yash-android-projects\locationAttendance
   ```
3. Run build commands:
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleRelease
   ./gradlew bundleRelease
   cd ..
   ```
4. Find files:
   - APK: `android\app\build\outputs\apk\release\app-release.apk`
   - AAB: `android\app\build\outputs\bundle\release\app-release.aab`

**Done!** 🎉
