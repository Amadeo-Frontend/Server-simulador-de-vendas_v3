import { withCors, setCookie, signSession, readJson } from './_utils.js';

export default withCors(async (req, res) => {
  // Sempre responde JSON
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ message: 'Method not allowed' }));
  }

  // Lê o body com fallback
  const body = await readJson(req);
  const username = (body?.username || '').trim();
  const password = body?.password || '';

  if (!username || !password) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ message: 'Usuário e senha obrigatórios' }));
  }

  // Validação contra ENV
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    const ttlSec = 2 * 60 * 60; // 2h
    const token = signSession({ sub: username }, { ttlSec });

    // Cookie httpOnly; em produção vai sair com SameSite=None; Secure (via _utils)
    setCookie(res, 'session', token, { maxAgeMs: ttlSec * 1000 });

    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, token, expiresIn: ttlSec }));
  }

  res.statusCode = 401;
  return res.end(JSON.stringify({ message: 'Credenciais inválidas' }));
});
