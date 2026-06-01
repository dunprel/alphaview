// ─── producers.module.ts ─────────────────────────────────────────────────────
import { Module }              from '@nestjs/common';
import { TypeOrmModule }       from '@nestjs/typeorm';
import { ProducersController } from './producers.controller';
import { ProducersService }    from './producers.service';
import { PayoutsService }      from './payouts.service';
import { Producer }            from './entities/producer.entity';
import { User }                from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Producer, User]),
    NotificationsModule,
  ],
  controllers: [ProducersController],
  providers:   [ProducersService, PayoutsService],
  exports:     [ProducersService, PayoutsService],
})
export class ProducersModule {}

// ─── producers.controller.ts ─────────────────────────────────────────────────
import {
  Controller, Get, Post, Put, Delete, Body, Param,
  Query, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth }  from '@nestjs/swagger';
import { Public }         from '../common/decorators/index';
import { JwtAuthGuard }   from '../auth/guards/jwt-auth.guard';
import { RolesGuard }     from '../auth/guards/roles.guard';
import { Roles }          from '../common/decorators/index';
import { CurrentUser }    from '../common/decorators/index';
import { ProducersService } from './producers.service';
import { PayoutsService }   from './payouts.service';

@ApiTags('producers')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProducersController {
  constructor(
    private readonly producersSvc: ProducersService,
    private readonly payoutsSvc:   PayoutsService,
  ) {}

  // ── Public producer profiles ───────────────────────────────────────────────
  @Get('producers/:id')
  @Public()
  getProfile(@Param('id') id: string) { return this.producersSvc.getProfile(id); }

  @Get('producers/:id/content')
  @Public()
  getContent(@Param('id') id: string, @Query() q: any) {
    return this.producersSvc.getProducerContent(id, q);
  }

  // ── Follow / unfollow ─────────────────────────────────────────────────────
  @Post('producers/:id/follow')
  @HttpCode(204)
  @ApiBearerAuth()
  follow(@Param('id') producerId: string, @CurrentUser() userId: string) {
    return this.producersSvc.follow(userId, producerId);
  }

  @Delete('producers/:id/follow')
  @HttpCode(204)
  @ApiBearerAuth()
  unfollow(@Param('id') producerId: string, @CurrentUser() userId: string) {
    return this.producersSvc.unfollow(userId, producerId);
  }

  // ── Producer own management ────────────────────────────────────────────────
  @Get('producer/dashboard')
  @Roles('producer', 'admin')
  @ApiBearerAuth()
  dashboard(@CurrentUser() userId: string) { return this.producersSvc.getDashboard(userId); }

  @Get('producer/content')
  @Roles('producer', 'admin')
  @ApiBearerAuth()
  myContent(@CurrentUser() userId: string, @Query() q: any) {
    return this.producersSvc.getMyContent(userId, q);
  }

  @Put('producer/profile')
  @Roles('producer', 'admin')
  @ApiBearerAuth()
  updateProfile(@CurrentUser() userId: string, @Body() dto: any) {
    return this.producersSvc.updateProfile(userId, dto);
  }

  // ── Payouts ───────────────────────────────────────────────────────────────
  @Get('producer/payouts')
  @Roles('producer', 'admin')
  @ApiBearerAuth()
  getPayouts(@CurrentUser() userId: string) { return this.payoutsSvc.getProducerPayouts(userId); }

  @Get('producer/balance')
  @Roles('producer', 'admin')
  @ApiBearerAuth()
  getBalance(@CurrentUser() userId: string) { return this.payoutsSvc.getBalance(userId); }

  @Post('producer/payouts/request')
  @Roles('producer', 'admin')
  @ApiBearerAuth()
  requestPayout(@CurrentUser() userId: string, @Body('amountNgn') amountNgn: number) {
    return this.payoutsSvc.requestPayout(userId, amountNgn);
  }

  @Post('producer/bank-account')
  @Roles('producer', 'admin')
  @ApiBearerAuth()
  saveBankAccount(@CurrentUser() userId: string, @Body() dto: any) {
    return this.payoutsSvc.saveBankAccount(userId, dto);
  }

  @Get('producer/banks')
  @Public()
  getNigerianBanks() { return this.payoutsSvc.getNigerianBanks(); }
}

// ─── producers.service.ts ────────────────────────────────────────────────────
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository }          from 'typeorm';

@Injectable()
export class ProducersService {
  constructor(
    @InjectRepository(Producer) private readonly repo: Repository<Producer>,
    @InjectRepository(User)     private readonly usersRepo: Repository<User>,
  ) {}

  async getProfile(producerId: string) {
    const p = await this.repo.findOne({ where: { id: producerId }, relations: ['user'] });
    if (!p) throw new NotFoundException('Producer not found');
    return p;
  }

  async getProducerContent(producerId: string, params: any) {
    // Delegated to content service — here we return a stub
    return { producerId, params };
  }

  async getMyContent(userId: string, params: any) {
    const producer = await this.repo.findOne({ where: { userId } });
    if (!producer) throw new NotFoundException('Producer profile not found');
    return { producerId: producer.id, params };
  }

  async getDashboard(userId: string) {
    const producer = await this.repo.findOne({ where: { userId } });
    if (!producer) throw new NotFoundException('Producer profile not found');
    return {
      earningsBalance: Math.round(producer.earningsBalance / 100),
      totalEarned:     Math.round(producer.totalEarned / 100),
      followerCount:   producer.followerCount,
      contentCount:    producer.contentCount,
      isVerified:      producer.isVerified,
    };
  }

  async updateProfile(userId: string, dto: { studioName?: string; bio?: string; bannerUrl?: string }) {
    const producer = await this.repo.findOne({ where: { userId } });
    if (!producer) throw new NotFoundException('Producer profile not found');
    await this.repo.update(producer.id, dto);
    return this.repo.findOne({ where: { id: producer.id }, relations: ['user'] });
  }

  async follow(userId: string, producerId: string) {
    await this.repo.manager.query(
      `INSERT INTO followers (user_id, producer_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, producerId],
    );
    await this.repo.increment({ id: producerId }, 'followerCount', 1);
  }

  async unfollow(userId: string, producerId: string) {
    await this.repo.manager.query(
      `DELETE FROM followers WHERE user_id = $1 AND producer_id = $2`,
      [userId, producerId],
    );
    await this.repo.decrement({ id: producerId }, 'followerCount', 1);
  }
}
