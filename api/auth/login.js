/* AbsenSiswa — Vercel serverless function: login admin */
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'adminabsen';

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json ? res.status(405).json({ ok: false, error: 'Method not allowed' }) : res.status(405).end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

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

      if (username === ADMIN_USER && password === ADMIN_PASS) {
        res.status(200).end(JSON.stringify({ ok: true, user: ADMIN_USER, role: 'admin' }));
        return;
      }

      res.status(401).end(JSON.stringify({ ok: false, error: 'Username atau password salah.' }));
    } catch (err) {
      res.status(400).end(JSON.stringify({ ok: false, error: 'Permintaan tidak valid.' }));
    }
  });

  req.on('error', () => {
    if (!res.headersSent) {
      res.status(400).end(JSON.stringify({ ok: false, error: 'Permintaan tidak valid.' }));
    }
  });
};
