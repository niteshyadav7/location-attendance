# 🔐 Upload Keystore Setup - Complete Guide

## ✅ Files Generated

### 1. Upload Keystore
- **File**: `upload-key.jks`
- **Location**: `android/app/upload-key.jks`
- **Alias**: `upload`
- **Password**: `locationattendance2024`

### 2. Certificate File (PEM)
- **File**: `upload_cert.pem`
- **Location**: `android/app/upload_cert.pem`
- **Purpose**: Upload to Google Play Console for key reset

---

## 📋 Certificate Content (upload_cert.pem)

```
-----BEGIN CERTIFICATE-----
MIIDkTCCAnmgAwIBAgIIBDqNb9Gw3b8wDQYJKoZIhvcNAQELBQAwdjELMAkGA1UE
BhMCSU4xDjAMBgNVBAgTBVN0YXRlMQ0wCwYDVQQHEwRDaXR5MRQwEgYDVQQKEwtZ
b3VyQ29tcGFueTEUMBIGA1UECxMLRGV2ZWxvcG1lbnQxHDAaBgNVBAMTE0xvY2F0
aW9uIEF0dGVuZGFuY2UwIBcNMjUxMjA1MDc0ODM5WhgPMjA1MzA0MjIwNzQ4Mzla
MHYxCzAJBgNVBAYTAklOMQ4wDAYDVQQIEwVTdGF0ZTENMAsGA1UEBxMEQ2l0eTEU
MBIGA1UEChMLWW91ckNvbXBhbnkxFDASBgNVBAsTC0RldmVsb3BtZW50MRwwGgYD
VQQDExNMb2NhdGlvbiBBdHRlbmRhbmNlMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A
MIIBCgKCAQEAn6/zXc+vGkq4+PRRHHsAW4nrCpVNg4yY7vjUQAAw0LSmmPkVjPMV
LC+8ml9TZFMTCIBSNJ2oOnGmo6saHLQxn5CP71k5tEVGITQ54kq+5lOWhh3hoWwc
SXEn7fFnIjmj2c85mn/6u/HrXJQrYrRPXB19UsCBeCc6ydm4pcoI9j6SX3Hba8+I
pU06kNi6VS5a85B2NABG33lLz8DQqbIRgdLGJZsWNB20/vbDyf3rrLVFMbVjaZvU
k9C6Xsbwl8yE6EzPsCLxPYnPt/cleHrFmyEUzEbYLsoVcTsj+MwPhI3m+9KZqWAx
a+MQby5zt5MhFrEtfmz1cw1A5pFTubCOcQIDAQABoyEwHzAdBgNVHQ4EFgQU6cTz
sXKSjrnBNtgxxjqTxP+pnn0wDQYJKoZIhvcNAQELBQADggEBAIXiy3MQ1aAndCjd
E3M+vg2axdb1X01aWjgOFsgWWIm1T53pjY4xGuemmG2gptZ4wEMEz8PCMTajCA9+
xPhamCR8Q3ec4ujivG1OgX5g/alaYaNgRTVm01/8L157/ZtTHolA9EKqtLNOk+Re
piXsPZGjvIxQHzooeih+vWnsEl/SCzN0wmZkYMo6byaYGomT+0+dPekbIzRcWxqh
qb/1Bl9P1lxpWvHhDBWMxkNMburbVknOG6Pa8Ag4a+NNUiFAApvFsWfkU9DlpcL8
5ldb+H2y8CYEZIYMQDeBwXtYcIPKxGdU43UwFQyrxsoT02PUCr6R013jO9hMnt8I
7mM+ecY=
-----END CERTIFICATE-----
```

---

## 🚀 Next Steps - Upload to Play Console

### Step 1: Go to Play Console
1. Open [Google Play Console](https://play.google.com/console)
2. Select your app: **Location Attendance**

### Step 2: Navigate to App Signing
1. Go to: **Setup** → **App Integrity** → **App Signing**
2. Scroll down to: **"Upload key certificate"**
3. Click: **"Request upload key reset"**

### Step 3: Upload Certificate
1. Click: **✔ Request key reset**
2. Upload the file: `android/app/upload_cert.pem`
3. Click: **Submit**

### Step 4: Wait for Approval
- ⏳ Google will review your request (24-48 hours)
- ✅ You'll receive an email when approved
- 📧 Check your Play Console notifications

---

## 🔧 Configuration Already Applied

### ✅ gradle.properties Updated
```properties
MYAPP_RELEASE_STORE_FILE=upload-key.jks
MYAPP_RELEASE_KEY_ALIAS=upload
MYAPP_RELEASE_STORE_PASSWORD=locationattendance2024
MYAPP_RELEASE_KEY_PASSWORD=locationattendance2024
```

### ✅ build.gradle Updated
The release build type now uses the upload keystore:
```gradle
release {
    signingConfig signingConfigs.release
    ...
}
```

---

## 📦 Building New AAB/APK After Approval

Once Google approves your upload key, you can build new releases:

### Clean Build
```bash
cd android
.\gradlew clean
```

### Build AAB (for Play Store)
```bash
.\gradlew bundleRelease
```

### Build APK (for testing)
```bash
.\gradlew assembleRelease
```

The signed files will be in:
- **AAB**: `android/app/build/outputs/bundle/release/app-release.aab`
- **APK**: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🔒 Security Notes

### ⚠️ IMPORTANT - Keep These Safe!
1. **upload-key.jks** - Never lose this file!
2. **Password**: `locationattendance2024` - Store securely
3. **Backup**: Save the keystore to a secure location (cloud storage, USB drive)

### 🚫 DO NOT:
- Commit `gradle.properties` with passwords to Git
- Share the keystore file publicly
- Lose the keystore (you won't be able to update your app!)

### ✅ DO:
- Add to `.gitignore`:
  ```
  android/app/upload-key.jks
  android/gradle.properties
  ```
- Keep multiple backups of the keystore
- Store password in a password manager

---

## 📝 Keystore Details Summary

| Property | Value |
|----------|-------|
| **Keystore File** | upload-key.jks |
| **Alias** | upload |
| **Password** | locationattendance2024 |
| **Key Algorithm** | RSA |
| **Key Size** | 2048 bits |
| **Validity** | 10,000 days (~27 years) |
| **Valid Until** | April 22, 2053 |

---

## 🎯 Current Status

- ✅ Upload keystore generated
- ✅ Certificate (.pem) generated
- ✅ gradle.properties configured
- ✅ build.gradle updated
- ⏳ **NEXT**: Upload `upload_cert.pem` to Play Console
- ⏳ **WAIT**: Google approval (24-48 hours)
- ⏳ **THEN**: Build and upload new AAB with updated version

---

## 📞 Support

If you encounter any issues:
1. Check that the keystore file exists in `android/app/`
2. Verify the passwords in `gradle.properties`
3. Ensure the certificate was uploaded correctly to Play Console
4. Wait for Google's approval email before building new releases

---

**Generated**: December 5, 2025
**App**: Location Attendance v3.0
