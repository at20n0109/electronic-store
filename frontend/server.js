const { createServer } = require('node:http');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const pathname = (req.url || '').split('?')[0];
    if (dev && pathname.startsWith('/__nextjs')) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Forbidden');
      return;
    }
    handle(req, res);
  }).listen(port, () => {
    console.log(
      `> Server listening at http://localhost:${port} as ${dev ? 'development' : process.env.NODE_ENV}`
    );
  });
});