import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, Index, Unique,
} from 'typeorm';
import { User }    from '../../users/entities/user.entity';
import { Content } from '../../content/entities/content.entity';

export type PurchaseStatus = 'pending' | 'active' | 'expired' | 'refunded';

@Entity('purchases')
@Unique(['userId', 'contentId'])
@Index(['userId'])
@Index(['contentId'])
@Index(['status', 'expiresAt'])
export class Purchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Content, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'content_id' })
  content: Content;

  @Column({ name: 'content_id' })
  contentId: string;

  /** Amount paid in kobo */
  @Column({ name: 'amount_kobo', type: 'bigint' })
  amountKobo: number;

  @Column({ name: 'paystack_ref', length: 100, nullable: true, unique: true })
  paystackRef: string;

  @Column({ type: 'enum', enum: ['pending','active','expired','refunded'], default: 'pending' })
  status: PurchaseStatus;

  @Column({ name: 'purchased_at', type: 'timestamptz', nullable: true })
  purchasedAt: Date;

  /** purchased_at + 30 days — enforced by cron and DRM license server */
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @Column({ name: 'payment_method', length: 30, nullable: true })
  paymentMethod: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  get amountNgn(): number {
    return Math.round(this.amountKobo / 100);
  }

  get daysRemaining(): number {
    if (!this.expiresAt) return 0;
    return Math.max(0, Math.ceil((this.expiresAt.getTime() - Date.now()) / 86_400_000));
  }
}
