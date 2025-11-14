// backend/api/sales.js
import { Router } from "express";
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.resolve("./data");
const SALES_FILE = path.join(DATA_DIR, "sales.json");

/** garante pasta/arquivo */
function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SALES_FILE)) fs.writeFileSync(SALES_FILE, "[]", "utf-8");
}

function readAll() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(SALES_FILE, "utf-8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeAll(arr) {
  ensureStorage();
  fs.writeFileSync(SALES_FILE, JSON.stringify(arr, null, 2), "utf-8");
}

let sales = readAll();
let nextId = sales.length ? Math.max(...sales.map(s => s.id)) + 1 : 1;

const router = Router();

/**
 * Modelo de venda:
 * {
 *   id, createdAtISO,
 *   items: [{ sku, nome, tier, mode, unitPrice, quantity, bonusQuantity, bonusCashBRL }],
 *   totals: { receita },
 *   margins: { brutaPct, liquidaPct }
 * }
 */

// LISTAR (resumo)
router.get("/", (_req, res) => {
  const list = sales
    .slice()
    .sort((a, b) => new Date(b.createdAtISO) - new Date(a.createdAtISO))
    .map((s) => ({
      id: s.id,
      createdAtISO: s.createdAtISO,
      itemsCount: s.items?.length || 0,
      receita: s.totals?.receita || 0,
      margemBruta: s.margins?.brutaPct || 0,
      margemLiquida: s.margins?.liquidaPct || 0,
    }));
  res.json(list);
});

// OBTER UMA
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const s = sales.find((x) => x.id === id);
  if (!s) return res.status(404).json({ message: "Venda não encontrada" });
  res.json(s);
});

// CRIAR
router.post("/", (req, res) => {
  const body = req.body || {};
  // validações simples
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ message: "Itens obrigatórios" });
  }
  const createdAtISO = new Date().toISOString();
  const record = {
    id: nextId++,
    createdAtISO,
    items: body.items.map((it) => ({
      sku: it.sku || "",
      nome: it.nome || "",
      tier: it.tier || "A",
      mode: it.mode || "vista",
      unitPrice: Number(it.unitPrice || 0),
      quantity: Number(it.quantity || 0),
      bonusQuantity: Number(it.bonusQuantity || 0),
      bonusCashBRL: Number(it.bonusCashBRL || 0),
    })),
    totals: {
      receita: Number(body.totals?.receita || 0),
    },
    margins: {
      brutaPct: Number(body.margins?.brutaPct || 0),
      liquidaPct: Number(body.margins?.liquidaPct || 0),
    },
    // espaço para metadados futuros (cliente, vendedor, obs, etc.)
    meta: body.meta || null,
  };
  sales.push(record);
  writeAll(sales);
  res.status(201).json(record);
});

// EXCLUIR
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const before = sales.length;
  sales = sales.filter((x) => x.id !== id);
  if (sales.length === before) {
    return res.status(404).json({ message: "Venda não encontrada" });
  }
  writeAll(sales);
  res.json({ ok: true });
});

export default router;
