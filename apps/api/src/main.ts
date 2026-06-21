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
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      bodyParser: false,
    },
  );

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
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

// Vercel Serverless Function Handler
export default async (req: any, res: any) => {
  if (!cachedServer) {
    const app = await bootstrap();
    await app.init();
    cachedServer = app.getHttpAdapter().getInstance();
  }
  await cachedServer.ready();
  cachedServer.server.emit('request', req, res);
};
