import 'reflect-metadata';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import type { AuthResult, SessionUser } from './auth.service.js';
import { OtpService } from './otp.service.js';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto.js';
import {
  exchangeSocialCode,
  socialAuthorizeUrl,
  socialMethods,
} from './social-accounts.js';
import type { SocialProvider } from './social-accounts.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtGuard } from './guards/jwt-auth.guard.js';
import { Public } from './guards/public.guard.js';
import { CsrfGuard } from '../common/guards/csrf.guard.js';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const COOKIE_PATH = '/';
const COOKIE_LAX = 'lax';
const CSRF_COOKIE = 'csrf_token';
const SOCIAL_STATE_COOKIE = 'social_state';
const SOCIAL_PROVIDER_COOKIE = 'social_provider';

type AuthResponse = {
  user: SessionUser;
  accessToken: string;
};

function setCookies(res: Response, r: AuthResult): void {
  const secure = process.env.NODE_ENV === 'production';
  res.cookie(ACCESS_COOKIE, r.accessToken, {
    httpOnly: true,
    sameSite: COOKIE_LAX,
    secure,
    path: COOKIE_PATH,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE, r.refreshToken, {
    httpOnly: true,
    sameSite: COOKIE_LAX,
    secure,
    path: COOKIE_PATH,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  res.cookie(CSRF_COOKIE, randomBytes(32).toString('base64url'), {
    httpOnly: false,
    sameSite: COOKIE_LAX,
    secure,
    path: COOKIE_PATH,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: COOKIE_PATH });
  res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
  res.clearCookie(CSRF_COOKIE, { path: COOKIE_PATH });
  res.clearCookie(SOCIAL_STATE_COOKIE, { path: COOKIE_PATH });
  res.clearCookie(SOCIAL_PROVIDER_COOKIE, { path: COOKIE_PATH });
}

function sameValue(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly otp: OtpService,
    private readonly config: ConfigService,
  ) {}

  private appUrl(): string {
    return (
      this.config.get<string>('NEXT_PUBLIC_APP_URL') ??
      this.config.get<string>('CORS_ORIGIN') ??
      ''
    );
  }

  @Get('methods')
  @Public()
  methods() {
    return {
      social: socialMethods((key) => this.config.get<string>(key)),
      phone: true,
    };
  }

  @Get('social/:provider')
  @Public()
  startSocial(
    @Param('provider') provider: string,
    @Res({ passthrough: true }) res: Response,
  ): { url: string } {
    const p = provider as SocialProvider;
    const appUrl = this.appUrl();
    const state = randomBytes(24).toString('base64url');
    const url = socialAuthorizeUrl(p, { appUrl, get: (k) => this.config.get(k) }, state);
    res.cookie(SOCIAL_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: COOKIE_LAX,
      secure: process.env.NODE_ENV === 'production',
      path: COOKIE_PATH,
      maxAge: 10 * 60 * 1000,
    });
    res.cookie(SOCIAL_PROVIDER_COOKIE, p, {
      httpOnly: true,
      sameSite: COOKIE_LAX,
      secure: process.env.NODE_ENV === 'production',
      path: COOKIE_PATH,
      maxAge: 10 * 60 * 1000,
    });
    return { url };
  }

  @Get('social/:provider/callback')
  @Public()
  async socialCallback(
    @Param('provider') provider: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const p = provider as SocialProvider;
    const cookies = (req.cookies as Record<string, string>) ?? {};
    const expectedState = cookies[SOCIAL_STATE_COOKIE];
    const expectedProvider = cookies[SOCIAL_PROVIDER_COOKIE];

    if (
      !code ||
      !state ||
      !expectedState ||
      !sameValue(state, expectedState) ||
      p !== expectedProvider
    ) {
      res.clearCookie(SOCIAL_STATE_COOKIE, { path: COOKIE_PATH });
      res.clearCookie(SOCIAL_PROVIDER_COOKIE, { path: COOKIE_PATH });
      throw new NotFoundException('Invalid social login state');
    }

    const appUrl = this.appUrl();
    const profile = await exchangeSocialCode(
      p,
      { appUrl, get: (k) => this.config.get(k) },
      code,
    );
    const r = await this.auth.socialLogin(profile, req.headers['user-agent']);
    setCookies(res, r);

    const frontendUrl = appUrl || '/';
    res.redirect(frontendUrl);
  }

  @Post('phone/send-otp')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard({ limit: 3, windowMs: 60_000 }))
  @Public()
  sendOtp(@Body() dto: SendOtpDto) {
    return this.otp.send(dto.phone);
  }

  @Post('phone/verify')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard({ limit: 5, windowMs: 60_000 }))
  @Public()
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const r = await this.otp.verify(dto.phone, dto.otp, req.headers['user-agent']);
    setCookies(res, r);
    return { user: r.user, accessToken: r.accessToken };
  }

  @Post('register')
  @UseGuards(new RateLimitGuard({ limit: 5, windowMs: 60_000 }))
  @Public()
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const r = await this.auth.register(dto, req.headers['user-agent']);
    setCookies(res, r);
    return { user: r.user, accessToken: r.accessToken };
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard({ limit: 5, windowMs: 60_000 }))
  @Public()
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const r = await this.auth.login(dto, req.headers['user-agent']);
    setCookies(res, r);
    return { user: r.user, accessToken: r.accessToken };
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(CsrfGuard, new RateLimitGuard({ limit: 10, windowMs: 60_000 }))
  @Public()
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    // The refresh token is only ever read from the HttpOnly cookie. Accepting
    // it from the body would bypass the cookie's protections entirely.
    const cookies = (req.cookies as Record<string, string>) ?? {};
    const token = cookies[REFRESH_COOKIE] ?? '';
    const r = await this.auth.refresh(token, req.headers['user-agent']);
    setCookies(res, r);
    return { user: r.user, accessToken: r.accessToken };
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtGuard, CsrfGuard)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const cookies = (req.cookies as Record<string, string>) ?? {};
    const token = cookies[REFRESH_COOKIE] ?? '';
    await this.auth.logout(token);
    clearCookies(res);
  }

  @Get('me')
  async me(@Req() req: Request): Promise<SessionUser> {
    // The global JwtGuard has already authenticated the caller.
    const user = (req as unknown as { user: { id: string } }).user;
    return this.auth.me(user.id);
  }
}
