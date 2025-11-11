import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import login from "../api/login.js";
import me from "../api/me.js";
import logout from "../api/logout.js";
import productsRouter from "../api/products.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// ---- Static (/static) para a logo ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/static", express.static(path.join(__dirname, "public"))); // coloque logo.png em src/server/public

// ---- CORS ----
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
    console.log("[CORS]", { origin, isAllowed, allowAll, allowed: [...allowedSet], method: req.method, path: req.path });
  }

  if (origin && isAllowed) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(cookieParser());
app.use(express.json());

// Health
app.get("/api/ping", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get("/health", (_req, res) => res.json({ ok: true }));

// Rotas
app.post("/api/login", (req, res) => login(req, res));
app.get("/api/me", (req, res) => me(req, res));
app.post("/api/logout", (req, res) => logout(req, res));
app.use("/api/products", productsRouter);

app.listen(PORT, () => console.log("Server on", PORT));
