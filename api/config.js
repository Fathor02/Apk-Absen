/* AbsenSiswa — Vercel serverless function
 *
 * Menyajikan window.APP_CONFIG dari Environment Variables Vercel
 * (Project Settings → Environment Variables):
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 * Validasi login admin via ADMIN_USER / ADMIN_PASS
 * Diakses browser sebagai <script src="/api/config.js">.
 *
 * Memakai CommonJS (module.exports) agar dikenali Vercel tanpa package.json.
 */
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'adminabsen';

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2048) {
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {};
        const username = String(data.username || '').trim();
        const password = String(data.password || '');

        if (username && password) {
          if (username === ADMIN_USER && password === ADMIN_PASS) {
            res.status(200).end(JSON.stringify({ ok: true, user: ADMIN_USER, role: 'admin' }));
            return;
          }
          res.status(401).end(JSON.stringify({ ok: false, error: 'Username atau password salah.' }));
          return;
        }

        res.status(400).end(JSON.stringify({ ok: false, error: 'Permintaan tidak valid.' }));
      } catch (err) {
        res.status(400).end(JSON.stringify({ ok: false, error: 'Permintaan tidak valid.' }));
      }
    });

    req.on('error', () => {
      if (!res.headersSent) {
        res.status(400).end(JSON.stringify({ ok: false, error: 'Permintaan tidak valid.' }));
      }
    });
    return;
  }

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.end(
    `window.APP_CONFIG = window.APP_CONFIG || {};
window.APP_CONFIG.SUPABASE_URL = ${JSON.stringify(process.env.SUPABASE_URL || '')};
window.APP_CONFIG.SUPABASE_ANON_KEY = ${JSON.stringify(process.env.SUPABASE_ANON_KEY || '')};
window.APP_CONFIG.appName = ${JSON.stringify(process.env.APP_NAME || 'AbsenSiswa')};
console.log('[APP_CONFIG] loaded from server');`
  );
};

