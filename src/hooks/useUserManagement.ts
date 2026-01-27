import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from '@react-native-firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from '@react-native-firebase/auth';
import { getApp, initializeApp, deleteApp } from '@react-native-firebase/app';
import { UserProfile, LocationConfig } from '../types';
import { useAuthStore } from '../store/useAuthStore'; // MULTI-TENANCY

export const useUsers = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
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
            console.error('Error fetching users:', error);
            setLoading(false);
        });
        return () => unsub();
    }, [user]); // MULTI-TENANCY: Re-run when user changes

    const updateUserStatus = async (userId: string, status: 'approved' | 'rejected') => {
        const db = getFirestore();
        await updateDoc(doc(db, 'users', userId), { status });
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

    return { users, loading, updateUserStatus, toggleUserActive, deleteUser, assignLocation };
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
