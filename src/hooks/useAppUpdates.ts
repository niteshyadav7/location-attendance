import { useState, useEffect } from 'react';
import { getFirestore, collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy } from '@react-native-firebase/firestore';

export interface AppUpdate {
  id: string;
  title: string;
  message: string;
  appUrl: string; // Always required for app updates
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  isActive: boolean;
}

export const useAppUpdates = () => {
    const [appUpdates, setAppUpdates] = useState<AppUpdate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const db = getFirestore();
        const q = query(
            collection(db, 'app_updates'),
            orderBy('createdAt', 'desc')
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
             const list: AppUpdate[] = [];
             snapshot.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() } as AppUpdate));
             setAppUpdates(list);
             setLoading(false);
        }, (err) => {
             console.error('App Updates Error:', err);
             setLoading(false);
        });
        
        return () => unsubscribe();
    }, []);

    const addAppUpdate = async (updateData: Omit<AppUpdate, 'id'>) => {
        const db = getFirestore();
        await addDoc(collection(db, 'app_updates'), updateData);
    };

    const toggleAppUpdateActive = async (id: string, currentStatus: boolean) => {
        const db = getFirestore();
        await updateDoc(doc(db, 'app_updates', id), { isActive: !currentStatus });
    };

    const deleteAppUpdate = async (id: string) => {
        const db = getFirestore();
        await deleteDoc(doc(db, 'app_updates', id));
    };

    return { appUpdates, loading, addAppUpdate, toggleAppUpdateActive, deleteAppUpdate };
};
