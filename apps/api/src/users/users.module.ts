import { Module }         from '@nestjs/common';
import { TypeOrmModule }  from '@nestjs/typeorm';
import { UsersService }   from './users.service';
import { UsersController } from './users.controller';
import { User }           from './entities/user.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers:   [UsersService],
  exports:     [UsersService],
})
export class UsersModule {}

// ─── users.service.ts ────────────────────────────────────────────────────────
// (inline to keep files compact)
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { Repository }                    from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async addDeviceToken(userId: string, token: string, platform: string) {
    const user = await this.repo.findOneOrFail({ where: { id: userId } });
    const tokens = Array.from(new Set([...(user.deviceTokens ?? []), token])).slice(-5);
    await this.repo.update(userId, { deviceTokens: tokens });
  }

  async removeDeviceToken(userId: string, token: string) {
    const user = await this.repo.findOneOrFail({ where: { id: userId } });
    await this.repo.update(userId, {
      deviceTokens: (user.deviceTokens ?? []).filter(t => t !== token),
    });
  }

  async updateProfile(userId: string, dto: { fullName?: string; avatarUrl?: string }) {
    await this.repo.update(userId, dto);
    return this.repo.findOneOrFail({ where: { id: userId } });
  }
}

// ─── users.controller.ts ─────────────────────────────────────────────────────
import {
  Controller, Get, Put, Post, Delete, Body, Param,
  UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard }  from '../auth/guards/jwt-auth.guard';
import { CurrentUser }   from '../common/decorators/index';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get('profile')
  profile(@CurrentUser() userId: string) { return this.svc.findById(userId); }

  @Put('profile')
  updateProfile(@CurrentUser() userId: string, @Body() dto: { fullName?: string; avatarUrl?: string }) {
    return this.svc.updateProfile(userId, dto);
  }

  @Post('device-token')
  @HttpCode(204)
  addDeviceToken(
    @CurrentUser()        userId:   string,
    @Body('token')        token:    string,
    @Body('platform')     platform: string,
  ) { return this.svc.addDeviceToken(userId, token, platform); }

  @Delete('device-token')
  @HttpCode(204)
  removeDeviceToken(@CurrentUser() userId: string, @Body('token') token: string) {
    return this.svc.removeDeviceToken(userId, token);
  }
}
