import { withCors, readCookie, verifySession } from './_utils.js';

export default async function handler(req, res) {
  if (withCors(req, res)) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).end();
  }

  const token = readCookie(req, 'sid');
  const claims = token ? verifySession(token) : null;
  if (!claims) return res.status(401).json({ ok: false });

  return res.json({ ok: true });
}
