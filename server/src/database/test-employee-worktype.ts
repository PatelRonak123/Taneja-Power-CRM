import { db, pool } from './db.js';
import { users } from './schema/users.js';
import { eq } from 'drizzle-orm';
import { EmployeeService } from '../modules/employees/services/employee.service.js';
import { AuthService } from '../modules/auth/services/auth.service.js';
import { APP_CONSTANTS } from '../config/constants.js';
import { isValidDesignationForWorkType } from '../modules/employees/validators/employee.validator.js';

async function runTests() {
  console.log('=== RUNNING EMPLOYEE WORK_TYPE ARCHITECTURE VERIFICATION ===\n');
  const employeeService = new EmployeeService();
  const authService = new AuthService();

  // Test 1: Designation & WorkType Combinations Validator
  console.log('--- TEST 1: Combination Rules Validation ---');
  // OFFICE valid
  if (!isValidDesignationForWorkType('OFFICE', 'Sales Office', 'USER')) throw new Error('Expected OFFICE + Sales Office to be valid');
  if (!isValidDesignationForWorkType('OFFICE', 'HR Office', 'USER')) throw new Error('Expected OFFICE + HR Office to be valid');
  if (!isValidDesignationForWorkType('OFFICE', 'Accountant Office', 'USER')) throw new Error('Expected OFFICE + Accountant Office to be valid');
  if (!isValidDesignationForWorkType('OFFICE', 'Service Office', 'USER')) throw new Error('Expected OFFICE + Service Office to be valid');
  if (!isValidDesignationForWorkType('OFFICE', 'Head of Operations', 'ADMIN')) throw new Error('Expected OFFICE + Head of Operations to be valid for ADMIN');

  // OFFICE invalid
  if (isValidDesignationForWorkType('OFFICE', 'Service', 'USER')) throw new Error('Expected OFFICE + Service to be INVALID');
  if (isValidDesignationForWorkType('OFFICE', 'Sales', 'USER')) throw new Error('Expected OFFICE + Sales to be INVALID');
  if (isValidDesignationForWorkType('OFFICE', 'Field Service Engineer', 'USER')) throw new Error('Expected OFFICE + Field Service Engineer to be INVALID');

  // FIELD valid
  if (!isValidDesignationForWorkType('FIELD', 'Sales', 'USER')) throw new Error('Expected FIELD + Sales to be valid');
  if (!isValidDesignationForWorkType('FIELD', 'Service', 'USER')) throw new Error('Expected FIELD + Service to be valid');
  if (!isValidDesignationForWorkType('FIELD', 'Field Service Engineer', 'USER')) throw new Error('Expected FIELD + Field Service Engineer to be valid');
  if (!isValidDesignationForWorkType('FIELD', 'Solar Technician', 'USER')) throw new Error('Expected FIELD + Solar Technician to be valid');

  // FIELD invalid
  if (isValidDesignationForWorkType('FIELD', 'HR Office', 'USER')) throw new Error('Expected FIELD + HR Office to be INVALID');
  if (isValidDesignationForWorkType('FIELD', 'Accountant Office', 'USER')) throw new Error('Expected FIELD + Accountant Office to be INVALID');
  if (isValidDesignationForWorkType('FIELD', 'Service Office', 'USER')) throw new Error('Expected FIELD + Service Office to be INVALID');

  console.log('✓ TEST 1 PASSED: All validation combination rules strictly enforced.\n');

  // Clean up any test users from prior runs
  const testOfficeEmail = 'test.office.user@tanejapower.com';
  const testFieldEmail = 'test.field.user@tanejapower.com';
  await db.delete(users).where(eq(users.email, testOfficeEmail));
  await db.delete(users).where(eq(users.email, testFieldEmail));

  // Test 2: Create OFFICE Employee
  console.log('--- TEST 2: Create OFFICE Employee ---');
  const officeEmp = await employeeService.createEmployee({
    fullName: 'Office Coordinator',
    email: testOfficeEmail,
    password: 'Password@123',
    role: APP_CONSTANTS.ROLES.USER,
    workType: APP_CONSTANTS.WORK_TYPES.OFFICE,
    designation: 'Service Office',
    phone: '+91 99999 11111',
    status: APP_CONSTANTS.STATUS.ACTIVE,
  });
  if (officeEmp.workType !== 'OFFICE') throw new Error(`Expected workType OFFICE, got ${officeEmp.workType}`);
  if (officeEmp.designation !== 'Service Office') throw new Error(`Expected designation Service Office, got ${officeEmp.designation}`);
  console.log(`✓ TEST 2 PASSED: Created OFFICE employee (${officeEmp.id}) with workType=${officeEmp.workType}, designation=${officeEmp.designation}.\n`);

  // Test 3: Create FIELD Employee
  console.log('--- TEST 3: Create FIELD Employee ---');
  const fieldEmp = await employeeService.createEmployee({
    fullName: 'Field Engineer',
    email: testFieldEmail,
    password: 'Password@123',
    role: APP_CONSTANTS.ROLES.USER,
    workType: APP_CONSTANTS.WORK_TYPES.FIELD,
    designation: 'Service',
    phone: '+91 99999 22222',
    status: APP_CONSTANTS.STATUS.ACTIVE,
  });
  if (fieldEmp.workType !== 'FIELD') throw new Error(`Expected workType FIELD, got ${fieldEmp.workType}`);
  if (fieldEmp.designation !== 'Service') throw new Error(`Expected designation Service, got ${fieldEmp.designation}`);
  console.log(`✓ TEST 3 PASSED: Created FIELD employee (${fieldEmp.id}) with workType=${fieldEmp.workType}, designation=${fieldEmp.designation}.\n`);

  // Test 4: Update OFFICE -> FIELD with invalid designation rejected
  console.log('--- TEST 4: Update OFFICE -> FIELD combination validation ---');
  let threw = false;
  try {
    // Attempting to change workType to FIELD while leaving designation as 'Service Office'
    await employeeService.updateEmployee(officeEmp.id, {
      workType: APP_CONSTANTS.WORK_TYPES.FIELD,
    });
  } catch (err: any) {
    threw = true;
    console.log(`✓ Correctly rejected invalid transition with error: ${err.message}`);
  }
  if (!threw) throw new Error('Expected updateEmployee with invalid combination to fail');

  // Now update with compatible designation
  const updatedEmp = await employeeService.updateEmployee(officeEmp.id, {
    workType: APP_CONSTANTS.WORK_TYPES.FIELD,
    designation: 'Service',
  });
  if (updatedEmp.workType !== 'FIELD' || updatedEmp.designation !== 'Service') {
    throw new Error(`Failed to update to valid FIELD + Service: ${JSON.stringify(updatedEmp)}`);
  }
  console.log(`✓ TEST 4 PASSED: Successfully updated to workType=${updatedEmp.workType}, designation=${updatedEmp.designation}.\n`);

  // Test 5: Authentication Profile returns workType
  console.log('--- TEST 5: Auth Profile Response ---');
  const profile = await authService.getCurrentUser(fieldEmp.id);
  if (profile.workType !== 'FIELD') throw new Error(`Expected profile.workType FIELD, got ${profile.workType}`);
  console.log(`✓ TEST 5 PASSED: Current user profile contains workType=${profile.workType}.\n`);

  // Test 6: Repository Filter by workType
  console.log('--- TEST 6: Repository Filtering by workType ---');
  const officeList = await employeeService.listEmployees({ workType: 'OFFICE' });
  const fieldList = await employeeService.listEmployees({ workType: 'FIELD' });
  if (officeList.employees.some(e => e.workType !== 'OFFICE')) throw new Error('Found non-office employee in OFFICE filter');
  if (fieldList.employees.some(e => e.workType !== 'FIELD')) throw new Error('Found non-field employee in FIELD filter');
  console.log(`✓ TEST 6 PASSED: Filter returned ${officeList.employees.length} OFFICE employees and ${fieldList.employees.length} FIELD employees.\n`);

  // Cleanup test users
  await db.delete(users).where(eq(users.email, testOfficeEmail));
  await db.delete(users).where(eq(users.email, testFieldEmail));

  console.log('=== ALL EMPLOYEE WORK_TYPE ARCHITECTURE TESTS PASSED WITH 100% SUCCESS ===\n');
  await pool.end();
  process.exit(0);
}

runTests().catch(async (err) => {
  console.error('TEST FAILED:', err);
  await pool.end();
  process.exit(1);
});
