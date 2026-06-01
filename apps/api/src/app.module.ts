import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';

// ── Feature modules ──────────────────────────────────────────────────────────
import { AuthModule }          from './auth/auth.module';
import { UsersModule }         from './users/users.module';
import { ContentModule }       from './content/content.module';
import { StreamingModule }     from './streaming/streaming.module';
import { PaymentsModule }      from './payments/payments.module';
import { PurchasesModule }     from './purchases/purchases.module';
import { DownloadsModule }     from './downloads/downloads.module';
import { ProducersModule }     from './producers/producers.module';
import { AnalyticsModule }     from './analytics/analytics.module';
import { AdminModule }         from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SearchModule }        from './search/search.module';
import { HealthModule }        from './health/health.module';

@Module({
  imports: [
    // ── Configuration ────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal:  true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ── PostgreSQL (TypeORM) ──────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type:         'postgres',
        url:          cfg.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize:  cfg.get('NODE_ENV') === 'development',
        ssl:          cfg.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
        logging:      cfg.get('NODE_ENV') === 'development' ? ['error', 'warn'] : ['error'],
        poolSize:     20,
        connectTimeoutMS: 10_000,
        extra: {
          max:            20,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 2_000,
        },
      }),
    }),

    // ── MongoDB (Analytics) ───────────────────────────────────────────────────
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        uri: cfg.get('MONGODB_URI'),
      }),
    }),

    // ── Rate limiting ─────────────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        throttlers: [
          { name: 'short',  ttl: 60_000,  limit: 60  },  // 60 req / min
          { name: 'medium', ttl: 3_600_000, limit: 1000 }, // 1000 req / hour
        ],
        storage: undefined, // Uses Redis via ThrottlerStorageRedisService in ProvidersModule
      }),
    }),

    // ── Bull queues (backed by Redis) ─────────────────────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        redis: { url: cfg.get('REDIS_URL') },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail:     50,
          attempts:         3,
          backoff: { type: 'exponential', delay: 5_000 },
        },
      }),
    }),

    // ── Scheduled tasks ───────────────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Feature modules ───────────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    ContentModule,
    StreamingModule,
    PaymentsModule,
    PurchasesModule,
    DownloadsModule,
    ProducersModule,
    AnalyticsModule,
    AdminModule,
    NotificationsModule,
    SearchModule,
    HealthModule,
  ],
  providers: [
    // Global rate-limit guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
