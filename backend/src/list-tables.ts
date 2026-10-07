import { query } from "./db.js";
const r=await query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"); console.table(r.rows); process.exit(0);
