import { sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';

export class SalesOrderNumberService {
  /**
   * Determine Indian Financial Year (e.g. 2026-27 for Sep 2026, 2025-26 for Feb 2026)
   */
  public getFinancialYear(date: Date = new Date()): string {
    const month = date.getMonth();
    const fullYear = date.getFullYear();
    let startYear: number;
    let endYear: number;

    if (month >= 3) {
      startYear = fullYear;
      endYear = fullYear + 1;
    } else {
      startYear = fullYear - 1;
      endYear = fullYear;
    }

    const shortEndYear = endYear.toString().slice(-2);
    return `${startYear}-${shortEndYear}`;
  }

  /**
   * Generate next sequential SO number atomically.
   * Format: SO/YYYY-YY/XXXX
   * Safe under concurrent requests via ON CONFLICT DO UPDATE.
   */
  public async generateNumber(date: Date = new Date(), txClient: any = db): Promise<string> {
    const prefix = 'SO';
    const fy = this.getFinancialYear(date);

    const result = await txClient.execute(sql`
      INSERT INTO sales_order_sequences (id, prefix, financial_year, current_sequence, updated_at)
      VALUES (gen_random_uuid(), ${prefix}, ${fy}, 1, now())
      ON CONFLICT (prefix, financial_year)
      DO UPDATE SET current_sequence = sales_order_sequences.current_sequence + 1, updated_at = now()
      RETURNING current_sequence;
    `);

    const currentSeq = Number(result.rows[0]?.current_sequence || 1);
    const paddedSeq = String(currentSeq).padStart(4, '0');
    return `${prefix}/${fy}/${paddedSeq}`;
  }
}
