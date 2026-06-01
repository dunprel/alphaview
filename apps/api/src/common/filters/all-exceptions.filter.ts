// ═══════════════════════════════════════════════════════
//  all-exceptions.filter.ts
// ═══════════════════════════════════════════════════════
import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException,
  HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx     = host.switchToHttp();
    const res     = ctx.getResponse<Response>();
    const req     = ctx.getRequest<Request>();

    const status  = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? (exception.getResponse() as any)?.message ?? exception.message
      : 'Internal server error';

    // Report 5xx to Sentry
    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url} → ${status}`, (exception as any)?.stack);
      if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(exception);
      }
    }

    res.status(status).json({
      statusCode: status,
      message:    Array.isArray(message) ? message[0] : message,
      timestamp:  new Date().toISOString(),
      path:       req.url,
      requestId:  req.headers['x-request-id'],
    });
  }
}

// ═══════════════════════════════════════════════════════
//  logging.interceptor.ts
// ═══════════════════════════════════════════════════════
import {
  Injectable, NestInterceptor, ExecutionContext,
  CallHandler, Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap }        from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req  = ctx.switchToHttp().getRequest();
    const res  = ctx.switchToHttp().getResponse();

    // Attach request ID
    const requestId = (req.headers['x-request-id'] as string) ?? uuidv4();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    const start = Date.now();
    const { method, url } = req;

    return next.handle().pipe(
      tap({
        next:  () => this.logger.log(`${method} ${url} ${res.statusCode} ${Date.now() - start}ms [${requestId}]`),
        error: () => this.logger.error(`${method} ${url} ERR ${Date.now() - start}ms [${requestId}]`),
      }),
    );
  }
}
