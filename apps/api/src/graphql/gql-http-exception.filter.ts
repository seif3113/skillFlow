import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { GqlExceptionFilter, GqlArgumentsHost } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { FastifyReply } from 'fastify';

@Catch(HttpException)
export class GqlHttpExceptionFilter implements GqlExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const gqlHost = GqlArgumentsHost.create(host);
    const status = exception.getStatus();
    const response = exception.getResponse();

    let message = exception.message;

    if (typeof response === 'object' && response !== null) {
      const resObj = response as any;
      if (resObj.message) {
        message = Array.isArray(resObj.message) ? resObj.message.join(', ') : String(resObj.message);
      }
    } else if (typeof response === 'string') {
      message = response;
    }

    if ((gqlHost.getType() as string) === 'graphql') {
      const gqlError = new GraphQLError(message);
      (gqlError as any).status = status;
      return gqlError;
    }

    // REST/HTTP context fallback (using Fastify reply)
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();

    if (reply && typeof reply.status === 'function') {
      reply.status(status).send({ message, status });
      return;
    }

    return exception;
  }
}
