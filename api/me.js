import { withCors, readCookie, verifySession, getBearerToken } from './_utils.js';

export default withCors(async (req, res) => {
  const cookieToken = readCookie(req, 'session');
  const bearerToken = getBearerToken(req);

  const t = bearerToken || cookieToken;     // prioridade para Bearer
  const payload = t ? verifySession(t) : null;

  if (!payload) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ ok: false }));
  }

  res.statusCode = 200;
  return res.end(JSON.stringify({ ok: true, user: { username: payload.sub } }));
});
