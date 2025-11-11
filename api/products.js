// backend/api/products.js
import { Router } from "express";

let products = [
  {
    id: 1,
    sku: "573",
    nome: "Teks Dog Original 18% 7kg",
    peso: 7,
    custo: 18.88,
    preco_venda_A: 30.00, preco_venda_B: 29.09, preco_venda_C: 28.21,
    preco_venda_A_prazo: 30.93, preco_venda_B_prazo: 29.99, preco_venda_C_prazo: 29.08,
    bonificacao_unitaria: 0
  }
];

const router = Router();

// LISTAR
router.get("/", (_req, res) => res.json(products));

// CRIAR
router.post("/", (req, res) => {
  const body = req.body || {};
  const id = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
  const novo = { id, ...body };
  products.push(novo);
  res.status(201).json(novo);
});

// ATUALIZAR
router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const idx = products.findIndex(p => p.id === id);
  if (idx < 0) return res.status(404).json({ message: "Produto não encontrado" });
  products[idx] = { ...products[idx], ...req.body, id };
  res.json(products[idx]);
});

// DELETAR
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const before = products.length;
  products = products.filter(p => p.id !== id);
  if (before === products.length) return res.status(404).json({ message: "Produto não encontrado" });
  res.json({ ok: true });
});

// CSV
router.get("/export/csv", (_req, res) => {
  const headers = [
    "id","sku","nome","peso","custo",
    "preco_venda_A","preco_venda_B","preco_venda_C",
    "preco_venda_A_prazo","preco_venda_B_prazo","preco_venda_C_prazo",
    "bonificacao_unitaria"
  ];
  const rows = [headers.join(",")];
  for (const p of products) {
    rows.push(headers.map(h => JSON.stringify(p[h] ?? "")).join(","));
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="produtos.csv"');
  res.send(rows.join("\n"));
});

// HTML estiloso (cores solicitadas)
router.get("/export/html", (_req, res) => {
  const fmt = v => isFinite(v) ? Number(v).toFixed(2) : v ?? "";
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Catálogo de Produtos</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto; background:#0f172a; color:#e2e8f0; margin:24px;}
  .brand{display:flex;align-items:center;gap:12px;margin-bottom:16px}
  .brand img{width:40px;height:40px}
  h1{margin:0;font-size:20px}
  table{width:100%;border-collapse:separate;border-spacing:0 8px}
  th,td{padding:12px 14px;text-align:left}
  th{color:#94a3b8;font-weight:600}
  tr{background:#0b1220;border-radius:12px}
  tr td:first-child{border-top-left-radius:12px;border-bottom-left-radius:12px}
  tr td:last-child{border-top-right-radius:12px;border-bottom-right-radius:12px}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px}
  .custo{background:#1e40af33;color:#93c5fd} /* custo: azul claro */
  .av{background:#10b98133;color:#86efac}   /* A (à vista): verde   */
  .bz{background:#ffffff22;color:#e2e8f0;border:1px solid #ffffff33} /* B: branco */
  .cz{background:#f59e0b33;color:#fde68a}   /* C: amarelo escuro    */
</style></head>
<body>
  <div class="brand">
    <img src="/public/logo.png" alt="logo"/>
    <h1>Sulpet • Tabela de Produtos</h1>
  </div>
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
      ${products.map(p => `
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
