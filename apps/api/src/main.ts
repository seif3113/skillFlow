import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  )

  app.enableCors({
    origin: "http://localhost:3000",
    credentials: true,
  });

  await app.listen(3001)
}
bootstrap()