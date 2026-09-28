import "server-only";
import { Pool } from "pg";
import { DEFAULT_COMPANY, DEFAULT_SETTINGS } from "@/lib/defaults";

const globalForDb = globalThis as unknown as { gvPool?: Pool; gvSchema?: Promise<void> };

export function dbUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

function pool() {
  if (!globalForDb.gvPool) {
    const url = dbUrl();
    if (!url) throw new Error("NO_DATABASE");
    const isLocal = /localhost|127\.0\.0\.1/.test(url);
    globalForDb.gvPool = new Pool({
      connectionString: url,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 5,
    });
  }
  return globalForDb.gvPool;
}

async function createSchema() {
  const p = pool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS gv_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS gv_records (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (collection, id)
    );
    CREATE TABLE IF NOT EXISTS gv_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL
    );
  `);
  await p.query(
    `INSERT INTO gv_settings (key, value) VALUES
       ('company', $1::jsonb), ('settings', $2::jsonb), ('invoiceCounter', '0'::jsonb)
     ON CONFLICT (key) DO NOTHING`,
    [JSON.stringify(DEFAULT_COMPANY), JSON.stringify(DEFAULT_SETTINGS)]
  );
}

export async function db() {
  if (!globalForDb.gvSchema) {
    globalForDb.gvSchema = createSchema().catch((e) => {
      globalForDb.gvSchema = undefined;
      throw e;
    });
  }
  await globalForDb.gvSchema;
  return pool();
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const p = await db();
  const r = await p.query("SELECT value FROM gv_settings WHERE key = $1", [key]);
  return r.rows[0] ? (r.rows[0].value as T) : fallback;
}

export async function setSetting(key: string, value: unknown) {
  const p = await db();
  await p.query(
    `INSERT INTO gv_settings (key, value) VALUES ($1, $2::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, JSON.stringify(value)]
  );
}

export async function nextInvoiceNumber(): Promise<number> {
  const p = await db();
  const r = await p.query(
    `UPDATE gv_settings SET value = to_jsonb((value #>> '{}')::int + 1)
     WHERE key = 'invoiceCounter' RETURNING (value #>> '{}')::int AS n`
  );
  return r.rows[0].n as number;
}

export async function listRecords<T>(collection: string): Promise<T[]> {
  const p = await db();
  const r = await p.query("SELECT data FROM gv_records WHERE collection = $1 ORDER BY created_at", [collection]);
  return r.rows.map((x) => x.data as T);
}

export async function getRecord<T>(collection: string, id: string): Promise<T | null> {
  const p = await db();
  const r = await p.query("SELECT data FROM gv_records WHERE collection = $1 AND id = $2", [collection, id]);
  return r.rows[0] ? (r.rows[0].data as T) : null;
}

export async function putRecord(collection: string, id: string, data: unknown) {
  const p = await db();
  await p.query(
    `INSERT INTO gv_records (collection, id, data) VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [collection, id, JSON.stringify(data)]
  );
}

export async function deleteRecord(collection: string, id: string) {
  const p = await db();
  await p.query("DELETE FROM gv_records WHERE collection = $1 AND id = $2", [collection, id]);
}

export async function deleteWhere(collection: string, field: string, value: string) {
  const p = await db();
  await p.query("DELETE FROM gv_records WHERE collection = $1 AND data->>$2 = $3", [collection, field, value]);
}
