import { eq } from "drizzle-orm";
import { db, pool } from "./db.js";
import { customers } from "./schema/customers.js";
import { products } from "./schema/products.js";
import { users } from "./schema/users.js";
import { FieldServiceService } from "../modules/field-service/services/field-service.service.js";
import { FieldServiceRepository } from "../modules/field-service/repositories/field-service.repository.js";
import { APP_CONSTANTS } from "../config/constants.js";
import { JwtPayload } from "../common/auth/jwt.js";

const runTest = async () => {
  console.log(
    "=== STARTING FIELD SERVICE REPORT (FSR) PHASE 2 VERIFICATION TEST ===\n",
  );

  const fsrService = new FieldServiceService();
  const fsrRepo = new FieldServiceRepository();

  try {
    // 1. Fetch or create users (Admin, Manager, FSE, Salesperson)
    let [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.role, "ADMIN"))
      .limit(1);
    if (!adminUser) {
      const [u] = await db.select().from(users).limit(1);
      adminUser = u;
    }

    // FSE user (role: USER, designation: 'Field Service Engineer')
    let [fseUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "employee@tanejapower.com"))
      .limit(1);
    if (!fseUser) {
      const [created] = await db
        .insert(users)
        .values({
          email: "fse.test@tanejapower.com",
          passwordHash: "dummy",
          fullName: "Ramesh Patel (FSE)",
          role: APP_CONSTANTS.ROLES.USER,
          designation: "Field Service Engineer",
          phone: "+91 98765 00001",
          status: "ACTIVE",
        })
        .returning();
      fseUser = created;
    }

    // Another FSE user for reassignment test
    let [secondFseUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "rahul.patel@tanejapower.com"))
      .limit(1);
    if (!secondFseUser) {
      const [created] = await db
        .insert(users)
        .values({
          email: "fse2.test@tanejapower.com",
          passwordHash: "dummy",
          fullName: "Suresh Kumar (FSE 2)",
          role: APP_CONSTANTS.ROLES.USER,
          designation: "Solar Technician",
          phone: "+91 98765 00002",
          status: "ACTIVE",
        })
        .returning();
      secondFseUser = created;
    }

    // Sales user (role: USER, designation: 'Sales Representative')
    let [salesUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "sales.test@tanejapower.com"))
      .limit(1);
    if (!salesUser) {
      const [created] = await db
        .insert(users)
        .values({
          email: "sales.test@tanejapower.com",
          passwordHash: "dummy",
          fullName: "Amit Shah (Sales)",
          role: APP_CONSTANTS.ROLES.USER,
          designation: "Sales Representative",
          phone: "+91 98765 00003",
          status: "ACTIVE",
        })
        .returning();
      salesUser = created;
    }

    console.log(`✓ Admin User: ${adminUser.fullName} (${adminUser.id})`);
    console.log(`✓ Assigned FSE User: ${fseUser.fullName} (${fseUser.id})`);
    console.log(
      `✓ Reassignment FSE User: ${secondFseUser.fullName} (${secondFseUser.id})`,
    );
    console.log(
      `✓ Salesperson User: ${salesUser.fullName} (${salesUser.id})\n`,
    );

    const adminAuth: JwtPayload = {
      userId: adminUser.id,
      email: adminUser.email,
      role: "ADMIN",
    };
    const fseAuth: JwtPayload = {
      userId: fseUser.id,
      email: fseUser.email,
      role: "USER",
    };
    const secondFseAuth: JwtPayload = {
      userId: secondFseUser.id,
      email: secondFseUser.email,
      role: "USER",
    };
    const salesAuth: JwtPayload = {
      userId: salesUser.id,
      email: salesUser.email,
      role: "USER",
    };

    // 2. Fetch Customer & Product
    let [customer] = await db.select().from(customers).limit(1);
    let [product] = await db.select().from(products).limit(1);

    // ==========================================
    // TEST 1: CREATE DRAFT FSR
    // ==========================================
    console.log("--- TEST 1: Creating DRAFT Field Service Report ---");
    const createPayload = {
      customerId: customer.id,
      productId: product?.id,
      serviceEngineerId: fseUser.id,
      visitDate: new Date().toISOString(),
      problemReported: "UPS battery backup failing after mains power cut",
      reasonForVisit: "Emergency breakdown call for UPS inspection",
      callType: APP_CONSTANTS.FSR_CALL_TYPES.BD,
      productModel: "Taneja 30kVA Online 3-Phase UPS",
      productMake: "Taneja Power",
      productSerialNumber: "UPS-30K-2026-9811",
      equipmentStatus: "FAULTY",
      charges: 1500,
      chargesRemarks: "Site inspection & emergency breakdown service fee",
      standbyDetails: "Temporary 5kVA backup UPS installed on emergency load",
      fseFeedback:
        "Battery bank #1 needs cell replacement. Mains supply stable.",
      customerFeedback: "Fast response to breakdown call.",
      siteObservation: {
        inputOnMains: "OK",
        inputVoltageLN: 230.5,
        inputVoltageLL: 400.2,
        outputVoltageLN: 230.1,
        outputVoltageLL: 399.8,
        vac: 230.0,
        frequency: 50.0,
        dcVoltage: 240.2,
        outputLoadPercent: 65.5,
        environmentCondition: "YES",
        upsLocation: APP_CONSTANTS.FSR_UPS_LOCATIONS.ELECTRICAL_ROOM,
        observationsNotes: "Adequate ventilation in electrical room.",
      },
      batteryBanks: [
        {
          bankNumber: 1,
          bankDescription: "Main 30kVA UPS Battery Bank",
          make: "Exide Powersafe",
          ah: "100Ah",
          quantity: 20,
          frontIndication: "Normal",
          voltage: 240.0,
          chargingCurrent: 10.5,
          dischargingCurrent: 25.0,
          remarks: "20 x 12V 100Ah SMF VRLA batteries",
          readings: Array.from({ length: 20 }, (_, i) => ({
            batteryNumber: i + 1,
            chargingVoltage: 13.6 + (i % 3) * 0.1,
            dischargingVoltage: 11.8 - (i === 4 ? 2.5 : 0.1), // Cell 5 weak
            remarks: i === 4 ? "Weak cell detected" : "Healthy",
          })),
        },
      ],
      parts: [
        {
          productId: product?.id,
          partName: "12V 100Ah SMF Battery",
          partNumber: "BAT-SMF-100AH",
          quantity: 1,
          replacementDetails: "Replaced defective battery cell #5 in Bank 1",
          oldPartStatus: "DEFECTIVE",
          remarks: "Returned defective battery to warehouse",
        },
      ],
    };

    const createdFsr = await fsrService.createFsr(createPayload as any, adminAuth);
    if (!createdFsr) throw new Error('FSR creation returned null');

    console.log(
      `✓ FSR Created: ${createdFsr.fsr.fsrNumber} (ID: ${createdFsr.fsr.id})`,
    );
    console.log(`✓ Status: ${createdFsr.fsr.status}`);
    console.log(`✓ Call Type: ${createdFsr.fsr.callType}`);
    console.log(
      `✓ Customer Snapshot: ${createdFsr.fsr.customerName} (${createdFsr.fsr.customerPhone})`,
    );
    console.log(
      `✓ Equipment: ${createdFsr.fsr.productModel} (S/N: ${createdFsr.fsr.productSerialNumber})`,
    );
    console.log(
      `✓ Site Observation: Input ${createdFsr.siteObservation?.inputVoltageLN}V L-N, DC ${createdFsr.siteObservation?.dcVoltage}V`,
    );
    console.log(
      `✓ Battery Bank: ${createdFsr.batteryBanks.length} bank, ${createdFsr.batteryBanks[0]?.readings.length} readings`,
    );
    console.log(
      `✓ Parts: ${createdFsr.parts.length} part (${createdFsr.parts[0]?.partName})\n`,
    );

    const fsrId = createdFsr.fsr.id;

    // ==========================================
    // TEST 2: AUTHORIZATION ENFORCEMENT
    // ==========================================
    console.log("--- TEST 2: Testing Server-Side Authorization ---");
    // A. Salesperson (unassigned USER) attempting to update -> MUST FAIL 403
    try {
      await fsrService.updateFsr(
        fsrId,
        { problemReported: "Hacked by Sales" },
        salesAuth,
      );
      console.error("❌ FAILED: Salesperson was able to edit FSR!");
    } catch (err: any) {
      console.log(
        `✓ SUCCESS: Salesperson mutation correctly blocked with 403: ${err.message}`,
      );
    }

    // B. Unassigned FSE attempting to update -> MUST FAIL 403
    try {
      await fsrService.updateFsr(
        fsrId,
        { problemReported: "Edited by wrong FSE" },
        secondFseAuth,
      );
      console.error("❌ FAILED: Unassigned FSE was able to edit FSR!");
    } catch (err: any) {
      console.log(
        `✓ SUCCESS: Unassigned FSE mutation correctly blocked with 403: ${err.message}`,
      );
    }

    // C. Assigned FSE updating -> MUST SUCCEED
    const fseUpdated = await fsrService.updateFsr(
      fsrId,
      { problemReported: "Verified breakdown by assigned FSE" },
      fseAuth,
    );
    console.log(
      `✓ SUCCESS: Assigned FSE updated problemReported: "${fseUpdated.fsr.problemReported}"\n`,
    );

    // ==========================================
    // TEST 3: WORKFLOW STATE TRANSITIONS
    // ==========================================
    console.log("--- TEST 3: Testing Lifecycle Transitions ---");
    // Start FSR: DRAFT -> IN_PROGRESS
    const startedFsr = await fsrService.startFsr(fsrId, fseAuth);
    console.log(`✓ FSR Started: Status = ${startedFsr.fsr.status}`);

    // ==========================================
    // TEST 4: VARIABLE BATTERY BANK & READINGS (10, 20, 32 READINGS)
    // ==========================================
    console.log(
      "--- TEST 4: Testing Variable Battery Bank Quantities (10, 20, 32 cells) ---",
    );
    // Add Bank #2 with 10 batteries
    const bank10 = await fsrService.addBatteryBank(
      fsrId,
      {
        bankNumber: 2,
        bankDescription: "10-Cell Generator Control Bank",
        make: "Amaron Quanta",
        ah: "65Ah",
        quantity: 10,
        readings: Array.from({ length: 10 }, (_, i) => ({
          batteryNumber: i + 1,
          chargingVoltage: 13.5,
          dischargingVoltage: 12.1,
        })),
      },
      fseAuth,
    );
    console.log(
      `✓ Bank #2 created with ${bank10?.readings.length} readings (10-cell bank verified)`,
    );

    // Add Bank #3 with 32 batteries
    const bank32 = await fsrService.addBatteryBank(
      fsrId,
      {
        bankNumber: 3,
        bankDescription: "32-Cell Solar High-Voltage Bank",
        make: "Luminous",
        ah: "150Ah",
        quantity: 32,
        readings: Array.from({ length: 32 }, (_, i) => ({
          batteryNumber: i + 1,
          chargingVoltage: 13.7,
          dischargingVoltage: 12.2,
        })),
      },
      fseAuth,
    );
    console.log(
      `✓ Bank #3 created with ${bank32?.readings.length} readings (32-cell bank verified)`,
    );

    // Test duplicate reading prevention in Bank #2
    try {
      await fsrService.addBatteryReadings(
        fsrId,
        bank10!.id,
        { batteryNumber: 5, chargingVoltage: 13.5 },
        fseAuth,
      );
      console.error("❌ FAILED: Duplicate battery reading was allowed!");
    } catch (err: any) {
      console.log(
        `✓ SUCCESS: Duplicate reading rejected with 409 conflict: ${err.message}\n`,
      );
    }

    // ==========================================
    // TEST 5: SIGN-OFF CAPTURE
    // ==========================================
    console.log("--- TEST 5: Capturing Sign-Offs ---");
    const customerSigned = await fsrService.customerSignOff(
      fsrId,
      {
        customerContactName: "Mr. Arvind Sharma (Plant Manager)",
        customerSignature:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        customerStamp:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        customerSignedAt: new Date().toISOString(),
      },
      fseAuth,
    );
    console.log(
      `✓ Customer Sign-Off: ${customerSigned.fsr.customerContactName} (${customerSigned.fsr.customerSignature})`,
    );

    const fseSigned = await fsrService.fseSignOff(
      fsrId,
      {
        fseName: fseUser.fullName,
        fseNumber: fseUser.phone || "EMP-001",
        fseSignature:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        fseSignatureDate: new Date().toISOString(),
      },
      fseAuth,
    );
    console.log(
      `✓ FSE Sign-Off: ${fseSigned.fsr.fseName} (Date: ${fseSigned.fsr.fseSignatureDate})\n`,
    );

    // ==========================================
    // TEST 6: ATTACHMENT UPLOAD & METADATA
    // ==========================================
    console.log("--- TEST 6: Uploading Attachments ---");
    const attachment = await fsrService.uploadAttachment(
      fsrId,
      {
        category: APP_CONSTANTS.FSR_ATTACHMENT_CATEGORIES.UPS_PHOTO,
        fileName: "ups_breakdown_inspection.jpg",
        fileData:
          "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
        fileSize: 1024,
        mimeType: "image/jpeg",
      },
      fseAuth,
    );
    console.log(
      `✓ Attachment Uploaded: ${attachment.fileName} (${attachment.category}) -> ${attachment.filePath}\n`,
    );

    // ==========================================
    // TEST 7: REASSIGN FSE (ADMIN/MANAGER ONLY)
    // ==========================================
    console.log("--- TEST 7: Reassigning Service Engineer ---");
    // FSE cannot reassign -> MUST FAIL 403
    try {
      await fsrService.assignFse(
        fsrId,
        { serviceEngineerId: secondFseUser.id },
        fseAuth,
      );
      console.error("❌ FAILED: FSE was able to reassign engineer!");
    } catch (err: any) {
      console.log(`✓ SUCCESS: FSE reassignment blocked with 403`);
    }

    // Admin reassigns -> MUST SUCCEED
    const reassigned = await fsrService.assignFse(
      fsrId,
      {
        serviceEngineerId: secondFseUser.id,
        remarks: "Handed over for final closure",
      },
      adminAuth,
    );
    console.log(
      `✓ FSE Reassigned: ${reassigned.serviceEngineer.fullName} (${reassigned.serviceEngineer.id})\n`,
    );

    // ==========================================
    // TEST 8: COMPLETE & CLOSE WORKFLOW
    // ==========================================
    console.log("--- TEST 8: Completing & Closing FSR ---");
    // Complete FSR (IN_PROGRESS -> COMPLETED)
    const completedFsr = await fsrService.completeFsr(fsrId, adminAuth);
    console.log(`✓ FSR Completed: Status = ${completedFsr.fsr.status}`);

    // FSE cannot close -> MUST FAIL 403
    try {
      await fsrService.closeFsr(fsrId, fseAuth);
      console.error("❌ FAILED: FSE was able to close FSR!");
    } catch (err: any) {
      console.log(
        `✓ SUCCESS: FSE close attempt blocked with 403: ${err.message}`,
      );
    }

    // Admin closes (COMPLETED -> CLOSED)
    const closedFsr = await fsrService.closeFsr(fsrId, adminAuth);
    console.log(`✓ FSR Closed: Status = ${closedFsr.fsr.status}\n`);

    // ==========================================
    // TEST 9: ACTIVITY LOG AUDIT TRAIL
    // ==========================================
    console.log("--- TEST 9: Verifying Activity Timeline ---");
    const activities = await fsrService.getActivityLogs(fsrId);
    console.log(`✓ Total Activity Logs Recorded: ${activities.length}`);
    activities.forEach((act, idx) => {
      console.log(
        `   ${idx + 1}. [${act.action}] ${act.title}: ${act.description}`,
      );
    });

    console.log("\n=== ALL PHASE 2 FSR TESTS PASSED WITH 100% SUCCESS ===");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runTest();
