import * as store from './store.js';
import * as auth from './auth.js';
import { dedupeKey } from './classify.js';
import { esc, icon, toast, openModal, confirmBox, fmt } from './ui.js';
import { renderSidebar } from './components/Sidebar.js';
import { mountSearchBar } from './components/SearchBar.js';
import { cardHtml, detailHtml } from './components/APICard.js';
import { mountAdmin } from './components/AdminPanel.js';

const PAGE = 48;
const S = { all: [], q: '', cat: '', pricing: '', auth: false, tag: '', sort: 'relevance', filtered: [], shown: 0, counts: {}, cats: [], view: 'browse', admin: auth.isLoggedIn() };
let keyCache = null, idCache = null;
const $ = (s) => document.querySelector(s);
const el = { side: $('#sidebar'), main: $('#main'), boot: $('#boot'), bootMsg: $('#bootMsg') };

/* ---------- theme ---------- */
const themeBtn = $('#themeBtn');
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  themeBtn.innerHTML = icon(t === 'dark' ? 'sun' : 'moon', 18);
  themeBtn.title = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
}
applyTheme(document.documentElement.dataset.theme || 'dark');
themeBtn.onclick = () => {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(t); try { localStorage.setItem('apihub.theme', t); } catch {}
};
$('#menuBtn').innerHTML = icon('menu', 20);
$('#brandIcon').innerHTML = icon('layers', 20);
$('#adminBtn').innerHTML = `${icon('shield', 17)}<span>Admin</span>`;
$('#adminBtn').onclick = () => (location.hash = '#/admin');
$('#brand').onclick = () => { S.cat = ''; location.hash = ''; };
$('#menuBtn').onclick = () => document.body.classList.toggle('side-open');
$('#scrim').onclick = () => document.body.classList.remove('side-open');

/* ---------- data context ---------- */
const byId = () => idCache || (idCache = new Map(S.all.map((r) => [r.id, r])));
const keyMap = () => {
  if (!keyCache) { keyCache = new Map(); for (const r of S.all) { const k = dedupeKey(r.url, r.name); if (!keyCache.has(k)) keyCache.set(k, r.id); } }
  return keyCache;
};
const invalidate = () => { keyCache = null; idCache = null; };

const ctx = {
  getAll: () => S.all,
  categories: () => S.cats,
  keyMap,
  findDuplicate: (rec) => { const id = keyMap().get(dedupeKey(rec.url, rec.name)); return id ? byId().get(id) : null; },
  async save(rec, isNew) {
    if (isNew) { rec.id = store.newId(); rec.src = 'user'; rec.added = Date.now(); rec.more = []; rec.featured = 0; }
    store.prepare(rec);
    await store.putMany([rec]);
    if (isNew) S.all.push(rec); else { const i = S.all.findIndex((r) => r.id === rec.id); if (i >= 0) S.all[i] = rec; }
    invalidate(); recomputeCats(); refresh();
  },
  async remove(ids) {
    const set = new Set(ids);
    await store.deleteMany(ids);
    S.all = S.all.filter((r) => !set.has(r.id));
    invalidate(); recomputeCats(); refresh();
  },
  async addMany(recs, onProgress) {
    let n = 0;
    for (const r of recs) { r.id = store.newId() + (n++).toString(36); store.prepare(r); }
    await store.putMany(recs, onProgress);
    for (const r of recs) S.all.push(r);
    invalidate(); recomputeCats(); refresh();
  },
  async updateMany(updates) {
    const m = byId(), changed = [];
    for (const { id, patch } of updates) {
      const cur = m.get(id); if (!cur) continue;
      Object.assign(cur, { name: patch.name || cur.name, desc: patch.desc || cur.desc, cat: patch.cat || cur.cat, tags: patch.tags.length ? patch.tags : cur.tags, pricing: patch.pricing, auth: patch.auth, img: patch.img || cur.img });
      store.prepare(cur); changed.push(cur);
    }
    await store.putMany(changed);
    invalidate(); recomputeCats(); refresh();
  },
  async reset() { S.all = await store.resetToBundled(); invalidate(); recomputeCats(); refresh(); },
  onAuthChange() { S.admin = auth.isLoggedIn(); $('#adminBtn').classList.toggle('on', S.admin); refresh(); },
  goBrowse() { location.hash = ''; }
};
const admin = mountAdmin($('#adminRoot'), ctx);

function recomputeCats() { S.cats = [...new Set(S.all.map((r) => r.cat))].sort(); }

/* ---------- filtering ---------- */
function applyFilters() {
  const toks = S.q.toLowerCase().split(/\s+/).filter(Boolean);
  const counts = {}, out = [];
  const { pricing, tag, cat } = S, needAuth = S.auth;
  for (const r of S.all) {
    if (pricing && r.pricing !== pricing) continue;
    if (needAuth && !r.auth) continue;
    if (tag && !r.tags.includes(tag)) continue;
    if (toks.length) { let ok = true; for (let i = 0; i < toks.length; i++) if (!r._h.includes(toks[i])) { ok = false; break; } if (!ok) continue; }
    counts[r.cat] = (counts[r.cat] || 0) + 1;
    for (let i = 0; i < r.more.length; i++) counts[r.more[i]] = (counts[r.more[i]] || 0) + 1;
    if (cat && r.cat !== cat && !r.more.includes(cat)) continue;
    out.push(r);
  }
  if (S.sort === 'az') out.sort((a, b) => a._n.localeCompare(b._n));
  else if (S.sort === 'za') out.sort((a, b) => b._n.localeCompare(a._n));
  else if (S.sort === 'newest') out.sort((a, b) => (b.added || 0) - (a.added || 0));
  else if (toks.length) {
    const sc = new Map();
    for (const r of out) {
      let s = r.featured ? 0.5 : 0;
      for (const t of toks) {
        if (r._n === t) s += 10; else if (r._n.startsWith(t)) s += 6; else if (r._n.includes(t)) s += 3;
        if (r.tags.includes(t)) s += 2; if (r.cat.toLowerCase().includes(t)) s += 1;
      }
      sc.set(r, s);
    }
    out.sort((a, b) => sc.get(b) - sc.get(a));
  }
  S.counts = counts; S.filtered = out;
}

/* ---------- browse view ---------- */
const browse = $('#browse');
const grid = $('#grid'), sentinel = $('#sentinel'), summary = $('#summary');
const searchBar = mountSearchBar($('#searchbar'), {
  onChange(p) {
    if ('q' in p) S.q = p.q;
    if ('pricing' in p) S.pricing = p.pricing;
    if ('auth' in p) S.auth = !S.auth;
    if ('sort' in p) S.sort = p.sort;
    if ('tag' in p) S.tag = p.tag;
    refresh();
  }
});

function appendPage() {
  const next = S.filtered.slice(S.shown, S.shown + PAGE);
  if (next.length) grid.insertAdjacentHTML('beforeend', next.map((r) => cardHtml(r, { admin: S.admin })).join(''));
  S.shown += next.length;
  sentinel.hidden = S.shown >= S.filtered.length;
  if (!sentinel.hidden) { io.unobserve(sentinel); io.observe(sentinel); }
}
const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) appendPage(); }, { rootMargin: '800px' });
io.observe(sentinel);

function refresh() {
  if (S.view !== 'browse') { renderSide(); return; }
  applyFilters();
  renderSide();
  searchBar.sync(S);
  grid.innerHTML = ''; S.shown = 0; window.scrollTo({ top: 0 });
  const n = S.filtered.length;
  summary.innerHTML = `<strong>${fmt(n)}</strong> ${n === 1 ? 'API' : 'APIs'}${S.cat ? ` in <em>${esc(S.cat)}</em>` : ''}${S.q ? ` matching “${esc(S.q)}”` : ''}` +
    (S.q || S.cat || S.pricing || S.auth || S.tag ? ` <button class="link" id="clearAll">Clear all filters</button>` : '');
  const ca = $('#clearAll'); if (ca) ca.onclick = () => { Object.assign(S, { q: '', cat: '', pricing: '', auth: false, tag: '' }); refresh(); };
  $('#empty').hidden = n > 0;
  appendPage();
}

function renderSide() {
  renderSidebar(el.side, { categories: S.cats, counts: S.counts, total: S.view === 'browse' ? totalForCounts() : S.all.length, active: S.cat, userCount: S.all.filter((r) => r.src !== 'base').length, persistent: store.isPersistent() });
}
// "All APIs" count = number of APIs that match the non-category filters
function totalForCounts() {
  if (!S.cat) return S.filtered.length;
  const toks = S.q.toLowerCase().split(/\s+/).filter(Boolean);
  let n = 0;
  for (const r of S.all) {
    if (S.pricing && r.pricing !== S.pricing) continue; if (S.auth && !r.auth) continue; if (S.tag && !r.tags.includes(S.tag)) continue;
    if (toks.length && !toks.every((t) => r._h.includes(t))) continue; n++;
  }
  return n;
}

el.side.addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]'); if (!b) return;
  S.cat = b.dataset.cat; document.body.classList.remove('side-open');
  if (S.view !== 'browse') location.hash = ''; else refresh();
});

async function copy(text) {
  try { await navigator.clipboard.writeText(text); }
  catch { const t = Object.assign(document.createElement('textarea'), { value: text }); document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
  toast('URL copied to clipboard', 'ok', 1800);
}

grid.addEventListener('click', async (e) => {
  const card = e.target.closest('.card'); if (!card) return;
  const r = byId().get(card.dataset.id); if (!r) return;
  const tag = e.target.closest('[data-tag]'), catB = e.target.closest('[data-cat]'), act = e.target.closest('[data-act]');
  if (tag) { S.tag = tag.dataset.tag; return refresh(); }
  if (catB) { S.cat = catB.dataset.cat; return refresh(); }
  if (act) {
    if (act.dataset.act === 'open') return;
    if (act.dataset.act === 'copy') return copy(r.url);
    if (act.dataset.act === 'edit') return admin.openEditor(r, () => {});
    if (act.dataset.act === 'delete') { if (await confirmBox('Delete this API?', `"${r.name}" will be removed from your local database.`)) { await ctx.remove([r.id]); toast('Deleted.', 'ok'); } return; }
  }
  showDetail(r);
});
grid.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList.contains('card')) { const r = byId().get(e.target.dataset.id); r && showDetail(r); } });

function showDetail(r) {
  openModal({
    title: 'API details', html: detailHtml(r),
    onMount: (m, close) => {
      m.addEventListener('click', (e) => {
        const t = e.target.closest('[data-tag]'), c = e.target.closest('[data-cat]'), a = e.target.closest('[data-act=copy]');
        if (t) { close(); S.tag = t.dataset.tag; refresh(); }
        if (c) { close(); S.cat = c.dataset.cat; refresh(); }
        if (a) copy(r.url);
      });
    }
  });
}

/* ---------- routing ---------- */
function route() {
  const isAdmin = location.hash.startsWith('#/admin');
  S.view = isAdmin ? 'admin' : 'browse';
  browse.hidden = isAdmin; $('#adminRoot').hidden = !isAdmin;
  $('#adminBtn').classList.toggle('on', isAdmin);
  if (isAdmin) { admin.show(); renderSide(); window.scrollTo({ top: 0 }); } else refresh();
}
window.addEventListener('hashchange', route);

/* ---------- boot ---------- */
(async function boot() {
  try {
    S.all = await store.init((d, t) => { el.bootMsg.textContent = `First run: indexing ${fmt(d)} / ${fmt(t)} APIs into your local database…`; });
    recomputeCats();
    el.boot.hidden = true;
    route();
  } catch (err) {
    el.bootMsg.innerHTML = `<b>Could not start.</b> ${esc(err.message)}<br><small>Open this app through the Pinokio launcher (or <code>node server.js</code>) rather than as a plain file.</small>`;
    console.error(err);
  }
})();
