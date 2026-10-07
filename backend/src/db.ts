import { Pool, PoolClient, QueryResult } from "pg";
import dotenv from "dotenv";

dotenv.config();

const poolInstance = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
  max: Number(process.env.DB_POOL_MAX ?? 10),
});

function isOutBind(value: unknown): boolean {
  return !!value && typeof value === "object" && "dir" in (value as Record<string, unknown>);
}

function normalizeSql(sql: string): string {
  return sql
    .replace(/\bSYSTIMESTAMP\b/gi, "CURRENT_TIMESTAMP")
    .replace(/\bSYSDATE\b/gi, "CURRENT_DATE")
    .replace(/\bNVL\s*\(/gi, "COALESCE(")
    .replace(/\bFROM\s+dual\b/gi, "")
    .replace(/TO_DATE\(\s*(\$[0-9]+)\s*,\s*'YYYY-MM-DD'\s*\)/gi, "$1::date")
    .replace(/TO_TIMESTAMP\(\s*(\$[0-9]+)\s*,\s*'HH24:MI'\s*\)/gi, "$1::time")
    .replace(/TO_TIMESTAMP\(\s*(\$[0-9]+)\s*,\s*'YYYY-MM-DD HH24:MI:SS'\s*\)/gi, "$1::timestamp")
    .replace(/\bNUMBER\b/g, "numeric");
}

function translateNamedBinds(
  originalSql: string,
  binds: Record<string, unknown> = {},
): { sql: string; values: unknown[] } {
  const outBindNames = new Set(
    Object.entries(binds)
      .filter(([, value]) => isOutBind(value))
      .map(([key]) => key),
  );

  let sql = originalSql.replace(
    /\s+RETURNING\s+([a-zA-Z0-9_",\s]+?)\s+INTO\s+:[a-zA-Z_][a-zA-Z0-9_]*/gi,
    " RETURNING $1",
  );

  const values: unknown[] = [];
  const positions = new Map<string, number>();

  sql = sql.replace(/(?<!:):([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, name: string) => {
    if (outBindNames.has(name)) {
      return "NULL";
    }

    if (!positions.has(name)) {
      positions.set(name, values.length + 1);
      values.push(binds[name]);
    }

    return `$${positions.get(name)}`;
  });

  return { sql: normalizeSql(sql), values };
}

class PgConnection {
  constructor(private client: PoolClient) {}

  async execute<T = any>(
    sql: string,
    binds: Record<string, unknown> = {},
    options: { outFormat?: number } = {},
  ): Promise<{
    rows: T[];
    rowsAffected: number;
    outBinds?: Record<string, unknown>;
  }> {
    // Oracle PL/SQL blocks are handled by the converted route code.
    if (/^\s*BEGIN\b/i.test(sql)) {
      throw new Error("Oracle PL/SQL is not supported by the PostgreSQL adapter.");
    }

    const { sql: translated, values } = translateNamedBinds(sql, binds);
    const result: QueryResult = await this.client.query(translated, values);

    const rows = options.outFormat === 4002
      ? result.rows
      : result.rows.map((row) => Object.values(row));

    const outBinds: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(binds)) {
      if (isOutBind(value)) {
        const row = result.rows[0];
        if (row) {
          const column = Object.keys(row)[0];
          outBinds[name] = row[column];
        }
      }
    }

    return {
      rows: rows as T[],
      rowsAffected: result.rowCount ?? 0,
      ...(Object.keys(outBinds).length ? { outBinds } : {}),
    };
  }

  async commit() {
    await this.client.query("COMMIT");
  }

  async rollback() {
    await this.client.query("ROLLBACK");
  }

  async close() {
    async close() {
  try {
    await this.client.query("ROLLBACK");
  } catch {
    // Ignore rollback errors while releasing the connection.
  }

  this.client.release();
}
  }
}

export const pool = {
  async getConnection() {
    const client = await poolInstance.connect();
    await client.query("BEGIN");
    return new PgConnection(client);
  },
};

export async function query(sql: string, values: unknown[] = []) {
  return poolInstance.query(sql, values);
}

export async function closePool() {
  await poolInstance.end();
}
