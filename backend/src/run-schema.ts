import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { query } from "./db.js";
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sql = await fs.readFile(path.join(root, "database", "schema", "01_tables.sql"), "utf8").catch(async () =>
  fs.readFile(path.join(root, "..", "database", "schema", "01_tables.sql"), "utf8"));
await query(sql);
console.log("PostgreSQL schema installed.");
process.exit(0);
