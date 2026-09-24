import 'reflect-metadata';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import type { AuthResult, SessionUser } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtGuard } from './guards/jwt-auth.guard.js';
import { Public } from './guards/public.guard.js';
import { CsrfGuard } from '../common/guards/csrf.guard.js';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const COOKIE_PATH = '/';
const COOKIE_LAX = 'lax';
const CSRF_COOKIE = 'csrf_token';

type AuthResponse = Pick<AuthResult, 'user'>;

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
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Public()
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const r = await this.auth.register(dto, req.headers['user-agent']);
    setCookies(res, r);
    return { user: r.user };
  }

  @Post('login')
  @HttpCode(200)
  @Public()
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const r = await this.auth.login(dto, req.headers['user-agent']);
    setCookies(res, r);
    return { user: r.user };
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  @Public()
  async refresh(
    @Body('refreshToken') raw: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    let token = raw;
    if (!token) {
      token = (req.cookies as Record<string, string>)[REFRESH_COOKIE] ?? '';
    }
    const r = await this.auth.refresh(token, req.headers['user-agent']);
    setCookies(res, r);
    return { user: r.user };
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
  @UseGuards(JwtGuard)
  async me(@Req() req: Request): Promise<SessionUser> {
    const user = (req as any).user;
    if (!user) {
      return this.auth.me('');
    }
    return this.auth.me(user.id);
  }
}
