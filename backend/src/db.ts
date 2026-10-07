import { Pool, PoolClient, QueryResult } from "pg";
import dotenv from "dotenv";

dotenv.config();

const poolInstance = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: Number(process.env.DB_POOL_MAX ?? 10),
});

function isOutBind(value: unknown): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    "dir" in (value as Record<string, unknown>)
  );
}

function normalizeSql(sql: string): string {
  return sql
    .replace(/\bSYSTIMESTAMP\b/gi, "CURRENT_TIMESTAMP")
    .replace(/\bSYSDATE\b/gi, "CURRENT_DATE")
    .replace(/\bNVL\s*\(/gi, "COALESCE(")
    .replace(/\bFROM\s+dual\b/gi, "")
    .replace(
      /TO_DATE\(\s*(\$[0-9]+)\s*,\s*'YYYY-MM-DD'\s*\)/gi,
      "$1::date",
    )
    .replace(
      /TO_TIMESTAMP\(\s*(\$[0-9]+)\s*,\s*'HH24:MI'\s*\)/gi,
      "$1::time",
    )
    .replace(
      /TO_TIMESTAMP\(\s*(\$[0-9]+)\s*,\s*'YYYY-MM-DD HH24:MI:SS'\s*\)/gi,
      "$1::timestamp",
    )
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

  /*
   * Convert Oracle-style named binds:
   *
   *     :user_id
   *
   * into PostgreSQL positional binds:
   *
   *     $1
   *
   * IMPORTANT:
   * Do NOT convert things such as :MI inside SQL strings:
   *
   *     'HH24:MI'
   *
   * The parser below keeps quoted strings untouched.
   */

  let resultSql = "";
  let inSingleQuote = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];

    // Handle SQL string literals.
    if (char === "'") {
      resultSql += char;

      // PostgreSQL/SQL escaped quote: ''
      if (sql[i + 1] === "'") {
        resultSql += sql[++i];
      } else {
        inSingleQuote = !inSingleQuote;
      }

      continue;
    }

    // Only process :bind_name when outside a quoted string.
    if (!inSingleQuote && char === ":" && sql[i + 1] !== ":") {
      const match = sql
        .slice(i)
        .match(/^:([a-zA-Z_][a-zA-Z0-9_]*)/);

      if (match) {
        const name = match[1];

        // Handle Oracle OUT binds.
        if (outBindNames.has(name)) {
          resultSql += "NULL";
        } else {
          if (!positions.has(name)) {
            positions.set(name, values.length + 1);
            values.push(binds[name]);
          }

          resultSql += `$${positions.get(name)}`;
        }

        // Move past the bind name.
        i += name.length;
        continue;
      }
    }

    resultSql += char;
  }

  sql = resultSql;

  return {
    sql: normalizeSql(sql),
    values,
  };
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
    // Oracle PL/SQL blocks are not supported.
    // Converted route code should use normal SQL instead.
    if (/^\s*BEGIN\b/i.test(sql)) {
      throw new Error(
        "Oracle PL/SQL is not supported by the PostgreSQL adapter.",
      );
    }

    const {
      sql: translated,
      values,
    } = translateNamedBinds(sql, binds);

    console.log("PG QUERY:", translated);
    console.log("PG VALUES:", values);

    const result: QueryResult = await this.client.query(
      translated,
      values,
    );

    const rows =
      options.outFormat === 4002
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
      ...(Object.keys(outBinds).length > 0
        ? { outBinds }
        : {}),
    };
  }

  async commit() {
    await this.client.query("COMMIT");
  }

  async rollback() {
    await this.client.query("ROLLBACK");
  }

  async close() {
    try {
      await this.client.query("ROLLBACK");
    } catch {
      // Ignore rollback errors while releasing the connection.
    }

    this.client.release();
  }
}

export const pool = {
  async getConnection() {
    const client = await poolInstance.connect();

    await client.query("BEGIN");

    return new PgConnection(client);
  },
};

export async function query(
  sql: string,
  values: unknown[] = [],
) {
  return poolInstance.query(sql, values);
}

export async function closePool() {
  await poolInstance.end();
}
