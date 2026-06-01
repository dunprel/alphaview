import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToOne, OneToMany, Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export type UserRole = 'user' | 'producer' | 'admin';

@Entity('users')
@Index(['email'],   { unique: true })
@Index(['phone'],   { unique: true, where: '"phone" IS NOT NULL' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 20, nullable: true, unique: true })
  phone: string;

  @Column({ name: 'password_hash', length: 255 })
  @Exclude()
  passwordHash: string;

  @Column({ type: 'enum', enum: ['user', 'producer', 'admin'], default: 'user' })
  role: UserRole;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'is_banned', default: false })
  isBanned: boolean;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string;

  @Column({ name: 'device_tokens', type: 'text', array: true, default: [] })
  deviceTokens: string[];

  @Column({ name: 'purchase_count', default: 0 })
  purchaseCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
