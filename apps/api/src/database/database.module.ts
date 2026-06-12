import { Global, Module } from '@nestjs/common';
import { databaseProvider } from './database.provider';

/**
 * Exports DATABASE_CLIENT so any feature module can inject the Drizzle instance.
 */
@Global()
@Module({
  providers: [databaseProvider],
  exports: [databaseProvider],
})
export class DatabaseModule {}
