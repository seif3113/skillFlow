import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DATABASE_CLIENT = 'DATABASE_CLIENT';

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

export const databaseProvider = {
  provide: DATABASE_CLIENT,
  useFactory: (): DrizzleDB => {
    const connectionString = process.env.DATABASE_URL;

    const client = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: 'require',
      prepare: false,
    });

    return drizzle(client, { schema });
  },
};
