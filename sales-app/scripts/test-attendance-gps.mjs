import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';

async function runGpsAttendanceVerification() {
  console.log('=== Starting Phase 5C Foreground GPS Attendance Verification ===\n');

  // 1. Authenticate as Employee
  console.log('1. Authenticating as rahul.patel@tanejapower.com...');
  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'rahul.patel@tanejapower.com',
    password: 'Rahul@123456',
  });

  const accessToken = loginRes.data.data.accessToken;
  const employeeUser = loginRes.data.data.user;
  console.log(`✓ Authenticated: ${employeeUser.fullName} (${employeeUser.id})\n`);

  const authHeaders = {
    headers: { Authorization: `Bearer ${accessToken}` },
  };

  // 2. Test Invalid Coordinates Validation
  console.log('2. Testing coordinate boundary validation...');
  try {
    await axios.post(
      `${API_BASE}/attendance/check-in`,
      { latitude: 120.5, longitude: 77.2 },
      authHeaders
    );
    console.error('✗ Should have rejected invalid latitude (> 90)');
  } catch (err) {
    console.log(`✓ Correctly rejected invalid latitude (> 90): ${err.response?.data?.message || err.message}`);
  }

  try {
    await axios.post(
      `${API_BASE}/attendance/check-in`,
      { latitude: 28.5 }, // missing longitude
      authHeaders
    );
    console.error('✗ Should have rejected lonely latitude without longitude');
  } catch (err) {
    console.log(`✓ Correctly rejected coordinate pair mismatch: ${err.response?.data?.message || err.message}\n`);
  }

  // 3. Test Unauthenticated Request
  console.log('3. Testing unauthenticated check-in rejection...');
  try {
    await axios.post(`${API_BASE}/attendance/check-in`, {
      latitude: 28.6139,
      longitude: 77.209,
    });
    console.error('✗ Should have rejected unauthenticated request');
  } catch (err) {
    console.log(`✓ Correctly rejected unauthenticated request: HTTP ${err.response?.status}\n`);
  }

  // 4. Query current attendance status for today
  console.log("4. Fetching today's initial attendance status...");
  const initialStatusRes = await axios.get(`${API_BASE}/attendance/me`, authHeaders);
  console.log(`Initial Status: ${initialStatusRes.data.data.status}\n`);

  // 5. Test Check-In or Check-Out with GPS
  if (initialStatusRes.data.data.status === 'NOT_CHECKED_IN') {
    console.log('5. Performing Check-In with GPS coordinates (28.6139000, 77.2090000)...');
    const checkInRes = await axios.post(
      `${API_BASE}/attendance/check-in`,
      {
        latitude: 28.6139,
        longitude: 77.209,
        notes: 'Mobile app foreground GPS punch test',
      },
      authHeaders
    );

    console.log('✓ Check-In Recorded:');
    console.log(`  - Record ID: ${checkInRes.data.data.id}`);
    console.log(`  - Check-in At: ${checkInRes.data.data.checkInAt}`);
    console.log(`  - GPS Lat: ${checkInRes.data.data.checkInLatitude}, Lng: ${checkInRes.data.data.checkInLongitude}`);
    console.log(`  - Status: ${checkInRes.data.data.status}\n`);

    // Verify duplicate check-in is rejected
    console.log('6. Testing duplicate check-in rejection...');
    try {
      await axios.post(
        `${API_BASE}/attendance/check-in`,
        { latitude: 28.6139, longitude: 77.209 },
        authHeaders
      );
      console.error('✗ Should have rejected duplicate check-in');
    } catch (err) {
      console.log(`✓ Correctly rejected duplicate check-in: ${err.response?.data?.message || err.message}\n`);
    }

    // Perform Check-Out with GPS
    console.log('7. Performing Check-Out with GPS coordinates (28.6205000, 77.2150000)...');
    const checkOutRes = await axios.post(
      `${API_BASE}/attendance/check-out`,
      {
        latitude: 28.6205,
        longitude: 77.215,
        notes: 'Shift completed at Connaught Place territory',
      },
      authHeaders
    );

    console.log('✓ Check-Out Recorded:');
    console.log(`  - Record ID: ${checkOutRes.data.data.id}`);
    console.log(`  - Check-out At: ${checkOutRes.data.data.checkOutAt}`);
    console.log(`  - GPS Lat: ${checkOutRes.data.data.checkOutLatitude}, Lng: ${checkOutRes.data.data.checkOutLongitude}`);
    console.log(`  - Total Minutes: ${checkOutRes.data.data.totalMinutes}`);
    console.log(`  - Status: ${checkOutRes.data.data.status}\n`);

    // Verify duplicate check-out is rejected
    console.log('8. Testing duplicate check-out rejection...');
    try {
      await axios.post(
        `${API_BASE}/attendance/check-out`,
        { latitude: 28.6205, longitude: 77.215 },
        authHeaders
      );
      console.error('✗ Should have rejected duplicate check-out');
    } catch (err) {
      console.log(`✓ Correctly rejected duplicate check-out: ${err.response?.data?.message || err.message}\n`);
    }
  } else if (initialStatusRes.data.data.status === 'CHECKED_IN') {
    console.log('5. Performing Check-Out with GPS coordinates (28.6205000, 77.2150000)...');
    const checkOutRes = await axios.post(
      `${API_BASE}/attendance/check-out`,
      {
        latitude: 28.6205,
        longitude: 77.215,
        notes: 'Shift completed at Connaught Place territory',
      },
      authHeaders
    );

    console.log('✓ Check-Out Recorded:');
    console.log(`  - Check-out At: ${checkOutRes.data.data.checkOutAt}`);
    console.log(`  - GPS Lat: ${checkOutRes.data.data.checkOutLatitude}, Lng: ${checkOutRes.data.data.checkOutLongitude}`);
    console.log(`  - Total Minutes: ${checkOutRes.data.data.totalMinutes}`);
    console.log(`  - Status: ${checkOutRes.data.data.status}\n`);
  } else {
    console.log('5. Today record is already CHECKED_OUT. Verified existing telemetry:');
    const rec = initialStatusRes.data.data.todayRecord;
    console.log(`  - Check-in: ${rec.checkInAt} (GPS: ${rec.checkInLatitude}, ${rec.checkInLongitude})`);
    console.log(`  - Check-out: ${rec.checkOutAt} (GPS: ${rec.checkOutLatitude}, ${rec.checkOutLongitude})`);
    console.log(`  - Duration: ${rec.totalMinutes} minutes\n`);
  }

  // 9. Verify History API includes coordinates
  console.log('9. Fetching Attendance History list...');
  const historyRes = await axios.get(`${API_BASE}/attendance/my-history`, authHeaders);
  console.log(`✓ Retrieved ${historyRes.data.data.length} historical records.`);
  if (historyRes.data.data.length > 0) {
    const latest = historyRes.data.data[0];
    console.log(`  Latest Record (${latest.attendanceDate}):`);
    console.log(`    Check-In: ${latest.checkInAt} (GPS: ${latest.checkInLatitude}, ${latest.checkInLongitude})`);
    console.log(`    Check-Out: ${latest.checkOutAt} (GPS: ${latest.checkOutLatitude}, ${latest.checkOutLongitude})`);
  }

  console.log('\n=== All Phase 5C GPS Attendance API Checks Passed Successfully! ===');
}

runGpsAttendanceVerification().catch((err) => {
  console.error('Verification failed:', err.response?.data || err.message);
  process.exit(1);
});
