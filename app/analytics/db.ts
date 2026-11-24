import "server-only";
import { Pool, types } from "pg";

types.setTypeParser(1184, (value) => new Date(value).toISOString());
types.setTypeParser(1114, (value) => new Date(`${value}Z`).toISOString());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SqlRow = Record<string, any>;

export interface PgStatement extends PromiseLike<SqlRow[]> {
  readonly text: string;
  readonly values: unknown[];
  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<SqlRow[] | TResult>;
  finally(onfinally?: (() => void) | null): Promise<SqlRow[]>;
}

export interface AnalyticsSql {
  (strings: TemplateStringsArray, ...values: unknown[]): PgStatement;
  query(text: string, values?: unknown[]): Promise<SqlRow[]>;
  transaction(statements: PgStatement[]): Promise<SqlRow[][]>;
}

class DeferredPgQuery implements PgStatement {
  readonly text: string;
  readonly values: unknown[];
  private readonly pool: Pool;
  private executed?: Promise<SqlRow[]>;

  constructor(pool: Pool, text: string, values: unknown[]) {
    this.pool = pool;
    this.text = text;
    this.values = values;
  }

  private run(): Promise<SqlRow[]> {
    if (!this.executed) {
      this.executed = this.pool.query(this.text, this.values).then((res) => res.rows);
    }
    return this.executed;
  }

  then<TResult1 = SqlRow[], TResult2 = never>(
    onfulfilled?: ((value: SqlRow[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<SqlRow[] | TResult> {
    return this.run().catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<SqlRow[]> {
    return this.run().finally(onfinally);
  }
}

const globalForAmbDb = globalThis as unknown as {
  __ambAnalyticsSql?: AnalyticsSql | null;
};

function createSqlClient(connectionString: string): AnalyticsSql {
  const disableSsl =
    connectionString.includes("sslmode=disable") ||
    connectionString.includes("127.0.0.1") ||
    connectionString.includes("172.17.0.1") ||
    connectionString.includes("localhost");

  const pool = new Pool({
    connectionString,
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: disableSsl ? false : { rejectUnauthorized: false },
  });

  const baseTag = (strings: TemplateStringsArray, ...values: unknown[]): PgStatement => {
    const text = strings.reduce(
      (acc, part, idx) => (idx === 0 ? part : `${acc}$${idx}${part}`),
      "",
    );
    return new DeferredPgQuery(pool, text, values);
  };

  return Object.assign(baseTag, {
    query: async (text: string, values: unknown[] = []) => {
      const res = await pool.query(text, values);
      return res.rows;
    },
    transaction: async (statements: PgStatement[]) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const results: SqlRow[][] = [];
        for (const stmt of statements) {
          const res = await client.query(stmt.text, stmt.values);
          results.push(res.rows);
        }
        await client.query("COMMIT");
        return results;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  });
}

export function getAnalyticsSql(): AnalyticsSql | null {
  if (globalForAmbDb.__ambAnalyticsSql !== undefined) {
    return globalForAmbDb.__ambAnalyticsSql;
  }
  const connectionString = (process.env.DATABASE_URL || process.env.AMB_DATABASE_URL)?.trim();
  globalForAmbDb.__ambAnalyticsSql = connectionString ? createSqlClient(connectionString) : null;
  return globalForAmbDb.__ambAnalyticsSql;
}

export function analyticsConfigured() {
  return Boolean((process.env.DATABASE_URL || process.env.AMB_DATABASE_URL)?.trim());
}

export function jsonForDatabase(value: unknown, maxLength = 12000) {
  const serialized = JSON.stringify(value ?? {});
  return serialized.length <= maxLength ? serialized : JSON.stringify({ truncated: true });
}
