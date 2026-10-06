import { relations } from 'drizzle-orm';
import { products } from '../schema/products.js';
import { users } from '../schema/users.js';
import { stockMovements } from '../schema/inventory.js';
import {
  suppliers,
  purchaseOrders,
  purchaseOrderItems,
  goodsReceipts,
  goodsReceiptItems,
} from '../schema/procurement.js';
import { salesOrders, salesOrderItems } from '../schema/sales-orders.js';
import { customers } from '../schema/customers.js';
import { quotations, quotationRevisions } from '../schema/quotations.js';
import {
  salesInvoices,
  salesInvoiceItems,
  vendorInvoices,
  vendorInvoiceItems,
  invoiceActivityLogs,
} from '../schema/invoices.js';
import {
  dispatches,
  dispatchItems,
  dispatchActivityLogs,
} from '../schema/dispatch.js';
import {
  customerEquipment,
  quotationItemEquipment,
} from '../schema/customer-equipment.js';
import { customerDestinations } from '../schema/customers.js';
import { quotationItems } from '../schema/quotations.js';

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  createdByUser: one(users, {
    fields: [stockMovements.createdBy],
    references: [users.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  stockMovements: many(stockMovements),
  purchaseOrderItems: many(purchaseOrderItems),
  goodsReceiptItems: many(goodsReceiptItems),
}));

export const usersRelations = relations(users, ({ many }) => ({
  createdStockMovements: many(stockMovements),
  createdPurchaseOrders: many(purchaseOrders),
  receivedGoodsReceipts: many(goodsReceipts),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchaseOrders.supplierId],
    references: [suppliers.id],
  }),
  createdByUser: one(users, {
    fields: [purchaseOrders.createdBy],
    references: [users.id],
  }),
  approvedByUser: one(users, {
    fields: [purchaseOrders.approvedBy],
    references: [users.id],
  }),
  items: many(purchaseOrderItems),
  goodsReceipts: many(goodsReceipts),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one, many }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  product: one(products, {
    fields: [purchaseOrderItems.productId],
    references: [products.id],
  }),
  goodsReceiptItems: many(goodsReceiptItems),
}));

export const goodsReceiptsRelations = relations(goodsReceipts, ({ one, many }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [goodsReceipts.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  receivedByUser: one(users, {
    fields: [goodsReceipts.receivedBy],
    references: [users.id],
  }),
  items: many(goodsReceiptItems),
}));

export const goodsReceiptItemsRelations = relations(goodsReceiptItems, ({ one }) => ({
  goodsReceipt: one(goodsReceipts, {
    fields: [goodsReceiptItems.goodsReceiptId],
    references: [goodsReceipts.id],
  }),
  purchaseOrderItem: one(purchaseOrderItems, {
    fields: [goodsReceiptItems.purchaseOrderItemId],
    references: [purchaseOrderItems.id],
  }),
  product: one(products, {
    fields: [goodsReceiptItems.productId],
    references: [products.id],
  }),
}));

// ─── Sales Order Relations ────────────────────────────────────────────────────

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [salesOrders.customerId],
    references: [customers.id],
  }),
  quotation: one(quotations, {
    fields: [salesOrders.quotationId],
    references: [quotations.id],
  }),
  quotationRevision: one(quotationRevisions, {
    fields: [salesOrders.quotationRevisionId],
    references: [quotationRevisions.id],
  }),
  createdByUser: one(users, {
    fields: [salesOrders.createdBy],
    references: [users.id],
    relationName: 'so_created_by',
  }),
  confirmedByUser: one(users, {
    fields: [salesOrders.confirmedBy],
    references: [users.id],
    relationName: 'so_confirmed_by',
  }),
  cancelledByUser: one(users, {
    fields: [salesOrders.cancelledBy],
    references: [users.id],
    relationName: 'so_cancelled_by',
  }),
  items: many(salesOrderItems),
}));

export const salesOrderItemsRelations = relations(salesOrderItems, ({ one, many }) => ({
  salesOrder: one(salesOrders, {
    fields: [salesOrderItems.salesOrderId],
    references: [salesOrders.id],
  }),
  product: one(products, {
    fields: [salesOrderItems.productId],
    references: [products.id],
  }),
  dispatchItems: many(dispatchItems),
}));

// ─── Invoice Relations ────────────────────────────────────────────────────────

export const salesInvoicesRelations = relations(salesInvoices, ({ one, many }) => ({
  salesOrder: one(salesOrders, {
    fields: [salesInvoices.salesOrderId],
    references: [salesOrders.id],
  }),
  customer: one(customers, {
    fields: [salesInvoices.customerId],
    references: [customers.id],
  }),
  createdByUser: one(users, {
    fields: [salesInvoices.createdBy],
    references: [users.id],
    relationName: 'si_created_by',
  }),
  issuedByUser: one(users, {
    fields: [salesInvoices.issuedBy],
    references: [users.id],
    relationName: 'si_issued_by',
  }),
  cancelledByUser: one(users, {
    fields: [salesInvoices.cancelledBy],
    references: [users.id],
    relationName: 'si_cancelled_by',
  }),
  items: many(salesInvoiceItems),
}));

export const salesInvoiceItemsRelations = relations(salesInvoiceItems, ({ one }) => ({
  salesInvoice: one(salesInvoices, {
    fields: [salesInvoiceItems.salesInvoiceId],
    references: [salesInvoices.id],
  }),
  salesOrderItem: one(salesOrderItems, {
    fields: [salesInvoiceItems.salesOrderItemId],
    references: [salesOrderItems.id],
  }),
  product: one(products, {
    fields: [salesInvoiceItems.productId],
    references: [products.id],
  }),
}));

export const vendorInvoicesRelations = relations(vendorInvoices, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [vendorInvoices.supplierId],
    references: [suppliers.id],
  }),
  purchaseOrder: one(purchaseOrders, {
    fields: [vendorInvoices.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  goodsReceipt: one(goodsReceipts, {
    fields: [vendorInvoices.goodsReceiptId],
    references: [goodsReceipts.id],
  }),
  createdByUser: one(users, {
    fields: [vendorInvoices.createdBy],
    references: [users.id],
    relationName: 'vi_created_by',
  }),
  verifiedByUser: one(users, {
    fields: [vendorInvoices.verifiedBy],
    references: [users.id],
    relationName: 'vi_verified_by',
  }),
  postedByUser: one(users, {
    fields: [vendorInvoices.postedBy],
    references: [users.id],
    relationName: 'vi_posted_by',
  }),
  cancelledByUser: one(users, {
    fields: [vendorInvoices.cancelledBy],
    references: [users.id],
    relationName: 'vi_cancelled_by',
  }),
  items: many(vendorInvoiceItems),
}));

export const vendorInvoiceItemsRelations = relations(vendorInvoiceItems, ({ one }) => ({
  vendorInvoice: one(vendorInvoices, {
    fields: [vendorInvoiceItems.vendorInvoiceId],
    references: [vendorInvoices.id],
  }),
  purchaseOrderItem: one(purchaseOrderItems, {
    fields: [vendorInvoiceItems.purchaseOrderItemId],
    references: [purchaseOrderItems.id],
  }),
  goodsReceiptItem: one(goodsReceiptItems, {
    fields: [vendorInvoiceItems.goodsReceiptItemId],
    references: [goodsReceiptItems.id],
  }),
  product: one(products, {
    fields: [vendorInvoiceItems.productId],
    references: [products.id],
  }),
}));

export const invoiceActivityLogsRelations = relations(invoiceActivityLogs, ({ one }) => ({
  user: one(users, {
    fields: [invoiceActivityLogs.userId],
    references: [users.id],
  }),
}));

export const dispatchesRelations = relations(dispatches, ({ one, many }) => ({
  salesOrder: one(salesOrders, {
    fields: [dispatches.salesOrderId],
    references: [salesOrders.id],
  }),
  customer: one(customers, {
    fields: [dispatches.customerId],
    references: [customers.id],
  }),
  salesInvoice: one(salesInvoices, {
    fields: [dispatches.salesInvoiceId],
    references: [salesInvoices.id],
  }),
  createdByUser: one(users, {
    fields: [dispatches.createdById],
    references: [users.id],
    relationName: 'dispatch_created_by',
  }),
  dispatchedByUser: one(users, {
    fields: [dispatches.dispatchedById],
    references: [users.id],
    relationName: 'dispatch_dispatched_by',
  }),
  cancelledByUser: one(users, {
    fields: [dispatches.cancelledById],
    references: [users.id],
    relationName: 'dispatch_cancelled_by',
  }),
  items: many(dispatchItems),
  activityLogs: many(dispatchActivityLogs),
}));

export const dispatchItemsRelations = relations(dispatchItems, ({ one }) => ({
  dispatch: one(dispatches, {
    fields: [dispatchItems.dispatchId],
    references: [dispatches.id],
  }),
  salesOrderItem: one(salesOrderItems, {
    fields: [dispatchItems.salesOrderItemId],
    references: [salesOrderItems.id],
  }),
  salesInvoiceItem: one(salesInvoiceItems, {
    fields: [dispatchItems.salesInvoiceItemId],
    references: [salesInvoiceItems.id],
  }),
  product: one(products, {
    fields: [dispatchItems.productId],
    references: [products.id],
  }),
}));

export const dispatchActivityLogsRelations = relations(dispatchActivityLogs, ({ one }) => ({
  dispatch: one(dispatches, {
    fields: [dispatchActivityLogs.dispatchId],
    references: [dispatches.id],
  }),
  actor: one(users, {
    fields: [dispatchActivityLogs.actorId],
    references: [users.id],
  }),
}));

export const customerEquipmentRelations = relations(customerEquipment, ({ one, many }) => ({
  customer: one(customers, {
    fields: [customerEquipment.customerId],
    references: [customers.id],
  }),
  product: one(products, {
    fields: [customerEquipment.productId],
    references: [products.id],
  }),
  salesOrder: one(salesOrders, {
    fields: [customerEquipment.salesOrderId],
    references: [salesOrders.id],
  }),
  salesOrderItem: one(salesOrderItems, {
    fields: [customerEquipment.salesOrderItemId],
    references: [salesOrderItems.id],
  }),
  salesInvoice: one(salesInvoices, {
    fields: [customerEquipment.salesInvoiceId],
    references: [salesInvoices.id],
  }),
  salesInvoiceItem: one(salesInvoiceItems, {
    fields: [customerEquipment.salesInvoiceItemId],
    references: [salesInvoiceItems.id],
  }),
  delivery: one(dispatches, {
    fields: [customerEquipment.deliveryId],
    references: [dispatches.id],
  }),
  deliveryItem: one(dispatchItems, {
    fields: [customerEquipment.deliveryItemId],
    references: [dispatchItems.id],
  }),
  destination: one(customerDestinations, {
    fields: [customerEquipment.destinationId],
    references: [customerDestinations.id],
  }),
  createdByUser: one(users, {
    fields: [customerEquipment.createdById],
    references: [users.id],
    relationName: 'ce_created_by',
  }),
  updatedByUser: one(users, {
    fields: [customerEquipment.updatedById],
    references: [users.id],
    relationName: 'ce_updated_by',
  }),
  quotationItemLinks: many(quotationItemEquipment),
}));

export const quotationItemEquipmentRelations = relations(quotationItemEquipment, ({ one }) => ({
  quotationItem: one(quotationItems, {
    fields: [quotationItemEquipment.quotationItemId],
    references: [quotationItems.id],
  }),
  customerEquipment: one(customerEquipment, {
    fields: [quotationItemEquipment.customerEquipmentId],
    references: [customerEquipment.id],
  }),
}));

