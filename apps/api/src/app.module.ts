import { join } from 'path';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius';
import { UserModule } from './modules/user/user.module';
import { DatabaseModule } from './database/database.module';
import { RoadmapModule } from './modules/roadmap/roadmap.module';
import { NodeModule } from './modules/node/node.module';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth';
import { ScalarsResolver } from './graphql/scalars.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<MercuriusDriverConfig>({
      driver: MercuriusDriver,
      typePaths: ['./**/*.graphql'],
      definitions: {
        path: join(process.cwd(), 'src/graphql.ts'),
        outputAs: 'interface',
      },
      graphiql: true,
    }),
    DatabaseModule,
    RoadmapModule,
    NodeModule,
    UserModule,
    AuthModule.forRoot({ auth }),
  ],
  providers: [ScalarsResolver],
})
export class AppModule {}
