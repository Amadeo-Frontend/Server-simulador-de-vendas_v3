import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "/data";
const FILE = path.join(DATA_DIR, "products.json");

export async function loadProducts() {
  try {
    const buf = await fs.readFile(FILE, "utf-8");
    return JSON.parse(buf);
  } catch (e) {
    if (e.code === "ENOENT") return []; // primeiro uso
    throw e;
  }
}

export async function saveProducts(arr) {
  const tmp = FILE + ".tmp";
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(tmp, JSON.stringify(arr, null, 2));
  await fs.rename(tmp, FILE); // gravação atômica
  return arr;
}
