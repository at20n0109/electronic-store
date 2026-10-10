// Vercel services entrypoint. vercel.json declares this tiny tracked file as
// the backend entrypoint; it loads the esbuild bundle (server.cjs) generated
// by `build:vercel`. server.cjs itself is gitignored, so it cannot be the
// declared entrypoint for git-based (GitHub) deploys.
'use strict';
require('./server.cjs');