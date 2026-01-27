import { useState, useEffect } from 'react';
import { getFirestore, collection, query, orderBy, limit, onSnapshot, writeBatch, doc, where } from '@react-native-firebase/firestore';
import { Notification } from '../types';
import { useAuthStore } from '../store/useAuthStore';

export const useUserNotifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const user = useAuthStore(state => state.user);

    useEffect(() => {
        if (!user?.uid) return;

        const db = getFirestore();
        // Query notifications where userId is the current user. 
        // Note: This assumes 'userId' in the notification represents the recipient or the subject.
        // For 'MONEY_APPROVED', 'LEAVE_APPROVED', the system should ideally create a notification with userId = targetUser.
        
        const q = query(
            collection(db, 'notifications'), 
            where('userId', '==', user.uid),
            limit(50)
        );
        
        const unsub = onSnapshot(q, (snapshot) => {
             const list: Notification[] = [];
             snapshot.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() } as Notification));
             list.sort((a, b) => b.timestamp - a.timestamp);
             setNotifications(list);
             setLoading(false);
        }, (err) => {
            console.error('User Notification Error:', err);
            setLoading(false);
        });
        return () => unsub();
    }, [user?.uid]);

    const markAllAsRead = async () => {
        const db = getFirestore();
        const batch = writeBatch(db);
        
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) return;
    
        unread.forEach(n => {
          const ref = doc(db, 'notifications', n.id);
          batch.update(ref, { read: true });
        });
    
        try {
          await batch.commit();
        } catch (error) {
          console.error("Error marking as read", error);
        }
    };

    return { notifications, loading, markAllAsRead };
};
