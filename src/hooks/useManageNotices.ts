import { useState, useEffect } from 'react';
import { getFirestore, collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, where } from '@react-native-firebase/firestore';
import { Notice } from '../types';

export const useManageNotices = (organizationId?: string) => {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!organizationId) {
            setLoading(false);
            return;
        }

        const db = getFirestore();
        const q = query(
            collection(db, 'notices'),
            where('organizationId', '==', organizationId)
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
             const list: Notice[] = [];
             snapshot.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() } as Notice));
             list.sort((a, b) => b.createdAt - a.createdAt);
             setNotices(list);
             setLoading(false);
        }, (err) => {
             console.error('useManageNotices Error:', err);
             setLoading(false);
        });
        return () => unsubscribe();
    }, [organizationId]);

    const addNotice = async (noticeData: Omit<Notice, 'id'>) => {
        const db = getFirestore();
        await addDoc(collection(db, 'notices'), noticeData);
    };

    const toggleNoticeActive = async (id: string, currentStatus: boolean) => {
        const db = getFirestore();
        await updateDoc(doc(db, 'notices', id), { isActive: !currentStatus });
    };

    const deleteNotice = async (id: string) => {
        const db = getFirestore();
        await deleteDoc(doc(db, 'notices', id));
    };

    return { notices, loading, addNotice, toggleNoticeActive, deleteNotice };
};
