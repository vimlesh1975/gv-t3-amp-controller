// Standalone Node entry point for Next.js production server
// Compatible with PM2, Windows Services, Docker, and systemd

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.PORT = process.env.PORT || '23000';

const path = require('path');
const next = require('next');
const http = require('http');

const isDev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT, 10) || 23000;
const app = next({ dev: isDev, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Grass Valley T3 Controller ready on http://localhost:${port}`);
  });

  // Graceful shutdown handling for PM2
  process.on('SIGINT', () => {
    console.log('> Received SIGINT, shutting down server...');
    server.close(() => {
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('> Received SIGTERM, shutting down server...');
    server.close(() => {
      process.exit(0);
    });
  });
}).catch((err) => {
  console.error('> Server failed to start:', err);
  process.exit(1);
});
