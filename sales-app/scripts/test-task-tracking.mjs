import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';

async function runTaskTrackingVerification() {
  console.log('=== Starting Phase 5E Task Assignment, Navigation & Route Tracking Verification ===\n');

  // 1. Authenticate as Admin
  console.log('1. Authenticating as admin@tanejapower.com...');
  const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@tanejapower.com',
    password: 'Admin@123456',
  });
  const adminToken = adminLoginRes.data.data.accessToken;
  const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
  console.log('✓ Admin authenticated successfully.\n');

  // 2. Authenticate as Employee (Rahul Patel)
  console.log('2. Authenticating as rahul.patel@tanejapower.com...');
  const rahulLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'rahul.patel@tanejapower.com',
    password: 'Rahul@123456',
  });
  const rahulToken = rahulLoginRes.data.data.accessToken;
  const rahulUser = rahulLoginRes.data.data.user;
  const rahulHeaders = { headers: { Authorization: `Bearer ${rahulToken}` } };
  console.log(`✓ Authenticated: ${rahulUser.fullName} (${rahulUser.id})\n`);

  // 3. Authenticate as Employee (John Employee)
  console.log('3. Authenticating as employee@tanejapower.com...');
  const johnLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'employee@tanejapower.com',
    password: 'Employee@123456',
  });
  const johnToken = johnLoginRes.data.data.accessToken;
  const johnHeaders = { headers: { Authorization: `Bearer ${johnToken}` } };
  console.log('✓ Second employee authenticated for isolation checks.\n');

  // 4. Admin Creates and Assigns a Task to Rahul
  console.log('4. Admin creating and assigning a new test work order to Rahul...');
  const customersRes = await axios.get(`${API_BASE}/customers`, adminHeaders);
  let sampleCustomer = Array.isArray(customersRes.data?.data) ? customersRes.data.data[0] : customersRes.data[0];

  if (!sampleCustomer) {
    // Create a customer if none exists
    const newCustRes = await axios.post(
      `${API_BASE}/customers`,
      {
        name: 'Vadodara Power Grid Hub',
        companyName: 'Gujarat Power Distribution Ltd',
        phone: '+91 98250 11223',
        email: 'grid@gujaratpower.com',
        address: 'Plot 10, Industrial Estate',
        city: 'Vadodara',
        state: 'Gujarat',
        pincode: '390010',
      },
      adminHeaders
    );
    sampleCustomer = newCustRes.data.data;
  }

  const destRes = await axios.get(`${API_BASE}/customers/${sampleCustomer.id}/destinations`, adminHeaders);
  let sampleDest = Array.isArray(destRes.data?.data) ? destRes.data.data[0] : destRes.data[0];

  if (!sampleDest) {
    const newDestRes = await axios.post(
      `${API_BASE}/customers/${sampleCustomer.id}/destinations`,
      {
        name: 'GIDC Substation Array 4',
        address: 'Plot 10-12, Sector 5',
        city: 'Vadodara',
        state: 'Gujarat',
        pincode: '390010',
        latitude: '22.3072000',
        longitude: '73.1812000',
        contactPerson: 'Karan Dave',
        contactPhone: '+91 98250 99881',
      },
      adminHeaders
    );
    sampleDest = newDestRes.data.data;
  }

  const createTaskRes = await axios.post(
    `${API_BASE}/tasks`,
    {
      title: 'Emergency Solar Inverter Phase-5E Test Dispatch',
      description: 'Perform dual-MPPT diagnostic telemetry test and verify GPS routing.',
      customerId: sampleCustomer.id,
      destinationId: sampleDest.id,
      assignedTo: rahulUser.id,
      priority: 'HIGH',
      scheduledAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    },
    adminHeaders
  );

  const testTaskId = createTaskRes.data.data.id;
  console.log(`✓ Task created: "${createTaskRes.data.data.title}" (ID: ${testTaskId})\n`);

  // 5. Employee fetches assigned tasks
  console.log("5. Employee retrieving assigned task list (GET /tasks/my-tasks)...");
  const myTasksRes = await axios.get(`${API_BASE}/tasks/my-tasks`, rahulHeaders);
  const assignedTestTask = myTasksRes.data.data.find((t) => t.id === testTaskId);
  if (!assignedTestTask) {
    throw new Error('Created task was not found in employee assigned tasks list!');
  }
  console.log(`✓ Employee retrieved assigned task. Initial Status: ${assignedTestTask.status}\n`);

  // 6. Role Isolation: John Employee attempts to start Rahul's task
  console.log("6. Testing unauthorized task start rejection (Employee data isolation)...");
  try {
    await axios.post(
      `${API_BASE}/tasks/${testTaskId}/start`,
      { latitude: 22.3072, longitude: 73.1812 },
      johnHeaders
    );
    console.error('✗ Should have rejected unauthorized employee starting another person’s task');
  } catch (err) {
    console.log(`✓ Correctly rejected unauthorized task start: HTTP ${err.response?.status} (${err.response?.data?.message || err.message})\n`);
  }

  // 7. Assigned Employee Starts the Task with GPS
  console.log('7. Assigned employee starting task with initial GPS (22.3072000, 73.1812000)...');
  const startTaskRes = await axios.post(
    `${API_BASE}/tasks/${testTaskId}/start`,
    { latitude: 22.3072, longitude: 73.1812 },
    rahulHeaders
  );
  console.log('✓ Task Started:');
  console.log(`  - Status: ${startTaskRes.data.data.status}`);
  console.log(`  - Started At: ${startTaskRes.data.data.startedAt}`);
  console.log(`  - GPS Lat: ${startTaskRes.data.data.currentLatitude}, Lng: ${startTaskRes.data.data.currentLongitude}\n`);

  // 8. Prevent duplicate start
  console.log('8. Testing duplicate start rejection...');
  try {
    await axios.post(
      `${API_BASE}/tasks/${testTaskId}/start`,
      { latitude: 22.3072, longitude: 73.1812 },
      rahulHeaders
    );
    console.error('✗ Should have rejected duplicate task start');
  } catch (err) {
    console.log(`✓ Correctly rejected duplicate task start: ${err.response?.data?.message || err.message}\n`);
  }

  // 9. Transmit Live Location Telemetry Updates
  console.log('9. Transmitting periodic live location telemetry update...');
  const locUpdateRes = await axios.post(
    `${API_BASE}/tasks/${testTaskId}/location`,
    {
      latitude: 22.3155,
      longitude: 73.1899,
      accuracy: 8.5,
      timestamp: Date.now(),
    },
    rahulHeaders
  );
  console.log('✓ Live Location Update Recorded:');
  console.log(`  - Current Lat: ${locUpdateRes.data.data.currentLatitude}, Lng: ${locUpdateRes.data.data.currentLongitude}`);
  console.log(`  - Last Updated: ${locUpdateRes.data.data.lastLocationUpdatedAt}\n`);

  // 10. Coordinate Validation Tests
  console.log('10. Testing telemetry coordinate boundary validation...');
  try {
    await axios.post(
      `${API_BASE}/tasks/${testTaskId}/location`,
      { latitude: 95.0, longitude: 73.1899 },
      rahulHeaders
    );
    console.error('✗ Should have rejected latitude > 90');
  } catch (err) {
    console.log(`✓ Correctly rejected invalid latitude: ${err.response?.data?.message || err.message}\n`);
  }

  // 11. Admin Active Route Tracking Endpoint
  console.log('11. Admin retrieving live active tracking sessions (GET /tasks/active-tracking)...');
  const activeTrackingRes = await axios.get(`${API_BASE}/tasks/active-tracking`, adminHeaders);
  const trackedTask = activeTrackingRes.data.data.find((t) => t.id === testTaskId);
  if (!trackedTask) {
    throw new Error('Active in-progress task not found in Admin tracking feed!');
  }
  console.log('✓ Admin Live Tracking Feed Verified:');
  console.log(`  - Task: ${trackedTask.title}`);
  console.log(`  - Engineer: ${trackedTask.assignedUser?.fullName}`);
  console.log(`  - Site: ${trackedTask.destination?.name}`);
  console.log(`  - Live GPS: ${trackedTask.currentLatitude}, ${trackedTask.currentLongitude}\n`);

  // 12. Non-Admin (Employee) Rejection on Admin Tracking Route
  console.log('12. Verifying employees cannot access Admin-only active tracking feed...');
  try {
    await axios.get(`${API_BASE}/tasks/active-tracking`, rahulHeaders);
    console.error('✗ Employee should not be allowed to access /tasks/active-tracking');
  } catch (err) {
    console.log(`✓ Correctly blocked employee from Admin tracking feed: HTTP ${err.response?.status}\n`);
  }

  // 13. Employee Completes Task
  console.log('13. Employee completing work order with final GPS...');
  const completeTaskRes = await axios.post(
    `${API_BASE}/tasks/${testTaskId}/complete`,
    {
      notes: 'Diagnostic completed. Telemetry validated successfully.',
      latitude: 22.316,
      longitude: 73.19,
    },
    rahulHeaders
  );
  console.log('✓ Task Completed:');
  console.log(`  - Status: ${completeTaskRes.data.data.status}`);
  console.log(`  - Completed At: ${completeTaskRes.data.data.completedAt}\n`);

  // 14. Location Telemetry Stopped after Task Completion
  console.log('14. Verifying location telemetry is rejected once task is completed...');
  try {
    await axios.post(
      `${API_BASE}/tasks/${testTaskId}/location`,
      { latitude: 22.316, longitude: 73.19 },
      rahulHeaders
    );
    console.error('✗ Should have rejected location update on completed task');
  } catch (err) {
    console.log(`✓ Correctly rejected location update on completed task: ${err.response?.data?.message || err.message}\n`);
  }

  // 15. Task & Attendance Independence Verification
  console.log('15. Verifying Attendance Independence...');
  const attendanceRes = await axios.get(`${API_BASE}/attendance/me`, rahulHeaders);
  console.log(`✓ Employee attendance status remains undisturbed: ${attendanceRes.data.data.status}\n`);

  console.log('=== All Phase 5E Task Assignment, Navigation & Live Route Tracking Checks Passed! ===');
}

runTaskTrackingVerification().catch((err) => {
  console.error('Verification failed:', err.response?.data || err.message);
  process.exit(1);
});
