import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '../src/hooks/useAuth';
import { useAuthStore } from '../src/store/useAuthStore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Mock dependencies
const mockAuth = require('@react-native-firebase/auth');
const mockFirestore = require('@react-native-firebase/firestore');

describe('Authentication System Tests', () => {
  beforeEach(() => {
    // Reset Zustand Auth Store state
    useAuthStore.setState({
      user: null,
      organization: null,
      loading: false,
      impersonatorUser: null,
      impersonatorOrganization: null,
    });
    jest.clearAllMocks();
  });

  describe('Email & Password Authentication', () => {
    test('login - successful login for approved user', async () => {
      // Mock Firestore user doc find
      mockFirestore.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          uid: 'approved-uid',
          name: 'Jane Doe',
          email: 'jane@example.com',
          role: 'user',
          status: 'approved',
          isActive: true,
          organizationId: 'org-123',
        }),
      });

      // Mock Firestore organization doc find
      mockFirestore.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          id: 'org-123',
          name: 'Acme Corp',
          code: 'ACME12',
          isActive: true,
        }),
      });

      const { result } = await renderHook(() => useAuth());

      let response: any;
      await act(async () => {
        response = await result.current.login('jane@example.com', 'correct-password');
      });

      expect(response).toEqual({ success: true });
      expect(useAuthStore.getState().user).toEqual(
        expect.objectContaining({
          uid: 'approved-uid',
          role: 'user',
          status: 'approved',
        })
      );
      expect(useAuthStore.getState().organization).toEqual(
        expect.objectContaining({
          id: 'org-123',
          name: 'Acme Corp',
        })
      );
    });

    test('login - fails on wrong password', async () => {
      const { result } = await renderHook(() => useAuth());

      await act(async () => {
        await expect(
          result.current.login('jane@example.com', 'wrong-password')
        ).rejects.toThrow('Incorrect password. Please try again');
      });

      expect(useAuthStore.getState().user).toBeNull();
    });

    test('login - fails for deactivated user profile', async () => {
      mockFirestore.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          uid: 'deactivated-uid',
          name: 'Bad Actor',
          email: 'bad@example.com',
          role: 'user',
          status: 'approved',
          isActive: false,
        }),
      });

      const { result } = await renderHook(() => useAuth());

      await act(async () => {
        await expect(
          result.current.login('bad@example.com', 'password123')
        ).rejects.toThrow('Your account has been deactivated by the administrator');
      });

      expect(useAuthStore.getState().user).toBeNull();
      expect(mockAuth.signOut).toHaveBeenCalled();
    });

    test('signup - creates user and assigns default organization as pending user', async () => {
      const { result } = await renderHook(() => useAuth());

      let response: any;
      await act(async () => {
        response = await result.current.signup('New User', 'newuser@example.com', 'password123');
      });

      expect(response).toEqual({ success: true });
      expect(mockFirestore.setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/mock-uid-123' }),
        expect.objectContaining({
          name: 'New User',
          email: 'newuser@example.com',
          organizationId: 'default-org',
          role: 'user',
          status: 'pending',
        })
      );
      expect(mockAuth.signOut).toHaveBeenCalled();
    });

    test('signupAsCompanyAdmin - creates organization and signs out as pending admin', async () => {
      const { result } = await renderHook(() => useAuth());

      let response: any;
      await act(async () => {
        response = await result.current.signupAsCompanyAdmin(
          'Admin Name',
          'admin@example.com',
          'password123',
          'New Startup',
          'startup@example.com',
          '1234567890'
        );
      });

      expect(response.success).toBe(true);
      expect(response.organizationCode).toBeDefined();
      expect(mockFirestore.setDoc).toHaveBeenCalledTimes(2); // Users doc and Organizations doc
      expect(mockAuth.signOut).toHaveBeenCalled();
    });

    test('signupAsUser - joins existing organization successfully with active code', async () => {
      // Mock organization search snapshot to find active org
      mockFirestore.getDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'org-abc',
          data: () => ({
            id: 'org-abc',
            name: 'Company ABC',
            code: 'ABC123',
            isActive: true,
          }),
        }],
      });

      const { result } = await renderHook(() => useAuth());

      let response: any;
      await act(async () => {
        response = await result.current.signupAsUser('Worker', 'worker@example.com', 'password123', 'ABC123');
      });

      expect(response).toEqual({ success: true });
      expect(mockFirestore.setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/mock-uid-123' }),
        expect.objectContaining({
          name: 'Worker',
          email: 'worker@example.com',
          organizationId: 'org-abc',
          role: 'user',
          status: 'pending',
        })
      );
    });

    test('signupAsUser - fails and rolls back user if organization code is invalid', async () => {
      // Mock organization search snapshot to be empty (invalid code)
      mockFirestore.getDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const mockDelete = jest.fn(() => Promise.resolve());
      // Override createUserWithEmailAndPassword resolved value to return deletable user instance
      mockAuth.createUserWithEmailAndPassword.mockResolvedValueOnce({
        user: {
          uid: 'new-uid',
          delete: mockDelete,
        },
      });

      const { result } = await renderHook(() => useAuth());

      await act(async () => {
        await expect(
          result.current.signupAsUser('Worker', 'worker@example.com', 'password123', 'BADCODE')
        ).rejects.toThrow('Invalid organization code');
      });

      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('Google Sign-In Authentication', () => {
    test('signInWithGoogle - signs in approved existing user', async () => {
      // Mock user document exists in firestore
      mockFirestore.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          uid: 'google-uid',
          name: 'Google User',
          email: 'test-google@example.com',
          role: 'normal_user',
          status: 'approved',
          isActive: true,
          organizationId: 'org-google',
        }),
      });

      // Mock organization exists
      mockFirestore.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          id: 'org-google',
          name: 'Google Corp',
        }),
      });

      const { result } = await renderHook(() => useAuth());

      let response: any;
      await act(async () => {
        response = await result.current.signInWithGoogle();
      });

      // Verify that revokeAccess was called right before signOut to force account chooser dialog
      expect(GoogleSignin.revokeAccess).toHaveBeenCalled();
      expect(GoogleSignin.signOut).toHaveBeenCalled();
      expect(GoogleSignin.signIn).toHaveBeenCalled();

      expect(response).toEqual({ success: true });
      expect(useAuthStore.getState().user).toBeDefined();
      expect(useAuthStore.getState().organization).toBeDefined();
    });

    test('signInWithGoogle - signs out and returns details for a new user registration', async () => {
      // Mock user document does NOT exist in firestore
      mockFirestore.getDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const { result } = await renderHook(() => useAuth());

      let response: any;
      await act(async () => {
        response = await result.current.signInWithGoogle();
      });

      expect(response).toEqual({
        isNewUser: true,
        email: 'test-google@example.com',
        idToken: 'mock-google-id-token',
        name: 'Google User',
      });
      // Should sign out from auth because profile doc isn't created yet
      expect(mockAuth.signOut).toHaveBeenCalled();
    });

    test('signUpAsNormalUserWithGoogle - registers user and auto logs in normal employee', async () => {
      // Mock that user profile doc does not exist
      mockFirestore.getDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const { result } = await renderHook(() => useAuth());

      let response: any;
      await act(async () => {
        response = await result.current.signUpAsNormalUserWithGoogle();
      });

      expect(response).toEqual({ success: true });
      
      // Should save normal user profile to users collection with empty organizationId
      expect(mockFirestore.setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/mock-uid-123' }),
        expect.objectContaining({
          email: 'test-google@example.com',
          organizationId: '',
          role: 'user',
          status: 'approved',
        })
      );

      // Should keep user logged in and update state store
      expect(useAuthStore.getState().user).toEqual(
        expect.objectContaining({
          email: 'test-google@example.com',
          organizationId: '',
        })
      );
      expect(mockAuth.signOut).not.toHaveBeenCalled();
    });

    test('signUpAsCompanyAdminWithGoogle - registers admin, creates organization and signs out pending admin', async () => {
      // Mock that user profile doc does not exist
      mockFirestore.getDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const { result } = await renderHook(() => useAuth());

      let response: any;
      await act(async () => {
        response = await result.current.signUpAsCompanyAdminWithGoogle('Startup Google', 'startup@google.com');
      });

      expect(response.success).toBe(true);
      expect(response.organizationCode).toBeDefined();

      // Check user and organization writes
      expect(mockFirestore.setDoc).toHaveBeenCalledTimes(2);

      // Admin is pending Super Admin approval, so must sign out immediately
      expect(mockAuth.signOut).toHaveBeenCalled();
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('Organization Leaving Flow', () => {
    test('leaveOrganization - updates status to leave_pending and retains state', async () => {
      // Set mock user state in Zustand store matching mock auth user uid
      useAuthStore.setState({
        user: {
          uid: 'mock-uid-123',
          name: 'Leaving Employee',
          email: 'employee@example.com',
          role: 'user',
          status: 'approved',
          isActive: true,
          organizationId: 'org-123',
        },
        organization: {
          id: 'org-123',
          name: 'Google Corp',
          code: 'G123',
          isActive: true,
        } as any,
      });

      const { result } = await renderHook(() => useAuth());

      await act(async () => {
        await result.current.leaveOrganization();
      });

      // Verify that Firestore doc was updated with status 'leave_pending'
      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/mock-uid-123' }),
        expect.objectContaining({
          status: 'leave_pending',
          leaveReason: '',
        })
      );

      // Verify Zustand store user status is also updated immediately
      expect(useAuthStore.getState().user?.status).toBe('leave_pending');
    });
  });
});
