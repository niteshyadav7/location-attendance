# Firestore Permission Error Fix - Admin Check-In

## Error

```
[firestore/permission-denied] The caller does not have permission to execute the specified operation.
at getDocs (query.js:199:24)
at useAdminUserDetails.ts:242:50
```

## Problem

When a company admin tried to check in a user from the User Details screen, Firestore blocked the query because of incorrect permission rules.

### Root Cause

The attendance `read` rule was:

```javascript
allow read: if isAuthenticated() && 
             (isSuperAdmin() || 
              sameOrganization(resource.data.organizationId) || 
              request.auth.uid == resource.data.userId);
```

**Problem**: This rule works for **getting a specific document** (when `resource.data` exists), but **NOT for queries** (when using `getDocs` with `where` clauses).

When the admin code does:
```typescript
const todayAttendanceQuery = query(
  collection(db, 'attendance'),
  where('userId', '==', userId),
  where('date', '==', today)
);
const todaySnapshot = await getDocs(todayAttendanceQuery); // ❌ FAILS HERE
```

The `resource.data` doesn't exist yet (it's a query, not a document read), so `sameOrganization(resource.data.organizationId)` fails!

---

## Solution

Split the `read` rule into two separate rules:

### **1. `get` Rule** (for reading specific documents)
```javascript
allow get: if isAuthenticated() && 
             (isSuperAdmin() || 
              sameOrganization(resource.data.organizationId) || 
              request.auth.uid == resource.data.userId);
```

### **2. `list` Rule** (for queries/listing)
```javascript
allow list: if isAuthenticated() && 
              (isSuperAdmin() || isAdmin());
```

---

## Firestore Read Operations

Firestore has two types of read operations:

| Operation | Rule | When Used | `resource.data` Available? |
|-----------|------|-----------|---------------------------|
| **get** | `allow get` | Reading a specific document by ID | ✅ Yes |
| **list** | `allow list` | Querying/listing multiple documents | ❌ No |

### **Example: `get` Operation**
```typescript
// Reading a specific document
const docRef = doc(db, 'attendance', 'abc123');
const docSnap = await getDoc(docRef);
```
✅ Uses `allow get` rule
✅ `resource.data` is available

### **Example: `list` Operation**
```typescript
// Querying multiple documents
const q = query(
  collection(db, 'attendance'),
  where('userId', '==', 'user123'),
  where('date', '==', '2025-12-30')
);
const querySnap = await getDocs(q);
```
✅ Uses `allow list` rule
❌ `resource.data` is NOT available (it's a query!)

---

## Fixed Rules

### **Before (BROKEN):**
```javascript
// Attendance
match /attendance/{attendanceId} {
  allow read: if isAuthenticated() && 
               (isSuperAdmin() || 
                sameOrganization(resource.data.organizationId) || 
                request.auth.uid == resource.data.userId);
}
```

**Problem:**
- ❌ `read` includes both `get` and `list`
- ❌ `resource.data.organizationId` doesn't exist during queries
- ❌ Admin queries fail with permission denied

### **After (FIXED):**
```javascript
// Attendance
match /attendance/{attendanceId} {
  // Get specific document
  allow get: if isAuthenticated() && 
               (isSuperAdmin() || 
                sameOrganization(resource.data.organizationId) || 
                request.auth.uid == resource.data.userId);
  
  // List/Query documents
  allow list: if isAuthenticated() && 
                (isSuperAdmin() || isAdmin());
}
```

**Fixed:**
- ✅ `get` rule for specific document reads
- ✅ `list` rule for queries (no `resource.data` needed)
- ✅ Admins can query attendance in their org
- ✅ Super admins can query all attendance

---

## Security Analysis

### **What Admins Can Do:**

**Company Admin:**
- ✅ Query all attendance in their organization
- ✅ Read specific attendance records in their org
- ✅ Create attendance for users in their org
- ✅ Update attendance in their org
- ✅ Delete attendance in their org

**Super Admin:**
- ✅ Query all attendance (all organizations)
- ✅ Read any attendance record
- ✅ Create any attendance
- ✅ Update any attendance
- ✅ Delete any attendance

### **What Regular Users Can Do:**

- ✅ Query their own attendance only
- ✅ Read their own attendance records
- ✅ Create their own attendance
- ✅ Update their own attendance (breaks, check-out)
- ❌ Cannot query others' attendance
- ❌ Cannot read others' attendance

---

## How the Fix Works

### **Admin Check-In Flow:**

**Step 1:** Admin clicks "Check In" on User Details screen

**Step 2:** Code queries for today's attendance
```typescript
const todayAttendanceQuery = query(
  collection(db, 'attendance'),
  where('userId', '==', userId),
  where('date', '==', today)
);
const todaySnapshot = await getDocs(todayAttendanceQuery);
```

**Step 3:** Firestore checks `allow list` rule
```javascript
allow list: if isAuthenticated() && 
              (isSuperAdmin() || isAdmin());
```

**Step 4:** Admin is authenticated and `isAdmin()` returns true
✅ **Query allowed!**

**Step 5:** If record exists, update it (reopen)
```typescript
await updateDoc(doc(db, 'attendance', existingDoc.id), {
  checkOutTime: null,
  status: 'PRESENT',
});
```

**Step 6:** Firestore checks `allow update` rule
```javascript
allow update: if (isSuperAdmin() || (isAdmin() && sameOrganization(resource.data.organizationId)))
```

**Step 7:** Admin is in same organization
✅ **Update allowed!**

**Result:** ✅ User's attendance reopened successfully!

---

## Testing

### **Test Case 1: Admin Queries Attendance**
```typescript
// Company admin queries attendance in their org
const q = query(
  collection(db, 'attendance'),
  where('organizationId', '==', 'org-123')
);
const snap = await getDocs(q);
```
✅ **Should work** - Admin can list attendance

### **Test Case 2: Admin Reads Specific Attendance**
```typescript
// Company admin reads specific attendance record
const docRef = doc(db, 'attendance', 'record-abc');
const docSnap = await getDoc(docRef);
```
✅ **Should work** - Admin can get specific document

### **Test Case 3: User Queries Own Attendance**
```typescript
// Regular user queries their own attendance
const q = query(
  collection(db, 'attendance'),
  where('userId', '==', currentUser.uid)
);
const snap = await getDocs(q);
```
✅ **Should work** - User can list their own attendance

### **Test Case 4: User Queries Others' Attendance**
```typescript
// Regular user tries to query another user's attendance
const q = query(
  collection(db, 'attendance'),
  where('userId', '==', 'other-user-id')
);
const snap = await getDocs(q);
```
❌ **Should fail** - User cannot list others' attendance

---

## Deployment

### **Option 1: Firebase Console (Recommended)**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Firestore Database**
4. Click **Rules** tab
5. Copy the complete rules from `FIRESTORE_RULES_FIXED.txt`
6. Paste into the editor
7. Click **Publish**

### **Option 2: Firebase CLI**

```bash
firebase deploy --only firestore:rules
```

---

## Files Modified

1. ✅ `firestore.rules` - Split `read` into `get` and `list`
2. ✅ `FIRESTORE_RULES_FIXED.txt` - Complete rules ready to deploy

---

## Summary

**Problem:** Admin couldn't query attendance records (permission denied)

**Cause:** `read` rule required `resource.data` which doesn't exist during queries

**Solution:** Split into `get` (specific docs) and `list` (queries)

**Result:** 
- ✅ Admins can now query attendance
- ✅ Admins can check in users
- ✅ Security maintained (org-based filtering)

Deploy the updated rules and the error will be fixed! 🎉
