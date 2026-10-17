# SheetQL

**Excel to DuckDB in your browser.**

SheetQL is a pure client-side app for turning spreadsheets and data files into queryable SQL tables — no server, no upload, no account. Upload a file, paste some data, and query it with SQL (backed by [DuckDB-WASM](https://duckdb.org/docs/stable/clients/wasm/overview)) entirely in your browser. Everything runs via WebAssembly and Web Workers; the database lives in memory only and is reset when you reload the page.

## Features

- **Import** — Excel (`.xlsx` / `.xls` / `.xlsb`), CSV/TSV, ODS, Parquet, Arrow/Feather, JSON/NDJSON, plus a "paste data" modal that sniffs CSV/TSV/JSON.
- **Query** — a multi-tab SQL editor with syntax highlighting, autocomplete (keywords, tables, and columns), a SQL formatter, and multi-statement execution.
- **Export** — query results as Excel/CSV/ODS, and all tables as Excel/ODS.
- **Themes & languages** — light/dark (plus a "chocolate" palette) and four locales (English, Spanish, German, French).
- **Private by design** — no server and no persistence. Your data never leaves the browser.

## Getting started

```sh
npm install        # installs the (versioned) dependencies
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # production build into dist/ (--base=/sheetql/ for GitHub Pages)
npm run preview    # serve the production dist/ locally
npm run deploy     # build (predeploy) + publish dist/ to GitHub Pages via gh-pages
```

## How it works

| Step | What happens |
| --- | --- |
| **Import** | Files are routed by extension. Parquet/Arrow/Feather/JSON/NDJSON go to DuckDB's native readers (`read_parquet`, `read_json_auto`, `insertArrowFromIPCStream`); Excel/CSV/ODS are parsed by [SheetJS](https://sheetjs.com/) and shown in a sheet-selection modal before being loaded as tables. Pasted data is sniffed and routed the same way. |
| **Query** | Each tab is a textarea overlayed on a highlighted `<pre>`. `executeSql` splits the editor on `;` (string- and comment-aware), runs each statement with DuckDB, and reports per-statement errors. The formatter (Ctrl/Cmd+Shift+F) is a conservative tokenizer-based pretty-printer. |
| **Export** | Results can be downloaded as Excel/CSV/ODS. Previews are capped at 1,000 rows; exports always use the full result set. |

Column types are inferred per column, identifiers are safely quoted, and values are inserted via escaped string literals in batches.

## Tech stack

Built with [Vite](https://vite.dev) and split into small ES modules under `src/`:

- `app.js` — entry point; wires up DOM events and boots the app.
- `state.js` — shared DOM-element map, mutable `state`, and UI helpers.
- `duckdb.js` — DuckDB-WASM lifecycle and all DB access.
- `xlsx.js` — SheetJS parsing and the workbook import flow.
- `render.js` — the tables list.
- `tabs.js` — multi-query-tab manager.
- `sql.js` — SQL editor highlight + execution + export.
- `sql-text.js` — SQL tokenizer, statement splitter, and formatter.
- `autocomplete.js` — caret-following completion popup.
- `utils.js` — shared helpers (escaping, quoting, naming, cell formatting).
- `i18n.js` — localization (en/es/de/fr).
- `theme.js` — theme switcher.

### Dependencies

- [`@duckdb/duckdb-wasm`](https://www.npmjs.com/package/@duckdb/duckdb-wasm) — the DuckDB browser bundle plus paired `.wasm`/`.worker.js` assets.
- [`apache-arrow`](https://www.npmjs.com/package/apache-arrow) — result normalization, pinned to the version DuckDB expects (`^21.2.0`).
- [`xlsx`](https://sheetjs.com/) (SheetJS) — installed from SheetJS's CDN tarball (the npm registry package is stale).
- [`bootstrap`](https://getbootstrap.com/) — CSS and the `Modal`/`Toast` JS components.

### DuckDB bundle wiring

DuckDB's assets are imported explicitly via Vite's `?url` suffix so Vite emits and hashes them. The `.wasm` and `.worker.js` files must stay paired (e.g. `duckdb-mvp.wasm` with `duckdb-browser-mvp.worker.js`).

## Privacy & persistence

The database is in-memory only — nothing survives a reload, and nothing is ever sent to a server. OPFS persistence was previously attempted but removed due to an upstream duckdb-wasm write-mode bug; if "save my work" is ever needed again, `EXPORT DATABASE` to a `.duckdb` file is the safe route.

## License

Licensed under the [GNU General Public License, version 2](./LICENSE).
