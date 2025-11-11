import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR || "/data";
const DB_FILE = path.join(DATA_DIR, "products.json");
const SEED_FILE = path.join(process.cwd(), "src", "server", "seed", "products.seed.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const seed = fs.existsSync(SEED_FILE) ? JSON.parse(fs.readFileSync(SEED_FILE, "utf-8")) : [];
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
  }
}
function readAll() { return JSON.parse(fs.readFileSync(DB_FILE, "utf-8")); }
function writeAll(list) { fs.writeFileSync(DB_FILE, JSON.stringify(list, null, 2)); }
function nextId(list) { return (list.reduce((m, p) => Math.max(m, p.id || 0), 0) || 0) + 1; }
function numOrNull(v) { if (v === "" || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; }
function sanitize(patch) {
  const out = { ...patch };
  const nums = [
    "peso","custo","bonificacao_unitaria",
    "preco_venda_A","preco_venda_B","preco_venda_C",
    "preco_venda_A_prazo","preco_venda_B_prazo","preco_venda_C_prazo",
  ];
  for (const k of nums) if (k in out) out[k] = numOrNull(out[k]);
  if (typeof out.sku === "string") out.sku = out.sku.trim();
  if (typeof out.nome === "string") out.nome = out.nome.trim();
  return out;
}
export function create(body){ const list=readAll(); const item={...sanitize(body), id:nextId(list)}; list.push(item); writeAll(list); return item;}
export function update(id, patch){ const list=readAll(); const i=list.findIndex(x=>x.id===id); if(i<0) return null; list[i]={...list[i], ...sanitize(patch), id}; writeAll(list); return list[i]; }
export function remove(id){ const list=readAll(); const filtered=list.filter(x=>x.id!==id); if(filtered.length===list.length) return false; writeAll(filtered); return true; }
export { ensureDataFile, readAll };
