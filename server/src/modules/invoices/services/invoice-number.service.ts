import { sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';

export class InvoiceNumberService {
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
   * Generate next sequential Invoice number atomically.
   * Format: INV/YYYY-YY/XXXX
   * Safe under concurrent requests via ON CONFLICT DO UPDATE.
   */
  public async generateSalesInvoiceNumber(date: Date = new Date(), txClient: any = db): Promise<string> {
    const prefix = 'INV';
    const fy = this.getFinancialYear(date);

    const result = await txClient.execute(sql`
      INSERT INTO invoice_sequences (id, prefix, financial_year, current_sequence, updated_at)
      VALUES (gen_random_uuid(), ${prefix}, ${fy}, 1, now())
      ON CONFLICT (prefix, financial_year)
      DO UPDATE SET current_sequence = invoice_sequences.current_sequence + 1, updated_at = now()
      RETURNING current_sequence;
    `);

    const currentSeq = Number(result.rows[0]?.current_sequence || 1);
    const paddedSeq = String(currentSeq).padStart(4, '0');
    return `${prefix}/${fy}/${paddedSeq}`;
  }

  /**
   * Generate next sequential Pro Forma Invoice number atomically.
   * Format: PI/YYYY-YY/XXXX
   * Safe under concurrent requests via ON CONFLICT DO UPDATE.
   */
  public async generateProformaInvoiceNumber(date: Date = new Date(), txClient: any = db): Promise<string> {
    const prefix = 'PI';
    const fy = this.getFinancialYear(date);

    const result = await txClient.execute(sql`
      INSERT INTO invoice_sequences (id, prefix, financial_year, current_sequence, updated_at)
      VALUES (gen_random_uuid(), ${prefix}, ${fy}, 1, now())
      ON CONFLICT (prefix, financial_year)
      DO UPDATE SET current_sequence = invoice_sequences.current_sequence + 1, updated_at = now()
      RETURNING current_sequence;
    `);

    const currentSeq = Number(result.rows[0]?.current_sequence || 1);
    const paddedSeq = String(currentSeq).padStart(4, '0');
    return `${prefix}/${fy}/${paddedSeq}`;
  }
}
