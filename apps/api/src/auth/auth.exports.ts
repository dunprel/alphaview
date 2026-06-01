// ═══════════════════════════════════════════════════════
//  dto/register.dto.ts
// ═══════════════════════════════════════════════════════
import { IsEmail, IsString, MinLength, Matches, IsEnum, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()  @MinLength(2)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^\+234[0-9]{10}$/, { message: 'Phone must be in format +234XXXXXXXXXX' })
  phone: string;

  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number'           })
  password: string;

  @IsEnum(['user', 'producer'])
  accountType: 'user' | 'producer';
}

// ═══════════════════════════════════════════════════════
//  dto/login.dto.ts
// ═══════════════════════════════════════════════════════
import { IsEmail as IsEm, IsString as IsStr, MinLength as ML } from 'class-validator';

export class LoginDto {
  @IsEm()   email:    string;
  @IsStr()  password: string;
}

// ═══════════════════════════════════════════════════════
//  dto/verify-otp.dto.ts
// ═══════════════════════════════════════════════════════
import { IsString as IS, Length, IsOptional as IO } from 'class-validator';

export class VerifyOtpDto {
  @IS()  pinId:  string;
  @IS() @Length(6, 6)  pin:    string;
  @IO() @IS()  userId?: string;
}

// ═══════════════════════════════════════════════════════
//  strategies/jwt.strategy.ts
// ═══════════════════════════════════════════════════════
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository }                  from '@nestjs/typeorm';
import { PassportStrategy }                  from '@nestjs/passport';
import { ExtractJwt, Strategy }              from 'passport-jwt';
import { ConfigService }                     from '@nestjs/config';
import { Repository }                        from 'typeorm';
import { User }                              from '../../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly cfg: ConfigService,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest:  ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:     cfg.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; role: string; email: string }) {
    const user = await this.usersRepo.findOne({ where: { id: payload.sub } });
    if (!user || user.isBanned) throw new UnauthorizedException('Account not authorised');
    return { userId: user.id, role: user.role, email: user.email };
  }
}

// ═══════════════════════════════════════════════════════
//  guards/jwt-auth.guard.ts
// ═══════════════════════════════════════════════════════
import { Injectable as GI, ExecutionContext as GEC } from '@nestjs/common';
import { AuthGuard }                                  from '@nestjs/passport';
import { Reflector }                                  from '@nestjs/core';
import { IS_PUBLIC_KEY }                              from '../common/decorators/public.decorator';

@GI()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) { super(); }

  canActivate(ctx: GEC) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(ctx);
  }
}

// ═══════════════════════════════════════════════════════
//  guards/roles.guard.ts
// ═══════════════════════════════════════════════════════
import { Injectable as RI, ExecutionContext as REC, CanActivate as RCA } from '@nestjs/common';
import { Reflector as RR }                                                from '@nestjs/core';
import { ROLES_KEY }                                                      from '../common/decorators/roles.decorator';

@RI()
export class RolesGuard implements RCA {
  constructor(private reflector: RR) {}

  canActivate(ctx: REC): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;
    const { role } = ctx.switchToHttp().getRequest().user ?? {};
    return required.includes(role);
  }
}
