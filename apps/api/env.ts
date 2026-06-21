import { z } from 'zod';
import { config } from 'dotenv';

const envSchema = z.object({
  // Better Auth
  BETTER_AUTH_URL: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_CALLBACK_URL: z.string(),

  // Google Oauth
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  // Database
  DATABASE_URL: z.string(),
  DIRECT_DATABASE_URL: z.string(),

  // RAG URI
  RAG_URI: z.url(),

  // App
  PORT: z.string(),

  NODE_ENV: z.string(),
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}

try {
  config({ path: '.env' });
  envSchema.parse(process.env);
} catch (err) {
  if (err instanceof z.ZodError) {
    const { fieldErrors } = err.flatten();

    const errorMessage = Object.entries(fieldErrors)
      .map(([field, errors]) => (errors ? `${field}: ${errors})}` : field))
      .join('\n  ');

    throw new Error(`Missing environment variables:\n  ${errorMessage}`);
  }
}
