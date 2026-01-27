# Auto Check-Out Feature - Visual Flow Diagram

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTO CHECK-OUT SYSTEM                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   CLIENT-SIDE        │         │   SERVER-SIDE        │
│   (React Native)     │         │   (Cloud Function)   │
└──────────────────────┘         └──────────────────────┘
         │                                  │
         │                                  │
    ┌────▼────┐                        ┌────▼────┐
    │  User   │                        │  Cron   │
    │  Opens  │                        │ Schedule│
    │   App   │                        │ 11:00PM │
    └────┬────┘                        └────┬────┘
         │                                  │
         │                                  │
    ┌────▼─────────────┐              ┌────▼─────────────┐
    │ checkStale       │              │ autoCheckout     │
    │ Sessions()       │              │ Users()          │
    └────┬─────────────┘              └────┬─────────────┘
         │                                  │
         │                                  │
    ┌────▼─────────────┐              ┌────▼─────────────┐
    │ Query Firestore  │              │ Query Firestore  │
    │ - userId         │              │ - date = today   │
    │ - status IN      │              │ - status IN      │
    │   [PRESENT,      │              │   [PRESENT,      │
    │    ON_BREAK]     │              │    ON_BREAK]     │
    └────┬─────────────┘              └────┬─────────────┘
         │                                  │
         │                                  │
    ┌────▼─────────────┐              ┌────▼─────────────┐
    │ Filter Records   │              │ Filter Records   │
    │ - Not today OR   │              │ - Not auto       │
    │ - After 11PM     │              │   checked out    │
    │ - Not auto       │              │ - Check-in       │
    │   checked out    │              │   before 11PM    │
    └────┬─────────────┘              └────┬─────────────┘
         │                                  │
         │                                  │
    ┌────▼─────────────┐              ┌────▼─────────────┐
    │ Update Record    │              │ Batch Update     │
    │ - checkOutTime   │              │ - checkOutTime   │
    │ - autoCheckout   │              │ - autoCheckout   │
    │ - fixedHours: 7  │              │ - fixedHours: 7  │
    │ - Close breaks   │              │ - Close breaks   │
    └────┬─────────────┘              └────┬─────────────┘
         │                                  │
         │                                  │
    ┌────▼─────────────┐              ┌────▼─────────────┐
    │ Update User      │              │ Update Users     │
    │ - currentStatus  │              │ - currentStatus  │
    │ - missedCheckouts│              │ - missedCheckouts│
    │ - lastAutoTime   │              │ - lastAutoTime   │
    └────┬─────────────┘              └────┬─────────────┘
         │                                  │
         │                                  │
    ┌────▼─────────────┐              ┌────▼─────────────┐
    │ Show Alert       │              │ Create Notif     │
    │ to User          │              │ for Admins       │
    └──────────────────┘              └──────────────────┘
```

---

## 🔄 Data Flow

```
USER CHECK-IN (9:00 AM)
    │
    ▼
┌─────────────────────────────────┐
│ Attendance Record Created       │
│ {                               │
│   userId: "user123"             │
│   date: "2026-01-06"            │
│   checkInTime: 1704520200000    │
│   status: "PRESENT"             │
│   breaks: []                    │
│ }                               │
└─────────────────────────────────┘
    │
    │ (User forgets to check out)
    │
    ▼
AUTO CHECK-OUT (11:00 PM)
    │
    ▼
┌─────────────────────────────────┐
│ Record Updated                  │
│ {                               │
│   userId: "user123"             │
│   date: "2026-01-06"            │
│   checkInTime: 1704520200000    │
│   checkOutTime: 1704571800000   │ ← 11:00 PM
│   status: "CHECKED_OUT"         │
│   autoCheckout: true            │ ← NEW
│   fixedHours: 7                 │ ← NEW
│   notes: "Auto-checked out..."  │ ← NEW
│   breaks: []                    │
│ }                               │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ User Profile Updated            │
│ {                               │
│   uid: "user123"                │
│   currentStatus: "CHECKED_OUT"  │
│   missedCheckouts: 1            │ ← Incremented
│   lastAutoCheckoutTime: ...     │ ← Updated
│ }                               │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ Admin Notification Created      │
│ {                               │
│   type: "CHECK_OUT"             │
│   message: "User was auto..."   │
│   timestamp: ...                │
│ }                               │
└─────────────────────────────────┘
```

---

## ⏰ Timeline Example

```
DAY 1: January 6, 2026

09:00 AM  ✅ User checks in
          └─ Status: PRESENT
          
12:30 PM  ☕ User takes break
          └─ Status: ON_BREAK
          
01:00 PM  💼 User resumes work
          └─ Status: PRESENT
          
06:00 PM  🏠 User goes home (forgets to check out)
          └─ Status: PRESENT (still!)
          
11:00 PM  🤖 AUTO CHECK-OUT RUNS
          ├─ Status: CHECKED_OUT
          ├─ Checkout time: 11:00 PM
          ├─ Fixed hours: 7
          └─ Admin notified

DAY 2: January 7, 2026

08:00 AM  📱 User opens app
          └─ Alert: "You were auto-checked out..."
          
09:00 AM  ✅ User checks in (new day)
          └─ Status: PRESENT
```

---

## 🧮 Working Hours Calculation

```
┌─────────────────────────────────────────────────────────────┐
│                  WORKING HOURS LOGIC                         │
└─────────────────────────────────────────────────────────────┘

IF autoCheckout === true:
    ┌──────────────────────┐
    │  RETURN 7 hours      │  ← Fixed hours
    └──────────────────────┘

ELSE:
    ┌──────────────────────────────────────────┐
    │  totalTime = checkOut - checkIn          │
    │  breakTime = sum(break.end - break.start)│
    │  workingTime = totalTime - breakTime     │
    │  RETURN workingTime / 3600000            │
    └──────────────────────────────────────────┘

EXAMPLE 1 (Auto Checkout):
    checkIn:  09:00 AM
    checkOut: 11:00 PM (auto)
    autoCheckout: true
    → Result: 7 hours ✅

EXAMPLE 2 (Manual Checkout):
    checkIn:  09:00 AM
    checkOut: 06:00 PM (manual)
    breaks: 1 hour
    autoCheckout: false
    → Result: 8 hours (9 - 1) ✅

EXAMPLE 3 (Auto Checkout with Break):
    checkIn:  09:00 AM
    break:    12:30 PM - 01:00 PM
    checkOut: 11:00 PM (auto)
    autoCheckout: true
    → Result: 7 hours ✅ (breaks ignored for auto)
```

---

## 🎯 Decision Tree

```
                    ┌──────────────────┐
                    │  Is user         │
                    │  checked in?     │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │      YES         │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Is it 11:00 PM  │
                    │  or later?       │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │      YES         │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Already auto    │
                    │  checked out?    │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │       NO         │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Checked in      │
                    │  after 11 PM?    │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │       NO         │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  ✅ AUTO         │
                    │  CHECK-OUT       │
                    │  - Set time      │
                    │  - Add 7 hours   │
                    │  - Mark flag     │
                    │  - Notify admin  │
                    └──────────────────┘
```

---

## 📦 Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPONENT LAYERS                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                          │
│  - AttendanceScreen.tsx                                      │
│  - AdminDashboard.tsx                                        │
│  - Shows working hours with "(Auto)" indicator               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ uses
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  BUSINESS LOGIC LAYER                                        │
│  - useAttendance.ts (hook)                                   │
│  - checkStaleSessions()                                      │
│  - handleCheckIn/Out()                                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ uses
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  UTILITY LAYER                                               │
│  - attendanceCalculations.ts                                 │
│  - calculateWorkingHours()                                   │
│  - getWorkingHoursDisplay()                                  │
│  - shouldAutoCheckout()                                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ reads/writes
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  DATA LAYER                                                  │
│  - Firestore (attendance collection)                         │
│  - Firestore (users collection)                              │
│  - Firestore (notifications collection)                      │
└─────────────────────────────────────────────────────────────┘
                  ▲
                  │
                  │ writes
                  │
┌─────────────────┴───────────────────────────────────────────┐
│  CLOUD FUNCTION LAYER                                        │
│  - autoCheckoutUsers (scheduled)                             │
│  - Runs daily at 11:00 PM                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                           │
└─────────────────────────────────────────────────────────────┘

CLIENT REQUEST
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Firebase Authentication                                      │
│ - User must be authenticated                                 │
│ - Token verified                                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Firestore Security Rules                                     │
│ - User can only read own attendance                          │
│ - User CANNOT set autoCheckout flag                          │
│ - Only Cloud Function can set autoCheckout                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Business Logic Validation                                    │
│ - Check if user is in correct location                       │
│ - Verify organization membership                             │
│ - Validate time constraints                                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Data Write                                                   │
│ - Audit trail created                                        │
│ - Timestamp recorded                                         │
│ - Notes added                                                │
└─────────────────────────────────────────────────────────────┘

CLOUD FUNCTION (Privileged)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Admin SDK                                                    │
│ - Bypasses security rules                                    │
│ - Can set autoCheckout flag                                  │
│ - Batch operations allowed                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database State Transitions

```
STATE MACHINE FOR ATTENDANCE RECORD

┌──────────────┐
│   INITIAL    │
│   (No record)│
└──────┬───────┘
       │
       │ User checks in
       ▼
┌──────────────┐
│   PRESENT    │◄────┐
└──────┬───────┘     │
       │             │ Resume work
       │ Take break  │
       ▼             │
┌──────────────┐     │
│  ON_BREAK    │─────┘
└──────┬───────┘
       │
       │ Manual checkout OR Auto checkout
       ▼
┌──────────────────────────────┐
│      CHECKED_OUT             │
│                              │
│  IF autoCheckout === true:   │
│    - fixedHours: 7           │
│    - notes: "Auto..."        │
│                              │
│  ELSE:                       │
│    - Calculate actual hours  │
└──────────────────────────────┘
       │
       │ (End of day)
       ▼
   [ARCHIVED]
```

---

## 🎨 UI Display Examples

```
┌─────────────────────────────────────────────────────────────┐
│  ATTENDANCE CARD - MANUAL CHECKOUT                           │
├─────────────────────────────────────────────────────────────┤
│  Date: Jan 6, 2026                                           │
│  Check In:  09:00 AM                                         │
│  Check Out: 06:00 PM                                         │
│  Breaks: 1h                                                  │
│  Working Hours: 8h                                           │
│  Status: ✅ Checked Out                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ATTENDANCE CARD - AUTO CHECKOUT                             │
├─────────────────────────────────────────────────────────────┤
│  Date: Jan 6, 2026                                           │
│  Check In:  09:00 AM                                         │
│  Check Out: 11:00 PM ⚠️                                      │
│  Breaks: 30m                                                 │
│  Working Hours: 7h (Auto)                                    │
│  Status: ⚠️ Auto Checked Out                                 │
│  Note: Auto-checked out by system at 11:00 PM               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 Monitoring Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN DASHBOARD - AUTO CHECKOUT METRICS                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Today's Auto Checkouts: 3                                   │
│  This Week: 15                                               │
│  This Month: 42                                              │
│                                                              │
│  Top Users with Missed Checkouts:                            │
│  1. John Doe - 5 times                                       │
│  2. Jane Smith - 3 times                                     │
│  3. Bob Johnson - 2 times                                    │
│                                                              │
│  Recent Auto Checkouts:                                      │
│  • John Doe - Jan 6, 11:00 PM (7h added)                     │
│  • Jane Smith - Jan 5, 11:00 PM (7h added)                   │
│  • Bob Johnson - Jan 4, 11:00 PM (7h added)                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                   DEPLOYMENT FLOW                            │
└─────────────────────────────────────────────────────────────┘

1. CODE CHANGES
   ├─ src/types/index.ts
   ├─ src/hooks/useAttendance.ts
   ├─ src/services/attendanceCalculations.ts
   └─ functions/index.js

2. LOCAL TESTING
   ├─ npm install
   ├─ firebase functions:shell
   └─ Test with sample data

3. DEPLOY TO FIREBASE
   ├─ cd functions
   ├─ npm install
   └─ firebase deploy --only functions:autoCheckoutUsers

4. VERIFY DEPLOYMENT
   ├─ Check Firebase Console
   ├─ Verify Cloud Scheduler
   └─ Check function logs

5. MONITOR
   ├─ firebase functions:log
   ├─ Check Firestore data
   └─ Verify notifications

6. PRODUCTION
   └─ Function runs daily at 11:00 PM
```

---

**Legend:**
- ✅ = Success/Completed
- ⚠️ = Warning/Auto Action
- ❌ = Error/Blocked
- 🤖 = Automated Process
- 📱 = User Action
- 🔔 = Notification
