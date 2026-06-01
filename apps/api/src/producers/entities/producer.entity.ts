import {
  Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, Index, OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('producers')
export class Producer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'studio_name', length: 255 })
  studioName: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ name: 'banner_url', type: 'text', nullable: true })
  bannerUrl: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string;

  /** AES-256 encrypted bank account number */
  @Column({ name: 'bank_account_no', type: 'text', nullable: true })
  bankAccountNo: string;

  @Column({ name: 'bank_code', length: 10, nullable: true })
  bankCode: string;

  @Column({ name: 'bank_name', length: 100, nullable: true })
  bankName: string;

  /** Last 4 digits for display only */
  @Column({ name: 'bank_account_last4', length: 4, nullable: true })
  bankAccountLast4: string;

  /** Paystack recipient_code for transfers */
  @Column({ name: 'paystack_recipient_code', length: 60, nullable: true })
  paystackRecipientCode: string;

  /** Platform commission rate (0–100). Default 20% */
  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2, default: 20 })
  commissionRate: number;

  /** Available balance in kobo */
  @Column({ name: 'earnings_balance', type: 'bigint', default: 0 })
  earningsBalance: number;

  /** All-time earnings in kobo */
  @Column({ name: 'total_earned', type: 'bigint', default: 0 })
  totalEarned: number;

  @Column({ name: 'follower_count', default: 0 })
  followerCount: number;

  @Column({ name: 'content_count', default: 0 })
  contentCount: number;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'is_suspended', default: false })
  isSuspended: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
