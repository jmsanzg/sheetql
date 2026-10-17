// xlsx.js — workbook parsing, type inference, and the import configuration modal.

import * as XLSX from 'xlsx';
import * as bootstrap from 'bootstrap';
import { t } from './i18n.js';
import { els, state, setLoading, toast, TYPE_OPTIONS } from './state.js';
import { esc, sanitizeName, excelColumnName, fileExt } from './utils.js';
import { createTable, insertRows, loadStructuredFile, loadJsonText } from './duckdb.js';
import { refreshTables, selectTable } from './render.js';

let pendingSheets = null;

const STRUCTURED_EXTS = new Set(['.parquet', '.arrow', '.feather', '.json', '.ndjson']);

export function inferType(values) {
  let allNum = true;
  let allInt = true;
  let allBool = true;
  let allDate = true;
  let has = false;

  for (const v of values) {
    if (v === null || v === undefined) continue;
    has = true;
    if (v instanceof Date) {
      allNum = false;
      allBool = false;
    } else if (typeof v === 'boolean') {
      allNum = false;
      allDate = false;
    } else if (typeof v === 'number') {
      allBool = false;
      allDate = false;
      if (!Number.isInteger(v)) allInt = false;
    } else {
      allNum = false;
      allBool = false;
      allDate = false;
    }
  }

  if (!has) return 'VARCHAR';
  if (allBool) return 'BOOLEAN';
  if (allNum) return allInt ? 'BIGINT' : 'DOUBLE';
  if (allDate) return 'TIMESTAMP';
  return 'VARCHAR';
}

function buildColumns(headerRow, maxCols) {
  const columns = [];
  const seen = new Set();
  for (let j = 0; j < maxCols; j++) {
    let name = '';
    if (headerRow && j < headerRow.length && headerRow[j] !== null && headerRow[j] !== undefined) {
      name = String(headerRow[j]).trim();
    }
    if (!name) name = excelColumnName(j);
    let unique = name;
    let k = 2;
    while (seen.has(unique)) unique = `${name}_${k++}`;
    seen.add(unique);
    columns.push(unique);
  }
  return columns;
}

function computeColumnsAndTypes(aoa, maxCols, useHeader) {
  const headerRow = useHeader ? aoa[0] : null;
  const dataRows = useHeader ? aoa.slice(1) : aoa;
  const columns = buildColumns(headerRow, maxCols);
  const types = columns.map((_, j) => inferType(dataRows.map((r) => r[j])));
  return { columns, types };
}

export async function parseWorkbook(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true });
  const sheets = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
    if (!aoa.length) {
      toast(t('skippedEmpty', { sheet: sheetName }));
      continue;
    }

    let maxCols = 1;
    if (ws['!ref']) {
      maxCols = Math.max(maxCols, XLSX.utils.decode_range(ws['!ref']).e.c + 1);
    }
    for (const row of aoa) maxCols = Math.max(maxCols, row.length);

    const base = computeColumnsAndTypes(aoa, maxCols, true);
    sheets.push({
      sheetName,
      aoa,
      maxCols,
      useHeader: true,
      selected: true,
      columns: base.columns,
      types: base.types,
    });
  }
  return sheets;
}

function renderSheetColumns(sheet, container) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'table-responsive';
  const table = document.createElement('table');
  table.className = 'table table-sm align-middle mb-0';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr><th>${esc(t('column'))}</th><th style="width:12rem">${esc(t('type'))}</th></tr>`;
  const tbody = document.createElement('tbody');
  for (let j = 0; j < sheet.columns.length; j++) {
    const tr = document.createElement('tr');
    const nameTd = document.createElement('td');
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'form-control form-control-sm font-monospace';
    nameInput.value = sheet.columns[j];
    nameInput.title = t('column');
    nameInput.addEventListener('input', () => {
      sheet.columns[j] = nameInput.value;
    });
    nameTd.appendChild(nameInput);
    const typeTd = document.createElement('td');
    const select = document.createElement('select');
    select.className = 'form-select form-select-sm';
    for (const opt of TYPE_OPTIONS) {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      if (opt === sheet.types[j]) o.selected = true;
      select.appendChild(o);
    }
    select.addEventListener('change', () => {
      sheet.types[j] = select.value;
    });
    typeTd.appendChild(select);
    tr.appendChild(nameTd);
    tr.appendChild(typeTd);
    tbody.appendChild(tr);
  }
  table.appendChild(thead);
  table.appendChild(tbody);
  wrap.appendChild(table);
  container.appendChild(wrap);
}

function buildSheetCard(sheet, idx) {
  const card = document.createElement('div');
  card.className = 'card mb-3';

  const head = document.createElement('div');
  head.className = 'card-header d-flex align-items-center gap-2 py-2';

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.className = 'form-check-input sheet-select flex-shrink-0';
  check.checked = sheet.selected !== false;
  check.id = 'sheetSelect-' + idx;
  check.setAttribute('aria-label', t('importThisSheet'));
  check.addEventListener('change', () => {
    sheet.selected = check.checked;
    updateSelectAllState();
  });

  const nameEl = document.createElement('strong');
  nameEl.className = 'text-truncate flex-grow-1';
  nameEl.textContent = sheet.sheetName;
  const badge = document.createElement('span');
  badge.className = 'badge text-bg-secondary rounded-pill flex-shrink-0';
  head.appendChild(check);
  head.appendChild(nameEl);
  head.appendChild(badge);
  card.appendChild(head);

  const body = document.createElement('div');
  body.className = 'card-body py-3';

  const q = document.createElement('div');
  q.className = 'small text-muted mb-2';
  q.textContent = t('headerQuestionSheet');
  body.appendChild(q);

  const group = document.createElement('div');
  group.className = 'btn-group btn-group-sm mb-3';
  group.setAttribute('role', 'group');

  const yesInput = document.createElement('input');
  yesInput.type = 'radio';
  yesInput.className = 'btn-check';
  yesInput.name = 'headerChoice-' + idx;
  yesInput.id = 'headerYes-' + idx;
  yesInput.value = 'yes';
  yesInput.checked = sheet.useHeader;
  const yesLabel = document.createElement('label');
  yesLabel.className = 'btn btn-outline-primary';
  yesLabel.htmlFor = yesInput.id;
  yesLabel.textContent = t('yes');

  const noInput = document.createElement('input');
  noInput.type = 'radio';
  noInput.className = 'btn-check';
  noInput.name = 'headerChoice-' + idx;
  noInput.id = 'headerNo-' + idx;
  noInput.value = 'no';
  noInput.checked = !sheet.useHeader;
  const noLabel = document.createElement('label');
  noLabel.className = 'btn btn-outline-primary';
  noLabel.htmlFor = noInput.id;
  noLabel.textContent = t('no');

  group.appendChild(yesInput);
  group.appendChild(yesLabel);
  group.appendChild(noInput);
  group.appendChild(noLabel);
  body.appendChild(group);

  const colsWrap = document.createElement('div');
  body.appendChild(colsWrap);

  card.appendChild(body);

  const updateRowCount = () => {
    const n = sheet.useHeader ? Math.max(sheet.aoa.length - 1, 0) : sheet.aoa.length;
    badge.textContent = t('rows', { n });
  };

  const updateHeader = () => {
    sheet.useHeader = yesInput.checked;
    const res = computeColumnsAndTypes(sheet.aoa, sheet.maxCols, sheet.useHeader);
    sheet.columns = res.columns;
    sheet.types = res.types;
    renderSheetColumns(sheet, colsWrap);
    updateRowCount();
  };

  yesInput.addEventListener('change', updateHeader);
  noInput.addEventListener('change', updateHeader);

  renderSheetColumns(sheet, colsWrap);
  updateRowCount();

  return card;
}

function renderImportModal() {
  els.headerModalSheets.innerHTML = '';
  for (let i = 0; i < pendingSheets.length; i++) {
    els.headerModalSheets.appendChild(buildSheetCard(pendingSheets[i], i));
  }
  updateSelectAllState();
}

function updateSelectAllState() {
  if (!els.selectAllSheets || !pendingSheets) return;
  const all = pendingSheets.every((s) => s.selected !== false);
  const none = pendingSheets.every((s) => s.selected === false);
  els.selectAllSheets.checked = all;
  els.selectAllSheets.indeterminate = !all && !none;
}

export function setAllSheetsSelected(checked) {
  if (!pendingSheets) return;
  for (const s of pendingSheets) s.selected = checked;
  els.headerModalSheets.querySelectorAll('.sheet-select').forEach((c) => {
    c.checked = checked;
  });
  updateSelectAllState();
}

export async function loadConfiguredWorkbook(sheets) {
  setLoading(true, t('loading'));
  try {
    const usedNames = new Set();
    const created = [];

    for (const sheet of sheets) {
      if (sheet.selected === false) continue;
      const dataRows = sheet.useHeader ? sheet.aoa.slice(1) : sheet.aoa;

      let tableName = sanitizeName(sheet.sheetName);
      let k = 2;
      while (usedNames.has(tableName)) tableName = `${sanitizeName(sheet.sheetName)}_${k++}`;
      usedNames.add(tableName);

      setLoading(true, t('loadingSheet', { sheet: sheet.sheetName, n: dataRows.length }));
      await createTable(tableName, sheet.columns, sheet.types);
      await insertRows(tableName, sheet.columns.length, sheet.types, dataRows);

      created.push({ name: tableName, sheetName: sheet.sheetName, rows: dataRows.length });
    }

    if (!created.length) {
      toast(t('noData'), 'error');
    } else {
      toast(t('loadedTables', { n: created.length }));
    }
    await refreshTables();
    if (created.length) {
      await selectTable(created[0].name);
    }
  } catch (err) {
    console.error(err);
    toast(t('loadFailed', { err: err && err.message ? err.message : err }), 'error');
  } finally {
    setLoading(false);
  }
}

export async function handleFile(file) {
  if (!file) return;
  setLoading(true, t('readingFile', { file: file.name }));
  try {
    if (STRUCTURED_EXTS.has(fileExt(file.name))) {
      await loadStructuredWorkbook(file);
      return;
    }
    const sheets = await parseWorkbook(file);
    if (!sheets.length) {
      toast(t('noData'), 'error');
      return;
    }
    pendingSheets = sheets;
    renderImportModal();
    bootstrap.Modal.getOrCreateInstance(els.headerModal).show();
  } catch (err) {
    console.error(err);
    toast(t('loadFailed', { err: err && err.message ? err.message : err }), 'error');
  } finally {
    setLoading(false);
  }
}

function nextTableName(base) {
  const used = new Set(state.tables.map((t) => t.name));
  let name = base;
  let k = 2;
  while (used.has(name)) name = `${base}_${k++}`;
  return name;
}

async function loadStructuredWorkbook(file) {
  const base = sanitizeName(file.name.replace(/\.[^.]+$/, ''));
  const tableName = nextTableName(base);
  setLoading(true, t('loading'));
  await loadStructuredFile(file, tableName);
  await refreshTables();
  await selectTable(tableName);
  toast(t('loadedTables', { n: 1 }));
}

export async function loadPastedData() {
  const text = els.pasteText.value.trim();
  if (!text) return;
  const base = sanitizeName(els.pasteName.value.trim() || 'pasted');
  const tableName = nextTableName(base);

  setLoading(true, t('loading'));
  try {
    if (/^[\s]*[\[{]/.test(text)) {
      await loadJsonText(text, tableName);
    } else {
      const wb = XLSX.read(text, { type: 'string' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
      if (!aoa.length) {
        toast(t('noData'), 'error');
        return;
      }
      let maxCols = 1;
      if (ws['!ref']) {
        maxCols = Math.max(maxCols, XLSX.utils.decode_range(ws['!ref']).e.c + 1);
      }
      for (const row of aoa) maxCols = Math.max(maxCols, row.length);

      const res = computeColumnsAndTypes(aoa, maxCols, true);
      await createTable(tableName, res.columns, res.types);
      await insertRows(tableName, res.columns.length, res.types, aoa.slice(1));
    }
    await refreshTables();
    await selectTable(tableName);
    toast(t('loadedTables', { n: 1 }));
    bootstrap.Modal.getOrCreateInstance(els.pasteModal).hide();
    els.pasteText.value = '';
    els.pasteName.value = '';
  } catch (err) {
    console.error(err);
    toast(t('loadFailed', { err: err && err.message ? err.message : err }), 'error');
  } finally {
    setLoading(false);
  }
}

export function takePendingSheets() {
  const sheets = pendingSheets;
  pendingSheets = null;
  return sheets;
}
