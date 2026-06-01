// ─── admin.module.ts ─────────────────────────────────────────────────────────
import { Module }           from '@nestjs/common';
import { TypeOrmModule }    from '@nestjs/typeorm';
import { AdminController }  from './admin.controller';
import { AdminService }     from './admin.service';
import { Content }          from '../content/entities/content.entity';
import { User }             from '../users/entities/user.entity';
import { Producer }         from '../producers/entities/producer.entity';
import { Purchase }         from '../purchases/entities/purchase.entity';
import { Payout }           from '../common/entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { SearchModule }     from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Content, User, Producer, Purchase]),
    NotificationsModule,
    SearchModule,
  ],
  controllers: [AdminController],
  providers:   [AdminService],
  exports:     [AdminService],
})
export class AdminModule {}

// ─── admin.controller.ts ─────────────────────────────────────────────────────
import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth }  from '@nestjs/swagger';
import { JwtAuthGuard }   from '../auth/guards/jwt-auth.guard';
import { RolesGuard }     from '../auth/guards/roles.guard';
import { Roles }          from '../common/decorators/index';
import { CurrentUser }    from '../common/decorators/index';
import { AdminService }   from './admin.service';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  // ── Dashboard ──────────────────────────────────────────────────────────────
  @Get('dashboard/summary')
  summary() { return this.svc.getPlatformSummary(); }

  // ── Content ────────────────────────────────────────────────────────────────
  @Get('content')
  content(@Query() q: any) { return this.svc.listContent(q); }

  @Patch('content/:id/approve')
  approve(@Param('id') id: string, @CurrentUser() adminId: string) {
    return this.svc.approveContent(id, adminId);
  }

  @Patch('content/:id/reject')
  reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.svc.rejectContent(id, reason);
  }

  @Delete('content/:id')
  @HttpCode(204)
  removeContent(@Param('id') id: string) { return this.svc.removeContent(id); }

  // ── Users ──────────────────────────────────────────────────────────────────
  @Get('users')
  users(@Query() q: any) { return this.svc.listUsers(q); }

  @Patch('users/:id/ban')
  ban(@Param('id') id: string) { return this.svc.banUser(id); }

  @Patch('users/:id/unban')
  unban(@Param('id') id: string) { return this.svc.unbanUser(id); }

  // ── Producers ─────────────────────────────────────────────────────────────
  @Get('producers')
  producers(@Query() q: any) { return this.svc.listProducers(q); }

  @Patch('producers/:id/verify')
  verifyProducer(@Param('id') id: string) { return this.svc.verifyProducer(id); }

  @Patch('producers/:id/suspend')
  suspendProducer(@Param('id') id: string, @Body('reason') reason: string) {
    return this.svc.suspendProducer(id, reason);
  }

  @Patch('producers/:id/commission')
  setCommission(@Param('id') id: string, @Body('rate') rate: number) {
    return this.svc.setCommission(id, rate);
  }

  // ── Payouts ────────────────────────────────────────────────────────────────
  @Get('payouts')
  payouts(@Query() q: any) { return this.svc.listPayouts(q); }

  @Get('payouts/summary')
  payoutSummary() { return this.svc.getPayoutSummary(); }

  @Post('payouts/:id/approve')
  approvePayout(@Param('id') id: string, @CurrentUser() adminId: string) {
    return this.svc.approvePayout(id, adminId);
  }

  @Patch('payouts/:id/reject')
  rejectPayout(@Param('id') id: string, @Body('reason') reason: string) {
    return this.svc.rejectPayout(id, reason);
  }

  // ── Payments ───────────────────────────────────────────────────────────────
  @Get('transactions')
  transactions(@Query() q: any) { return this.svc.listTransactions(q); }

  @Get('transactions/recent')
  recentTransactions(@Query('limit') limit = 10) {
    return this.svc.getRecentTransactions(Number(limit));
  }
}

// ─── admin.service.ts ────────────────────────────────────────────────────────
import {
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository, ILike }   from 'typeorm';
import axios                   from 'axios';
import { ConfigService }       from '@nestjs/config';
import { Content }             from '../content/entities/content.entity';
import { User }                from '../users/entities/user.entity';
import { Producer }            from '../producers/entities/producer.entity';
import { Purchase }            from '../purchases/entities/purchase.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { SearchService }       from '../search/search.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Content)  private contentRepo:  Repository<Content>,
    @InjectRepository(User)     private usersRepo:    Repository<User>,
    @InjectRepository(Producer) private producerRepo: Repository<Producer>,
    @InjectRepository(Purchase) private purchasesRepo:Repository<Purchase>,
    private readonly notify:    NotificationsService,
    private readonly search:    SearchService,
    private readonly cfg:       ConfigService,
  ) {}

  async getPlatformSummary() {
    const [totalUsers, totalContent, pendingContent, totalProducers] = await Promise.all([
      this.usersRepo.count({ where: { role: 'user' } }),
      this.contentRepo.count({ where: { status: 'live' } }),
      this.contentRepo.count({ where: { status: 'review' } }),
      this.producerRepo.count(),
    ]);

    const [[rev], [mtd]] = await Promise.all([
      this.purchasesRepo.query(`SELECT COALESCE(SUM(amount_kobo),0)/100 AS total FROM purchases WHERE status='active'`),
      this.purchasesRepo.query(`SELECT COALESCE(SUM(amount_kobo),0)/100 AS total FROM purchases WHERE status='active' AND purchased_at >= DATE_TRUNC('month', NOW())`),
    ]);

    const [activePurchases, pendingPayouts] = await Promise.all([
      this.purchasesRepo.count({ where: { status: 'active' } }),
      this.purchasesRepo.manager.query(`SELECT COUNT(*) FROM payout_requests WHERE status='pending'`),
    ]);

    return {
      totalUsers,
      totalContent,
      pendingContent,
      totalProducers,
      revenueNgn:       Number(rev.total),
      revenueMtdNgn:    Number(mtd.total),
      activePurchases,
      pendingPayouts:   Number(pendingPayouts[0]?.count ?? 0),
    };
  }

  async listContent(params: any) {
    const { status, search, page = 1, limit = 20 } = params;
    const where: any = {};
    if (status)  where.status = status;
    if (search)  where.title  = ILike(`%${search}%`);

    const [data, total] = await this.contentRepo.findAndCount({
      where,
      relations: ['producer', 'producer.user'],
      order:     { createdAt: 'DESC' },
      skip:      (page - 1) * limit,
      take:      limit,
    });
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async approveContent(contentId: string, adminId: string) {
    const content = await this.contentRepo.findOne({
      where: { id: contentId },
      relations: ['producer'],
    });
    if (!content) throw new NotFoundException('Content not found');

    await this.contentRepo.update(contentId, {
      status:     'live',
      approvedBy: adminId,
      approvedAt: new Date(),
    });

    // Index in Elasticsearch for search
    await this.search.indexContent({ ...content, status: 'live' }).catch(() => {});

    // Notify producer their content is live
    await this.notify.contentApproved(content.producerId, contentId);

    return { message: 'Content approved and published' };
  }

  async rejectContent(contentId: string, reason: string) {
    await this.contentRepo.update(contentId, { status: 'rejected', rejectionReason: reason });
    await this.notify.contentRejected(contentId, reason);
    return { message: 'Content rejected' };
  }

  async removeContent(id: string) {
    await this.contentRepo.delete(id);
    await this.search.removeContent(id).catch(() => {});
  }

  async listUsers(params: any) {
    const { role, search, page = 1, limit = 20 } = params;
    const where: any = {};
    if (role)   where.role  = role;
    if (search) where.email = ILike(`%${search}%`);

    const [data, total] = await this.usersRepo.findAndCount({
      where, order: { createdAt: 'DESC' },
      skip: (page - 1) * limit, take: limit,
    });
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async banUser(id: string)   { await this.usersRepo.update(id, { isBanned: true  }); return { message: 'User banned' };   }
  async unbanUser(id: string) { await this.usersRepo.update(id, { isBanned: false }); return { message: 'User unbanned' }; }

  async listProducers(params: any) {
    const { search, page = 1, limit = 20 } = params;
    const [data, total] = await this.producerRepo.findAndCount({
      where:     search ? { studioName: ILike(`%${search}%`) } : {},
      relations: ['user'],
      order:     { createdAt: 'DESC' },
      skip:      (page - 1) * limit,
      take:      limit,
    });
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async verifyProducer(id: string) {
    await this.producerRepo.update(id, { isVerified: true });
    return { message: 'Producer verified' };
  }

  async suspendProducer(id: string, reason: string) {
    await this.producerRepo.update(id, { isSuspended: true });
    return { message: 'Producer suspended' };
  }

  async setCommission(id: string, rate: number) {
    if (rate < 0 || rate > 50) throw new NotFoundException('Commission rate must be 0–50%');
    await this.producerRepo.update(id, { commissionRate: rate });
    return { message: `Commission set to ${rate}%` };
  }

  async listPayouts(params: any) {
    const { status, page = 1, limit = 20 } = params;
    const rows = await this.purchasesRepo.manager.query(`
      SELECT pr.*, p.studio_name, p.bank_name, p.bank_account_last4,
             u.full_name, u.email
      FROM payout_requests pr
      JOIN producers p ON p.id = pr.producer_id
      JOIN users u ON u.id = p.user_id
      ${status ? `WHERE pr.status = '${status}'` : ''}
      ORDER BY pr.requested_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, (page - 1) * limit]);

    const [{ count }] = await this.purchasesRepo.manager.query(
      `SELECT COUNT(*) FROM payout_requests ${status ? `WHERE status='${status}'` : ''}`,
    );

    return { data: rows, meta: { total: Number(count), page: Number(page), limit: Number(limit) } };
  }

  async getPayoutSummary() {
    const [pending, pendingAmt, paidMtd] = await Promise.all([
      this.purchasesRepo.manager.query(`SELECT COUNT(*) FROM payout_requests WHERE status='pending'`),
      this.purchasesRepo.manager.query(`SELECT COALESCE(SUM(amount_kobo),0)/100 AS amt FROM payout_requests WHERE status='pending'`),
      this.purchasesRepo.manager.query(`SELECT COALESCE(SUM(amount_kobo),0)/100 AS amt FROM payout_requests WHERE status='paid' AND paid_at >= DATE_TRUNC('month',NOW())`),
    ]);
    return {
      pending:       Number(pending[0].count),
      pendingAmount: Number(pendingAmt[0].amt),
      paidMtd:       Number(paidMtd[0].amt),
    };
  }

  async approvePayout(payoutId: string, adminId: string) {
    const [payout] = await this.purchasesRepo.manager.query(
      `SELECT pr.*, p.paystack_recipient_code, p.id AS producer_id
       FROM payout_requests pr JOIN producers p ON p.id = pr.producer_id
       WHERE pr.id = $1`, [payoutId],
    );
    if (!payout) throw new NotFoundException('Payout request not found');

    // Initiate Paystack transfer
    const { data } = await axios.post('https://api.paystack.co/transfer', {
      source:    'balance',
      amount:    payout.amount_kobo,
      recipient: payout.paystack_recipient_code,
      reason:    `AlphaView TV Payout – ${payoutId}`,
      reference: payoutId,
      currency:  'NGN',
    }, {
      headers: { Authorization: `Bearer ${this.cfg.get('PAYSTACK_SECRET_KEY')}` },
    });

    await this.purchasesRepo.manager.query(
      `UPDATE payout_requests SET status='processing', transfer_ref=$1, approved_by=$2 WHERE id=$3`,
      [data.data.transfer_code, adminId, payoutId],
    );
    return { message: 'Payout approved — transfer initiated' };
  }

  async rejectPayout(payoutId: string, reason: string) {
    // Refund balance to producer
    await this.purchasesRepo.manager.query(`
      UPDATE producers SET earnings_balance = earnings_balance +
        (SELECT amount_kobo FROM payout_requests WHERE id = $1)
      WHERE id = (SELECT producer_id FROM payout_requests WHERE id = $1)
    `, [payoutId]);

    await this.purchasesRepo.manager.query(
      `UPDATE payout_requests SET status='rejected', rejection_reason=$1 WHERE id=$2`,
      [reason, payoutId],
    );
    return { message: 'Payout rejected and balance restored' };
  }

  async listTransactions(params: any) {
    const { page = 1, limit = 20 } = params;
    const [data, total] = await this.purchasesRepo.findAndCount({
      where:     { status: 'active' },
      relations: ['user', 'content'],
      order:     { purchasedAt: 'DESC' },
      skip:      (page - 1) * limit,
      take:      limit,
    });
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  async getRecentTransactions(limit: number) {
    return this.purchasesRepo.find({
      where:     { status: 'active' },
      relations: ['user', 'content'],
      order:     { purchasedAt: 'DESC' },
      take:      limit,
    });
  }
}
