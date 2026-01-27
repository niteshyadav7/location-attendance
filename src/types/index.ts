// ============================================
// MULTI-TENANCY: Organization Interface
// ============================================
export interface Organization {
  id: string;
  name: string;
  code?: string; // MULTI-TENANCY: Unique 6-digit code for joining
  email: string;
  phone?: string;
  address?: string;
  logo?: string;
  
  // Subscription
  subscriptionPlan: 'free' | 'starter' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'inactive' | 'trial' | 'expired';
  subscriptionStartDate: number;
  subscriptionEndDate?: number;
  
  // Limits based on plan
  maxUsers: number;
  maxLocations: number;
  
  // Branding (optional)
  primaryColor?: string;
  secondaryColor?: string;

  // Auto Checkout Settings
  autoCheckoutHours?: number; // Fixed hours to credit (e.g., 7)
  autoCheckoutCutoffHour?: number; // Cutoff hour logic (e.g., 19 for 7 PM)
  autoCheckoutTime?: string; // Time to trigger (e.g., "23:00")
  
  // Metadata
  createdAt: number;
  createdBy: string;
  isActive: boolean;
}

// ... (existing code)

// ============================================
// Break Settings
// ============================================
export interface BreakSettings {
  isEnabled: boolean;
  durationMinutes: number; // Max total duration in minutes
  startTime?: string; // "HH:mm" - Earliest break start
  endTime?: string; // "HH:mm" - Latest break end
}

// ============================================
// Location Configuration
// ============================================
export interface LocationConfig {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  organizationId: string; // MULTI-TENANCY: Which organization owns this location
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  breakSettings?: BreakSettings; // Default break settings for this location
}

// ============================================
// User Profile
// ============================================
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  organizationId: string; // MULTI-TENANCY: Which organization this user belongs to
  role: 'super_admin' | 'company_admin' | 'user'; // MULTI-TENANCY: Updated roles
  assignedLocationId?: string;
  status?: 'pending' | 'approved' | 'rejected';
  currentStatus?: 'WORKING' | 'ON_BREAK' | 'CHECKED_OUT' | 'OFFLINE';
  breakSettings?: BreakSettings; // User-specific override
  lastActive?: number;
  isActive?: boolean;
// ... (rest of UserProfile)
  
  // Optional user metadata
  phone?: string;
  address?: string;
  dateOfJoining?: number;
  missedCheckouts?: number;
  lastAutoCheckoutTime?: number; // Timestamp of last auto-checkout event
  appVersion?: string; // App version user is currently using
  
  // Scheduled Shift
  assignedCheckInTime?: string; // "HH:mm"
  assignedCheckOutTime?: string; // "HH:mm"

  // Device Locking
  registeredDeviceId?: string;
  deviceResetRequested?: boolean;
  deviceResetRequestDate?: number;
}

// ============================================
// Break Session
// ============================================
export interface BreakSession {
  startTime: number;
  endTime?: number;
  startImage?: string;
  endImage?: string;
}

// ============================================
// Attendance Record
// ============================================
export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  locationId: string;
  locationName: string;
  organizationId: string; // MULTI-TENANCY: Which organization this attendance belongs to
  date: string; // YYYY-MM-DD
  checkInTime: number;
  checkInImage?: string;
  checkOutTime?: number;
  checkOutImage?: string;
  breaks: BreakSession[];
  status: 'PRESENT' | 'ON_BREAK' | 'CHECKED_OUT';
  latitude: number;
  longitude: number;
  autoCheckout?: boolean; // Flag to indicate if this was an automatic checkout
  fixedHours?: number; // Fixed working hours (7) for auto checkout cases
  notes?: string; // Optional notes (e.g., "Auto-checked out by system")
  autoCheckedOut?: boolean; // Legacy field for backward compatibility
  penaltyHours?: number; // Legacy field for backward compatibility
}

// ============================================
// Leave Request
// ============================================
export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  organizationId: string; // MULTI-TENANCY: Which organization this leave belongs to
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestDate: number;
}

// ============================================
// Notification
// ============================================
export interface Notification {
  id: string;
  type: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END' | 'DEVICE_RESET' | 'MONEY_REQUEST' | 'MONEY_APPROVED' | 'MONEY_REJECTED';
  userId: string;
  userName: string;
  organizationId: string; // MULTI-TENANCY: Which organization this notification belongs to
  message: string;
  timestamp: number;
  read: boolean;
  amount?: number; // For MONEY_REQUEST, MONEY_APPROVED, MONEY_REJECTED notifications
  reason?: string; // For MONEY_REQUEST, MONEY_APPROVED, MONEY_REJECTED notifications
  actionBy?: string; // For MONEY_APPROVED, MONEY_REJECTED notifications (admin who took action)
}

// ============================================
// Notice
// ============================================
export interface Notice {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  organizationId: string; // MULTI-TENANCY: Which organization this notice belongs to
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  isActive: boolean;
  targetUsers?: string[]; // Optional: specific users, if empty = all users
  appUrl?: string; // Optional: Play Store URL for app updates
}
// ============================================
// Feedback
// ============================================
export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  content: string;
  timestamp: number;
  status: 'new' | 'read' | 'archived';
}

// ============================================
// Money Management
// ============================================
export interface MoneyRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string; // Helpful for admin to identify
  organizationId: string;
  amount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestDate: number; // Timestamp
  actionDate?: number; // When admin approved/rejected
  actionBy?: string; // Admin ID/Name
  monthStr: string; // YYYY-MM for easy grouping/filtering
}
