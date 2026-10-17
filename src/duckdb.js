// duckdb.js — DuckDB-WASM lifecycle, querying, and table DDL/DML.

import * as duckdb from '@duckdb/duckdb-wasm';
import mvpWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import ehWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import mvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import ehWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import { INSERT_BATCH, setDbStatus } from './state.js';
import { normalizeValue, quoteIdent, formatDisplay, fileExt } from './utils.js';

const MANUAL_BUNDLES = {
  mvp: {
    mainModule: mvpWasm,
    mainWorker: mvpWorker,
  },
  eh: {
    mainModule: ehWasm,
    mainWorker: ehWorker,
  },
};

let db = null;
let conn = null;

export async function initDuckDB() {
  setDbStatus('dbInitializing', 'text-bg-secondary');
  const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
  const worker = new Worker(bundle.mainWorker);
  const logger = new duckdb.VoidLogger();
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker || null);
  conn = await db.connect();
  setDbStatus('dbReady', 'text-bg-success');
}

export async function runQuery(sql) {
  const table = await conn.query(sql);
  const fields = table.schema.fields;
  const columns = fields.map((f) => f.name);
  const types = fields.map((f) => f.type);
  const rows = [];
  for (let i = 0; i < table.numRows; i++) {
    const values = table.get(i).toArray();
    rows.push(values.map((v, j) => normalizeValue(v, types[j])));
  }
  return { columns, rows, numRows: table.numRows };
}

function formatValue(v, type) {
  if (v === null || v === undefined) return 'NULL';
  switch (type) {
    case 'BIGINT':
      if (typeof v === 'number' && Number.isInteger(v)) return String(v);
      if (typeof v === 'bigint') return String(v);
      if (typeof v === 'string') {
        const n = Number(v);
        if (Number.isInteger(n)) return String(n);
      }
      return 'NULL';
    case 'DOUBLE':
      if (typeof v === 'number' && Number.isFinite(v)) return String(v);
      if (typeof v === 'bigint') return String(v);
      if (typeof v === 'string') {
        const n = Number(v);
        if (Number.isFinite(n)) return String(n);
      }
      return 'NULL';
    case 'BOOLEAN':
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
      if (v === 1 || v === '1' || v === 'true' || v === 'TRUE') return 'TRUE';
      if (v === 0 || v === '0' || v === 'false' || v === 'FALSE') return 'FALSE';
      return 'NULL';
    case 'TIMESTAMP':
      if (v instanceof Date) return `'${formatDisplay(v)}'`;
      if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
      return 'NULL';
    default:
      return `'${String(v).replace(/'/g, "''")}'`;
  }
}

export async function createTable(tableName, columns, types) {
  const defs = columns.map((c, j) => `${quoteIdent(c)} ${types[j]}`).join(', ');
  await conn.query(`CREATE TABLE ${quoteIdent(tableName)} (${defs})`);
}

export async function insertRows(tableName, ncols, types, dataRows) {
  for (let i = 0; i < dataRows.length; i += INSERT_BATCH) {
    const chunk = dataRows.slice(i, i + INSERT_BATCH);
    const tuples = chunk.map((row) => {
      const vals = [];
      for (let j = 0; j < ncols; j++) vals.push(formatValue(row[j], types[j]));
      return `(${vals.join(', ')})`;
    });
    await conn.query(`INSERT INTO ${quoteIdent(tableName)} VALUES ${tuples.join(', ')}`);
  }
}

export async function dropTable(name) {
  await conn.query(`DROP TABLE IF EXISTS ${quoteIdent(name)}`);
}

// ---------------------------------------------------------------------------
// Structured file loading (Parquet / Arrow / JSON) via DuckDB's native readers
// ---------------------------------------------------------------------------

export async function loadStructuredFile(file, tableName) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const ext = fileExt(file.name);

  if (ext === '.arrow' || ext === '.feather') {
    await conn.insertArrowFromIPCStream(buf, { name: tableName });
    return;
  }

  const reg = `__import_${Date.now()}_${Math.random().toString(36).slice(2)}${ext || '.data'}`;
  await db.registerFileBuffer(reg, buf);
  try {
    const lit = `'${reg.replace(/'/g, "''")}'`;
    if (ext === '.json' || ext === '.ndjson') {
      await conn.query(`CREATE TABLE ${quoteIdent(tableName)} AS SELECT * FROM read_json_auto(${lit})`);
    } else {
      await conn.query(`CREATE TABLE ${quoteIdent(tableName)} AS SELECT * FROM read_parquet(${lit})`);
    }
  } finally {
    await db.dropFile(reg).catch(() => {});
  }
}

export async function loadJsonText(text, tableName) {
  const reg = `__paste_${Date.now()}_${Math.random().toString(36).slice(2)}.json`;
  await db.registerFileText(reg, text);
  try {
    await conn.query(
      `CREATE TABLE ${quoteIdent(tableName)} AS SELECT * FROM read_json_auto('${reg.replace(/'/g, "''")}')`
    );
  } finally {
    await db.dropFile(reg).catch(() => {});
  }
}
