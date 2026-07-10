const admin = require('firebase-admin');

// Initialize admin SDK
admin.initializeApp({
  projectId: "location-tenant-attendance"
});

const db = admin.firestore();

const seed = async () => {
  const mockWorkers = [
    {
      uid: "mock_worker_1",
      name: "Ramesh Kumar",
      email: "ramesh@test.com",
      phone: "9876543210",
      locality: "Kaasganj",
      jobTitle: "Kirana Helper",
      skills: ["Inventory", "Stocking", "Customer Care"],
      experienceYears: 2,
      bio: "Reliable helper with 2 years of experience in kirana store management and stocking.",
      expectedSalary: "₹8,000/month",
      isLookingForJob: true,
      visibilityState: "active",
      currentEmployerId: null,
      currentEmployerName: null,
      attendanceTrustDays: 45,
      avgAttendanceRate: 98,
      updatedAt: Date.now()
    },
    {
      uid: "mock_worker_2",
      name: "Suresh Yadav",
      email: "suresh@test.com",
      phone: "9876543211",
      locality: "Kaasganj",
      jobTitle: "Billing Operator",
      skills: ["Billing", "Excel", "Tally", "Cash Handling"],
      experienceYears: 3,
      bio: "Fast and accurate billing clerk. Well-versed with GST billing software and cash registers.",
      expectedSalary: "₹12,000/month",
      isLookingForJob: true,
      visibilityState: "active",
      currentEmployerId: null,
      currentEmployerName: null,
      attendanceTrustDays: 98,
      avgAttendanceRate: 99,
      updatedAt: Date.now()
    },
    {
      uid: "mock_worker_3",
      name: "Amit Sharma",
      email: "amit@test.com",
      phone: "9876543212",
      locality: "Kaasganj",
      jobTitle: "Store Manager",
      skills: ["Management", "Staff Supervision", "Audit", "Vendor Relations"],
      experienceYears: 5,
      bio: "5+ years managing local supermarkets and retail outlets. Expert in optimizing team productivity.",
      expectedSalary: "₹18,000/month",
      isLookingForJob: true,
      visibilityState: "notice",
      currentEmployerId: "default-org",
      currentEmployerName: "Main Store",
      attendanceTrustDays: 145,
      avgAttendanceRate: 97,
      updatedAt: Date.now()
    }
  ];

  try {
    for (const worker of mockWorkers) {
      await db.collection('hiring_profiles').doc(worker.uid).set(worker);
      console.log(`✅ Admin Seeded: ${worker.name}`);
    }
    console.log('🎉 Admin Seeding successfully completed!');
  } catch (err) {
    console.error('❌ Admin Seeding failed:', err.message);
  }
};

seed();
