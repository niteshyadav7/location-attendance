# Auto Check-Out Feature - Migration Guide

## Overview

This guide helps you migrate existing attendance records to support the new auto check-out feature.

## Database Changes

### New Fields in AttendanceRecord

```typescript
{
  autoCheckout?: boolean;      // NEW: Flag for automatic checkout
  fixedHours?: number;          // NEW: Fixed hours (7) for auto checkout
  notes?: string;               // NEW: System notes
  
  // Legacy fields (keep for backward compatibility)
  autoCheckedOut?: boolean;     // OLD: Previous auto checkout flag
  penaltyHours?: number;        // OLD: Previous penalty system
}
```

## Migration Strategy

### Option 1: No Migration Needed (Recommended)

**Why**: The new code is backward compatible with existing data.

- Old records without `autoCheckout` field will work fine
- New auto checkouts will use the new `autoCheckout` flag
- Legacy `autoCheckedOut` flag is still checked for backward compatibility

**Action**: None required. Deploy and go!

### Option 2: Migrate Existing Auto Checkouts (Optional)

If you want to standardize all historical auto checkouts to use the new format:

#### Step 1: Create Migration Script

Create `functions/migrate-auto-checkouts.js`:

```javascript
const admin = require('firebase-admin');
admin.initializeApp();

async function migrateAutoCheckouts() {
  const db = admin.firestore();
  
  // Query all old auto checkouts
  const snapshot = await db.collection('attendance')
    .where('autoCheckedOut', '==', true)
    .get();
  
  console.log(`Found ${snapshot.size} records to migrate`);
  
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    
    // Skip if already migrated
    if (data.autoCheckout) {
      return;
    }
    
    // Migrate to new format
    batch.update(doc.ref, {
      autoCheckout: true,
      fixedHours: data.penaltyHours || 7,
      notes: data.notes || 'Auto-checked out by system (migrated from old format)'
    });
    
    count++;
    
    // Firestore batch limit is 500
    if (count % 500 === 0) {
      console.log(`Migrating batch of ${count} records...`);
    }
  });
  
  if (count > 0) {
    await batch.commit();
    console.log(`Successfully migrated ${count} records`);
  } else {
    console.log('No records to migrate');
  }
}

migrateAutoCheckouts()
  .then(() => {
    console.log('Migration complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
```

#### Step 2: Run Migration

```bash
cd functions
node migrate-auto-checkouts.js
```

#### Step 3: Verify Migration

```javascript
// Check migrated records
db.collection('attendance')
  .where('autoCheckout', '==', true)
  .limit(10)
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      console.log(doc.data());
    });
  });
```

## Firestore Security Rules

### Update Rules (If Needed)

Ensure your Firestore rules allow the Cloud Function to write the new fields:

```javascript
match /attendance/{attendanceId} {
  // Allow Cloud Functions to set auto checkout fields
  allow write: if request.auth != null && 
                  (request.auth.token.admin == true || 
                   request.resource.data.autoCheckout == true);
  
  // Users can only update their own attendance (not auto checkout fields)
  allow update: if request.auth.uid == resource.data.userId &&
                   !request.resource.data.diff(resource.data).affectedKeys()
                     .hasAny(['autoCheckout', 'fixedHours']);
}
```

## Testing Migration

### Test Plan

1. **Before Migration**
   ```javascript
   // Check existing auto checkouts
   const before = await db.collection('attendance')
     .where('autoCheckedOut', '==', true)
     .count()
     .get();
   console.log('Old format:', before.data().count);
   ```

2. **Run Migration**
   ```bash
   node migrate-auto-checkouts.js
   ```

3. **After Migration**
   ```javascript
   // Check new auto checkouts
   const after = await db.collection('attendance')
     .where('autoCheckout', '==', true)
     .count()
     .get();
   console.log('New format:', after.data().count);
   ```

4. **Verify Data Integrity**
   ```javascript
   // Spot check a few records
   const sample = await db.collection('attendance')
     .where('autoCheckout', '==', true)
     .limit(5)
     .get();
   
   sample.forEach(doc => {
     const data = doc.data();
     console.log({
       date: data.date,
       userName: data.userName,
       autoCheckout: data.autoCheckout,
       fixedHours: data.fixedHours,
       notes: data.notes
     });
   });
   ```

## Rollback Plan

If you need to rollback the migration:

### Rollback Script

Create `functions/rollback-migration.js`:

```javascript
const admin = require('firebase-admin');
admin.initializeApp();

async function rollbackMigration() {
  const db = admin.firestore();
  
  const snapshot = await db.collection('attendance')
    .where('autoCheckout', '==', true)
    .get();
  
  console.log(`Found ${snapshot.size} records to rollback`);
  
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach(doc => {
    // Remove new fields, keep legacy fields
    batch.update(doc.ref, {
      autoCheckout: admin.firestore.FieldValue.delete(),
      fixedHours: admin.firestore.FieldValue.delete()
    });
    
    count++;
  });
  
  if (count > 0) {
    await batch.commit();
    console.log(`Successfully rolled back ${count} records`);
  }
}

rollbackMigration()
  .then(() => {
    console.log('Rollback complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Rollback failed:', error);
    process.exit(1);
  });
```

### Run Rollback

```bash
cd functions
node rollback-migration.js
```

## Data Validation

### Validate Auto Checkout Records

Create `functions/validate-data.js`:

```javascript
const admin = require('firebase-admin');
admin.initializeApp();

async function validateAutoCheckouts() {
  const db = admin.firestore();
  
  const snapshot = await db.collection('attendance')
    .where('autoCheckout', '==', true)
    .get();
  
  let validCount = 0;
  let invalidCount = 0;
  const errors = [];
  
  snapshot.forEach(doc => {
    const data = doc.data();
    let isValid = true;
    
    // Check required fields
    if (!data.checkOutTime) {
      errors.push(`${doc.id}: Missing checkOutTime`);
      isValid = false;
    }
    
    if (!data.fixedHours || data.fixedHours !== 7) {
      errors.push(`${doc.id}: Invalid fixedHours (${data.fixedHours})`);
      isValid = false;
    }
    
    if (data.status !== 'CHECKED_OUT') {
      errors.push(`${doc.id}: Invalid status (${data.status})`);
      isValid = false;
    }
    
    // Check checkout time is 11:00 PM
    const checkoutDate = new Date(data.checkOutTime);
    if (checkoutDate.getHours() !== 23 || checkoutDate.getMinutes() !== 0) {
      errors.push(`${doc.id}: Checkout time not 11:00 PM`);
      isValid = false;
    }
    
    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }
  });
  
  console.log('Validation Results:');
  console.log(`Total: ${snapshot.size}`);
  console.log(`Valid: ${validCount}`);
  console.log(`Invalid: ${invalidCount}`);
  
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(error => console.log(error));
  }
}

validateAutoCheckouts()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
```

### Run Validation

```bash
cd functions
node validate-data.js
```

## Monitoring Post-Migration

### Check for Issues

1. **Monitor Function Logs**
   ```bash
   firebase functions:log --only autoCheckoutUsers --limit 100
   ```

2. **Check User Complaints**
   - Users reporting incorrect working hours
   - Users not being auto-checked out
   - Duplicate auto checkouts

3. **Verify Working Hours Calculations**
   ```typescript
   import { calculateWorkingHours } from '@/services/attendanceCalculations';
   
   // Test with sample records
   const testRecords = [
     { autoCheckout: true, fixedHours: 7 },
     { checkInTime: 1000, checkOutTime: 2000, breaks: [] }
   ];
   
   testRecords.forEach(record => {
     const hours = calculateWorkingHours(record);
     console.log('Hours:', hours);
   });
   ```

## Deployment Checklist

- [ ] Review code changes
- [ ] Update Firestore security rules (if needed)
- [ ] Deploy Cloud Function: `firebase deploy --only functions:autoCheckoutUsers`
- [ ] Test function manually: `firebase functions:shell`
- [ ] Monitor logs for first 24 hours
- [ ] Run data validation script
- [ ] (Optional) Run migration script for historical data
- [ ] Update admin dashboard to show auto-checkout stats
- [ ] Notify team about new feature

## FAQ

### Q: Do I need to migrate existing data?
**A**: No, the code is backward compatible. Migration is optional.

### Q: What happens to old `autoCheckedOut` records?
**A**: They continue to work. The code checks both `autoCheckout` and `autoCheckedOut` flags.

### Q: Can I change the fixed hours from 7 to something else?
**A**: Yes, update `fixedHours: 7` in both `functions/index.js` and `src/hooks/useAttendance.ts`.

### Q: What if the scheduled function fails?
**A**: The client-side logic (`checkStaleSessions`) will catch it when the user opens the app.

### Q: How do I test without waiting until 11 PM?
**A**: Use `firebase functions:shell` to manually trigger the function, or temporarily change the schedule.

### Q: Will this affect existing attendance reports?
**A**: Only if your reports don't use the `calculateWorkingHours` utility. Update reports to use the new utility for correct calculations.

## Support

For issues or questions:
1. Check `AUTO_CHECKOUT_FEATURE.md` for detailed documentation
2. Review Firebase Function logs
3. Validate data using the validation script
4. Check Firestore security rules

## Next Steps After Migration

1. ✅ Monitor function execution for 1 week
2. ✅ Gather user feedback
3. ✅ Update admin dashboard with auto-checkout metrics
4. ✅ Consider adding email notifications
5. ✅ Review and optimize Firestore indexes
