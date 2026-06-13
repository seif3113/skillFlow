import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { databaseProvider } from 'src/database/database.provider';
import 'dotenv/config';

export const auth = betterAuth({
  database: drizzleAdapter(databaseProvider, {
    provider: 'pg',
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  advanced: {
    database: {
      generateId: 'serial',
    },
  },
  user: {
    additionalFields: {
      preferences: {
        type: 'json',
        default: {},
      },
    },
  },
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
});
