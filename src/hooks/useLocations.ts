import { useState, useEffect } from 'react';
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, where } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { LocationConfig } from '../types';
import { useAuthStore } from '../store/useAuthStore';

export const useLocations = () => {
    const [locations, setLocations] = useState<LocationConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const user = useAuthStore(state => state.user);

    useEffect(() => {
        if (!user?.organizationId) return;

        const db = getFirestore();
        // MULTI-TENANCY: Filter by Org
        const q = query(
            collection(db, 'locations'),
            where('organizationId', '==', user.organizationId)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            if (!snapshot) return;
            const list: LocationConfig[] = [];
            snapshot.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() } as LocationConfig));
            setLocations(list);
            setLoading(false);
        }, (err: any) => {
            const auth = getAuth();
            if (auth.currentUser) {
                setError(err.message);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [user?.organizationId]);

    const addLocation = async (location: Omit<LocationConfig, 'id'>) => {
        console.log('📍 [addLocation] Called. user.uid:', user?.uid, 'user.role:', user?.role, 'user.organizationId:', user?.organizationId);
        if (!user?.organizationId) {
            console.error('📍 [addLocation] FAILED: No Organization ID. user:', JSON.stringify(user));
            throw new Error("No Organization ID. Please re-login.");
        }
        const db = getFirestore();
        // Ensure numbers are numbers
        const data = {
            ...location,
            organizationId: user.organizationId, // MULTI-TENANCY
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
            radius: Number(location.radius),
        };
        console.log('📍 [addLocation] Writing data:', JSON.stringify(data));
        try {
            const docRef = await addDoc(collection(db, 'locations'), data);
            console.log('📍 [addLocation] SUCCESS! Doc ID:', docRef.id);
        } catch (err: any) {
            console.error('📍 [addLocation] FIRESTORE ERROR:', err.code, err.message, err);
            throw err;
        }
    };

    const updateLocation = async (id: string, location: Partial<LocationConfig>) => {
        console.log('📍 [updateLocation] Called. id:', id, 'user.uid:', user?.uid, 'user.role:', user?.role, 'user.organizationId:', user?.organizationId);
        const db = getFirestore();
        const data = { ...location };
        if (data.latitude) data.latitude = Number(data.latitude);
        if (data.longitude) data.longitude = Number(data.longitude);
        if (data.radius) data.radius = Number(data.radius);

        console.log('📍 [updateLocation] Writing data:', JSON.stringify(data));
        try {
            await updateDoc(doc(db, 'locations', id), data);
            console.log('📍 [updateLocation] SUCCESS!');
        } catch (err: any) {
            console.error('📍 [updateLocation] FIRESTORE ERROR:', err.code, err.message, err);
            throw err;
        }
    };

    const deleteLocation = async (id: string) => {
        const db = getFirestore();
        await deleteDoc(doc(db, 'locations', id));
    };

    return { locations, loading, error, addLocation, updateLocation, deleteLocation };
};

export const useLocationDetails = (id?: string) => {
    const [location, setLocation] = useState<LocationConfig | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!id) {
            setLocation(null);
            return;
        }
        setLoading(true);
        const db = getFirestore();
        const unsub = onSnapshot(doc(db, 'locations', id), (docSnapshot) => {
             if (docSnapshot && docSnapshot.exists()) {
                 const data = docSnapshot.data();
                 if (!data) {
                     console.log('📍 Location data is undefined');
                     setLocation(null);
                     setLoading(false);
                     return;
                 }
                 
                 console.log('📍 Location data from Firestore:', JSON.stringify(data, null, 2));
                 
                 // ✅ Ensure numeric fields are numbers
                 const locationData = {
                     id: docSnapshot.id,
                     name: data.name,
                     latitude: Number(data.latitude),
                     longitude: Number(data.longitude),
                     radius: Number(data.radius),
                     organizationId: data.organizationId,
                     address: data.address || '',
                     contactPerson: data.contactPerson,
                     contactPhone: data.contactPhone,
                     breakSettings: data.breakSettings,
                 } as LocationConfig;
                 
                 console.log('📍 Processed location:', JSON.stringify(locationData, null, 2));
                 setLocation(locationData);
             } else {
                 console.log('📍 Location document does not exist:', id);
                 setLocation(null);
             }
             setLoading(false);
         }, (err) => {
             const auth = getAuth();
             if (auth.currentUser) {
                 console.error('📍 Error fetching location:', err);
             }
             setLoading(false);
         });
        return () => unsub();
    }, [id]);

    return { location, loading };
};
