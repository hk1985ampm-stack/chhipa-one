import { sb, toast } from './core.js';

// ---- tiny IndexedDB key/value store (bigger than localStorage; survives restarts)
let dbp;
const db = () => dbp || (dbp = new Promise((ok, no) => { const r = indexedDB.open('chhipa-one', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }));
export const kvGet = async k => { try { const d = await db(); return await new Promise(ok => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => ok(q.result); q.onerror = () => ok(undefined); }); } catch { return undefined; } };
export const kvSet = async (k, v) => { try { const d = await db(); await new Promise(ok => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = ok; t.onerror = ok; }); } catch {} };

// A failure that means "no internet" (not a rule from the server such as a bad value)
export const isNetErr = e => !navigator.onLine || /failed to fetch|networkerror|load failed|network request failed|fetch/i.test((e && (e.message || String(e))) || '');

// Run a query; remember the answer on this phone; if offline, return the last remembered answer.
export async function cached(key, fetcher) {
  try { const r = await fetcher(); if (!r.error) { kvSet(key, r.data); return { ...r, offline: false }; } if (!isNetErr(r.error)) return r; throw r.error; }
  catch (e) { if (!isNetErr(e)) throw e; const d = await kvGet(key); if (d !== undefined) return { data: d, error: null, offline: true }; return { data: null, error: e, offline: true }; }
}

// ---- outbox: families filled in without internet are kept and uploaded later (client_ref makes a retry safe)
const OB = 'outbox';
export const outbox = async () => (await kvGet(OB)) || [];
export async function enqueue(payload) { const l = await outbox(); l.push({ payload, at: Date.now() }); await kvSet(OB, l); notify(); }
const listeners = new Set(); export const onOutbox = f => { listeners.add(f); return () => listeners.delete(f); };
const notify = async () => { const n = (await outbox()).length; listeners.forEach(f => f(n)); };
let busy = false;
export async function flush(quiet) {
  if (busy || !navigator.onLine) return 0; busy = true; let sent = 0;
  try {
    let l = await outbox();
    while (l.length) {
      const { error } = await sb.rpc('family_create', { p: l[0].payload });
      if (error) { if (isNetErr(error)) break; l[0].error = error.message; l.push(l.shift()); if (l.every(x => x.error)) break; continue; }
      l.shift(); sent++; await kvSet(OB, l);
    }
    await kvSet(OB, l);
  } finally { busy = false; notify(); }
  if (sent && !quiet) toast(sent + (sent === 1 ? ' family' : ' families') + ' uploaded');
  return sent;
}
addEventListener('online', () => flush());
export const initOutbox = () => { notify(); flush(true); };
