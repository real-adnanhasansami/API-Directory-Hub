// Client-side admin authentication (PBKDF2 hash in localStorage, session flag in sessionStorage).
// NOTE: this gates the UI of a local, offline tool. It is not server-grade security.
import { hashStr } from './classify.js';
const KEY = 'apihub.auth', SESSION = 'apihub.session';
const b64e = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const b64d = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(pw, saltB64) {
  if (globalThis.crypto && crypto.subtle) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: b64d(saltB64), iterations: 150000, hash: 'SHA-256' }, key, 256);
    return b64e(bits);
  }
  let h = pw + saltB64; // fallback for non-secure contexts
  for (let i = 0; i < 5000; i++) h = hashStr(h + i).toString(36);
  return h;
}
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };

export const hasPassword = () => !!read();
export const isLoggedIn = () => { try { return sessionStorage.getItem(SESSION) === '1'; } catch { return false; } };
export function logout() { try { sessionStorage.removeItem(SESSION); } catch {} }
export async function setPassword(pw) {
  const salt = globalThis.crypto ? b64e(crypto.getRandomValues(new Uint8Array(16))) : String(Math.random());
  localStorage.setItem(KEY, JSON.stringify({ salt, hash: await derive(pw, salt) }));
  try { sessionStorage.setItem(SESSION, '1'); } catch {}
}
export async function login(pw) {
  const rec = read();
  if (!rec) return false;
  const ok = (await derive(pw, rec.salt)) === rec.hash;
  if (ok) try { sessionStorage.setItem(SESSION, '1'); } catch {}
  return ok;
}
export async function verify(pw) { const rec = read(); return !!rec && (await derive(pw, rec.salt)) === rec.hash; }
export function resetAuth() { localStorage.removeItem(KEY); logout(); }
