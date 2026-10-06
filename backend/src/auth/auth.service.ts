import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const REFRESH_BYTES = 48;
const ACCESS_TTL_DEFAULT = 900;
const REFRESH_TTL_DEFAULT = 604800;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;
const SCRYPT_SALT_LEN = 16;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;
const SCRYPT_PREFIX = 'scrypt';

function hashPassword(password: string): string {
  const salt = randomBytes(SCRYPT_SALT_LEN);
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return [
    SCRYPT_PREFIX,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join(':');
}

function verifyPassword(stored: string, password: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 6 || parts[0] !== SCRYPT_PREFIX) {
    return false;
  }
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');
  try {
    const derived = scryptSync(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: SCRYPT_MAXMEM,
    });
    return (
      derived.length === expected.length && timingSafeEqual(derived, expected)
    );
  } catch {
    return false;
  }
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface AuthResult {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
}

function hashRefresh(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function toUser(d: {
  id: string;
  email: string;
  name: string | null;
  role: string;
}): SessionUser {
  return { id: d.id, email: d.email, name: d.name, role: d.role };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(
    dto: RegisterDto,
    userAgent?: string,
  ): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: { email, passwordHash, name: dto.name?.trim() || null },
    });

    return this.issueSession(user.id, userAgent);
  }

  async login(dto: LoginDto, userAgent?: string): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const ok = verifyPassword(user.passwordHash, dto.password);

    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueSession(user.id, userAgent);
  }

  async refresh(rawToken: string, userAgent?: string): Promise<AuthResult> {
    const tokenHash = hashRefresh(rawToken);

    const record = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!record || !record.user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return this.issueSession(record.user.id, userAgent);
  }

  async logout(rawToken?: string): Promise<void> {
    if (!rawToken) {
      return;
    }

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashRefresh(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<SessionUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account no longer exists');
    }

    return toUser(user);
  }

  private async issueSession(
    userId: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const secret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const ttl = Number(
      this.config.get<string>('JWT_ACCESS_TTL') ?? ACCESS_TTL_DEFAULT,
    );

    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: 'access',
      },
      {
        secret,
        expiresIn: ttl,
        algorithm: 'HS256',
        issuer: this.config.get<string>('JWT_ISSUER') ?? 'pc-store-api',
        audience: this.config.get<string>('JWT_AUDIENCE') ?? 'pc-store-web',
      },
    );

    const refreshToken = randomBytes(REFRESH_BYTES).toString('base64url');
    const refreshTtl = Number(
      this.config.get<string>('JWT_REFRESH_TTL') ?? REFRESH_TTL_DEFAULT,
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefresh(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
        userAgent: userAgent ? userAgent.slice(0, 255) : null,
      },
    });

    return {
      user: toUser(user),
      accessToken,
      refreshToken,
    };
  }
}
