import { withCors, clearCookie } from './_utils.js';

export default async function handler(req, res) {
  if (withCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).end();
  }

  clearCookie(res, 'sid');
  return res.json({ ok: true });
}
