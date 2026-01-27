import { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, query, onSnapshot, orderBy, where, doc, updateDoc, deleteDoc } from '@react-native-firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';
import { Feedback } from '../types';

export const useFeedback = () => {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const user = useAuthStore((state) => state.user);

    // Fetch all feedback (for Super Admin)
    useEffect(() => {
        if (user?.role !== 'super_admin') return;

        setLoading(true);
        const db = getFirestore();
        const q = query(
            collection(db, 'feedback'),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: Feedback[] = [];
            snapshot.forEach((doc: any) => {
                list.push({ id: doc.id, ...doc.data() } as Feedback);
            });
            setFeedbacks(list);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching feedbacks:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.role]);

    // Submit Feedback (for any User)
    const submitFeedback = async (content: string) => {
        if (!user || !content.trim()) return;

        setSubmitting(true);
        try {
            const db = getFirestore();
            const feedbackData: Omit<Feedback, 'id'> = {
                userId: user.uid,
                userName: user.name,
                userEmail: user.email,
                organizationId: user.organizationId,
                content: content.trim(),
                timestamp: Date.now(),
                status: 'new'
            };

            await addDoc(collection(db, 'feedback'), feedbackData);
            return true;
        } catch (error) {
            console.error('Error submitting feedback:', error);
            throw error;
        } finally {
            setSubmitting(false);
        }
    };

    // Update Feedback Status (Super Admin)
    const updateFeedbackStatus = async (id: string, status: 'read' | 'archived') => {
        try {
            const db = getFirestore();
            await updateDoc(doc(db, 'feedback', id), { status });
        } catch (error) {
            console.error('Error updating feedback status:', error);
            throw error;
        }
    };
    
    // Delete Feedback (Super Admin)
     const deleteFeedback = async (id: string) => {
        try {
            const db = getFirestore();
            await deleteDoc(doc(db, 'feedback', id));
        } catch (error) {
            console.error('Error deleting feedback:', error);
            throw error;
        }
    };

    return {
        feedbacks,
        loading,
        submitting,
        submitFeedback,
        updateFeedbackStatus,
        deleteFeedback
    };
};
