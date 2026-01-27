# Employee Approval Workflow

## Edge Case Identified ✅

### The Problem
When an employee registers through the **mobile app**, their account is created with `status: 'pending'` and they cannot login until approved by an admin. However, the Google Sheets admin panel was missing a dedicated approval mechanism.

### Previous Limitations
- ❌ No dedicated "Approve Employee" function
- ❌ Admins had to manually edit the status field
- ❌ No visual indicator for pending employees
- ❌ Easy to miss pending employees in the sheet

---

## Solution Implemented ✅

### 1. **Dedicated Approval Function**
A new menu item: **"✅ Approve Pending Employee"**

**How to use:**
1. Open the Google Sheet
2. Navigate to the **Users** sheet
3. Click on any row with a pending employee (highlighted in yellow)
4. Go to **App Admin** → **✅ Approve Pending Employee**
5. Confirm the approval dialog
6. The employee's status will change to `approved` and they can now login

### 2. **Visual Highlighting**
- Pending employees are automatically highlighted with a **light yellow background** (#fff2cc)
- Makes it easy to spot who needs approval at a glance

### 3. **Safety Checks**
The approval function includes:
- ✅ Validates you're on the Users sheet
- ✅ Checks if a valid employee is selected
- ✅ Verifies the employee is actually pending
- ✅ Requires confirmation before approval
- ✅ Updates both Firestore AND the sheet immediately

---

## Complete Employee Lifecycle

### Scenario 1: Employee Self-Registration (Mobile App)
1. Employee downloads the app
2. Employee registers with email/password
3. **Status: `pending`** (cannot login yet)
4. Admin receives notification (if configured)
5. Admin opens Google Sheet
6. Admin sees employee highlighted in yellow
7. Admin clicks **"Approve Pending Employee"**
8. **Status: `approved`** → Employee can now login

### Scenario 2: Admin Creates Employee (Google Sheet)
1. Admin fills in employee details in the Users sheet
2. Admin clicks **"Create User (w/ Auth)"**
3. **Status: `approved`** (automatically approved)
4. Employee receives credentials and can login immediately

### Scenario 3: Manual Status Update
1. Admin can still manually edit the Status column
2. Admin clicks **"Update Selected Row"**
3. Status is updated in Firestore

---

## Fields Updated During Approval

When you approve a pending employee, the following fields are updated:

| Field | Before | After |
|-------|--------|-------|
| `status` | `pending` | `approved` |
| `isActive` | `false` or `true` | `true` |

---

## Menu Structure

```
App Admin
├── 🚀 Initialize System (Run First)
├── ─────────────────────
├── 🔄 Sync All Data
│   ├── Sync Users
│   ├── Sync Companies
│   ├── Sync Locations
│   ├── Sync Notices
│   ├── Sync Leaves
│   └── Sync Attendance (Last 100)
├── ─────────────────────
├── ❌ Sync Deletions (Sheet ➔ DB)
│   ├── Delete Missing Users
│   ├── Delete Missing Companies
│   ├── Delete Missing Locations
│   ├── Delete Missing Notices
│   └── Delete Missing Leaves
├── ─────────────────────
├── ➕ Creates
│   ├── Create Company
│   ├── Create User (w/ Auth)
│   ├── Create Location
│   └── Post Notice
├── ─────────────────────
├── 💾 Update Selected Row
├── ✅ Approve Pending Employee  ← NEW!
└── ✅ Approve Device Reset
```

---

## Best Practices

### For Admins
1. **Sync Users regularly** to see new registrations
2. Look for **yellow-highlighted rows** (pending employees)
3. Review employee details before approving
4. Use the dedicated approval function for safety

### For Developers
1. The `approvePendingEmployee()` function is reusable
2. Conditional formatting is set during `setupFullDashboard()`
3. All updates are atomic (Firestore + Sheet updated together)
4. Error handling is built-in

---

## Technical Details

### Function: `approvePendingEmployee()`
```javascript
// Location: google_sheets_script.js (lines 213-262)
// Validates sheet, row, and status
// Updates Firestore with status='approved' and isActive=true
// Immediately reflects changes in the sheet
```

### Conditional Formatting
```javascript
// Applied during setupFullDashboard()
// Formula: =$E2="pending"
// Background: #fff2cc (light yellow)
// Range: A2:K1000 (entire user rows)
```

---

## Testing Checklist

- [ ] Create a test employee via mobile app
- [ ] Verify status is `pending` in Firestore
- [ ] Run "Sync Users" in Google Sheet
- [ ] Confirm employee row is highlighted yellow
- [ ] Click on the pending employee row
- [ ] Run "Approve Pending Employee"
- [ ] Verify confirmation dialog appears
- [ ] Confirm approval
- [ ] Check status changed to `approved` in sheet
- [ ] Verify status updated in Firestore
- [ ] Test employee can now login via mobile app

---

## Related Files

- `google_sheets_script.js` - Main script with approval logic
- `src/hooks/useAuth.ts` - Mobile app registration logic
- `firestore.rules` - Security rules for user creation

---

## Version History

- **v3.7** (2025-12-23): Added dedicated employee approval workflow
  - New menu item: "Approve Pending Employee"
  - Visual highlighting for pending employees
  - Safety validations and confirmations
