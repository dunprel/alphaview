// ─── downloads.module.ts ─────────────────────────────────────────────────────
import { Module }            from '@nestjs/common';
import { TypeOrmModule }     from '@nestjs/typeorm';
import { DownloadsController } from './downloads.controller';
import { DownloadsService }  from './downloads.service';
import { Purchase }          from '../purchases/entities/purchase.entity';
import { Content }           from '../content/entities/content.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([Purchase, Content])],
  controllers: [DownloadsController],
  providers:   [DownloadsService],
  exports:     [DownloadsService],
})
export class DownloadsModule {}

// ─── downloads.controller.ts ─────────────────────────────────────────────────
import {
  Controller, Post, Get, Delete, Body, Param, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard }   from '../auth/guards/jwt-auth.guard';
import { CurrentUser }    from '../common/decorators/index';
import { DownloadsService } from './downloads.service';

@ApiTags('downloads')
@Controller('downloads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DownloadsController {
  constructor(private readonly svc: DownloadsService) {}

  @Post(':contentId/authorise')
  authorise(
    @Param('contentId') contentId: string,
    @CurrentUser()      userId:    string,
    @Body('deviceId')   deviceId:  string,
  ) { return this.svc.authoriseDownload(userId, contentId, deviceId); }

  @Get(':keyId/key')
  getKey(@Param('keyId') keyId: string, @CurrentUser() userId: string) {
    return this.svc.getDownloadKey(keyId, userId);
  }

  @Get()
  list(@CurrentUser() userId: string) { return this.svc.listDownloads(userId); }

  @Delete(':contentId')
  @HttpCode(204)
  revoke(@Param('contentId') contentId: string, @CurrentUser() userId: string) {
    return this.svc.revokeDownload(userId, contentId);
  }
}

// ─── downloads.service.ts ────────────────────────────────────────────────────
import {
  Injectable, ForbiddenException, NotFoundException, Logger,
} from '@nestjs/common';
import { InjectRepository }  from '@nestjs/typeorm';
import { Repository }        from 'typeorm';
import { ConfigService }     from '@nestjs/config';
import {
  SecretsManagerClient,
  PutSecretValueCommand,
  GetSecretValueCommand,
  DeleteSecretCommand,
} from '@aws-sdk/client-secrets-manager';
import { getSignedUrl }      from '@aws-sdk/cloudfront-signer';
import * as crypto           from 'crypto';
import { Purchase }          from '../purchases/entities/purchase.entity';
import { Content }           from '../content/entities/content.entity';

@Injectable()
export class DownloadsService {
  private readonly log = new Logger(DownloadsService.name);
  private readonly sm:  SecretsManagerClient;

  constructor(
    @InjectRepository(Purchase) private readonly purchasesRepo: Repository<Purchase>,
    @InjectRepository(Content)  private readonly contentRepo:   Repository<Content>,
    private readonly cfg: ConfigService,
  ) {
    this.sm = new SecretsManagerClient({ region: cfg.get('AWS_REGION', 'af-south-1') });
  }

  /**
   * Authorise a download:
   * 1. Verify active purchase & 30-day window
   * 2. Generate AES-256 device-specific key
   * 3. Store key in AWS Secrets Manager (with expiry tag)
   * 4. Return signed segment URLs + key fetch URL
   */
  async authoriseDownload(userId: string, contentId: string, deviceId: string) {
    const purchase = await this.purchasesRepo.findOne({
      where: { userId, contentId, status: 'active' },
      relations: ['content'],
    });

    if (!purchase || purchase.expiresAt < new Date()) {
      throw new ForbiddenException('No active purchase — download not permitted');
    }

    const content = purchase.content ?? await this.contentRepo.findOneOrFail({ where: { id: contentId } });
    if (!content.hlsKey) throw new NotFoundException('Content is not yet ready for download');

    // Generate a 256-bit AES key tied to this device
    const encKey  = crypto.randomBytes(32);
    const keyId   = `dl-${purchase.id}-${deviceId.slice(0, 8)}`;

    // Store key in Secrets Manager — deleted by ExpiryTask when purchase expires
    await this.sm.send(new PutSecretValueCommand({
      SecretId:    keyId,
      SecretString: encKey.toString('hex'),
    }));

    // Record download in DB
    await this.purchasesRepo.manager.query(
      `INSERT INTO downloads (purchase_id, device_id, encryption_key_id, expires_at, key_revoked)
       VALUES ($1, $2, $3, $4, false)
       ON CONFLICT (purchase_id, device_id) DO UPDATE
         SET encryption_key_id = EXCLUDED.encryption_key_id,
             expires_at        = EXCLUDED.expires_at,
             key_revoked       = false`,
      [purchase.id, deviceId, keyId, purchase.expiresAt],
    );

    // Generate signed CloudFront URLs for each HLS segment (360p for offline)
    const segmentBase = `https://${this.cfg.get('CLOUDFRONT_DOMAIN')}/${content.hlsKey.replace('master.m3u8', '360p')}`;
    const segments    = await this._getHlsSegmentList(segmentBase);

    return {
      keyId,
      expiresAt:   purchase.expiresAt.toISOString(),
      keyFetchUrl: `/v1/downloads/${keyId}/key`,
      segments,
    };
  }

  /**
   * Mobile app calls this on EVERY offline playback attempt.
   * Returns 403 if key has been revoked (30-day window expired).
   */
  async getDownloadKey(keyId: string, userId: string) {
    // Check DB record
    const [row] = await this.purchasesRepo.manager.query(
      `SELECT d.*, p.user_id FROM downloads d
       JOIN purchases p ON p.id = d.purchase_id
       WHERE d.encryption_key_id = $1`, [keyId],
    );

    if (!row)          throw new NotFoundException('Download record not found');
    if (row.user_id !== userId) throw new ForbiddenException('Access denied');
    if (row.key_revoked || new Date(row.expires_at) < new Date()) {
      throw new ForbiddenException('Download access has expired — please re-purchase to watch offline');
    }

    // Fetch key from Secrets Manager
    const secret = await this.sm.send(new GetSecretValueCommand({ SecretId: keyId }));
    return { key: secret.SecretString, expiresAt: row.expires_at };
  }

  async listDownloads(userId: string) {
    return this.purchasesRepo.manager.query(
      `SELECT d.*, c.title, c.thumbnail_key, c.price_kobo, p.expires_at AS "purchaseExpiresAt"
       FROM downloads d
       JOIN purchases p ON p.id = d.purchase_id
       JOIN content   c ON c.id = p.content_id
       WHERE p.user_id = $1
       ORDER BY d.downloaded_at DESC`, [userId],
    );
  }

  async revokeDownload(userId: string, contentId: string) {
    const [row] = await this.purchasesRepo.manager.query(
      `SELECT d.encryption_key_id FROM downloads d
       JOIN purchases p ON p.id = d.purchase_id
       WHERE p.user_id = $1 AND p.content_id = $2`, [userId, contentId],
    );
    if (!row) return;

    await this.purchasesRepo.manager.query(
      `UPDATE downloads SET key_revoked = true
       FROM purchases p
       WHERE downloads.purchase_id = p.id AND p.user_id = $1 AND p.content_id = $2`,
      [userId, contentId],
    );

    try {
      await this.sm.send(new DeleteSecretCommand({
        SecretId: row.encryption_key_id, ForceDeleteWithoutRecovery: true,
      }));
    } catch { /* already deleted */ }
  }

  private async _getHlsSegmentList(baseUrl: string): Promise<string[]> {
    // In production: fetch the 360p playlist and return signed URLs for each .ts segment
    // Simplified: return placeholder
    const cdn = this.cfg.get('CLOUDFRONT_DOMAIN');
    const keyPairId  = this.cfg.get('CLOUDFRONT_KEY_PAIR_ID', '');
    const privateKey = this.cfg.get('CLOUDFRONT_PRIVATE_KEY', '').replace(/\\n/g, '\n');
    if (!keyPairId || !privateKey) return [baseUrl];

    // Sign the base URL valid for 48 hours (enough to download)
    const dateLessThan = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const signedUrl = getSignedUrl({ url: baseUrl, keyPairId, privateKey, dateLessThan });
    return [signedUrl];
  }
}
