import {
  Injectable, UnauthorizedException, ConflictException,
  BadRequestException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config:     ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Register ──────────────────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<{ pinId: string; userId: string }> {
    // Check uniqueness
    const exists = await this.usersRepo.findOne({
      where: [{ email: dto.email }, { phone: dto.phone }],
    });
    if (exists?.email === dto.email) throw new ConflictException('Email already registered');
    if (exists?.phone === dto.phone) throw new ConflictException('Phone number already registered');

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user (unverified)
    const user = await this.usersRepo.save({
      fullName:     dto.fullName,
      email:        dto.email,
      phone:        dto.phone,
      passwordHash,
      role:         dto.accountType === 'producer' ? 'producer' : 'user',
      isVerified:   false,
    });

    // Send OTP via Termii
    const pinId = await this.notifications.sendOtp(dto.phone);

    return { pinId, userId: user.id };
  }

  // ── Verify OTP ────────────────────────────────────────────────────────────
  async verifyOtp(pinId: string, pin: string, userId?: string): Promise<any> {
    const verified = await this.notifications.verifyOtp(pinId, pin);
    if (!verified) throw new BadRequestException('Invalid or expired OTP');

    if (userId) {
      await this.usersRepo.update(userId, { isVerified: true });
      const user = await this.usersRepo.findOneOrFail({ where: { id: userId } });
      return this.issueTokens(user);
    }
    return { verified: true };
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  async login(email: string, password: string, res: any): Promise<any> {
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) throw new UnauthorizedException('Invalid credentials');

    if (!user.isVerified) throw new UnauthorizedException('Please verify your phone number');
    if (user.isBanned)    throw new UnauthorizedException('Account suspended');

    const tokens = await this.issueTokens(user);

    // Set httpOnly refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure:   this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge:   30 * 24 * 60 * 60 * 1000, // 30 days
      path:     '/v1/auth',
    });

    return {
      accessToken:  tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id:         user.id,
        email:      user.email,
        fullName:   user.fullName,
        role:       user.role,
        avatarUrl:  user.avatarUrl,
        isVerified: user.isVerified,
      },
    };
  }

  // ── Refresh ───────────────────────────────────────────────────────────────
  async refresh(refreshToken: string, res: any): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const user = await this.usersRepo.findOneOrFail({ where: { id: payload.sub } });
      const tokens = await this.issueTokens(user);

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure:   this.config.get('NODE_ENV') === 'production',
        sameSite: 'strict',
        maxAge:   30 * 24 * 60 * 60 * 1000,
        path:     '/v1/auth',
      });

      return { accessToken: tokens.accessToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async logout(res: any): Promise<void> {
    res.clearCookie('refreshToken', { path: '/v1/auth' });
  }

  // ── Me ────────────────────────────────────────────────────────────────────
  async me(userId: string): Promise<User> {
    return this.usersRepo.findOneOrFail({ where: { id: userId } });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private async issueTokens(user: User) {
    const payload = { sub: user.id, role: user.role, email: user.email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret:    this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret:    this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d'),
      }),
    ]);

    return { accessToken, refreshToken, user };
  }
}
