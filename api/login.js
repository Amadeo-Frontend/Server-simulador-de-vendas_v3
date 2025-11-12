// login.ts
import { withCors, setCookie, signSession, readJson } from './_utils.js';

/** Lê AUTH_USERS="user1:pass1, user2:pass2" -> [{user, pass}, ...] */
function parseUsersEnv(): Array<{ user: string; pass: string }> {
  const raw = process.env.AUTH_USERS || '';
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(pair => {
      const [user, ...rest] = pair.split(':');      // permite ':' na senha
      const pass = rest.join(':');
      return { user: (user || '').trim(), pass: (pass || '').trim() };
    })
    .filter(u => u.user && u.pass);
}

/** comparação simples (sem timing-safe, ok p/ app interno) */
function eq(a: string, b: string) {
  return a === b;
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

  // 1) Tenta lista múltipla AUTH_USERS
  const users = parseUsersEnv();
  let ok = false;

  if (users.length > 0) {
    const found = users.find(u => eq(u.user, username) && eq(u.pass, password));
    ok = !!found;
  } else {
    // 2) Fallback p/ par único ADMIN_USER/ADMIN_PASS
    ok = eq(username, process.env.ADMIN_USER || '') && eq(password, process.env.ADMIN_PASS || '');
  }

  if (!ok) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ message: 'Credenciais inválidas' }));
  }

  const ttlHours = Number(process.env.SESSION_TTL_HOURS || 2);
  const ttlSec = Math.max(1, Math.floor(ttlHours * 3600));
  const token = signSession({ sub: username }, { ttlSec });

  // Cookie httpOnly; em produção SameSite=None; Secure (via _utils)
  setCookie(res, 'session', token, { maxAgeMs: ttlSec * 1000 });

  res.statusCode = 200;
  return res.end(JSON.stringify({ ok: true, token, expiresIn: ttlSec }));
});
