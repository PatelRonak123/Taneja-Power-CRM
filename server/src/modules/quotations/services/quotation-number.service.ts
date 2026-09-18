import { sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { quotationSequences } from '../../../database/schema/quotations.js';

export class QuotationNumberService {
  /**
   * Determine Indian Financial Year (e.g. 2026-27 for Sep 2026, 2025-26 for Feb 2026)
   */
  public getFinancialYear(date: Date = new Date()): string {
    const month = date.getMonth(); // 0-indexed: 0 = Jan, 3 = April
    const fullYear = date.getFullYear();

    let startYear: number;
    let endYear: number;

    if (month >= 3) {
      // April (3) to December (11)
      startYear = fullYear;
      endYear = fullYear + 1;
    } else {
      // January (0) to March (2)
      startYear = fullYear - 1;
      endYear = fullYear;
    }

    const shortEndYear = endYear.toString().slice(-2);
    return `${startYear}-${shortEndYear}`;
  }

  /**
   * Generate next sequential quotation number inside an atomic database operation
   */
  public async generateQuotationNumber(
    prefix: string = 'QT',
    date: Date = new Date(),
    txClient: any = db
  ): Promise<string> {
    const fy = this.getFinancialYear(date);

    // Concurrency-safe atomic insert or update returning the incremented sequence
    const result = await txClient.execute(sql`
      INSERT INTO quotation_sequences (id, prefix, financial_year, current_sequence, created_at, updated_at)
      VALUES (gen_random_uuid(), ${prefix}, ${fy}, 1, now(), now())
      ON CONFLICT (prefix, financial_year)
      DO UPDATE SET current_sequence = quotation_sequences.current_sequence + 1, updated_at = now()
      RETURNING current_sequence;
    `);

    const currentSeq = Number(result.rows[0]?.current_sequence || 1);
    const paddedSeq = String(currentSeq).padStart(4, '0');

    return `${prefix}/${fy}/${paddedSeq}`;
  }
}
