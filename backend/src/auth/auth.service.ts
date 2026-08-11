import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // No OTP: phone number alone identifies the account, matching the app's
  // no-registration-friction guest flow — see project memory.
  async login(dto: LoginDto) {
    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          role: dto.role === 'DRIVER' ? 'DRIVER' : 'PASSENGER',
          isVerified: true,
        },
      });
    } else if (!user.isVerified) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

    const tokens = await this.generateTokens(user.id, user.phone, user.role);
    return { user, ...tokens };
  }

  async guestLogin(name?: string) {
    // Crypto-random, collision-safe id (Math.random was predictable and could
    // collide at scale, silently logging a new user into an existing guest).
    const phone = `+guest${randomBytes(6).toString('hex')}`;
    const user = await this.prisma.user.create({
      data: { phone, role: 'PASSENGER', isVerified: true, name: name || 'Guest' },
    });
    const tokens = await this.generateTokens(user.id, user.phone, user.role);
    return { user, ...tokens };
  }

  async refreshToken(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.generateTokens(user.id, user.phone, user.role);
  }

  private async generateTokens(userId: string, phone: string, role: string) {
    const payload = { sub: userId, phone, role };
    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
    });
    return { accessToken };
  }
}
