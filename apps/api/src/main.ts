import '../env';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

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
