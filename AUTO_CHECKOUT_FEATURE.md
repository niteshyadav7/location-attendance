# Auto Check-Out Feature

## Overview

The auto check-out feature automatically checks out users who forget to manually check out at the end of their workday. This ensures accurate attendance tracking and prevents users from remaining "checked in" indefinitely.

## Business Rules

### 1. Auto Check-Out Trigger Conditions

The system automatically checks out a user when **ALL** of the following conditions are met:

- ✅ User has checked in but has NOT checked out on the same day
- ✅ Current time is 11:00 PM (23:00) or later
- ✅ User has NOT already been auto-checked out
- ✅ User did NOT check in after 11:00 PM

### 2. Working Hours Calculation

For auto check-out cases, the system uses a **Dynamic Cap Rule (Max 7 Hours)**:

- **Logic**: `CheckoutTime = Min(CheckInTime + 7 hours, 7:00 PM)`
- **Cutoff Time**: **7:00 PM (19:00)** is the hard limit for auto-calculated checkout.
- **Early Check-in**: If 7 hours have passed before 7 PM, checkout is backdated to exactly 7 hours after check-in.
- **Late Check-in**: If the 7-hour shift would extend past 7 PM, checkout is capped at 7 PM.

### 3. Auto Check-Out Timestamp

- Checkout time will never be later than **7:00 PM (19:00)**.
- Trigger runs at 11:00 PM to ensure all users are caught, but the *calculated* checkout time is based on 7 PM.

### 4. Idempotency

The auto checkout process is idempotent:
- Once a user is auto-checked out, they will NOT be auto-checked out again
- The `autoCheckout: true` flag prevents duplicate processing

## Implementation

### 1. Database Schema Changes

**AttendanceRecord Interface** (`src/types/index.ts`):

```typescript
export interface AttendanceRecord {
  // ... existing fields
  autoCheckout?: boolean;      // Flag to indicate automatic checkout
  fixedHours?: number;          // Fixed working hours (7) for auto checkout
  notes?: string;               // System notes (e.g., "Auto-checked out by system at 11:00 PM")
  
  // Legacy fields for backward compatibility
  autoCheckedOut?: boolean;     
  penaltyHours?: number;        
}
```

### 2. Client-Side Logic

**Location**: `src/hooks/useAttendance.ts`

The `checkStaleSessions()` function runs:
- On app launch
- When app comes to foreground
- When date changes (midnight)

This provides immediate feedback to users if they were auto-checked out.

### 3. Server-Side Scheduled Function

**Location**: `functions/index.js`

**Function Name**: `autoCheckoutUsers`

**Schedule**: Runs daily at 11:00 PM (23:00) IST

**Cron Expression**: `0 23 * * *`

**Process**:
1. Query all attendance records for today with status `PRESENT` or `ON_BREAK`
2. Filter out records that:
   - Already have `autoCheckout` or `autoCheckedOut` flag
   - Have check-in time after 11:00 PM
3. For each eligible record:
   - Set `checkOutTime` to 11:00 PM
   - Set `autoCheckout: true`
   - Set `fixedHours: 7`
   - Close any open breaks
   - Update user status to `CHECKED_OUT`
   - Increment `missedCheckouts` counter
   - Create admin notification
4. Commit all changes in a single batch operation

## Edge Cases Handled

### ✅ User checks in after 11:00 PM
**Behavior**: No auto checkout
**Reason**: Late-night shifts should not be auto-checked out immediately

### ✅ User manually checks out before 11:00 PM
**Behavior**: Auto checkout does NOT trigger
**Reason**: User already completed their checkout

### ✅ User is on break at 11:00 PM
**Behavior**: Break is automatically ended, then user is checked out
**Reason**: Ensures clean state and accurate break tracking

### ✅ Multiple runs of scheduled function
**Behavior**: Only processes each user once per day
**Reason**: `autoCheckout` flag prevents duplicate processing

### ✅ User from previous day still checked in
**Behavior**: Client-side logic auto-checks out on next app open
**Reason**: Handles cases where scheduled function might have failed

### ✅ Timezone considerations
**Behavior**: Scheduled function uses `Asia/Kolkata` timezone
**Reason**: Ensures 11:00 PM is based on local business time

## Usage Examples

### Example 1: Normal Auto Checkout (Early Start)

**Scenario**: User checks in at 9:00 AM, forgets to check out

**Timeline**:
- 9:00 AM: User checks in
- 11:00 PM: Auto checkout runs
- Logic: 9:00 AM + 7 hours = 4:00 PM (which is before 11 PM)
- Result: User is checked out at **4:00 PM** with **7 hours** credited.

**Database State**:
```javascript
{
  checkInTime: 1704520200000,  // 9:00 AM
  checkOutTime: 1704545400000, // 4:00 PM (Backdated)
  status: 'CHECKED_OUT',
  autoCheckout: true,
  fixedHours: 7,
  notes: 'Auto-checked out. Credited 7h (capped at 7h limit)'
}
```

### Example 2: Automatic Cutoff (Late Start)

**Scenario**: User checks in at 4:00 PM, forgets to check out

**Timeline**:
- 4:00 PM: User checks in
- 11:00 PM: Auto checkout runs (Trigger)
- Logic: 4:00 PM + 7 hours = 11:00 PM.
- Constraint: Max allowed time is 7:00 PM.
- Calculation: `Min(11 PM, 7 PM) = 7 PM`.
- Result: User is checked out at **7:00 PM** with **3 hours** credited.

**Database State**:
```javascript
{
  checkInTime: 1704545400000,  // 4:00 PM
  checkOutTime: 1704556200000, // 7:00 PM
  status: 'CHECKED_OUT',
  autoCheckout: true,
  fixedHours: 3
}
```

### Example 3: Late Night Shift

**Scenario**: User checks in at 11:30 PM

**Timeline**:
- 11:30 PM: User checks in
- 11:00 PM (next day): Auto checkout runs
- Result: User is NOT auto-checked out (checked in after 11 PM)

**Database State**:
```javascript
{
  checkInTime: 1704573000000,  // 11:30 PM
  status: 'PRESENT',
  autoCheckout: false  // Not auto-checked out
}
```

## Calculating Working Hours

Use the utility service `src/services/attendanceCalculations.ts`:

```typescript
import { calculateWorkingHours, getWorkingHoursDisplay } from '@/services/attendanceCalculations';

// Simple calculation
const hours = calculateWorkingHours(attendanceRecord);
// Returns: 7 (for auto checkout) or actual hours (for manual checkout)

// With display formatting
const { hours, displayText, isAutoCheckout } = getWorkingHoursDisplay(attendanceRecord);
// Returns: { hours: 7, displayText: "7h (Auto)", isAutoCheckout: true }
```

## Admin Notifications

When auto checkout occurs, admins receive a notification:

**Notification Type**: `CHECK_OUT`

**Message Format**: `{userName} was auto-checked out at 11:00 PM (7 hours added)`

**Example**:
```javascript
{
  type: 'CHECK_OUT',
  userId: 'user123',
  userName: 'John Doe',
  organizationId: 'org456',
  message: 'John Doe was auto-checked out at 11:00 PM (7 hours added)',
  timestamp: 1704571800000,
  read: false
}
```

## User Notifications

When a user opens the app after being auto-checked out, they see an alert:

**Alert Title**: ⚠️ Auto Checkout

**Alert Message**: 
```
You were automatically checked out for {date} because you forgot to check out by 11 PM.

7 hours have been added to your working time.
```

## Monitoring & Tracking

### User Profile Fields

The system tracks auto checkout history in the user profile:

```typescript
{
  missedCheckouts: number;        // Total count of auto checkouts
  lastAutoCheckoutTime: number;   // Timestamp of last auto checkout
}
```

### Querying Auto Checkouts

**Find all auto checkouts for a user**:
```javascript
const autoCheckouts = await db.collection('attendance')
  .where('userId', '==', userId)
  .where('autoCheckout', '==', true)
  .get();
```

**Count missed checkouts**:
```javascript
const userDoc = await db.collection('users').doc(userId).get();
const missedCount = userDoc.data().missedCheckouts || 0;
```

## Deployment

### Prerequisites

1. Firebase Cloud Functions enabled
2. Firebase Scheduler (Cloud Scheduler) enabled
3. Billing account linked (required for scheduled functions)

### Deploy the Function

```bash
cd functions
npm install
firebase deploy --only functions:autoCheckoutUsers
```

### Verify Deployment

1. Check Firebase Console > Functions
2. Verify `autoCheckoutUsers` is listed
3. Check Cloud Scheduler for the cron job
4. View logs: `firebase functions:log --only autoCheckoutUsers`

### Test the Function

**Manual trigger** (for testing):
```bash
firebase functions:shell
> autoCheckoutUsers()
```

**Check logs**:
```bash
firebase functions:log --only autoCheckoutUsers --limit 50
```

## Troubleshooting

### Function not running at 11:00 PM

**Check**:
1. Verify timezone in function: `timeZone('Asia/Kolkata')`
2. Check Cloud Scheduler in Firebase Console
3. Verify billing is enabled

**Solution**:
```bash
firebase deploy --only functions:autoCheckoutUsers
```

### Users not being auto-checked out

**Check**:
1. Function logs for errors
2. Firestore rules allow function to write
3. User's check-in time is before 11:00 PM
4. `autoCheckout` flag is not already set

**Debug**:
```javascript
// Check function execution
firebase functions:log --only autoCheckoutUsers

// Check attendance records
db.collection('attendance')
  .where('date', '==', '2026-01-06')
  .where('status', 'in', ['PRESENT', 'ON_BREAK'])
  .get()
```

### Duplicate auto checkouts

**Check**: `autoCheckout` flag is being set correctly

**Fix**: The function already handles this with:
```javascript
if (data.autoCheckout || data.autoCheckedOut) {
  continue; // Skip already processed records
}
```

## Future Enhancements

1. **Configurable checkout time**: Allow admins to set custom auto-checkout time per organization
2. **Configurable fixed hours**: Allow admins to set custom fixed hours (instead of 7)
3. **Grace period**: Add a 15-minute grace period before auto checkout
4. **Email notifications**: Send email to users who were auto-checked out
5. **Weekly reports**: Generate reports of users with frequent missed checkouts
6. **SMS notifications**: Send SMS alerts for auto checkout

## Security Considerations

1. **Firestore Rules**: Ensure only the Cloud Function can set `autoCheckout` flag
2. **Client Validation**: Client-side logic validates but doesn't enforce (server is source of truth)
3. **Audit Trail**: All auto checkouts are logged with timestamp and reason
4. **Multi-tenancy**: Function respects organization boundaries

## Performance

- **Batch Operations**: All updates are batched for efficiency
- **Query Optimization**: Uses composite indexes for fast queries
- **Scalability**: Can handle thousands of users per organization
- **Cost**: Minimal (runs once per day, processes only active records)

## Compliance

- **GDPR**: Auto checkout data is part of attendance records (covered by existing privacy policy)
- **Audit**: All auto checkouts are logged and traceable
- **Transparency**: Users are notified when auto-checked out
- **Data Retention**: Follows same retention policy as attendance records
