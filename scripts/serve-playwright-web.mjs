import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, relative, resolve, sep } from 'node:path';

const root = await realpath(resolve('frontend/dist'));
const entry = resolve(root, 'index.html');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};
const find = async (pathname) => {
  try {
    const file = await realpath(resolve(root, '.' + pathname));
    const key = relative(root, file);
    if (
      key === '..' ||
      key.startsWith('..' + sep) ||
      !(await stat(file)).isFile()
    )
      return null;
    return file;
  } catch {
    return null;
  }
};
createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(request.url, 'http://127.0.0.1').pathname,
    );
  } catch {
    response.writeHead(400).end();
    return;
  }
  const file = (await find(pathname)) || (extname(pathname) ? null : entry);
  if (!file) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': file === entry ? 'no-cache' : 'public, max-age=300',
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  const body = createReadStream(file);
  body.once('error', () => response.destroy());
  body.pipe(response);
}).listen(8082, '127.0.0.1');
