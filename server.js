/* AbsenSiswa — server statis dengan injeksi .env
 *
 * Jalankan:  node server.js
 * Membaca .env (SUPABASE_URL, SUPABASE_ANON_KEY) lalu menyajikan
 * /js/config.js secara virtual dari nilai tersebut.
 * Tidak ada file config yang ditulis ke disk — .env cukup satu-satunya sumber.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const PORT = process.env.PORT || 8000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.sql': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8'
};

function parseEnv() {
  const envPath = path.join(root, '.env');
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const eq = t.indexOf('=');
    if (eq === -1) return;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, eq).trim()] = v;
  });
  return out;
}

function configJs() {
  const env = parseEnv();
  const cfg = {
    SUPABASE_URL: (env.SUPABASE_URL || '').trim(),
    SUPABASE_ANON_KEY: (env.SUPABASE_ANON_KEY || '').trim()
  };
  return `window.APP_CONFIG = ${JSON.stringify(cfg)};`;
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  if (urlPath === '/js/config.js') {
    res.writeHead(200, { 'Content-Type': MIME['.js'], 'Cache-Control': 'no-store' });
    res.end(configJs());
    return;
  }

  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(root, safePath === path.sep || safePath === '.' ? 'index.html' : safePath);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  const env = parseEnv();
  const host = (env.SUPABASE_URL || '').trim();
  console.log(`AbsenSiswa berjalan di http://localhost:${PORT}`);
  console.log(host
    ? `Supabase: terhubung ke ${host.replace(/^https?:\/\//, '')}`
    : 'Supabase: mode lokal (.env belum diisi)');
});
