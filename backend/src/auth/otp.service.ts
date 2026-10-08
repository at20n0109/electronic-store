import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService, AuthResult } from './auth.service.js';

const OTP_TTL_MS = 5 * 60 * 1000;
const COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function normalizePhone(raw: string): string {
  let p = raw.trim().replace(/[^\d+]/g, '');
  if (p.startsWith('+')) return p;
  if (p.startsWith('0')) return `+84${p.slice(1)}`;
  if (p.length === 9 || p.length === 10 || p.length === 11) {
    return `+84${p}`;
  }
  return `+${p}`;
}

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {}

  private async deliverSms(phone: string, code: string): Promise<void> {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const from = this.config.get<string>('TWILIO_FROM');

    if (sid && token && from) {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          },
          body: new URLSearchParams({
            To: phone,
            From: from,
            Body: `PC Store: mã xác thực của bạn là ${code}. Có hiệu lực 5 phút. Không chia sẻ mã này cho ai.`,
          }),
        },
      );
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Twilio send failed (${res.status}): ${body.slice(0, 200)}`);
      }
      return;
    }

    const allowMock = this.config.get<string>('ALLOW_MOCK_OTP') === '1';
    if (allowMock) return;
    throw new ServiceUnavailableException(
      'SMS provider chưa được cấu hình (TWILIO_*)',
    );
  }

  async send(phoneRaw: string): Promise<{ ok: true; debugCode?: string }> {
    const phone = normalizePhone(phoneRaw);

    const recent = await this.prisma.otp.findFirst({
      where: { phone, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (recent && Date.now() - recent.createdAt.getTime() < COOLDOWN_MS) {
throw new HttpException(
        'Vui lòng chờ 30 giây trước khi yêu cầu mã mới',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = String(randomInt(100000, 1000000));
    const isMock =
      !this.config.get<string>('TWILIO_ACCOUNT_SID') &&
      this.config.get<string>('ALLOW_MOCK_OTP') === '1';

    await this.deliverSms(phone, code);

    await this.prisma.otp.deleteMany({ where: { phone } });
    await this.prisma.otp.create({
      data: {
        phone,
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    const debugCode = isMock ? code : undefined;
    return { ok: true, debugCode };
  }

  async verify(
    phoneRaw: string,
    code: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    const phone = normalizePhone(phoneRaw);
    const normalizedCode = code.trim();

    const otp = await this.prisma.otp.findFirst({
      where: { phone, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Mã xác thực không hợp lệ hoặc đã hết hạn');
    }
    if (otp.attempts >= MAX_ATTEMPTS) {
      await this.prisma.otp.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      });
      throw new HttpException(
        'Quá nhiều lần thử. Vui lòng gửi mã mới.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const expected = Buffer.from(otp.codeHash, 'hex');
    const actual = Buffer.from(hashCode(normalizedCode), 'hex');
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      await this.prisma.otp.update({
        where: { id: otp.id },
        data: { attempts: otp.attempts + 1 },
      });
      throw new BadRequestException('Mã xác thực không đúng');
    }

    await this.prisma.otp.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (!existing) {
      const email = `p${phone.replace(/[^\d]/g, '')}@phone.local`;
      await this.prisma.user.create({
        data: {
          email,
          phone,
          phoneVerified: true,
          authProvider: 'phone',
        },
      });
    } else if (!existing.phoneVerified) {
      await this.prisma.user.update({
        where: { id: existing.id },
        data: { phoneVerified: true },
      });
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { phone },
    });
    return this.auth.loginAs(user.id, userAgent);
  }
}

