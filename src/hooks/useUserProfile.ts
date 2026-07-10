import { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, updateDoc } from '@react-native-firebase/firestore';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuthStore } from '../store/useAuthStore';
import { adminNotificationListener } from '../services/adminNotificationListener';
import { format } from 'date-fns';

export interface UserDetails {
  phoneNumber?: string;
  department?: string;
  employeeId?: string;
  joinDate?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  bloodGroup?: string;
  designation?: string;
  managerName?: string;
  workShift?: string;
}

const formatDate = (date: any): string => {
  if (!date) return '';
  try {
    if (typeof date === 'number') {
      return format(new Date(date), 'MMM dd, yyyy');
    }
    if (typeof date === 'object' && date.toDate) {
      return format(date.toDate(), 'MMM dd, yyyy');
    }
    if (typeof date === 'string') {
      // Check if string is just digits (timestamp string)
      if (/^\d+$/.test(date)) {
        return format(new Date(parseInt(date, 10)), 'MMM dd, yyyy');
      }
      return date;
    }
    return '';
  } catch (error) {
    return '';
  }
};

export const useUserProfile = () => {
    const user = useAuthStore((state) => state.user);
    const setUser = useAuthStore((state) => state.setUser);
    const setOrganization = useAuthStore((state) => state.setOrganization);
    const [userDetails, setUserDetails] = useState<UserDetails>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.uid) {
            fetchUserDetails();
        } else {
            setLoading(false);
        }
    }, [user?.uid]);

    const fetchUserDetails = async () => {
        const db = getFirestore();
        if (!user) return;
        try {
            const docSnap = await getDoc(doc(db, 'users', user.uid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data) {
                     const details: UserDetails = {
                        phoneNumber: data.phoneNumber || '',
                        department: data.department || '',
                        employeeId: data.employeeId || '',
                        joinDate: formatDate(data.joinDate || data.dateOfJoining),
                        address: data.address || '',
                        dateOfBirth: data.dateOfBirth || '',
                        gender: data.gender || '',
                        emergencyContactName: data.emergencyContactName || '',
                        emergencyContactNumber: data.emergencyContactNumber || '',
                        bloodGroup: data.bloodGroup || '',
                        designation: data.designation || '',
                        managerName: data.managerName || '',
                        workShift: data.workShift || '',
                     };
                     setUserDetails(details);
                }
            }
        } catch (e) {
            console.error('Error fetching user details', e);
        } finally {
            setLoading(false);
        }
    };

    const updateField = async (field: keyof UserDetails, value: string) => {
        if (!user) return;
        const db = getFirestore();
        await updateDoc(doc(db, 'users', user.uid), { [field]: value });
        setUserDetails(prev => ({ ...prev, [field]: value }));
    };

    const logout = async () => {
        const auth = getAuth();
        
        try {
            if (user?.role === 'company_admin' || user?.role === 'super_admin') {
                adminNotificationListener.stopListening();
            }
            
            // Remove FCM token if the user is currently authenticated
            if (user?.uid && auth.currentUser) {
                const { fcmService } = require('../services/fcmService');
                await fcmService.removeFCMToken(user.uid).catch((err: any) => {
                    console.error('Error removing FCM token:', err);
                });
            }

            // Sign out of Google Sign-in if signed in
            try {
                await GoogleSignin.revokeAccess();
                console.log('Google Access Revoked');
            } catch (revokeError) {
                console.log('Google Access Revoke error or bypass:', revokeError);
            }
            try {
                await GoogleSignin.signOut();
                console.log('Google Sign-Out successful');
            } catch (googleError) {
                console.log('Google Sign-Out error or bypass:', googleError);
            }

            // Sign out of Firebase if currently signed in
            if (auth.currentUser) {
                await signOut(auth);
                console.log('Firebase Sign-Out successful');
            }
        } catch (logoutError) {
            console.error('Error during logout process:', logoutError);
        } finally {
            // Clean up state regardless of errors to ensure navigation updates to Login screen
            setUser(null);
            setOrganization(null);
        }
    };

    return { userDetails, loading, updateField, logout };
};
