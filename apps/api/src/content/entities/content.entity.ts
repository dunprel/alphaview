import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { Producer } from '../../producers/entities/producer.entity';

export type ContentStatus = 'draft' | 'processing' | 'review' | 'live' | 'rejected';
export type ContentType   = 'movie' | 'series' | 'documentary' | 'short';

@Entity('content')
@Index(['status'])
@Index(['producerId'])
export class Content {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Producer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'producer_id' })
  producer: Producer;

  @Column({ name: 'producer_id' })
  producerId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', array: true, default: [] })
  genre: string[];

  @Column({ type: 'enum', enum: ['movie','series','documentary','short'], default: 'movie' })
  type: ContentType;

  /** Price in kobo (NGN × 100) */
  @Column({ name: 'price_kobo', type: 'bigint' })
  priceKobo: number;

  /** S3 key path for the HLS master manifest */
  @Column({ name: 'hls_key', type: 'text', nullable: true })
  hlsKey: string;

  /** S3 key for cover thumbnail */
  @Column({ name: 'thumbnail_key', type: 'text', nullable: true })
  thumbnailKey: string;

  /** S3 key for trailer (publicly accessible) */
  @Column({ name: 'trailer_key', type: 'text', nullable: true })
  trailerKey: string;

  @Column({ type: 'enum', enum: ['draft','processing','review','live','rejected'], default: 'draft' })
  status: ContentStatus;

  @Column({ name: 'duration_mins', nullable: true })
  durationMins: number;

  @Column({ name: 'age_rating', length: 10, default: 'PG' })
  ageRating: string;

  @Column({ name: 'cast_list', type: 'text', array: true, default: [] })
  castList: string[];

  @Column({ name: 'release_date', type: 'date', nullable: true })
  releaseDate: Date;

  @Column({ name: 'view_count', type: 'bigint', default: 0 })
  viewCount: number;

  @Column({ name: 'purchase_count', default: 0 })
  purchaseCount: number;

  @Column({ name: 'avg_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  avgRating: number;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** Virtual: price in NGN (computed from priceKobo) */
  get priceNgn(): number {
    return Math.round(this.priceKobo / 100);
  }

  /** Virtual: CloudFront thumbnail URL */
  get thumbnailUrl(): string {
    if (!this.thumbnailKey) return '';
    return `${process.env.NEXT_PUBLIC_CDN_URL ?? ''}/${this.thumbnailKey}`;
  }
}
