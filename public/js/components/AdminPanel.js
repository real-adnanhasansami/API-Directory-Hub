import { esc, icon, toast, openModal, confirmBox, fmt, download, tick } from '../ui.js';
import * as auth from '../auth.js';
import { parseBulk } from '../bulk-parser.js';
import { normalizeCategory, detectCategory, inferTags } from '../classify.js';

const PAGE = 25;
const SAMPLE = `Name,URL,Description,Category
Open-Meteo,https://open-meteo.com,Free weather forecast API with no API key,Travel
Stripe Payments API,https://stripe.com/docs/api,Accept payments online. Requires API key,Business
Hugging Face Inference,https://huggingface.co/inference-api,Run machine learning models via REST. Free tier available,AI
Shopify Admin API,https://shopify.dev/docs/api/admin,Manage products and orders for your store,
GitHub REST API,https://docs.github.com/rest,Repositories issues and pull requests. OAuth token required,
`;

export function mountAdmin(root, ctx) {
  const state = { tab: 'manage', q: '', page: 0, selected: new Set() };

  const gate = () => {
    const first = !auth.hasPassword();
    root.innerHTML = `<section class="panel gate">
      <div class="gate-icon">${icon('shield', 28)}</div>
      <h2>${first ? 'Create your admin password' : 'Admin sign-in'}</h2>
      <p class="muted">${first ? 'This password is stored as a salted PBKDF2 hash in this browser only. It protects the admin UI on this machine.' : 'Enter your admin password to manage APIs.'}</p>
      <form id="gateForm" class="stack">
        <input type="password" id="pw" placeholder="Password${first ? ' (min 6 characters)' : ''}" autocomplete="${first ? 'new-password' : 'current-password'}" required minlength="${first ? 6 : 1}">
        ${first ? '<input type="password" id="pw2" placeholder="Repeat password" autocomplete="new-password" required>' : ''}
        <button class="btn primary wide" type="submit">${icon('lock', 16)} ${first ? 'Create &amp; sign in' : 'Sign in'}</button>
        <p class="err" id="gateErr"></p>
      </form>
      ${first ? '' : '<button class="link" id="forgot">Forgot password? Reset admin access</button>'}
    </section>`;
    const err = root.querySelector('#gateErr');
    root.querySelector('#gateForm').onsubmit = async (e) => {
      e.preventDefault();
      const pw = root.querySelector('#pw').value;
      if (first) {
        if (pw.length < 6) return (err.textContent = 'Use at least 6 characters.');
        if (pw !== root.querySelector('#pw2').value) return (err.textContent = 'Passwords do not match.');
        await auth.setPassword(pw);
      } else if (!(await auth.login(pw))) return (err.textContent = 'Wrong password.');
      ctx.onAuthChange(); dashboard();
    };
    const f = root.querySelector('#forgot');
    if (f) f.onclick = async () => {
      if (await confirmBox('Reset admin access?', 'This removes the saved password so you can set a new one. Your APIs are not touched. Anyone with access to this browser profile could do this, which is the limit of client-side protection.', 'Reset password', false)) { auth.resetAuth(); ctx.onAuthChange(); gate(); }
    };
    setTimeout(() => root.querySelector('#pw')?.focus(), 30);
  };

  const dashboard = () => {
    const all = ctx.getAll();
    const bySrc = { base: 0, user: 0, bulk: 0 };
    all.forEach((r) => (bySrc[r.src] = (bySrc[r.src] || 0) + 1));
    root.innerHTML = `<section class="admin">
      <div class="admin-head">
        <div><h2>Admin dashboard</h2><p class="muted">${fmt(all.length)} APIs · ${fmt(bySrc.base)} bundled · ${fmt(bySrc.user)} manual · ${fmt(bySrc.bulk)} bulk-imported</p></div>
        <div class="row gap"><button class="btn" id="back">${icon('grid', 15)} Back to directory</button><button class="btn" id="logout">${icon('logout', 15)} Sign out</button></div>
      </div>
      <div class="tabs" role="tablist">
        <button data-tab="manage" class="${state.tab === 'manage' ? 'on' : ''}">${icon('list', 15)} Manage APIs</button>
        <button data-tab="bulk" class="${state.tab === 'bulk' ? 'on' : ''}">${icon('upload', 15)} Bulk upload</button>
        <button data-tab="data" class="${state.tab === 'data' ? 'on' : ''}">${icon('database', 15)} Data &amp; security</button>
      </div>
      <div id="tabBody"></div></section>`;
    root.querySelector('#back').onclick = () => ctx.goBrowse();
    root.querySelector('#logout').onclick = () => { auth.logout(); ctx.onAuthChange(); gate(); };
    root.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { state.tab = b.dataset.tab; dashboard(); }));
    const body = root.querySelector('#tabBody');
    if (state.tab === 'manage') manage(body); else if (state.tab === 'bulk') bulk(body); else dataTab(body);
  };

  // ---------- Manage ----------
  function manage(body) {
    const all = ctx.getAll();
    const q = state.q.trim().toLowerCase();
    const rows = q ? all.filter((r) => r._h.includes(q)) : all.slice().sort((a, b) => (b.added || 0) - (a.added || 0));
    const pages = Math.max(1, Math.ceil(rows.length / PAGE));
    state.page = Math.min(state.page, pages - 1);
    const slice = rows.slice(state.page * PAGE, state.page * PAGE + PAGE);
    body.innerHTML = `<div class="panel">
      <div class="row gap wrap between">
        <div class="searchbox small">${icon('search', 16)}<input id="mq" placeholder="Filter list…" value="${esc(state.q)}"></div>
        <div class="row gap">
          <button class="btn danger" id="delSel" ${state.selected.size ? '' : 'disabled'}>${icon('trash', 15)} Delete selected (${state.selected.size})</button>
          <button class="btn primary" id="add">${icon('plus', 15)} Add API</button>
        </div>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th><input type="checkbox" id="selAll" aria-label="Select page"></th><th>Name</th><th>Category</th><th>Price</th><th>Auth</th><th>Source</th><th></th></tr></thead>
        <tbody>${slice.map((r) => `<tr data-id="${esc(r.id)}">
          <td><input type="checkbox" class="sel" ${state.selected.has(r.id) ? 'checked' : ''}></td>
          <td class="tname"><strong>${esc(r.name)}</strong><span class="muted">${esc(r.url)}</span></td>
          <td>${esc(r.cat)}</td><td><span class="badge p-${esc(r.pricing)}">${esc(r.pricing)}</span></td><td>${r.auth ? 'Yes' : '–'}</td><td>${esc(r.src)}</td>
          <td class="ta-r"><button class="icon-btn" data-a="edit" title="Edit">${icon('edit', 15)}</button><button class="icon-btn danger" data-a="del" title="Delete">${icon('trash', 15)}</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted center">No APIs match.</td></tr>'}</tbody>
      </table></div>
      <div class="row gap between pager"><span class="muted">${fmt(rows.length)} results · page ${state.page + 1} of ${fmt(pages)}</span>
        <div class="row gap"><button class="btn" id="prev" ${state.page === 0 ? 'disabled' : ''}>Previous</button><button class="btn" id="next" ${state.page >= pages - 1 ? 'disabled' : ''}>Next</button></div></div></div>`;
    let t;
    const mq = body.querySelector('#mq');
    mq.oninput = () => { clearTimeout(t); t = setTimeout(() => { state.q = mq.value; state.page = 0; manage(body); const i = body.querySelector('#mq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 200); };
    body.querySelector('#add').onclick = () => openEditor(null, () => dashboard());
    body.querySelector('#prev').onclick = () => { state.page--; manage(body); };
    body.querySelector('#next').onclick = () => { state.page++; manage(body); };
    body.querySelector('#selAll').onchange = (e) => { slice.forEach((r) => (e.target.checked ? state.selected.add(r.id) : state.selected.delete(r.id))); manage(body); };
    body.querySelectorAll('.sel').forEach((c) => (c.onchange = () => { const id = c.closest('tr').dataset.id; c.checked ? state.selected.add(id) : state.selected.delete(id); body.querySelector('#delSel').disabled = !state.selected.size; body.querySelector('#delSel').lastChild.textContent = ` Delete selected (${state.selected.size})`; }));
    body.querySelector('#delSel').onclick = async () => {
      if (!state.selected.size) return;
      if (await confirmBox('Delete selected APIs?', `${fmt(state.selected.size)} API(s) will be removed from your local database.`)) {
        await ctx.remove([...state.selected]); state.selected.clear(); toast('Deleted.', 'ok'); dashboard();
      }
    };
    body.querySelectorAll('tbody tr[data-id]').forEach((tr) => {
      const id = tr.dataset.id;
      tr.querySelector('[data-a=edit]').onclick = () => openEditor(ctx.getAll().find((r) => r.id === id), () => dashboard());
      tr.querySelector('[data-a=del]').onclick = async () => { if (await confirmBox('Delete this API?', 'This cannot be undone.')) { await ctx.remove([id]); state.selected.delete(id); toast('Deleted.', 'ok'); dashboard(); } };
    });
  }

  // ---------- Bulk upload ----------
  function bulk(body) {
    body.innerHTML = `<div class="panel">
      <h3>Bulk upload</h3>
      <p class="muted">Upload a <code>.txt</code>, <code>.csv</code>, <code>.tsv</code>, markdown or JSON file with 100,000+ lines. Columns are auto-detected (Name, URL, Description, Category – a header row is optional). Free-form lines like <code>Name - https://url - description</code> work too. Duplicates are detected by normalised URL (ignores www, trailing slash, tracking params) and categories are auto-detected when missing.</p>
      <div class="drop" id="drop" tabindex="0">${icon('upload', 28)}<strong>Drop a file here or click to choose</strong><span class="muted" id="fname">.txt · .csv · .tsv · .md · .json</span><input type="file" id="file" accept=".txt,.csv,.tsv,.md,.json,.jsonl,text/*" hidden></div>
      <details class="paste"><summary>…or paste raw text</summary><textarea id="paste" rows="6" placeholder="Name, URL, Description, Category"></textarea></details>
      <div class="opts">
        <label>If an API already exists
          <select id="dup"><option value="skip">Skip it (keep existing)</option><option value="update">Update existing entry</option></select></label>
        <label>Fallback category
          <select id="defcat"><option value="">Auto-detect from name &amp; description</option>${ctx.categories().map((c) => `<option>${esc(c)}</option>`).join('')}</select></label>
        <div class="row gap end"><button class="btn" id="sample">${icon('download', 15)} Sample file</button><button class="btn primary" id="analyze" disabled>Analyze</button></div>
      </div>
      <div id="progress" class="progress" hidden><div class="bar"><i></i></div><span></span></div>
      <div id="result"></div></div>`;
    let text = '', parsed = null;
    const $ = (s) => body.querySelector(s);
    const prog = (label, pct) => { $('#progress').hidden = false; $('#progress i').style.width = pct + '%'; $('#progress span').textContent = label; };
    const ready = (t, name) => { text = t; $('#fname').textContent = name; $('#analyze').disabled = !t.trim(); $('#result').innerHTML = ''; parsed = null; };
    const load = async (f) => { if (!f) return; prog(`Reading ${f.name}…`, 5); ready(await f.text(), `${f.name} · ${(f.size / 1048576).toFixed(2)} MB`); $('#progress').hidden = true; };
    const drop = $('#drop');
    drop.onclick = () => $('#file').click();
    drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') $('#file').click(); };
    $('#file').onchange = (e) => load(e.target.files[0]);
    ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => load(e.dataTransfer.files[0]));
    $('#paste').oninput = (e) => ready(e.target.value, 'pasted text');
    $('#sample').onclick = () => download('api-bulk-sample.csv', SAMPLE, 'text/csv');

    $('#analyze').onclick = async () => {
      const btn = $('#analyze'); btn.disabled = true;
      const t0 = performance.now();
      parsed = await parseBulk(text, { existing: ctx.keyMap(), onDuplicate: $('#dup').value, defaultCategory: $('#defcat').value, onProgress: (d, t) => prog(`Parsing… ${fmt(d)} / ${fmt(t)}`, Math.round((d / Math.max(t, 1)) * 100)) });
      $('#progress').hidden = true; btn.disabled = false;
      const { stats, records, invalidSamples } = parsed;
      const cats = Object.entries(stats.categories).sort((a, b) => b[1] - a[1]);
      const max = cats[0] ? cats[0][1] : 1;
      $('#result').innerHTML = `<div class="stats">
          <div><b>${fmt(stats.lines)}</b><span>lines read</span></div><div class="good"><b>${fmt(stats.parsed)}</b><span>new APIs</span></div>
          <div><b>${fmt(stats.dupExisting)}</b><span>already exist${stats.updated ? ` (${fmt(stats.updated)} will update)` : ''}</span></div><div><b>${fmt(stats.dupInFile)}</b><span>duplicates in file</span></div>
          <div class="${stats.invalid ? 'bad' : ''}"><b>${fmt(stats.invalid)}</b><span>unreadable</span></div></div>
        <p class="muted">Detected format: <strong>${esc(stats.format)}</strong> · parsed in ${((performance.now() - t0) / 1000).toFixed(1)}s</p>
        ${invalidSamples.length ? `<details><summary class="muted">Unreadable samples</summary><pre>${esc(invalidSamples.join('\n'))}</pre></details>` : ''}
        ${cats.length ? `<h4>Auto-detected categories</h4><div class="bars">${cats.map(([c, n]) => `<div><span>${esc(c)}</span><div class="bar sm"><i style="width:${(n / max) * 100}%"></i></div><b>${fmt(n)}</b></div>`).join('')}</div>
        <h4>Preview</h4><div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>URL</th><th>Category</th><th>Price</th></tr></thead><tbody>${records.slice(0, 8).map((r) => `<tr><td>${esc(r.name)}</td><td class="muted">${esc(r.url)}</td><td>${esc(r.cat)}</td><td>${esc(r.pricing)}</td></tr>`).join('')}</tbody></table></div>` : ''}
        <div class="row end gap" style="margin-top:14px"><button class="btn primary" id="import" ${stats.parsed || stats.updated ? '' : 'disabled'}>${icon('check', 15)} Import ${fmt(stats.parsed)} APIs${stats.updated ? ` &amp; update ${fmt(stats.updated)}` : ''}</button></div>`;
      const imp = $('#import');
      if (imp) imp.onclick = async () => {
        imp.disabled = true; btn.disabled = true;
        try {
          await ctx.addMany(parsed.records, (d, t) => prog(`Saving to local database… ${fmt(d)} / ${fmt(t)}`, Math.round((d / t) * 100)));
          if (parsed.updates.length) await ctx.updateMany(parsed.updates);
          $('#progress').hidden = true;
          toast(`Imported ${fmt(parsed.records.length)} APIs.`, 'ok', 5000);
          text = ''; parsed = null; dashboard();
        } catch (e) { toast('Import failed: ' + e.message, 'err', 6000); imp.disabled = false; btn.disabled = false; }
      };
    };
  }

  // ---------- Data & security ----------
  function dataTab(body) {
    const all = ctx.getAll();
    body.innerHTML = `<div class="grid2">
      <div class="panel"><h3>Export</h3><p class="muted">Back up your directory. JSON keeps every field; CSV opens in any spreadsheet and can be re-imported with Bulk upload.</p>
        <div class="row gap wrap"><button class="btn" id="exJson">${icon('download', 15)} All APIs (JSON)</button><button class="btn" id="exCsv">${icon('download', 15)} All APIs (CSV)</button><button class="btn" id="exUser">${icon('download', 15)} Only my additions (JSON)</button></div></div>
      <div class="panel"><h3>Change admin password</h3>
        <form id="pwForm" class="stack"><input type="password" id="op" placeholder="Current password" autocomplete="current-password" required><input type="password" id="np" placeholder="New password (min 6)" autocomplete="new-password" minlength="6" required><button class="btn" type="submit">Update password</button><p class="err" id="pwErr"></p></form></div>
      <div class="panel"><h3>Clean up</h3><p class="muted">Remove everything you imported in bulk (${fmt(all.filter((r) => r.src === 'bulk').length)} entries) without touching bundled or hand-added APIs.</p><button class="btn danger" id="delBulk">${icon('trash', 15)} Delete bulk-imported APIs</button></div>
      <div class="panel"><h3>Reset database</h3><p class="muted">Erase all local changes and reload the ${fmt(all.filter((r) => r.src === 'base').length || 11860)} bundled APIs.</p><button class="btn danger" id="reset">Reset to bundled data</button></div></div>`;
    const $ = (s) => body.querySelector(s);
    const clean = (r) => ({ name: r.name, url: r.url, desc: r.desc, cat: r.cat, more: r.more, tags: r.tags, pricing: r.pricing, auth: r.auth, featured: r.featured, img: r.img, src: r.src, added: r.added });
    $('#exJson').onclick = () => download('api-hub-export.json', JSON.stringify(all.map(clean)), 'application/json');
    $('#exUser').onclick = () => download('api-hub-my-additions.json', JSON.stringify(all.filter((r) => r.src !== 'base').map(clean)), 'application/json');
    $('#exCsv').onclick = async () => {
      const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const parts = ['Name,URL,Description,Category,Tags,Pricing,Auth\n'];
      for (let i = 0; i < all.length; i++) { const r = all[i]; parts.push([r.name, r.url, r.desc, r.cat, r.tags.join(';'), r.pricing, r.auth ? 'yes' : 'no'].map(q).join(',') + '\n'); if (i % 20000 === 0) await tick(); }
      download('api-hub-export.csv', parts.join(''), 'text/csv');
    };
    $('#pwForm').onsubmit = async (e) => {
      e.preventDefault();
      if (!(await auth.verify($('#op').value))) return ($('#pwErr').textContent = 'Current password is wrong.');
      await auth.setPassword($('#np').value); toast('Password updated.', 'ok'); e.target.reset(); $('#pwErr').textContent = '';
    };
    $('#delBulk').onclick = async () => {
      const ids = all.filter((r) => r.src === 'bulk').map((r) => r.id);
      if (!ids.length) return toast('Nothing to delete.');
      if (await confirmBox('Delete bulk-imported APIs?', `${fmt(ids.length)} entries will be removed.`)) { await ctx.remove(ids); toast('Deleted.', 'ok'); dashboard(); }
    };
    $('#reset').onclick = async () => {
      if (await confirmBox('Reset database?', 'All additions, edits and deletions will be lost and the bundled list restored.', 'Reset everything')) {
        toast('Resetting…'); await ctx.reset(); toast('Database reset.', 'ok'); dashboard();
      }
    };
  }

  // ---------- Add / Edit modal ----------
  function openEditor(rec, done) {
    const isNew = !rec;
    const r = rec || { name: '', url: '', desc: '', cat: '', tags: [], pricing: 'free', auth: 0, img: '' };
    openModal({
      title: isNew ? 'Add API' : 'Edit API', wide: true,
      html: `<form id="ef" class="form">
        <label>Name *<input name="name" required value="${esc(r.name)}"></label>
        <label>URL<input name="url" type="text" placeholder="https://…" value="${esc(r.url)}"></label>
        <label class="full">Description<textarea name="desc" rows="3">${esc(r.desc)}</textarea></label>
        <label>Category<input name="cat" list="catlist" placeholder="Leave empty to auto-detect" value="${esc(r.cat)}"><datalist id="catlist">${ctx.categories().map((c) => `<option value="${esc(c)}">`).join('')}</datalist></label>
        <label>Tags (comma separated)<input name="tags" value="${esc((r.tags || []).join(', '))}"></label>
        <label>Pricing<select name="pricing">${['free', 'freemium', 'paid'].map((p) => `<option value="${p}" ${r.pricing === p ? 'selected' : ''}>${p[0].toUpperCase() + p.slice(1)}</option>`).join('')}</select></label>
        <label>Image URL (optional)<input name="img" placeholder="https://… (placeholder is generated if empty)" value="${esc(r.img)}"></label>
        <label class="check full"><input type="checkbox" name="auth" ${r.auth ? 'checked' : ''}> Authentication / API key required</label>
        <p class="err full" id="efErr"></p>
        <div class="row end gap full"><button type="button" class="btn" data-cancel>Cancel</button><button class="btn primary" type="submit">${isNew ? 'Add API' : 'Save changes'}</button></div></form>`,
      onMount: (m, close) => {
        m.querySelector('[data-cancel]').onclick = close;
        m.querySelector('#ef').onsubmit = async (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          const name = f.get('name').trim(), url = String(f.get('url')).trim(), desc = String(f.get('desc')).trim();
          if (url && !/^https?:\/\//i.test(url) && !/^[\w-]+(\.[\w-]+)+/.test(url)) return (m.querySelector('#efErr').textContent = 'That URL does not look valid.');
          const cat = normalizeCategory(f.get('cat')) || detectCategory(name, desc, url);
          const tags = String(f.get('tags')).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
          const next = { ...r, name, url: url && !/^https?:\/\//i.test(url) ? 'https://' + url : url, desc, cat, tags: tags.length ? tags : inferTags(name, desc, cat), pricing: f.get('pricing'), auth: f.get('auth') ? 1 : 0, img: String(f.get('img')).trim() };
          const clash = ctx.findDuplicate(next);
          if (clash && clash.id !== r.id) return (m.querySelector('#efErr').textContent = `Duplicate of existing entry "${clash.name}".`);
          await ctx.save(next, isNew); toast(isNew ? 'API added.' : 'Saved.', 'ok'); close(); done && done();
        };
        m.querySelector('[name=name]').focus();
      }
    });
  }

  return { show: () => (auth.isLoggedIn() ? dashboard() : gate()), openEditor };
}
