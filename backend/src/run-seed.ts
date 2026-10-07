import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { query } from "./db.js";
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const candidates = [
  path.join(root, "database", "seed", "02_clean_demo_seed.sql"),
  path.join(root, "..", "database", "seed", "02_clean_demo_seed.sql"),
];
let sql = "";
for (const file of candidates) { try { sql = await fs.readFile(file, "utf8"); break; } catch {} }
if (!sql) throw new Error("Seed file not found.");
await query(sql);
console.log("Synthetic demo data seeded.");
process.exit(0);
