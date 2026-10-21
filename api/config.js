/* AbsenSiswa — Vercel serverless function
 *
 * Menyajikan window.APP_CONFIG dari Environment Variables Vercel
 * (Project Settings → Environment Variables):
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 * Diakses browser sebagai <script src="/api/config.js">.
 *
 * Memakai CommonJS (module.exports) agar dikenali Vercel tanpa package.json.
 */
module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(
    `window.APP_CONFIG = ${JSON.stringify({
      SUPABASE_URL: process.env.SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ''
    })};`
  );
};
