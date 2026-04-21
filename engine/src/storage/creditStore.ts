/**
 * Read-only reader for the credit_profiles table that the Python indexer
 * populates (see indexer/src/storage.py).
 *
 * The DuckDB file lives at indexer/.data/clarity.duckdb — engine and indexer
 * share a single filesystem path. If the file does not exist yet (fresh
 * clone, indexer never run), reads return null and the route replies 404.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DuckDBInstance } from '@duckdb/node-api';

const DB_PATH = resolve(process.cwd(), '../indexer/.data/clarity.duckdb');

let instance: DuckDBInstance | null = null;

async function getInstance(): Promise<DuckDBInstance | null> {
  if (!existsSync(DB_PATH)) return null;
  if (instance) return instance;
  instance = await DuckDBInstance.create(DB_PATH, { access_mode: 'READ_ONLY' });
  return instance;
}

export async function readCreditProfile(address: string): Promise<unknown | null> {
  const db = await getInstance();
  if (!db) return null;

  const conn = await db.connect();
  try {
    const rows = await conn.runAndReadAll(
      `SELECT json_blob FROM credit_profiles WHERE address = ? LIMIT 1`,
      [address.toLowerCase()],
    );
    const arr = rows.getRows();
    if (arr.length === 0) return null;
    const first = arr[0];
    if (!first) return null;
    const blob = first[0];
    if (typeof blob !== 'string') return null;
    return JSON.parse(blob);
  } finally {
    conn.closeSync();
  }
}

export async function profilesCount(): Promise<number> {
  const db = await getInstance();
  if (!db) return 0;
  const conn = await db.connect();
  try {
    const rows = await conn.runAndReadAll(`SELECT count(*) FROM credit_profiles`);
    const first = rows.getRows()[0];
    const n = first ? first[0] : 0;
    return typeof n === 'bigint' ? Number(n) : Number(n ?? 0);
  } finally {
    conn.closeSync();
  }
}
