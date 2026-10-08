import {
  createRemoteJWKSet,
  jwtVerify,
  SignJWT,
  importPKCS8,
} from 'jose';

export type SocialProvider = 'google' | 'facebook' | 'apple';

export interface SocialProfile {
  provider: SocialProvider;
  providerId: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
}

export interface SocialConfig {
  appUrl: string;
  get: (key: string) => string | undefined;
}

const JWT_ALG = 'ES256';

function providerLabel(provider: SocialProvider): string {
  if (provider === 'google') return 'Google';
  if (provider === 'facebook') return 'Facebook';
  return 'Apple';
}

export function isSocialConfigured(
  provider: SocialProvider,
  get: (key: string) => string | undefined,
): boolean {
  switch (provider) {
    case 'google':
      return Boolean(get('GOOGLE_CLIENT_ID') && get('GOOGLE_CLIENT_SECRET'));
    case 'facebook':
      return Boolean(
        get('FACEBOOK_APP_ID') && get('FACEBOOK_APP_SECRET'),
      );
    case 'apple':
      return Boolean(
        get('APPLE_CLIENT_ID') &&
          get('APPLE_TEAM_ID') &&
          get('APPLE_KEY_ID') &&
          get('APPLE_PRIVATE_KEY'),
      );
  }
}

export function socialMethods(
  get: (key: string) => string | undefined,
): Array<{ provider: SocialProvider; label: string; ready: boolean }> {
  const providers: SocialProvider[] = ['google', 'facebook', 'apple'];
  return providers.map((provider) => ({
    provider,
    label: providerLabel(provider),
    ready: isSocialConfigured(provider, get),
  }));
}

function callbackUrl(config: SocialConfig, provider: SocialProvider): string {
  return `${config.appUrl}/api/v1/auth/social/${provider}/callback`;
}

export function socialAuthorizeUrl(
  provider: SocialProvider,
  config: SocialConfig,
  state: string,
): string {
  const { get } = config;
  switch (provider) {
    case 'google': {
      const clientId = get('GOOGLE_CLIENT_ID') ?? '';
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', callbackUrl(config, provider));
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', 'openid email profile');
      url.searchParams.set('state', state);
      url.searchParams.set('prompt', 'select_account');
      return url.toString();
    }
    case 'facebook': {
      const appId = get('FACEBOOK_APP_ID') ?? '';
      const url = new URL('https://www.facebook.com/v19.0/dialog/oauth');
      url.searchParams.set('client_id', appId);
      url.searchParams.set('redirect_uri', callbackUrl(config, provider));
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', 'email public_profile');
      url.searchParams.set('state', state);
      return url.toString();
    }
    case 'apple': {
      const clientId = get('APPLE_CLIENT_ID') ?? '';
      const url = new URL('https://appleid.apple.com/auth/authorize');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', callbackUrl(config, provider));
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', 'name email');
      url.searchParams.set('state', state);
      url.searchParams.set('response_mode', 'query');
      return url.toString();
    }
  }
}

async function exchangeGoogle(
  config: SocialConfig,
  code: string,
): Promise<SocialProfile> {
  const { get } = config;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: get('GOOGLE_CLIENT_ID') ?? '',
      client_secret: get('GOOGLE_CLIENT_SECRET') ?? '',
      redirect_uri: callbackUrl(config, 'google'),
      grant_type: 'authorization_code',
    }),
  });
  const tokenBody = (await tokenRes.json()) as {
    id_token?: string;
    error?: string;
  };
  if (!tokenRes.ok || !tokenBody.id_token) {
    throw new Error(`Google token exchange failed: ${tokenBody.error ?? tokenRes.status}`);
  }

  const jwks = createRemoteJWKSet(
    new URL('https://www.googleapis.com/oauth2/v3/certs'),
  );
  const { payload } = await jwtVerify(tokenBody.id_token, jwks, {
    audience: get('GOOGLE_CLIENT_ID') ?? '',
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
  });

  const email = typeof payload.email === 'string' ? payload.email : undefined;
  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  if (!sub) throw new Error('Google id_token missing sub');
  return {
    provider: 'google',
    providerId: sub,
    email,
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    avatarUrl:
      typeof payload.picture === 'string' ? payload.picture : undefined,
  };
}

async function exchangeFacebook(
  config: SocialConfig,
  code: string,
): Promise<SocialProfile> {
  const { get } = config;
  const appId = get('FACEBOOK_APP_ID') ?? '';
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: appId,
        client_secret: get('FACEBOOK_APP_SECRET') ?? '',
        redirect_uri: callbackUrl(config, 'facebook'),
        code,
      }),
  );
  const tokenBody = (await tokenRes.json()) as {
    access_token?: string;
    error?: { message?: string };
  };
  if (!tokenRes.ok || !tokenBody.access_token) {
    throw new Error(
      `Facebook token exchange failed: ${tokenBody.error?.message ?? tokenRes.status}`,
    );
  }

  const meRes = await fetch(
    `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(
      tokenBody.access_token,
    )}`,
  );
  const me = (await meRes.json()) as {
    id?: string;
    name?: string;
    email?: string;
    picture?: { data?: { url?: string } };
  };
  if (!meRes.ok || !me.id) {
    throw new Error('Facebook profile fetch failed');
  }
  return {
    provider: 'facebook',
    providerId: me.id,
    email: me.email,
    emailVerified: Boolean(me.email),
    name: me.name,
    avatarUrl: me.picture?.data?.url,
  };
}

async function appleClientSecret(config: SocialConfig): Promise<string> {
  const { get } = config;
  const pem = (get('APPLE_PRIVATE_KEY') ?? '').replace(/\\n/g, '\n');
  const key = await importPKCS8(pem, JWT_ALG);
  return new SignJWT({})
    .setIssuer(get('APPLE_TEAM_ID') ?? '')
    .setSubject(get('APPLE_CLIENT_ID') ?? '')
    .setAudience('https://appleid.apple.com')
    .setIssuedAt()
    .setExpirationTime('5m')
    .setProtectedHeader({ alg: JWT_ALG, kid: get('APPLE_KEY_ID') ?? '' })
    .sign(key);
}

async function exchangeApple(
  config: SocialConfig,
  code: string,
): Promise<SocialProfile> {
  const { get } = config;
  const clientId = get('APPLE_CLIENT_ID') ?? '';
  const clientSecret = await appleClientSecret(config);

  const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const tokenBody = (await tokenRes.json()) as {
    id_token?: string;
    error?: string;
  };
  if (!tokenRes.ok || !tokenBody.id_token) {
    throw new Error(`Apple token exchange failed: ${tokenBody.error ?? tokenRes.status}`);
  }

  const jwks = createRemoteJWKSet(
    new URL('https://appleid.apple.com/auth/keys'),
  );
  const { payload } = await jwtVerify(tokenBody.id_token, jwks, {
    audience: clientId,
    issuer: 'https://appleid.apple.com',
  });

  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  if (!sub) throw new Error('Apple id_token missing sub');
  const email = typeof payload.email === 'string' ? payload.email : undefined;
  let name: string | undefined;
  const nameClaim = payload.name as { firstName?: string; lastName?: string } | undefined;
  if (nameClaim && typeof nameClaim === 'object') {
    name =
      [nameClaim.firstName, nameClaim.lastName].filter(Boolean).join(' ') ||
      undefined;
  }
  return {
    provider: 'apple',
    providerId: sub,
    email,
    emailVerified: Boolean(email),
    name,
  };
}

export async function exchangeSocialCode(
  provider: SocialProvider,
  config: SocialConfig,
  code: string,
): Promise<SocialProfile> {
  switch (provider) {
    case 'google':
      return exchangeGoogle(config, code);
    case 'facebook':
      return exchangeFacebook(config, code);
    case 'apple':
      return exchangeApple(config, code);
  }
}