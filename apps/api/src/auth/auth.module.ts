// ═══════════════════════════════════════════════════════════════════════════
//  auth.module.ts
// ═══════════════════════════════════════════════════════════════════════════
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController }   from './auth.controller';
import { AuthService }      from './auth.service';
import { JwtStrategy }      from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { User }             from '../users/entities/user.entity';
import { UsersModule }      from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret:      cfg.get('JWT_SECRET'),
        signOptions: { expiresIn: cfg.get('JWT_EXPIRES_IN', '15m') },
      }),
    }),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers:   [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports:     [AuthService, JwtModule],
})
export class AuthModule {}
