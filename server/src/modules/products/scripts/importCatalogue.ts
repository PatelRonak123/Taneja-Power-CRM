import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq, inArray } from 'drizzle-orm';
import { db, pool } from '../../../database/db.js';
import { products, type ProductEntity } from '../../../database/schema/products.js';
import { env } from '../../../config/env.js';
import { logger } from '../../../common/logger/logger.js';

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

export interface ImportManifest {
  importBatchId: string;
  executionTimestamp: string;
  targetDatabaseHost: string;
  targetDatabaseName: string;
  sourceArtifact: string;
  totalInputRecords: number;
  insertedCount: number;
  insertedIds: string[];
  insertedSkus: string[];
  summary: {
    byBrand: Record<string, number>;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    parentProductsCount: number;
    childProductsCount: number;
  };
}

export interface ImportOptions {
  inputFile?: string;
  reviewRegistryFile?: string;
  manifestDir?: string;
  dryRun?: boolean;
}

export class CatalogueImporter {
  private readonly defaultInputFile = 'C:/Users/Ronak/.gemini/antigravity-ide/brain/081cb349-60be-477c-a68e-1809f9554d9e/import_ready_preview_v2.json';
  private readonly defaultReviewFile = 'C:/Users/Ronak/.gemini/antigravity-ide/brain/081cb349-60be-477c-a68e-1809f9554d9e/review_required_v2.json';
  private readonly defaultManifestDir = 'C:/Users/Ronak/.gemini/antigravity-ide/brain/081cb349-60be-477c-a68e-1809f9554d9e/manifests';

  validateDataset(candidates: ImportCandidate[], reviewItems: any[]): void {
    if (!Array.isArray(candidates) || candidates.length === 0) {
      throw new Error('Import dataset is empty or invalid');
    }

    if (candidates.length !== 436) {
      throw new Error(`Expected exactly 436 import-ready candidates, received ${candidates.length}`);
    }

    // Check exclusion of review items
    const reviewSkus = new Set(reviewItems.map((r: any) => r.sku).filter(Boolean));
    for (const c of candidates) {
      if (reviewSkus.has(c.sku)) {
        throw new Error(`CRITICAL: Review-required product '${c.sku}' found in import candidate set!`);
      }
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
        throw new Error(`Candidate at index ${idx} has invalid SKU length: "${c.sku}"`);
      }

      if (skuSet.has(c.sku)) {
        throw new Error(`Duplicate SKU detected within input set: "${c.sku}"`);
      }
      skuSet.add(c.sku);

      if (!c.name || c.name.length < 2 || c.name.length > 255) {
        throw new Error(`Candidate '${c.sku}' has invalid name length: "${c.name}"`);
      }

      if (!c.category || c.category.length < 2 || c.category.length > 100) {
        throw new Error(`Candidate '${c.sku}' has invalid category: "${c.category}"`);
      }

      if (c.price === undefined || c.price === null || c.price < 0) {
        throw new Error(`Candidate '${c.sku}' has negative or invalid price: ${c.price}`);
      }

      if (c.priceOnRequest) {
        if (c.price !== 0 || c.status !== 'INACTIVE') {
          throw new Error(`Candidate '${c.sku}' is priceOnRequest=true but has price=${c.price} or status=${c.status}`);
        }
      } else {
        if (c.price <= 0 || c.status !== 'ACTIVE') {
          throw new Error(`Candidate '${c.sku}' is active product but has non-positive price: ${c.price}`);
        }
      }

      if (c.minPrice !== undefined && c.minPrice !== null && c.maxPrice !== undefined && c.maxPrice !== null) {
        if (c.minPrice > c.maxPrice) {
          throw new Error(`Candidate '${c.sku}' has minPrice (${c.minPrice}) > maxPrice (${c.maxPrice})`);
        }
      }

      if (c.parentProductSkuCandidate) {
        if (!parentCandidates.has(c.parentProductSkuCandidate)) {
          throw new Error(`Candidate '${c.sku}' references nonexistent parent SKU '${c.parentProductSkuCandidate}'`);
        }
      }

      if (!c.sourceSheet || typeof c.sourceRowNumber !== 'number') {
        throw new Error(`Candidate '${c.sku}' lacks sourceSheet or sourceRowNumber provenance`);
      }
    }
  }

  async run(options: ImportOptions = {}): Promise<ImportManifest | null> {
    const inputPath = options.inputFile || this.defaultInputFile;
    const reviewPath = options.reviewRegistryFile || this.defaultReviewFile;
    const manifestDir = options.manifestDir || this.defaultManifestDir;
    const isDryRun = Boolean(options.dryRun);

    logger.info(`Starting catalogue import process (dryRun: ${isDryRun})...`);
    logger.info(`Loading input dataset from ${inputPath}...`);

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found at: ${inputPath}`);
    }

    const candidates: ImportCandidate[] = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const reviewItems: any[] = fs.existsSync(reviewPath)
      ? JSON.parse(fs.readFileSync(reviewPath, 'utf8'))
      : [];

    this.validateDataset(candidates, reviewItems);
    logger.info(`Dataset pre-validation passed: 436 valid candidates loaded.`);

    // Check existing products in DB for conflicts or idempotency
    const incomingSkus = candidates.map((c) => c.sku);
    const existingInDb = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        price: products.price,
        sourceSheet: products.sourceSheet,
      })
      .from(products)
      .where(inArray(products.sku, incomingSkus));

    if (existingInDb.length > 0) {
      if (existingInDb.length === candidates.length) {
        logger.info(`Idempotency check: All ${candidates.length} SKUs are already present in the database.`);
        return null;
      }
      const existingConflictSkus = existingInDb.map((e) => e.sku).slice(0, 5);
      throw new Error(
        `Pre-import conflict: ${existingInDb.length} incoming SKUs already exist in database (e.g. ${existingConflictSkus.join(
          ', '
        )}). Halting to prevent partial duplicates.`
      );
    }

    logger.info(`Zero SKU collisions detected against existing database records.`);

    // Partition candidates into Parent products (Pass 1) and Child products (Pass 2)
    const pass1Parents = candidates.filter((c) => !c.parentProductSkuCandidate);
    const pass2Children = candidates.filter((c) => Boolean(c.parentProductSkuCandidate));

    logger.info(`Partitioned candidates: ${pass1Parents.length} parent products, ${pass2Children.length} child products.`);

    if (isDryRun) {
      logger.info(`Dry-run mode active. No database modifications made.`);
      return null;
    }

    // Execute atomic insertion inside transaction
    const nowIso = new Date().toISOString();
    const batchId = `CATALOGUE-BATCH-${nowIso.replace(/[-:]/g, '').replace('T', '-').split('.')[0]}`;
    const insertedRecords: Array<{ id: string; sku: string; name: string; brand?: string | null; category: string; price: number; parentProductId?: string | null; sourceSheet: string; sourceRowNumber: number }> = [];

    await db.transaction(async (tx) => {
      logger.info(`Executing Pass 1: Inserting ${pass1Parents.length} parent products...`);
      const parentSkuToIdMap = new Map<string, string>();

      // Insert parents
      for (const p of pass1Parents) {
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
          .returning({ id: products.id, sku: products.sku, name: products.name, brand: products.brand, category: products.category, price: products.price, sourceSheet: products.sourceSheet, sourceRowNumber: products.sourceRowNumber });

        parentSkuToIdMap.set(inserted.sku, inserted.id);
        insertedRecords.push({
          id: inserted.id,
          sku: inserted.sku,
          name: inserted.name,
          brand: inserted.brand,
          category: inserted.category,
          price: parseFloat(inserted.price),
          parentProductId: null,
          sourceSheet: inserted.sourceSheet!,
          sourceRowNumber: inserted.sourceRowNumber!,
        });
      }

      logger.info(`Pass 1 complete. ${pass1Parents.length} parent products inserted.`);
      logger.info(`Executing Pass 2: Inserting ${pass2Children.length} child products with resolved parent references...`);

      // Insert children with resolved parentProductId
      for (const c of pass2Children) {
        const parentId = parentSkuToIdMap.get(c.parentProductSkuCandidate!);
        if (!parentId) {
          throw new Error(`CRITICAL: Child product '${c.sku}' could not resolve parent ID for '${c.parentProductSkuCandidate}'`);
        }

        const [inserted] = await tx
          .insert(products)
          .values({
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
          })
          .returning({ id: products.id, sku: products.sku, name: products.name, brand: products.brand, category: products.category, price: products.price, sourceSheet: products.sourceSheet, sourceRowNumber: products.sourceRowNumber });

        insertedRecords.push({
          id: inserted.id,
          sku: inserted.sku,
          name: inserted.name,
          brand: inserted.brand,
          category: inserted.category,
          price: parseFloat(inserted.price),
          parentProductId: parentId,
          sourceSheet: inserted.sourceSheet!,
          sourceRowNumber: inserted.sourceRowNumber!,
        });
      }

      logger.info(`Pass 2 complete. ${pass2Children.length} child products inserted.`);
    });

    logger.info(`Database transaction committed successfully! Total inserted: ${insertedRecords.length}`);

    // Parse sanitized DB host without exposing credentials
    let dbHost = 'unknown';
    let dbName = 'unknown';
    try {
      const u = new URL(env.DATABASE_URL);
      dbHost = u.hostname;
      dbName = u.pathname.replace(/^\//, '');
    } catch (_) {}

    // Build summary counts
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

    const manifest: ImportManifest = {
      importBatchId: batchId,
      executionTimestamp: nowIso,
      targetDatabaseHost: dbHost,
      targetDatabaseName: dbName,
      sourceArtifact: path.basename(inputPath),
      totalInputRecords: candidates.length,
      insertedCount: insertedRecords.length,
      insertedIds: insertedRecords.map((r) => r.id),
      insertedSkus: insertedRecords.map((r) => r.sku),
      summary: {
        byBrand,
        byCategory,
        byStatus,
        parentProductsCount: pass1Parents.length,
        childProductsCount: pass2Children.length,
      },
    };

    // Ensure manifest directory exists and persist durable manifest
    if (!fs.existsSync(manifestDir)) {
      fs.mkdirSync(manifestDir, { recursive: true });
    }
    const manifestPath = path.join(manifestDir, `import_manifest_${nowIso.replace(/[:.]/g, '-').replace('T', '_')}.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    // Also persist inside repository manifests directory for source durability
    const repoManifestDir = path.resolve('src/modules/products/manifests');
    if (!fs.existsSync(repoManifestDir)) {
      fs.mkdirSync(repoManifestDir, { recursive: true });
    }
    const repoManifestPath = path.join(repoManifestDir, path.basename(manifestPath));
    fs.writeFileSync(repoManifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    logger.info(`Durable manifest persisted to:\n  - ${manifestPath}\n  - ${repoManifestPath}`);

    return manifest;
  }
}

// CLI Execution Entrypoint
const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  const isDryRun = process.argv.includes('--dry-run');
  const isExecute = process.argv.includes('--execute');

  if (!isDryRun && !isExecute) {
    console.error('Usage: tsx src/modules/products/scripts/importCatalogue.ts [--dry-run | --execute]');
    process.exit(1);
  }

  const importer = new CatalogueImporter();
  importer
    .run({ dryRun: isDryRun })
    .then(async (manifest) => {
      if (manifest) {
        console.log('\n--- CATALOGUE IMPORT COMPLETED SUCCESSFULLY ---');
        console.log(`Batch ID: ${manifest.importBatchId}`);
        console.log(`Inserted: ${manifest.insertedCount} products`);
        console.log(`Parent Products: ${manifest.summary.parentProductsCount}`);
        console.log(`Child Products: ${manifest.summary.childProductsCount}`);
      } else {
        console.log('\n--- DRY-RUN VALIDATION COMPLETED SUCCESSFULLY (0 DB writes) ---');
      }
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('\n--- CATALOGUE IMPORT FAILED ---');
      console.error(err);
      await pool.end();
      process.exit(1);
    });
}
