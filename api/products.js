// backend/api/products.js
import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR || "/data";
const FILE = path.join(DATA_DIR, "products.json");
const BACKUP_DIR = path.join(DATA_DIR, "backups");

// ------- IO persistente (atômico + backup) -------
async function loadProducts() {
  try {
    const s = await fs.readFile(FILE, "utf8");
    const json = JSON.parse(s);
    return Array.isArray(json) ? json : [];
  } catch {
    // tenta último backup válido
    try {
      const files = (await fs.readdir(BACKUP_DIR))
        .filter(f => f.endsWith(".json"))
        .sort()
        .reverse();
      if (files[0]) {
        const b = await fs.readFile(path.join(BACKUP_DIR, files[0]), "utf8");
        return JSON.parse(b);
      }
    } catch {}
    // seed inicial opcional
    return [{
      id: 1,
      sku: "573",
      nome: "Teks Dog Original 18% 7kg",
      peso: 7,
      custo: 18.88,
      preco_venda_A: 30.00, preco_venda_B: 29.09, preco_venda_C: 28.21,
      preco_venda_A_prazo: 30.93, preco_venda_B_prazo: 29.99, preco_venda_C_prazo: 29.08,
      bonificacao_unitaria: 0
    }];
  }
}

async function saveProducts(list) {
  if (!Array.isArray(list)) throw new Error("products must be array");
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const tmp = FILE + ".tmp";
  const json = JSON.stringify(list, null, 2);
  await fs.writeFile(tmp, json, "utf8");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await fs.writeFile(path.join(BACKUP_DIR, `products_${stamp}.json`), json, "utf8");
  await fs.rename(tmp, FILE);

  // mantém 20 backups
  try {
    const files = (await fs.readdir(BACKUP_DIR))
      .filter(f => f.endsWith(".json"))
      .sort()
      .reverse();
    await Promise.all(files.slice(20).map(f => fs.rm(path.join(BACKUP_DIR, f))));
  } catch {}
}

// cache em memória (carregado do disco na primeira requisição)
let productsCache = null;
async function products() {
  if (!productsCache) productsCache = await loadProducts();
  return productsCache;
}
async function commit() {
  await saveProducts(productsCache || []);
}

// ----------------- Router -----------------
const router = Router();

// LISTAR
router.get("/", async (_req, res) => {
  res.json(await products());
});

// CRIAR
router.post("/", async (req, res) => {
  const body = req.body || {};
  if (!body.sku?.trim() || !body.nome?.trim()) {
    return res.status(400).json({ message: "SKU e nome são obrigatórios" });
  }
  const list = await products();
  const id = list.length ? Math.max(...list.map(p => p.id || 0)) + 1 : 1;
  const novo = { id, ...body };
  list.push(novo);
  await commit();
  res.status(201).json(novo);
});

// ATUALIZAR
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const list = await products();
  const idx = list.findIndex(p => p.id === id);
  if (idx < 0) return res.status(404).json({ message: "Produto não encontrado" });
  list[idx] = { ...list[idx], ...req.body, id };
  await commit();
  res.json(list[idx]);
});

// DELETAR
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const list = await products();
  const before = list.length;
  productsCache = list.filter(p => p.id !== id);
  if (before === productsCache.length)
    return res.status(404).json({ message: "Produto não encontrado" });
  await commit();
  res.json({ ok: true });
});

// CSV
router.get("/export/csv", async (_req, res) => {
  const list = await products();
  const headers = [
    "id","sku","nome","peso","custo",
    "preco_venda_A","preco_venda_B","preco_venda_C",
    "preco_venda_A_prazo","preco_venda_B_prazo","preco_venda_C_prazo",
    "bonificacao_unitaria"
  ];
  const rows = [headers.join(",")];
  for (const p of list) {
    rows.push(headers.map(h => JSON.stringify(p[h] ?? "")).join(","));
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="produtos.csv"');
  res.send(rows.join("\n"));
});

// HTML
router.get("/export/html", async (_req, res) => {
  const list = await products();
  const fmt = v => Number.isFinite(v) ? Number(v).toFixed(2) : (v ?? "");
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Catálogo de Produtos</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto;background:#0f172a;color:#e2e8f0;margin:24px}
  table{width:100%;border-collapse:separate;border-spacing:0 8px}
  th,td{padding:12px 14px;text-align:left}
  th{color:#94a3b8;font-weight:600}
  tr{background:#0b1220;border-radius:12px}
  tr td:first-child{border-top-left-radius:12px;border-bottom-left-radius:12px}
  tr td:last-child{border-top-right-radius:12px;border-bottom-right-radius:12px}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px}
  .custo{background:#1e40af33;color:#93c5fd}
  .av{background:#10b98133;color:#86efac}
  .bz{background:#ffffff22;color:#e2e8f0;border:1px solid #ffffff33}
  .cz{background:#f59e0b33;color:#fde68a}
</style></head>
<body>
  <h1>Sulpet • Tabela de Produtos</h1>
  <table>
    <thead>
      <tr>
        <th>ID</th><th>SKU</th><th>Nome</th><th>Peso</th>
        <th>Custo</th>
        <th>A (à vista)</th><th>A (prazo)</th>
        <th>B (à vista)</th><th>B (prazo)</th>
        <th>C (à vista)</th><th>C (prazo)</th>
      </tr>
    </thead>
    <tbody>
      ${list.map(p => `
        <tr>
          <td>${p.id}</td>
          <td>${p.sku}</td>
          <td>${p.nome}</td>
          <td>${p.peso ?? ""}</td>
          <td><span class="badge custo">R$ ${fmt(p.custo)}</span></td>
          <td><span class="badge av">R$ ${fmt(p.preco_venda_A)}</span></td>
          <td><span class="badge av">R$ ${fmt(p.preco_venda_A_prazo)}</span></td>
          <td><span class="badge bz">R$ ${fmt(p.preco_venda_B)}</span></td>
          <td><span class="badge bz">R$ ${fmt(p.preco_venda_B_prazo)}</span></td>
          <td><span class="badge cz">R$ ${fmt(p.preco_venda_C)}</span></td>
          <td><span class="badge cz">R$ ${fmt(p.preco_venda_C_prazo)}</span></td>
        </tr>`).join("")}
    </tbody>
  </table>
</body></html>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
