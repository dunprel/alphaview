// ─── content.module.ts ──────────────────────────────────────────────────────
import { Module }              from '@nestjs/common';
import { TypeOrmModule }       from '@nestjs/typeorm';
import { BullModule }          from '@nestjs/bull';
import { ContentController }   from './content.controller';
import { ContentService }      from './content.service';
import { Content }             from './entities/content.entity';
import { Purchase }            from '../purchases/entities/purchase.entity';
import { Producer }            from '../producers/entities/producer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Content, Purchase, Producer]),
    BullModule.registerQueue({ name: 'transcode' }),
  ],
  controllers: [ContentController],
  providers:   [ContentService],
  exports:     [ContentService],
})
export class ContentModule {}

// ─── content.controller.ts ──────────────────────────────────────────────────
import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth }  from '@nestjs/swagger';
import { JwtAuthGuard }   from '../auth/guards/jwt-auth.guard';
import { RolesGuard }     from '../auth/guards/roles.guard';
import { Roles }          from '../common/decorators/index';
import { Public }         from '../common/decorators/index';
import { CurrentUser }    from '../common/decorators/index';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';

@ApiTags('content')
@Controller('content')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContentController {
  constructor(private readonly svc: ContentService) {}

  @Get()          @Public()  browse(@Query() q: any)      { return this.svc.browse(q);        }
  @Get('home')    @Public()  home()                        { return this.svc.getHomeData();    }
  @Get('search')  @Public()  search(@Query('q') q: string, @Query() filters: any) { return this.svc.search(q, filters); }
  @Get('categories') @Public() categories()               { return this.svc.getCategories();  }
  @Get(':id')     @Public()  getById(@Param('id') id: string) { return this.svc.getById(id); }

  @Post()
  @Roles('producer', 'admin')
  @ApiBearerAuth()
  create(@Body() dto: CreateContentDto, @CurrentUser() userId: string) {
    return this.svc.create(dto, userId);
  }

  @Post(':id/upload-complete')
  @Roles('producer', 'admin')
  @HttpCode(204)
  notifyUploadComplete(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.svc.onUploadComplete(id, userId);
  }

  @Post(':id/thumbnail-url')
  @Roles('producer', 'admin')
  getThumbnailUrl(@Param('id') id: string, @Body('mimeType') mimeType: string) {
    return this.svc.getThumbnailUploadUrl(id, mimeType);
  }

  @Put(':id')
  @Roles('producer', 'admin')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() userId: string) {
    return this.svc.update(id, body, userId);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}

// ─── content.service.ts ─────────────────────────────────────────────────────
import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue }      from '@nestjs/bull';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { Queue }            from 'bull';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl }     from '@aws-sdk/s3-request-presigner';
import { ConfigService }    from '@nestjs/config';
import { Content }          from './entities/content.entity';
import { Producer }         from '../producers/entities/producer.entity';

@Injectable()
export class ContentService {
  private readonly s3: S3Client;

  constructor(
    @InjectRepository(Content)  private readonly repo:     Repository<Content>,
    @InjectRepository(Producer) private readonly producerRepo: Repository<Producer>,
    @InjectQueue('transcode')   private readonly queue:    Queue,
    private readonly cfg:       ConfigService,
  ) {
    this.s3 = new S3Client({ region: cfg.get('AWS_REGION', 'af-south-1') });
  }

  async browse(params: {
    page?: number; limit?: number; genre?: string;
    sort?: string; type?: string; search?: string;
  }) {
    const { page = 1, limit = 24, genre, sort = 'trending', type, search } = params;
    const where: FindOptionsWhere<Content> = { status: 'live' };
    if (genre)  where.genre  = genre as any;
    if (type)   where.type   = type  as any;
    if (search) where.title  = ILike(`%${search}%`);

    const order: any = {
      trending:   { viewCount:    'DESC' },
      newest:     { createdAt:    'DESC' },
      rating:     { avgRating:    'DESC' },
      price_asc:  { priceKobo:    'ASC'  },
      price_desc: { priceKobo:    'DESC' },
    }[sort] ?? { viewCount: 'DESC' };

    const [data, total] = await this.repo.findAndCount({
      where, order, relations: ['producer'],
      skip:  (page - 1) * limit,
      take:  limit,
    });
    return { data: data.map(this._serialize), meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async getHomeData() {
    const [featured, trending, newReleases, topNollywood, topDocumentaries] = await Promise.all([
      this.repo.find({ where: { status: 'live' }, order: { viewCount: 'DESC' }, take: 5, relations: ['producer'] }),
      this.repo.find({ where: { status: 'live' }, order: { viewCount: 'DESC' }, take: 20, relations: ['producer'] }),
      this.repo.find({ where: { status: 'live' }, order: { createdAt: 'DESC' }, take: 20, relations: ['producer'] }),
      this.repo.find({ where: { status: 'live', genre: 'Nollywood' as any }, order: { avgRating: 'DESC' }, take: 20, relations: ['producer'] }),
      this.repo.find({ where: { status: 'live', type: 'documentary' }, order: { avgRating: 'DESC' }, take: 12, relations: ['producer'] }),
    ]);
    const topProducers = await this.producerRepo.find({ where: { isVerified: true }, order: { followerCount: 'DESC' }, take: 12 });
    return {
      featured:         featured.map(this._serialize),
      trending:         trending.map(this._serialize),
      newReleases:      newReleases.map(this._serialize),
      topNollywood:     topNollywood.map(this._serialize),
      topDocumentaries: topDocumentaries.map(this._serialize),
      topProducers,
    };
  }

  async getById(id: string) {
    const c = await this.repo.findOne({ where: { id }, relations: ['producer', 'producer.user'] });
    if (!c) throw new NotFoundException('Content not found');
    const related = await this.repo.find({
      where: { status: 'live', type: c.type },
      order: { viewCount: 'DESC' }, take: 12, relations: ['producer'],
    });
    return { ...this._serialize(c), relatedContent: related.filter(r => r.id !== id).map(this._serialize) };
  }

  async search(q: string, filters: any) {
    const data = await this.repo.find({
      where: [
        { status: 'live', title: ILike(`%${q}%`) },
        { status: 'live', description: ILike(`%${q}%`) },
      ],
      relations: ['producer'], take: 40,
    });
    return data.map(this._serialize);
  }

  async getCategories() {
    return ['Nollywood','Drama','Comedy','Action','Romance','Thriller','Documentary','Family','Horror','Crime','Animation'];
  }

  async create(dto: any, userId: string) {
    const producer = await this.producerRepo.findOne({ where: { userId } });
    if (!producer) throw new ForbiddenException('Producer profile required');

    const content = await this.repo.save({
      ...dto,
      producerId: producer.id,
      status:     'draft',
      priceKobo:  Math.round(dto.priceNgn * 100),
    });

    // Generate S3 pre-signed upload URL (1 hour expiry)
    const rawKey = `raw/${content.id}.mp4`;
    const cmd    = new PutObjectCommand({
      Bucket:      this.cfg.get('S3_RAW_BUCKET'),
      Key:         rawKey,
      ContentType: dto.fileType,
    });
    const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn: 3600 });
    return { contentId: content.id, uploadUrl };
  }

  async getThumbnailUploadUrl(contentId: string, mimeType: string) {
    const thumbKey = `thumbnails/${contentId}.jpg`;
    const cmd      = new PutObjectCommand({
      Bucket:      this.cfg.get('S3_HLS_BUCKET'),
      Key:         thumbKey,
      ContentType: mimeType,
    });
    const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn: 3600 });
    await this.repo.update(contentId, { thumbnailKey: thumbKey });
    return { uploadUrl };
  }

  async onUploadComplete(contentId: string, userId: string) {
    await this.repo.update(contentId, { status: 'processing' });
    await this.queue.add('transcode', {
      contentId,
      resolutions: ['360p', '480p', '720p', '1080p'],
      encryptHls:  true,
    }, { priority: 1 });
  }

  async update(id: string, data: any, userId: string) {
    await this.repo.update(id, data);
    return this.getById(id);
  }

  async remove(id: string) {
    await this.repo.delete(id);
  }

  private _serialize(c: Content) {
    const cdn = process.env.CLOUDFRONT_DOMAIN ? `https://${process.env.CLOUDFRONT_DOMAIN}` : '';
    return {
      ...c,
      priceNgn:     Math.round((c.priceKobo ?? 0) / 100),
      thumbnailUrl: c.thumbnailKey ? `${cdn}/${c.thumbnailKey}` : '',
      trailerUrl:   c.trailerKey   ? `${cdn}/${c.trailerKey}`   : null,
    };
  }
}
