// src/api/health.js
import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR || "/data";
const FILE = path.join(DATA_DIR, "products.json");

export default async (req, res) => {
  try {
    const s = await fs.stat(FILE);
    res.json({ path: FILE, size: s.size, mtime: s.mtime });
  } catch {
    res.json({ path: FILE, exists: false });
  }
};
