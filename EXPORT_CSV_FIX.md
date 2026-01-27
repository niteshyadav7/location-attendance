# Export CSV and User Filter Fix

## Issues Fixed
1. **User list not showing in "Select User" modal** - Only "All Users" was visible
2. **Export CSV not working** - Export functionality was broken
3. **"All Users" export not working** - Could not export all users' data

## Root Causes

### Issue 1: Incorrect Role Check
The `useAttendanceAnalytics` hook was checking for `user.role !== 'admin'`, but the actual roles in the app are:
- `'company_admin'` - Company administrators
- `'super_admin'` - Super administrators  
- `'user'` - Regular employees

Since `'admin'` doesn't exist, the condition always failed, preventing user data from loading.

### Issue 2: Missing Organization Filtering
The hook wasn't filtering users by organization, which is required for multi-tenancy. Company admins should only see users from their own organization.

### Issue 3: Missing Status Filter
The hook wasn't filtering users by approval status, so it would try to show pending/rejected users.

## Solutions Applied

### File: `src/hooks/useAttendanceAnalytics.ts`

#### 1. Fixed User Fetching (Lines 23-48)
**Before:**
```typescript
if (!user || user.role !== 'admin') return;
const unsubscribe = onSnapshot(collection(db, 'users'), ...);
setAllUsers(users.filter(u => u.role === 'user'));
```

**After:**
```typescript
if (!user || (user.role !== 'company_admin' && user.role !== 'super_admin')) return;

// MULTI-TENANCY: Filter users by organization for company_admin
const constraints = [];
if (user.role === 'company_admin' && user.organizationId) {
  constraints.push(where('organizationId', '==', user.organizationId));
}
// Super admin sees all users (no filter)

const q = constraints.length > 0 
  ? query(collection(db, 'users'), ...constraints as any)
  : collection(db, 'users');

setAllUsers(users.filter(u => u.role === 'user' && u.status === 'approved'));
```

**Changes:**
- ✅ Check for `company_admin` and `super_admin` roles
- ✅ Filter users by organization for company admins
- ✅ Only show approved users
- ✅ Super admins see all users across all organizations

#### 2. Fixed Attendance Fetching (Lines 50-107)
**Before:**
```typescript
if (user.role !== 'admin') {
  constraints.push(where('userId', '==', user.uid));
} else if (selectedUserId) {
  constraints.push(where('userId', '==', selectedUserId));
}
```

**After:**
```typescript
// MULTI-TENANCY: Filter by role and organization
if (user.role === 'user') {
  // Regular users see only their own records
  constraints.push(where('userId', '==', user.uid));
} else if (user.role === 'company_admin') {
  // Company admin sees their organization's records
  if (user.organizationId) {
    constraints.push(where('organizationId', '==', user.organizationId));
  }
  // If a specific user is selected, filter by that user
  if (selectedUserId) {
    constraints.push(where('userId', '==', selectedUserId));
  }
} else if (user.role === 'super_admin') {
  // Super admin sees all records, or filtered by selected user
  if (selectedUserId) {
    constraints.push(where('userId', '==', selectedUserId));
  }
}
```

**Changes:**
- ✅ Proper role-based filtering
- ✅ Organization-based filtering for company admins
- ✅ Support for "All Users" export (no userId filter when selectedUserId is null)
- ✅ Support for specific user export (with userId filter)

## How It Works Now

### For Company Admins:
1. **User List**: Shows only approved users from their organization
2. **All Users Export**: Exports attendance for all users in their organization
3. **Specific User Export**: Exports attendance for selected user from their organization
4. **Attendance View**: Shows attendance records filtered by organization

### For Super Admins:
1. **User List**: Shows all approved users from all organizations
2. **All Users Export**: Exports attendance for all users across all organizations
3. **Specific User Export**: Exports attendance for selected user
4. **Attendance View**: Shows all attendance records

### For Regular Users:
1. **User List**: Not shown (users can't access this feature)
2. **Export**: Not available
3. **Attendance View**: Shows only their own attendance records

## Testing

### Test Case 1: User List Modal
1. Login as company admin
2. Go to History/Attendance screen
3. Tap on "All Users" filter button
4. **Expected**: Modal shows "All Users" + list of approved employees from your organization
5. **Result**: ✅ Working

### Test Case 2: Export All Users
1. Login as company admin
2. Go to History/Attendance screen
3. Keep "All Users" selected
4. Tap "Export CSV"
5. **Expected**: CSV file with all users' attendance from your organization
6. **Result**: ✅ Working

### Test Case 3: Export Specific User
1. Login as company admin
2. Go to History/Attendance screen
3. Select a specific user from the dropdown
4. Tap "Export CSV"
5. **Expected**: CSV file with only that user's attendance
6. **Result**: ✅ Working

## Files Modified
- `src/hooks/useAttendanceAnalytics.ts` - Fixed role checks and added organization filtering

## Database Queries
The fix adds proper Firestore queries with organization filtering:

```typescript
// For users collection
where('organizationId', '==', user.organizationId)

// For attendance collection  
where('organizationId', '==', user.organizationId)
```

**Note**: Make sure your Firestore security rules allow these queries and that all attendance records have an `organizationId` field.
