// ─── health/health.module.ts ─────────────────────────────────────────────────
import { Module }          from '@nestjs/common';
import { TerminusModule }  from '@nestjs/terminus';
import { HttpModule }      from '@nestjs/axios';
import { HealthController } from './health.controller';

@Module({
  imports:     [TerminusModule, HttpModule],
  controllers: [HealthController],
})
export class HealthModule {}

// ─── health/health.controller.ts ─────────────────────────────────────────────
import { Controller, Get }          from '@nestjs/common';
import { HealthCheck, HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator }           from '@nestjs/terminus';
import { Public }                   from '../common/decorators/index';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db:     TypeOrmHealthIndicator,
    private readonly mem:    MemoryHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.mem.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }
}
