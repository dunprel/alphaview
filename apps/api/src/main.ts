import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app    = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody:    true,   // needed for Paystack webhook HMAC verification
  });

  // ── Security ────────────────────────────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'"],
        styleSrc:   ["'self'", "'unsafe-inline'"],
        imgSrc:     ["'self'", 'data:', 'https://cdn.alphaview.tv'],
      },
    },
  }));

  // ── Cors ────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin:      (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(','),
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // ── Middleware ───────────────────────────────────────────────────────────────
  app.use(cookieParser());
  app.use(compression());
  app.set('trust proxy', 1);   // Required behind AWS ALB / Cloudflare

  // ── Global pipes, filters, interceptors ─────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:        true,
      forbidNonWhitelisted: true,
      transform:        true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ── API prefix ───────────────────────────────────────────────────────────────
  app.setGlobalPrefix('v1');

  // ── Swagger ──────────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('AlphaView TV API')
      .setDescription('Complete API specification for AlphaView TV streaming platform')
      .setVersion('1.0.0')
      .addBearerAuth()
      .addTag('auth')
      .addTag('content')
      .addTag('stream')
      .addTag('purchases')
      .addTag('producer')
      .addTag('admin')
      .build();

    const doc = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, doc, {
      customSiteTitle: 'AlphaView TV API Docs',
    });
    logger.log('Swagger UI at /docs');
  }

  // ── Start ─────────────────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`🚀 AlphaView TV API running on port ${port}`);
  logger.log(`📡 Environment: ${process.env.NODE_ENV}`);
}

bootstrap().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
