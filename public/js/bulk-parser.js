// BulkParser: turns raw .txt / .csv / .tsv / pipe / markdown-table / JSON text into API records.
// Pure module (no DOM) so it can be unit-tested in Node. Handles 100k+ lines by yielding to the event loop.
import { CATEGORIES, KNOWN_ALIASES, detectCategory, normalizeCategory, inferPricing, inferAuth, inferTags, dedupeKey } from './classify.js';

const HEADER_MAP = {
  name: ['name', 'api', 'api name', 'title', 'service'],
  url: ['url', 'link', 'website', 'site', 'href', 'homepage', 'endpoint', 'docs'],
  desc: ['description', 'desc', 'summary', 'about', 'details'],
  cat: ['category', 'categories', 'type', 'group', 'section'],
  tags: ['tags', 'tag', 'keywords', 'labels'],
  pricing: ['pricing', 'price', 'plan', 'cost', 'tier'],
  auth: ['auth', 'authentication', 'auth required', 'requires auth', 'apikey', 'api key'],
  img: ['image', 'img', 'logo', 'icon', 'thumbnail']
};
const URL_RE = /^(https?:\/\/|www\.)\S+$|^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i;
const MD_LINK = /^\[([^\]]+)\]\(([^)\s]+)\)$/;
const KNOWN_CATS = new Set([...CATEGORIES.map((c) => c.name.toLowerCase()), ...Object.keys(KNOWN_ALIASES)]);

const tick = () => new Promise((r) => setTimeout(r, 0));

export function normalizeUrl(u) {
  u = String(u || '').trim().replace(/^<|>$/g, '');
  if (!u) return '';
  if (!/^[a-z]+:\/\//i.test(u)) u = 'https://' + u;
  try { const p = new URL(u); return /^https?:$/.test(p.protocol) && p.hostname.includes('.') ? p.href : ''; } catch { return ''; }
}

function detectDelimiter(lines) {
  const sample = lines.slice(0, 30);
  if (!sample.length) return null;
  let best = null, bestScore = 0;
  for (const d of ['\t', '|', ',', ';']) {
    const counts = sample.map((l) => {
      if (d === ',' || d === ';') { let n = 0, q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === d && !q) n++; } return n; }
      return l.split(d).length - 1;
    });
    const nonzero = counts.filter((c) => c > 0);
    if (nonzero.length < sample.length * 0.6) continue;
    const mode = nonzero.sort((a, b) => a - b)[Math.floor(nonzero.length / 2)];
    const consistent = counts.filter((c) => c === mode).length / sample.length;
    const score = consistent * (d === '\t' ? 1.2 : d === '|' ? 1.1 : 1);
    if (consistent >= 0.6 && score > bestScore) { best = d; bestScore = score; }
  }
  return best;
}

// RFC-4180-ish splitter that also copes with quoted multi-line cells (records are pre-joined).
function splitCells(line, d) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"' && cur === '') q = true;
    else if (ch === d) { out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

// Join physical lines into logical records when a quoted CSV cell spans several lines.
function logicalLines(text) {
  const raw = text.replace(/^﻿/, '').split(/\r?\n/);
  const out = []; let buf = null;
  for (const l of raw) {
    if (buf !== null) { buf += '\n' + l; if ((buf.match(/"/g) || []).length % 2 === 0) { out.push(buf); buf = null; } continue; }
    if ((l.match(/"/g) || []).length % 2 === 1) { buf = l; continue; }
    out.push(l);
  }
  if (buf !== null) out.push(buf);
  return out;
}

function headerIndexes(cells) {
  const idx = {}; let hits = 0;
  cells.forEach((c, i) => {
    const k = c.toLowerCase().replace(/[_-]/g, ' ').trim();
    for (const f in HEADER_MAP) if (idx[f] === undefined && HEADER_MAP[f].includes(k)) { idx[f] = i; hits++; }
  });
  return idx.name !== undefined && hits >= 2 ? idx : null;
}

function mapByHeader(cells, h) {
  const g = (f) => (h[f] !== undefined ? (cells[h[f]] || '').trim() : '');
  let name = g('name'), url = g('url');
  const md = MD_LINK.exec(name); // markdown-table rows: [Name](url)
  if (md) { name = md[1]; if (!url) url = md[2]; }
  return { name, url, desc: g('desc'), cat: g('cat'), tags: g('tags'), pricing: g('pricing'), auth: g('auth'), img: g('img') };
}

function mapHeuristic(cells) {
  const c = cells.map((x) => x.trim()).filter((x, i, a) => x !== '' || i < 4);
  let name = '', url = '', rest = [];
  for (const raw of c) {
    const m = MD_LINK.exec(raw);
    if (m && !url) { if (!name) name = m[1]; url = m[2]; continue; }
    if (!url && URL_RE.test(raw)) { url = raw; continue; }
    rest.push(raw);
  }
  if (!name) name = rest.shift() || '';
  rest = rest.filter(Boolean);
  let cat = '';
  const ci = rest.findIndex((x) => KNOWN_CATS.has(x.toLowerCase()));
  if (ci >= 0) cat = rest.splice(ci, 1)[0];
  else if (rest.length >= 2) { const last = rest[rest.length - 1]; if (last.length <= 32 && last.split(/\s+/).length <= 3 && !/[.!?]$/.test(last)) cat = rest.pop(); }
  return { name, url, desc: rest.join(' – '), cat, tags: '', pricing: '', auth: '', img: '' };
}

// Free-form lines: "Name - https://url - description", "https://url", "[Name](url) desc", "1. Name: description (url)"
function mapFreeLine(line) {
  let l = line.replace(/^\s*([-*+•]|\d+[.)])\s+/, '').trim();
  let m = /\[([^\]]+)\]\(([^)\s]+)\)\s*[-–—:|]?\s*(.*)$/.exec(l);
  if (m) return { name: m[1], url: m[2], desc: m[3], cat: '', tags: '', pricing: '', auth: '', img: '' };
  m = /(https?:\/\/[^\s<>")\]]+|www\.[^\s<>")\]]+)/i.exec(l);
  if (!m) return { name: l, url: '', desc: '', cat: '', tags: '', pricing: '', auth: '', img: '' };
  const url = m[1].replace(/[.,;]+$/, '');
  const before = l.slice(0, m.index).replace(/[\s\-–—:|(\[]+$/, '').trim();
  const after = l.slice(m.index + m[1].length).replace(/^[\s\-–—:|)\],]+/, '').trim();
  let name = before, desc = after;
  if (!name) { const sp = /^(.{2,60}?)\s+[-–—:|]\s+(.*)$/.exec(after); if (sp) { name = sp[1]; desc = sp[2]; } else { name = hostName(url); } }
  const nd = /^(.{2,60}?)\s+[-–—:]\s+(.*)$/.exec(name);
  if (nd && !desc) { name = nd[1]; desc = nd[2]; }
  return { name, url, desc, cat: '', tags: '', pricing: '', auth: '', img: '' };
}

function hostName(url) {
  try { const h = new URL(normalizeUrl(url)).hostname.replace(/^www\./, ''); const p = h.split('.'); return (p.length > 1 ? p[p.length - 2] : h).replace(/^./, (c) => c.toUpperCase()); } catch { return url; }
}

const truthy = (v) => /^(1|true|yes|y|required|oauth|apikey|api key|key|token)$/i.test(String(v).trim());
const falsy = (v) => /^(0|false|no|n|none|open|-)?$/i.test(String(v).trim());
function normPricing(v) {
  const s = String(v || '').toLowerCase().trim();
  if (!s) return '';
  if (/freemium|free tier|trial|credit/.test(s)) return 'freemium';
  if (/^free|open ?source|\$0|^0$/.test(s)) return 'free';
  if (/paid|premium|enterprise|\$|€|£|month|subscription/.test(s)) return 'paid';
  return '';
}

function* jsonRows(text) {
  let data;
  const t = text.trim();
  try { data = JSON.parse(t); } catch {
    data = t.split(/\r?\n/).filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  }
  if (!Array.isArray(data)) data = Array.isArray(data?.apis) ? data.apis : Array.isArray(data?.entries) ? data.entries : [data];
  for (const o of data) {
    if (!o || typeof o !== 'object') continue;
    const pick = (f) => { for (const k of Object.keys(o)) if (HEADER_MAP[f].includes(k.toLowerCase().replace(/[_-]/g, ' '))) return Array.isArray(o[k]) ? o[k].join(',') : String(o[k] ?? ''); return ''; };
    yield { name: pick('name'), url: pick('url'), desc: pick('desc'), cat: pick('cat'), tags: pick('tags'), pricing: pick('pricing'), auth: pick('auth'), img: pick('img') };
  }
}

/**
 * @param {string} text raw file contents
 * @param {object} opts { existing: Map<dedupeKey,id>, onDuplicate: 'skip'|'update', defaultCategory: string|'' (auto), onProgress(done,total) }
 */
export async function parseBulk(text, opts = {}) {
  const { existing = new Map(), onDuplicate = 'skip', defaultCategory = '', onProgress } = opts;
  const stats = { lines: 0, parsed: 0, invalid: 0, dupExisting: 0, dupInFile: 0, updated: 0, format: '', categories: {} };
  const records = [], updates = [], invalidSamples = [];
  const seen = new Set();
  const now = Date.now();

  const trimmed = text.replace(/^﻿/, '').trimStart();
  let rowIter, total = 0;

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    stats.format = 'JSON';
    const rows = [...jsonRows(trimmed)];
    total = rows.length; stats.lines = total;
    rowIter = rows[Symbol.iterator]();
  } else {
    const lines = logicalLines(text).filter((l) => l.trim() && !/^\s*(#|\/\/)/.test(l) && !/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l));
    stats.lines = lines.length; total = lines.length;
    const d = detectDelimiter(lines);
    if (d) {
      stats.format = d === '\t' ? 'TSV' : d === '|' ? 'Pipe / Markdown table' : d === ';' ? 'Semicolon CSV' : 'CSV';
      const split = (l) => {
        let cells = splitCells(l.trim(), d);
        if (d === '|') { if (cells[0] === '') cells.shift(); if (cells[cells.length - 1] === '') cells.pop(); }
        return cells;
      };
      let header = headerIndexes(split(lines[0]));
      const start = header ? 1 : 0;
      if (header) stats.format += ' (with header)';
      rowIter = (function* () { for (let i = start; i < lines.length; i++) { const c = split(lines[i]); yield header ? mapByHeader(c, header) : mapHeuristic(c); } })();
    } else {
      stats.format = 'Free-form lines';
      rowIter = (function* () { for (const l of lines) yield mapFreeLine(l); })();
    }
  }

  let n = 0;
  for (const row of rowIter) {
    if (++n % 4000 === 0) { onProgress && onProgress(n, total); await tick(); }
    let name = (row.name || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    const rawUrl = (row.url || '').trim();
    const url = rawUrl ? normalizeUrl(rawUrl) : '';
    if (!name && url) name = hostName(url);
    if (!name || (rawUrl && !url && name.length < 2)) { stats.invalid++; if (invalidSamples.length < 5) invalidSamples.push(JSON.stringify(row).slice(0, 120)); continue; }
    const desc = (row.desc || '').replace(/\s+/g, ' ').trim().slice(0, 600);
    const key = dedupeKey(url, name);

    let cat = normalizeCategory(row.cat) || normalizeCategory(defaultCategory);
    if (!cat || cat === 'Other') cat = detectCategory(name, desc, url);

    const text2 = `${name} ${desc}`;
    let pricing = normPricing(row.pricing) || inferPricing(text2, url);
    let auth;
    if (row.auth !== '' && row.auth !== undefined && !falsy(row.auth)) auth = truthy(row.auth) ? 1 : inferAuth(text2);
    else if (row.auth !== '' && row.auth !== undefined) auth = 0;
    else auth = inferAuth(text2);
    const extraTags = (row.tags || '').split(/[,;|/]/).map((t) => t.trim()).filter(Boolean);
    const rec = { name, url, desc, cat, more: [], tags: inferTags(name, desc, cat, extraTags), pricing, auth, featured: 0, img: /^https?:\/\//i.test(row.img || '') ? row.img.trim() : '', src: 'bulk', added: now };

    if (seen.has(key)) { stats.dupInFile++; continue; }
    seen.add(key);
    if (existing.has(key)) {
      stats.dupExisting++;
      if (onDuplicate === 'update') { updates.push({ id: existing.get(key), patch: rec }); stats.updated++; }
      continue;
    }
    stats.parsed++;
    stats.categories[cat] = (stats.categories[cat] || 0) + 1;
    records.push(rec);
  }
  onProgress && onProgress(total, total);
  return { records, updates, stats, invalidSamples };
}
