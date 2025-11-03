import jwt from 'jsonwebtoken';

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || ''; // defina na Vercel

export function withCors(req, res) {
  // CORS + cookies cross-site
  if (FRONTEND_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true; // já respondeu
  }
  return false;
}

export function setCookie(res, name, value, { maxAgeMs = 2 * 60 * 60 * 1000 } = {}) {
  const expires = new Date(Date.now() + maxAgeMs).toUTCString();
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=None',
    'Secure',
    `Expires=${expires}`,
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`
  ];
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearCookie(res, name) {
  const parts = [
    `${name}=; Path=/; HttpOnly; SameSite=None; Secure`,
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'Max-Age=0'
  ];
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function signSession(payload) {
  return jwt.sign(payload, SESSION_SECRET, { expiresIn: '2h' });
}

export function verifySession(token) {
  try { return jwt.verify(token, SESSION_SECRET); } catch { return null; }
}

export function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  const parts = raw.split(/; */);
  for (const p of parts) {
    const [k, ...rest] = p.split('=');
    if (decodeURIComponent(k.trim()) === name) {
      return decodeURIComponent((rest.join('=') || '').trim());
    }
  }
  return null;
}

export function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => (data += c));
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
