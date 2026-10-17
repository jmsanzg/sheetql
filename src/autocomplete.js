// autocomplete.js — lightweight SQL completion popup for the query editor.

import { t } from './i18n.js';
import { state } from './state.js';
import { SQL_KEYWORDS } from './sql-text.js';

export function attachAutocomplete(tab) {
  const ta = tab.sqlEditor;
  const wrap = tab.editorWrap;

  const popup = document.createElement('div');
  popup.className = 'autocomplete-popup d-none';
  popup.setAttribute('role', 'listbox');
  wrap.appendChild(popup);

  let items = [];
  let active = -1;
  let suppress = false;

  function hide() {
    popup.classList.add('d-none');
    popup.innerHTML = '';
    items = [];
    active = -1;
  }

  function caretCoords(index) {
    const cs = getComputedStyle(ta);
    const mirror = document.createElement('div');
    const s = mirror.style;
    s.position = 'absolute';
    s.visibility = 'hidden';
    s.top = '-9999px';
    s.left = '-9999px';
    s.whiteSpace = 'pre-wrap';
    s.wordBreak = 'break-word';
    s.overflowWrap = 'break-word';
    const props = [
      'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant',
      'lineHeight', 'letterSpacing', 'wordSpacing', 'tabSize', 'textTransform',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'boxSizing',
    ];
    for (const p of props) s[p] = cs.getPropertyValue(p);
    s.width = ta.clientWidth + 'px';
    mirror.textContent = ta.value.slice(0, index);
    const marker = document.createElement('span');
    marker.textContent = '\u200b';
    mirror.appendChild(marker);
    document.body.appendChild(mirror);
    const mr = mirror.getBoundingClientRect();
    const kr = marker.getBoundingClientRect();
    document.body.removeChild(mirror);
    return {
      top: kr.top - mr.top - ta.scrollTop,
      left: kr.left - mr.left - ta.scrollLeft,
    };
  }

  function positionPopup() {
    const pos = caretCoords(ta.selectionStart);
    const cs = getComputedStyle(ta);
    const lineH = parseFloat(cs.lineHeight) || 24;
    const top = Math.max(0, Math.min(pos.top + lineH, ta.clientHeight - 80));
    const left = Math.max(0, Math.min(pos.left, Math.max(ta.clientWidth - 280, 0)));
    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
  }

  function currentToken() {
    const pos = ta.selectionStart;
    const before = ta.value.slice(0, pos);
    const dotted = /([A-Za-z0-9_]+)\.([A-Za-z0-9_]*)$/.exec(before);
    if (dotted) {
      return { word: dotted[2], start: pos - dotted[2].length, table: dotted[1] };
    }
    const m = /([A-Za-z0-9_]+)$/.exec(before);
    return m ? { word: m[1], start: pos - m[1].length, table: null } : null;
  }

  function candidates(tok) {
    const word = tok.word.toLowerCase();

    if (tok.table) {
      const table = state.tables.find((t) => t.name.toLowerCase() === tok.table.toLowerCase());
      if (!table) return [];
      return table.columns
        .filter((c) => c.name.toLowerCase().startsWith(word) && c.name.toLowerCase() !== word)
        .map((c) => ({ text: c.name, type: 'column' }))
        .slice(0, 50);
    }

    const out = [];
    const seen = new Set();
    const push = (text, type) => {
      const lower = text.toLowerCase();
      if (seen.has(text) || !lower.startsWith(word) || lower === word) return;
      seen.add(text);
      out.push({ text, type });
    };
    for (const w of SQL_KEYWORDS) push(w, 'keyword');
    for (const tbl of state.tables) {
      push(tbl.name, 'table');
      for (const c of tbl.columns) push(c.name, 'column');
    }
    return out.slice(0, 50);
  }

  function show() {
    const tok = currentToken();
    if (!tok || (!tok.word && !tok.table)) {
      hide();
      return;
    }
    const list = candidates(tok);
    if (!list.length) {
      hide();
      return;
    }
    items = list;
    active = -1;
    popup.innerHTML = '';
    for (const c of list) {
      const el = document.createElement('div');
      el.className = 'autocomplete-item';

      const name = document.createElement('span');
      name.className = 'ac-name';
      name.textContent = c.text;

      const type = document.createElement('span');
      type.className = 'ac-type';
      type.textContent = t(c.type);

      el.appendChild(name);
      el.appendChild(type);
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        accept(c);
      });
      popup.appendChild(el);
    }
    popup.classList.remove('d-none');
    positionPopup();
  }

  function move(delta) {
    active = (active + delta + items.length) % items.length;
    const els = popup.querySelectorAll('.autocomplete-item');
    els.forEach((el, i) => el.classList.toggle('active', i === active));
    if (els[active]) els[active].scrollIntoView({ block: 'nearest' });
  }

  function accept(item) {
    const tok = currentToken();
    if (!tok) return;
    const start = tok.start;
    const end = ta.selectionStart;
    hide();
    suppress = true;
    ta.setRangeText(item.text, start, end, 'end');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.focus();
  }

  ta.addEventListener('keydown', (e) => {
    const open = !popup.classList.contains('d-none');
    if (!open) {
      if ((e.ctrlKey || e.metaKey) && (e.key === ' ' || e.code === 'Space')) {
        e.preventDefault();
        show();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      hide();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (e.ctrlKey || e.metaKey) {
        hide();
        return;
      }
      e.preventDefault();
      accept(items[active] || items[0]);
    }
  });

  ta.addEventListener('input', () => {
    if (suppress) {
      suppress = false;
      hide();
      return;
    }
    show();
  });

  ta.addEventListener('blur', () => setTimeout(hide, 150));
}
