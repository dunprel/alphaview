// ─── streaming.module.ts ─────────────────────────────────────────────────────
import { Module }               from '@nestjs/common';
import { TypeOrmModule }        from '@nestjs/typeorm';
import { StreamingController }  from './streaming.controller';
import { StreamingService }     from './streaming.service';
import { Purchase }             from '../purchases/entities/purchase.entity';
import { Content }              from '../content/entities/content.entity';
import { AnalyticsModule }      from '../analytics/analytics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Purchase, Content]),
    AnalyticsModule,
  ],
  controllers: [StreamingController],
  providers:   [StreamingService],
  exports:     [StreamingService],
})
export class StreamingModule {}

// ─── streaming.controller.ts ─────────────────────────────────────────────────
import {
  Controller, Post, Get, Param, Body, Headers,
  UseGuards, HttpCode, Req, RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard }      from '../auth/guards/jwt-auth.guard';
import { CurrentUser }       from '../common/decorators/index';
import { StreamingService }  from './streaming.service';
import { Request }           from 'express';

@ApiTags('stream')
@Controller('stream')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StreamingController {
  constructor(private readonly svc: StreamingService) {}

  /** Create a playback session — verifies purchase & 30-day window */
  @Post(':contentId/session')
  createSession(
    @Param('contentId') contentId: string,
    @CurrentUser()      userId:    string,
  ) {
    return this.svc.createSession(userId, contentId);
  }

  /** Issue a DRM license (Widevine / FairPlay / PlayReady) */
  @Post(':contentId/drm-license')
  @HttpCode(200)
  async drmLicense(
    @Param('contentId')                  contentId:   string,
    @CurrentUser()                       userId:      string,
    @Headers('x-drm-type')              drmType:     string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.svc.issueDrmLicense(userId, contentId, drmType, req.rawBody!);
  }

  /** 30-second heartbeat — analytics + session keepalive */
  @Post(':contentId/heartbeat')
  @HttpCode(204)
  heartbeat(
    @Param('contentId') contentId: string,
    @CurrentUser()      userId:    string,
    @Body()             body:      any,
    @Req()              req:       Request,
  ) {
    const ip = req.ip ?? req.headers['x-forwarded-for'] as string;
    return this.svc.recordHeartbeat(userId, contentId, body, ip);
  }
}

// ─── streaming.service.ts ────────────────────────────────────────────────────
import {
  Injectable, ForbiddenException, NotFoundException, Logger,
} from '@nestjs/common';
import { InjectRepository }          from '@nestjs/typeorm';
import { Repository }                from 'typeorm';
import { ConfigService }             from '@nestjs/config';
import { getSignedUrl }              from '@aws-sdk/cloudfront-signer';
import axios                         from 'axios';
import * as crypto                   from 'crypto';
import { Purchase }                  from '../purchases/entities/purchase.entity';
import { Content }                   from '../content/entities/content.entity';
import { AnalyticsService }          from '../analytics/analytics.service';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class StreamingService {
  private readonly log = new Logger(StreamingService.name);

  constructor(
    @InjectRepository(Purchase) private readonly purchasesRepo: Repository<Purchase>,
    @InjectRepository(Content)  private readonly contentRepo:   Repository<Content>,
    private readonly cfg:        ConfigService,
    private readonly analytics:  AnalyticsService,
  ) {}

  /**
   * Verify purchase, check 30-day window, return signed HLS manifest URL
   * + DRM license server URL + forensic watermark token
   */
  async createSession(userId: string, contentId: string) {
    // 1. Verify active purchase
    const purchase = await this.purchasesRepo.findOne({
      where: { userId, contentId, status: 'active' },
    });

    if (!purchase) {
      throw new ForbiddenException('No active purchase found for this content');
    }

    const now = new Date();
    if (purchase.expiresAt < now) {
      throw new ForbiddenException(
        `Your 30-day access to this content expired on ${purchase.expiresAt.toLocaleDateString('en-NG')}. ` +
        'Please purchase again to continue watching.',
      );
    }

    // 2. Get content to build HLS URL
    const content = await this.contentRepo.findOneOrFail({ where: { id: contentId } });
    if (!content.hlsKey) throw new NotFoundException('Content is not yet processed for streaming');

    // 3. Generate signed CloudFront URL (6-hour expiry for the manifest)
    const manifestPath = `https://${this.cfg.get('CLOUDFRONT_DOMAIN')}/${content.hlsKey}`;
    const manifestUrl  = this._signCloudfrontUrl(manifestPath, 6 * 60 * 60);

    // 4. Build DRM license URL (proxied through our API for auth)
    const apiBase = this.cfg.get('NEXT_PUBLIC_API_URL') ?? 'https://api.alphaview.tv/v1';
    const drmLicenseUrl = `${apiBase}/stream/${contentId}/drm-license`;

    // 5. Forensic watermark — short hex token embedding userId
    const watermarkPayload = crypto
      .createHmac('sha256', this.cfg.get('JWT_SECRET', 'secret'))
      .update(`${userId}:${contentId}:${Date.now()}`)
      .digest('hex')
      .slice(0, 16);

    const daysRemaining = Math.max(0, Math.ceil(
      (purchase.expiresAt.getTime() - now.getTime()) / 86_400_000,
    ));

    return {
      sessionToken:    this._generateSessionToken(userId, contentId),
      manifestUrl,
      drmLicenseUrl,
      accessExpiresAt: purchase.expiresAt.toISOString(),
      daysRemaining,
      watermarkPayload,
    };
  }

  /**
   * Forward DRM license request to BuyDRM KeyOS
   * Supported systems: Widevine (Chrome/Android), FairPlay (iOS/Safari), PlayReady (Windows)
   */
  async issueDrmLicense(
    userId:     string,
    contentId:  string,
    drmType:    string,
    licenseRequest: Buffer,
  ): Promise<Buffer> {
    // Re-verify access
    const purchase = await this.purchasesRepo.findOne({
      where: { userId, contentId, status: 'active' },
    });

    if (!purchase || purchase.expiresAt < new Date()) {
      throw new ForbiddenException('DRM license denied — no active access');
    }

    const remainingSecs = Math.max(0,
      Math.floor((purchase.expiresAt.getTime() - Date.now()) / 1000),
    );

    // Build BuyDRM custom data header
    const customData = {
      contentId,
      userId,
      expirationDuration: remainingSecs,
      allowOffline:       true,
      persistenceRequired: false,
    };

    const licenseServerUrl = this.cfg.get('BUYDRM_LICENSE_URL',
      'https://wv-keyos.licensekeyserver.com/',
    );

    const { data } = await axios.post(licenseServerUrl, licenseRequest, {
      headers: {
        'Content-Type':         'application/octet-stream',
        'X-BuyDRM-KeySystem':   drmType || 'widevine',
        'X-BuyDRM-CustomData':  Buffer.from(JSON.stringify(customData)).toString('base64'),
        'Authorization':        `Basic ${this.cfg.get('BUYDRM_API_KEY')}`,
      },
      responseType: 'arraybuffer',
      timeout: 8_000,
    });

    this.log.log(`DRM license issued: user=${userId} content=${contentId} type=${drmType} remaining=${remainingSecs}s`);
    return Buffer.from(data);
  }

  /** Record a player heartbeat every 30 seconds for analytics */
  async recordHeartbeat(
    userId:    string,
    contentId: string,
    body: {
      playheadSecs:   number;
      percentWatched: number;
      quality:        string;
      deviceType:     string;
    },
    ip: string,
  ) {
    const content = await this.contentRepo.findOne({
      where: { id: contentId },
      select: ['id', 'producerId', 'durationMins'],
    });
    if (!content) return;

    await this.analytics.recordHeartbeat({
      userId,
      contentId,
      producerId:     content.producerId,
      watchSecs:      30,
      playheadSecs:   body.playheadSecs,
      percentWatched: body.percentWatched,
      quality:        body.quality,
      deviceType:     body.deviceType,
      ip,
    });

    // Increment view counter (fire-and-forget)
    this.contentRepo.increment({ id: contentId }, 'viewCount', 1).catch(() => {});
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private _signCloudfrontUrl(url: string, expiresInSeconds: number): string {
    try {
      const dateLessThan = new Date(Date.now() + expiresInSeconds * 1000);
      return getSignedUrl({
        url,
        keyPairId:  this.cfg.get('CLOUDFRONT_KEY_PAIR_ID', ''),
        privateKey: this.cfg.get('CLOUDFRONT_PRIVATE_KEY', '').replace(/\\n/g, '\n'),
        dateLessThan: dateLessThan.toISOString(),
      });
    } catch {
      return url; // fallback in dev (no CloudFront keys configured)
    }
  }

  private _generateSessionToken(userId: string, contentId: string): string {
    const payload = { userId, contentId, iat: Date.now(), exp: Date.now() + 6 * 60 * 60 * 1000 };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }
}
