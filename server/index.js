// src/server/index.js
import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import login from "../api/login.js";   // <-- sobe um nível
import me from "../api/me.js";         // <-- sobe um nível
import logout from "../api/logout.js"; // <-- sobe um nível

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// --------- CORS GLOBAL ROBUSTO ---------
const allowAll = process.env.ALLOW_ALL_ORIGINS === "true";
const allowedSet = new Set(
  (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowed = allowAll || (origin && allowedSet.has(origin));

  if (process.env.CORS_DEBUG === "true") {
    console.log("[CORS]", {
      origin,
      isAllowed,
      allowAll,
      allowed: [...allowedSet],
      method: req.method,
      path: req.path,
    });
  }

  if (origin && isAllowed) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// --------- PARSERS ---------
app.use(cookieParser());
app.use(express.json());

// --------- HEALTH/CHECK ---------
app.get("/api/ping", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// --------- ROTAS ---------
app.post("/api/login", (req, res) => login(req, res));
app.get("/api/me", (req, res) => me(req, res));
app.post("/api/logout", (req, res) => logout(req, res));

app.listen(PORT, () => {
  console.log(`API local on http://localhost:${PORT}`);
});
