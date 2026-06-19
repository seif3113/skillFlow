import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@/database/schema';

const client = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: 'require',
  prepare: false,
});
const db = drizzle(client, { schema });

export const auth = betterAuth({
  database: drizzleAdapter(db, {
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
  session: {
    // Cache the session in a short-lived signed cookie so the per-request auth
    // guard reads it from the cookie instead of hitting the DB every time.
    // Cuts a DB round-trip off every GraphQL request.
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: ['http://localhost:3000'],
});
