import {
  Injectable, NestInterceptor, ExecutionContext,
  CallHandler, Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap }        from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req       = ctx.switchToHttp().getRequest();
    const res       = ctx.switchToHttp().getResponse();
    const requestId = (req.headers['x-request-id'] as string) ?? uuid();

    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    const { method, url } = req;
    const start           = Date.now();

    return next.handle().pipe(
      tap({
        next:  () => this.logger.log(
          `${method} ${url} ${res.statusCode} ${Date.now() - start}ms [${requestId}]`,
        ),
        error: (err) => this.logger.error(
          `${method} ${url} ${err?.status ?? 500} ${Date.now() - start}ms [${requestId}]`,
        ),
      }),
    );
  }
}
