import { Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius'
import { UserModule } from './modules/user/user.module';
import { DatabaseModule } from './database/database.module';
import { RoadmapModule } from './modules/roadmap/roadmap.module';

@Module({
  imports: [
    GraphQLModule.forRoot<MercuriusDriverConfig>({
      driver: MercuriusDriver,
      autoSchemaFile: true, // code-first
      graphiql: true,       // playground
    }),
    DatabaseModule,
    RoadmapModule,
    UserModule,
  ],
})
export class AppModule {}