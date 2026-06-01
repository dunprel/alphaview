// ─── payments.module.ts ──────────────────────────────────────────────────────
import { Module }             from '@nestjs/common';
import { TypeOrmModule }      from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService }    from './payments.service';
import { PayoutsService }     from './payouts.service';
import { Purchase }           from '../purchases/entities/purchase.entity';
import { Content }            from '../content/entities/content.entity';
import { Producer }           from '../producers/entities/producer.entity';
import { Payout }             from '../common/entities';
import { User }               from '../users/entities/user.entity';
import { NotificationsModule }from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Purchase, Content, Producer, User]),
    NotificationsModule,
  ],
  controllers: [PaymentsController],
  providers:   [PaymentsService, PayoutsService],
  exports:     [PaymentsService, PayoutsService],
})
export class PaymentsModule {}

// ─── payments.controller.ts ──────────────────────────────────────────────────
import {
  Controller, Post, Get, Body, Param, Req, Res,
  UseGuards, HttpCode, Headers,
} from '@nestjs/common';
import { ApiTags }      from '@nestjs/swagger';
import { Request }      from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser }  from '../common/decorators/index';
import { Public }       from '../common/decorators/index';
import { RawBody }      from '../common/decorators/index';
import { PaymentsService } from './payments.service';
import { PayoutsService }  from './payouts.service';

@ApiTags('payments')
@Controller()
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly payoutsService:  PayoutsService,
  ) {}

  @Post('purchases/initiate')
  initiate(@Body('contentId') contentId: string, @CurrentUser() userId: string) {
    return this.paymentsService.initiatePurchase(userId, contentId);
  }

  @Post('purchases/verify/:ref')
  verify(@Param('ref') ref: string, @CurrentUser() userId: string) {
    return this.paymentsService.verifyPurchase(ref, userId);
  }

  @Get('purchases/library')
  library(@CurrentUser() userId: string) {
    return this.paymentsService.getUserLibrary(userId);
  }

  @Get('purchases/access/:contentId')
  accessStatus(@Param('contentId') contentId: string, @CurrentUser() userId: string) {
    return this.paymentsService.getAccessStatus(userId, contentId);
  }

  @Post('payments/webhook')
  @Public()
  @HttpCode(200)
  webhook(
    @Headers('x-paystack-signature') sig: string,
    @RawBody() rawBody: Buffer,
    @Body() event: any,
  ) {
    return this.paymentsService.handleWebhook(sig, rawBody, event);
  }

  @Post('producer/payouts/request')
  requestPayout(@Body('amountNgn') amountNgn: number, @CurrentUser() userId: string) {
    return this.payoutsService.requestPayout(userId, amountNgn);
  }

  @Get('producer/payouts')
  getPayouts(@CurrentUser() userId: string) {
    return this.payoutsService.getProducerPayouts(userId);
  }

  @Get('producer/balance')
  getBalance(@CurrentUser() userId: string) {
    return this.payoutsService.getBalance(userId);
  }

  @Post('producer/bank-account')
  saveBankAccount(@Body() dto: any, @CurrentUser() userId: string) {
    return this.payoutsService.saveBankAccount(userId, dto);
  }

  @Get('producer/banks')
  @Public()
  getBanks() { return this.payoutsService.getNigerianBanks(); }
}

// ─── payments.service.ts ─────────────────────────────────────────────────────
import {
  Injectable, NotFoundException, ConflictException, UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService }    from '@nestjs/config';
import * as crypto          from 'crypto';
import axios                from 'axios';
import { Purchase }         from '../purchases/entities/purchase.entity';
import { Content }          from '../content/entities/content.entity';
import { Producer }         from '../producers/entities/producer.entity';
import { User }             from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

const PAYSTACK_BASE = 'https://api.paystack.co';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Purchase)  private purchasesRepo:  Repository<Purchase>,
    @InjectRepository(Content)   private contentRepo:    Repository<Content>,
    @InjectRepository(Producer)  private producerRepo:   Repository<Producer>,
    @InjectRepository(User)      private usersRepo:      Repository<User>,
    private readonly cfg:         ConfigService,
    private readonly notify:      NotificationsService,
  ) {}

  private get paystackHeaders() {
    return { Authorization: `Bearer ${this.cfg.get('PAYSTACK_SECRET_KEY')}`, 'Content-Type': 'application/json' };
  }

  async initiatePurchase(userId: string, contentId: string) {
    const [user, content] = await Promise.all([
      this.usersRepo.findOneOrFail({ where: { id: userId } }),
      this.contentRepo.findOneOrFail({ where: { id: contentId, status: 'live' } }),
    ]);

    // Idempotency: don't allow duplicate active purchases
    const existing = await this.purchasesRepo.findOne({
      where: { userId, contentId, status: 'active' },
    });
    if (existing && existing.expiresAt > new Date()) {
      throw new ConflictException('You already have active access to this content');
    }

    const purchase = await this.purchasesRepo.save({
      userId, contentId,
      amountKobo: content.priceKobo,
      status:     'pending',
    });

    const { data } = await axios.post(`${PAYSTACK_BASE}/transaction/initialize`, {
      email:     user.email,
      amount:    content.priceKobo,
      currency:  'NGN',
      reference: purchase.id,
      channels:  ['card', 'bank', 'ussd', 'mobile_money', 'bank_transfer'],
      metadata:  { purchaseId: purchase.id, contentId, userId },
      callback_url: `${this.cfg.get('NEXT_PUBLIC_APP_URL')}/purchase/confirm?ref=${purchase.id}`,
    }, { headers: this.paystackHeaders });

    return {
      checkoutUrl: data.data.authorization_url,
      reference:   purchase.id,
      amountKobo:  content.priceKobo,
    };
  }

  async verifyPurchase(reference: string, userId: string) {
    const purchase = await this.purchasesRepo.findOne({
      where: { id: reference, userId },
      relations: ['content', 'content.producer'],
    });
    if (!purchase) throw new NotFoundException('Purchase not found');
    if (purchase.status === 'active') return purchase;

    const { data } = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
      headers: this.paystackHeaders,
    });

    if (data.data.status === 'success') {
      await this._confirmPurchase(reference, data.data.channel);
      return this.purchasesRepo.findOneOrFail({ where: { id: reference }, relations: ['content'] });
    }
    throw new BadRequestException('Payment not successful');
  }

  async handleWebhook(sig: string, rawBody: Buffer, event: any) {
    // HMAC-SHA512 signature verification
    const hash = crypto
      .createHmac('sha512', this.cfg.get('PAYSTACK_SECRET_KEY')!)
      .update(rawBody)
      .digest('hex');

    if (hash !== sig) throw new UnauthorizedException('Invalid webhook signature');

    if (event.event === 'charge.success') {
      await this._confirmPurchase(event.data.reference, event.data.channel);
    }
    if (event.event === 'transfer.success') {
      // Handled by PayoutsService
    }
    return { received: true };
  }

  async getUserLibrary(userId: string) {
    return this.purchasesRepo.find({
      where: { userId },
      relations: ['content', 'content.producer'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAccessStatus(userId: string, contentId: string) {
    const purchase = await this.purchasesRepo.findOne({
      where: { userId, contentId, status: 'active' },
      relations: ['content'],
    });
    const hasAccess    = !!purchase && purchase.expiresAt > new Date();
    const daysRemaining = hasAccess ? Math.ceil((purchase!.expiresAt.getTime() - Date.now()) / 86_400_000) : 0;
    return { hasAccess, purchase: hasAccess ? purchase : undefined, daysRemaining };
  }

  private async _confirmPurchase(purchaseId: string, channel?: string) {
    const purchase = await this.purchasesRepo.findOne({
      where: { id: purchaseId },
      relations: ['content', 'content.producer'],
    });
    if (!purchase || purchase.status === 'active') return;  // idempotency

    const now       = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.purchasesRepo.update(purchaseId, {
      status:        'active',
      purchasedAt:   now,
      expiresAt,
      paymentMethod: channel,
    });

    // Credit producer (amount minus platform commission)
    if (purchase.content?.producer) {
      const commission  = purchase.content.producer.commissionRate ?? 20;
      const producerShare = Math.floor(purchase.amountKobo * (1 - commission / 100));
      await this.producerRepo.increment({ id: purchase.content.producerId }, 'earningsBalance', producerShare);
      await this.producerRepo.increment({ id: purchase.content.producerId }, 'totalEarned',     producerShare);
    }

    // Increment content purchase count
    await this.contentRepo.increment({ id: purchase.contentId }, 'purchaseCount', 1);

    // Notify user
    this.notify.purchaseConfirmed(purchase.userId, purchase.contentId, expiresAt).catch(() => {});
  }
}
