import { sql } from 'drizzle-orm';
import { db } from '../../../database/db.js';

export class CustomerEquipmentNumberService {
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
   * Generate next sequential Asset Number atomically.
   * Format: EQ/YYYY-YY/XXXX
   * Concurrency-safe via ON CONFLICT (prefix, financial_year) DO UPDATE.
   */
  public async generateAssetNumber(date: Date = new Date(), txClient: any = db): Promise<string> {
    const numbers = await this.generateAssetNumbers(1, date, txClient);
    return numbers[0];
  }

  /**
   * Generate multiple sequential Asset Numbers atomically in a single round-trip.
   * Ensures no gaps or interleaving between batch items.
   */
  public async generateAssetNumbers(
    count: number,
    date: Date = new Date(),
    txClient: any = db
  ): Promise<string[]> {
    if (count <= 0) return [];
    const prefix = 'EQ';
    const fy = this.getFinancialYear(date);

    const result = await txClient.execute(sql`
      INSERT INTO customer_equipment_sequences (id, prefix, financial_year, current_sequence, updated_at)
      VALUES (gen_random_uuid(), ${prefix}, ${fy}, ${count}, now())
      ON CONFLICT (prefix, financial_year)
      DO UPDATE SET current_sequence = customer_equipment_sequences.current_sequence + ${count}, updated_at = now()
      RETURNING current_sequence;
    `);

    const endSeq = Number(result.rows[0]?.current_sequence || count);
    const startSeq = endSeq - count + 1;

    const assetNumbers: string[] = [];
    for (let seq = startSeq; seq <= endSeq; seq++) {
      const padded = String(seq).padStart(4, '0');
      assetNumbers.push(`${prefix}/${fy}/${padded}`);
    }

    return assetNumbers;
  }
}
