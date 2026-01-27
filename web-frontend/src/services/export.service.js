import Papa from 'papaparse';
import { format } from 'date-fns';

export const exportService = {
  // Export comprehensive report (Attendance + Money Requests)
  exportComprehensiveReport(attendanceData, moneyRequests, metadata) {
    const csvContent = this.generateComprehensiveCSV(attendanceData, moneyRequests, metadata);
    this.downloadCSV(csvContent, `payroll_report_${metadata.userName}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
  },

  // Helper for safe date formatting
  safeFormat(dateStr, fmt) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return format(date, fmt);
    } catch (e) {
      return '';
    }
  },

  // Generate comprehensive CSV content
  generateComprehensiveCSV(attendanceData, moneyRequests, metadata) {
    let content = '';

    // Header Section
    content += `COMPREHENSIVE PAYROLL REPORT\n`;
    content += `User,${metadata.userName}\n`;
    content += `Date Range,${metadata.dateRange}\n`;
    content += `Generated On,${this.safeFormat(new Date(), 'dd/MM/yyyy HH:mm:ss')}\n\n`;

    // Attendance Statistics
    content += `ATTENDANCE STATISTICS\n`;
    content += `Total Present Days,${metadata.totalPresent}\n`;
    content += `Total Working Hours,${metadata.totalWorkingHours}h\n\n`;

    // Money Request Statistics
    content += `ADVANCE MONEY STATISTICS\n`;
    content += `Total Requests,${moneyRequests.length}\n`;
    content += `Total Approved Amount,₹${metadata.totalApprovedAmount}\n`;
    content += `Total Pending Amount,₹${metadata.totalPendingAmount}\n`;
    content += `Grand Total,₹${metadata.totalAdvanceAmount}\n\n`;

    // Attendance Records
    content += `ATTENDANCE RECORDS\n`;
    const attendanceHeaders = ['Date', 'Check In', 'Check Out', 'Duration', 'Breaks', 'Break Time', 'Status', 'Location'];
    content += attendanceHeaders.join(',') + '\n';

    attendanceData.forEach(record => {
      const row = [
        this.safeFormat(record.date, 'dd/MM/yyyy'),
        this.safeFormat(record.checkIn, 'HH:mm:ss'),
        this.safeFormat(record.checkOut, 'HH:mm:ss'),
        record.duration || '',
        record.breaksCount || 0,
        record.breakTime || '',
        record.status,
        record.location || ''
      ];
      content += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    content += '\n';

    // Money Requests
    content += `ADVANCE MONEY REQUESTS\n`;
    const moneyHeaders = ['Date', 'Amount', 'Reason', 'Status', 'Processed On', 'Processed By'];
    content += moneyHeaders.join(',') + '\n';

    moneyRequests.forEach(req => {
      const row = [
        this.safeFormat(req.requestDate, 'dd/MM/yyyy HH:mm:ss'),
        `₹${req.amount}`,
        req.reason,
        req.status,
        this.safeFormat(req.processedAt, 'dd/MM/yyyy HH:mm:ss') || 'N/A',
        req.processedBy || 'N/A'
      ];
      content += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    return content;
  },

  // Export attendance only
  exportAttendance(attendanceData, metadata) {
    const csv = Papa.unparse({
      fields: ['Date', 'User', 'Check In', 'Check Out', 'Duration', 'Breaks', 'Status', 'Location'],
      data: attendanceData.map(record => [
        this.safeFormat(record.date, 'dd/MM/yyyy'),
        record.userName,
        this.safeFormat(record.checkIn, 'HH:mm:ss'),
        this.safeFormat(record.checkOut, 'HH:mm:ss'),
        record.duration || '',
        record.breaksCount || 0,
        record.status,
        record.location || ''
      ])
    });

    this.downloadCSV(csv, `attendance_${metadata.userName}_${this.safeFormat(new Date(), 'yyyyMMdd')}.csv`);
  },

  // Export money requests only
  exportMoneyRequests(moneyRequests, metadata) {
    const csv = Papa.unparse({
      fields: ['Date', 'User', 'Amount', 'Reason', 'Status', 'Processed On', 'Processed By'],
      data: moneyRequests.map(req => [
        this.safeFormat(req.requestDate, 'dd/MM/yyyy HH:mm:ss'),
        req.userName,
        req.amount,
        req.reason,
        req.status,
        this.safeFormat(req.processedAt, 'dd/MM/yyyy HH:mm:ss') || 'N/A',
        req.processedBy || 'N/A'
      ])
    });

    this.downloadCSV(csv, `money_requests_${metadata.userName}_${this.safeFormat(new Date(), 'yyyyMMdd')}.csv`);
  },

  // Download CSV file
  downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
