// src/api/_utils.js
import crypto from 'crypto';

/* -------------------- CORS (para handlers "puros") -------------------- */
export function withCors(handler) {
  return async (req, res) => {
    const origin = req.headers.origin;
    const allowed = new Set(
      (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    );

    if (origin && allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      return res.end();
    }
    return handler(req, res);
  };
}

/* -------------------- Cookies -------------------- */
export function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  if (!raw) return null;
  const map = Object.fromEntries(
    raw.split(';').map(p => {
      const [k, ...v] = p.trim().split('=');
      return [decodeURIComponent(k), decodeURIComponent(v.join('='))];
    })
  );
  return map[name] || null;
}

export function setCookie(res, name, value, { maxAgeMs = 2 * 60 * 60 * 1000 } = {}) {
  const isProd = process.env.NODE_ENV === 'production';
  const expires = new Date(Date.now() + maxAgeMs).toUTCString();
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    isProd ? 'SameSite=None' : 'SameSite=Lax',
    isProd ? 'Secure' : null,
    `Expires=${expires}`,
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`
  ].filter(Boolean);
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearCookie(res, name) {
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [
    `${name}=;`,
    'Path=/',
    'HttpOnly',
    isProd ? 'SameSite=None' : 'SameSite=Lax',
    isProd ? 'Secure' : null,
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'Max-Age=0'
  ].filter(Boolean);
  res.setHeader('Set-Cookie', parts.join('; '));
}

/* -------------------- Sessão (HMAC estilo JWT) -------------------- */
function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}
function sign(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

export function signSession(payload = {}, { ttlSec = 2 * 60 * 60 } = {}) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSec };
  const secret = process.env.SESSION_SECRET || 'dev-secret';
  const enc = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(body))}`;
  const sig = sign(enc, secret);
  return `${enc}.${sig}`;
}

export function verifySession(token = '') {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    const secret = process.env.SESSION_SECRET || 'dev-secret';
    if (sign(`${h}.${p}`, secret) !== s) return null;
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/* -------------------- Body JSON (quando não tiver express.json) -------------------- */
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body; // express.json
  const ctype = req.headers['content-type'] || '';
  if (!ctype.includes('application/json')) return {};
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

export function getBearerToken(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}