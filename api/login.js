// src/api/login.js
import { withCors, setCookie, signSession, readJson } from './_utils.js';

/**
 * Lê AUTH_USERS do ambiente e devolve [{ user, pass }, ...]
 * Formato: "user1:senha1;user2:senha2;user3:senha3"
 */
function parseUsersEnv() {
  const raw = process.env.AUTH_USERS || '';
  return raw
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map(pair => {
      const idx = pair.indexOf(':');
      if (idx === -1) return null;
      const user = pair.slice(0, idx).trim();
      const pass = pair.slice(idx + 1).trim();
      if (!user || !pass) return null;
      return { user, pass };
    })
    .filter(Boolean);
}

function checkCredentials(list, username, password) {
  const u = String(username || '').trim();
  const p = String(password || '');
  return list.some(item => item.user === u && item.pass === p);
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

  // 1) multiusuários via AUTH_USERS
  const users = parseUsersEnv();

  // 2) compat: se não tiver AUTH_USERS, cai no ADMIN_USER/ADMIN_PASS (opcional)
  const singleOk =
    process.env.ADMIN_USER &&
    process.env.ADMIN_PASS &&
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS;

  const multiOk = users.length > 0 && checkCredentials(users, username, password);

  if (!singleOk && !multiOk) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ message: 'Credenciais inválidas' }));
  }

  // sessão 2h
  const ttlSec = 2 * 60 * 60;
  const token = signSession({ sub: username }, { ttlSec });

  // Cookie httpOnly; quando estiver em produção, _utils.js normalmente aplica SameSite=None; Secure
  setCookie(res, 'session', token, {
    maxAgeMs: ttlSec * 1000,
    path: '/',                 // garante leitura em toda a app
    // domain: 'seu-dominio.com.br', // (opcional) defina se front/back tiverem subdomínios específicos
  });

  res.statusCode = 200;
  return res.end(JSON.stringify({ ok: true, token, expiresIn: ttlSec }));
});
