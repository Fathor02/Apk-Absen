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
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
    return;
  }

  const url = req.url || '';
  if (url.includes('/api/auth/login') && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2048) req.destroy();
    });
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {};
        const username = String(data.username || '').trim();
        const password = String(data.password || '');
        if (username === ADMIN_USER && password === ADMIN_PASS) {
          res.status(200).end(JSON.stringify({ ok: true, user: ADMIN_USER, role: 'admin' }));
          return;
        }
        res.status(401).end(JSON.stringify({ ok: false, error: 'Username atau password salah.' }));
      } catch (err) {
        res.status(400).end(JSON.stringify({ ok: false, error: 'Permintaan tidak valid.' }));
      }
    });
    return;
  }

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(
    `window.APP_CONFIG = ${JSON.stringify({
      SUPABASE_URL: process.env.SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ''
    })};`
  );
};
