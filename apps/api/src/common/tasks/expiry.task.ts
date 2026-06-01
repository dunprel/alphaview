import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService }       from '@nestjs/config';
import {
  SecretsManagerClient,
  DeleteSecretCommand,
} from '@aws-sdk/client-secrets-manager';
import { Purchase }            from '../purchases/entities/purchase.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ExpiryTask {
  private readonly log    = new Logger(ExpiryTask.name);
  private readonly sm: SecretsManagerClient;

  constructor(
    @InjectRepository(Purchase) private readonly purchasesRepo: Repository<Purchase>,
    private readonly notify:     NotificationsService,
    private readonly cfg:        ConfigService,
  ) {
    this.sm = new SecretsManagerClient({ region: cfg.get('AWS_REGION', 'af-south-1') });
  }

  /**
   * Runs every hour — expire purchases whose 30-day window has passed.
   * Also revokes download encryption keys so offline files become unplayable.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expirePurchases() {
    const now     = new Date();
    const expired = await this.purchasesRepo.find({
      where: { status: 'active', expiresAt: LessThan(now) },
      relations: ['user'],
      take: 500,   // process in batches to avoid memory spikes
    });

    if (!expired.length) return;

    for (const purchase of expired) {
      try {
        // 1. Mark purchase as expired
        await this.purchasesRepo.update(purchase.id, { status: 'expired' });

        // 2. Revoke all download keys for this purchase
        await this.purchasesRepo.manager.query(
          `UPDATE downloads SET key_revoked = true WHERE purchase_id = $1`,
          [purchase.id],
        );

        // 3. Delete AES decryption key from AWS Secrets Manager
        //    This makes any downloaded files permanently unplayable
        try {
          await this.sm.send(new DeleteSecretCommand({
            SecretId:                  `dl-${purchase.id}`,
            ForceDeleteWithoutRecovery: true,
          }));
        } catch {
          // Secret may not exist if no download was made — ignore
        }

        // 4. Notify user their access has expired
        await this.notify.accessExpired(purchase.userId, purchase.contentId);

      } catch (err) {
        this.log.error(`Failed to expire purchase ${purchase.id}:`, err);
      }
    }

    this.log.log(`Expired ${expired.length} purchases`);
  }

  /**
   * Runs daily at 10:00 AM — notify users whose access expires within 3 days.
   * Encourages re-purchase before the window closes.
   */
  @Cron('0 10 * * *')
  async notifyExpiringSoon() {
    const in3Days = new Date(Date.now() + 3 * 86_400_000);

    const expiringSoon = await this.purchasesRepo.find({
      where: {
        status:    'active',
        expiresAt: LessThan(in3Days),
      },
      take: 1000,
    });

    for (const p of expiringSoon) {
      await this.notify.expiringSoon(p.userId, p.contentId, p.expiresAt);
    }

    this.log.log(`Sent ${expiringSoon.length} expiry-soon notifications`);
  }

  /**
   * Runs every night at 01:00 AM — nightly analytics aggregation.
   * Pre-computes daily summaries into PostgreSQL for fast dashboard queries.
   */
  @Cron('0 1 * * *')
  async aggregateDailyStats() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    this.log.log(`Aggregating stats for ${yesterday.toDateString()}`);

    // This triggers the analytics service aggregation via a raw query
    await this.purchasesRepo.manager.query(`
      INSERT INTO content_daily_stats (date, content_id, producer_id, purchases, revenue_kobo)
      SELECT
        DATE($1)::date,
        c.id,
        c.producer_id,
        COUNT(p.id)::int,
        COALESCE(SUM(p.amount_kobo), 0)
      FROM content c
      LEFT JOIN purchases p
        ON p.content_id = c.id
        AND p.status = 'active'
        AND DATE(p.purchased_at) = DATE($1)
      WHERE c.status = 'live'
      GROUP BY c.id, c.producer_id
      ON CONFLICT (date, content_id) DO UPDATE
        SET purchases    = EXCLUDED.purchases,
            revenue_kobo = EXCLUDED.revenue_kobo
    `, [yesterday]);

    this.log.log('Daily stats aggregation complete');
  }
}
