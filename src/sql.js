// sql.js — SQL editor highlighting, query execution, and result export.

import * as XLSX from 'xlsx';
import { t } from './i18n.js';
import { state, MAX_PREVIEW_ROWS, setLoading, toast } from './state.js';
import { esc, quoteIdent, formatDisplay, serializeCell } from './utils.js';
import { runQuery } from './duckdb.js';
import { SQL_KEYWORDS, tokenizeSQL, splitStatements } from './sql-text.js';

function highlightSQL(src) {
  let out = '';
  let last = 0;
  for (const tok of tokenizeSQL(src)) {
    out += esc(src.slice(last, tok.index));
    let cls = null;
    if (tok.type === 'comment') cls = 'sql-com';
    else if (tok.type === 'string') cls = 'sql-str';
    else if (tok.type === 'quoted') cls = 'sql-quoted';
    else if (tok.type === 'number') cls = 'sql-num';
    else if (tok.type === 'word') {
      if (/^\s*\(/.test(src.slice(tok.end))) cls = 'sql-fn';
      else if (SQL_KEYWORDS.has(tok.text.toUpperCase())) cls = 'sql-kw';
    }
    out += cls ? `<span class="${cls}">${esc(tok.text)}</span>` : esc(tok.text);
    last = tok.end;
  }
  out += esc(src.slice(last));
  return out;
}

export function refreshHighlight(tab) {
  tab.sqlHighlight.innerHTML = highlightSQL(tab.sqlEditor.value) + '\n';
}

export function syncHighlightScroll(tab) {
  const ta = tab.sqlEditor;
  const pre = tab.sqlHighlight;
  pre.scrollTop = ta.scrollTop;
  pre.scrollLeft = ta.scrollLeft;
  const cs = getComputedStyle(ta);
  const borderW = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
  const sb = ta.offsetWidth - ta.clientWidth - borderW;
  pre.style.paddingRight = sb > 0 ? `calc(${cs.paddingRight} + ${sb}px)` : '';
}

export function setSqlEditorValue(tab, value) {
  tab.sqlEditor.value = value;
  refreshHighlight(tab);
  syncHighlightScroll(tab);
}

export function showSqlError(tab, msg) {
  if (!msg) {
    tab.sqlError.classList.add('d-none');
    return;
  }
  tab.sqlError.textContent = msg;
  tab.sqlError.classList.remove('d-none');
}

export async function executeSql(tab) {
  const sql = tab.sqlEditor.value.trim();
  if (!sql) return;

  showSqlError(tab, null);
  tab.sqlStatus.textContent = '';
  tab.runBtn.disabled = true;
  try {
    const statements = splitStatements(sql);
    if (!statements.length) return;
    let result = null;
    for (let i = 0; i < statements.length; i++) {
      try {
        result = await runQuery(statements[i]);
      } catch (err) {
        if (statements.length > 1) {
          const msg = err && err.message ? err.message : String(err);
          throw new Error(t('statementFailed', { n: i + 1, err: msg }));
        }
        throw err;
      }
    }
    tab.result = result;
    renderSqlResult(tab, result);
    if (statements.length > 1) {
      tab.sqlStatus.textContent = t('statementsOk', { n: statements.length });
    }
  } catch (err) {
    showSqlError(tab, err && err.message ? err.message : String(err));
    tab.sqlStatus.textContent = t('failed');
  } finally {
    tab.runBtn.disabled = !state.tables.length;
  }
}

export function renderSqlResult(tab, result) {
  if (!result.columns.length) {
    tab.sqlHead.innerHTML = `<tr><th>${esc(t('result'))}</th></tr>`;
    tab.sqlBody.innerHTML = `<tr><td class="text-muted">${esc(t('statementOk'))}</td></tr>`;
    tab.sqlNote.textContent = '';
    tab.sqlDownload.disabled = true;
  } else {
    renderTable(tab.sqlHead, tab.sqlBody, result.columns, result.rows, MAX_PREVIEW_ROWS);
    const total = result.numRows;
    tab.sqlNote.textContent = total > MAX_PREVIEW_ROWS
      ? t('sqlNoteFirstOf', { a: MAX_PREVIEW_ROWS, b: total })
      : t('sqlNote', { n: total });
    tab.sqlDownload.disabled = total === 0;
  }
}

function renderTable(thead, tbody, columns, rows, previewLimit) {
  const shown = previewLimit ? rows.slice(0, previewLimit) : rows;
  thead.innerHTML = '<tr>' + columns.map((c) => `<th>${esc(c)}</th>`).join('') + '</tr>';
  if (!shown.length) {
    tbody.innerHTML = `<tr><td class="text-muted" colspan="${columns.length}">${esc(t('noRows'))}</td></tr>`;
  } else {
    tbody.innerHTML = shown.map((r) => (
      '<tr>' + r.map((v) => `<td>${esc(formatDisplay(v))}</td>`).join('') + '</tr>'
    )).join('');
  }
}

function toAoa(columns, rows) {
  const aoa = [columns];
  for (const row of rows) aoa.push(row.map(serializeCell));
  return aoa;
}

function uniqueSheetName(base, used) {
  const clean = String(base).replace(/[:\\/?*[\]]/g, '_') || 'Sheet';
  const maxLen = 31;
  let name = clean.slice(0, maxLen);
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  for (let k = 2; ; k++) {
    const suffix = '_' + k;
    name = clean.slice(0, maxLen - suffix.length) + suffix;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
}

function downloadText(text, filename, mime) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadResult(columns, rows, base, format) {
  const ws = XLSX.utils.aoa_to_sheet(toAoa(columns, rows));

  if (format === 'csv') {
    downloadText(XLSX.utils.sheet_to_csv(ws), `${base}.csv`, 'text/csv');
    return;
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t('result'));
  if (format === 'ods') {
    XLSX.writeFile(wb, `${base}.ods`, { bookType: 'ods' });
  } else {
    XLSX.writeFile(wb, `${base}.xlsx`);
  }
}

function timestampFile() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export async function downloadQueryResult(tab, format = 'xlsx') {
  if (!tab.result || !tab.result.columns.length || !tab.result.numRows) return;
  downloadResult(
    tab.result.columns,
    tab.result.rows,
    `query_result_${timestampFile()}`,
    format
  );
}

export async function downloadAllTables(format = 'xlsx') {
  if (!state.tables.length) return;
  setLoading(true, t('preparingDownload'));
  try {
    const used = new Set();
    const wb = XLSX.utils.book_new();
    for (const table of state.tables) {
      const result = await runQuery(`SELECT * FROM ${quoteIdent(table.name)}`);
      const name = uniqueSheetName(table.name, used);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(toAoa(result.columns, result.rows)), name);
    }
    const base = `tables_${timestampFile()}`;
    if (format === 'ods') {
      XLSX.writeFile(wb, `${base}.ods`, { bookType: 'ods' });
    } else {
      XLSX.writeFile(wb, `${base}.xlsx`);
    }
  } catch (err) {
    toast(t('downloadFailed', { err: err && err.message ? err.message : err }), 'error');
  } finally {
    setLoading(false);
  }
}
