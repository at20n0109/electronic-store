const esbuild = require('esbuild');

esbuild
  .build({
    entryPoints: ['dist/bootstrap.js'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    outfile: 'server.mjs',
    sourcemap: true,
    logLevel: 'info',
  })
  .catch((err) => {
    console.error('[vercel-build] esbuild failed:', err);
    process.exit(1);
  });