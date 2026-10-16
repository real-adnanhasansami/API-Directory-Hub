// Parses the API-mega-list repository (Markdown tables) into public/data/apis.json
// Usage: node tools/build-data.mjs <path-to-API-mega-list-main> [out.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inferPricing, inferAuth, inferTags, dedupeKey, normalizeCategory } from '../public/js/classify.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.argv[2];
const out = process.argv[3] || path.join(here, '../public/data/apis.json');
if (!root) { console.error('Usage: node tools/build-data.mjs <repo-dir> [out.json]'); process.exit(1); }

const ROW = /^\|\s*\[(.+?)\]\((https?:\/\/[^)\s]+)\)\s*\|\s*(.*?)\s*\|\s*$/;
const clean = (s) => s.replace(/&#124;/g, '|').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<br\s*\/?>/gi, ' ').replace(/\\\|/g, '|').trim();

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!['assets', 'settings', 'node_modules', '.git'].includes(e.name)) walk(p, acc); }
    else if (e.name === 'README.md' && p !== path.join(root, 'README.md')) acc.push(p);
  }
  return acc;
}

const seen = new Map();
const rows = [];
const catCounts = {};
let dupes = 0;

for (const file of walk(root).sort()) {
  const rel = path.relative(root, file);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const featured = rel.startsWith('00-featured-apis' + path.sep + 'apyhub');
  if (rel === path.join('00-featured-apis', 'README.md')) continue;
  let h1 = '', h2 = '';
  for (const l of lines) { if (l.startsWith('# ')) { h1 = clean(l.slice(2)); break; } }
  let category = featured ? 'ApyHub Utilities' : normalizeCategory(h1.replace(/\s+APIs?$/i, ''));
  for (const line of lines) {
    if (line.startsWith('## ')) { h2 = clean(line.slice(3)); continue; }
    const m = ROW.exec(line);
    if (!m) continue;
    const name = clean(m[1]), url = m[2], desc = clean(m[3]);
    if (!name) continue;
    const key = dedupeKey(url, name);
    if (seen.has(key)) {
      // Same API listed in several categories: keep one record, remember the extra categories.
      dupes++;
      const r = seen.get(key);
      if (r[3] !== category && !r[8].includes(category)) r[8].push(category);
      catCounts[category] = (catCounts[category] || 0) + 1;
      continue;
    }
    const text = `${name} ${desc}`;
    const extra = featured ? ['apyhub', h2.toLowerCase()] : [];
    const tags = inferTags(name, desc, category, extra);
    const rec = [name, url, desc, category, tags, inferPricing(text, url), inferAuth(text), featured ? 1 : 0, []];
    seen.set(key, rec);
    rows.push(rec);
    catCounts[category] = (catCounts[category] || 0) + 1;
  }
}

// Same API in several categories: make the most specific (smallest) category the primary one.
for (const r of rows) {
  if (!r[8].length) continue;
  const all = [r[3], ...r[8]].sort((a, b) => (catCounts[a] - catCounts[b]) || a.localeCompare(b));
  r[3] = all[0]; r[8] = all.slice(1);
  if (r[4].length === 1 && r[4][0] === r[8][0]?.toLowerCase()) r[4] = [r[3].toLowerCase()];
}
const primary = {};
for (const r of rows) primary[r[3]] = (primary[r[3]] || 0) + 1;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ version: 1, fields: ['name', 'url', 'desc', 'cat', 'tags', 'pricing', 'auth', 'featured', 'more'], rows }));
console.log(`Wrote ${rows.length} APIs (${dupes} duplicates skipped) -> ${out}`);
console.log(Object.entries(primary).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join('\n'));
