import { withCors, setCookie, signSession, readJson } from './_utils.js';

export default withCors(async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ message: 'Method not allowed' }));
  }

  const { username, password } = await readJson(req);

  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    const token = signSession({ sub: username });

    // mantém cookie para quem permitir (ok), mas agora também retorna o token
    setCookie(res, 'session', token, { maxAgeMs: 2 * 60 * 60 * 1000 });

    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, token }));
  }

  res.statusCode = 401;
  return res.end(JSON.stringify({ message: 'Credenciais inválidas' }));
});
