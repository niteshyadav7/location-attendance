# Google Sheets Admin Panel - Device Reset Feature

## 🆕 New Features Added

### 1. Device Management Columns
The **Users** sheet now includes 3 new columns:

| Column | Description | Example Values |
|--------|-------------|----------------|
| **I - Device ID** | The unique ID of the registered device | `abc123xyz456` or empty |
| **J - Reset Requested** | Whether employee requested device change | `YES` or `NO` |
| **K - Reset Date** | When the reset was requested | `12/23/2025, 12:15:30 AM` |

### 2. Sync Users Enhancement
When you click **App Admin > Sync All Data > Sync Users**, it now fetches:
- All existing user data
- **Device ID** (if device is locked)
- **Reset Requested** status
- **Reset Request Date** (if applicable)

### 3. Approve Device Reset Function
**New Menu Item:** `App Admin > ✅ Approve Device Reset`

#### How to Use:
1. Click **App Admin > Sync Users** to get latest data
2. Look for rows where **Reset Requested** = `YES`
3. Click on that user's row
4. Click **App Admin > ✅ Approve Device Reset**
5. Confirm the approval
6. Done! The device is unlinked and employee can login on new device

#### What It Does:
- Clears the `registeredDeviceId` (unlocks device)
- Sets `deviceResetRequested` to `false`
- Clears `deviceResetRequestDate`
- Updates the sheet immediately to show changes

---

## 📋 Complete Workflow Example

### Scenario: Employee Lost Phone

**In Mobile App:**
1. Employee tries to login from new phone → Blocked
2. Employee taps "Request Device Change"
3. Request is sent to Firebase

**In Google Sheets:**
1. Admin opens Google Sheet
2. Clicks **App Admin > Sync Users**
3. Sees employee row with:
   - Device ID: `abc123xyz456`
   - Reset Requested: `YES`
   - Reset Date: `12/23/2025, 12:15:30 AM`
4. Clicks on employee's row
5. Clicks **App Admin > ✅ Approve Device Reset**
6. Confirms approval
7. Sheet updates to show:
   - Device ID: *(empty)*
   - Reset Requested: `NO`
   - Reset Date: *(empty)*

**Back in Mobile App:**
8. Employee tries to login again → Success!
9. New device is now locked to their account

---

## 🔍 Quick Reference

### Menu Structure
```
App Admin
├── 🚀 Initialize System (Run First)
├── 🔄 Sync All Data
│   ├── Sync Users ← Shows device data
│   ├── Sync Companies
│   ├── Sync Locations
│   ├── Sync Notices
│   ├── Sync Leaves
│   └── Sync Attendance
├── ❌ Sync Deletions (Sheet ➔ DB)
│   ├── Delete Missing Users
│   ├── Delete Missing Companies
│   ├── Delete Missing Locations
│   ├── Delete Missing Notices
│   └── Delete Missing Leaves
├── ➕ Creates
│   ├── Create Company
│   ├── Create User (w/ Auth)
│   ├── Create Location
│   └── Post Notice
├── 💾 Update Selected Row
└── ✅ Approve Device Reset ← NEW!
```

### Column Reference (Users Sheet)
```
A - UID
B - Name
C - Email
D - Role
E - Status
F - Is Active
G - Last Active
H - Organization ID
I - Device ID          ← NEW
J - Reset Requested    ← NEW
K - Reset Date         ← NEW
```

---

## ⚠️ Important Notes

1. **Sync First**: Always click "Sync Users" before approving device resets to get the latest data
2. **Safety Check**: The function will alert you if the selected user hasn't requested a reset
3. **Immediate Update**: The sheet updates instantly after approval - no need to sync again
4. **Super Admin Protection**: The Super Admin account cannot be accidentally deleted via sync deletions

---

## 🚀 Installation

1. Open your Google Sheet
2. Go to **Extensions > Apps Script**
3. Replace the entire code with the updated `google_sheets_script.js`
4. Save the script
5. Refresh your Google Sheet
6. The new menu items will appear

---

**Updated:** December 23, 2025  
**Version:** 3.6 Compatible
