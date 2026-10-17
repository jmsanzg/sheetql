// utils.js — string/format helpers and Arrow value normalization (no side effects).

import { Type, TimeUnit } from 'apache-arrow';

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function quoteIdent(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

export function excelColumnName(n) {
  let s = '';
  let i = n + 1;
  while (i > 0) {
    const r = (i - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

export function sanitizeName(name) {
  let s = String(name).trim().replace(/[^A-Za-z0-9_]+/g, '_');
  if (!s) s = 'sheet';
  if (/^[0-9]/.test(s)) s = 't_' + s;
  return s;
}

export function fileExt(name) {
  const i = String(name).lastIndexOf('.');
  return i === -1 ? '' : String(name).slice(i).toLowerCase();
}

const TIMESTAMP_IDS = new Set([
  Type.Timestamp,
  Type.TimestampSecond,
  Type.TimestampMillisecond,
  Type.TimestampMicrosecond,
  Type.TimestampNanosecond,
]);

function toDate(value, unit) {
  switch (unit) {
    case TimeUnit.SECOND: return new Date(value * 1000);
    case TimeUnit.MILLISECOND: return new Date(value);
    case TimeUnit.MICROSECOND: return new Date(value / 1000);
    case TimeUnit.NANOSECOND: return new Date(value / 1e6);
    default: return new Date(value);
  }
}

export function normalizeValue(value, type) {
  if (value === null || value === undefined) return null;

  const id = type && type.typeId != null ? type.typeId : null;

  if (id != null && TIMESTAMP_IDS.has(id)) {
    return toDate(value, type.unit);
  }
  if (id === Type.Date || id === Type.DateDay || id === Type.DateMillisecond) {
    if (id === Type.DateDay) return new Date(value * 86400000);
    return new Date(value);
  }
  if (typeof value === 'bigint') {
    const n = Number(value);
    return Number.isSafeInteger(n) ? n : value.toString();
  }
  if (value instanceof Date) return value;
  if (typeof value === 'object') return value;
  return value;
}

function stringifyStructured(value) {
  try {
    if (typeof value.toJSON === 'function') value = value.toJSON();
    else if (value && typeof value.toArray === 'function') value = value.toArray();
    if (value instanceof Date) return formatDisplay(value);
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    return String(value);
  } catch (e) {
    return String(value);
  }
}

export function formatDisplay(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${p(value.getMonth() + 1)}-${p(value.getDate())} `
      + `${p(value.getHours())}:${p(value.getMinutes())}:${p(value.getSeconds())}`;
  }
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'object') return stringifyStructured(value);
  return String(value);
}

export function serializeCell(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return formatDisplay(value);
  if (typeof value === 'object') return stringifyStructured(value);
  return value;
}
