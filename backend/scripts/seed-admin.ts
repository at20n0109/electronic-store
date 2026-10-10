/**
 * Idempotent admin bootstrap.
 *
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD (and optional ADMIN_NAME) and upserts a
 * user with the ADMIN role, hashing the password exactly like
 * src/auth/auth.service.ts (scrypt:N:r:p:saltB64:derivedB64) so the regular
 * /auth/login flow accepts it.
 *
 * Run locally:
 *   $env:DATABASE_URL='<neon pooled url>'; $env:ADMIN_EMAIL='admin@pcstore.vn'; $env:ADMIN_PASSWORD='...'; npx tsx scripts/seed-admin.ts
 *
 * Wire into the Vercel build (scripts/vercel-build.cjs) so the account exists
 * before the new deployment serves traffic. Unsafe to log the password, so it
 * is never printed.
 */
import { randomBytes, scryptSync } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_BYTES = 32;
const SALT_BYTES = 16;
const MAXMEM = 64 * 1024 * 1024;

function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES);
  const derived = scryptSync(password, salt, KEY_BYTES, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAXMEM,
  });
  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join(':');
}

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';
  const name = process.env.ADMIN_NAME?.trim() || 'Quản trị viên';

  if (!email || !password) {
    console.log('[seed-admin] ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping');
    return;
  }
  if (password.length < 8) {
    throw new Error('[seed-admin] ADMIN_PASSWORD must be at least 8 characters');
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = hashPassword(password);
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        name,
      },
      create: {
        email,
        passwordHash,
        role: 'ADMIN',
        name,
        isActive: true,
        emailVerified: true,
      },
      select: { id: true, email: true, role: true },
    });

    console.log(
      `[seed-admin] upserted admin id=${user.id} email=${user.email} role=${user.role}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[seed-admin] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
