import { esc, icon } from '../ui.js';

// Search input + Free / Freemium / Paid / Auth filters + sort. Built once; updateFilters() syncs the active states.
export function mountSearchBar(root, { onChange }) {
  root.innerHTML = `
    <div class="searchbox">
      ${icon('search', 18)}
      <input id="q" type="search" placeholder="Search by name, category, tag or description…   ( / )" autocomplete="off" spellcheck="false" aria-label="Search APIs">
      <kbd>/</kbd>
      <button class="icon-btn clear" id="qclear" hidden aria-label="Clear search">${icon('x', 16)}</button>
    </div>
    <div class="filters">
      <div class="seg" role="group" aria-label="Pricing">
        <button data-pricing="">Any price</button><button data-pricing="free">Free</button><button data-pricing="freemium">Freemium</button><button data-pricing="paid">Paid</button>
      </div>
      <button class="chip" id="authToggle" aria-pressed="false">${icon('lock', 14)} Auth required</button>
      <span class="active-tag" id="activeTag" hidden></span>
      <label class="sort">Sort
        <select id="sort"><option value="relevance">Relevance</option><option value="az">Name A → Z</option><option value="za">Name Z → A</option><option value="newest">Newest first</option></select>
      </label>
    </div>`;
  const q = root.querySelector('#q'), clear = root.querySelector('#qclear');
  let t;
  q.addEventListener('input', () => { clear.hidden = !q.value; clearTimeout(t); t = setTimeout(() => onChange({ q: q.value }), 90); });
  clear.addEventListener('click', () => { q.value = ''; clear.hidden = true; onChange({ q: '' }); q.focus(); });
  root.querySelectorAll('[data-pricing]').forEach((b) => b.addEventListener('click', () => onChange({ pricing: b.dataset.pricing })));
  root.querySelector('#authToggle').addEventListener('click', () => onChange({ auth: 'toggle' }));
  root.querySelector('#sort').addEventListener('change', (e) => onChange({ sort: e.target.value }));
  root.querySelector('#activeTag').addEventListener('click', () => onChange({ tag: '' }));
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); q.select(); }
  });
  return {
    focus: () => q.focus(),
    sync(S) {
      root.querySelectorAll('[data-pricing]').forEach((b) => b.classList.toggle('on', b.dataset.pricing === S.pricing));
      const a = root.querySelector('#authToggle'); a.classList.toggle('on', S.auth); a.setAttribute('aria-pressed', String(S.auth));
      root.querySelector('#sort').value = S.sort;
      const at = root.querySelector('#activeTag'); at.hidden = !S.tag; at.innerHTML = S.tag ? `#${esc(S.tag)} ${icon('x', 12)}` : '';
      if (q.value !== S.q) { q.value = S.q; clear.hidden = !S.q; }
    }
  };
}
