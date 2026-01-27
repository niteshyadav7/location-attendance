// Test Data Generator for Multi-Tenancy
// Run this script to populate Firebase with dummy data

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const DEFAULT_PASSWORD = 'Test@123'; // Use this password for all test users

// ============================================
// ORGANIZATIONS
// ============================================
const organizations = [
  {
    id: 'default-org',
    name: 'TechCorp Solutions',
    email: 'admin@techcorp.com',
    phone: '+91-9876543210',
    address: 'Bangalore, Karnataka, India',
    subscriptionPlan: 'enterprise',
    subscriptionStatus: 'active',
    subscriptionStartDate: Date.now(),
    maxUsers: 999999,
    maxLocations: 999999,
    primaryColor: '#4F46E5',
    secondaryColor: '#818CF8',
    createdAt: Date.now(),
    createdBy: 'system',
    isActive: true,
  },
  {
    id: 'restaurant-chain',
    name: 'Tasty Bites Restaurant Chain',
    email: 'admin@tastybites.com',
    phone: '+91-9876543211',
    address: 'Mumbai, Maharashtra, India',
    subscriptionPlan: 'pro',
    subscriptionStatus: 'active',
    subscriptionStartDate: Date.now(),
    maxUsers: 200,
    maxLocations: 10,
    primaryColor: '#EF4444',
    secondaryColor: '#F87171',
    createdAt: Date.now(),
    createdBy: 'system',
    isActive: true,
  },
  {
    id: 'construction-co',
    name: 'BuildRight Construction',
    email: 'admin@buildright.com',
    phone: '+91-9876543212',
    address: 'Delhi, India',
    subscriptionPlan: 'pro',
    subscriptionStatus: 'active',
    subscriptionStartDate: Date.now(),
    maxUsers: 200,
    maxLocations: 10,
    primaryColor: '#F59E0B',
    secondaryColor: '#FBBF24',
    createdAt: Date.now(),
    createdBy: 'system',
    isActive: true,
  },
];

// ============================================
// USERS
// ============================================
const users = [
  // Super Admin (You)
  {
    email: 'superadmin@test.com',
    password: DEFAULT_PASSWORD,
    profile: {
      name: 'Super Admin',
      organizationId: 'default-org',
      role: 'super_admin',
      status: 'approved',
      isActive: true,
      phone: '+91-9999999999',
      dateOfJoining: Date.now(),
    },
  },
  
  // TechCorp Solutions (default-org)
  {
    email: 'admin.techcorp@test.com',
    password: DEFAULT_PASSWORD,
    profile: {
      name: 'John Smith',
      organizationId: 'default-org',
      role: 'company_admin',
      status: 'approved',
      isActive: true,
      phone: '+91-9876543210',
      dateOfJoining: Date.now(),
    },
  },
  {
    email: 'user1.techcorp@test.com',
    password: DEFAULT_PASSWORD,
    profile: {
      name: 'Alice Johnson',
      organizationId: 'default-org',
      role: 'user',
      status: 'approved',
      isActive: true,
      assignedLocationId: 'tech-bangalore',
      phone: '+91-9876543220',
      currentStatus: 'OFFLINE',
      dateOfJoining: Date.now(),
    },
  },
  {
    email: 'user2.techcorp@test.com',
    password: DEFAULT_PASSWORD,
    profile: {
      name: 'Bob Williams',
      organizationId: 'default-org',
      role: 'user',
      status: 'approved',
      isActive: true,
      assignedLocationId: 'tech-bangalore',
      phone: '+91-9876543221',
      currentStatus: 'OFFLINE',
      dateOfJoining: Date.now(),
    },
  },
  {
    email: 'user3.techcorp@test.com',
    password: DEFAULT_PASSWORD,
    profile: {
      name: 'Carol Davis',
      organizationId: 'default-org',
      role: 'user',
      status: 'approved',
      isActive: true,
      assignedLocationId: 'tech-pune',
      phone: '+91-9876543222',
      currentStatus: 'OFFLINE',
      dateOfJoining: Date.now(),
    },
  },
  
  // Tasty Bites Restaurant (restaurant-chain)
  {
    email: 'admin.restaurant@test.com',
    password: DEFAULT_PASSWORD,
    profile: {
      name: 'Sarah Miller',
      organizationId: 'restaurant-chain',
      role: 'company_admin',
      status: 'approved',
      isActive: true,
      phone: '+91-9876543211',
      dateOfJoining: Date.now(),
    },
  },
  {
    email: 'user1.restaurant@test.com',
    password: DEFAULT_PASSWORD,
    profile: {
      name: 'David Brown',
      organizationId: 'restaurant-chain',
      role: 'user',
      status: 'approved',
      isActive: true,
      assignedLocationId: 'restaurant-mumbai',
      phone: '+91-9876543230',
      currentStatus: 'OFFLINE',
      dateOfJoining: Date.now(),
    },
  },
  {
    email: 'user2.restaurant@test.com',
    password: DEFAULT_PASSWORD,
    profile: {
      name: 'Emma Wilson',
      organizationId: 'restaurant-chain',
      role: 'user',
      status: 'approved',
      isActive: true,
      assignedLocationId: 'restaurant-mumbai',
      phone: '+91-9876543231',
      currentStatus: 'OFFLINE',
      dateOfJoining: Date.now(),
    },
  },
  
  // BuildRight Construction (construction-co)
  {
    email: 'admin.construction@test.com',
    password: DEFAULT_PASSWORD,
    profile: {
      name: 'Mike Anderson',
      organizationId: 'construction-co',
      role: 'company_admin',
      status: 'approved',
      isActive: true,
      phone: '+91-9876543212',
      dateOfJoining: Date.now(),
    },
  },
  {
    email: 'user1.construction@test.com',
    password: DEFAULT_PASSWORD,
    profile: {
      name: 'Frank Taylor',
      organizationId: 'construction-co',
      role: 'user',
      status: 'approved',
      isActive: true,
      assignedLocationId: 'construction-site1',
      phone: '+91-9876543240',
      currentStatus: 'OFFLINE',
      dateOfJoining: Date.now(),
    },
  },
  {
    email: 'user2.construction@test.com',
    password: DEFAULT_PASSWORD,
    profile: {
      name: 'Grace Martinez',
      organizationId: 'construction-co',
      role: 'user',
      status: 'approved',
      isActive: true,
      assignedLocationId: 'construction-site1',
      phone: '+91-9876543241',
      currentStatus: 'OFFLINE',
      dateOfJoining: Date.now(),
    },
  },
];

// ============================================
// LOCATIONS
// ============================================
const locations = [
  // TechCorp Solutions
  {
    id: 'tech-bangalore',
    name: 'TechCorp Bangalore Office',
    latitude: 12.9716,
    longitude: 77.5946,
    radius: 100,
    organizationId: 'default-org',
    address: 'Koramangala, Bangalore, Karnataka',
    contactPerson: 'John Smith',
    contactPhone: '+91-9876543210',
  },
  {
    id: 'tech-pune',
    name: 'TechCorp Pune Office',
    latitude: 18.5204,
    longitude: 73.8567,
    radius: 100,
    organizationId: 'default-org',
    address: 'Hinjewadi, Pune, Maharashtra',
    contactPerson: 'John Smith',
    contactPhone: '+91-9876543210',
  },
  
  // Tasty Bites Restaurant
  {
    id: 'restaurant-mumbai',
    name: 'Tasty Bites - Andheri',
    latitude: 19.1136,
    longitude: 72.8697,
    radius: 50,
    organizationId: 'restaurant-chain',
    address: 'Andheri West, Mumbai, Maharashtra',
    contactPerson: 'Sarah Miller',
    contactPhone: '+91-9876543211',
  },
  {
    id: 'restaurant-bandra',
    name: 'Tasty Bites - Bandra',
    latitude: 19.0596,
    longitude: 72.8295,
    radius: 50,
    organizationId: 'restaurant-chain',
    address: 'Bandra West, Mumbai, Maharashtra',
    contactPerson: 'Sarah Miller',
    contactPhone: '+91-9876543211',
  },
  
  // BuildRight Construction
  {
    id: 'construction-site1',
    name: 'BuildRight Site - Dwarka',
    latitude: 28.5921,
    longitude: 77.0460,
    radius: 200,
    organizationId: 'construction-co',
    address: 'Dwarka, New Delhi',
    contactPerson: 'Mike Anderson',
    contactPhone: '+91-9876543212',
  },
  {
    id: 'construction-site2',
    name: 'BuildRight Site - Gurgaon',
    latitude: 28.4595,
    longitude: 77.0266,
    radius: 200,
    organizationId: 'construction-co',
    address: 'Sector 29, Gurgaon, Haryana',
    contactPerson: 'Mike Anderson',
    contactPhone: '+91-9876543212',
  },
];

// ============================================
// NOTICES
// ============================================
const notices = [
  {
    title: 'Welcome to TechCorp!',
    message: 'Welcome to our attendance tracking system. Please ensure you check in daily.',
    priority: 'medium',
    organizationId: 'default-org',
    createdBy: 'admin.techcorp@test.com',
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    isActive: true,
  },
  {
    title: 'Office Timings Update',
    message: 'New office timings: 9:00 AM to 6:00 PM. Please be punctual.',
    priority: 'high',
    organizationId: 'default-org',
    createdBy: 'admin.techcorp@test.com',
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    isActive: true,
  },
  {
    title: 'Restaurant Opening Hours',
    message: 'All staff must arrive 30 minutes before opening time.',
    priority: 'urgent',
    organizationId: 'restaurant-chain',
    createdBy: 'admin.restaurant@test.com',
    createdAt: Date.now(),
    expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
    isActive: true,
  },
  {
    title: 'Safety Guidelines',
    message: 'All workers must wear safety helmets and boots at construction sites.',
    priority: 'urgent',
    organizationId: 'construction-co',
    createdBy: 'admin.construction@test.com',
    createdAt: Date.now(),
    expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000,
    isActive: true,
  },
];

// ============================================
// MAIN FUNCTION
// ============================================
export const generateTestData = async () => {
  console.log('🚀 Starting test data generation...\n');

  try {
    const db = firestore();
    const authInstance = auth();

    // 1. Create Organizations
    console.log('📊 Creating organizations...');
    for (const org of organizations) {
      await db.collection('organizations').doc(org.id).set(org);
      console.log(`  ✅ Created: ${org.name}`);
    }
    console.log('');

    // 2. Create Users
    console.log('👥 Creating users...');
    const userMap = new Map(); // Store uid mapping
    
    for (const user of users) {
      try {
        // Create auth user
        const userCredential = await authInstance.createUserWithEmailAndPassword(
          user.email,
          user.password
        );
        const uid = userCredential.user.uid;
        
        // Create user profile in Firestore
        await db.collection('users').doc(uid).set({
          uid,
          email: user.email,
          ...user.profile,
        });
        
        userMap.set(user.email, uid);
        console.log(`  ✅ Created: ${user.profile.name} (${user.email})`);
        
        // Sign out after creating each user
        await authInstance.signOut();
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`  ⚠️  User already exists: ${user.email}`);
        } else {
          console.log(`  ❌ Error creating ${user.email}:`, error.message);
        }
      }
    }
    console.log('');

    // 3. Create Locations
    console.log('📍 Creating locations...');
    for (const location of locations) {
      await db.collection('locations').doc(location.id).set(location);
      console.log(`  ✅ Created: ${location.name}`);
    }
    console.log('');

    // 4. Create Notices
    console.log('📢 Creating notices...');
    for (const notice of notices) {
      await db.collection('notices').add(notice);
      console.log(`  ✅ Created: ${notice.title}`);
    }
    console.log('');

    // 5. Create Sample Attendance Records (last 7 days)
    console.log('📅 Creating sample attendance records...');
    const attendanceUsers = [
      { email: 'user1.techcorp@test.com', locationId: 'tech-bangalore', locationName: 'TechCorp Bangalore Office', orgId: 'default-org' },
      { email: 'user2.techcorp@test.com', locationId: 'tech-bangalore', locationName: 'TechCorp Bangalore Office', orgId: 'default-org' },
      { email: 'user1.restaurant@test.com', locationId: 'restaurant-mumbai', locationName: 'Tasty Bites - Andheri', orgId: 'restaurant-chain' },
      { email: 'user1.construction@test.com', locationId: 'construction-site1', locationName: 'BuildRight Site - Dwarka', orgId: 'construction-co' },
    ];

    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);
      const dateStr = date.toISOString().split('T')[0];
      
      for (const attUser of attendanceUsers) {
        const uid = userMap.get(attUser.email);
        if (!uid) continue;

        const checkInTime = new Date(date);
        checkInTime.setHours(9, Math.floor(Math.random() * 30), 0, 0);
        
        const checkOutTime = new Date(date);
        checkOutTime.setHours(18, Math.floor(Math.random() * 30), 0, 0);

        await db.collection('attendance').add({
          userId: uid,
          userName: users.find(u => u.email === attUser.email)?.profile.name || 'User',
          locationId: attUser.locationId,
          locationName: attUser.locationName,
          organizationId: attUser.orgId,
          date: dateStr,
          checkInTime: checkInTime.getTime(),
          checkOutTime: checkOutTime.getTime(),
          breaks: [
            {
              startTime: new Date(date.setHours(13, 0, 0, 0)).getTime(),
              endTime: new Date(date.setHours(13, 30, 0, 0)).getTime(),
            },
          ],
          status: 'CHECKED_OUT',
          latitude: locations.find(l => l.id === attUser.locationId)?.latitude || 0,
          longitude: locations.find(l => l.id === attUser.locationId)?.longitude || 0,
        });
      }
      console.log(`  ✅ Created attendance for ${dateStr}`);
    }
    console.log('');

    // 6. Create Sample Leave Requests
    console.log('🌴 Creating sample leave requests...');
    const leaveRequests = [
      {
        email: 'user1.techcorp@test.com',
        orgId: 'default-org',
        startDate: '2025-12-20',
        endDate: '2025-12-22',
        reason: 'Family vacation',
        status: 'PENDING',
      },
      {
        email: 'user2.techcorp@test.com',
        orgId: 'default-org',
        startDate: '2025-12-25',
        endDate: '2025-12-26',
        reason: 'Personal work',
        status: 'APPROVED',
      },
      {
        email: 'user1.restaurant@test.com',
        orgId: 'restaurant-chain',
        startDate: '2025-12-18',
        endDate: '2025-12-19',
        reason: 'Medical appointment',
        status: 'PENDING',
      },
    ];

    for (const leave of leaveRequests) {
      const uid = userMap.get(leave.email);
      if (!uid) continue;

      await db.collection('leaves').add({
        userId: uid,
        userName: users.find(u => u.email === leave.email)?.profile.name || 'User',
        organizationId: leave.orgId,
        startDate: leave.startDate,
        endDate: leave.endDate,
        reason: leave.reason,
        status: leave.status,
        requestDate: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      });
      console.log(`  ✅ Created leave request for ${leave.email}`);
    }
    console.log('');

    console.log('✅ Test data generation completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`  - Organizations: ${organizations.length}`);
    console.log(`  - Users: ${users.length}`);
    console.log(`  - Locations: ${locations.length}`);
    console.log(`  - Notices: ${notices.length}`);
    console.log(`  - Attendance Records: ${attendanceUsers.length * 7}`);
    console.log(`  - Leave Requests: ${leaveRequests.length}`);
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log('  Password for all users: Test@123');
    console.log('');
    console.log('  Super Admin:');
    console.log('    Email: superadmin@test.com');
    console.log('');
    console.log('  Company Admins:');
    console.log('    TechCorp: admin.techcorp@test.com');
    console.log('    Restaurant: admin.restaurant@test.com');
    console.log('    Construction: admin.construction@test.com');
    console.log('');
    console.log('  Regular Users:');
    console.log('    user1.techcorp@test.com');
    console.log('    user2.techcorp@test.com');
    console.log('    user1.restaurant@test.com');
    console.log('    user1.construction@test.com');
    console.log('');

    return { success: true };
  } catch (error: any) {
    console.error('❌ Error generating test data:', error);
    return { success: false, error: error.message };
  }
};

// Export for use in your app
export default generateTestData;
