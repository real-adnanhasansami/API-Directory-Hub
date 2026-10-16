import { esc, icon, fmt } from '../ui.js';
import { hashStr } from '../classify.js';

// Renders the category navigation. `counts` reflects the active search/filters.
export function renderSidebar(root, { categories, counts, total, active, userCount, persistent }) {
  const sorted = categories.slice().sort((a, b) => {
    if (a === 'Other') return 1; if (b === 'Other') return -1;
    return (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b);
  });
  const all = Object.values(counts).length ? total : 0;
  root.innerHTML = `
    <div class="side-section">
      <button class="nav-item ${active === '' ? 'active' : ''}" data-cat="">
        <span class="dot all">${icon('grid', 13)}</span><span class="nav-label">All APIs</span><span class="count">${fmt(all)}</span>
      </button>
    </div>
    <div class="side-title">Categories <span class="muted">${sorted.length}</span></div>
    <nav class="side-list" aria-label="Categories">
      ${sorted.map((c) => {
        const n = counts[c] || 0, hue = hashStr(c) % 360;
        return `<button class="nav-item ${active === c ? 'active' : ''} ${n === 0 ? 'zero' : ''}" data-cat="${esc(c)}">
          <span class="dot" style="background:hsl(${hue} 75% 55%)"></span><span class="nav-label">${esc(c)}</span><span class="count">${fmt(n)}</span></button>`;
      }).join('')}
    </nav>
    <div class="side-foot">
      <div>${fmt(userCount)} added by you</div>
      <div class="${persistent ? 'ok' : 'warn'}">${persistent ? 'Saved locally (IndexedDB)' : 'Memory only – storage unavailable'}</div>
    </div>`;
}
