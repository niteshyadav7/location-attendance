import { AttendanceRecord, BreakSession } from '../types';

/**
 * Attendance Calculation Utilities
 * 
 * Handles working hours calculation with special rules for auto checkout
 */

/**
 * Calculate total working hours for an attendance record
 * 
 * Rules:
 * - If autoCheckout is true: Return fixed 7 hours
 * - Otherwise: Calculate actual time difference (checkOutTime - checkInTime - breaks)
 * 
 * @param record - The attendance record
 * @returns Total working hours (in hours as decimal)
 */
export function calculateWorkingHours(record: AttendanceRecord): number {
  // Rule 1: Auto checkout cases get fixed 7 hours
  if (record.autoCheckout) {
    return record.fixedHours || 7;
  }

  // Rule 2: No checkout time yet - return 0
  if (!record.checkOutTime) {
    return 0;
  }

  // Rule 3: Calculate actual working time
  const totalTimeMs = record.checkOutTime - record.checkInTime;
  const breakTimeMs = calculateTotalBreakTime(record.breaks || []);
  const workingTimeMs = totalTimeMs - breakTimeMs;

  // Convert to hours (rounded to 2 decimal places)
  return Math.round((workingTimeMs / (1000 * 60 * 60)) * 100) / 100;
}

/**
 * Calculate total break time in milliseconds
 * 
 * @param breaks - Array of break sessions
 * @returns Total break time in milliseconds
 */
export function calculateTotalBreakTime(breaks: BreakSession[]): number {
  return breaks.reduce((total, breakSession) => {
    if (breakSession.endTime && breakSession.startTime) {
      return total + (breakSession.endTime - breakSession.startTime);
    }
    return total;
  }, 0);
}

/**
 * Format working hours as a human-readable string
 * 
 * @param hours - Working hours (decimal)
 * @returns Formatted string (e.g., "7h 30m")
 */
export function formatWorkingHours(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours}h`;
  }
  
  return `${wholeHours}h ${minutes}m`;
}

/**
 * Calculate working hours for display with auto checkout indicator
 * 
 * @param record - The attendance record
 * @returns Object with hours and display string
 */
export function getWorkingHoursDisplay(record: AttendanceRecord): {
  hours: number;
  displayText: string;
  isAutoCheckout: boolean;
} {
  const hours = calculateWorkingHours(record);
  const isAutoCheckout = !!record.autoCheckout;
  
  let displayText = formatWorkingHours(hours);
  
  if (isAutoCheckout) {
    displayText += ' (Auto)';
  }
  
  return {
    hours,
    displayText,
    isAutoCheckout,
  };
}

/**
 * Check if a user should be auto checked out
 * 
 * @param record - The attendance record
 * @param currentTime - Current timestamp
 * @returns true if user should be auto checked out
 */
export function shouldAutoCheckout(record: AttendanceRecord, currentTime: number = Date.now()): boolean {
  // Already checked out
  if (record.status === 'CHECKED_OUT') {
    return false;
  }

  // Already auto checked out
  if (record.autoCheckout || record.autoCheckedOut) {
    return false;
  }

  const now = new Date(currentTime);
  const currentHour = now.getHours();
  const todayStr = now.toISOString().split('T')[0];
  const isToday = record.date === todayStr;

  // Check in after 11 PM - no auto checkout
  const checkInTime = new Date(record.checkInTime);
  if (checkInTime.getHours() >= 23) {
    return false;
  }

  // Old date (yesterday or older) OR today after 11 PM
  return !isToday || (isToday && currentHour >= 23);
}
