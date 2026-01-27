import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDoc } from '@react-native-firebase/firestore';
import { LeaveRequest, Notice, UserProfile } from '../types';

import { useAuthStore } from '../store/useAuthStore';

export const useLeaves = (user: UserProfile | null) => {
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }
        const db = getFirestore();
        const q = query(
            collection(db, 'leaves'), 
            where('userId', '==', user.uid)
        );
        
        const unsub = onSnapshot(q, (snapshot) => {
            const data: LeaveRequest[] = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as LeaveRequest));
            data.sort((a, b) => b.requestDate - a.requestDate);
            setLeaves(data);
            setLoading(false);
        }, (error) => {
            console.error('useLeaves Error:', error);
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    const submitLeaveRequest = async (startDate: string, endDate: string, reason: string) => {
        // ... (existing submitLeaveRequest)
        if (!user) throw new Error('No user');
        
        // Basic date validation
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            throw new Error('Date must be in YYYY-MM-DD format');
        }

        const db = getFirestore();
        await addDoc(collection(db, 'leaves'), {
            userId: user.uid,
            userName: user.name,
            organizationId: user.organizationId, // MULTI-TENANCY
            startDate,
            endDate,
            reason,
            status: 'PENDING',
            requestDate: Date.now(),
        });
    };

    const deleteLeave = async (leaveId: string) => {
        const db = getFirestore();
        await deleteDoc(doc(db, 'leaves', leaveId));
    };

    const updateLeave = async (leaveId: string, startDate: string, endDate: string, reason: string) => {
        const db = getFirestore();
        await updateDoc(doc(db, 'leaves', leaveId), {
            startDate,
            endDate,
            reason
        });
    };

    return { leaves, loading, submitLeaveRequest, deleteLeave, updateLeave };
};

export const useNotices = () => {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const user = useAuthStore(state => state.user);

    useEffect(() => {
        if (!user?.organizationId) return;

        const db = getFirestore();
        
        // Fetch company notices (from notices collection)
        const noticesQuery = query(
            collection(db, 'notices'), 
            where('organizationId', '==', user.organizationId),
            where('isActive', '==', true)
        );
        
        const unsubNotices = onSnapshot(noticesQuery, (snapshot) => {
            const companyNotices: Notice[] = [];
            snapshot.forEach((doc: any) => {
                const n = { id: doc.id, ...doc.data() } as Notice;
                if (!n.expiresAt || n.expiresAt > Date.now()) {
                    companyNotices.push(n);
                }
            });
            companyNotices.sort((a, b) => b.createdAt - a.createdAt);
            setNotices(companyNotices);
            setLoading(false);
        }, (error) => {
            console.error('useNotices Error:', error);
            setLoading(false);
        });
        
        return () => unsubNotices();
    }, [user?.organizationId]);

    return { notices, loading };
};

export const useAdminLeaves = () => {
    const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
    const [approvedLeaves, setApprovedLeaves] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const user = useAuthStore(state => state.user);

    useEffect(() => {
        if (!user?.organizationId) return;

        const db = getFirestore();
        const orgId = user.organizationId;
        
        const qPending = query(
            collection(db, 'leaves'), 
            where('organizationId', '==', orgId),
            where('status', '==', 'PENDING')
        );
        const qApproved = query(
            collection(db, 'leaves'), 
            where('organizationId', '==', orgId),
            where('status', '==', 'APPROVED')
        );

        const unsubPending = onSnapshot(qPending, (snapshot) => {
            const data: LeaveRequest[] = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as LeaveRequest));
            data.sort((a, b) => a.requestDate - b.requestDate); // Oldest pending first
            setPendingLeaves(data);
        }, err => console.error(err));

        const unsubApproved = onSnapshot(qApproved, (snapshot) => {
            const data: LeaveRequest[] = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as LeaveRequest));
            data.sort((a, b) => b.requestDate - a.requestDate); // Newest approved first
            setApprovedLeaves(data);
            setLoading(false);
        }, err => console.error(err));

        return () => {
             unsubPending();
             unsubApproved();
        };
    }, [user?.organizationId]);

    const updateLeaveStatus = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
        const db = getFirestore();
        const leaveRef = doc(db, 'leaves', leaveId);
        
        try {
            await updateDoc(leaveRef, { status });
            
            // Fetch leave to get user details for notification
            const leaveSnap = await getDoc(leaveRef);
            if (leaveSnap.exists()) {
                const leaveData = leaveSnap.data() as LeaveRequest;
                await addDoc(collection(db, 'notifications'), {
                    type: status === 'APPROVED' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
                    userId: leaveData.userId,
                    userName: leaveData.userName,
                    organizationId: leaveData.organizationId,
                    message: `Your leave request for ${leaveData.startDate} to ${leaveData.endDate} was ${status.toLowerCase()}`,
                    timestamp: Date.now(),
                    read: false
                });
            }
        } catch (error) {
            console.error("Error updating leave and sending notification:", error);
        }
    };

    return { pendingLeaves, approvedLeaves, loading, updateLeaveStatus };
};
