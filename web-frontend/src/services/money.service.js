
import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc,
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';

export const moneyService = {
  // Fetch all money requests for an organization
  async getMoneyRequests(organizationId, filters = {}) {
    try {
      console.log('Fetching money requests for org:', organizationId);
      
      let q = query(
        collection(db, 'money_requests'),
        where('organizationId', '==', organizationId)
      );

      // Apply filters
      if (filters.userId) {
        q = query(
          collection(db, 'money_requests'),
          where('organizationId', '==', organizationId),
          where('userId', '==', filters.userId)
        );
      }

      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      const snapshot = await getDocs(q);
      console.log('Money requests found:', snapshot.size);
      
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        requestDate: doc.data().requestDate?.toDate?.() || new Date(doc.data().requestDate)
      }));

      // Sort client-side to avoid index requirement
      requests.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));

      return requests;
    } catch (error) {
      console.error('Error fetching money requests:', error);
      throw error;
    }
  },

  // Group requests by user
  groupByUser(requests) {
    const grouped = {};
    
    requests.forEach(req => {
      if (!grouped[req.userId]) {
        grouped[req.userId] = {
          userId: req.userId,
          userName: req.userName,
          userEmail: req.userEmail,
          requests: [],
          totalAmount: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
          latestDate: req.requestDate
        };
      }

      grouped[req.userId].requests.push(req);
      grouped[req.userId].totalAmount += req.amount;
      
      if (req.status === 'PENDING') grouped[req.userId].pendingCount++;
      if (req.status === 'APPROVED') grouped[req.userId].approvedCount++;
      if (req.status === 'REJECTED') grouped[req.userId].rejectedCount++;

      if (req.requestDate > grouped[req.userId].latestDate) {
        grouped[req.userId].latestDate = req.requestDate;
      }
    });

    return Object.values(grouped);
  },

  // Approve request
  async approveRequest(requestId, adminId, adminName) {
    try {
      const requestRef = doc(db, 'money_requests', requestId);
      await updateDoc(requestRef, {
        status: 'APPROVED',
        processedBy: adminName,
        processedById: adminId,
        processedAt: Timestamp.now()
      });
      return { success: true };
    } catch (error) {
      console.error('Error approving request:', error);
      throw error;
    }
  },

  // Reject request
  async rejectRequest(requestId, adminId, adminName, reason = '') {
    try {
      const requestRef = doc(db, 'money_requests', requestId);
      await updateDoc(requestRef, {
        status: 'REJECTED',
        processedBy: adminName,
        processedById: adminId,
        processedAt: Timestamp.now(),
        rejectionReason: reason
      });
      return { success: true };
    } catch (error) {
      console.error('Error rejecting request:', error);
      throw error;
    }
  },

  // Create new request
  async createRequest(requestData) {
    try {
      const docRef = await addDoc(collection(db, 'money_requests'), {
        ...requestData,
        requestDate: Timestamp.now(),
        status: 'PENDING'
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating request:', error);
      throw error;
    }
  },

  // Delete request
  async deleteRequest(requestId) {
    try {
      await deleteDoc(doc(db, 'money_requests', requestId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting request:', error);
      throw error;
    }
  },

  // Calculate statistics
  calculateStats(requests) {
    return {
      total: requests.length,
      totalAmount: requests.reduce((sum, r) => sum + r.amount, 0),
      pending: requests.filter(r => r.status === 'PENDING').length,
      pendingAmount: requests.filter(r => r.status === 'PENDING').reduce((sum, r) => sum + r.amount, 0),
      approved: requests.filter(r => r.status === 'APPROVED').length,
      approvedAmount: requests.filter(r => r.status === 'APPROVED').reduce((sum, r) => sum + r.amount, 0),
      rejected: requests.filter(r => r.status === 'REJECTED').length,
      rejectedAmount: requests.filter(r => r.status === 'REJECTED').reduce((sum, r) => sum + r.amount, 0)
    };
  }
};
