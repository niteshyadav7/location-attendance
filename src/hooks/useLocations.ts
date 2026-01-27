import { useState, useEffect } from 'react';
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, where } from '@react-native-firebase/firestore';
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
            const list: LocationConfig[] = [];
            snapshot.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() } as LocationConfig));
            setLocations(list);
            setLoading(false);
        }, (err: any) => {
            setError(err.message);
            setLoading(false);
        });
        return () => unsub();
    }, [user?.organizationId]);

    const addLocation = async (location: Omit<LocationConfig, 'id'>) => {
        if (!user?.organizationId) throw new Error("No Organization ID");
        const db = getFirestore();
        // Ensure numbers are numbers
        const data = {
            ...location,
            organizationId: user.organizationId, // MULTI-TENANCY
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
            radius: Number(location.radius),
        };
        await addDoc(collection(db, 'locations'), data);
    };

    const updateLocation = async (id: string, location: Partial<LocationConfig>) => {
        const db = getFirestore();
        const data = { ...location };
        if (data.latitude) data.latitude = Number(data.latitude);
        if (data.longitude) data.longitude = Number(data.longitude);
        if (data.radius) data.radius = Number(data.radius);

        await updateDoc(doc(db, 'locations', id), data);
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
             if (docSnapshot.exists()) {
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
            console.error('📍 Error fetching location:', err);
            setLoading(false);
        });
        return () => unsub();
    }, [id]);

    return { location, loading };
};
