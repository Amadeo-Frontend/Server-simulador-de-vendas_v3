import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cookieParser());

// URL do frontend (Render) – defina via env FRONTEND_ORIGIN
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';
const PORT = process.env.PORT || 4000;

function cookieOpts() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd ? true : false,
    maxAge: 2 * 60 * 60 * 1000,
    path: '/',
  };
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const ok = username === ADMIN_USER && password === ADMIN_PASS;

  if (!ok) {
    return res.status(401).json({ ok: false, message: 'Credenciais inválidas.' });
  }

  const token = jwt.sign({ u: username }, SESSION_SECRET, { expiresIn: '2h' });
  res.cookie('sid', token, cookieOpts());
  return res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const token = req.cookies?.sid;
  if (!token) return res.status(401).json({ ok: false });

  try {
    jwt.verify(token, SESSION_SECRET);
    return res.json({ ok: true });
  } catch {
    return res.status(401).json({ ok: false });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('sid', { ...cookieOpts(), maxAge: 0 });
  res.json({ ok: true });
});

app.get('/', (_, res) => res.send('API OK'));

app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
});
