// render.js — tables list rendering, schema refresh, and table selection/removal.

import { t, formatNumber } from './i18n.js';
import { els, state, setLoading, toast } from './state.js';
import { esc, quoteIdent } from './utils.js';
import { runQuery, dropTable } from './duckdb.js';
import { executeSql, setSqlEditorValue } from './sql.js';
import { getActiveTab, updateTabsEnabled, resetAllTabs } from './tabs.js';

export async function refreshTables() {
  const res = await runQuery(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY table_name"
  );
  const colRes = await runQuery(
    "SELECT table_name, column_name, data_type FROM information_schema.columns "
    + "WHERE table_schema = 'main' ORDER BY table_name, ordinal_position"
  );
  const columnsByTable = new Map();
  for (const row of colRes.rows) {
    const tname = row[0];
    if (!columnsByTable.has(tname)) columnsByTable.set(tname, []);
    columnsByTable.get(tname).push({ name: row[1], type: row[2] });
  }

  const tables = [];
  for (const row of res.rows) {
    const name = row[0];
    const countRes = await runQuery(`SELECT COUNT(*) AS n FROM ${quoteIdent(name)}`);
    tables.push({
      name,
      rows: Number(countRes.rows[0][0]),
      columns: columnsByTable.get(name) || [],
    });
  }
  state.tables = tables;
  renderTablesList();
}

function chevronIcon() {
  return '<svg class="chevron" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">'
    + '<path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" '
    + 'stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

export function renderTablesList() {
  const hasTables = state.tables.length > 0;
  els.tablesDownload.disabled = !hasTables;
  els.clearBtn.disabled = !hasTables;
  updateTabsEnabled(hasTables);
  if (!hasTables) {
    const tab = getActiveTab();
    if (tab) setSqlEditorValue(tab, '');
    els.tablesList.innerHTML = `<li class="list-group-item text-muted small">${esc(t('noTables'))}</li>`;
    return;
  }
  els.tablesList.innerHTML = '';
  for (const table of state.tables) {
    els.tablesList.appendChild(buildTableNode(table));
  }
}

function buildTableNode(table) {
  const expanded = state.expandedTables.has(table.name);

  const li = document.createElement('li');
  li.className = 'list-group-item table-node' + (expanded ? ' expanded' : '');

  const row = document.createElement('div');
  row.className = 'table-row d-flex align-items-center gap-2';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'tree-toggle';
  toggle.setAttribute('aria-expanded', String(expanded));
  toggle.title = t('toggleColumns');
  toggle.innerHTML = chevronIcon();
  toggle.addEventListener('click', () => {
    if (state.expandedTables.has(table.name)) {
      state.expandedTables.delete(table.name);
    } else {
      state.expandedTables.add(table.name);
    }
    renderTablesList();
  });

  const nameBtn = document.createElement('button');
  nameBtn.type = 'button';
  nameBtn.className = 'table-name flex-grow-1';
  nameBtn.textContent = table.name;
  nameBtn.title = table.name;
  nameBtn.addEventListener('click', () => {
    selectTable(table.name);
  });

  const badge = document.createElement('span');
  badge.className = 'badge text-bg-secondary rounded-pill flex-shrink-0';
  badge.textContent = formatNumber(table.rows);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'table-remove';
  removeBtn.title = t('removeTable');
  removeBtn.setAttribute('aria-label', t('removeTable'));
  removeBtn.innerHTML = '&times;';
  removeBtn.addEventListener('click', () => {
    removeTable(table.name);
  });

  row.appendChild(toggle);
  row.appendChild(nameBtn);
  row.appendChild(badge);
  row.appendChild(removeBtn);
  li.appendChild(row);

  const cols = document.createElement('ul');
  cols.className = 'columns-list list-unstyled mb-0' + (expanded ? '' : ' d-none');
  for (const col of table.columns) {
    const cli = document.createElement('li');
    cli.className = 'column-item d-flex justify-content-between align-items-center gap-2';

    const cname = document.createElement('span');
    cname.className = 'font-monospace text-truncate';
    cname.textContent = col.name;
    cname.title = col.name;

    const ctype = document.createElement('span');
    ctype.className = 'badge text-bg-light border type-badge flex-shrink-0';
    ctype.textContent = col.type;

    cli.appendChild(cname);
    cli.appendChild(ctype);
    cols.appendChild(cli);
  }
  li.appendChild(cols);

  return li;
}

export async function selectTable(name) {
  const tab = getActiveTab();
  if (!tab) return;
  setSqlEditorValue(tab, `SELECT * FROM ${quoteIdent(name)}`);
  await executeSql(tab);
}

export async function clearAllTables() {
  if (!state.tables.length) return;
  setLoading(true, t('droppingTables'));
  try {
    for (const table of state.tables) {
      await dropTable(table.name);
    }
    state.tables = [];
    state.expandedTables.clear();
    resetAllTabs();
    renderTablesList();
    toast(t('allCleared'));
  } finally {
    setLoading(false);
  }
}

async function removeTable(name) {
  setLoading(true, t('removingTable'));
  try {
    await dropTable(name);
    state.expandedTables.delete(name);
    await refreshTables();
    toast(t('tableRemoved'));
  } catch (err) {
    toast(t('removeFailed', { err: err && err.message ? err.message : err }), 'error');
  } finally {
    setLoading(false);
  }
}
