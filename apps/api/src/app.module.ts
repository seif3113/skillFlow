import { Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius'
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    GraphQLModule.forRoot<MercuriusDriverConfig>({
      driver: MercuriusDriver,
      autoSchemaFile: true, // code-first
      graphiql: true,       // playground
    }),
    UserModule,
  ],
})
export class AppModule {}