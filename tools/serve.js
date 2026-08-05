// Dependency-free static server for the prototype.
// Serves the repo root so src/ and data/ are both reachable, and sends / to the prototype page.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const entry = '/src/index.html';
const port = Number(process.env.PORT) || 4173;
const shouldOpen = !process.argv.includes('--no-open');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav'
};

function resolveRequest(pathname) {
  // Directory requests get their index.html; "/" is redirected before it reaches here, because
  // serving the page's contents at "/" would break its relative script and stylesheet paths.
  const requested = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const filePath = path.join(root, decodeURIComponent(requested));
  const relative = path.relative(root, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return filePath;
}

const server = http.createServer((request, response) => {
  let pathname = '/';
  try {
    pathname = new URL(request.url, `http://localhost:${port}`).pathname;
  } catch (_) {
    response.writeHead(400).end('Bad request');
    return;
  }

  if (pathname === '/') {
    response.writeHead(302, { Location: entry });
    response.end();
    return;
  }

  const filePath = resolveRequest(pathname);
  if (!filePath) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(`Not found: ${pathname}`);
      return;
    }
    response.writeHead(200, {
      'Content-Type': TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    response.end(contents);
  });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Try: set PORT=4174 && run play`);
    process.exit(1);
  }
  throw error;
});

server.listen(port, () => {
  const url = `http://localhost:${port}/`;
  console.log(`South of Tethys prototype: ${url}`);
  console.log('Press Ctrl+C to stop.');
  if (shouldOpen) {
    const opener = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin' ? ['open', [url]]
      : ['xdg-open', [url]];
    spawn(opener[0], opener[1], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  }
});
