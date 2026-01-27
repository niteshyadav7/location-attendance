# Organization Code Persistence Fix

## Issue
Company admin's organization code was disappearing automatically after closing and reopening the app. The code would only reappear after logout and login.

## Root Cause
The issue was in the authentication state management. When a company admin logged in:

1. **During Login** (`useAuth.ts`): The organization data was loaded and stored in the Zustand store
2. **On App Restart** (`AppNavigator.tsx`): The `onAuthStateChanged` listener would restore the user data, but **NOT** the organization data

Since the Zustand store is not persisted to disk, when the app closed, the organization data was lost. On restart, only the user data was reloaded, leaving the organization as `null`.

## Solution
Modified `src/navigation/AppNavigator.tsx` to load organization data in the `onAuthStateChanged` listener:

### Changes Made:

1. **Added `setOrganization` to the store hook** (Line 219):
   ```typescript
   const { user, setUser, setOrganization, loading, setLoading } = useAuthStore();
   ```

2. **Load organization data when user is authenticated** (Lines 257-274):
   ```typescript
   // MULTI-TENANCY: Load organization data if user has organizationId
   if (userData.organizationId) {
      try {
        const orgDoc = await getDoc(doc(db, 'organizations', userData.organizationId));
        if (orgDoc.exists()) {
          const orgData = { id: orgDoc.id, ...orgDoc.data() };
          setOrganization(orgData as any);
        } else {
          console.warn('Organization not found for user:', userData.organizationId);
          setOrganization(null);
        }
      } catch (orgError) {
        console.error('Error loading organization:', orgError);
        setOrganization(null);
      }
   } else {
      setOrganization(null);
   }
   ```

3. **Clear organization state on logout/errors** (Lines 234, 238, 250, 283, 288):
   - Added `setOrganization(null)` calls when:
     - User status is pending
     - User status is rejected or inactive
     - Device mismatch is detected
     - User document doesn't exist
     - User logs out

## Testing
To verify the fix:

1. **Login as Company Admin**: Organization code should be visible in Settings/Profile
2. **Close the app completely**: Force close or swipe away from recent apps
3. **Reopen the app**: Organization code should still be visible without needing to logout/login
4. **Navigate between screens**: Organization code should remain visible

## Files Modified
- `src/navigation/AppNavigator.tsx` - Added organization loading in auth state listener

## Impact
- ✅ Organization code now persists across app restarts
- ✅ No need to logout/login to see organization code
- ✅ Proper state management for multi-tenancy
- ✅ Organization state is properly cleared on logout/errors
