import { withCors, setCookie, signSession, readJson } from './_utils.js';

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

export default async function handler(req, res) {
  if (withCors(req, res)) return;        // trata OPTIONS

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).end();
  }

  try {
    const { username, password } = await readJson(req);
    const ok = username === ADMIN_USER && password === ADMIN_PASS;

    if (!ok) {
      return res.status(401).json({ ok: false, message: 'Credenciais inválidas.' });
    }

    const token = signSession({ u: username });
    setCookie(res, 'sid', token);
    return res.json({ ok: true });
  } catch {
    return res.status(400).json({ ok: false, message: 'Requisição inválida.' });
  }
}
