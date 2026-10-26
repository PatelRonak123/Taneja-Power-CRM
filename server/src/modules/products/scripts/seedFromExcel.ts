import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { excelCatalogueImporterService } from '../services/excel-catalogue-importer.service.js';
import { pool } from '../../../database/db.js';
import { logger } from '../../../common/logger/logger.js';

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  let mode: 'upsert' | 'skip_existing' | 'fail_on_existing' = 'upsert';
  if (args.includes('--skip-existing')) {
    mode = 'skip_existing';
  } else if (args.includes('--fail-on-existing')) {
    mode = 'fail_on_existing';
  }

  let customFile: string | undefined;
  const fileArgIdx = args.findIndex((a) => a === '--file' || a === '-f');
  if (fileArgIdx !== -1 && args[fileArgIdx + 1]) {
    customFile = args[fileArgIdx + 1];
  }

  console.log('=====================================================');
  console.log('⚡ TANEJA POWER - AUTOMATED EXCEL CATALOGUE SEEDER ⚡');
  console.log('=====================================================');
  console.log(`Mode:    ${mode}`);
  console.log(`Dry Run: ${isDryRun}`);
  if (customFile) console.log(`File:    ${customFile}`);
  console.log('-----------------------------------------------------');

  try {
    const result = await excelCatalogueImporterService.importFromFile(customFile, {
      dryRun: isDryRun,
      mode,
    });

    console.log('\n✅ IMPORT OPERATION COMPLETED SUCCESSFULLY!');
    console.log(`Batch ID:          ${result.batchId}`);
    console.log(`Duration:          ${result.durationMs}ms`);
    console.log(`Total Parsed:      ${result.totalParsed}`);
    console.log(`Newly Inserted:    ${result.insertedCount}`);
    console.log(`Updated (Upsert):  ${result.updatedCount}`);
    console.log(`Skipped:           ${result.skippedCount}`);
    console.log(`Parent Items:      ${result.parentsCount}`);
    console.log(`Child Items:       ${result.childrenCount}`);
    console.log(`Rejected Rows:     ${result.rejectedRowsCount}`);
    console.log('\nBreakdown by Brand:');
    for (const [brand, count] of Object.entries(result.byBrand)) {
      console.log(`  - ${brand.padEnd(25)}: ${count}`);
    }
    console.log('\nBreakdown by Category:');
    for (const [cat, count] of Object.entries(result.byCategory)) {
      console.log(`  - ${cat.padEnd(25)}: ${count}`);
    }
    console.log('=====================================================\n');

    await pool.end();
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ IMPORT FAILED:', err.message || err);
    if (err.stack) console.error(err.stack);
    await pool.end();
    process.exit(1);
  }
}

const isDirectExecution =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  main();
}
