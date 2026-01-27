
import { db, firebaseConfig } from './firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  limit,
  setDoc
} from 'firebase/firestore';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export const attendanceService = {
  // Fetch attendance records
  async getAttendanceRecords(organizationId, filters = {}) {
    try {
      console.log('Fetching attendance for org:', organizationId);
      
      // Simple query without orderBy to avoid index requirement
      let q = query(
        collection(db, 'attendance'),
        where('organizationId', '==', organizationId),
        limit(100) // Limit to avoid large data sets
      );

      // Apply user filter if provided
      if (filters.userId) {
        q = query(
          collection(db, 'attendance'),
          where('organizationId', '==', organizationId),
          where('userId', '==', filters.userId),
          limit(100)
        );
      }

      const snapshot = await getDocs(q);
      console.log('Attendance records found:', snapshot.size);
      
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        checkInTime: doc.data().checkInTime?.toDate?.() || new Date(doc.data().checkInTime),
        checkOutTime: doc.data().checkOutTime?.toDate?.() || (doc.data().checkOutTime ? new Date(doc.data().checkOutTime) : null)
      }));

      // Sort client-side to avoid index requirement
      records.sort((a, b) => new Date(b.checkInTime) - new Date(a.checkInTime));

      // Apply date filter client-side
      if (filters.dateFilter) {
        return this.filterByDateRange(records, filters.dateFilter, filters.customStart, filters.customEnd);
      }

      return records;
    } catch (error) {
      console.error('Error fetching attendance:', error);
      throw error;
    }
  },

  // Filter by date range
  filterByDateRange(records, filterType, customStart, customEnd) {
    const now = new Date();
    let startDate, endDate;

    switch (filterType) {
      case 'TODAY':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'WEEK':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'MONTH':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'CUSTOM':
        startDate = new Date(customStart);
        endDate = new Date(customEnd);
        break;
      default:
        return records;
    }

    return records.filter(record => {
      const recordDate = new Date(record.checkInTime);
      return recordDate >= startDate && recordDate <= endDate;
    });
  },

  // Calculate statistics
  calculateStats(records) {
    const totalPresent = records.filter(r => r.status === 'PRESENT' || r.status === 'CHECKED_OUT').length;
    
    let totalWorkingHours = 0;
    let totalBreakTime = 0;

    records.forEach(record => {
      if (record.checkInTime && record.checkOutTime) {
        const worked = (new Date(record.checkOutTime) - new Date(record.checkInTime)) / (1000 * 60 * 60);
        
        let breakTime = 0;
        if (record.breaks && record.breaks.length > 0) {
          breakTime = record.breaks.reduce((sum, b) => {
            if (b.endTime) {
              return sum + ((new Date(b.endTime) - new Date(b.startTime)) / (1000 * 60 * 60));
            }
            return sum;
          }, 0);
        }

        totalWorkingHours += (worked - breakTime);
        totalBreakTime += breakTime;
      }
    });

    return {
      totalRecords: records.length,
      totalPresent,
      totalWorkingHours: Math.round(totalWorkingHours * 10) / 10,
      totalBreakTime: Math.round(totalBreakTime * 10) / 10,
      averageWorkingHours: records.length > 0 ? Math.round((totalWorkingHours / records.length) * 10) / 10 : 0
    };
  },

  // Cache storage
  _cache: {
    users: null,
    usersOrg: null,
    usersTimestamp: 0
  },

  // Get users list
  async getUsers(organizationId, forceRefresh = false) {
    try {
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
      const now = Date.now();

      if (!forceRefresh && 
          this._cache.users && 
          this._cache.usersOrg === organizationId && 
          (now - this._cache.usersTimestamp < CACHE_DURATION)) {
          // console.log('Serving users from cache');
          return this._cache.users;
      }

      console.log('Fetching users for org:', organizationId);
      
      const q = query(
        collection(db, 'users'),
        where('organizationId', '==', organizationId)
      );

      const snapshot = await getDocs(q);
      console.log('Users found:', snapshot.size);
      
      const users = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));

      // Update cache
      const filteredUsers = users.filter(u => u.role !== 'company_admin');
      
      this._cache.users = filteredUsers;
      this._cache.usersOrg = organizationId;
      this._cache.usersTimestamp = now;

      return filteredUsers;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Update user data
  async updateUser(userId, data) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, data);
      
      // Invalidate cache
      this._cache.users = null;
      
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  // Format duration
  formatDuration(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    return `${hours}h ${minutes}m`;
  },

  // Prepare data for charts
  prepareChartData(records) {
    // Group by date
    const dateMap = {};
    
    records.forEach(record => {
      const date = new Date(record.checkInTime).toLocaleDateString();
      if (!dateMap[date]) {
        dateMap[date] = {
          date,
          present: 0,
          totalHours: 0,
          records: []
        };
      }
      
      dateMap[date].present++;
      dateMap[date].records.push(record);
      
      if (record.checkInTime && record.checkOutTime) {
        const hours = (new Date(record.checkOutTime) - new Date(record.checkInTime)) / (1000 * 60 * 60);
        dateMap[date].totalHours += hours;
      }
    });

    return Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  // Create new user (using secondary app to avoid logout)
  async createUser(userData) {
    let secondaryApp;
    try {
      console.log('Creating user:', userData.email);
      secondaryApp = initializeApp(firebaseConfig, "Secondary");
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, userData.password);
      const uid = userCredential.user.uid;
      
      // Add user details to Firestore
      await setDoc(doc(db, 'users', uid), {
        name: userData.name,
        email: userData.email,
        role: userData.role || 'employee',
        organizationId: userData.organizationId,
        assignedLocationId: userData.locationId || null,
        checkInTime: userData.checkInTime || '09:00',
        checkOutTime: userData.checkOutTime || '17:00',
        createdAt: new Date(),
        isDisabled: false,
        deviceResetRequested: false,
        registeredDeviceId: null
      });
      
      await signOut(secondaryAuth);
      this._cache.users = null;
      return uid;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    } finally {
      if (secondaryApp) {
        await deleteApp(secondaryApp);
      }
    }
  }
};
