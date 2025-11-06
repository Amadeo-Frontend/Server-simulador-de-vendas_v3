import { withCors, clearCookie } from './_utils.js';

export default withCors(async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ message: 'Method not allowed' }));
  }
  clearCookie(res, 'session');
  res.statusCode = 200;
  return res.end(JSON.stringify({ ok: true }));
});
