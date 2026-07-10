import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from '@react-native-firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from '@react-native-firebase/auth';
import { getApp, initializeApp, deleteApp } from '@react-native-firebase/app';
import { UserProfile, LocationConfig, JoinRequest } from '../types';
import { useAuthStore } from '../store/useAuthStore'; // MULTI-TENANCY

export const useUsers = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const user = useAuthStore((state) => state.user); // MULTI-TENANCY

    useEffect(() => {
        if (!user) return;
        
        const db = getFirestore();
        // MULTI-TENANCY: Filter by organizationId only, so we can see all users created under this org
        const q = query(
            collection(db, 'users'),
            where('organizationId', '==', user.organizationId)
        );
        
        const unsub = onSnapshot(q, (snapshot) => {
            if (!snapshot) return;
            const list: UserProfile[] = [];
            snapshot.forEach((doc: any) => list.push({ ...doc.data(), uid: doc.id } as UserProfile));
            
            // Sort: Pending first, then alphabetical
            list.sort((a, b) => {
                if (a.status === 'pending' && b.status !== 'pending') return -1;
                if (a.status !== 'pending' && b.status === 'pending') return 1;
                return a.name.localeCompare(b.name);
            });
            setUsers(list);
            setLoading(false);
        }, (error) => {
            const auth = getAuth();
            if (auth.currentUser) {
                console.error('Error fetching users:', error);
            }
            setLoading(false);
        });

        // Listen to pending join requests for this organization
        const joinReqQ = query(
            collection(db, 'join_requests'),
            where('organizationId', '==', user.organizationId),
            where('status', '==', 'PENDING')
        );

        const joinReqUnsub = onSnapshot(joinReqQ, (snapshot) => {
            if (!snapshot) return;
            const list: JoinRequest[] = [];
            snapshot.forEach((docSnap: any) => {
                list.push({ ...docSnap.data() } as JoinRequest);
            });
            list.sort((a, b) => b.requestDate - a.requestDate);
            setJoinRequests(list);
        }, (error) => {
            const auth = getAuth();
            if (auth.currentUser) {
                console.error('Error fetching join requests:', error);
            }
        });

        return () => {
            unsub();
            joinReqUnsub();
        };
    }, [user]); // MULTI-TENANCY: Re-run when user changes

    const updateUserStatus = async (userId: string, status: 'approved' | 'rejected') => {
        const db = getFirestore();
        await updateDoc(doc(db, 'users', userId), { status });
    };

    const approveJoinRequest = async (requestId: string, targetUserId: string) => {
        if (!user?.organizationId) return;
        const db = getFirestore();
        
        // 1. Update user profile to link to organization
        await updateDoc(doc(db, 'users', targetUserId), {
            organizationId: user.organizationId,
            status: 'approved'
        });

        // 2. Update join request status
        await updateDoc(doc(db, 'join_requests', requestId), {
            status: 'APPROVED',
            actionDate: Date.now(),
            actionBy: user.name
        });

        // 3. Create a notification for the approved user
        await setDoc(doc(collection(db, 'notifications')), {
            type: 'CHECK_IN',
            userId: targetUserId,
            userName: user.name,
            organizationId: user.organizationId,
            message: `Your request to join the organization has been APPROVED.`,
            timestamp: Date.now(),
            read: false
        });
    };

    const rejectJoinRequest = async (requestId: string, targetUserId: string) => {
        if (!user) return;
        const db = getFirestore();

        // Update join request status
        await updateDoc(doc(db, 'join_requests', requestId), {
            status: 'REJECTED',
            actionDate: Date.now(),
            actionBy: user.name
        });

        // Create a notification for the rejected user
        await setDoc(doc(collection(db, 'notifications')), {
            type: 'CHECK_IN',
            userId: targetUserId,
            userName: user.name,
            organizationId: '',
            message: `Your request to join the organization has been REJECTED.`,
            timestamp: Date.now(),
            read: false
        });
    };

    const toggleUserActive = async (userId: string, currentStatus: boolean | undefined) => {
         const db = getFirestore();
         const isActive = currentStatus !== false; 
         await updateDoc(doc(db, 'users', userId), { isActive: !isActive });
    };

    const deleteUser = async (userId: string) => {
         const db = getFirestore();
         await deleteDoc(doc(db, 'users', userId));
    };

    const assignLocation = async (userId: string, locationId: string, assignedCheckInTime?: string, assignedCheckOutTime?: string) => {
         const db = getFirestore();
         await updateDoc(doc(db, 'users', userId), { 
             assignedLocationId: locationId,
             assignedCheckInTime: assignedCheckInTime || null, // Clear if empty
             assignedCheckOutTime: assignedCheckOutTime || null
         });
     };

    const approveLeaveRequest = async (targetUserId: string, userName: string, adminComment?: string) => {
        const db = getFirestore();
        const orgName = useAuthStore.getState().organization?.name || 'the organization';
        
        await updateDoc(doc(db, 'users', targetUserId), {
            organizationId: '',
            assignedLocationId: null,
            registeredDeviceId: null, // Clear device lock when leaving organization
            status: 'approved',
            leaveAdminComment: adminComment || '',
            leaveApprovedAt: Date.now(),
            leftOrganizationName: orgName,
        });

        const commentText = adminComment ? `\nAdmin comment: "${adminComment}"` : '';
        await setDoc(doc(collection(db, 'notifications')), {
            type: 'LEAVE_APPROVED',
            userId: targetUserId,
            userName,
            organizationId: '',
            message: `Your request to leave the organization has been APPROVED.${commentText}`,
            timestamp: Date.now(),
            read: false
        });
    };

    const rejectLeaveRequest = async (targetUserId: string, userName: string, adminComment?: string) => {
        if (!user) return;
        const db = getFirestore();
        const orgName = useAuthStore.getState().organization?.name || 'the organization';

        await updateDoc(doc(db, 'users', targetUserId), {
            status: 'approved',
            leaveReason: null,
            leaveAdminComment: adminComment || '',
            leaveRequestedAt: null,
            leaveRejectedAt: Date.now(),
            leftOrganizationName: orgName,
        });

        const commentText = adminComment ? `\nAdmin comment: "${adminComment}"` : '';
        await setDoc(doc(collection(db, 'notifications')), {
            type: 'LEAVE_REJECTED',
            userId: targetUserId,
            userName,
            organizationId: user.organizationId,
            message: `Your request to leave the organization has been REJECTED.${commentText}`,
            timestamp: Date.now(),
            read: false
        });
    };

    return { 
        users, 
        joinRequests, 
        loading, 
        updateUserStatus, 
        approveJoinRequest, 
        rejectJoinRequest, 
        toggleUserActive, 
        deleteUser, 
        assignLocation,
        approveLeaveRequest,
        rejectLeaveRequest
    };
};



export const useUserCreation = () => {
    const [creating, setCreating] = useState(false);
    const user = useAuthStore((state) => state.user); // MULTI-TENANCY

    const createUser = async (name: string, email: string, password: string, locationId?: string) => {
        setCreating(true);
        let secondaryApp = null;
        try {
            // MULTI-TENANCY: Check if user has organizationId
            if (!user?.organizationId) {
                throw new Error('User organization not found');
            }
            
            // Create a secondary app instance to avoid logging out the admin
            const app = getApp();
            const config = { ...app.options };
            
            // Fix for "Missing or invalid FirebaseOptions property 'databaseURL'"
            if (!config.databaseURL && config.projectId) {
                config.databaseURL = `https://${config.projectId}.firebaseio.com`;
            }

            const secondaryAppName = 'secondary' + Date.now(); // Unique name
            secondaryApp = await initializeApp(config, secondaryAppName);
            
            const secondaryAuth = getAuth(secondaryApp);
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const uid = userCredential.user.uid;
            
            // Use the MAIN app's Firestore (we are writing as Admin now)
            // The Security Rules have been updated to allow Company Admin to create users.
            const db = getFirestore();
            
            // MULTI-TENANCY: Include organizationId
            const newUser: UserProfile = {
                uid,
                name: name.trim(),
                email: email.trim(),
                organizationId: user.organizationId, // MULTI-TENANCY
                role: 'user',
                status: 'approved',
                isActive: true,
                ...(locationId ? { assignedLocationId: locationId } : {})
            };
            
            await setDoc(doc(db, 'users', uid), newUser);

            // Cleanup: Sign out of secondary and delete app
            await secondaryAuth.signOut();
            
            return true;
        } catch (error: any) {
            console.error(error);
            throw error;
        } finally {
            if (secondaryApp) {
                try {
                     await deleteApp(secondaryApp);
                } catch (e) {
                    console.log('Error deleting secondary app', e);
                }
            }
            setCreating(false);
        }
    };

    return { createUser, creating };
};
