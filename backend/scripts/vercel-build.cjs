const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, '..', 'dist', 'generated', 'prisma', 'client.js');
const raw = fs.readFileSync(clientPath, 'utf8');
const patched = raw.replace(
  /^\s*globalThis\['__dirname'\]\s*=\s*path\.dirname\(fileURLToPath\(import\.meta\.url\)\)\s*;?/m,
  "globalThis['__dirname'] = path.dirname(__filename);",
);
if (patched === raw) {
  console.error('[vercel-build] expected import.meta.url shim not found in generated client');
  process.exit(1);
}
fs.writeFileSync(clientPath, patched);

esbuild
  .build({
    entryPoints: ['dist/main.js'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    outfile: 'server.cjs',
    sourcemap: true,
    logLevel: 'info',
  })
  .catch((err) => {
    console.error('[vercel-build] esbuild failed:', err);
    process.exit(1);
  });