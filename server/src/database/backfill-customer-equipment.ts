import { sql } from 'drizzle-orm';
import { db, pool } from './db.js';
import { CustomerEquipmentNumberService } from '../modules/customer-equipment/services/customer-equipment-number.service.js';

interface DispatchedItemRow {
  dispatch_id: string;
  dispatch_number: string;
  dispatched_at: Date;
  customer_id: string;
  sales_order_id: string;
  sales_invoice_id: string | null;
  destination_id: string | null;
  dispatch_item_id: string;
  sales_order_item_id: string;
  sales_invoice_item_id: string | null;
  product_id: string;
  product_name_snapshot: string;
  sku_snapshot: string | null;
  hsn_sac_snapshot: string | null;
  dispatch_quantity: string;
  so_ordered_quantity: string;
}

export async function backfillCustomerEquipment(): Promise<{
  dispatchesProcessed: number;
  equipmentCreated: number;
  skippedAlreadyBackfilled: number;
}> {
  console.log('🚀 Starting safe, idempotent Customer Equipment backfill for existing DISPATCHED deliveries...');
  const numberService = new CustomerEquipmentNumberService();

  return await db.transaction(async (tx) => {
    // 1. Fetch all items belonging to confirmed DISPATCHED dispatches
    const itemsRes = await tx.execute(sql`
      SELECT 
        d.id as dispatch_id,
        d.dispatch_number,
        d.dispatched_at,
        d.customer_id,
        d.sales_order_id,
        d.sales_invoice_id,
        q.destination_id,
        di.id as dispatch_item_id,
        di.sales_order_item_id,
        di.sales_invoice_item_id,
        di.product_id,
        di.product_name_snapshot,
        di.sku_snapshot,
        di.hsn_sac_snapshot,
        di.dispatch_quantity,
        soi.quantity as so_ordered_quantity
      FROM dispatches d
      INNER JOIN dispatch_items di ON d.id = di.dispatch_id
      LEFT JOIN sales_orders so ON d.sales_order_id = so.id
      LEFT JOIN sales_order_items soi ON di.sales_order_item_id = soi.id
      LEFT JOIN quotations q ON so.quotation_id = q.id
      WHERE d.status = 'DISPATCHED'
      ORDER BY d.dispatched_at ASC, d.id ASC, di.id ASC
    `);

    const rows = ((itemsRes.rows || itemsRes) as unknown) as DispatchedItemRow[];
    console.log(`📦 Found ${rows.length} dispatch items from DISPATCHED deliveries.`);

    let equipmentCreated = 0;
    let skippedAlreadyBackfilled = 0;
    const processedDispatches = new Set<string>();

    for (const row of rows) {
      processedDispatches.add(row.dispatch_id);
      const qty = Math.round(Number(row.dispatch_quantity));
      if (qty <= 0) continue;

      // Check how many equipment records already exist for this delivery_item_id (idempotency check)
      const existingRes = await tx.execute(sql`
        SELECT COUNT(*)::int as count 
        FROM customer_equipment 
        WHERE delivery_item_id = ${row.dispatch_item_id}
      `);
      const existingCount = Number((existingRes.rows || existingRes)[0]?.count || 0);

      if (existingCount >= qty) {
        console.log(`⏩ Skipping dispatch item ${row.dispatch_item_id} (already has ${existingCount}/${qty} equipment records)`);
        skippedAlreadyBackfilled += existingCount;
        continue;
      }

      const neededCount = qty - existingCount;

      // Calculate next available unitIndex for this SO Item to preserve partial delivery numbering
      const unitIndexRes = await tx.execute(sql`
        SELECT COALESCE(MAX(unit_index), 0) as max_unit_index 
        FROM customer_equipment 
        WHERE sales_order_item_id = ${row.sales_order_item_id}
      `);
      const currentMaxUnitIndex = Number((unitIndexRes.rows || unitIndexRes)[0]?.max_unit_index || 0);
      const startUnitIndex = currentMaxUnitIndex + 1;

      // Verify we don't exceed ordered quantity
      const maxAllowed = Number(row.so_ordered_quantity || qty);
      if (startUnitIndex + neededCount - 1 > maxAllowed) {
        console.warn(
          `⚠️ Warning: Unit index (${startUnitIndex + neededCount - 1}) exceeds ordered quantity (${maxAllowed}) for SO Item ${row.sales_order_item_id}. Capping.`
        );
      }

      // Generate sequential asset numbers atomically
      const assetDate = row.dispatched_at ? new Date(row.dispatched_at) : new Date();
      const assetNumbers = await numberService.generateAssetNumbers(neededCount, assetDate, tx);

      const equipmentToInsert = [];
      for (let i = 0; i < neededCount; i++) {
        equipmentToInsert.push({
          assetNumber: assetNumbers[i],
          customerId: row.customer_id,
          productId: row.product_id,
          salesOrderId: row.sales_order_id,
          salesOrderItemId: row.sales_order_item_id,
          salesInvoiceId: row.sales_invoice_id || null,
          salesInvoiceItemId: row.sales_invoice_item_id || null,
          deliveryId: row.dispatch_id,
          deliveryItemId: row.dispatch_item_id,
          unitIndex: startUnitIndex + i,
          serialNumber: null,
          productName: row.product_name_snapshot,
          sku: row.sku_snapshot || null,
          model: null,
          make: null,
          capacityRating: null,
          hsnSac: row.hsn_sac_snapshot || null,
          destinationId: row.destination_id || null,
          installationLocation: null,
          installationNotes: null,
          installationDate: null,
          deliveryDate: assetDate,
          warrantyStartDate: null,
          warrantyEndDate: null,
          warrantyTermsSnapshot: null,
          conditionStatus: 'OPERATIONAL',
          assetStatus: 'ACTIVE',
        });
      }

      if (equipmentToInsert.length > 0) {
        for (const eq of equipmentToInsert) {
          await tx.execute(sql`
            INSERT INTO customer_equipment (
              asset_number, customer_id, product_id, sales_order_id, sales_order_item_id,
              sales_invoice_id, sales_invoice_item_id, delivery_id, delivery_item_id,
              unit_index, serial_number, product_name, sku, model, make, capacity_rating,
              hsn_sac, destination_id, installation_location, installation_notes,
              installation_date, delivery_date, warranty_start_date, warranty_end_date,
              warranty_terms_snapshot, condition_status, asset_status
            ) VALUES (
              ${eq.assetNumber}, ${eq.customerId}, ${eq.productId}, ${eq.salesOrderId}, ${eq.salesOrderItemId},
              ${eq.salesInvoiceId}, ${eq.salesInvoiceItemId}, ${eq.deliveryId}, ${eq.deliveryItemId},
              ${eq.unitIndex}, ${eq.serialNumber}, ${eq.productName}, ${eq.sku}, ${eq.model}, ${eq.make}, ${eq.capacityRating},
              ${eq.hsnSac}, ${eq.destinationId}, ${eq.installationLocation}, ${eq.installationNotes},
              ${eq.installationDate}, ${eq.deliveryDate}, ${eq.warrantyStartDate}, ${eq.warrantyEndDate},
              ${eq.warrantyTermsSnapshot}, ${eq.conditionStatus}, ${eq.assetStatus}
            )
          `);
        }
        equipmentCreated += equipmentToInsert.length;
      }
    }

    console.log(`✅ Backfill complete:`);
    console.log(`   - Dispatches processed: ${processedDispatches.size}`);
    console.log(`   - Equipment created: ${equipmentCreated}`);
    console.log(`   - Existing records preserved: ${skippedAlreadyBackfilled}`);

    return {
      dispatchesProcessed: processedDispatches.size,
      equipmentCreated,
      skippedAlreadyBackfilled,
    };
  });
}

if (process.argv[1]?.includes('backfill-customer-equipment')) {
  backfillCustomerEquipment()
    .then(async (res) => {
      console.log('Result:', JSON.stringify(res, null, 2));
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Backfill failed:', err);
      await pool.end();
      process.exit(1);
    });
}
