// server/index.js
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use(cookieParser());

// Liste as origens permitidas separadas por vírgula na ENV FRONTEND_ORIGINS
// Ex.: https://reactjs-simulador-de-vendas-v3.vercel.app,https://reactjs-simulador-de-vendas-v3-jwu4e7v84.vercel.app
const ALLOWED = new Set(
  (process.env.FRONTEND_ORIGINS || 'https://reactjs-simulador-de-vendas-v3.vercel.app,https://reactjs-simulador-de-vendas-v3-jwu4e7v84.vercel.app')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
);

// 🔒 Middleware CORS manual (NÃO use cors() e NÃO defina ACAO em outro lugar)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (ALLOWED.has(origin) /* ou regra extra se quiser */)) {
    res.header('Access-Control-Allow-Origin', origin); // ← apenas UM valor
    res.header('Vary', 'Origin');                      // importante p/ cache
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// ---- rotas abaixo ----
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const SESSION_SECRET = process.env.SESSION_SECRET;
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
  if (!ok) return res.status(401).json({ ok: false, message: 'Credenciais inválidas.' });

  const token = jwt.sign({ u: username }, SESSION_SECRET, { expiresIn: '2h' });
  res.cookie('sid', token, cookieOpts());
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const token = req.cookies?.sid;
  if (!token) return res.status(401).json({ ok: false });
  try {
    jwt.verify(token, SESSION_SECRET);
    res.json({ ok: true });
  } catch {
    res.status(401).json({ ok: false });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('sid', { ...cookieOpts(), maxAge: 0 });
  res.json({ ok: true });
});

app.get('/', (_, res) => res.send('API OK'));

app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
