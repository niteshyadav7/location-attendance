import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, addDoc, onSnapshot } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { useAuthStore } from '../store/useAuthStore';
import { Organization, JoinRequest, ImmediateVacancy } from '../types';

export const useJoinOrganization = () => {
    const [loading, setLoading] = useState(true);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
    const [currentSearchText, setCurrentSearchText] = useState('');
    const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
    const [vacancies, setVacancies] = useState<ImmediateVacancy[]>([]);
    const user = useAuthStore(state => state.user);

    // Listen to active, discoverable organizations for real-time search
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        const db = getFirestore();
        const q = query(
            collection(db, 'organizations'),
            where('isActive', '==', true)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const list: Organization[] = [];
            if (snapshot) {
                snapshot.forEach((docSnap: any) => {
                    const data = docSnap.data() as Organization;
                    if (data.isDiscoverable !== false) {
                        list.push({ ...data, id: docSnap.id });
                    }
                });
            }
            setAllOrganizations(list);
            setLoading(false);
        }, (err) => {
            const auth = getAuth();
            if (auth.currentUser) {
                console.error('Error listening to organizations:', err);
            }
            setLoading(false);
        });

        return () => unsub();
    }, [user?.uid]);

    // Local, in-memory filtering based on allOrganizations and search query
    useEffect(() => {
        const filtered = currentSearchText
            ? allOrganizations.filter(org => org.name.toLowerCase().includes(currentSearchText.toLowerCase()))
            : allOrganizations;
        setOrganizations(filtered);
    }, [allOrganizations, currentSearchText]);

    // Fetch all discoverable organizations for search (now in-memory)
    const searchOrganizations = async (searchText: string = '') => {
        setCurrentSearchText(searchText);
    };

    // Request to join an organization
    const requestToJoin = async (organizationId: string, organizationName: string) => {
        if (!user) throw new Error('User is not authenticated');
        setLoading(true);
        try {
            const db = getFirestore();

            // Check if there is already a pending request for this organization
            const existingQ = query(
                collection(db, 'join_requests'),
                where('userId', '==', user.uid),
                where('organizationId', '==', organizationId),
                where('status', '==', 'PENDING')
            );
            const existingSnapshot = await getDocs(existingQ);
            if (!existingSnapshot.empty) {
                throw new Error('You already have a pending join request for this organization.');
            }

            const newRequestRef = doc(collection(db, 'join_requests'));
            const joinRequest: JoinRequest = {
                id: newRequestRef.id,
                userId: user.uid,
                userName: user.name,
                userEmail: user.email,
                organizationId,
                organizationName,
                status: 'PENDING',
                requestDate: Date.now()
            };

            await setDoc(newRequestRef, joinRequest);

            // Create a single notification for the target organization admins
            await addDoc(collection(db, 'notifications'), {
                type: 'CHECK_IN',
                userId: user.uid,
                userName: user.name,
                organizationId,
                message: `${user.name} is requesting to join your organization.`,
                timestamp: Date.now(),
                read: false
            });

            return { success: true };
        } catch (error: any) {
            console.error('Error requesting to join:', error);
            throw new Error(error.message || 'Failed to submit request.');
        } finally {
            setLoading(false);
        }
    };

    // Join organization by using 6-digit organization code
    const joinWithCode = async (organizationCode: string) => {
        if (!user) throw new Error('User is not authenticated');
        setLoading(true);
        try {
            const db = getFirestore();

            // Find organization by code
            const orgsSnapshot = await getDocs(
                query(collection(db, 'organizations'), where('code', '==', organizationCode.toUpperCase()))
            );

            if (orgsSnapshot.empty) {
                throw new Error('Invalid organization code. Please check with your administrator.');
            }

            const orgDoc = orgsSnapshot.docs[0];
            const orgData = orgDoc.data() as Organization;

            if (!orgData.isActive) {
                throw new Error('This organization is not active. Please contact support.');
            }

            // Create join request with PENDING status
            const result = await requestToJoin(orgDoc.id, orgData.name);
            return result;
        } catch (error: any) {
            console.error('Error joining with code:', error);
            throw new Error(error.message || 'Failed to join organization.');
        } finally {
            setLoading(false);
        }
    };

    // Listen to current user's join requests
    useEffect(() => {
        if (!user?.uid) return;

        const db = getFirestore();
        const q = query(
            collection(db, 'join_requests'),
            where('userId', '==', user.uid)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            if (!snapshot) return;
            const list: JoinRequest[] = [];
            snapshot.forEach((docSnap: any) => {
                list.push({ ...docSnap.data() } as JoinRequest);
            });
            list.sort((a, b) => b.requestDate - a.requestDate);
            setPendingRequests(list);
        }, (err) => {
            const auth = getAuth();
            if (auth.currentUser) {
                console.error('Error listening to join requests:', err);
            }
        });

        return () => unsub();
    }, [user?.uid]);

    // Listen to active job broadcasts (immediate vacancies)
    useEffect(() => {
        if (!user?.uid) return;

        const db = getFirestore();
        const q = query(
            collection(db, 'immediate_vacancies'),
            where('status', '==', 'ACTIVE')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            if (!snapshot) return;
            const list: ImmediateVacancy[] = [];
            snapshot.forEach((docSnap: any) => {
                list.push({ id: docSnap.id, ...docSnap.data() } as ImmediateVacancy);
            });
            list.sort((a, b) => b.timestamp - a.timestamp);
            setVacancies(list);
        }, (err) => {
            const auth = getAuth();
            if (auth.currentUser) {
                console.error('Error listening to vacancies:', err);
            }
        });

        return () => unsub();
    }, [user?.uid]);

    return {
        organizations,
        pendingRequests,
        vacancies,
        loading,
        searchOrganizations,
        requestToJoin,
        joinWithCode
    };
};
