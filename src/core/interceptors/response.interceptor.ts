import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { FastifyRequest, FastifyReply } from 'fastify';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const response = ctx.getResponse<FastifyReply>();

    return next.handle().pipe(
      map((res: unknown) => {
        let message = 'Operación ejecutada con éxito';
        let data: unknown = res;

        if (res && typeof res === 'object' && !Array.isArray(res)) {
          const resObj = res as Record<string, unknown>;

          if (typeof resObj.message === 'string') {
            message = resObj.message;
          }

          if (resObj.data !== undefined) {
            data = resObj.data;
          }
        }

        return {
          statusCode: response.statusCode,
          message,
          data: data as T,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
