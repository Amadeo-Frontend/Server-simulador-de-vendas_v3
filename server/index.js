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
import salesRouter from "./api/sales.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ========================= CORS ========================= */

const allowAll = process.env.ALLOW_ALL_ORIGINS === "true";

/** Lê lista de origins/hosts do ENV (separados por vírgula) */
function parseAllowedList() {
  return (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

/** Remove barra final de um origin e normaliza */
function normalizeOrigin(origin) {
  if (!origin) return "";
  return origin.replace(/\/+$/, ""); // tira / do final
}

/** Extrai host (sem protocolo) de um origin/padrão */
function getHostFromPattern(pat) {
  try {
    // tem protocolo?
    if (/^https?:\/\//i.test(pat)) {
      return new URL(normalizeOrigin(pat)).host; // ex: reactjs...vercel.app
    }
    // sem protocolo: já é host
    return pat;
  } catch {
    return pat;
  }
}

/**
 * Constrói um verificador que:
 *  - dá match exato com origins informados (sem barra final)
 *  - dá match por sufixo de host (wildcards *.dominio)
 *
 * Padrões aceitos (exemplos):
 *  - https://meusite.com
 *  - https://meusite.com/
 *  - meusite.com
 *  - .vercel.app
 *  - *.vercel.app
 *  - https://*.vercel.app
 */
function buildMatcher(list) {
  const exactOrigins = new Set(); // origins exatos normalizados
  const hostSuffixes = new Set(); // sufixos de host (ex: "vercel.app")

  for (let pat of list) {
    // normaliza
    pat = pat.trim();

    // 1) Se for wildcard com protocolo (ex: "https://*.vercel.app")
    if (/^https?:\/\/\*\./i.test(pat)) {
      const host = getHostFromPattern(pat).replace(/^\*\./, ""); // "*.vercel.app" -> "vercel.app"
      if (host) hostSuffixes.add(host.toLowerCase());
      continue;
    }

    // 2) Se começar com "*." ou "." (ex: "*.vercel.app" / ".vercel.app")
    if (/^\*\./.test(pat) || /^\./.test(pat)) {
      const host = pat.replace(/^\*\./, "").replace(/^\./, ""); // "*.vercel.app" -> "vercel.app"
      if (host) hostSuffixes.add(host.toLowerCase());
      continue;
    }

    // 3) Se tiver protocolo e não tiver wildcard -> match exato por origin completo
    if (/^https?:\/\//i.test(pat)) {
      exactOrigins.add(normalizeOrigin(pat).toLowerCase());
      continue;
    }

    // 4) Sem protocolo e sem wildcard: pode ser host puro (ex: "meusite.com")
    //    Nesse caso, tratamos como sufixo (equivale a *.meusite.com)
    hostSuffixes.add(pat.toLowerCase());
  }

  return (origin) => {
    if (!origin) return false;

    // match exato por origin (sem barra final)
    const normOrigin = normalizeOrigin(origin).toLowerCase();
    if (exactOrigins.has(normOrigin)) return true;

    // match por sufixo de host
    try {
      const { host } = new URL(origin);
      const h = (host || "").toLowerCase();
      for (const suf of hostSuffixes) {
        // casa "dominio" e "sub.dominio"
        if (h === suf || h.endsWith(`.${suf}`)) return true;
      }
    } catch {
      // se origin vier inválido, ignoramos
    }
    return false;
  };
}

const allowedList = parseAllowedList();
const isAllowedOrigin = buildMatcher(allowedList);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const ok = allowAll || isAllowedOrigin(origin);

  if (process.env.CORS_DEBUG === "true") {
    console.log("[CORS]", {
      origin,
      isAllowed: ok,
      allowAll,
      allowed: allowedList,
      method: req.method,
      path: req.path
    });
  }

  if (origin && ok) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");

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

app.use("/api/products", productsRouter);
app.use("/api/sales", salesRouter);

/* ========================= Start ========================= */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Server listening on", PORT));
