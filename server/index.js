// backend/server/index.js
import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import productsRouter from "../api/products.js";
import login from "../api/login.js";
import me from "../api/me.js";
import logout from "../api/logout.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ========================= CORS (via ENV) =========================
 * ENV esperados:
 *  - ALLOW_ALL_ORIGINS=true (libera tudo)  [use só para debug]
 *  - FRONTEND_ORIGINS="https://app.vercel.app,https://app-*.vercel.app,http://localhost:5173"
 *  - CORS_DEBUG=true  (loga diagnósticos no Render)
 */
const allowAll = process.env.ALLOW_ALL_ORIGINS === "true";
const originPatterns = (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// verifica se um Origin bate com algum padrão (suporta "*")
function isOriginAllowed(origin) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const full = `${url.protocol}//${url.host}`; // sempre compara protocolo+host
    for (const pat of originPatterns) {
      // match exato
      if (!pat.includes("*") && full === pat) return true;

      // curinga simples (ex.: "*.vercel.app" ou "https://app-*.vercel.app")
      if (pat.includes("*")) {
        const esc = pat
          .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
          .replace(/\\\*/g, ".*");
        const re = new RegExp(`^${esc}$`, "i");
        if (re.test(full)) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowed = allowAll || isOriginAllowed(origin);

  if (process.env.CORS_DEBUG === "true") {
    console.log("[CORS]", {
      origin,
      isAllowed,
      allowAll,
      allowed: originPatterns,
      method: req.method,
      path: req.path,
    });
  }

  if (origin && isAllowed) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/* ========================= Parsers ========================= */
app.use(cookieParser());
app.use(express.json());

/* ========================= Estáticos (opcional) ========================= */
app.use("/public", express.static(path.join(__dirname, "public")));

/* ========================= Health ========================= */
app.get("/health", (_req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);
app.get("/api/ping", (_req, res) => res.json({ ok: true }));

/* ========================= Auth ========================= */
app.post("/api/login", (req, res) => login(req, res));
app.get("/api/me", (req, res) => me(req, res));
app.post("/api/logout", (req, res) => logout(req, res));

/* ========================= Produtos ========================= */
app.use("/api/products", productsRouter);

/* ========================= Start ========================= */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Server listening on", PORT));
