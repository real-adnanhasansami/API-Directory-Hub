import { esc, icon } from '../ui.js';
import { hashStr, stripEmoji } from '../classify.js';

const EMOJI_START = /^(\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic})*)/u;

export function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

// Sleek generated thumbnail: gradient hue follows the category's theme, name decides the variation.
export function placeholder(r, big = false) {
  const base = hashStr(r.cat || 'x') % 360;
  const v = hashStr(r.name || '');
  const h1 = (base + (v % 40) - 20 + 360) % 360, h2 = (h1 + 40 + (v >> 3) % 50) % 360, ang = 120 + (v % 8) * 15;
  const m = EMOJI_START.exec(r.name || '');
  const glyph = m ? m[0] : ((stripEmoji(r.name).match(/[\p{L}\p{N}]/u) || ['#'])[0]).toUpperCase();
  return `<div class="thumb ph ${big ? 'big' : ''}" style="background:linear-gradient(${ang}deg,hsl(${h1} 78% 54%),hsl(${h2} 76% 42%))"><span class="ph-dots"></span><span class="ph-glyph">${esc(glyph)}</span></div>`;
}

export function displayName(r) {
  const n = String(r.name || '');
  const m = EMOJI_START.exec(n);
  return (m ? n.slice(m[0].length) : n).trim() || n;
}

export function thumb(r, big = false) {
  if (!r.img) return placeholder(r, big);
  // Real image when available; falls back to the generated placeholder if it fails to load (offline, 404 ...).
  return `<div class="thumb ${big ? 'big' : ''}" data-ph="${esc(placeholder(r, big))}"><img src="${esc(r.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.outerHTML=this.parentNode.dataset.ph"></div>`;
}

const PRICE = { free: 'Free', freemium: 'Freemium', paid: 'Paid' };
export const badges = (r) =>
  `<span class="badge p-${esc(r.pricing)}">${PRICE[r.pricing] || esc(r.pricing)}</span>` +
  (r.auth ? `<span class="badge auth" title="Authentication / API key required">${icon('lock', 11)} Auth</span>` : '') +
  (r.featured ? '<span class="badge feat">Sponsored</span>' : '');

export function cardHtml(r, { admin = false } = {}) {
  const tags = (r.tags || []).slice(0, 3).map((t) => `<button class="tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join('');
  return `<article class="card" data-id="${esc(r.id)}" tabindex="0">
    <div class="card-top">${thumb(r)}
      <div class="card-title"><h3 title="${esc(r.name)}">${esc(displayName(r))}</h3>
      <button class="pill" data-cat="${esc(r.cat)}">${esc(r.cat)}</button></div></div>
    <p class="desc">${esc(r.desc || 'No description provided.')}</p>
    <div class="tags">${tags}</div>
    <div class="card-foot">
      <div class="badges">${badges(r)}</div>
      <div class="actions">
        ${admin ? `<button class="icon-btn" data-act="edit" title="Edit">${icon('edit', 15)}</button><button class="icon-btn danger" data-act="delete" title="Delete">${icon('trash', 15)}</button>` : ''}
        <button class="icon-btn" data-act="copy" title="Copy URL">${icon('copy', 15)}</button>
        ${r.url ? `<a class="icon-btn" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer" title="Open ${esc(hostOf(r.url))}" data-act="open">${icon('link', 15)}</a>` : ''}
      </div>
    </div>
  </article>`;
}

export function detailHtml(r) {
  const cats = [r.cat, ...(r.more || [])].map((c) => `<button class="pill" data-cat="${esc(c)}">${esc(c)}</button>`).join(' ');
  return `<div class="detail">
    <div class="detail-head">${thumb(r, true)}<div><h2>${esc(displayName(r))}</h2><div class="badges">${badges(r)}</div>
    ${r.url ? `<a class="host" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(hostOf(r.url))} ${icon('link', 13)}</a>` : ''}</div></div>
    <p class="detail-desc">${esc(r.desc || 'No description provided.')}</p>
    <h4>Categories</h4><div class="tags">${cats}</div>
    <h4>Tags</h4><div class="tags">${(r.tags || []).map((t) => `<button class="tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join('') || '<span class="muted">none</span>'}</div>
    ${r.url ? `<h4>URL</h4><code class="url">${esc(r.url)}</code>` : ''}
    <div class="row gap end" style="margin-top:18px">
      <button class="btn" data-act="copy">${icon('copy', 15)} Copy URL</button>
      ${r.url ? `<a class="btn primary" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${icon('link', 15)} Open API page</a>` : ''}
    </div></div>`;
}
