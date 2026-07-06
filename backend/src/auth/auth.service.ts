import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import * as twilio from 'twilio';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private twilioClient: twilio.Twilio;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    this.twilioClient = twilio.default(
      config.get('TWILIO_ACCOUNT_SID'),
      config.get('TWILIO_AUTH_TOKEN'),
    );
  }

  async sendOtp(dto: SendOtpDto) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await this.prisma.otpCode.create({
      data: { phone: dto.phone, code, expiresAt },
    });

    try {
      const sid = this.config.get('TWILIO_ACCOUNT_SID') || '';
      if (sid && !sid.startsWith('AC_') && sid.length > 10) {
        await this.twilioClient.messages.create({
          body: `Your TaxiApp code is: ${code}. Valid for 10 minutes.`,
          from: this.config.get('TWILIO_PHONE_NUMBER'),
          to: dto.phone,
        });
      }
    } catch {
      // Twilio not configured — code returned in response for demo
    }

    return { message: 'OTP sent', code };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        phone: dto.phone,
        code: dto.code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) throw new UnauthorizedException('Invalid or expired OTP');

    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

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
