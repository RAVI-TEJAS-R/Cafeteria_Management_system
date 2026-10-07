import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { query } from "./db.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function ensureDatabase() {
  const check = await query(
    "SELECT to_regclass('public.roles') AS table_name",
  );

  if (check.rows[0]?.table_name) {
    return false;
  }

  const schema = await fs.readFile(
    path.join(projectRoot, "database", "schema", "01_tables.sql"),
    "utf8",
  );
  const seed = await fs.readFile(
    path.join(projectRoot, "database", "seed", "02_clean_demo_seed.sql"),
    "utf8",
  );

  await query(schema);
  await query(seed);
  console.log("PostgreSQL schema and synthetic demo data initialized.");
  return true;
}
