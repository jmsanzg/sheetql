// state.js — shared DOM references, app state, and small UI helpers.

import * as bootstrap from 'bootstrap';
import { t } from './i18n.js';
import { esc } from './utils.js';

export const MAX_PREVIEW_ROWS = 1000;
export const INSERT_BATCH = 1000;
export const TYPE_OPTIONS = ['BIGINT', 'DOUBLE', 'BOOLEAN', 'TIMESTAMP', 'VARCHAR'];

const $ = (id) => document.getElementById(id);

export const els = {
  dbStatus: $('dbStatus'),
  fileInput: $('fileInput'),
  pickBtn: $('pickBtn'),
  dropZone: $('dropZone'),
  headerModal: $('headerModal'),
  headerModalSheets: $('headerModalSheets'),
  headerLoadBtn: $('headerLoadBtn'),
  selectAllSheets: $('selectAllSheets'),
  pasteBtn: $('pasteBtn'),
  pasteModal: $('pasteModal'),
  pasteName: $('pasteName'),
  pasteText: $('pasteText'),
  pasteLoadBtn: $('pasteLoadBtn'),
  clearBtn: $('clearBtn'),
  tablesDownload: $('tablesDownload'),
  tablesExportMenu: $('tablesExportMenu'),
  tablesList: $('tablesList'),
  sqlTabBar: $('sqlTabBar'),
  sqlTabs: $('sqlTabs'),
  addTabBtn: $('addTabBtn'),
  loadingOverlay: $('loadingOverlay'),
  loadingText: $('loadingText'),
  toast: $('toast'),
  toastBody: $('toastBody'),
};

export const state = {
  tables: [],
  dbStatus: null,
  expandedTables: new Set(),
};

export function toast(msg, kind = 'info') {
  els.toastBody.textContent = msg;
  els.toast.classList.remove('text-bg-dark', 'text-bg-danger', 'text-bg-success');
  els.toast.classList.add(kind === 'error' ? 'text-bg-danger' : 'text-bg-success');
  bootstrap.Toast.getOrCreateInstance(els.toast, { delay: 3000 }).show();
}

export function setLoading(show, text) {
  els.loadingOverlay.classList.toggle('d-none', !show);
  if (text) els.loadingText.textContent = text;
}

export function setDbStatus(key, cls) {
  state.dbStatus = { key, cls };
  els.dbStatus.innerHTML = `<span class="badge ${cls}">${esc(t(key))}</span>`;
}
