// app.js — entry point: wires up events and boots the app.

import * as bootstrap from 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { t, init as initI18n } from './i18n.js';
import { init as initTheme } from './theme.js';
import { els, state, setDbStatus, toast } from './state.js';
import { initDuckDB } from './duckdb.js';
import { handleFile, takePendingSheets, loadConfiguredWorkbook, loadPastedData, setAllSheetsSelected } from './xlsx.js';
import { refreshTables, renderTablesList, clearAllTables } from './render.js';
import { downloadAllTables } from './sql.js';
import { initTabs, refreshAllResults, refreshTabsLabels } from './tabs.js';
import './style.css';

function pickFile() {
  els.fileInput.click();
}

els.headerLoadBtn.addEventListener('click', () => {
  const sheets = takePendingSheets();
  bootstrap.Modal.getInstance(els.headerModal).hide();
  if (sheets && sheets.length) loadConfiguredWorkbook(sheets);
});

els.selectAllSheets.addEventListener('change', (e) => {
  setAllSheetsSelected(e.target.checked);
});

els.pasteBtn.addEventListener('click', () => {
  bootstrap.Modal.getOrCreateInstance(els.pasteModal).show();
});
els.pasteLoadBtn.addEventListener('click', () => loadPastedData());

els.pickBtn.addEventListener('click', pickFile);
els.fileInput.addEventListener('change', (e) => {
  handleFile(e.target.files[0]);
  e.target.value = '';
});

['dragenter', 'dragover'].forEach((ev) =>
  els.dropZone.addEventListener(ev, (e) => {
    e.preventDefault();
    els.dropZone.classList.add('dragover');
  })
);
['dragleave', 'drop'].forEach((ev) =>
  els.dropZone.addEventListener(ev, (e) => {
    e.preventDefault();
    els.dropZone.classList.remove('dragover');
  })
);
els.dropZone.addEventListener('drop', (e) => {
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) handleFile(file);
});

els.tablesExportMenu.querySelectorAll('[data-format]').forEach((btn) => {
  btn.addEventListener('click', () => downloadAllTables(btn.getAttribute('data-format')));
});
els.clearBtn.addEventListener('click', clearAllTables);

(async function boot() {
  initI18n();
  initTheme();
  initTabs();
  document.addEventListener('sheetql:localechange', () => {
    if (state.dbStatus) setDbStatus(state.dbStatus.key, state.dbStatus.cls);
    renderTablesList();
    refreshAllResults();
    refreshTabsLabels();
  });
  try {
    await initDuckDB();
    await refreshTables();
  } catch (err) {
    console.error(err);
    setDbStatus('dbFailed', 'text-bg-danger');
    toast(t('duckdbFailed', { err: err && err.message ? err.message : err }), 'error');
  }
})();
