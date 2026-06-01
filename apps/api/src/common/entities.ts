// ═══════════════════════════════════════════════════════
//  payout.entity.ts
// ═══════════════════════════════════════════════════════
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, Index,
} from 'typeorm';
import { Producer } from '../../producers/entities/producer.entity';

export type PayoutStatus = 'pending' | 'approved' | 'processing' | 'paid' | 'failed' | 'rejected';

@Entity('payout_requests')
@Index(['producerId'])
@Index(['status'])
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Producer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'producer_id' })
  producer: Producer;

  @Column({ name: 'producer_id' })
  producerId: string;

  /** Amount in kobo */
  @Column({ name: 'amount_kobo', type: 'bigint' })
  amountKobo: number;

  @Column({ type: 'enum', enum: ['pending','approved','processing','paid','failed','rejected'], default: 'pending' })
  status: PayoutStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ name: 'transfer_ref', length: 80, nullable: true })
  transferRef: string;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt: Date;

  get amountNgn(): number {
    return Math.round(this.amountKobo / 100);
  }
}

// ═══════════════════════════════════════════════════════
//  download.entity.ts
// ═══════════════════════════════════════════════════════
import {
  Entity as DownloadEntity,
  PrimaryGeneratedColumn as DPGC,
  Column as DC,
  ManyToOne as DMO,
  JoinColumn as DJC,
  CreateDateColumn as DCDC,
} from 'typeorm';
import { Purchase } from '../../purchases/entities/purchase.entity';

@DownloadEntity('downloads')
export class Download {
  @DPGC('uuid')
  id: string;

  @DMO(() => Purchase, { onDelete: 'CASCADE' })
  @DJC({ name: 'purchase_id' })
  purchase: Purchase;

  @DC({ name: 'purchase_id' })
  purchaseId: string;

  /** Device fingerprint — binds decryption key to a specific device */
  @DC({ name: 'device_id', length: 64 })
  deviceId: string;

  /** Key ID reference (actual key stored in AWS Secrets Manager) */
  @DC({ name: 'encryption_key_id', length: 100 })
  encryptionKeyId: string;

  @DC({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  /** Set to true when purchase expires — makes file unplayable */
  @DC({ name: 'key_revoked', default: false })
  keyRevoked: boolean;

  @DCDC({ name: 'downloaded_at' })
  downloadedAt: Date;
}

// ═══════════════════════════════════════════════════════
//  follower.entity.ts
// ═══════════════════════════════════════════════════════
import {
  Entity as FE, PrimaryColumn as FPC, ManyToOne as FMO,
  JoinColumn as FJC, CreateDateColumn as FCDC,
} from 'typeorm';
import { User }     from '../../users/entities/user.entity';
import { Producer as FProducer } from '../../producers/entities/producer.entity';

@FE('followers')
export class Follower {
  @FPC({ name: 'user_id' })
  userId: string;

  @FPC({ name: 'producer_id' })
  producerId: string;

  @FMO(() => User, { onDelete: 'CASCADE' })
  @FJC({ name: 'user_id' })
  user: User;

  @FMO(() => FProducer, { onDelete: 'CASCADE' })
  @FJC({ name: 'producer_id' })
  producer: FProducer;

  @FCDC({ name: 'followed_at' })
  followedAt: Date;
}
