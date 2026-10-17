// tabs.js — manages multiple SQL query tabs (editor, toolbar, and result pane).

import { t } from './i18n.js';
import { els, state } from './state.js';
import { formatSQL } from './sql-text.js';
import { attachAutocomplete } from './autocomplete.js';
import {
  executeSql,
  renderSqlResult,
  refreshHighlight,
  syncHighlightScroll,
  setSqlEditorValue,
  downloadQueryResult,
  showSqlError,
} from './sql.js';

let tabs = [];
let activeId = null;
let nextNumber = 1;
const resizeObservers = new WeakMap();

let uidCounter = 0;
function uid() {
  return 'tab-' + (++uidCounter);
}

function tabTitle(tab) {
  return t('queryTab', { n: tab.number });
}

export function getActiveTab() {
  return tabs.find((tab) => tab.id === activeId) || tabs[0] || null;
}

function getTab(id) {
  return tabs.find((tab) => tab.id === id) || null;
}

function formatSqlInTab(tab) {
  const value = tab.sqlEditor.value;
  if (!value.trim()) return;
  setSqlEditorValue(tab, formatSQL(value));
  tab.sqlEditor.focus();
}

function buildExportDropdown(tab) {
  const group = document.createElement('div');
  group.className = 'btn-group';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'btn btn-success dropdown-toggle';
  toggle.disabled = true;
  toggle.setAttribute('data-bs-toggle', 'dropdown');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = t('export');
  group.appendChild(toggle);

  const menu = document.createElement('ul');
  menu.className = 'dropdown-menu dropdown-menu-end';
  group.appendChild(menu);

  tab.exportMenu = menu;
  tab.exportFormats = [
    ['xlsx', 'formatExcel'],
    ['csv', 'formatCsv'],
    ['ods', 'formatOds'],
  ];
  refreshExportMenu(tab);

  return { group, toggle };
}

function refreshExportMenu(tab) {
  const menu = tab.exportMenu;
  menu.innerHTML = '';
  for (const [fmt, key] of tab.exportFormats) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dropdown-item';
    btn.textContent = t(key);
    btn.addEventListener('click', () => downloadQueryResult(tab, fmt));
    li.appendChild(btn);
    menu.appendChild(li);
  }
}

function buildPane(tab) {
  const pane = document.createElement('div');
  pane.className = 'tab-pane';
  pane.id = 'tab-pane-' + tab.id;
  pane.setAttribute('role', 'tabpanel');

  // Editor (with syntax-highlight overlay)
  const wrap = document.createElement('div');
  wrap.className = 'mb-2';
  const editorWrap = document.createElement('div');
  editorWrap.className = 'sql-editor-wrap';

  const pre = document.createElement('pre');
  pre.className = 'sql-highlight';
  pre.setAttribute('aria-hidden', 'true');
  editorWrap.appendChild(pre);

  const ta = document.createElement('textarea');
  ta.className = 'form-control font-monospace sql-editor sql-overlay';
  ta.rows = 4;
  ta.spellcheck = false;
  ta.placeholder = 'SELECT * FROM "my_table" LIMIT 100';
  editorWrap.appendChild(ta);
  wrap.appendChild(editorWrap);
  pane.appendChild(wrap);

  // Toolbar: run, download, status
  const toolbar = document.createElement('div');
  toolbar.className = 'd-flex gap-2 align-items-center mb-3';

  const runBtn = document.createElement('button');
  runBtn.type = 'button';
  runBtn.className = 'btn btn-primary';
  runBtn.disabled = true;
  runBtn.textContent = t('runQuery');
  runBtn.addEventListener('click', () => executeSql(tab));
  toolbar.appendChild(runBtn);

  const formatBtn = document.createElement('button');
  formatBtn.type = 'button';
  formatBtn.className = 'btn btn-outline-secondary';
  formatBtn.textContent = t('formatSql');
  formatBtn.title = 'Ctrl+Shift+F';
  formatBtn.addEventListener('click', () => formatSqlInTab(tab));
  toolbar.appendChild(formatBtn);

  const exportDD = buildExportDropdown(tab);
  toolbar.appendChild(exportDD.group);

  const status = document.createElement('span');
  status.className = 'small text-muted';
  toolbar.appendChild(status);
  pane.appendChild(toolbar);

  // Error alert
  const error = document.createElement('div');
  error.className = 'alert alert-danger d-none';
  error.setAttribute('role', 'alert');
  pane.appendChild(error);

  // Result table
  const scroll = document.createElement('div');
  scroll.className = 'table-responsive result-scroll';
  const table = document.createElement('table');
  table.className = 'table table-sm table-striped table-bordered mb-0';
  const thead = document.createElement('thead');
  thead.className = 'table-dark';
  const tbody = document.createElement('tbody');
  table.appendChild(thead);
  table.appendChild(tbody);
  scroll.appendChild(table);
  pane.appendChild(scroll);

  const note = document.createElement('div');
  note.className = 'text-muted small mt-2';
  pane.appendChild(note);

  tab.el = pane;
  tab.editorWrap = editorWrap;
  tab.sqlEditor = ta;
  tab.sqlHighlight = pre;
  tab.runBtn = runBtn;
  tab.formatBtn = formatBtn;
  tab.sqlDownload = exportDD.toggle;
  tab.sqlStatus = status;
  tab.sqlError = error;
  tab.sqlHead = thead;
  tab.sqlBody = tbody;
  tab.sqlNote = note;

  return pane;
}

function wireEditor(tab) {
  const ta = tab.sqlEditor;
  ta.addEventListener('input', () => {
    refreshHighlight(tab);
    syncHighlightScroll(tab);
  });
  ta.addEventListener('scroll', () => syncHighlightScroll(tab));
  ta.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      executeSql(tab);
    } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      formatSqlInTab(tab);
    }
  });
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => syncHighlightScroll(tab));
    observer.observe(ta);
    resizeObservers.set(ta, observer);
  }
  refreshHighlight(tab);
}

function activateTab(id) {
  const tab = getTab(id);
  if (!tab) return;
  activeId = tab.id;
  for (const t of tabs) {
    t.el.classList.toggle('active', t.id === tab.id);
  }
  renderTabBar();
  requestAnimationFrame(() => syncHighlightScroll(tab));
}

function renderTabBar() {
  const bar = els.sqlTabBar;
  bar.querySelectorAll('.sql-tab-item').forEach((n) => n.remove());
  const addItem = els.addTabBtn.parentElement;

  for (const tab of tabs) {
    const li = document.createElement('li');
    li.className = 'nav-item sql-tab-item';
    li.setAttribute('role', 'presentation');

    const link = document.createElement('div');
    link.className = 'nav-link sql-tab' + (tab.id === activeId ? ' active' : '');
    link.setAttribute('role', 'tab');
    link.addEventListener('click', () => activateTab(tab.id));

    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'sql-tab-label';
    label.textContent = tabTitle(tab);
    label.title = tabTitle(tab);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'sql-tab-close';
    close.title = t('closeTab');
    close.setAttribute('aria-label', t('closeTab'));
    close.innerHTML = '&times;';
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });

    link.appendChild(label);
    link.appendChild(close);
    li.appendChild(link);
    bar.insertBefore(li, addItem);
  }
}

function createTab() {
  const number = nextNumber++;
  const tab = {
    id: uid(),
    number,
    result: null,
  };
  buildPane(tab);
  els.sqlTabs.appendChild(tab.el);
  tabs.push(tab);
  wireEditor(tab);
  attachAutocomplete(tab);
  activateTab(tab.id);
  updateTabsEnabled(state.tables.length > 0);
  return tab;
}

function closeTab(id) {
  const idx = tabs.findIndex((tab) => tab.id === id);
  if (idx === -1) return;
  const tab = tabs[idx];

  if (resizeObservers.has(tab.sqlEditor)) {
    resizeObservers.get(tab.sqlEditor).disconnect();
    resizeObservers.delete(tab.sqlEditor);
  }
  tab.el.remove();
  tabs.splice(idx, 1);

  if (activeId === id) {
    const neighbor = tabs[idx] || tabs[idx - 1];
    if (neighbor) {
      activateTab(neighbor.id);
    } else {
      activeId = null;
      createTab();
      return;
    }
  }
  renderTabBar();
}

export function updateTabsEnabled(hasTables) {
  for (const tab of tabs) {
    tab.runBtn.disabled = !hasTables;
    tab.sqlEditor.disabled = !hasTables;
  }
}

export function resetAllTabs() {
  for (const tab of tabs) {
    setSqlEditorValue(tab, '');
    tab.result = null;
    tab.sqlHead.innerHTML = '';
    tab.sqlBody.innerHTML = '';
    tab.sqlNote.textContent = '';
    tab.sqlDownload.disabled = true;
    tab.sqlStatus.textContent = '';
    showSqlError(tab, null);
  }
}

export function refreshAllResults() {
  for (const tab of tabs) {
    if (tab.result) renderSqlResult(tab, tab.result);
  }
}

export function refreshTabsLabels() {
  els.addTabBtn.title = t('addQueryTab');
  for (const tab of tabs) {
    tab.runBtn.textContent = t('runQuery');
    tab.formatBtn.textContent = t('formatSql');
    tab.sqlDownload.textContent = t('export');
    refreshExportMenu(tab);
  }
  renderTabBar();
}

export function initTabs() {
  els.addTabBtn.title = t('addQueryTab');
  els.addTabBtn.addEventListener('click', () => createTab());
  createTab();
}
