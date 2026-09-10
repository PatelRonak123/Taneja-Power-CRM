import { eq } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import { users, UserEntity, NewUserEntity } from '../../../database/schema/users.js';

export class AuthRepository {
  async findByEmail(email: string): Promise<UserEntity | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async findById(id: string): Promise<UserEntity | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async create(user: NewUserEntity): Promise<UserEntity> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }
}
