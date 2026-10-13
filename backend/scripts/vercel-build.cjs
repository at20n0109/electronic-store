const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Client } = require('pg');

const migrateEnabled = (process.env.PRISMA_MIGRATE_DEPLOY || '').trim() === '1';
console.log('[vercel-build] PRISMA_MIGRATE_DEPLOY=', migrateEnabled);

// Neon's pooler hits P1002 (too many connections) during the concurrent
// Vercel build. Retry a few times before giving up.
function withRetries(fn, label, attempts = 5) {
  return fn().catch((err) => {
    if (attempts <= 1) throw err;
    console.warn(`[vercel-build] ${label} failed (${err.message}); retrying...`);
    return new Promise((r) => setTimeout(r, 1500)).then(() =>
      withRetries(fn, label, attempts - 1),
    );
  });
}

async function applyMigrations() {
  await withRetries(async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
      const dirs = fs
        .readdirSync(migrationsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();
      for (const dir of dirs) {
        const sql = fs.readFileSync(
          path.join(migrationsDir, dir, 'migration.sql'),
          'utf8',
        );
        console.log(`[vercel-build] applying migration ${dir}...`);
        await client.query(sql);
      }
      console.log('[vercel-build] migrations applied');
    } finally {
      await client.end().catch(() => {});
    }
  }, 'apply migrations');
}

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  process.chdir(path.join(__dirname, '..'));
  console.log('[vercel-build] seeding admin account...');
  try {
    execSync('npx tsx scripts/seed-admin.ts', { stdio: 'inherit', env: process.env });
  } catch (err) {
    console.error('[vercel-build] seed-admin failed:', err.message);
    process.exit(1);
  }
}

if (migrateEnabled) {
  // Prod's schema was originally created via `prisma db push`, so
  // `prisma._prisma_migrations` never matched reality. After we added real
  // migration folders, `migrate deploy` reported "no pending migrations"
  // (history out of sync) and Order was missing the GHN address columns,
  // which 500'd every checkout. Both migration SQLs are idempotent
  // (IF NOT EXISTS / ADD VALUE IF NOT EXISTS), so applying them directly
  // via `prisma db execute` is additive and safe. `migrate deploy` was
  // unreliable here because it thought migrations already ran, and Neon's
  // pooler sometimes returns P1002 under concurrent build connections.
  // Do NOT use `migrate reset --force` here: it would DROP every table and
  // wipe production data.
  process.chdir(path.join(__dirname, '..'));
  applyMigrations().catch((err) => {
    console.error('[vercel-build] apply migrations failed:', err.message);
    process.exit(1);
  });
}

const clientPath = path.join(__dirname, '..', 'dist', 'generated', 'prisma', 'client.js');
const raw = fs.readFileSync(clientPath, 'utf8');
if (raw.includes('import.meta.url')) {
  const patched = raw.replace(
    /^\s*globalThis\['__dirname'\]\s*=\s*path\.dirname\(fileURLToPath\(import\.meta\.url\)\)\s*;?/m,
    "globalThis['__dirname'] = path.dirname(__filename);",
  );
  if (patched === raw) {
    console.error('[vercel-build] expected import.meta.url shim not found in generated client');
    process.exit(1);
  }
  fs.writeFileSync(clientPath, patched);
}

esbuild
  .build({
    entryPoints: ['dist/bootstrap.js'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: 'server.cjs',
    sourcemap: true,
    logLevel: 'info',
    external: [
      'pdfkit',
      '@nestjs/microservices',
      '@nestjs/websockets',
    ],
  })
  .catch((err) => {
    console.error('[vercel-build] esbuild failed:', err);
    process.exit(1);
  });