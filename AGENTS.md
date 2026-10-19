# AGENTS.md

Pure client-side app: upload spreadsheets and data files, query them with DuckDB-WASM in the browser, and export results back out. Everything runs in the browser via WebAssembly and Web Workers — there is no server and no persistence; the DuckDB database lives in memory only and is reset on reload.

- **Import**: Excel (`.xlsx`/`.xls`/`.xlsb`), CSV/TSV, ODS, Parquet, Arrow/Feather, JSON/NDJSON — plus a "paste data" modal.
- **Query**: a multi-tab SQL editor with syntax highlighting, autocomplete (keywords/tables/columns), a SQL formatter, and multi-statement execution.
- **Export**: query results as Excel/CSV/ODS; all tables as Excel/ODS.

Built with [Vite](https://vite.dev).

## Run

```sh
npm install        # installs the (versioned) dependencies
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # production build into dist/ (--base=/sheetql/ for GitHub Pages)
npm run preview    # serve the production dist/ locally
npm run deploy     # build (predeploy) + publish dist/ to GitHub Pages via gh-pages
```

## Architecture

`index.html` is the Vite entry point. It contains all the markup, the inline anti-flash theme script, and `<script type="module" src="/src/app.js">`. There is no importmap and no vendored `<script>` tags — dependencies are resolved by Vite from `node_modules`.

The app is split into small ES modules under `src/`:

- `app.js` — entry point; wires up DOM events and boots the app (`initI18n` → `initTheme` → `initTabs` → `initDuckDB` → `refreshTables`).
- `state.js` — the shared `els` map (all DOM element IDs centralized here), the mutable `state` object, and small UI helpers (`toast`, `setLoading`, `setDbStatus`). Also holds the constants `MAX_PREVIEW_ROWS`, `INSERT_BATCH`, `TYPE_OPTIONS`.
- `duckdb.js` — DuckDB-WASM lifecycle and all DB access: `initDuckDB` (instantiate + connect, in-memory), `runQuery`, DDL/DML (`createTable`/`insertRows`/`dropTable`), and the structured-file readers (`loadStructuredFile`, `loadJsonText`).
- `xlsx.js` — SheetJS parsing and the workbook import flow: `handleFile` (routes by extension), `parseWorkbook`/`loadConfiguredWorkbook` (sheet-selection modal), `loadPastedData`, `inferType`.
- `render.js` — the tables list: `refreshTables` (reads `information_schema` into `state.tables`), `renderTablesList`, `selectTable`, `clearAllTables`.
- `tabs.js` — multi-query-tab manager (`initTabs`, `getActiveTab`, `resetAllTabs`, `refreshAllResults`, `refreshTabsLabels`, `updateTabsEnabled`).
- `sql.js` — SQL editor highlight + execution + export: `executeSql`, `renderSqlResult`, `downloadQueryResult`, `downloadAllTables`.
- `sql-text.js` — shared SQL text utilities: `SQL_KEYWORDS`, `tokenizeSQL`, `splitStatements`, `formatSQL`.
- `autocomplete.js` — `attachAutocomplete(tab)`, the caret-following completion popup.
- `utils.js` — `esc`, `quoteIdent`, `excelColumnName`, `sanitizeName`, `fileExt`, `normalizeValue`, `formatDisplay`, `serializeCell`.
- `i18n.js` — localization (`t`, `formatNumber`, `setLocale`, `init`, `labels`, `available`). Four locales: en/es/de/fr.
- `theme.js` — `init`, the theme switcher (light/dark/light-chocolate/dark-chocolate).
- `style.css` — all custom styles.

`vite.config.js` is minimal (`build.target: 'esnext'`). The GitHub Pages base is set with `--base=/sheetql/` on `npm run build`, not in the config, so `npm run dev` serves from `/`.

## Dependencies (real npm packages, no vendoring)

- `@duckdb/duckdb-wasm` — the `duckdb-browser` ES module plus the paired `.wasm`/`.worker.js` bundles.
- `apache-arrow` — used by `app.js`/`duckdb.js` (`Type`/`TimeUnit` for result normalization) and by `@duckdb/duckdb-wasm` internally. Pin it to the same version DuckDB expects (currently `^21.2.0`) so there's a single Arrow instance and enum values line up.
- `xlsx` (SheetJS) — installed from SheetJS's CDN tarball (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`), because the npm registry package is stale (0.18.5). Imported as `import * as XLSX from 'xlsx'` (its ESM `xlsx.mjs` entry).
- `bootstrap` — CSS imported as `import 'bootstrap/dist/css/bootstrap.min.css'`; JS imported as `import * as bootstrap from 'bootstrap'` (the `bootstrap.esm.js` named exports: `Modal`, `Toast`, …).

### DuckDB bundle wiring

`duckdb.js` selects the DuckDB bundle explicitly through `MANUAL_BUNDLES`, with each asset imported via Vite's `?url` suffix so Vite emits and hashes them:

```js
import * as duckdb from '@duckdb/duckdb-wasm';
import mvpWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import ehWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import mvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import ehWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
```

The worker and wasm must stay paired (e.g. `duckdb-mvp.wasm` with `duckdb-browser-mvp.worker.js`); breaking the pairing breaks instantiation. The worker files are self-contained classic workers, so they are imported as `?url` assets (not `?worker`) and passed to `new Worker(bundle.mainWorker)` unchanged.

## Data flow / conventions

### Import

- `handleFile(file)` routes by extension. Parquet/Arrow/Feather/JSON/NDJSON (`STRUCTURED_EXTS`) go to DuckDB's native readers (`read_parquet`, `read_json_auto`, `insertArrowFromIPCStream`) via `loadStructuredFile`. Everything else (Excel/CSV/ODS) is parsed by SheetJS in `parseWorkbook` and then shown in the sheet-selection modal; on confirm, `loadConfiguredWorkbook` creates the tables.
- Pasted data: `loadPastedData` sniffs the text — JSON goes to `loadJsonText` (`read_json_auto`), CSV/TSV is parsed by SheetJS and inserted via `createTable`/`insertRows`.
- Sheets → tables: names default to the sheet name (or to the file name for single-sheet CSV/TSV files) and can be edited in the import modal. They are `sanitizeName`d (`[^A-Za-z0-9_]` → `_`, numeric-prefixed names get `t_`) and deduped with a `_2`, `_3`… suffix against existing tables. Column types are inferred per column (`inferType`, restricted to `TYPE_OPTIONS`).
- Identifiers are quoted with `quoteIdent`; values are inserted via string literals (SQL escaping in `formatValue`), batched by `INSERT_BATCH` rows.

### Query

- Each tab is a `textarea.sql-editor` overlaid on a `<pre>.sql-highlight`; `refreshHighlight` re-tokenizes with `tokenizeSQL` and `syncHighlightScroll` keeps them aligned. Autocomplete is attached per tab via `attachAutocomplete`.
- `executeSql` splits the editor contents with `splitStatements` (string/comment-aware, on `;`), runs each statement sequentially with `runQuery`, and reports per-statement errors (`statementFailed`) when there's more than one.
- The formatter button (and Ctrl/Cmd+Shift+F) runs `formatSQL`, a conservative tokenizer-based pretty-printer (keyword uppercasing + clause-per-line), not a full SQL parser.

### Export

- `downloadQueryResult(tab, format)` exports the current result as Excel (`.xlsx`), CSV (`.csv`), or ODS (`.ods`).
- `downloadAllTables(format)` exports every table as Excel or ODS (CSV is single-table, so it's not offered there).
- Browsing/preview is capped at `MAX_PREVIEW_ROWS` (1000); exports use the full table/result regardless of preview.

### i18n & theme

- Static markup is localized via `data-i18n="key"` attributes; dynamic strings use `t('key')`. The `labels` object holds one object per locale (en/es/de/fr) and their key sets must stay identical. Locale changes are broadcast via the `sheetql:localechange` custom event, which `app.js` and `theme.js` listen to.
- Themes set `data-bs-theme` (`light`/`dark`) on `<html>` for Bootstrap and `data-theme` (`light`/`dark`/`light-chocolate`/`dark-chocolate`) for the custom palette in `style.css`. The chosen theme is persisted to `localStorage['sheetql.theme']` and applied pre-render by the inline anti-flash script in `index.html`.

### Persistence (intentionally absent)

The database is in-memory only (`instantiate` + `connect`, no OPFS), so nothing survives a reload. OPFS persistence was previously attempted but removed: duckdb-wasm fails to open files in write mode on import ("File is not opened in write mode", duckdb/duckdb-wasm#1962/#2182). If "save my work" is ever needed again, `EXPORT DATABASE` to a `.duckdb` file is the safe route; do not reintroduce OPFS until that upstream bug is fixed.
