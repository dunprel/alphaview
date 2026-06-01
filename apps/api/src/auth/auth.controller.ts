import {
  Controller, Post, Get, Body, Req, Res, HttpCode, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle }     from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService }  from './auth.service';
import { RegisterDto }  from './dto/register.dto';
import { LoginDto }     from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser }  from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /v1/auth/register
  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })   // 5 registrations/min per IP
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // POST /v1/auth/verify-otp
  @Post('verify-otp')
  @Throttle({ default: { ttl: 300_000, limit: 10 } })
  async verifyOtp(@Body() dto: VerifyOtpDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.verifyOtp(dto.pinId, dto.pin, dto.userId);
  }

  // POST /v1/auth/login
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })    // brute-force protection
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto.email, dto.password, res);
  }

  // POST /v1/auth/refresh  — refreshToken sent as httpOnly cookie
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refreshToken;
    return this.authService.refresh(token, res);
  }

  // POST /v1/auth/logout
  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }

  // GET /v1/auth/me
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async me(@CurrentUser() userId: string) {
    return this.authService.me(userId);
  }

  // POST /v1/auth/forgot-password
  @Post('forgot-password')
  @Throttle({ default: { ttl: 300_000, limit: 3 } })
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  // POST /v1/auth/reset-password
  @Post('reset-password')
  async resetPassword(
    @Body('token')    token:    string,
    @Body('password') password: string,
  ) {
    return this.authService.resetPassword(token, password);
  }
}
