import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius';
import { UserModule } from './modules/user/user.module';
import { DatabaseModule } from './database/database.module';
import { RoadmapModule } from './modules/roadmap/roadmap.module';
import { NodeModule } from './modules/node/node.module';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth';

@Module({
  imports: [
    GraphQLModule.forRoot<MercuriusDriverConfig>({
      driver: MercuriusDriver,
      autoSchemaFile: true,
      graphiql: true,
    }),
    DatabaseModule,
    RoadmapModule,
    NodeModule,
    UserModule,
    AuthModule.forRoot({ auth }),
  ],
})
export class AppModule {}
