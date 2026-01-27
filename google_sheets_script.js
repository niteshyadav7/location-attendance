/**
 * 👑 ULTIMATE APP ADMIN PANEL (Google Sheets Edition)
 * Manage Users, Companies, Locations, Notices, Leaves, and Attendance.
 * 
 * INSTRUCTIONS:
 * 1. Ensure "OAuth2" library is added (ID: 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF).
 * 2. Paste this code.
 * 3. Run 'onOpen' > 'Initialize System'.
 */
// ==========================================
// 1. CONFIGURATION
// ==========================================
const CONFIG = {
  projectId: 'location-tenant-attendance',
  clientEmail: 'firebase-adminsdk-fbsvc@location-tenant-attendance.iam.gserviceaccount.com',
  // Your Private Key (We handle the newlines automatically)
  privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC1AGQJWNqlnnkT
3w4i2iTAWS7bSpkcfclOBBeH1EOEeV6yPFsIosQHlDycZhGZzYFLPfr6RgkLiQRb
GeELavPhj9SmnD0XN1V0bX7XrtvEj/IvwytYA/e7kolev7BZNh/b7oa40yhk8pe7
ytJ/BYbTpe4uviH01Y9k2xFJAG1o9X2R7lEwzO/J1bMRMrtnh21Haz+my5Pz1AJo
yLvmxn4Je8WAgjSXngUL4JqIQ2nC89gF+N5mBKyze0Xl2k6UI2k4ceY8E+q6rmFX
peg2pU4AR3EIjhiZ3QJTGIeFVWAHRKdVDfD4sID1bKQy2QYHCceJfMMFgP6NsRa6
l57rPUd/AgMBAAECggEABDFutm7Wws+yFpp3bQQ1pfvMzulerULh55Co8BEzI3SD
Zp9K2j1sADYfvvuO0UvL8bNYlimR5T/POiQdzuMzSfxt9U6cz+12PEcxVPFUMRYh
Tok/SgsMi+vBAytgQAHE3cNYQQzPeqJ+6SQbAxaJzlw4LaRUE+CGqgE8fhlGb5ek
X9FEGAt7DlK1fxZe3B5kQfuMrKal/pQb1V6Pa7VXj5sgwM2Qja/rt+c0myi9EuV0
72JjlgDlngDbWg1EwAWtAg5uApT1PklM+8XS8HtTMfgQF8jZJ+culUNeeDYoS1Dy
aiiuu9HMxFL4OVR/YN+m/ccDDkjoPXw3UDq9GDdYcQKBgQD1RYDGdjbvD42mtuRC
xr8wGSz+uyEYVAWlWO362tQORAtRyAvMXCJiLUgA/kveh5VKpRrDyS6j+CAyUTub
yx+tmbr/vqiq92xH6yT5kbwEMucGCnwC7Z1+zhd1TVD7a9CNpuEOBmzA4GuEXeMz
gzBmkdbDesD9kroBPflP7N9obQKBgQC86zThu3iTvC+PUCcGFaGDPgbG6Ens3eEe
n3McJ1Urv4LCw463lqydkB9tW/7YKbQ8727aBAwdbdTEkvzjr0X5cDs5PTiTEV1w
bXp21cP9OvvQDKaqfAGjgGPi0aZ6OC1Jdd7lAQ150T650VjjpDVd/R9648Qe7Y6+
fBgGaB/UGwKBgFoq8/2B5g4avKuGXwIBiLXI+5al+rOz5+NyfwKSwhSAhVzKWzQE
xwsqtGbRFdk4JPUtH1rMsh3LkSKOZIiQsxOiCXINiHpZvW/vDUfGgMVWZUH+RrrY
2eaNI2iXROc5KpF4wRHj4MVDe6NM1MLSPs/mW3q/vQU7lK/yNZ5haXw9AoGAZDYw
Gv2i/Fr6r37I9IVM451nYuOdMzSPUfsqyGhk2YwBBOdPMTuP3RSyVwRRrsCQhzJL
DwLOml3EW3HNC8nRyHssLzS2aezwL88jAx5plE5RfQ746b5V8DEOyyaCtJpQC4Om
9LsWNuQz7cWK7VYRqQW4SSvAwNcqvQh+hgd9urkCgYA0er0VdI8c4LkOe3Y1sNc+
VO4Wuqetm9GPVHzbCI8vqXqKmUrSzxZ7OjOdemRB5dvnoJ057hMg9mJJxmKCfFHU
oCDU2Cm5tdRgseNAY4YBIXyTG/a+/+8tNYRBrW5b/IfZU0nIxYkX8fyY8xGutNzN
cV65TAUhswdKwxyGuwCGXA==
-----END PRIVATE KEY-----`,
  organizationId: '' 
};
// Sheet Names
const S = {
  USERS: 'Users',
  COMPANIES: 'Companies',
  LOCATIONS: 'Locations',
  NOTICES: 'Notices',
  LEAVES: 'Leave Requests',
  ATTENDANCE: 'Attendance Logs'
};
// ==========================================
// 2. MENU SYSTEM
// ==========================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getDocumentProperties();
  const autoSyncEnabled = props.getProperty('AUTO_SYNC_ENABLED') === 'true';
  
  ui.createMenu('App Admin')
    .addItem('🚀 Initialize System (Run First)', 'setupFullDashboard')
    .addSeparator()
    .addSubMenu(ui.createMenu('🔄 Sync All Data')
        .addItem('Sync Users', 'importUsers')
        .addItem('Sync Companies', 'importCompanies')
        .addItem('Sync Locations', 'importLocations')
        .addItem('Sync Notices', 'importNotices')
        .addItem('Sync Leaves', 'importLeaves')
        .addItem('Sync Attendance (Last 100)', 'importAttendance'))
    .addSeparator()
    .addSubMenu(ui.createMenu('❌ Sync Deletions (Sheet ➔ DB)')
        .addItem('Delete Missing Users', 'syncUserDeletions')
        .addItem('Delete Missing Companies', 'syncCompanyDeletions')
        .addItem('Delete Missing Locations', 'syncLocationDeletions')
        .addItem('Delete Missing Notices', 'syncNoticeDeletions')
        .addItem('Delete Missing Leaves', 'syncLeaveDeletions'))
    .addSeparator()
    .addSubMenu(ui.createMenu('➕ Creates')
        .addItem('Create Company', 'createCompany')
        .addItem('Create User (w/ Auth)', 'createNewUser')
        .addItem('Create Location', 'createLocation')
        .addItem('Post Notice', 'createNotice'))
    .addSeparator()
    .addItem('💾 Update Selected Row', 'smartUpdate')
    .addItem('✅ Approve Pending Employee', 'approvePendingEmployee')
    .addItem('✅ Approve Device Reset', 'approveDeviceReset')
    .addSeparator()
    .addItem('⚙️ Run Auto-Checkout Check', 'runAutoCheckoutCron')
    .addSeparator()
    .addItem(autoSyncEnabled ? '🔴 Disable Auto-Sync' : '🟢 Enable Auto-Sync', 'toggleAutoSync')
    .addToUi();
}

/**
 * Toggle automatic sync on cell edit
 */
function toggleAutoSync() {
  const props = PropertiesService.getDocumentProperties();
  const currentState = props.getProperty('AUTO_SYNC_ENABLED') === 'true';
  const newState = !currentState;
  
  props.setProperty('AUTO_SYNC_ENABLED', String(newState));
  
  SpreadsheetApp.getUi().alert(
    newState ? 
    '✅ Auto-Sync Enabled!\n\nChanges to Users, Locations, and Leaves will automatically sync to Firebase.' :
    '🔴 Auto-Sync Disabled!\n\nYou must manually click "Update Selected Row" to sync changes.'
  );
  
  // Refresh menu
  onOpen();
}

/**
 * Automatic sync trigger - runs when any cell is edited
 */
function onEdit(e) {
  const props = PropertiesService.getDocumentProperties();
  if (props.getProperty('AUTO_SYNC_ENABLED') !== 'true') return;
  
  if (!e || !e.range) return;
  
  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();
  const row = e.range.getRow();
  
  // Only auto-sync for data rows (not headers)
  if (row <= 1) return;
  
  // Only auto-sync for specific sheets
  if (![S.USERS, S.LOCATIONS, S.LEAVES].includes(sheetName)) return;
  
  try {
    // Get the ID from column A
    const id = sheet.getRange(row, 1).getValue();
    if (!id) return; // No ID means it's not created yet
    
    // Auto-update based on sheet type
    if (sheetName === S.USERS) {
      autoUpdateUser(sheet, row, id);
    } else if (sheetName === S.LOCATIONS) {
      autoUpdateLocation(sheet, row, id);
    } else if (sheetName === S.LEAVES) {
      autoUpdateLeaveStatus(sheet, row, id);
    }
  } catch (error) {
    console.error('Auto-sync error:', error);
  }
}
/**
 * Detects which sheet is active and runs the appropriate update function
 */
function smartUpdate() {
  const sheetName = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getName();
  
  if (sheetName === S.USERS) return updateUser();
  if (sheetName === S.LEAVES) return updateLeaveStatus();
  if (sheetName === S.LOCATIONS) return updateLocation();
  if (sheetName === S.NOTICES) return updateNotice();
  
  SpreadsheetApp.getUi().alert('Update not supported/needed for this sheet.');
}
function setupFullDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const createSheet = (name, headers, color) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
         .setFontWeight('bold').setBackground(color);
  };
  createSheet(S.COMPANIES, ['Company ID', 'Name', 'Plan', 'Created At'], '#b6d7a8');
  createSheet(S.USERS, ['UID', 'Name', 'Email', 'Role', 'Status', 'Is Active', 'Last Active', 'Organization ID', 'Assigned Location ID', 'Device ID', 'Reset Requested', 'Reset Date'], '#c9daf8');
  createSheet(S.LOCATIONS, ['Location ID', 'Name', 'Address', 'Latitude', 'Longitude', 'Radius', 'Organization ID'], '#ffe599');
  createSheet(S.NOTICES, ['Notice ID', 'Title', 'Message', 'Date', 'Organization ID'], '#e6b8af');
  createSheet(S.LEAVES, ['Leave ID', 'User ID', 'User Name', 'Type', 'Start Date', 'End Date', 'Reason', 'Status', 'Org ID'], '#d5a6bd');
  createSheet(S.ATTENDANCE, ['Record ID', 'User ID', 'Name', 'Date', 'Check In', 'Check Out', 'Total Hrs', 'Status'], '#f9cb9c');
  // Add conditional formatting to highlight pending employees
  const userSheet = ss.getSheetByName(S.USERS);
  if (userSheet) {
    const range = userSheet.getRange('A2:L1000'); // Updated to L (12 columns)
    const rules = userSheet.getConditionalFormatRules();
    const newRule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$E2="pending"')
      .setBackground('#fff2cc')
      .setRanges([range])
      .build();
    rules.push(newRule);
    userSheet.setConditionalFormatRules(rules);
  }
  SpreadsheetApp.getUi().alert('System Initialized! All dashboards created.\n\n📌 Pending employees will be highlighted in yellow.');
}
// ==========================================
// 3. CORE FEATURES
// ==========================================
// --- USERS ---
function importUsers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(S.USERS);
  sheet.getRange('A2:L2000').clearContent(); // Updated to L (12 columns)
  const db = new FirebaseApp(CONFIG);
  const users = db.getCollection('users');
  const rows = users.map(u => [
    u.name.split('/').pop(),
    getFieldVal(u.fields.name),
    getFieldVal(u.fields.email),
    getFieldVal(u.fields.role) || 'user',
    getFieldVal(u.fields.status) || 'pending',
    getFieldVal(u.fields.isActive) === false ? 'FALSE' : 'TRUE',
    getFieldVal(u.fields.lastActive) ? new Date(getFieldVal(u.fields.lastActive)).toLocaleString() : '',
    getFieldVal(u.fields.organizationId),
    getFieldVal(u.fields.assignedLocationId) || '', // Assigned Location ID
    getFieldVal(u.fields.registeredDeviceId) || '',
    getFieldVal(u.fields.deviceResetRequested) === true ? 'YES' : 'NO',
    getFieldVal(u.fields.deviceResetRequestDate) ? new Date(getFieldVal(u.fields.deviceResetRequestDate)).toLocaleString() : ''
  ]);
  if(rows.length) sheet.getRange(2, 1, rows.length, 12).setValues(rows); // Updated to 12 columns
  SpreadsheetApp.getActive().toast(`Synced ${rows.length} users`);
}
function createNewUser() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = sheet.getActiveCell().getRow();
  if (sheet.getName() !== S.USERS || row <= 1) return;
  
  const name = sheet.getRange(row, 2).getValue();
  const email = sheet.getRange(row, 3).getValue();
  const role = sheet.getRange(row, 4).getValue() || 'user';
  const orgId = sheet.getRange(row, 8).getValue();
  const assignedLocationId = sheet.getRange(row, 9).getValue() || ''; // Column I - Assigned Location ID
  
  if (!email || !name) {
     SpreadsheetApp.getUi().alert('Missing Name or Email.'); 
     return;
  }
  
  // ✅ FIX: If orgId is missing, show error
  if (!orgId) {
     SpreadsheetApp.getUi().alert('Missing Organization ID in Column H. Please fill it before creating user.'); 
     return;
  }
  
  const ui = SpreadsheetApp.getUi();
  const passResponse = ui.prompt('Set Password', 'Enter temporary password:', ui.ButtonSet.OK_CANCEL);
  if (passResponse.getSelectedButton() !== ui.Button.OK) return;
  const pass = passResponse.getResponseText();
  if (!pass) return;
  const db = new FirebaseApp(CONFIG);
  try {
    const auth = db.createAuthUser(email, pass, name);
    const uid = auth.localId;
    
    // ✅ FIX: Include ALL required fields that the app creates
    const doc = {
       uid: { stringValue: uid },
       name: { stringValue: name },
       email: { stringValue: email },
       role: { stringValue: role }, 
       organizationId: { stringValue: orgId },
       status: { stringValue: 'approved' },
       isActive: { booleanValue: true },
       dateOfJoining: { integerValue: Date.now() },
       currentStatus: { stringValue: 'OFFLINE' },
       lastActive: { integerValue: Date.now() }
    };
    
    // ✅ Add assignedLocationId if provided
    if (assignedLocationId) {
      doc.assignedLocationId = { stringValue: assignedLocationId };
    }
    
    db.createDocumentWithId('users', uid, doc);
    sheet.getRange(row, 1).setValue(uid);
    ui.alert('✅ User Created Successfully!\n\nUID: ' + uid);
  } catch(e) { 
    ui.alert('❌ Error: ' + e.message); 
  }
}
function updateUser() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = sheet.getActiveCell().getRow();
  const uid = sheet.getRange(row, 1).getValue();
  if (!uid) return;
  
  const orgId = sheet.getRange(row, 8).getValue();
  const assignedLocationId = sheet.getRange(row, 9).getValue(); // Column I
  
  // ✅ FIX: Validate organizationId before updating
  if (!orgId) {
    SpreadsheetApp.getUi().alert('Organization ID is required in Column H!');
    return;
  }
  
  const db = new FirebaseApp(CONFIG);
  const update = {
    name: { stringValue: sheet.getRange(row, 2).getValue() },
    role: { stringValue: sheet.getRange(row, 4).getValue() },
    status: { stringValue: sheet.getRange(row, 5).getValue() },
    isActive: { booleanValue: sheet.getRange(row, 6).getValue() === true || sheet.getRange(row, 6).getValue() === 'TRUE' },
    organizationId: { stringValue: orgId }
  };
  
  // ✅ Add or update assignedLocationId
  if (assignedLocationId) {
    update.assignedLocationId = { stringValue: assignedLocationId };
  }
  
  const updateMask = ['name', 'role', 'status', 'isActive', 'organizationId'];
  if (assignedLocationId) {
    updateMask.push('assignedLocationId');
  }
  
  db.patchDocument('users', uid, update, updateMask);
  SpreadsheetApp.getActive().toast('✅ User Updated');
}
function approvePendingEmployee() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== S.USERS) {
    SpreadsheetApp.getUi().alert('Please select an employee row in the Users sheet.');
    return;
  }
  
  const row = sheet.getActiveCell().getRow();
  if (row <= 1) return;
  
  const uid = sheet.getRange(row, 1).getValue();
  const userName = sheet.getRange(row, 2).getValue();
  const currentStatus = sheet.getRange(row, 5).getValue();
  const orgId = sheet.getRange(row, 8).getValue();
  
  if (!uid) {
    SpreadsheetApp.getUi().alert('No employee selected.');
    return;
  }
  
  // ✅ FIX: Validate organizationId
  if (!orgId) {
    SpreadsheetApp.getUi().alert('This user is missing Organization ID. Please add it in Column H first.');
    return;
  }
  
  if (currentStatus !== 'pending') {
    SpreadsheetApp.getUi().alert(`This employee's status is already "${currentStatus}". Only pending employees can be approved.`);
    return;
  }
  
  const result = SpreadsheetApp.getUi().alert(
    'Approve Employee',
    `Approve ${userName} for access to the app?\n\nThis will change their status from "pending" to "approved" and allow them to login.`,
    SpreadsheetApp.getUi().ButtonSet.YES_NO
  );
  
  if (result !== SpreadsheetApp.getUi().Button.YES) return;
  
  const db = new FirebaseApp(CONFIG);
  const update = {
    status: { stringValue: 'approved' },
    isActive: { booleanValue: true },
    organizationId: { stringValue: orgId } // ✅ FIX: Ensure orgId is set
  };
  
  try {
    db.patchDocument('users', uid, update, ['status', 'isActive', 'organizationId']);
    
    sheet.getRange(row, 5).setValue('approved');
    sheet.getRange(row, 6).setValue('TRUE');
    
    SpreadsheetApp.getActive().toast(`✅ ${userName} has been approved!`);
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Error: ' + e.message);
  }
}
function approveDeviceReset() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== S.USERS) {
    SpreadsheetApp.getUi().alert('Please select a user row in the Users sheet.');
    return;
  }
  
  const row = sheet.getActiveCell().getRow();
  if (row <= 1) return;
  
  const uid = sheet.getRange(row, 1).getValue();
  const userName = sheet.getRange(row, 2).getValue();
  const resetRequested = sheet.getRange(row, 10).getValue();
  
  if (!uid) {
    SpreadsheetApp.getUi().alert('No user selected.');
    return;
  }
  
  if (resetRequested !== 'YES') {
    SpreadsheetApp.getUi().alert('This user has not requested a device reset.');
    return;
  }
  
  const result = SpreadsheetApp.getUi().alert(
    'Approve Device Reset',
    `Approve device reset for ${userName}?\n\nThis will unlink their current device and allow them to login from a new device.`,
    SpreadsheetApp.getUi().ButtonSet.YES_NO
  );
  
  if (result !== SpreadsheetApp.getUi().Button.YES) return;
  
  const db = new FirebaseApp(CONFIG);
  const update = {
    registeredDeviceId: { nullValue: null },
    deviceResetRequested: { booleanValue: false },
    deviceResetRequestDate: { nullValue: null }
  };
  
  try {
    db.patchDocument('users', uid, update, ['registeredDeviceId', 'deviceResetRequested', 'deviceResetRequestDate']);
    
    sheet.getRange(row, 9).setValue('');
    sheet.getRange(row, 10).setValue('NO');
    sheet.getRange(row, 11).setValue('');
    
    SpreadsheetApp.getActive().toast(`✅ Device reset approved for ${userName}!`);
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Error: ' + e.message);
  }
}
function syncUserDeletions() { genericSyncDeletions(S.USERS); }
function syncCompanyDeletions() { genericSyncDeletions(S.COMPANIES); }
function syncLocationDeletions() { genericSyncDeletions(S.LOCATIONS); }
function syncNoticeDeletions() { genericSyncDeletions(S.NOTICES); }
function syncLeaveDeletions() { genericSyncDeletions(S.LEAVES); }
function genericSyncDeletions(targetSheetName) {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(targetSheetName);
  
  if (!sheet) {
      ui.alert(`Sheet "${targetSheetName}" not found!`);
      return;
  }
  
  sheet.activate();
  
  let collectionName = '';
  let idProtection = []; 
  switch (targetSheetName) {
    case S.USERS:
      collectionName = 'users';
      idProtection = ['SRuold1GW9hOMSqsJzdaKLwV3N33']; 
      break;
    case S.COMPANIES:
      collectionName = 'organizations';
      idProtection = ['default-org']; 
      break;
    case S.LOCATIONS:
      collectionName = 'locations';
      break;
    case S.NOTICES:
      collectionName = 'notices';
      break;
    case S.LEAVES:
      collectionName = 'leave_requests';
      break;
  }
  const result = ui.alert(
     '⚠️ Hazardous Action',
     `Syncing deletion for sheet: ${targetSheetName}\n\nThis will DELETE any item from the '${collectionName}' database collection that is NOT present in this '${targetSheetName}' sheet.\n\nAre you sure you want to proceed?`,
     ui.ButtonSet.YES_NO
  );
  if (result !== ui.Button.YES) return;
  const sheetUidMap = new Map();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    data.forEach(r => { if(r[0]) sheetUidMap.set(String(r[0]), true); });
  }
  
  const db = new FirebaseApp(CONFIG);
  const dbDocs = db.getCollection(collectionName);
  
  let deletedCount = 0;
  
  dbDocs.forEach(doc => {
    const uid = doc.name.split('/').pop();
    
    if (idProtection.includes(uid)) return;
    if (!sheetUidMap.has(uid)) {
       try {
         db.deleteDocument(collectionName, uid);
         deletedCount++;
       } catch (e) {
         console.log('Failed to delete ' + uid);
       }
    }
  });
  
  SpreadsheetApp.getActive().toast(`✅ Cleanup Complete: Deleted ${deletedCount} items from ${collectionName}.`);
}
// --- LOCATIONS ---
function importLocations() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(S.LOCATIONS);
  sheet.getRange('A2:G1000').clearContent();
  const db = new FirebaseApp(CONFIG);
  const docs = db.getCollection('locations');
  
  const rows = docs.map(d => [
    d.name.split('/').pop(),
    getFieldVal(d.fields.name),
    getFieldVal(d.fields.address),
    getFieldVal(d.fields.latitude),
    getFieldVal(d.fields.longitude),
    getFieldVal(d.fields.radius),
    getFieldVal(d.fields.organizationId)
  ]);
  if(rows.length) sheet.getRange(2, 1, rows.length, 7).setValues(rows);
  SpreadsheetApp.getActive().toast(`Synced ${rows.length} locations`);
}
function createLocation() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== S.LOCATIONS) { ui.alert('Go to Locations sheet first.'); return; }
  
  const row = sheet.getActiveCell().getRow();
  if(row <= 1) return;
  
  const name = sheet.getRange(row, 2).getValue();
  const addr = sheet.getRange(row, 3).getValue() || '';
  const lat = sheet.getRange(row, 4).getValue();
  const lng = sheet.getRange(row, 5).getValue();
  const rad = sheet.getRange(row, 6).getValue();
  const org = sheet.getRange(row, 7).getValue();
  
  if(!name || !lat || !lng || !org) { 
    ui.alert('Missing Name, Lat, Lng, or OrgID'); 
    return; 
  }
  
  // ✅ Validate and convert to numbers
  const latitude = Number(lat);
  const longitude = Number(lng);
  const radius = Number(rad) || 100; // Default 100 meters if not provided
  
  if (isNaN(latitude) || isNaN(longitude) || isNaN(radius)) {
    ui.alert('Latitude, Longitude, and Radius must be valid numbers!');
    return;
  }
  
  const db = new FirebaseApp(CONFIG);
  const doc = {
    name: { stringValue: name },
    address: { stringValue: addr },
    latitude: { doubleValue: latitude },  // ✅ Ensure it's a number
    longitude: { doubleValue: longitude }, // ✅ Ensure it's a number
    radius: { doubleValue: radius },       // ✅ Ensure it's a number
    organizationId: { stringValue: org }
  };
  
  const res = db.createDocument('locations', doc);
  sheet.getRange(row, 1).setValue(res.name.split('/').pop());
  ui.alert('✅ Location Created!');
}
function updateLocation() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = sheet.getActiveCell().getRow();
  const id = sheet.getRange(row, 1).getValue();
  if(!id) return;
  
  // ✅ Convert to numbers
  const latitude = Number(sheet.getRange(row, 4).getValue());
  const longitude = Number(sheet.getRange(row, 5).getValue());
  const radius = Number(sheet.getRange(row, 6).getValue());
  
  if (isNaN(latitude) || isNaN(longitude) || isNaN(radius)) {
    SpreadsheetApp.getUi().alert('Latitude, Longitude, and Radius must be valid numbers!');
    return;
  }
  
  const db = new FirebaseApp(CONFIG);
  const update = {
    name: { stringValue: sheet.getRange(row, 2).getValue() },
    address: { stringValue: sheet.getRange(row, 3).getValue() || '' },
    latitude: { doubleValue: latitude },   // ✅ Ensure it's a number
    longitude: { doubleValue: longitude }, // ✅ Ensure it's a number
    radius: { doubleValue: radius },       // ✅ Ensure it's a number
    organizationId: { stringValue: sheet.getRange(row, 7).getValue() }
  };
  db.patchDocument('locations', id, update, ['name', 'address', 'latitude', 'longitude', 'radius', 'organizationId']);
  SpreadsheetApp.getActive().toast('✅ Location Updated');
}
// --- LEAVES ---
function importLeaves() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(S.LEAVES);
  sheet.getRange('A2:I2000').clearContent();
  const db = new FirebaseApp(CONFIG);
  const docs = db.getCollection('leaves');
  
  const rows = docs.map(d => [
    d.name.split('/').pop(),
    getFieldVal(d.fields.userId),
    getFieldVal(d.fields.userName),
    getFieldVal(d.fields.type),
    getFieldVal(d.fields.startDate),
    getFieldVal(d.fields.endDate),
    getFieldVal(d.fields.reason),
    getFieldVal(d.fields.status),
    getFieldVal(d.fields.organizationId)
  ]);
  if(rows.length) sheet.getRange(2, 1, rows.length, 9).setValues(rows);
  SpreadsheetApp.getActive().toast(`Synced ${rows.length} leave requests`);
}
function updateLeaveStatus() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = sheet.getActiveCell().getRow();
  const id = sheet.getRange(row, 1).getValue();
  const status = sheet.getRange(row, 8).getValue();
  
  if(!id) return;
  const db = new FirebaseApp(CONFIG);
  db.patchDocument('leaves', id, { status: { stringValue: status } }, ['status']);
  SpreadsheetApp.getActive().toast('✅ Leave Status Updated');
}
// --- NOTICES ---
function createNotice() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== S.NOTICES) return;
  const row = sheet.getActiveCell().getRow();
  
  const title = sheet.getRange(row, 2).getValue();
  const msg = sheet.getRange(row, 3).getValue();
  const org = sheet.getRange(row, 5).getValue();
  
  if (!title || !msg || !org) return;
  
  const db = new FirebaseApp(CONFIG);
  const doc = {
    title: { stringValue: title },
    message: { stringValue: msg },
    createdAt: { integerValue: Date.now() },
    organizationId: { stringValue: org },
    isActive: { booleanValue: true },
    priority: { stringValue: 'medium' }
  };
  const res = db.createDocument('notices', doc);
  sheet.getRange(row, 1).setValue(res.name.split('/').pop());
  sheet.getRange(row, 4).setValue(new Date());
  ui.alert('✅ Notice Posted!');
}

// ==========================================
// AUTO CHECKOUT CRON
// ==========================================
/**
 * CRON JOB: Automatically checks out users who forgot to checkout.
 * Recommended Trigger: Time-driven > Every Hour (or Daily at 11 PM)
 */
function runAutoCheckoutCron() {
  const db = new FirebaseApp(CONFIG);
  const now = new Date();
  const currentHour = now.getHours();
  const todayStr = now.toISOString().split('T')[0];
  
  // Find all sessions where status is PRESENT or ON_BREAK
  const query = {
    "structuredQuery": {
      "from": [{ "collectionId": "attendance" }],
      "where": {
        "compositeFilter": {
          "op": "AND",
          "filters": [
            {
              "compositeFilter": {
                "op": "OR",
                "filters": [
                  { "fieldFilter": { "field": { "fieldPath": "status" }, "op": "EQUAL", "value": { "stringValue": "PRESENT" } } },
                  { "fieldFilter": { "field": { "fieldPath": "status" }, "op": "EQUAL", "value": { "stringValue": "ON_BREAK" } } }
                ]
              }
            }
          ]
        }
      }
    }
  };

  try {
    const results = db.runQuery(query);
    let processedCount = 0;

    if (!results || results.length === 0) {
      console.log('No active sessions found.');
      return;
    }

    results.forEach(item => {
      if (!item.document) return;
      const doc = item.document;
      const id = doc.name.split('/').pop();
      const fields = doc.fields;
      
      const date = getFieldVal(fields.date);
      const userId = getFieldVal(fields.userId);
      
      if (!date || !userId) return;

      // Condition: Date is NOT today (Yesterday or older) OR (Date is Today AND Hour >= 23)
      if (date !== todayStr || (date === todayStr && currentHour >= 23)) {
         
         // Calculate Checkout Time (11 PM of that day)
         const checkOutDate = new Date(date);
         checkOutDate.setHours(23, 0, 0, 0);
         const checkOutTimestamp = checkOutDate.getTime();
         
         // 1. Update Attendance Record
         const updateAtt = {
             status: { stringValue: 'CHECKED_OUT' },
             checkOutTime: { integerValue: checkOutTimestamp },
             autoCheckedOut: { booleanValue: true },
             penaltyHours: { integerValue: 5 } // 5 hours penalty
         };
         
         // Close break if open
         if (getFieldVal(fields.status) === 'ON_BREAK') {
           // We'd ideally update properties of the last break, but editing arrays in REST is hard.
           // Simplified: Just closing the session.
         }

         db.patchDocument('attendance', id, updateAtt, ['status', 'checkOutTime', 'autoCheckedOut', 'penaltyHours']);
         
         // 2. Update User Status
         db.patchDocument('users', userId, {
             currentStatus: { stringValue: 'CHECKED_OUT' },
             lastActive: { integerValue: Date.now() }
         }, ['currentStatus', 'lastActive']);
         
         // 3. Send Notification
         const notif = {
             type: { stringValue: 'CHECK_OUT' },
             userId: { stringValue: userId },
             userName: fields.userName || { stringValue: 'Unknown' },
             organizationId: fields.organizationId || { stringValue: '' },
             message: { stringValue: 'Auto-checked out (Penalty applied)' },
             timestamp: { integerValue: Date.now() },
             read: { booleanValue: false }
         };
         db.createDocument('notifications', notif);
         
         processedCount++;
         console.log(`Auto-checked out user: ${userId} for date: ${date}`);
      }
    });

    if (processedCount > 0) {
      SpreadsheetApp.getActive().toast(`⚠️ Auto-Checkout: Processed ${processedCount} users.`);
    } else {
      console.log('No stale sessions found to checkout.');
    }

  } catch (e) {
    console.error('Auto Checkout Error:', e);
    // Silent fail safely so we don't spam errors
  }
}
function importNotices() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(S.NOTICES);
    sheet.getRange('A2:E1000').clearContent();
    const db = new FirebaseApp(CONFIG);
    const docs = db.getCollection('notices');
    const rows = docs.map(d => [
        d.name.split('/').pop(),
        getFieldVal(d.fields.title),
        getFieldVal(d.fields.message),
        getFieldVal(d.fields.createdAt) ? new Date(getFieldVal(d.fields.createdAt)).toLocaleString() : '',
        getFieldVal(d.fields.organizationId)
    ]);
    if(rows.length) sheet.getRange(2, 1, rows.length, 5).setValues(rows);
}
function updateNotice() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const row = sheet.getActiveCell().getRow();
    const id = sheet.getRange(row, 1).getValue();
    if(!id) return;
    
    const db = new FirebaseApp(CONFIG);
    const update = {
        title: { stringValue: sheet.getRange(row, 2).getValue() },
        message: { stringValue: sheet.getRange(row, 3).getValue() }
    };
    db.patchDocument('notices', id, update, ['title', 'message']);
    SpreadsheetApp.getActive().toast('✅ Notice Updated');
}
// --- ATTENDANCE ---
function importAttendance() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(S.ATTENDANCE);
  sheet.getRange('A2:H3000').clearContent();
  const db = new FirebaseApp(CONFIG);
  const docs = db.getCollection('attendance'); 
  
  const rows = docs.map(d => [
    d.name.split('/').pop(),
    getFieldVal(d.fields.userId),
    getFieldVal(d.fields.userName),
    getFieldVal(d.fields.date),
    getFieldVal(d.fields.checkInTime) ? new Date(getFieldVal(d.fields.checkInTime)).toLocaleString() : '',
    getFieldVal(d.fields.checkOutTime) ? new Date(getFieldVal(d.fields.checkOutTime)).toLocaleString() : '',
    getFieldVal(d.fields.totalHours),
    getFieldVal(d.fields.status)
  ]);
  
  rows.sort((a,b) => (a[3] < b[3] ? 1 : -1));
  
  if(rows.length) sheet.getRange(2, 1, rows.length, 8).setValues(rows);
  SpreadsheetApp.getActive().toast(`Loaded ${rows.length} attendance records`);
}
function importCompanies() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(S.COMPANIES);
    sheet.getRange('A2:D1000').clearContent();
    const db = new FirebaseApp(CONFIG);
    const docs = db.getCollection('organizations');
    const rows = docs.map(d => [
        d.name.split('/').pop(),
        getFieldVal(d.fields.name),
        getFieldVal(d.fields.subscriptionPlan) || 'free',
        getFieldVal(d.fields.createdAt) ? new Date(getFieldVal(d.fields.createdAt)).toLocaleString() : ''
    ]);
    if(rows.length) sheet.getRange(2, 1, rows.length, 4).setValues(rows);
}
function createCompany() {
    const ui = SpreadsheetApp.getUi();
    const nameResponse = ui.prompt('Company Name:');
    if (nameResponse.getSelectedButton() !== ui.Button.OK) return;
    const name = nameResponse.getResponseText();
    if(!name) return;
    
    const db = new FirebaseApp(CONFIG);
    const orgCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    const res = db.createDocument('organizations', {
        name: { stringValue: name },
        code: { stringValue: orgCode },
        email: { stringValue: '' },
        subscriptionPlan: { stringValue: 'free' },
        subscriptionStatus: { stringValue: 'trial' },
        subscriptionStartDate: { integerValue: Date.now() },
        maxUsers: { integerValue: 10 },
        maxLocations: { integerValue: 2 },
        createdAt: { integerValue: Date.now() },
        createdBy: { stringValue: 'admin' },
        isActive: { booleanValue: true }
    });
    importCompanies();
    ui.alert(`✅ Company Created!\n\nID: ${res.name.split('/').pop()}\nCode: ${orgCode}`);
}
// ==========================================
// 4. FIREBASE HELPER
// ==========================================
function getFieldVal(fieldObj) {
  if (!fieldObj) return '';
  if (fieldObj.stringValue !== undefined) return fieldObj.stringValue;
  if (fieldObj.booleanValue !== undefined) return fieldObj.booleanValue;
  if (fieldObj.doubleValue !== undefined) return Number(fieldObj.doubleValue);
  if (fieldObj.integerValue !== undefined) return Number(fieldObj.integerValue);
  if (fieldObj.timestampValue !== undefined) return fieldObj.timestampValue;
  if (fieldObj.mapValue !== undefined) return JSON.stringify(fieldObj.mapValue); 
  if (fieldObj.nullValue !== undefined) return '';
  return '';
}
class FirebaseApp {
  constructor(config) {
    this.config = config;
    this.firestoreUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;
    this.identityUrl = `https://identitytoolkit.googleapis.com/v1/projects/${config.projectId}`;
  }
  getAccessToken() {
    const service = OAuth2.createService('FirebaseAdmin')
      .setTokenUrl('https://oauth2.googleapis.com/token')
      .setPrivateKey(this.config.privateKey)
      .setIssuer(this.config.clientEmail)
      .setPropertyStore(PropertiesService.getScriptProperties())
      .setScope('https://www.googleapis.com/auth/cloud-platform'); 
    
    if (!service.hasAccess()) throw new Error('Auth Error: ' + service.getLastError());
    return service.getAccessToken();
  }
  getCollection(coll) {
    const token = this.getAccessToken();
    const url = `${this.firestoreUrl}/${coll}?pageSize=300`;
    const res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
    const json = JSON.parse(res.getContentText());
    if (json.error) throw new Error(json.error.message);
    return json.documents || [];
  }
  createDocument(coll, fields) {
    const token = this.getAccessToken();
    const url = `${this.firestoreUrl}/${coll}`;
    const res = UrlFetchApp.fetch(url, {
      method: 'post', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      payload: JSON.stringify({ fields }), muteHttpExceptions: true
    });
    const json = JSON.parse(res.getContentText());
    if (json.error) throw new Error(json.error.message);
    return json;
  }
  
  createDocumentWithId(coll, id, fields) {
    const token = this.getAccessToken();
    const url = `${this.firestoreUrl}/${coll}/${id}`;
    const res = UrlFetchApp.fetch(url, {
      method: 'patch', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      payload: JSON.stringify({ fields }), muteHttpExceptions: true
    });
    const json = JSON.parse(res.getContentText());
    if (json.error) throw new Error(json.error.message);
    return json;
  }
  patchDocument(coll, id, fields, mask) {
    const token = this.getAccessToken();
    let url = `${this.firestoreUrl}/${coll}/${id}?`;
    mask.forEach(f => url += `updateMask.fieldPaths=${f}&`);
    const res = UrlFetchApp.fetch(url, {
      method: 'patch', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      payload: JSON.stringify({ fields }), muteHttpExceptions: true
    });
    const json = JSON.parse(res.getContentText());
    if (json.error) throw new Error(json.error.message);
    return json;
  }
  deleteDocument(coll, id) {
    const token = this.getAccessToken();
    const url = `${this.firestoreUrl}/${coll}/${id}`;
    const res = UrlFetchApp.fetch(url, {
      method: 'delete', headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true
    });
    return res.getResponseCode() === 200;
  }
  createAuthUser(email, password, name) {
    const apiKey = 'AIzaSyAmZgpCy7ssmGN6BMTKhEdw2qK_oMovntk';// Get from Firebase Console > Project Settings > Web API Key
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify({ email, password, displayName: name, returnSecureToken: true }),
      muteHttpExceptions: true
    });
    const json = JSON.parse(res.getContentText());
    if (json.error) throw new Error(json.error.message);
    return json;
  }
  
  runQuery(query) {
    const token = this.getAccessToken();
    const url = `${this.firestoreUrl}:runQuery`;
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      payload: JSON.stringify(query),
      muteHttpExceptions: true
    });
    const json = JSON.parse(res.getContentText());
    if (json.error) throw new Error(json.error.message);
    return json; // Returns array of { document: ..., readTime: ... }
  }
}

// ==========================================
// 5. AUTO-UPDATE FUNCTIONS (for onEdit trigger)
// ==========================================

/**
 * Auto-update user when cell is edited
 */
function autoUpdateUser(sheet, row, uid) {
  const orgId = sheet.getRange(row, 8).getValue();
  const assignedLocationId = sheet.getRange(row, 9).getValue();
  
  if (!orgId) return; // Skip if no org ID
  
  const db = new FirebaseApp(CONFIG);
  const update = {
    name: { stringValue: sheet.getRange(row, 2).getValue() },
    role: { stringValue: sheet.getRange(row, 4).getValue() },
    status: { stringValue: sheet.getRange(row, 5).getValue() },
    isActive: { booleanValue: sheet.getRange(row, 6).getValue() === true || sheet.getRange(row, 6).getValue() === 'TRUE' },
    organizationId: { stringValue: orgId }
  };
  
  if (assignedLocationId) {
    update.assignedLocationId = { stringValue: assignedLocationId };
  }
  
  const updateMask = ['name', 'role', 'status', 'isActive', 'organizationId'];
  if (assignedLocationId) {
    updateMask.push('assignedLocationId');
  }
  
  db.patchDocument('users', uid, update, updateMask);
}

/**
 * Auto-update location when cell is edited
 */
function autoUpdateLocation(sheet, row, id) {
  const latitude = Number(sheet.getRange(row, 4).getValue());
  const longitude = Number(sheet.getRange(row, 5).getValue());
  const radius = Number(sheet.getRange(row, 6).getValue());
  
  if (isNaN(latitude) || isNaN(longitude) || isNaN(radius)) {
    return; // Skip if invalid numbers
  }
  
  const db = new FirebaseApp(CONFIG);
  const update = {
    name: { stringValue: sheet.getRange(row, 2).getValue() },
    address: { stringValue: sheet.getRange(row, 3).getValue() || '' },
    latitude: { doubleValue: latitude },
    longitude: { doubleValue: longitude },
    radius: { doubleValue: radius },
    organizationId: { stringValue: sheet.getRange(row, 7).getValue() }
  };
  db.patchDocument('locations', id, update, ['name', 'address', 'latitude', 'longitude', 'radius', 'organizationId']);
}

/**
 * Auto-update leave status when cell is edited
 */
function autoUpdateLeaveStatus(sheet, row, id) {
  const status = sheet.getRange(row, 8).getValue();
  if (!status) return;
  
  const db = new FirebaseApp(CONFIG);
  db.patchDocument('leaves', id, { status: { stringValue: status } }, ['status']);
}