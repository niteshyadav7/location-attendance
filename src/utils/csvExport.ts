import { Alert, Platform, PermissionsAndroid } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { format } from 'date-fns';
import { AttendanceRecord, UserProfile } from '../types';

export const requestStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;

  try {
    if (Platform.Version >= 33) return true;
    if (Platform.Version >= 30) return true;

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission',
        message: 'This app needs access to your storage to export CSV files.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Permission request error:', err);
    return false;
  }
};

const formatDuration = (ms: number) => {
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)));
    return `${hours}h ${minutes}m`;
};

export const exportAttendanceToCSV = async (
    records: AttendanceRecord[],
    reportMetadata: {
        userName: string;
        dateRange: string;
        totalPresent: number;
        totalWorkingHours: number;
    }
) => {
    try {
        const hasPermission = await requestStoragePermission();
        if (!hasPermission) {
            Alert.alert('Permission Denied', 'Storage permission is required to export CSV files.');
            return;
        }

        let summarySection = `ATTENDANCE REPORT\n`;
        summarySection += `User,${reportMetadata.userName}\n`;
        summarySection += `Date Range,${reportMetadata.dateRange}\n`;
        summarySection += `Generated On,${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}\n`;
        summarySection += `\n`;
        summarySection += `STATISTICS\n`;
        summarySection += `Total Present Days,${reportMetadata.totalPresent}\n`;
        summarySection += `Total Working Hours,${reportMetadata.totalWorkingHours}h\n`;
        summarySection += `\n`;
        summarySection += `DETAILED RECORDS\n`;

        const header = 'User Name,Date,Check In,Check Out,Duration,Breaks Count,Total Break Time,Break Details,Status,Location\n';
        const rows = records.map(item => {
            const checkIn = item.checkInTime || (item as any).timestamp;
            const checkOut = item.checkOutTime;
            
            let dateStr = checkIn ? format(new Date(checkIn), 'dd/MM/yyyy') : '';
            let timeInStr = checkIn ? format(new Date(checkIn), 'HH:mm:ss') : '';
            let timeOutStr = checkOut ? format(new Date(checkOut), 'HH:mm:ss') : '';
            
            let durationStr = '';
            let breaksCount = 0;
            let totalBreakTime = 0;
            let breakDetails = '';
            
            if (item.breaks && item.breaks.length > 0) {
                breaksCount = item.breaks.length;
                
                const breakList = item.breaks.map((b, index) => {
                    const start = format(new Date(b.startTime), 'HH:mm:ss');
                    const end = b.endTime ? format(new Date(b.endTime), 'HH:mm:ss') : 'Ongoing';
                    const duration = b.endTime ? b.endTime - b.startTime : 0;
                    totalBreakTime += duration;
                    
                    const durationMin = Math.floor(duration / 60000);
                    return `Break ${index + 1}: ${start} - ${end} (${durationMin}min)`;
                }).join('; ');
                
                breakDetails = breakList;
            }
            
            const totalBreakStr = formatDuration(totalBreakTime);
            
            if (checkIn && checkOut) {
                const worked = checkOut - checkIn - totalBreakTime;
                durationStr = formatDuration(worked);
            }

            const escapeField = (field: string) => `"${field ? String(field).replace(/"/g, '""') : ''}"`;
            
            return `${escapeField(item.userName)},${escapeField(dateStr)},${escapeField(timeInStr)},${escapeField(timeOutStr)},${escapeField(durationStr)},${breaksCount},${escapeField(totalBreakStr)},${escapeField(breakDetails)},${escapeField(item.status)},${escapeField(item.locationName)}`;
        }).join('\n');

        const csvContent = summarySection + header + rows;
        
        const safeUserName = reportMetadata.userName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `attendance_${safeUserName}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
        
        await RNFS.writeFile(path, csvContent, 'utf8');
        
        const shareOptions = {
            title: `Export Attendance Report`,
            url: Platform.OS === 'android' ? `file://${path}` : path,
            type: 'text/csv',
            filename: fileName,
            failOnCancel: false,
        };

        await Share.open(shareOptions);

    } catch (error: any) {
        console.error('Export error:', error);
        Alert.alert('Export Error', error.message || 'Failed to export CSV.');
        throw error;
    }
};

export const exportComprehensiveReport = async (
    records: AttendanceRecord[],
    moneyRequests: any[],
    reportMetadata: {
        userName: string;
        dateRange: string;
        totalPresent: number;
        totalWorkingHours: number;
        totalAdvanceAmount: number;
        totalApprovedAmount: number;
        totalPendingAmount: number;
    }
) => {
    try {
        const hasPermission = await requestStoragePermission();
        if (!hasPermission) {
            Alert.alert('Permission Denied', 'Storage permission is required to export CSV files.');
            return;
        }

        // --- PRE-PROCESSING: GROUP BY USER ---
        type UserData = {
            attendance: AttendanceRecord[];
            money: any[];
            stats: {
                present: number;
                hours: number;
                advanceApproved: number;
                advancePending: number;
            };
        };

        const usersMap = new Map<string, UserData>();

        // 1. Process Attendance
        records.forEach(record => {
            const name = record.userName || 'Unknown User';
            if (!usersMap.has(name)) {
                usersMap.set(name, { 
                    attendance: [], 
                    money: [], 
                    stats: { present: 0, hours: 0, advanceApproved: 0, advancePending: 0 } 
                });
            }
            const userData = usersMap.get(name)!;
            userData.attendance.push(record);

            // Calc Stats
            if (record.status === 'PRESENT' || record.status === 'CHECKED_OUT') {
                userData.stats.present++;
            }
            
            if (record.checkInTime && record.checkOutTime) {
                let totalBreak = 0;
                if (record.breaks) {
                    totalBreak = record.breaks.reduce((sum, b) => sum + (b.endTime ? b.endTime - b.startTime : 0), 0);
                }
                const workedMs = record.checkOutTime - record.checkInTime - totalBreak;
                userData.stats.hours += workedMs / (1000 * 60 * 60);
            }
        });

        // 2. Process Money Requests
        moneyRequests.forEach(req => {
            const name = req.userName || 'Unknown User';
            if (!usersMap.has(name)) {
                usersMap.set(name, { 
                    attendance: [], 
                    money: [], 
                    stats: { present: 0, hours: 0, advanceApproved: 0, advancePending: 0 } 
                });
            }
            const userData = usersMap.get(name)!;
            userData.money.push(req);

            if (req.status === 'APPROVED') userData.stats.advanceApproved += Number(req.amount || 0);
            if (req.status === 'PENDING') userData.stats.advancePending += Number(req.amount || 0);
        });

        // Sort Users Alphabetically
        const sortedUserNames = Array.from(usersMap.keys()).sort();

        // --- BUILD CSV CONTENT ---

        // 1. Header & Metadata
        let csvContent = `COMPREHENSIVE PAYROLL REPORT\n`;
        csvContent += `Generated On,${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}\n`;
        csvContent += `Date Range,${reportMetadata.dateRange}\n\n`;
        
        // 2. USER SUMMARY TABLE (New Feature)
        csvContent += `USER SUMMARY (PAYROLL VIEW)\n`;
        csvContent += `User Name,Total Present Days,Total Working Hours,Advance Taken (Approved),Advance Pending\n`;
        
        sortedUserNames.forEach(name => {
            const u = usersMap.get(name)!;
            const hoursFormatted = u.stats.hours.toFixed(1) + 'h';
            csvContent += `"${name}",${u.stats.present},${hoursFormatted},₹${u.stats.advanceApproved},₹${u.stats.advancePending}\n`;
        });
        csvContent += `\n`;

        // 3. DETAILED ATTENDANCE LOG (Grouped by User)
        csvContent += `DETAILED ATTENDANCE LOG\n`;
        csvContent += `User,Date,Check In,Check Out,Duration,Breaks,Break Time,Status,Location\n`;

        sortedUserNames.forEach(name => {
            const u = usersMap.get(name)!;
            // Sort Chronologically (Oldest First) for better readability
            const sortedAttendance = [...u.attendance].sort((a, b) => {
                 const tA = a.checkInTime || (a as any).timestamp;
                 const tB = b.checkInTime || (b as any).timestamp;
                 return tA - tB;
            });

            sortedAttendance.forEach(item => {
                const checkIn = item.checkInTime || (item as any).timestamp;
                const checkOut = item.checkOutTime;
                
                let dateStr = checkIn ? format(new Date(checkIn), 'dd/MM/yyyy') : '';
                let timeInStr = checkIn ? format(new Date(checkIn), 'HH:mm:ss') : '';
                let timeOutStr = checkOut ? format(new Date(checkOut), 'HH:mm:ss') : '';
                
                let durationStr = '';
                let breaksCount = 0;
                let totalBreakTime = 0;
                
                if (item.breaks && item.breaks.length > 0) {
                    breaksCount = item.breaks.length;
                    totalBreakTime = item.breaks.reduce((sum, b) => sum + (b.endTime ? b.endTime - b.startTime : 0), 0);
                }
                
                const totalBreakStr = formatDuration(totalBreakTime);
                
                if (checkIn && checkOut) {
                    const worked = checkOut - checkIn - totalBreakTime;
                    durationStr = formatDuration(worked);
                }

                const escapeField = (field: string) => `"${field ? String(field).replace(/"/g, '""') : ''}"`;
                
                csvContent += `${escapeField(name)},${escapeField(dateStr)},${escapeField(timeInStr)},${escapeField(timeOutStr)},${escapeField(durationStr)},${breaksCount},${escapeField(totalBreakStr)},${escapeField(item.status)},${escapeField(item.locationName)}\n`;
            });
        });
        csvContent += `\n`;

        // 4. DETAILED MONEY REQUESTS (Grouped by User)
        csvContent += `DETAILED MONEY REQUESTS\n`;
        csvContent += `User,Date,Amount,Status,Reason,Approved/Rejected On,Processed By\n`;

        sortedUserNames.forEach(name => {
            const u = usersMap.get(name)!;
            // Sort Chronologically
            const sortedMoney = [...u.money].sort((a, b) => {
                const dA = new Date(a.requestDate).getTime();
                const dB = new Date(b.requestDate).getTime();
                return dA - dB;
            });

            sortedMoney.forEach(req => {
                const getSafeDate = (val: any) => {
                    if (!val) return null;
                    if (typeof val === 'object' && typeof val.toDate === 'function') return val.toDate();
                    const d = new Date(val);
                    return isNaN(d.getTime()) ? null : d;
                };

                const rDate = getSafeDate(req.requestDate);
                const pDate = getSafeDate(req.processedAt);

                const requestDate = rDate ? format(rDate, 'dd/MM/yyyy HH:mm:ss') : 'N/A';
                const processedDate = pDate ? format(pDate, 'dd/MM/yyyy HH:mm:ss') : 'N/A';
                const processedBy = req.processedBy || 'N/A';
                
                const escapeField = (field: string) => `"${field ? String(field).replace(/"/g, '""') : ''}"`;
                
                csvContent += `${escapeField(name)},${escapeField(requestDate)},₹${req.amount},${escapeField(req.status)},${escapeField(req.reason)},${escapeField(processedDate)},${escapeField(processedBy)}\n`;
            });
        });

        // --- WRITE & SHARE ---
        const safeUserName = reportMetadata.userName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `payroll_report_${safeUserName}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
        
        await RNFS.writeFile(path, csvContent, 'utf8');
        
        const shareOptions = {
            title: `Export Comprehensive Payroll Report`,
            url: Platform.OS === 'android' ? `file://${path}` : path,
            type: 'text/csv',
            filename: fileName,
            failOnCancel: false,
        };

        await Share.open(shareOptions);

    } catch (error: any) {
        console.error('Export error:', error);
        Alert.alert('Export Error', error.message || 'Failed to export comprehensive report.');
        throw error;
    }
};

export const exportAttendanceWithAdvance = async (
    records: AttendanceRecord[],
    advanceMoneyMap: Record<string, number>, // UserID -> Total Amount
    fileNamePrefix: string
) => {
    try {
        const hasPermission = await requestStoragePermission();
        if (!hasPermission) {
            Alert.alert('Permission Denied', 'Storage permission is required to export CSV files.');
            return;
        }

        // CSV Header
        const header = 'User Name,User ID,Date,Check In Time,Check Out Time,Total Working Hours,Status,Total Advance Money Taken\n';

        const rows = records.map(item => {
            const checkIn = item.checkInTime || (item as any).timestamp;
            const checkOut = item.checkOutTime;
            
            const dateStr = checkIn ? format(new Date(checkIn), 'd MMM yyyy') : '';
            const timeInStr = checkIn ? format(new Date(checkIn), 'h:mm a') : '--:--';
            const timeOutStr = checkOut ? format(new Date(checkOut), 'h:mm a') : '--:--';
            
            let durationStr = '00:00';
            if (checkIn && checkOut) {
                if (item.autoCheckout) {
                     const fixed = item.fixedHours || 7;
                     durationStr = `${fixed}h 0m`;
                } else {
                    let totalBreak = 0;
                    if (item.breaks) {
                        totalBreak = item.breaks.reduce((acc, b) => {
                            const end = b.endTime || b.startTime;
                            return acc + (end - b.startTime);
                        }, 0);
                    }
                    const worked = checkOut - checkIn - totalBreak;
                    const hours = Math.floor(worked / (1000 * 60 * 60));
                    const minutes = Math.floor((worked / (1000 * 60)) % 60);
                    durationStr = `${hours}h ${minutes}m`;
                }
            }

            const totalAdvance = advanceMoneyMap[item.userId] || 0;
            const status = item.status ? item.status.replace('_', ' ') : 'ABSENT';

            const escapeField = (field: string) => `"${field ? String(field).replace(/"/g, '""') : ''}"`;
            
            return `${escapeField(item.userName)},${escapeField(item.userId)},${escapeField(dateStr)},${escapeField(timeInStr)},${escapeField(timeOutStr)},${escapeField(durationStr)},${escapeField(status)},${totalAdvance}`;
        }).join('\n');

        const csvContent = header + rows;
        
        const fileName = `${fileNamePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
        
        await RNFS.writeFile(path, csvContent, 'utf8');
        
        const shareOptions = {
            title: 'Export Attendance CSV',
            url: Platform.OS === 'android' ? `file://${path}` : path,
            type: 'text/csv',
            filename: fileName,
            failOnCancel: false,
        };

        await Share.open(shareOptions);

    } catch (error: any) {
        console.error('Export error:', error);
        Alert.alert('Export Error', error.message || 'Failed to export CSV.');
        throw error;
    }
};
