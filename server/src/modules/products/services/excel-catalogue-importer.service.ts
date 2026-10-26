import * as XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { products, type ProductEntity } from '../../../database/schema/products.js';
import { logger } from '../../../common/logger/logger.js';
import { AppError } from '../../../common/errors/AppError.js';

export interface ImportCandidate {
  brand?: string | null;
  name: string;
  sku: string;
  model?: string | null;
  subModel?: string | null;
  series?: string | null;
  category: string;
  capacityRating?: string | null;
  phase?: string | null;
  warrantyDescription?: string | null;
  unit?: string;
  moq?: number | null;
  price: number;
  dealerPrice?: number | null;
  partnerPrice?: number | null;
  dtp?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  mrp?: number | null;
  basicPrice?: number | null;
  gstPaidPrice?: number | null;
  recommendedPrice?: number | null;
  priceOnRequest?: boolean;
  status?: string;
  technicalSpecifications?: string | null;
  parentProductSkuCandidate?: string | null;
  sourceSheet: string;
  sourceRowNumber: number;
  notes?: string;
}

export interface ExcelImportOptions {
  mode?: 'upsert' | 'skip_existing' | 'fail_on_existing';
  dryRun?: boolean;
  filePath?: string;
  buffer?: Buffer;
  base64Data?: string;
}

export interface ExcelImportResult {
  success: boolean;
  batchId: string;
  executionTimestamp: string;
  durationMs: number;
  dryRun: boolean;
  mode: 'upsert' | 'skip_existing' | 'fail_on_existing';
  totalParsed: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  parentsCount: number;
  childrenCount: number;
  byBrand: Record<string, number>;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  rejectedRowsCount: number;
  rejectedRows?: Array<{ sheet: string; row: number; reason: string }>;
}

export class ExcelCatalogueImporterService {
  /**
   * Helper: Parse string / numeric cell values into float or null
   */
  private parseNum(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    const s = String(v).trim().replace(/,/g, '').replace(/₹/g, '');
    if (!s || ['NA', 'N/A', '-', 'NOT SPECIFIED', 'NULL', 'NONE'].includes(s.toUpperCase())) {
      return null;
    }
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  /**
   * Extracts clean, structured product candidates from all 8 sheets in the Excel workbook
   */
  public extractCandidatesFromWorkbook(wb: XLSX.WorkBook): {
    candidates: ImportCandidate[];
    rejected: Array<{ sheet: string; row: number; reason: string }>;
  } {
    const candidates: ImportCandidate[] = [];
    const rejected: Array<{ sheet: string; row: number; reason: string }> = [];

    // -------------------------------------------------------------------------
    // 1. VERTIV PARTS
    // -------------------------------------------------------------------------
    const wsVertiv = wb.Sheets['Vertiv Parts'];
    if (wsVertiv) {
      const vertivMoqConflicts = new Set([
        'VERTIV-120031010001',
        'VERTIV-120098000051',
        'VERTIV-120031010011',
      ]);
      const rows: any[][] = XLSX.utils.sheet_to_json(wsVertiv, { header: 1 });
      const vertivSeen = new Map<string, boolean>();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const r = i + 1;
        const partCode = String(row[0] || '').trim();
        const desc = String(row[1] || '').trim();
        const moqRaw = String(row[2] || '').trim();
        const dtpRaw = row[3];

        if (!partCode || !desc) {
          rejected.push({ sheet: 'Vertiv Parts', row: r, reason: 'Missing part code or description' });
          continue;
        }

        const dtpVal = this.parseNum(dtpRaw);
        if (dtpVal === null || dtpVal < 0) {
          rejected.push({ sheet: 'Vertiv Parts', row: r, reason: `Invalid DTP price: ${dtpRaw}` });
          continue;
        }

        if (vertivSeen.has(partCode)) {
          continue; // Merge duplicate workbook rows
        }
        vertivSeen.set(partCode, true);

        const sku = `VERTIV-${partCode}`;
        if (vertivMoqConflicts.has(sku)) {
          // Review required conflict
          rejected.push({ sheet: 'Vertiv Parts', row: r, reason: 'Conflicting MOQ rows awaiting review' });
          continue;
        }

        const moqVal = this.parseNum(moqRaw);
        const cat = desc.toUpperCase().includes('UPS')
          ? 'UPS'
          : desc.toUpperCase().includes('BATTERY')
          ? 'BATTERY'
          : 'ACCESSORY';

        candidates.push({
          brand: 'Vertiv',
          name: desc,
          sku,
          model: partCode,
          category: cat,
          price: dtpVal,
          dealerPrice: dtpVal,
          dtp: dtpVal,
          unit: 'NOS',
          moq: moqVal !== null ? Math.round(moqVal) : null,
          priceOnRequest: false,
          status: 'ACTIVE',
          sourceSheet: 'Vertiv Parts',
          sourceRowNumber: r,
          notes: `Raw MOQ: ${moqRaw}`,
        });
      }
    }

    // -------------------------------------------------------------------------
    // 2. STABILIZER
    // -------------------------------------------------------------------------
    const wsStab = wb.Sheets['Stabilizer'];
    if (wsStab) {
      const rows: any[][] = XLSX.utils.sheet_to_json(wsStab, { header: 1 });
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const r = i + 1;
        const phaseRaw = String(row[0] || '').trim();
        const ratingRaw = String(row[1] || '').trim();
        const inputRange = String(row[2] || '').trim();
        const outputVal = String(row[3] || '').trim();
        const coolingVal = String(row[4] || '').trim();
        const priceRaw = String(row[5] !== undefined ? row[5] : '').trim();
        const dimL = String(row[6] || '').trim();
        const dimB = String(row[7] || '').trim();
        const dimH = String(row[8] || '').trim();

        if (!ratingRaw) {
          rejected.push({ sheet: 'Stabilizer', row: r, reason: 'Missing capacity rating' });
          continue;
        }

        const cleanRating = ratingRaw.replace(/\s+/g, '').toUpperCase();
        const sku = `TPS-STAB-${phaseRaw}PH-${cleanRating}-${coolingVal.toUpperCase()}-${r}`;
        const coolingCapitalized =
          coolingVal.charAt(0).toUpperCase() + coolingVal.slice(1).toLowerCase();
        const name = `Servo Voltage Stabilizer ${ratingRaw} ${phaseRaw}-Phase (${coolingCapitalized} Cooled)`;

        const techSpecs = {
          inputRange,
          outputVoltage: outputVal,
          cooling: coolingVal,
          dimensions: dimL ? `${dimL}x${dimB}x${dimH}` : null,
        };

        let minP: number | null = null;
        let maxP: number | null = null;
        let priceOnReq = false;
        let finalPrice = 0;
        let status = 'ACTIVE';

        if (!priceRaw || ['NA', 'NONE', ''].includes(priceRaw.toUpperCase())) {
          priceOnReq = true;
          status = 'INACTIVE';
          finalPrice = 0;
        } else if (priceRaw.includes('-')) {
          const parts = priceRaw.split('-');
          minP = this.parseNum(parts[0]);
          maxP = this.parseNum(parts[1]);
          if (minP !== null && maxP !== null && minP <= maxP) {
            finalPrice = minP;
          } else {
            rejected.push({ sheet: 'Stabilizer', row: r, reason: `Invalid range price bounds: ${priceRaw}` });
            continue;
          }
        } else {
          const pVal = this.parseNum(priceRaw);
          if (pVal !== null) {
            finalPrice = pVal;
            minP = pVal;
            maxP = pVal;
          } else {
            priceOnReq = true;
            status = 'INACTIVE';
            finalPrice = 0;
          }
        }

        candidates.push({
          brand: 'Taneja Power',
          name,
          sku,
          category: 'STABILIZER',
          capacityRating: ratingRaw,
          phase: `${phaseRaw}-Phase`,
          price: finalPrice,
          minPrice: minP,
          maxPrice: maxP,
          priceOnRequest: priceOnReq,
          status,
          unit: 'NOS',
          technicalSpecifications: JSON.stringify(techSpecs),
          sourceSheet: 'Stabilizer',
          sourceRowNumber: r,
        });
      }
    }

    // -------------------------------------------------------------------------
    // 3. HITACHI UPS (Includes Parent UPS + Child Isolation Transformers)
    // -------------------------------------------------------------------------
    const wsHit = wb.Sheets['Hitaachi Ups'];
    if (wsHit) {
      const rows: any[][] = XLSX.utils.sheet_to_json(wsHit, { header: 1 });
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const r = i + 1;
        const model = String(row[1] || '').trim();
        const subModel = String(row[2] || '').trim();
        const capacity = String(row[3] || '').trim();
        const phase = String(row[4] || '').trim();
        const dcVolt = String(row[5] || '').trim();
        const charger = String(row[6] || '').trim();
        const upsPriceRaw = row[7];
        const txInbRaw = row[8];
        const txExtRaw = row[9];

        const upsPrice = this.parseNum(upsPriceRaw);
        if (!model || upsPrice === null) {
          rejected.push({ sheet: 'Hitaachi Ups', row: r, reason: `Missing model or invalid UPS price: ${upsPriceRaw}` });
          continue;
        }

        const cleanCap = capacity.replace(/\s+/g, '').toUpperCase();
        const cleanModel = model.replace(/\s+/g, '_').replace(/[()]/g, '');
        const sku = `HIT-${cleanModel}-${subModel}-${cleanCap}-${r}`;
        const name = `Hitachi ${model} ${capacity} Online UPS (${subModel})`;

        const techSpecs = { dcVoltage: dcVolt, chargerCapacity: charger, phase };

        // Parent UPS Item
        candidates.push({
          brand: 'Hitachi',
          name,
          sku,
          model,
          subModel,
          category: 'UPS',
          capacityRating: capacity,
          phase,
          price: upsPrice,
          dealerPrice: upsPrice,
          priceOnRequest: false,
          status: 'ACTIVE',
          unit: 'NOS',
          technicalSpecifications: JSON.stringify(techSpecs),
          sourceSheet: 'Hitaachi Ups',
          sourceRowNumber: r,
          notes: `Inbuilt Tx Price: ${txInbRaw}, Ext Tx Price: ${txExtRaw}`,
        });

        // Child Inbuilt Isolation Transformer
        const txInb = this.parseNum(txInbRaw);
        if (txInb !== null && txInb > 0) {
          candidates.push({
            brand: 'Hitachi',
            name: `Inbuilt Isolation Transformer for ${model} ${capacity}`,
            sku: `HIT-TX-INB-${cleanModel}-${cleanCap}-${r}`,
            model: `ISO-TX-INBUILT-${model}`,
            category: 'TRANSFORMER',
            capacityRating: capacity,
            price: txInb,
            dealerPrice: txInb,
            priceOnRequest: false,
            status: 'ACTIVE',
            unit: 'NOS',
            parentProductSkuCandidate: sku,
            sourceSheet: 'Hitaachi Ups',
            sourceRowNumber: r,
          });
        }

        // Child External Isolation Transformer
        const txExt = this.parseNum(txExtRaw);
        if (txExt !== null && txExt > 0) {
          candidates.push({
            brand: 'Hitachi',
            name: `External Isolation Transformer for ${model} ${capacity}`,
            sku: `HIT-TX-EXT-${cleanModel}-${cleanCap}-${r}`,
            model: `ISO-TX-EXTERNAL-${model}`,
            category: 'TRANSFORMER',
            capacityRating: capacity,
            price: txExt,
            dealerPrice: txExt,
            priceOnRequest: false,
            status: 'ACTIVE',
            unit: 'NOS',
            parentProductSkuCandidate: sku,
            sourceSheet: 'Hitaachi Ups',
            sourceRowNumber: r,
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // 4. EATON BATTERIES
    // -------------------------------------------------------------------------
    const wsEaton = wb.Sheets['Eaton Batteries'];
    if (wsEaton) {
      const rows: any[][] = XLSX.utils.sheet_to_json(wsEaton, { header: 1 });
      const eatonConflictPartCodes = ['744-A4256', '744-A2460', '744-98067'];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const r = i + 1;
        const series = String(row[0] || '').trim();
        const partNo = String(row[1] || '').trim();
        const desc = String(row[2] || '').trim();
        const dpRaw = row[3];
        const mrpRaw = row[4];

        const dp = this.parseNum(dpRaw);
        const mrp = this.parseNum(mrpRaw);
        if (!partNo || !desc || dp === null) {
          rejected.push({ sheet: 'Eaton Batteries', row: r, reason: `Missing part number or DP price: ${dpRaw}` });
          continue;
        }

        // Exclude repeated conflict part codes pending manual disambiguation
        if (eatonConflictPartCodes.some((code) => partNo.includes(code))) {
          rejected.push({ sheet: 'Eaton Batteries', row: r, reason: `Repeated manufacturer part code awaiting review: ${partNo}` });
          continue;
        }

        const cleanPart = partNo.replace(/\s+/g, '').replace(/\//g, '_');
        const cleanSeries = series.replace(/\s+/g, '_').toUpperCase();
        const sku = `EATON-${cleanSeries}-${cleanPart}`;

        candidates.push({
          brand: 'Eaton',
          name: desc,
          sku,
          model: partNo,
          series,
          category: desc.includes('EBM') || desc.toUpperCase().includes('BATTERY') ? 'BATTERY' : 'UPS',
          price: dp,
          dealerPrice: dp,
          mrp,
          priceOnRequest: false,
          status: 'ACTIVE',
          unit: 'NOS',
          sourceSheet: 'Eaton Batteries',
          sourceRowNumber: r,
        });
      }
    }

    // -------------------------------------------------------------------------
    // 5. MICROTEK & EXIDE
    // -------------------------------------------------------------------------
    const wsMicro = wb.Sheets['Microtek & Exide'];
    if (wsMicro) {
      const rows: any[][] = XLSX.utils.sheet_to_json(wsMicro, { header: 1 });
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const r = i + 1;
        const brand = String(row[0] || '').trim();
        const category = String(row[1] || '').trim();
        const model = String(row[2] || '').trim();
        const warranty = String(row[3] || '').trim();
        const basicRaw = row[4];
        const gstRaw = row[5];
        const gstPaidRaw = row[6];
        const dpRaw = row[7];
        const mrpRaw = row[8];

        const dp = this.parseNum(dpRaw);
        const mrp = this.parseNum(mrpRaw);
        const basicP = this.parseNum(basicRaw);

        // Skip rows with unspecified models (e.g. Row 2)
        if (['NOT SPECIFIED', 'NA', ''].includes(model.toUpperCase())) {
          rejected.push({ sheet: 'Microtek & Exide', row: r, reason: `Unspecified model: "${model}"` });
          continue;
        }
        if (dp === null || dp <= 0) {
          rejected.push({ sheet: 'Microtek & Exide', row: r, reason: `Missing or non-positive price: ${dpRaw}` });
          continue;
        }

        const cleanModel = model.replace(/\s+/g, '_').replace(/\//g, '_').replace(/[()]/g, '');
        const sku = `${brand.toUpperCase()}-${cleanModel}-${r}`;
        const brandTitle = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();

        candidates.push({
          brand: brandTitle,
          name: `${brand} ${model} ${category}`,
          sku,
          model,
          category: category.toUpperCase().includes('BATTERY') ? 'BATTERY' : 'INVERTER',
          warrantyDescription: warranty,
          price: dp,
          dealerPrice: dp,
          basicPrice: basicP,
          mrp,
          priceOnRequest: false,
          status: 'ACTIVE',
          unit: 'NOS',
          sourceSheet: 'Microtek & Exide',
          sourceRowNumber: r,
          notes: `Raw GST col: ${gstRaw}, Raw GST Paid col: ${gstPaidRaw}`,
        });
      }
    }

    // -------------------------------------------------------------------------
    // 6. LUMINOUS INVERTER
    // -------------------------------------------------------------------------
    const wsLumInv = wb.Sheets['Luminous Inverter'];
    if (wsLumInv) {
      const rows: any[][] = XLSX.utils.sheet_to_json(wsLumInv, { header: 1 });
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const r = i + 1;
        const category = String(row[0] || '').trim();
        const product = String(row[1] || '').trim();
        const rating = String(row[2] || '').trim();
        const dpRaw = row[3];
        const mrpRaw = row[4];

        const dp = this.parseNum(dpRaw);
        const mrp = this.parseNum(mrpRaw);
        if (!product || dp === null) {
          rejected.push({ sheet: 'Luminous Inverter', row: r, reason: `Missing product or invalid DP price: ${dpRaw}` });
          continue;
        }

        const cleanProd = product.replace(/\s+/g, '_').replace(/\//g, '_');
        const sku = `LUM-INV-${cleanProd}-${r}`;

        candidates.push({
          brand: 'Luminous',
          name: `Luminous ${product} ${category}`,
          sku,
          model: product,
          series: category,
          capacityRating: rating,
          category: 'INVERTER',
          price: dp,
          dealerPrice: dp,
          mrp,
          priceOnRequest: false,
          status: 'ACTIVE',
          unit: 'NOS',
          sourceSheet: 'Luminous Inverter',
          sourceRowNumber: r,
        });
      }
    }

    // -------------------------------------------------------------------------
    // 7. LUMINOUS BATTERY
    // -------------------------------------------------------------------------
    const wsLumBat = wb.Sheets['Luminous Battery'];
    if (wsLumBat) {
      const rows: any[][] = XLSX.utils.sheet_to_json(wsLumBat, { header: 1 });
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const r = i + 1;
        const product = String(row[0] || '').trim();
        const btype = String(row[1] || '').trim();
        const rating = String(row[2] || '').trim();
        const warranty = String(row[3] || '').trim();
        const dpRaw = row[4];
        const mrpRaw = row[5];

        // Structural header divider row (e.g. row 17) or empty
        if (!product && !dpRaw) continue;

        const dp = this.parseNum(dpRaw);
        const mrp = this.parseNum(mrpRaw);

        // Unpriced accessories like trolley rows 18 & 19
        if (!product || dp === null) {
          rejected.push({ sheet: 'Luminous Battery', row: r, reason: `Missing product name or unpriced DP: ${dpRaw}` });
          continue;
        }

        const cleanProd = product.replace(/\s+/g, '_').replace(/\//g, '_');
        const sku = `LUM-BAT-${cleanProd}-${r}`;

        candidates.push({
          brand: 'Luminous',
          name: `Luminous ${product} ${rating} (${btype})`,
          sku,
          model: product,
          subModel: btype,
          capacityRating: rating,
          warrantyDescription: warranty,
          category: 'BATTERY',
          price: dp,
          dealerPrice: dp,
          mrp,
          priceOnRequest: false,
          status: 'ACTIVE',
          unit: 'NOS',
          sourceSheet: 'Luminous Battery',
          sourceRowNumber: r,
        });
      }
    }

    // -------------------------------------------------------------------------
    // 8. VEHICULAR & 2-WHEELER BATTERIES
    // -------------------------------------------------------------------------
    const wsVeh = wb.Sheets['vehicular& 2-Wheeler Batteries'];
    if (wsVeh) {
      const rows: any[][] = XLSX.utils.sheet_to_json(wsVeh, { header: 1 });
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const r = i + 1;
        const categoryRaw = String(row[0] || '').trim();
        const ahVa = String(row[1] || '').trim();
        const prodCode = String(row[2] || '').trim();
        const capacity = String(row[3] || '').trim();
        const warranty = String(row[4] || '').trim();
        const recPriceRaw = row[5];

        const recPrice = this.parseNum(recPriceRaw);
        if (!prodCode || recPrice === null) {
          rejected.push({
            sheet: 'vehicular& 2-Wheeler Batteries',
            row: r,
            reason: `Missing product code or invalid recommended price: ${recPriceRaw}`,
          });
          continue;
        }

        const catUpper = categoryRaw.toUpperCase();
        const brand = catUpper.includes('EXIDE')
          ? 'Exide'
          : catUpper.includes('AMARON')
          ? 'Amaron'
          : catUpper.includes('SF')
          ? 'SF Sonic'
          : 'Automotive';

        const sku = `AUTO-${brand.toUpperCase()}-${prodCode}`;
        const name = `${brand} ${prodCode} ${ahVa}Ah Automotive Battery (${categoryRaw})`;

        candidates.push({
          brand,
          name,
          sku,
          model: prodCode,
          series: categoryRaw,
          capacityRating: ahVa ? `${ahVa} Ah` : capacity,
          warrantyDescription: warranty,
          category: 'BATTERY',
          price: recPrice,
          recommendedPrice: recPrice,
          priceOnRequest: false,
          status: 'ACTIVE',
          unit: 'NOS',
          sourceSheet: 'vehicular& 2-Wheeler Batteries',
          sourceRowNumber: r,
        });
      }
    }

    return { candidates, rejected };
  }

  /**
   * Pre-validates extracted candidate records against schema constraints
   */
  public validateCandidates(candidates: ImportCandidate[]): void {
    if (!Array.isArray(candidates) || candidates.length === 0) {
      throw AppError.badRequest('Import dataset is empty or invalid.');
    }

    const skuSet = new Set<string>();
    const parentCandidates = new Set<string>();

    for (const c of candidates) {
      if (!c.parentProductSkuCandidate) {
        parentCandidates.add(c.sku);
      }
    }

    for (const [idx, c] of candidates.entries()) {
      if (!c.sku || c.sku.length < 2 || c.sku.length > 100) {
        throw AppError.badRequest(`Candidate at index ${idx} has invalid SKU length: "${c.sku}"`);
      }

      if (skuSet.has(c.sku)) {
        throw AppError.badRequest(`Duplicate SKU detected within input workbook: "${c.sku}"`);
      }
      skuSet.add(c.sku);

      if (!c.name || c.name.length < 2 || c.name.length > 255) {
        throw AppError.badRequest(`Candidate '${c.sku}' has invalid name length: "${c.name}"`);
      }

      if (!c.category || c.category.length < 2 || c.category.length > 100) {
        throw AppError.badRequest(`Candidate '${c.sku}' has invalid category: "${c.category}"`);
      }

      if (c.price === undefined || c.price === null || c.price < 0) {
        throw AppError.badRequest(`Candidate '${c.sku}' has negative or invalid price: ${c.price}`);
      }

      if (c.priceOnRequest) {
        if (c.price !== 0 || c.status !== 'INACTIVE') {
          throw AppError.badRequest(`Candidate '${c.sku}' is priceOnRequest=true but price != 0 or status != INACTIVE`);
        }
      } else {
        if (c.price <= 0 || c.status !== 'ACTIVE') {
          throw AppError.badRequest(`Candidate '${c.sku}' is active product but has non-positive price: ${c.price}`);
        }
      }

      if (c.minPrice !== undefined && c.minPrice !== null && c.maxPrice !== undefined && c.maxPrice !== null) {
        if (c.minPrice > c.maxPrice) {
          throw AppError.badRequest(`Candidate '${c.sku}' has minPrice (${c.minPrice}) > maxPrice (${c.maxPrice})`);
        }
      }

      if (c.parentProductSkuCandidate) {
        if (!parentCandidates.has(c.parentProductSkuCandidate)) {
          throw AppError.badRequest(`Candidate '${c.sku}' references nonexistent parent SKU '${c.parentProductSkuCandidate}'`);
        }
      }

      if (!c.sourceSheet || typeof c.sourceRowNumber !== 'number') {
        throw AppError.badRequest(`Candidate '${c.sku}' lacks sourceSheet or sourceRowNumber provenance`);
      }
    }
  }

  /**
   * Main import worker: Parses workbook, validates, and commits 2-pass atomic transaction
   */
  public async importWorkbook(
    wb: XLSX.WorkBook,
    options: ExcelImportOptions = {}
  ): Promise<ExcelImportResult> {
    const startTime = Date.now();
    const mode = options.mode || 'upsert';
    const isDryRun = Boolean(options.dryRun);

    logger.info(`Starting Excel catalogue import (mode: ${mode}, dryRun: ${isDryRun})...`);

    // 1. Extract candidates
    const { candidates, rejected } = this.extractCandidatesFromWorkbook(wb);
    logger.info(`Extracted ${candidates.length} candidates from workbook (${rejected.length} rows rejected/skipped).`);

    // 2. Validate dataset
    this.validateCandidates(candidates);
    logger.info(`Pre-validation passed: all ${candidates.length} candidate specifications valid.`);

    // 3. Inspect existing database products
    const candidateSkus = candidates.map((c) => c.sku);
    const existingInDb = await db
      .select({ id: products.id, sku: products.sku })
      .from(products)
      .where(inArray(products.sku, candidateSkus));

    const existingSkuMap = new Map<string, string>(existingInDb.map((e) => [e.sku, e.id]));

    if (mode === 'fail_on_existing' && existingInDb.length > 0) {
      throw AppError.conflict(
        `Pre-import conflict: ${existingInDb.length} incoming SKUs already exist in database (e.g. ${existingInDb
          .slice(0, 5)
          .map((e) => e.sku)
          .join(', ')}). Halting as requested.`
      );
    }

    // Partition into Pass 1 (Parents) and Pass 2 (Children)
    const pass1Parents = candidates.filter((c) => !c.parentProductSkuCandidate);
    const pass2Children = candidates.filter((c) => Boolean(c.parentProductSkuCandidate));

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const parentSkuToIdMap = new Map<string, string>();

    // Pre-populate parent map with existing parents if in database
    for (const p of pass1Parents) {
      const existingId = existingSkuMap.get(p.sku);
      if (existingId) {
        parentSkuToIdMap.set(p.sku, existingId);
      }
    }

    if (!isDryRun) {
      await db.transaction(async (tx) => {
        // ---------------------------------------------------------------------
        // PASS 1: PARENT PRODUCTS
        // ---------------------------------------------------------------------
        for (const p of pass1Parents) {
          const existingId = existingSkuMap.get(p.sku);

          if (existingId) {
            if (mode === 'skip_existing') {
              skippedCount++;
              continue;
            }

            // Upsert / Update
            await tx
              .update(products)
              .set({
                name: p.name,
                category: p.category,
                price: p.price.toString(),
                status: p.status || (p.priceOnRequest ? 'INACTIVE' : 'ACTIVE'),
                brand: p.brand ?? null,
                model: p.model ?? null,
                subModel: p.subModel ?? null,
                series: p.series ?? null,
                warrantyDescription: p.warrantyDescription ?? null,
                unit: p.unit ?? 'NOS',
                moq: p.moq ?? null,
                mrp: p.mrp !== undefined && p.mrp !== null ? p.mrp.toString() : null,
                dealerPrice: p.dealerPrice !== undefined && p.dealerPrice !== null ? p.dealerPrice.toString() : null,
                partnerPrice: p.partnerPrice !== undefined && p.partnerPrice !== null ? p.partnerPrice.toString() : null,
                dtp: p.dtp !== undefined && p.dtp !== null ? p.dtp.toString() : null,
                minPrice: p.minPrice !== undefined && p.minPrice !== null ? p.minPrice.toString() : null,
                maxPrice: p.maxPrice !== undefined && p.maxPrice !== null ? p.maxPrice.toString() : null,
                priceOnRequest: p.priceOnRequest ?? false,
                basicPrice: p.basicPrice !== undefined && p.basicPrice !== null ? p.basicPrice.toString() : null,
                gstPaidPrice: p.gstPaidPrice !== undefined && p.gstPaidPrice !== null ? p.gstPaidPrice.toString() : null,
                recommendedPrice: p.recommendedPrice !== undefined && p.recommendedPrice !== null ? p.recommendedPrice.toString() : null,
                capacityRating: p.capacityRating ?? null,
                phase: p.phase ?? null,
                technicalSpecifications: p.technicalSpecifications ?? null,
                sourceSheet: p.sourceSheet,
                sourceRowNumber: p.sourceRowNumber,
                updatedAt: sql`now()`,
              })
              .where(eq(products.id, existingId));

            updatedCount++;
          } else {
            // Insert
            const [inserted] = await tx
              .insert(products)
              .values({
                name: p.name,
                sku: p.sku,
                category: p.category,
                price: p.price.toString(),
                stockQuantity: 0,
                status: p.status || (p.priceOnRequest ? 'INACTIVE' : 'ACTIVE'),
                brand: p.brand ?? null,
                model: p.model ?? null,
                subModel: p.subModel ?? null,
                series: p.series ?? null,
                warrantyDescription: p.warrantyDescription ?? null,
                unit: p.unit ?? 'NOS',
                moq: p.moq ?? null,
                mrp: p.mrp !== undefined && p.mrp !== null ? p.mrp.toString() : null,
                dealerPrice: p.dealerPrice !== undefined && p.dealerPrice !== null ? p.dealerPrice.toString() : null,
                partnerPrice: p.partnerPrice !== undefined && p.partnerPrice !== null ? p.partnerPrice.toString() : null,
                dtp: p.dtp !== undefined && p.dtp !== null ? p.dtp.toString() : null,
                minPrice: p.minPrice !== undefined && p.minPrice !== null ? p.minPrice.toString() : null,
                maxPrice: p.maxPrice !== undefined && p.maxPrice !== null ? p.maxPrice.toString() : null,
                priceOnRequest: p.priceOnRequest ?? false,
                basicPrice: p.basicPrice !== undefined && p.basicPrice !== null ? p.basicPrice.toString() : null,
                gstPaidPrice: p.gstPaidPrice !== undefined && p.gstPaidPrice !== null ? p.gstPaidPrice.toString() : null,
                recommendedPrice: p.recommendedPrice !== undefined && p.recommendedPrice !== null ? p.recommendedPrice.toString() : null,
                capacityRating: p.capacityRating ?? null,
                phase: p.phase ?? null,
                technicalSpecifications: p.technicalSpecifications ?? null,
                parentProductId: null,
                sourceSheet: p.sourceSheet,
                sourceRowNumber: p.sourceRowNumber,
              })
              .returning({ id: products.id, sku: products.sku });

            parentSkuToIdMap.set(inserted.sku, inserted.id);
            insertedCount++;
          }
        }

        // ---------------------------------------------------------------------
        // PASS 2: CHILD PRODUCTS (With resolved parentProductId)
        // ---------------------------------------------------------------------
        for (const c of pass2Children) {
          const parentId = parentSkuToIdMap.get(c.parentProductSkuCandidate!);
          if (!parentId) {
            throw AppError.badRequest(
              `Child product '${c.sku}' could not resolve parent ID for '${c.parentProductSkuCandidate}'`
            );
          }

          const existingId = existingSkuMap.get(c.sku);

          if (existingId) {
            if (mode === 'skip_existing') {
              skippedCount++;
              continue;
            }

            await tx
              .update(products)
              .set({
                name: c.name,
                category: c.category,
                price: c.price.toString(),
                status: c.status || 'ACTIVE',
                brand: c.brand ?? null,
                model: c.model ?? null,
                subModel: c.subModel ?? null,
                series: c.series ?? null,
                warrantyDescription: c.warrantyDescription ?? null,
                unit: c.unit ?? 'NOS',
                moq: c.moq ?? null,
                mrp: c.mrp !== undefined && c.mrp !== null ? c.mrp.toString() : null,
                dealerPrice: c.dealerPrice !== undefined && c.dealerPrice !== null ? c.dealerPrice.toString() : null,
                partnerPrice: c.partnerPrice !== undefined && c.partnerPrice !== null ? c.partnerPrice.toString() : null,
                dtp: c.dtp !== undefined && c.dtp !== null ? c.dtp.toString() : null,
                minPrice: c.minPrice !== undefined && c.minPrice !== null ? c.minPrice.toString() : null,
                maxPrice: c.maxPrice !== undefined && c.maxPrice !== null ? c.maxPrice.toString() : null,
                priceOnRequest: c.priceOnRequest ?? false,
                basicPrice: c.basicPrice !== undefined && c.basicPrice !== null ? c.basicPrice.toString() : null,
                gstPaidPrice: c.gstPaidPrice !== undefined && c.gstPaidPrice !== null ? c.gstPaidPrice.toString() : null,
                recommendedPrice: c.recommendedPrice !== undefined && c.recommendedPrice !== null ? c.recommendedPrice.toString() : null,
                capacityRating: c.capacityRating ?? null,
                phase: c.phase ?? null,
                technicalSpecifications: c.technicalSpecifications ?? null,
                parentProductId: parentId,
                sourceSheet: c.sourceSheet,
                sourceRowNumber: c.sourceRowNumber,
                updatedAt: sql`now()`,
              })
              .where(eq(products.id, existingId));

            updatedCount++;
          } else {
            await tx.insert(products).values({
              name: c.name,
              sku: c.sku,
              category: c.category,
              price: c.price.toString(),
              stockQuantity: 0,
              status: c.status || 'ACTIVE',
              brand: c.brand ?? null,
              model: c.model ?? null,
              subModel: c.subModel ?? null,
              series: c.series ?? null,
              warrantyDescription: c.warrantyDescription ?? null,
              unit: c.unit ?? 'NOS',
              moq: c.moq ?? null,
              mrp: c.mrp !== undefined && c.mrp !== null ? c.mrp.toString() : null,
              dealerPrice: c.dealerPrice !== undefined && c.dealerPrice !== null ? c.dealerPrice.toString() : null,
              partnerPrice: c.partnerPrice !== undefined && c.partnerPrice !== null ? c.partnerPrice.toString() : null,
              dtp: c.dtp !== undefined && c.dtp !== null ? c.dtp.toString() : null,
              minPrice: c.minPrice !== undefined && c.minPrice !== null ? c.minPrice.toString() : null,
              maxPrice: c.maxPrice !== undefined && c.maxPrice !== null ? c.maxPrice.toString() : null,
              priceOnRequest: c.priceOnRequest ?? false,
              basicPrice: c.basicPrice !== undefined && c.basicPrice !== null ? c.basicPrice.toString() : null,
              gstPaidPrice: c.gstPaidPrice !== undefined && c.gstPaidPrice !== null ? c.gstPaidPrice.toString() : null,
              recommendedPrice: c.recommendedPrice !== undefined && c.recommendedPrice !== null ? c.recommendedPrice.toString() : null,
              capacityRating: c.capacityRating ?? null,
              phase: c.phase ?? null,
              technicalSpecifications: c.technicalSpecifications ?? null,
              parentProductId: parentId,
              sourceSheet: c.sourceSheet,
              sourceRowNumber: c.sourceRowNumber,
            });

            insertedCount++;
          }
        }
      });
    } else {
      // Dry-run simulation counts
      for (const c of candidates) {
        if (existingSkuMap.has(c.sku)) {
          if (mode === 'skip_existing') {
            skippedCount++;
          } else {
            updatedCount++;
          }
        } else {
          insertedCount++;
        }
      }
    }

    const nowIso = new Date().toISOString();
    const batchId = `EXCEL-BATCH-${nowIso.replace(/[-:]/g, '').replace('T', '-').split('.')[0]}`;

    // Summary breakdowns
    const byBrand: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const c of candidates) {
      const b = c.brand || 'Unbranded';
      byBrand[b] = (byBrand[b] || 0) + 1;
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      const s = c.status || 'ACTIVE';
      byStatus[s] = (byStatus[s] || 0) + 1;
    }

    const durationMs = Date.now() - startTime;
    logger.info(
      `Catalogue import complete in ${durationMs}ms: inserted=${insertedCount}, updated=${updatedCount}, skipped=${skippedCount} (dryRun=${isDryRun})`
    );

    return {
      success: true,
      batchId,
      executionTimestamp: nowIso,
      durationMs,
      dryRun: isDryRun,
      mode,
      totalParsed: candidates.length,
      insertedCount,
      updatedCount,
      skippedCount,
      parentsCount: pass1Parents.length,
      childrenCount: pass2Children.length,
      byBrand,
      byCategory,
      byStatus,
      rejectedRowsCount: rejected.length,
      rejectedRows: rejected.slice(0, 20),
    };
  }

  /**
   * Import directly from in-memory Buffer
   */
  public async importFromBuffer(
    buffer: Buffer,
    options: ExcelImportOptions = {}
  ): Promise<ExcelImportResult> {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    return this.importWorkbook(wb, options);
  }

  /**
   * Import from base64 string payload
   */
  public async importFromBase64(
    base64Data: string,
    options: ExcelImportOptions = {}
  ): Promise<ExcelImportResult> {
    // Strip data URI prefix if present (e.g. data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,...)
    const cleanBase64 = base64Data.replace(/^data:.*?;base64,/, '').trim();
    const buffer = Buffer.from(cleanBase64, 'base64');
    return this.importFromBuffer(buffer, options);
  }

  /**
   * Resolve master Excel file from filesystem and import
   */
  public async importFromFile(
    customFilePath?: string,
    options: ExcelImportOptions = {}
  ): Promise<ExcelImportResult> {
    const searchPaths: string[] = [];

    if (customFilePath) {
      searchPaths.push(path.resolve(customFilePath));
    }
    if (process.env.EXCEL_SEED_FILE) {
      searchPaths.push(path.resolve(process.env.EXCEL_SEED_FILE));
    }

    const cwd = process.cwd();
    searchPaths.push(path.resolve(cwd, 'Taneja Power-1.xlsx'));
    searchPaths.push(path.resolve(cwd, '../Taneja Power-1.xlsx'));
    searchPaths.push(path.resolve(cwd, 'server/Taneja Power-1.xlsx'));
    searchPaths.push(path.resolve(cwd, 'src/database/seeds/Taneja Power-1.xlsx'));

    let foundPath: string | null = null;
    for (const p of searchPaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      throw AppError.notFound(
        `Master Excel file 'Taneja Power-1.xlsx' could not be found. Checked locations:\n${searchPaths.join('\n')}`
      );
    }

    logger.info(`Loading master catalogue Excel file from: ${foundPath}`);
    const fileBuffer = fs.readFileSync(foundPath);
    return this.importFromBuffer(fileBuffer, { ...options, filePath: foundPath });
  }
}

export const excelCatalogueImporterService = new ExcelCatalogueImporterService();
