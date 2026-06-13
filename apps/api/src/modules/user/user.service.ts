import { Inject, Injectable } from '@nestjs/common';
import { UpdateUserInput } from './dto/update-user.input';
import * as databaseProvider from '../../database/database.provider';
import { user } from './user.schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class UserService {
  constructor(
    @Inject(databaseProvider.DATABASE_CLIENT)
    private readonly db: databaseProvider.DrizzleDB,
  ) {}

  findOne(id: number) {
    return this.db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .then((rows) => rows[0]);
  }

  update(id: number, updateUserInput: UpdateUserInput) {
    return this.db
      .update(user)
      .set(updateUserInput)
      .where(eq(user.id, id))
      .returning();
  }

  remove(id: number) {
    return this.db.delete(user).where(eq(user.id, id)).returning();
  }
}
