// backend/server/index.js
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import login from '../api/login.js';
import me from '../api/me.js';
import logout from '../api/logout.js';

dotenv.config();

const app = express();
app.use(cookieParser());
app.use(express.json());

// CORS (multi-origem)
app.use((req, res, next) => {
  const allowed = new Set(
    (process.env.FRONTEND_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
  );
  const origin = req.headers.origin;
  if (origin && allowed.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Rotas
app.post('/api/login', (req, res) => login(req, res));
app.get('/api/me', (req, res) => me(req, res));
app.post('/api/logout', (req, res) => logout(req, res));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API local on http://localhost:${PORT}`));
