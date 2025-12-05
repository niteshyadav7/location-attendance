export interface LocationConfig {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  assignedLocationId?: string;
  status?: 'pending' | 'approved' | 'rejected'; // New field for approval
  currentStatus?: 'WORKING' | 'ON_BREAK' | 'CHECKED_OUT' | 'OFFLINE';
  lastActive?: number;
  isActive?: boolean; // New field to track if user is active (default: true)
}

export interface BreakSession {
  startTime: number;
  endTime?: number;
  startImage?: string;
  endImage?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  locationId: string;
  locationName: string;
  date: string; // YYYY-MM-DD
  checkInTime: number;
  checkInImage?: string;
  checkOutTime?: number;
  checkOutImage?: string;
  breaks: BreakSession[];
  status: 'PRESENT' | 'ON_BREAK' | 'CHECKED_OUT';
  latitude: number;
  longitude: number;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestDate: number;
}

export interface Notification {
  id: string;
  type: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface Notice {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  isActive: boolean;
  targetUsers?: string[]; // Optional: specific users, if empty = all users
}
