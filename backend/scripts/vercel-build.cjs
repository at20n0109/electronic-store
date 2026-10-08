const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

if (process.env.PRISMA_MIGRATE_DEPLOY === '1') {
  process.chdir(path.join(__dirname, '..'));
  console.log('[vercel-build] applying prisma migrations...');
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
    console.log('[vercel-build] prisma migrations applied');
  } catch (err) {
    console.error('[vercel-build] prisma migrate deploy failed:', err.message);
    process.exit(1);
  }
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