import '../env';
import { join } from 'path';
import { readFileSync } from 'fs';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

// Force Vercel Node File Trace (NFT) to bundle the GraphQL schema files
try {
  readFileSync(join(__dirname, './graphql/common.graphql'), 'utf8');
  readFileSync(join(__dirname, './modules/node/node.graphql'), 'utf8');
  readFileSync(join(__dirname, './modules/quiz/quiz.graphql'), 'utf8');
  readFileSync(join(__dirname, './modules/roadmap/roadmap.graphql'), 'utf8');
  readFileSync(join(__dirname, './modules/user/user.graphql'), 'utf8');
} catch (e) {
  // Ignored: this is only used for static analysis tracing by Vercel
}

const allowedOrigins = [process.env.WEB_URL, process.env.BETTER_AUTH_URL];

let cachedServer: any;

async function bootstrap(): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter({ logger: false });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { bodyParser: false },
  );

  if (process.env.WEB_URL)
    allowedOrigins.push(process.env.WEB_URL.replace(/\/$/, ''));
  if (process.env.FRONTEND_URL)
    allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));

  adapter.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    maxAge: 86400,
  });

  return app;
}

if (process.env.NODE_ENV !== 'production') {
  bootstrap().then(async (app) => {
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`Server running on port ${port}`);
  });
}

export default async (req: any, res: any) => {
  if (process.env.WEB_URL)
    allowedOrigins.push(process.env.WEB_URL.replace(/\/$/, ''));
  if (process.env.FRONTEND_URL)
    allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));

  const origin = req.headers.origin;
  const allowedOrigin = allowedOrigins.includes(origin)
    ? origin
    : process.env.WEB_URL?.replace(/\/$/, '') || 'http://localhost:3000';

  // Apply CORS headers manually — Fastify's middleware pipeline is bypassed on Vercel
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Accept',
  );

  // Respond to preflight immediately
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!cachedServer) {
    cachedServer = await bootstrap();
    await cachedServer.init();
  }

  console.log(process.env.WEB_URL);
  console.log(process.env.BETTER_AUTH_CALLBACK_URL);
  console.log(process.env.BETTER_AUTH_URL);
  
  const instance = cachedServer.getHttpAdapter().getInstance();
  await instance.ready();
  instance.server.emit('request', req, res);
};
