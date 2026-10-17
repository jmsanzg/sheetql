// sql-text.js — shared SQL tokenizing, statement splitting, and formatting.

export const SQL_KEYWORDS = new Set((
  'SELECT FROM WHERE GROUP ORDER BY HAVING LIMIT OFFSET '
  + 'JOIN LEFT RIGHT INNER OUTER FULL CROSS NATURAL ON USING '
  + 'AS AND OR NOT NULL IS IN LIKE ILIKE SIMILAR BETWEEN EXISTS '
  + 'CASE WHEN THEN ELSE END UNION INTERSECT EXCEPT ALL DISTINCT '
  + 'INSERT INTO VALUES CREATE TABLE VIEW DROP ALTER UPDATE SET DELETE '
  + 'WITH RECURSIVE ASC DESC TRUE FALSE PRIMARY KEY FOREIGN REFERENCES '
  + 'INDEX UNIQUE IF ONLY OVER PARTITION QUALIFY RETURNING TRUNCATE '
  + 'CASCADE DEFAULT CONSTRAINT CHECK COLLATE CAST EXTRACT POSITION '
  + 'ANY SOME EVERY FILTER WITHIN GROUPS'
).split(/\s+/));

// Tokens that consume whole constructs (no punctuation), used for highlighting
// and statement splitting. `;` stays in the gaps between tokens.
const SQL_TOKEN_RE = /(--[^\n]*)|(\/\*[\s\S]*?\*\/)|('(?:[^']|'')*')|("(?:[^"]|"")*")|(`(?:[^`]|``)*`)|(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([A-Za-z_][A-Za-z0-9_]*)/g;

export function tokenizeSQL(src) {
  const tokens = [];
  SQL_TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = SQL_TOKEN_RE.exec(src))) {
    let type;
    if (m[1] != null || m[2] != null) type = 'comment';
    else if (m[3] != null) type = 'string';
    else if (m[4] != null || m[5] != null) type = 'quoted';
    else if (m[6] != null) type = 'number';
    else type = 'word';
    tokens.push({ text: m[0], type, index: m.index, end: m.index + m[0].length });
  }
  return tokens;
}

// Split a script into individual statements, respecting semicolons that appear
// inside string literals, quoted identifiers, or comments.
export function splitStatements(src) {
  const tokens = tokenizeSQL(src);
  const parts = [];
  let start = 0;
  let ti = 0;
  for (let i = 0; i < src.length; i++) {
    while (ti < tokens.length && tokens[ti].index < i) ti++;
    if (ti < tokens.length && tokens[ti].index === i) {
      i = tokens[ti].end - 1;
      continue;
    }
    if (src[i] === ';') {
      parts.push(src.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(src.slice(start));
  return parts.map((s) => s.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// SQL formatting (a small, conservative pretty-printer)
// ---------------------------------------------------------------------------

const LEX_RE = /(--[^\n]*)|(\/\*[\s\S]*?\*\/)|('(?:[^']|'')*')|("(?:[^"]|"")*")|(`(?:[^`]|``)*`)|(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|([^\sA-Za-z0-9_])/g;

function lexSQL(src) {
  const items = [];
  LEX_RE.lastIndex = 0;
  let m;
  while ((m = LEX_RE.exec(src))) {
    let kind;
    if (m[1] != null || m[2] != null) kind = 'comment';
    else if (m[3] != null) kind = 'string';
    else if (m[4] != null || m[5] != null) kind = 'quoted';
    else if (m[6] != null) kind = 'number';
    else if (m[7] != null) kind = 'word';
    else if (m[8] != null) kind = 'space';
    else kind = 'punct';
    items.push({ kind, text: m[0] });
  }
  return items;
}

const BREAK_TOP = new Set([
  'SELECT', 'FROM', 'WHERE', 'HAVING', 'LIMIT', 'OFFSET',
  'WITH', 'RETURNING', 'VALUES', 'SET',
]);
const JOIN_MODIFIERS = new Set(['LEFT', 'RIGHT', 'INNER', 'FULL', 'CROSS', 'NATURAL']);
const SUB_INDENT = new Set(['ON', 'AND', 'OR']);

function nextWord(tokens, from) {
  for (let i = from; i < tokens.length; i++) {
    if (tokens[i].kind === 'word') return tokens[i].upper;
    if (tokens[i].kind === 'punct') return null;
  }
  return null;
}

function prevWord(tokens, from) {
  for (let i = from - 1; i >= 0; i--) {
    if (tokens[i].kind === 'word') return tokens[i].upper;
    if (tokens[i].kind === 'punct') return null;
  }
  return null;
}

function shouldBreak(tokens, i) {
  const t = tokens[i];
  if (t.kind !== 'word' || t.depth !== 0) return false;
  const up = t.upper;
  if (up === 'JOIN') {
    const prev = prevWord(tokens, i);
    return !(prev === 'OUTER' || JOIN_MODIFIERS.has(prev));
  }
  if (JOIN_MODIFIERS.has(up)) {
    const n1 = nextWord(tokens, i + 1);
    const n2 = n1 === 'OUTER' ? nextWord(tokens, i + 2) : n1;
    return n1 === 'JOIN' || n2 === 'JOIN';
  }
  if (up === 'GROUP' || up === 'ORDER') return nextWord(tokens, i + 1) === 'BY';
  return BREAK_TOP.has(up)
    || up === 'UNION' || up === 'INTERSECT' || up === 'EXCEPT'
    || SUB_INDENT.has(up);
}

function spaceBefore(prev, cur) {
  if (!prev) return false;
  if (prev.kind === 'punct' && (prev.text === '(' || prev.text === '.')) return false;
  if (cur.kind === 'punct') {
    if (cur.text === ',' || cur.text === ')' || cur.text === ';' || cur.text === '.') return false;
    if (cur.text === '(') {
      return !(prev.kind === 'word' && !SQL_KEYWORDS.has(prev.upper));
    }
    if (prev.kind === 'punct') {
      const pair = prev.text + cur.text;
      if (['<=', '>=', '<>', '!=', '::', '||', '->', '->>', ':='].includes(pair)) return false;
    }
    return true;
  }
  return true;
}

export function formatSQL(src, { uppercase = true } = {}) {
  if (!src || !src.trim()) return '';

  const tokens = [];
  let depth = 0;
  for (const it of lexSQL(src)) {
    if (it.kind === 'space') continue;
    if (it.kind === 'punct') {
      if (it.text === '(') depth++;
      tokens.push({ kind: 'punct', text: it.text, depth });
      if (it.text === ')') depth--;
      continue;
    }
    if (it.kind === 'word') {
      const up = it.text.toUpperCase();
      tokens.push({
        kind: 'word',
        text: uppercase && SQL_KEYWORDS.has(up) ? up : it.text,
        upper: up,
        depth,
      });
      continue;
    }
    tokens.push({ kind: it.kind, text: it.text, depth });
  }

  const lines = [];
  let cur = '';
  let prev = null;

  const flush = () => {
    const s = cur.trim();
    if (s) lines.push(s);
    cur = '';
  };

  const push = (tok) => {
    if (cur && spaceBefore(prev, tok)) cur += ' ';
    cur += tok.text;
    prev = tok;
  };

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    if (tok.kind === 'comment') {
      if (tok.text.startsWith('--')) {
        if (cur) cur += ' ';
        cur += tok.text;
        flush();
        prev = null;
        continue;
      }
      push(tok);
      continue;
    }

    if (tok.kind === 'word' && shouldBreak(tokens, i)) {
      const indent = SUB_INDENT.has(tok.upper) ? 1 : 0;
      flush();
      cur = '  '.repeat(indent) + tok.text;
      prev = tok;
      continue;
    }

    push(tok);
  }
  flush();
  return lines.join('\n') + '\n';
}
