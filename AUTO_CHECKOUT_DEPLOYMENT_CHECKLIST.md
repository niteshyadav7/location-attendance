# Auto Check-Out Feature - Deployment Checklist

## 📋 Pre-Deployment Checklist

### ✅ Code Review
- [ ] Review all modified files
  - [ ] `src/types/index.ts` - Type definitions updated
  - [ ] `src/hooks/useAttendance.ts` - Client logic updated
  - [ ] `functions/index.js` - Cloud Function added
  - [ ] `src/services/attendanceCalculations.ts` - Utility service created
- [ ] Verify no syntax errors
- [ ] Check TypeScript compilation
- [ ] Review security implications

### ✅ Firebase Setup
- [ ] Firebase project is set up
- [ ] Billing is enabled (required for scheduled functions)
- [ ] Cloud Scheduler API is enabled
- [ ] Firebase Admin SDK is initialized
- [ ] Firestore is configured
- [ ] Firebase Functions are enabled

### ✅ Dependencies
- [ ] `firebase-admin` version: ^11.11.0 or higher
- [ ] `firebase-functions` version: ^4.5.0 or higher
- [ ] Node.js version: 18 or higher
- [ ] All npm packages installed

### ✅ Configuration
- [ ] Timezone is correct in `functions/index.js`
  - Current: `Asia/Kolkata`
  - Change if needed: `timeZone('Your/Timezone')`
- [ ] Auto checkout time is correct
  - Current: 11:00 PM (23:00)
  - Cron: `0 23 * * *`
- [ ] Fixed hours logic is correct
  - Current: Dynamic (Max 7 hours)
  - Change if needed in `functions/index.js`

---

## 🚀 Deployment Steps

### Step 1: Prepare Functions Directory

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Verify package.json
cat package.json
```

**Expected Output:**
```json
{
  "dependencies": {
    "firebase-admin": "^11.11.0",
    "firebase-functions": "^4.5.0"
  }
}
```

- [ ] Dependencies installed successfully
- [ ] No errors in package.json

---

### Step 2: Test Locally (Optional but Recommended)

```bash
# Start Firebase emulator
firebase emulators:start --only functions

# In another terminal, test the function
firebase functions:shell
```

**In the shell:**
```javascript
> autoCheckoutUsers()
```

**Expected Output:**
```
Starting auto checkout process at 11:00 PM
Found X user(s) to auto checkout
Successfully auto checked out X user(s)
{ success: true, count: X }
```

- [ ] Function executes without errors
- [ ] Logs show expected behavior
- [ ] Test data is updated correctly

---

### Step 3: Deploy to Firebase

```bash
# Deploy only the auto checkout function
firebase deploy --only functions:autoCheckoutUsers
```

**Expected Output:**
```
✔  functions: Finished running predeploy script.
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
i  functions: ensuring required API cloudbuild.googleapis.com is enabled...
✔  functions: required API cloudfunctions.googleapis.com is enabled
✔  functions: required API cloudbuild.googleapis.com is enabled
i  functions: preparing functions directory for uploading...
i  functions: packaged functions (XX KB) for uploading
✔  functions: functions folder uploaded successfully
i  functions: creating Node.js 18 function autoCheckoutUsers...
✔  functions[autoCheckoutUsers]: Successful create operation.
Function URL (autoCheckoutUsers): https://...

✔  Deploy complete!
```

- [ ] Deployment successful
- [ ] No errors during deployment
- [ ] Function URL generated

---

### Step 4: Verify Deployment

#### 4.1 Check Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Functions**
4. Verify `autoCheckoutUsers` is listed

- [ ] Function appears in console
- [ ] Status shows "Healthy"
- [ ] Trigger type shows "Scheduled"

#### 4.2 Check Cloud Scheduler

1. In Firebase Console, go to **Functions**
2. Click on `autoCheckoutUsers`
3. Check the **Trigger** tab
4. Verify schedule: `0 23 * * *`
5. Verify timezone: `Asia/Kolkata` (or your timezone)

- [ ] Schedule is correct
- [ ] Timezone is correct
- [ ] Next run time is shown

#### 4.3 Check Function Logs

```bash
# View recent logs
firebase functions:log --only autoCheckoutUsers --limit 50

# Follow logs in real-time
firebase functions:log --only autoCheckoutUsers --follow
```

- [ ] Logs are accessible
- [ ] No errors in logs
- [ ] Function is ready to run

---

### Step 5: Test with Real Data

#### 5.1 Create Test Scenario

1. Create a test user account
2. Check in the user (before 11:00 PM)
3. Do NOT check out
4. Wait until 11:00 PM (or manually trigger function)

**Manual Trigger (for testing):**
```bash
firebase functions:shell
> autoCheckoutUsers()
```

#### 5.2 Verify Results

**Check Firestore:**
```javascript
// In Firebase Console > Firestore
// Navigate to: attendance collection
// Find the test user's record
// Verify fields:
{
  status: "CHECKED_OUT",
  checkOutTime: <timestamp at 11:00 PM>,
  autoCheckout: true,
  fixedHours: <number <= 7>,
  notes: "Auto-checked out. Credited <hours>h (capped at 7h limit)"
}
```

**Check User Profile:**
```javascript
// In Firebase Console > Firestore
// Navigate to: users collection
// Find the test user
// Verify fields:
{
  currentStatus: "CHECKED_OUT",
  missedCheckouts: <incremented>,
  lastAutoCheckoutTime: <timestamp>
}
```

**Check Notifications:**
```javascript
// In Firebase Console > Firestore
// Navigate to: notifications collection
// Find the notification
// Verify fields:
{
  type: "CHECK_OUT",
  message: "<userName> was auto-checked out at 11:00 PM (7 hours added)",
  organizationId: <orgId>,
  timestamp: <timestamp>
}
```

- [ ] Attendance record updated correctly
- [ ] User profile updated correctly
- [ ] Notification created for admin
- [ ] Working hours calculated as 7

---

### Step 6: Monitor Production

#### 6.1 First 24 Hours

```bash
# Check logs every few hours
firebase functions:log --only autoCheckoutUsers --limit 100

# Check for errors
firebase functions:log --only autoCheckoutUsers --limit 100 | grep -i error
```

- [ ] Function runs at 11:00 PM
- [ ] No errors in logs
- [ ] Users are auto-checked out correctly

#### 6.2 First Week

- [ ] Monitor user feedback
- [ ] Check for any complaints
- [ ] Verify working hours are correct
- [ ] Ensure no duplicate auto checkouts

#### 6.3 Ongoing Monitoring

Set up alerts:
```bash
# In Firebase Console > Functions > autoCheckoutUsers
# Click "Logs" tab
# Set up log-based alerts for errors
```

- [ ] Alerts configured
- [ ] Weekly review scheduled
- [ ] Metrics dashboard created (optional)

---

## 🔍 Verification Checklist

### ✅ Functional Testing

- [ ] User who forgets to check out is auto-checked out at 11:00 PM
- [ ] Working hours are set to 7 (not actual time)
- [ ] User who checks in after 11:00 PM is NOT auto-checked out
- [ ] User who manually checks out before 11:00 PM is NOT auto-checked out
- [ ] User on break at 11:00 PM has break ended and is checked out
- [ ] Function is idempotent (no duplicate checkouts)
- [ ] Admin receives notification
- [ ] User sees alert when opening app next day

### ✅ Data Integrity

- [ ] `autoCheckout` flag is set correctly
- [ ] `fixedHours` is always 7
- [ ] `checkOutTime` is exactly 11:00 PM
- [ ] `status` is changed to "CHECKED_OUT"
- [ ] Breaks are closed properly
- [ ] User profile is updated
- [ ] Notification is created

### ✅ Edge Cases

- [ ] Multiple users auto-checked out in same run
- [ ] User from previous day still checked in
- [ ] User with open break at 11:00 PM
- [ ] Function runs multiple times (idempotency)
- [ ] Timezone changes (daylight saving)
- [ ] Network failures (retry logic)

### ✅ Security

- [ ] Only Cloud Function can set `autoCheckout` flag
- [ ] Users cannot modify `autoCheckout` field
- [ ] Firestore rules are correct
- [ ] Multi-tenancy is respected
- [ ] Audit trail is maintained

### ✅ Performance

- [ ] Function completes within timeout (9 minutes default)
- [ ] Batch operations are efficient
- [ ] No excessive Firestore reads/writes
- [ ] Logs are not excessive

---

## 📊 Success Metrics

### Day 1
- [ ] Function deployed successfully
- [ ] First run at 11:00 PM completed
- [ ] At least 1 user auto-checked out (if applicable)
- [ ] No errors in logs

### Week 1
- [ ] Function runs daily at 11:00 PM
- [ ] All eligible users are auto-checked out
- [ ] No user complaints
- [ ] Working hours calculated correctly

### Month 1
- [ ] Function is stable
- [ ] Auto checkout rate is tracked
- [ ] User feedback is positive
- [ ] Admin dashboard shows metrics

---

## 🐛 Troubleshooting Guide

### Issue: Function not deployed

**Check:**
```bash
firebase functions:list
```

**Solution:**
```bash
firebase deploy --only functions:autoCheckoutUsers --force
```

- [ ] Issue resolved

---

### Issue: Function not running at 11:00 PM

**Check:**
1. Firebase Console > Functions > autoCheckoutUsers
2. Verify schedule and timezone
3. Check Cloud Scheduler

**Solution:**
```bash
# Redeploy function
firebase deploy --only functions:autoCheckoutUsers --force
```

- [ ] Issue resolved

---

### Issue: Users not being auto-checked out

**Check logs:**
```bash
firebase functions:log --only autoCheckoutUsers --limit 100
```

**Common causes:**
- User already auto-checked out (`autoCheckout` flag set)
- User checked in after 11:00 PM
- User manually checked out
- Firestore rules blocking writes

**Solution:**
1. Review function logs
2. Check Firestore data
3. Verify Firestore rules
4. Test with sample data

- [ ] Issue resolved

---

### Issue: Duplicate auto checkouts

**Check:**
```javascript
// In Firestore, check if autoCheckout flag is set
db.collection('attendance')
  .where('autoCheckout', '==', true)
  .where('userId', '==', 'testUserId')
  .get()
```

**Solution:**
- Function already prevents this with `if (data.autoCheckout) continue;`
- If still occurring, check for race conditions
- Ensure function is not deployed multiple times

- [ ] Issue resolved

---

### Issue: Incorrect working hours

**Check:**
```typescript
import { calculateWorkingHours } from '@/services/attendanceCalculations';
const hours = calculateWorkingHours(record);
console.log('Hours:', hours);
```

**Solution:**
- Ensure `autoCheckout` flag is set
- Verify `fixedHours` is 7
- Update UI to use `calculateWorkingHours` utility

- [ ] Issue resolved

---

## 📝 Post-Deployment Tasks

### Immediate (Day 1)
- [ ] Monitor first run at 11:00 PM
- [ ] Check logs for errors
- [ ] Verify at least one auto checkout (if applicable)
- [ ] Test user alert on app open

### Short-term (Week 1)
- [ ] Gather user feedback
- [ ] Review auto checkout metrics
- [ ] Update admin dashboard
- [ ] Document any issues

### Long-term (Month 1)
- [ ] Analyze auto checkout trends
- [ ] Consider adding email notifications
- [ ] Optimize function performance
- [ ] Plan future enhancements

---

## 🎉 Deployment Complete!

Once all checkboxes are marked:

✅ **Auto Check-Out Feature is LIVE!**

**Next Steps:**
1. Monitor function execution
2. Gather user feedback
3. Update documentation as needed
4. Plan future enhancements

---

## 📞 Support Resources

- **Documentation**: `AUTO_CHECKOUT_FEATURE.md`
- **Quick Start**: `AUTO_CHECKOUT_QUICKSTART.md`
- **Migration**: `AUTO_CHECKOUT_MIGRATION.md`
- **Visual Guide**: `AUTO_CHECKOUT_VISUAL_GUIDE.md`
- **Summary**: `AUTO_CHECKOUT_SUMMARY.md`

---

## 📅 Deployment Log

**Date**: _________________

**Deployed By**: _________________

**Version**: _________________

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Issues Encountered**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Resolution**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

**Signature**: _________________

**Date**: _________________
