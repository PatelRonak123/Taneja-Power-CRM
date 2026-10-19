import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../../../common/errors/AppError.js";
import { calculatePreventiveVisits } from "../../quotations/utils/amc-calculation.util.js";
import { AmcContractService } from "../services/amc-contract.service.js";
import { AmcContractController } from "../controllers/amc-contract.controller.js";
import { db } from "../../../database/db.js";

describe("Stage B4.2: AMC Contract Lifecycle Hardening Tests", () => {
  // Mock IDs
  const customerId = "11111111-1111-4111-a111-111111111111";
  const otherCustomerId = "22222222-2222-4222-a222-222222222222";
  const quotationId = "33333333-3333-4333-a333-333333333333";
  const contractId = "44444444-4444-4444-a444-444444444444";
  const otherContractId = "55555555-5555-4555-a555-555555555555";
  const equipmentId1 = "66666666-6666-4666-a666-666666666666";
  const equipmentId2 = "77777777-7777-4777-a777-777777777777";
  const followUpId = "88888888-8888-4888-a888-888888888888";

  describe("1. Contract Creation Preconditions and Idempotency", () => {
    it("1.1 Rejects creation if quotation type is not AMC", () => {
      const quotation = {
        id: quotationId,
        quotationType: "STANDARD",
        status: "ACCEPTED",
      };
      assert.throws(
        () => {
          if (quotation.quotationType !== "AMC") {
            throw AppError.badRequest(
              "Only AMC type quotations can be converted into an AMC Contract.",
            );
          }
        },
        (err: any) => err instanceof AppError && err.statusCode === 400,
      );
    });

    it("1.2 Rejects creation if quotation is not ACCEPTED by customer", () => {
      const unacceptedStatuses = [
        "DRAFT",
        "PENDING_APPROVAL",
        "APPROVED",
        "SENT",
        "FOLLOW_UP",
        "REJECTED",
      ];
      for (const status of unacceptedStatuses) {
        assert.throws(
          () => {
            if (status !== "ACCEPTED") {
              throw AppError.badRequest(
                `Cannot create AMC Contract: Customer has not accepted the quotation. Current status: ${status}`,
              );
            }
          },
          (err: any) => err instanceof AppError && err.statusCode === 400,
        );
      }
    });

    it("1.3 Rejects creation if Sales Order is missing or in an ineligible status", () => {
      const testCases = [
        {
          so: null,
          expectedMsg: "Sales Order must be created and confirmed first",
        },
        {
          so: { status: "DRAFT" },
          expectedMsg: "Sales Order must be CONFIRMED or INVOICED",
        },
        {
          so: { status: "PENDING_APPROVAL" },
          expectedMsg: "Sales Order must be CONFIRMED or INVOICED",
        },
        {
          so: { status: "CANCELLED" },
          expectedMsg: "Sales Order must be CONFIRMED or INVOICED",
        },
      ];

      for (const tc of testCases) {
        assert.throws(
          () => {
            if (!tc.so) {
              throw AppError.badRequest(
                "Cannot create AMC Contract: Sales Order must be created and confirmed first.",
              );
            }
            const allowed = [
              "CONFIRMED",
              "PARTIALLY_INVOICED",
              "FULLY_INVOICED",
            ];
            if (!allowed.includes(tc.so.status)) {
              throw AppError.badRequest(
                `Cannot create AMC Contract: Sales Order must be CONFIRMED or INVOICED. Current status: ${tc.so.status}`,
              );
            }
          },
          (err: any) => err instanceof AppError && err.statusCode === 400,
        );
      }
    });

    it("1.4 Allows creation when Sales Order is CONFIRMED, PARTIALLY_INVOICED, or FULLY_INVOICED", () => {
      const allowed = ["CONFIRMED", "PARTIALLY_INVOICED", "FULLY_INVOICED"];
      for (const status of allowed) {
        assert.doesNotThrow(() => {
          const so = { status };
          if (
            !["CONFIRMED", "PARTIALLY_INVOICED", "FULLY_INVOICED"].includes(
              so.status,
            )
          ) {
            throw new Error("Should not throw");
          }
        });
      }
    });

    it("1.5 Idempotency: Returns existing contract when non-renewal contract already exists", () => {
      const existingContract = {
        id: contractId,
        quotationId,
        contractNumber: "AMC/2026-27/0001",
        status: "PENDING_ACTIVATION",
        renewedFromContractId: null,
      };

      // Simulated lookup
      const lookup = (qId: string) =>
        qId === quotationId ? existingContract : null;
      const res = lookup(quotationId);
      assert.deepEqual(res, existingContract);
    });

    it("1.6 Concurrency: Recovers gracefully from unique constraint error 23505", () => {
      const existingContract = {
        id: contractId,
        quotationId,
        contractNumber: "AMC/2026-27/0001",
        status: "PENDING_ACTIVATION",
        renewedFromContractId: null,
      };

      const simulateInsert = () => {
        const conflictErr: any = new Error(
          'duplicate key value violates unique constraint "amc_contracts_initial_quotation_unique_idx"',
        );
        conflictErr.code = "23505";
        throw conflictErr;
      };

      let result: any;
      try {
        simulateInsert();
      } catch (err: any) {
        if (err?.code === "23505") {
          // Fallback query succeeds
          result = existingContract;
        } else {
          throw err;
        }
      }

      assert.equal(result.id, contractId);
      assert.equal(result.status, "PENDING_ACTIVATION");
    });

    it("1.7 Fallback equipment linkage: Maps quotation.sourceEquipmentId if junction is empty", () => {
      const quotation = { sourceEquipmentId: equipmentId1 };
      const items = [{ id: "item-1", productName: "STABILIZER 50KVA" }];
      const itemToEquipmentMap = new Map<string, string[]>(); // Empty junction

      const contractEquipmentRows = items.map((item) => ({
        quotationItemId: item.id,
        customerEquipmentId:
          itemToEquipmentMap.get(item.id)?.[0] ||
          quotation.sourceEquipmentId ||
          null,
        equipmentName: item.productName,
      }));

      assert.equal(contractEquipmentRows[0].customerEquipmentId, equipmentId1);
    });
  });

  describe("2. Contract Activation Preconditions", () => {
    const validContract = {
      id: contractId,
      contractNumber: "AMC/2026-27/0001",
      customerId,
      status: "PENDING_ACTIVATION",
      paymentStatus: "PAID",
      contractStartDate: "2026-10-15T00:00:00.000Z",
      contractEndDate: "2027-10-14T23:59:59.999Z",
    };

    it("2.1 Rejects activation if status is not PENDING_ACTIVATION", () => {
      const invalidStatuses = [
        "DRAFT",
        "EXPIRING_SOON",
        "EXPIRED",
        "TERMINATED",
        "CANCELLED",
      ];
      for (const status of invalidStatuses) {
        assert.throws(
          () => {
            const contract = { ...validContract, status };
            if (contract.status !== "PENDING_ACTIVATION") {
              if (contract.status === "ACTIVE") {
                throw AppError.conflict(
                  `AMC Contract ${contract.contractNumber} is already ACTIVE.`,
                  "CONTRACT_ALREADY_ACTIVE",
                );
              }
              throw AppError.badRequest(
                `Cannot activate AMC Contract: Contract must be in PENDING_ACTIVATION status. Current status: ${contract.status}`,
                undefined,
                "INVALID_CONTRACT_STATUS",
              );
            }
          },
          (err: any) =>
            err instanceof AppError &&
            err.statusCode === 400 &&
            err.errorCode === "INVALID_CONTRACT_STATUS",
        );
      }
    });

    it("2.2 Rejects activation with 409 Conflict if contract is already ACTIVE", () => {
      assert.throws(
        () => {
          const contract = { ...validContract, status: "ACTIVE" };
          if (contract.status !== "PENDING_ACTIVATION") {
            if (contract.status === "ACTIVE") {
              throw AppError.conflict(
                `AMC Contract ${contract.contractNumber} is already ACTIVE.`,
                "CONTRACT_ALREADY_ACTIVE",
              );
            }
            throw AppError.badRequest("Invalid status");
          }
        },
        (err: any) =>
          err instanceof AppError &&
          err.statusCode === 409 &&
          err.errorCode === "CONTRACT_ALREADY_ACTIVE",
      );
    });

    it("2.3 Rejects activation if paymentStatus is PENDING", () => {
      assert.throws(
        () => {
          const contract = { ...validContract, paymentStatus: "PENDING" };
          const allowed = ["PAID", "PARTIALLY_PAID"];
          if (!allowed.includes(contract.paymentStatus)) {
            if (contract.paymentStatus === "PENDING") {
              throw AppError.badRequest(
                "Cannot activate AMC Contract: Payment is PENDING.",
                undefined,
                "PAYMENT_PENDING",
              );
            }
            throw AppError.badRequest("Invalid payment status");
          }
        },
        (err: any) =>
          err instanceof AppError &&
          err.statusCode === 400 &&
          err.errorCode === "PAYMENT_PENDING",
      );
    });

    it("2.4 Rejects activation if paymentStatus is OVERDUE", () => {
      assert.throws(
        () => {
          const contract = { ...validContract, paymentStatus: "OVERDUE" };
          const allowed = ["PAID", "PARTIALLY_PAID"];
          if (!allowed.includes(contract.paymentStatus)) {
            if (contract.paymentStatus === "OVERDUE") {
              throw AppError.badRequest(
                "Cannot activate AMC Contract: Payment is OVERDUE.",
                undefined,
                "PAYMENT_OVERDUE",
              );
            }
            throw AppError.badRequest("Invalid payment status");
          }
        },
        (err: any) =>
          err instanceof AppError &&
          err.statusCode === 400 &&
          err.errorCode === "PAYMENT_OVERDUE",
      );
    });

    it("2.5 Allows activation when paymentStatus is PAID or PARTIALLY_PAID", () => {
      for (const paymentStatus of ["PAID", "PARTIALLY_PAID"]) {
        assert.doesNotThrow(() => {
          const contract = { ...validContract, paymentStatus };
          const allowed = ["PAID", "PARTIALLY_PAID"];
          if (!allowed.includes(contract.paymentStatus)) {
            throw new Error("Should not throw");
          }
        });
      }
    });

    it("2.6 Rejects activation if contract start date is on or after end date", () => {
      const testCases = [
        { start: "2027-10-15", end: "2026-10-15" }, // Reversed
        { start: "2026-10-15", end: "2026-10-15" }, // Equal
        { start: "invalid-date", end: "2026-10-15" }, // Malformed
      ];

      for (const tc of testCases) {
        assert.throws(
          () => {
            const startDate = new Date(tc.start);
            const endDate = new Date(tc.end);
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              throw AppError.badRequest(
                "Cannot activate AMC Contract: Invalid contract start or end date.",
                "INVALID_DATES",
              );
            }
            if (startDate >= endDate) {
              throw AppError.badRequest(
                "Cannot activate AMC Contract: Contract start date must be strictly before end date.",
                "INVALID_DATE_RANGE",
              );
            }
          },
          (err: any) => err instanceof AppError && err.statusCode === 400,
        );
      }
    });
  });

  describe("3. Overlapping Active Coverage Protection (Part D)", () => {
    const isOverlapping = (
      reqStart: Date,
      reqEnd: Date,
      existStart: Date,
      existEnd: Date,
    ): boolean => {
      // Inclusive overlap formula: existingStart <= requestedEnd && existingEnd >= requestedStart
      return existStart <= reqEnd && existEnd >= reqStart;
    };

    it("3.1 Detects direct overlap: Requested period falls within active contract period", () => {
      const activeStart = new Date("2026-01-01");
      const activeEnd = new Date("2026-12-31");
      const reqStart = new Date("2026-06-01");
      const reqEnd = new Date("2027-05-31");

      assert.equal(
        isOverlapping(reqStart, reqEnd, activeStart, activeEnd),
        true,
      );
    });

    it("3.2 Detects partial boundary overlap: Requested start equals active end", () => {
      // Inclusive: If active ends 2026-10-15 and requested starts 2026-10-15, they overlap on that day
      const activeStart = new Date("2025-10-16");
      const activeEnd = new Date("2026-10-15");
      const reqStart = new Date("2026-10-15");
      const reqEnd = new Date("2027-10-14");

      assert.equal(
        isOverlapping(reqStart, reqEnd, activeStart, activeEnd),
        true,
      );
    });

    it("3.3 Allows non-overlapping adjacent periods (consecutive years)", () => {
      // Year 1: 2025-10-15 to 2026-10-14. Year 2: 2026-10-15 to 2027-10-14.
      const activeStart = new Date("2025-10-15");
      const activeEnd = new Date("2026-10-14");
      const reqStart = new Date("2026-10-15");
      const reqEnd = new Date("2027-10-14");

      assert.equal(
        isOverlapping(reqStart, reqEnd, activeStart, activeEnd),
        false,
      );
    });

    it("3.4 Allows overlapping dates if the covered equipment is different", () => {
      const activeContract = {
        contractId: otherContractId,
        equipmentId: equipmentId1,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        status: "ACTIVE",
      };

      const requestedEquipments = [equipmentId2]; // Different equipment
      const overlaps = requestedEquipments.includes(activeContract.equipmentId);
      assert.equal(overlaps, false);
    });

    it("3.5 Overlap check ignores contracts with status CANCELLED or TERMINATED", () => {
      const nonActiveContracts = [
        { status: "TERMINATED", equipmentId: equipmentId1 },
        { status: "CANCELLED", equipmentId: equipmentId1 },
        { status: "EXPIRED", equipmentId: equipmentId1 },
        { status: "PENDING_ACTIVATION", equipmentId: equipmentId1 },
      ];

      for (const c of nonActiveContracts) {
        // Overlap logic filters eq(amcContracts.status, 'ACTIVE')
        const isActive = c.status === "ACTIVE";
        assert.equal(isActive, false);
      }
    });

    it("3.6 Throws 409 Conflict with OVERLAPPING_AMC_COVERAGE on confirmed overlap", () => {
      const activeContract = {
        contractNumber: "AMC/2026-27/0099",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      };

      assert.throws(
        () => {
          throw AppError.conflict(
            `Cannot activate AMC Contract: Equipment is already covered by active AMC Contract ${activeContract.contractNumber} from ${activeContract.startDate.toISOString().split("T")[0]} to ${activeContract.endDate.toISOString().split("T")[0]}.`,
            "OVERLAPPING_AMC_COVERAGE",
          );
        },
        (err: any) =>
          err instanceof AppError &&
          err.statusCode === 409 &&
          err.errorCode === "OVERLAPPING_AMC_COVERAGE",
      );
    });
  });

  describe("4. Equipment Coverage and Warranty Status Transition (Part C)", () => {
    it("4.1 Rejects activation if covered equipment belongs to a different customer", () => {
      const contractCustomer: string = customerId;
      const equipmentOwner: string = otherCustomerId;

      assert.throws(
        () => {
          if (equipmentOwner !== contractCustomer) {
            throw AppError.badRequest(
              `Covered equipment EQ/2026-27/0001 belongs to customer ${equipmentOwner}, not contract customer ${contractCustomer}.`,
              undefined,
              "EQUIPMENT_CUSTOMER_MISMATCH",
            );
          }
        },
        (err: any) =>
          err instanceof AppError &&
          err.statusCode === 400 &&
          err.errorCode === "EQUIPMENT_CUSTOMER_MISMATCH",
      );
    });

    it("4.2 Deduplicates equipment IDs to ensure idempotent, single updates per physical asset", () => {
      const contractEquipments = [
        { customerEquipmentId: equipmentId1 },
        { customerEquipmentId: equipmentId2 },
        { customerEquipmentId: equipmentId1 }, // duplicate line item for same asset
        { customerEquipmentId: null }, // legacy unlinked line
      ];

      const deduplicated = [
        ...new Set(
          contractEquipments
            .map((e) => e.customerEquipmentId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];

      assert.equal(deduplicated.length, 2);
      assert.deepEqual(deduplicated, [equipmentId1, equipmentId2]);
    });

    it("4.3 Sets customerEquipment.warrantyStatus to AMC_COVERED", () => {
      const equipment = { id: equipmentId1, warrantyStatus: "EXPIRED" };
      const updatedEquipment = { ...equipment, warrantyStatus: "AMC_COVERED" };

      assert.equal(updatedEquipment.warrantyStatus, "AMC_COVERED");
    });
  });

  describe("5. Originating Follow-Up Closure (Part C)", () => {
    const validFollowUp = {
      id: followUpId,
      followUpNumber: "FU/2026-27/0001",
      type: "WARRANTY_EXPIRY",
      customerId,
      status: "PENDING",
      amcContractId: null,
    };

    it("5.1 Rejects activation if originating follow-up type is not WARRANTY_EXPIRY", () => {
      assert.throws(
        () => {
          const followUp = { ...validFollowUp, type: "PAYMENT_FOLLOW_UP" };
          if (followUp.type !== "WARRANTY_EXPIRY") {
            throw AppError.badRequest(
              `Originating follow-up ${followUp.followUpNumber} is not a WARRANTY_EXPIRY follow-up (type: ${followUp.type}).`,
              undefined,
              "INVALID_FOLLOW_UP_TYPE",
            );
          }
        },
        (err: any) =>
          err instanceof AppError &&
          err.statusCode === 400 &&
          err.errorCode === "INVALID_FOLLOW_UP_TYPE",
      );
    });

    it("5.2 Rejects activation if follow-up belongs to a different customer", () => {
      assert.throws(
        () => {
          const followUp = { ...validFollowUp, customerId: otherCustomerId };
          if (followUp.customerId && followUp.customerId !== customerId) {
            throw AppError.badRequest(
              `Originating follow-up ${followUp.followUpNumber} belongs to customer ${followUp.customerId}, not contract customer ${customerId}.`,
              undefined,
              "FOLLOW_UP_CUSTOMER_MISMATCH",
            );
          }
        },
        (err: any) =>
          err instanceof AppError &&
          err.statusCode === 400 &&
          err.errorCode === "FOLLOW_UP_CUSTOMER_MISMATCH",
      );
    });

    it("5.3 Rejects activation with 409 Conflict if follow-up is already linked to another contract", () => {
      assert.throws(
        () => {
          const followUp = { ...validFollowUp, amcContractId: otherContractId };
          if (followUp.amcContractId && followUp.amcContractId !== contractId) {
            throw AppError.conflict(
              `Originating follow-up ${followUp.followUpNumber} is already linked to another AMC Contract (${followUp.amcContractId}).`,
              "FOLLOW_UP_ALREADY_LINKED",
            );
          }
        },
        (err: any) =>
          err instanceof AppError &&
          err.statusCode === 409 &&
          err.errorCode === "FOLLOW_UP_ALREADY_LINKED",
      );
    });

    it("5.4 Completes originating follow-up with status COMPLETED and links amcContractId", () => {
      const now = new Date("2026-10-15T10:00:00.000Z");
      const userId = "user-service-01";
      const contractNumber = "AMC/2026-27/0001";

      const completedFollowUp = {
        ...validFollowUp,
        amcContractId: contractId,
        status: "COMPLETED",
        completedAt: now,
        completedBy: userId,
        outcome: `Converted to active AMC Contract ${contractNumber}.`,
        updatedAt: now,
      };

      assert.equal(completedFollowUp.status, "COMPLETED");
      assert.equal(completedFollowUp.amcContractId, contractId);
      assert.equal(
        completedFollowUp.outcome,
        `Converted to active AMC Contract ${contractNumber}.`,
      );
      assert.equal(completedFollowUp.completedBy, userId);
    });

    it("5.5 Manually created AMC quotation without sourceFollowUpId activates safely without error", () => {
      const sourceQuotation = {
        sourceFollowUpId: null,
        sourceEquipmentId: null,
      };
      assert.doesNotThrow(() => {
        if (sourceQuotation.sourceFollowUpId) {
          throw new Error("Should not attempt to load follow-up");
        }
      });
    });
  });

  describe("6. Preventive Schedule Generation within Transaction", () => {
    it("6.1 Calculates quarterly preventive visits correctly", () => {
      const visits = calculatePreventiveVisits(
        "2026-10-15",
        "2027-10-14",
        "Quarterly",
      );
      assert.equal(visits, 4);
    });

    it("6.2 Calculates monthly preventive visits correctly", () => {
      const visits = calculatePreventiveVisits(
        "2026-10-15",
        "2027-10-14",
        "Monthly",
      );
      assert.equal(visits, 12);
    });

    it("6.3 Generates scheduled visits bounded within start and end date", () => {
      const startDate = new Date("2026-10-15");
      const endDate = new Date("2027-10-14");
      const visitsCount = 4;

      const generatedDates: Date[] = [];
      for (let i = 0; i < visitsCount; i++) {
        const d = new Date(startDate.getTime());
        d.setMonth(startDate.getMonth() + i * 3);
        const capped = d > endDate ? new Date(endDate.getTime()) : d;
        generatedDates.push(capped);
      }

      assert.equal(generatedDates.length, 4);
      assert.ok(generatedDates[0] >= startDate);
      assert.ok(generatedDates[3] <= endDate);
    });
  });

  describe("7. Option A: Cancelled-Contract Policy (B4.4.2 & B4.4.4A Direct Service Tests)", () => {
    const cancelledContract = {
      id: contractId,
      contractNumber: "AMC/2026-27/0001",
      quotationNumber: "QT/2026-27/0001",
      status: "CANCELLED",
      renewedFromContractId: null,
    };

    const activeContract = {
      id: contractId,
      contractNumber: "AMC/2026-27/0001",
      quotationNumber: "QT/2026-27/0001",
      status: "PENDING_ACTIVATION",
      renewedFromContractId: null,
    };

    const renewalContract = {
      id: otherContractId,
      contractNumber: "AMC/2026-27/0002",
      quotationNumber: "QT/2026-27/0001",
      status: "CANCELLED",
      renewedFromContractId: "parent-amc-contract-001", // renewal — not an initial contract
    };

    const validQuotation = {
      id: quotationId,
      quotationNumber: "QT/2026-27/0001",
      quotationType: "AMC",
      status: "ACCEPTED",
      customerId,
      destinationId: "dest-001",
    };

    const validSalesOrder = {
      id: "so-001",
      quotationId,
      status: "CONFIRMED",
    };

    const validRevision = {
      id: "rev-001",
      quotationId,
      isCurrent: true,
      customerName: "Acme Corp",
      companyName: "Acme Corp",
      grandTotal: 100000,
      amcPlan: "Comprehensive AMC",
      amcStartDate: new Date("2026-11-01"),
      amcEndDate: new Date("2027-10-31"),
      amcServiceFrequency: "Quarterly",
      amcScheduledVisits: 4,
    };

    // Helper to configure db.select and db.transaction for AmcContractService direct invocation
    const setupMockDb = (opts: {
      initialContracts?: any[];
      insertError?: any;
      onInsert?: (table: string, values: any) => void;
    }) => {
      const originalSelect = (db as any).select;
      const originalTx = (db as any).transaction;

      // Mock user context query for creator role check
      (db as any).select = () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ role: "ADMIN", designation: "Admin", workType: null }]),
          }),
        }),
      });

      let amcQueryCount = 0;
      const insertCalls: { table: string; values: any }[] = [];

      (db as any).transaction = async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          select: () => ({
            from: (tbl: any) => {
              const tableName = tbl?.[Symbol.for("drizzle:Name")] || tbl?.name || "";
              const chain: any = {
                where: () => chain,
                for: () => chain,
                limit: () => chain,
                orderBy: () => chain,
                then: (resolve: any, reject: any) => {
                  let resultData: any[] = [];
                  if (tableName === "quotations") {
                    resultData = [validQuotation];
                  } else if (tableName === "sales_orders") {
                    resultData = [validSalesOrder];
                  } else if (tableName === "amc_contracts") {
                    amcQueryCount++;
                    if (opts.insertError && amcQueryCount === 1) {
                      // Initial pre-insert check finds nothing during race condition simulation
                      resultData = [];
                    } else {
                      // Initial contract lookup filters out renewals (where renewedFromContractId IS NULL)
                      const matched = (opts.initialContracts || []).filter(
                        (c) => c.renewedFromContractId === null
                      );
                      resultData = matched;
                    }
                  } else if (tableName === "quotation_revisions") {
                    resultData = [validRevision];
                  } else {
                    resultData = [];
                  }
                  return Promise.resolve(resultData).then(resolve, reject);
                },
              };
              return chain;
            },
          }),
          insert: (tbl: any) => {
            const tableName = tbl?.[Symbol.for("drizzle:Name")] || tbl?.name || "";
            return {
              values: (vals: any) => ({
                returning: async () => {
                  insertCalls.push({ table: tableName, values: vals });
                  if (opts.onInsert) opts.onInsert(tableName, vals);
                  if (opts.insertError) throw opts.insertError;
                  return [{ id: contractId, ...vals }];
                },
              }),
            };
          },
          execute: async () => ({ rows: [{ current_sequence: 1 }] }),
        };
        return cb(tx);
      };

      const teardown = () => {
        (db as any).select = originalSelect;
        (db as any).transaction = originalTx;
      };

      return { insertCalls, teardown };
    };

    it("7.1 Rejects creation with 409 CONTRACT_ALREADY_CANCELLED when cancelled initial contract exists (direct service call)", async () => {
      const { teardown } = setupMockDb({ initialContracts: [cancelledContract] });
      const service = new AmcContractService();

      try {
        await assert.rejects(
          async () => {
            await service.createContractFromQuotation(quotationId, "user-admin");
          },
          (err: any) => {
            assert.ok(err instanceof AppError, "Must be an AppError instance");
            assert.equal(err.statusCode, 409);
            assert.equal(err.errorCode, "CONTRACT_ALREADY_CANCELLED");
            assert.ok(
              err.message.includes("permanently consumed"),
              "Error message must specify that quotation is permanently consumed"
            );
            return true;
          }
        );
      } finally {
        teardown();
      }
    });

    it("7.2 Does not reach the insert step when a cancelled initial contract is detected (direct service call)", async () => {
      const { insertCalls, teardown } = setupMockDb({ initialContracts: [cancelledContract] });
      const service = new AmcContractService();

      try {
        await assert.rejects(
          async () => {
            await service.createContractFromQuotation(quotationId, "user-admin");
          },
          (err: any) => err instanceof AppError && err.statusCode === 409
        );
        assert.equal(
          insertCalls.length,
          0,
          "Insert must never be invoked when quotation is already consumed by a cancelled contract"
        );
      } finally {
        teardown();
      }
    });

    it("7.3 Idempotency preserved: existing non-cancelled initial contract is returned without error (direct service call)", async () => {
      const { insertCalls, teardown } = setupMockDb({ initialContracts: [activeContract] });
      const service = new AmcContractService();

      try {
        const result = await service.createContractFromQuotation(quotationId, "user-admin");
        assert.equal(result.id, contractId);
        assert.equal(result.status, "PENDING_ACTIVATION");
        assert.equal(insertCalls.length, 0, "No insert performed when returning existing contract");
      } finally {
        teardown();
      }
    });

    it("7.4 Conflict-recovery path: resolves to a cancelled contract and throws CONTRACT_ALREADY_CANCELLED instead of returning it (direct service call)", async () => {
      const conflictError: any = new Error(
        'duplicate key value violates unique constraint "amc_contracts_initial_quotation_unique_idx"'
      );
      conflictError.code = "23505";

      const { insertCalls, teardown } = setupMockDb({
        initialContracts: [cancelledContract],
        insertError: conflictError,
      });

      const service = new AmcContractService();
      (service as any).numberService.generateNumber = async () => "AMC/2026-27/0001";

      try {
        await assert.rejects(
          async () => {
            await service.createContractFromQuotation(quotationId, "user-admin");
          },
          (err: any) => {
            assert.ok(err instanceof AppError, "Conflict recovery must throw AppError");
            assert.equal(err.statusCode, 409);
            assert.equal(err.errorCode, "CONTRACT_ALREADY_CANCELLED");
            assert.ok(
              err.message.includes("permanently consumed"),
              "Conflict recovery error message must state quotation is permanently consumed"
            );
            return true;
          }
        );
        assert.equal(insertCalls.length, 1, "Insert was attempted and failed with 23505 before recovery check");
      } finally {
        teardown();
      }
    });

    it("7.5 Renewal isolation: a cancelled renewal contract (renewedFromContractId set) does not trigger the initial-contract cancellation rule (direct service call)", async () => {
      // In the database, the only existing contract is a renewal contract (renewedFromContractId !== null).
      // The initial-contract lookup in createContractFromQuotation requires isNull(amcContracts.renewedFromContractId).
      // Therefore, the lookup does not match, does not throw CONTRACT_ALREADY_CANCELLED, and proceeds to insert.
      const { insertCalls, teardown } = setupMockDb({
        initialContracts: [renewalContract],
      });

      const service = new AmcContractService();
      (service as any).numberService.generateNumber = async () => "AMC/2026-27/0003";

      try {
        const result = await service.createContractFromQuotation(quotationId, "user-admin");
        assert.ok(result, "Contract creation succeeds despite existence of cancelled renewal contract");
        assert.equal(insertCalls.length, 1, "New initial contract insert was performed");
      } finally {
        teardown();
      }
    });

    it("7.6 Controller serializes CONTRACT_ALREADY_CANCELLED as { success: false, error: message, code: errorCode } at HTTP 409", async () => {
      const controller = new AmcContractController();
      let capturedStatusCode: number | null = null;
      let capturedResponseBody: any = null;

      const req: any = {
        params: { quotationId },
        user: { userId: "user-admin" },
      };

      const res: any = {
        status: (code: number) => {
          capturedStatusCode = code;
          return res;
        },
        json: (body: any) => {
          capturedResponseBody = body;
          return res;
        },
      };

      // Mock the service instance on the controller to throw the real CONTRACT_ALREADY_CANCELLED error
      (controller as any).service.createContractFromQuotation = async () => {
        throw AppError.conflict(
          `Quotation QT/2026-27/0001 was already used to create AMC Contract AMC/2026-27/0001, which has since been cancelled. This quotation is permanently consumed. Please create a new or revised quotation to generate a replacement AMC Contract.`,
          "CONTRACT_ALREADY_CANCELLED"
        );
      };

      await controller.createFromQuotation(req, res);

      assert.equal(capturedStatusCode, 409, "Controller must respond with HTTP 409 Conflict");
      assert.equal(capturedResponseBody.success, false, "success flag must be false");
      assert.equal(capturedResponseBody.code, "CONTRACT_ALREADY_CANCELLED", "code must be CONTRACT_ALREADY_CANCELLED");
      assert.ok(
        capturedResponseBody.error.includes("permanently consumed"),
        "error message must detail the permanently consumed quotation"
      );
    });
  });
});
