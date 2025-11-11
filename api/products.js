import express from "express";
import { ensureDataFile, readAll, create, update, remove } from "../server/productsStore.js";

const router = express.Router();
ensureDataFile();

const requireAuth = (req, res, next) => next();

// CRUD
router.get("/", requireAuth, (_req, res) => res.json(readAll()));
router.post("/", requireAuth, (req, res) => {
  const b = req.body || {};
  if (!b.nome || !b.sku) return res.status(400).json({ message: "nome e sku são obrigatórios" });
  const item = create(b);
  res.status(201).json(item);
});
router.put("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const upd = update(id, req.body || {});
  if (!upd) return res.status(404).json({ message: "not found" });
  res.json(upd);
});
router.delete("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const ok = remove(id);
  if (!ok) return res.status(404).json({ message: "not found" });
  res.json({ ok: true });
});

// Export CSV
router.get("/export.csv", requireAuth, (_req, res) => {
  const rows = readAll();
  const headers = ["id","sku","nome","peso","preco_venda_A","preco_venda_B","preco_venda_C","preco_venda_A_prazo","preco_venda_B_prazo","preco_venda_C_prazo","custo","bonificacao_unitaria"];
  const escape = (v) => {
    if (v == null) return "";
    const s = String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(";")].concat(rows.map(r => headers.map(h => escape(r[h] ?? "")).join(";"))).join("\n");
  const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="produtos-${stamp}.csv"`);
  res.send("\uFEFF" + csv);
});

// Export HTML (com cores e logo)
router.get("/export.html", requireAuth, (req, res) => {
  const items = readAll();
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const logoUrl = `${baseUrl}/static/logo.png`;
  const stamp = new Date().toISOString().replace("T"," ").slice(0,19);

  const azul = "#1e63b8";
  const azulClaro = "#8ec5ff";
  const verde = "#16a34a";
  const amareloC = "#eab308";
  const fundo = "#0f172a";
  const carta = "#0b1220";

  const style = `
    :root { color-scheme: dark; }
    * { box-sizing:border-box; }
    body { margin:0; background:${fundo}; color:#e5e7eb; font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial; }
    .wrap { max-width:1200px; margin:28px auto; padding:0 16px; }
    .head { display:flex; align-items:center; gap:16px; margin-bottom:16px; }
    .head img { width:56px; height:56px; border-radius:50%; object-fit:cover; box-shadow:0 0 0 3px ${azul}; }
    .card { background:${carta}; border:1px solid rgba(255,255,255,.08); border-radius:14px; padding:16px; }
    h1 { margin:0; font-size:20px; }
    .meta { color:#94a3b8; font-size:12px; }
    table { width:100%; border-collapse:separate; border-spacing:0; margin-top:10px; }
    thead th { font-size:12px; letter-spacing:.02em; text-transform:uppercase; color:#cbd5e1; padding:12px 10px; position:sticky; top:0; background:${carta}; border-bottom:1px solid rgba(255,255,255,.08) }
    tbody td { padding:10px; border-bottom:1px solid rgba(255,255,255,.06); font-size:14px; }
    tbody tr:nth-child(odd){ background:rgba(255,255,255,.02) }
    .sku { font-variant-numeric: tabular-nums; color:#cbd5e1; }
    .peso { color:#cbd5e1; }
    .preco { text-align:right; font-variant-numeric: tabular-nums; }
    .vista-title, .prazo-title { color:white; text-align:center; background:${verde}; }
    .prazo-title { background:${verde}; opacity:.9; }
    .col-C { background:${amareloC}22; }
    .col-custo { background:${azulClaro}22; }
    .nome { font-weight:600; color:#e2e8f0; }
    .rodape { margin-top:8px; color:#94a3b8; font-size:12px;}
    @media print {
      body { background:white; color:black; }
      .card { background:white; border-color:#ddd; }
      .vista-title, .prazo-title, .col-C, .col-custo { -webkit-print-color-adjust:exact; print-color-adjust: exact; }
    }
  `;

  const headerRow = `
    <tr>
      <th rowspan="2">SKU</th>
      <th rowspan="2" style="text-align:left;">Produto</th>
      <th rowspan="2">Peso</th>
      <th colspan="3" class="vista-title">À vista</th>
      <th colspan="3" class="prazo-title">A prazo</th>
      <th rowspan="2">Bonif.</th>
      <th rowspan="2">Custo</th>
    </tr>
    <tr>
      <th>A</th><th>B</th><th>C</th>
      <th>A</th><th>B</th><th>C</th>
    </tr>
  `;

  const fmt = (v) => typeof v === "number" ? v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}) : (v ?? "");
  const rowsHtml = items.map(p => `
    <tr>
      <td class="sku">${p.sku}</td>
      <td class="nome">${p.nome}</td>
      <td class="peso">${p.peso ?? ""} kg</td>
      <td class="preco">${fmt(p.preco_venda_A)}</td>
      <td class="preco">${fmt(p.preco_venda_B)}</td>
      <td class="preco col-C">${fmt(p.preco_venda_C)}</td>
      <td class="preco">${fmt(p.preco_venda_A_prazo)}</td>
      <td class="preco">${fmt(p.preco_venda_B_prazo)}</td>
      <td class="preco col-C">${fmt(p.preco_venda_C_prazo)}</td>
      <td class="preco">${fmt(p.bonificacao_unitaria)}</td>
      <td class="preco col-custo">${fmt(p.custo)}</td>
    </tr>
  `).join("");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Tabela de Produtos • ${stamp}</title>
<link rel="icon" href="${logoUrl}" />
<style>${style}</style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <img src="${logoUrl}" alt="Logo" />
      <div>
        <h1>Tabela de Produtos</h1>
        <div class="meta">Gerado em ${stamp}</div>
      </div>
    </div>
    <div class="card">
      <table>
        <thead>${headerRow}</thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="rodape">À vista / A prazo em <span style="color:${verde}">verde</span>,
        preço C em <span style="color:${amareloC}">amarelo</span>, custo em
        <span style="color:${azulClaro}">azul claro</span>.
      </div>
    </div>
  </div>
</body>
</html>`;

  const fileName = `produtos-${stamp.replace(/[: ]/g, "-")}.html`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
  res.send(html);
});

export default router;
