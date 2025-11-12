// src/api/login.js
import { withCors, setCookie, signSession, readJson } from './_utils.js';

/**
 * Lê usuários das ENVs, aceitando 3 formatos:
 * 1) USERS_JSON: '[{"user":"admin","pass":"123"},{"user":"vendas","pass":"456"}]'
 * 2) USERS_LIST: 'admin:123;vendas:456'  (separador ; ou ,)
 * 3) ADMIN_USER / ADMIN_PASS (legado, 1 usuário)
 */
function parseUsersEnv() {
  const out = [];

  // 1) JSON
  const json = process.env.USERS_JSON;
  if (json) {
    try {
      const arr = JSON.parse(json);
      if (Array.isArray(arr)) {
        for (const it of arr) {
          if (
            it &&
            typeof it.user === 'string' &&
            typeof it.pass === 'string' &&
            it.user.trim() &&
            it.pass.trim()
          ) {
            out.push({ user: it.user.trim(), pass: it.pass.trim() });
          }
        }
      }
    } catch (_) {
      // ignora JSON inválido
    }
  }

  // 2) Lista "user:pass;user2:pass2"
  if (out.length === 0 && process.env.USERS_LIST) {
    const parts = String(process.env.USERS_LIST).split(/[;,]/);
    for (const p of parts) {
      const [user, pass] = p.split(':');
      if (user && pass) out.push({ user: user.trim(), pass: pass.trim() });
    }
  }

  // 3) Fallback legado
  if (out.length === 0 && process.env.ADMIN_USER && process.env.ADMIN_PASS) {
    out.push({
      user: String(process.env.ADMIN_USER).trim(),
      pass: String(process.env.ADMIN_PASS).trim(),
    });
  }

  return out;
}

export default withCors(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ message: 'Method not allowed' }));
  }

  const body = await readJson(req);
  const username = (body?.username || '').trim();
  const password = body?.password || '';

  if (!username || !password) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ message: 'Usuário e senha obrigatórios' }));
  }

  const users = parseUsersEnv();
  const match = users.find(u => u.user === username && u.pass === password);

  if (match) {
    const ttlSec = 2 * 60 * 60; // 2h
    const token = signSession({ sub: username }, { ttlSec });

    // Cookie httpOnly; em produção _utils aplica SameSite=None; Secure
    setCookie(res, 'session', token, { maxAgeMs: ttlSec * 1000 });

    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, token, expiresIn: ttlSec }));
  }

  res.statusCode = 401;
  return res.end(JSON.stringify({ message: 'Credenciais inválidas' }));
});
