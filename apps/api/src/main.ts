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

let cachedServer: any;

async function bootstrap(): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter({ logger: false });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { bodyParser: false },
  );

  adapter.enableCors({
    origin: [process.env.FRONTEND_URL!],
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
  const allowedOrigin = process.env.FRONTEND_URL!;

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

  const instance = cachedServer.getHttpAdapter().getInstance();
  await instance.ready();
  instance.server.emit('request', req, res);
};
