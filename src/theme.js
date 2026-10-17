// theme.js — lightweight theme switcher for SheetQL (no dependencies)

import { t } from './i18n.js';

const THEMES = [
  { id: 'light', bs: 'light', labelKey: 'themeLight' },
  { id: 'dark', bs: 'dark', labelKey: 'themeDark' },
  { id: 'light-chocolate', bs: 'light', labelKey: 'themeLightChocolate' },
  { id: 'dark-chocolate', bs: 'dark', labelKey: 'themeDarkChocolate' },
];

const STORAGE_KEY = 'sheetql.theme';

let current = 'light';

function find(id) {
  return THEMES.find((th) => th.id === id);
}

function apply(id) {
  const theme = find(id) || THEMES[0];
  current = theme.id;
  document.documentElement.setAttribute('data-bs-theme', theme.bs);
  document.documentElement.setAttribute('data-theme', theme.id);
}

function buildMenu() {
  const menu = document.getElementById('themeMenu');
  if (!menu) return;
  menu.innerHTML = THEMES.map(
    (th) =>
      `<li><button type="button" class="dropdown-item${th.id === current ? ' active' : ''}" data-theme="${th.id}">${t(th.labelKey)}</button></li>`
  ).join('');
  menu.querySelectorAll('[data-theme]').forEach((btn) => {
    btn.addEventListener('click', () => setTheme(btn.getAttribute('data-theme')));
  });
}

function updateLabel() {
  const label = document.getElementById('themeLabel');
  const theme = find(current) || THEMES[0];
  if (label) label.textContent = t(theme.labelKey);
}

function refreshUI() {
  buildMenu();
  updateLabel();
}

function setTheme(id) {
  apply(id);
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch (e) {
    /* ignore */
  }
  refreshUI();
}

function detect() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && find(stored)) return stored;
  } catch (e) {
    /* ignore */
  }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function init() {
  apply(detect());
  refreshUI();
  document.addEventListener('sheetql:localechange', refreshUI);
}

export { init };
