// ─── analytics.module.ts ─────────────────────────────────────────────────────
import { Module }              from '@nestjs/common';
import { MongooseModule }      from '@nestjs/mongoose';
import { TypeOrmModule }       from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService }    from './analytics.service';
import { ViewEvent, ViewEventSchema } from './schemas/view-event.schema';
import { Purchase }            from '../purchases/entities/purchase.entity';
import { Content }             from '../content/entities/content.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ViewEvent.name, schema: ViewEventSchema }]),
    TypeOrmModule.forFeature([Purchase, Content]),
  ],
  controllers: [AnalyticsController],
  providers:   [AnalyticsService],
  exports:     [AnalyticsService],
})
export class AnalyticsModule {}

// ─── schemas/view-event.schema.ts ────────────────────────────────────────────
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument }  from 'mongoose';

export type ViewEventDocument = HydratedDocument<ViewEvent>;

@Schema({
  collection: 'view_events',
  timeseries: {
    timeField:   'timestamp',
    metaField:   'contentId',
    granularity: 'seconds',
  },
  autoIndex: false,
})
export class ViewEvent extends Document {
  @Prop({ required: true })   timestamp:      Date;
  @Prop({ required: true })   contentId:      string;
  @Prop({ required: true })   producerId:     string;
  @Prop({ required: true })   userId:         string;
  @Prop({ default: 'XX' })    countryCode:    string;
  @Prop({ default: '' })      countryName:    string;
  @Prop({ default: '' })      city:           string;
  @Prop({ default: 'web' })   deviceType:     string;
  @Prop({ default: 30 })      watchSecs:      number;
  @Prop({ default: 0 })       playheadSecs:   number;
  @Prop({ default: 0 })       percentWatched: number;
  @Prop({ default: 'Auto' })  quality:        string;
  @Prop({ default: false })   isCompletion:   boolean;
}

export const ViewEventSchema = SchemaFactory.createForClass(ViewEvent);

// ─── analytics.controller.ts ─────────────────────────────────────────────────
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth }  from '@nestjs/swagger';
import { JwtAuthGuard }    from '../auth/guards/jwt-auth.guard';
import { RolesGuard }      from '../auth/guards/roles.guard';
import { Roles }           from '../common/decorators/index';
import { CurrentUser }     from '../common/decorators/index';
import { AnalyticsService} from './analytics.service';

@ApiTags('analytics')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  @Get('producer/analytics/revenue')
  @Roles('producer', 'admin')
  revenue(@CurrentUser() userId: string, @Query('range') range = '30d') {
    return this.svc.getRevenueTimeline(userId, range);
  }

  @Get('producer/analytics/countries')
  @Roles('producer', 'admin')
  countries(@CurrentUser() userId: string, @Query('range') range = '30d') {
    return this.svc.getViewsByCountry(userId, range);
  }

  @Get('producer/analytics/top-content')
  @Roles('producer', 'admin')
  topContent(@CurrentUser() userId: string, @Query('range') range = '30d') {
    return this.svc.getTopContent(userId, range);
  }

  @Get('producer/dashboard')
  @Roles('producer', 'admin')
  dashboard(@CurrentUser() userId: string) {
    return this.svc.getProducerDashboard(userId);
  }

  @Get('admin/analytics/revenue')
  @Roles('admin')
  adminRevenue(@Query('range') range = '30d') {
    return this.svc.getPlatformRevenue(range);
  }
}

// ─── analytics.service.ts ────────────────────────────────────────────────────
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model }       from 'mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }  from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as maxmind    from 'maxmind';
import { ViewEvent }   from './schemas/view-event.schema';
import { Purchase }    from '../purchases/entities/purchase.entity';
import { Content }     from '../content/entities/content.entity';

@Injectable()
export class AnalyticsService {
  private geoReader: any = null;

  constructor(
    @InjectModel(ViewEvent.name) private readonly viewModel: Model<ViewEvent>,
    @InjectRepository(Purchase) private readonly purchasesRepo: Repository<Purchase>,
    @InjectRepository(Content)  private readonly contentRepo:   Repository<Content>,
    private readonly cfg: ConfigService,
  ) {
    this._initGeo();
  }

  private async _initGeo() {
    try {
      this.geoReader = await maxmind.open('/usr/share/GeoIP/GeoLite2-Country.mmdb');
    } catch {
      // GeoIP not available in dev — that's fine
    }
  }

  /** Record a 30-second heartbeat event */
  async recordHeartbeat(data: {
    userId:    string; contentId: string; producerId: string;
    watchSecs: number; playheadSecs: number; percentWatched: number;
    quality: string; deviceType: string; ip: string;
  }) {
    let countryCode = 'NG', countryName = 'Nigeria', city = 'Unknown';

    if (this.geoReader) {
      try {
        const geo  = this.geoReader.get(data.ip);
        countryCode = geo?.country?.iso_code  ?? 'NG';
        countryName = geo?.country?.names?.en ?? 'Nigeria';
        city        = geo?.city?.names?.en    ?? 'Unknown';
      } catch { /* ignore geo errors */ }
    }

    await this.viewModel.create({
      timestamp:      new Date(),
      contentId:      data.contentId,
      producerId:     data.producerId,
      userId:         data.userId,
      countryCode,
      countryName,
      city,
      deviceType:     data.deviceType,
      watchSecs:      30,
      playheadSecs:   data.playheadSecs,
      percentWatched: data.percentWatched,
      quality:        data.quality,
      isCompletion:   data.percentWatched >= 85,
    });
  }

  /** Revenue timeline for producer dashboard */
  async getRevenueTimeline(userId: string, range: string) {
    const producer = await this._getProducerId(userId);
    if (!producer) return [];

    const since = this._rangeToDate(range);
    return this.purchasesRepo.query(`
      SELECT
        DATE_TRUNC('day', p.purchased_at)  AS day,
        SUM(p.amount_kobo) / 100           AS "revenueNgn",
        COUNT(*)::int                      AS "purchaseCount"
      FROM purchases p
      JOIN content c ON p.content_id = c.id
      WHERE c.producer_id = $1
        AND p.status = 'active'
        AND p.purchased_at >= $2
      GROUP BY 1 ORDER BY 1 ASC
    `, [producer, since]);
  }

  /** Country breakdown of views */
  async getViewsByCountry(userId: string, range: string) {
    const producer = await this._getProducerId(userId);
    if (!producer) return [];

    const since = this._rangeToDate(range);
    const flags: Record<string, string> = {
      NG:'🇳🇬', GB:'🇬🇧', US:'🇺🇸', CA:'🇨🇦', ZA:'🇿🇦',
      GH:'🇬🇭', KE:'🇰🇪', DE:'🇩🇪', FR:'🇫🇷', AU:'🇦🇺',
    };

    const results = await this.viewModel.aggregate([
      { $match: { producerId: producer, timestamp: { $gte: since } } },
      { $group: {
        _id:         '$countryCode',
        countryName: { $first: '$countryName' },
        views:       { $sum: 1 },
        watchMins:   { $sum: { $divide: ['$watchSecs', 60] } },
        completions: { $sum: { $cond: ['$isCompletion', 1, 0] } },
      }},
      { $sort: { views: -1 } },
      { $limit: 20 },
    ]);

    return results.map(r => ({
      countryCode: r._id,
      countryName: r.countryName || r._id,
      flag:        flags[r._id] ?? '🌍',
      views:       r.views,
      watchMins:   Math.round(r.watchMins),
      completions: r.completions,
    }));
  }

  /** Top performing titles for a producer */
  async getTopContent(userId: string, range: string) {
    const producer = await this._getProducerId(userId);
    if (!producer) return [];

    const since = this._rangeToDate(range);
    const raw = await this.purchasesRepo.query(`
      SELECT
        c.id          AS "contentId",
        c.title,
        c.thumbnail_key AS thumbnail,
        c.avg_rating  AS "avgRating",
        COUNT(p.id)::int      AS purchases,
        SUM(p.amount_kobo) / 100 AS "revenueNgn",
        c.view_count  AS views
      FROM content c
      LEFT JOIN purchases p
        ON p.content_id = c.id AND p.status = 'active' AND p.purchased_at >= $2
      WHERE c.producer_id = $1
        AND c.status = 'live'
      GROUP BY c.id
      ORDER BY "revenueNgn" DESC NULLS LAST
      LIMIT 10
    `, [producer, since]);

    const cdn = this.cfg.get('CLOUDFRONT_DOMAIN') ? `https://${this.cfg.get('CLOUDFRONT_DOMAIN')}` : '';
    return raw.map((r: any) => ({
      ...r,
      thumbnail: r.thumbnail ? `${cdn}/${r.thumbnail}` : '',
      revenueNgn: Number(r.revenueNgn ?? 0),
      avgRating:  Number(r.avgRating  ?? 0),
    }));
  }

  /** Producer dashboard summary */
  async getProducerDashboard(userId: string) {
    const producerId = await this._getProducerId(userId);
    if (!producerId) return null;

    const [stats, contentCount] = await Promise.all([
      this.purchasesRepo.query(`
        SELECT
          COUNT(p.id)::int              AS "totalPurchases",
          COALESCE(SUM(p.amount_kobo * (1 - pr.commission_rate / 100)) / 100, 0) AS "totalEarned",
          pr.earnings_balance / 100     AS "earningsBalance",
          pr.total_earned / 100         AS "totalEarnedAllTime",
          pr.follower_count             AS "followerCount"
        FROM producers pr
        LEFT JOIN content c ON c.producer_id = pr.id
        LEFT JOIN purchases p ON p.content_id = c.id AND p.status = 'active'
        WHERE pr.id = $1
        GROUP BY pr.id
      `, [producerId]),
      this.contentRepo.count({ where: { producerId, status: 'live' } }),
    ]);

    const s = stats[0] ?? {};
    const totalViews = await this.viewModel
      .countDocuments({ producerId })
      .exec()
      .catch(() => 0);

    return {
      earningsBalance: Number(s.earningsBalance ?? 0),
      totalEarned:     Number(s.totalEarned ?? 0),
      totalViews,
      totalPurchases:  Number(s.totalPurchases ?? 0),
      contentCount,
      followerCount:   Number(s.followerCount ?? 0),
    };
  }

  /** Platform-wide revenue for admin */
  async getPlatformRevenue(range: string) {
    const since = this._rangeToDate(range);
    return this.purchasesRepo.query(`
      SELECT
        DATE_TRUNC('day', purchased_at) AS day,
        SUM(amount_kobo) / 100          AS "revenueNgn",
        COUNT(*)::int                   AS "purchaseCount"
      FROM purchases
      WHERE status = 'active' AND purchased_at >= $1
      GROUP BY 1 ORDER BY 1 ASC
    `, [since]);
  }

  private async _getProducerId(userId: string): Promise<string | null> {
    const row = await this.purchasesRepo.manager
      .query('SELECT id FROM producers WHERE user_id = $1 LIMIT 1', [userId]);
    return row[0]?.id ?? null;
  }

  private _rangeToDate(range: string): Date {
    const now = new Date();
    const map: Record<string, number> = { '7d': 7, '30d': 30, '3m': 90, '12m': 365 };
    const days = map[range] ?? 30;
    return new Date(now.getTime() - days * 86_400_000);
  }
}
