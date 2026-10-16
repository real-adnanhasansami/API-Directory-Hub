// Persistent local database on IndexedDB (localStorage's ~5 MB cap cannot hold 100k+ APIs).
// Falls back to an in-memory store if IndexedDB is unavailable.
import { stripEmoji } from './classify.js';

const DB = 'api-directory-hub', STORE = 'apis', META = 'meta';
let db = null;

function open() {
  return new Promise((resolve) => {
    if (!('indexedDB' in globalThis)) return resolve(null);
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id' });
      if (!d.objectStoreNames.contains(META)) d.createObjectStore(META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}
const wrap = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
const txDone = (tx) => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });

export function prepare(r) {
  r.tags = Array.isArray(r.tags) ? r.tags : [];
  r.more = Array.isArray(r.more) ? r.more : [];
  r._n = stripEmoji(r.name).toLowerCase();
  r._h = `${r.name} ${r.desc} ${r.cat} ${r.more.join(' ')} ${r.tags.join(' ')} ${r.url}`.toLowerCase();
  return r;
}
const strip = (r) => { const { _h, _n, ...rest } = r; return rest; };

let memory = new Map(); // fallback

export async function init(onProgress) {
  db = await open();
  let all = [];
  if (db) {
    const seeded = await wrap(db.transaction(META).objectStore(META).get('seeded'));
    if (!seeded) {
      const res = await fetch('data/apis.json');
      if (!res.ok) throw new Error('Could not load data/apis.json');
      const data = await res.json();
      const recs = data.rows.map((row, i) => ({
        id: 'b' + i, name: row[0], url: row[1], desc: row[2], cat: row[3], tags: row[4], pricing: row[5], auth: row[6], featured: row[7], more: row[8] || [], img: '', src: 'base', added: 0
      }));
      await putMany(recs, onProgress);
      await wrap(db.transaction(META, 'readwrite').objectStore(META).put(true, 'seeded'));
    }
    all = await wrap(db.transaction(STORE).objectStore(STORE).getAll());
  } else {
    const res = await fetch('data/apis.json');
    const data = await res.json();
    all = data.rows.map((row, i) => ({ id: 'b' + i, name: row[0], url: row[1], desc: row[2], cat: row[3], tags: row[4], pricing: row[5], auth: row[6], featured: row[7], more: row[8] || [], img: '', src: 'base', added: 0 }));
    all.forEach((r) => memory.set(r.id, r));
  }
  all.forEach(prepare);
  return all;
}

export const isPersistent = () => !!db;

export async function putMany(recs, onProgress, chunk = 4000) {
  if (!db) { recs.forEach((r) => memory.set(r.id, r)); return; }
  for (let i = 0; i < recs.length; i += chunk) {
    const tx = db.transaction(STORE, 'readwrite');
    const os = tx.objectStore(STORE);
    for (let j = i; j < Math.min(i + chunk, recs.length); j++) os.put(strip(recs[j]));
    await txDone(tx);
    onProgress && onProgress(Math.min(i + chunk, recs.length), recs.length);
  }
}

export async function deleteMany(ids, chunk = 5000) {
  if (!db) { ids.forEach((id) => memory.delete(id)); return; }
  for (let i = 0; i < ids.length; i += chunk) {
    const tx = db.transaction(STORE, 'readwrite');
    const os = tx.objectStore(STORE);
    ids.slice(i, i + chunk).forEach((id) => os.delete(id));
    await txDone(tx);
  }
}

// Drop everything and re-seed from the bundled data file.
export async function resetToBundled(onProgress) {
  if (db) {
    const tx = db.transaction([STORE, META], 'readwrite');
    tx.objectStore(STORE).clear();
    tx.objectStore(META).delete('seeded');
    await txDone(tx);
  } else memory = new Map();
  return init(onProgress);
}

export const newId = (() => { let n = 0; return () => `u${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 5)}`; })();
