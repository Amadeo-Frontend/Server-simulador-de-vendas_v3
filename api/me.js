import { withCors, readCookie, verifySession } from './_utils.js';

export default withCors(async (req, res) => {
  const token = readCookie(req, 'session');
  const payload = token ? verifySession(token) : null;

  if (!payload) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ ok: false }));
  }

  res.statusCode = 200;
  return res.end(JSON.stringify({ ok: true, user: { username: payload.sub } }));
});
