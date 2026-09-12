import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  refreshTokens,
  RefreshTokenEntity,
  NewRefreshTokenEntity,
} from '../../../database/schema/refreshTokens.js';

export class RefreshTokenRepository {
  async create(data: NewRefreshTokenEntity): Promise<RefreshTokenEntity> {
    const result = await db.insert(refreshTokens).values(data).returning();
    return result[0];
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenEntity | undefined> {
    const result = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);
    return result[0];
  }

  async revoke(id: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, id));
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          isNull(refreshTokens.revokedAt)
        )
      );
  }
}
