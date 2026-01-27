import { useState, useEffect, useMemo } from 'react';
import firestore from '@react-native-firebase/firestore';
import { MoneyRequest } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { format } from 'date-fns';
import { Alert } from 'react-native';

export const useMoneyRequests = (targetUserId?: string) => {
  const user = useAuthStore((state) => state.user);
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.organizationId) return;

    let query = firestore().collection('money_requests')
      .where('organizationId', '==', user.organizationId);

    // If regular user, only show their own requests
    if (user.role === 'user') {
      query = query.where('userId', '==', user.uid);
    } 
    // If admin and targetUserId is provided, filter by that user
    else if ((user.role === 'company_admin' || user.role === 'super_admin') && targetUserId) {
      query = query.where('userId', '==', targetUserId);
    }
    
    // Order by date descending
    // Note: This requires an index in Firestore: organizationId ASC, (userId ASC optional), requestDate DESC
    // For now, we sort client-side to avoid index errors during dev if index not created.

    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as MoneyRequest));
        
        // Client-side sort to be safe
        data.sort((a, b) => b.requestDate - a.requestDate);
        
        setRequests(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching money requests:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const requestMoney = async (amount: number, reason: string) => {
    if (!user) return;
    try {
      const monthStr = format(new Date(), 'yyyy-MM');
      const now = Date.now();
      
      await firestore().collection('money_requests').add({
        userId: user.uid,
        userName: user.name,
        userEmail: user.email,
        organizationId: user.organizationId,
        amount,
        reason,
        status: 'PENDING',
        requestDate: now,
        monthStr,
      });
      
      // Create notification for admins
      await firestore().collection('notifications').add({
        type: 'MONEY_REQUEST',
        userId: user.uid,
        userName: user.name,
        organizationId: user.organizationId,
        message: `${user.name} requested ₹${amount} advance - ${reason}`,
        timestamp: now,
        read: false,
        amount: amount,
        reason: reason,
      });
      
      return true;
    } catch (error) {
      console.error("Error requesting money:", error);
      Alert.alert("Error", "Failed to submit request.");
      return false;
    }
  };

  const updateStatus = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!user || user.role === 'user') return; // Only admin
    try {
      const now = Date.now();
      
      // Get the money request details first
      const requestDoc = await firestore().collection('money_requests').doc(requestId).get();
      if (!requestDoc.exists) {
        Alert.alert("Error", "Request not found.");
        return false;
      }
      
      const requestData = requestDoc.data();
      const requestUserId = requestData?.userId;
      const requestUserName = requestData?.userName;
      const requestAmount = requestData?.amount;
      const requestReason = requestData?.reason;
      
      // Update the money request status
      await firestore().collection('money_requests').doc(requestId).update({
        status,
        actionDate: now,
        actionBy: user.name,
      });
      
      // Create notification for the user
      const notificationMessage = status === 'APPROVED'
        ? `Your money request of ₹${requestAmount} has been approved by ${user.name}`
        : `Your money request of ₹${requestAmount} has been rejected by ${user.name}`;
      
      await firestore().collection('notifications').add({
        type: status === 'APPROVED' ? 'MONEY_APPROVED' : 'MONEY_REJECTED',
        userId: requestUserId,
        userName: requestUserName,
        organizationId: user.organizationId,
        message: notificationMessage,
        timestamp: now,
        read: false,
        amount: requestAmount,
        reason: requestReason,
        actionBy: user.name,
      });
      
      return true;
    } catch (error) {
      console.error("Error updating status:", error);
      Alert.alert("Error", "Failed to update status.");
      return false;
    }
  };

  const deleteRequest = async (requestId: string) => {
    try {
      await firestore().collection('money_requests').doc(requestId).delete();
      return true;
    } catch (error) {
      console.error("Error deleting request:", error);
      return false;
    }
  };

  const pendingRequests = useMemo(() => requests.filter(r => r.status === 'PENDING'), [requests]);
  const historyRequests = useMemo(() => requests.filter(r => r.status !== 'PENDING'), [requests]);

  const getMonthlyTotal = (month: string) => {
    return requests
      .filter(r => r.monthStr === month && r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.amount, 0);
  };

  const getPendingTotal = () => {
    return pendingRequests.reduce((sum, r) => sum + r.amount, 0);
  };

  return {
    requests,
    pendingRequests,
    historyRequests,
    loading,
    requestMoney,
    updateStatus,
    deleteRequest,
    getMonthlyTotal,
    getPendingTotal,
    userRole: user?.role
  };
};
