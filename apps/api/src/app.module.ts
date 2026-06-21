import { join } from 'path';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius';
import { UserModule } from './modules/user/user.module';
import { DatabaseModule } from './database/database.module';
import { RoadmapModule } from './modules/roadmap/roadmap.module';
import { NodeModule } from './modules/node/node.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth';
import { ScalarsResolver } from './graphql/scalars.resolver';
import { APP_FILTER } from '@nestjs/core';
import { GqlHttpExceptionFilter } from './graphql/gql-http-exception.filter';

@Module({
  imports: [
    GraphQLModule.forRoot<MercuriusDriverConfig>({
      driver: MercuriusDriver,
      typePaths: [join(__dirname, '**/*.graphql')],
      definitions:
        process.env.NODE_ENV !== 'production'
          ? {
              path: join(process.cwd(), 'src/graphql.ts'),
              outputAs: 'interface',
            }
          : undefined,
      graphiql: true,
      fieldResolverEnhancers: ['filters'],
      errorFormatter: (execution, context: any) => {
        const firstError = execution.errors[0];
        const original = firstError?.originalError || firstError;
        const message = firstError?.message || 'Internal server error';

        let status = 500;
        if (original) {
          if (typeof (original as any).status === 'number') {
            status = (original as any).status;
          } else if (typeof (original as any).getStatus === 'function') {
            status = (original as any).getStatus();
          } else if (typeof (original as any).statusCode === 'number') {
            status = (original as any).statusCode;
          } else if (firstError?.extensions?.status) {
            status = Number(firstError.extensions.status);
          }
        }

        const body = JSON.stringify({
          data: null,
          error: {
            message,
            status,
          },
        });

        if (context?.reply) {
          context.reply.header('content-type', 'application/json; charset=utf-8');
          context.reply.send(body);
          return {
            statusCode: 200,
            response: {},
          };
        }

        return {
          statusCode: 200,
          response: {
            data: null,
            error: {
              message,
              status,
            },
          } as any,
        };
      },
      subscription: {
        context: (connection, request) => ({ req: request || { headers: {} }, connection }),
      },
      context: (request, reply) => ({ req: request || { headers: {} }, request, reply }),
    }),
    DatabaseModule,
    RoadmapModule,
    NodeModule,
    QuizModule,
    UserModule,
    AuthModule.forRoot({ auth }),
  ],
  providers: [ScalarsResolver, {
    provide: APP_FILTER,
    useClass: GqlHttpExceptionFilter,  
  }],
})
export class AppModule {}
