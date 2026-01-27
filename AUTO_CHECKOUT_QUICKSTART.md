# Auto Check-Out Feature - Quick Start

## What It Does

Automatically checks out users at 11:00 PM if they forgot to check out manually, adding a fixed 7 hours to their working time.

## Key Rules

✅ **Triggers at**: 11:00 PM (23:00) every day  
✅ **Fixed Hours**: 7 hours (not actual time worked)  
✅ **Skips**: Users who checked in after 11 PM  
✅ **Skips**: Users already checked out  
✅ **Idempotent**: Won't auto-checkout the same user twice  

## Quick Deploy

### 1. Deploy the Cloud Function

```bash
cd functions
npm install
firebase deploy --only functions:autoCheckoutUsers
```

### 2. Verify Deployment

Check Firebase Console > Functions > `autoCheckoutUsers`

### 3. Test (Optional)

```bash
# View logs
firebase functions:log --only autoCheckoutUsers

# Manual test trigger
firebase functions:shell
> autoCheckoutUsers()
```

## How It Works

### Server-Side (Scheduled Function)
- **Runs**: Daily at 11:00 PM IST
- **Queries**: All users with status `PRESENT` or `ON_BREAK` for today
- **Updates**: Sets checkout time to 11:00 PM, adds 7 hours, marks as auto-checkout
- **Notifies**: Creates admin notification

### Client-Side (App Logic)
- **Runs**: On app launch, foreground, or date change
- **Checks**: For any stale sessions (old dates or past 11 PM)
- **Alerts**: User if they were auto-checked out
- **Syncs**: With server-side auto-checkout

## Files Changed

### 1. Types
- `src/types/index.ts` - Added `autoCheckout`, `fixedHours`, `notes` fields

### 2. Client Logic
- `src/hooks/useAttendance.ts` - Updated `checkStaleSessions()` to use 7-hour rule

### 3. Server Function
- `functions/index.js` - Added `autoCheckoutUsers` scheduled function

### 4. Utilities
- `src/services/attendanceCalculations.ts` - New service for working hours calculation

### 5. Documentation
- `AUTO_CHECKOUT_FEATURE.md` - Comprehensive feature documentation

## Usage in Code

### Calculate Working Hours

```typescript
import { calculateWorkingHours } from '@/services/attendanceCalculations';

const hours = calculateWorkingHours(attendanceRecord);
// Returns: 7 (if auto checkout) or actual hours (if manual)
```

### Display Working Hours

```typescript
import { getWorkingHoursDisplay } from '@/services/attendanceCalculations';

const { hours, displayText, isAutoCheckout } = getWorkingHoursDisplay(record);
// Example: { hours: 7, displayText: "7h (Auto)", isAutoCheckout: true }
```

### Check If Should Auto Checkout

```typescript
import { shouldAutoCheckout } from '@/services/attendanceCalculations';

if (shouldAutoCheckout(record)) {
  // Perform auto checkout
}
```

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| User checks in after 11 PM | ❌ No auto checkout |
| User manually checks out before 11 PM | ❌ No auto checkout |
| User on break at 11 PM | ✅ Break ended, then checked out |
| Function runs multiple times | ✅ Only processes once (idempotent) |
| User from yesterday still checked in | ✅ Client auto-checks out on app open |

## Monitoring

### Check Missed Checkouts for a User

```typescript
const userDoc = await db.collection('users').doc(userId).get();
const missedCount = userDoc.data().missedCheckouts || 0;
const lastAutoCheckout = userDoc.data().lastAutoCheckoutTime;
```

### Query All Auto Checkouts

```typescript
const autoCheckouts = await db.collection('attendance')
  .where('autoCheckout', '==', true)
  .where('organizationId', '==', orgId)
  .get();
```

## Troubleshooting

### Function not running?
1. Check billing is enabled (required for scheduled functions)
2. Verify timezone: `timeZone('Asia/Kolkata')`
3. Check Cloud Scheduler in Firebase Console

### Users not auto-checked out?
1. Check function logs: `firebase functions:log --only autoCheckoutUsers`
2. Verify Firestore rules allow function writes
3. Ensure user checked in before 11 PM

### Need to change timezone?
Edit `functions/index.js`:
```javascript
.timeZone('Your/Timezone') // e.g., 'America/New_York'
```

## Configuration

### Change Auto Checkout Time
Edit `functions/index.js`:
```javascript
.schedule('0 22 * * *') // 10:00 PM instead of 11:00 PM
```

### Change Fixed Hours
Edit `functions/index.js` and `src/hooks/useAttendance.ts`:
```javascript
fixedHours: 8, // 8 hours instead of 7
```

## Cost Estimate

- **Cloud Function**: ~$0.01/month (runs once per day)
- **Cloud Scheduler**: Free tier (3 jobs/month free)
- **Firestore**: Minimal (batch writes)

**Total**: Essentially free for most use cases

## Support

For detailed documentation, see: `AUTO_CHECKOUT_FEATURE.md`

For issues, check:
1. Firebase Console > Functions > Logs
2. Cloud Scheduler execution history
3. Firestore attendance records

## Next Steps

1. ✅ Deploy the function
2. ✅ Test with a user account
3. ✅ Monitor logs for first few days
4. ✅ Update admin dashboard to show auto-checkout stats
5. ✅ Consider adding email notifications for users
