/**
 * db.js — strato di persistenza.
 *
 * Nessuna dipendenza da React. Nessuna dipendenza da rete.
 * Se un giorno Rullino entra in Istante Labs, questo file viene
 * sostituito da un equivalente Supabase e il resto dell'app non cambia:
 * l'interfaccia pubblica (getRullini, saveRullino, ...) resta identica.
 *
 * IndexedDB e non localStorage perche' localStorage e' sincrono,
 * limitato a ~5MB di sole stringhe, e soprattutto viene sfrattato dal
 * browser sotto pressione di storage. Questi dati il negativo non li
 * restituisce.
 */

const DB_NAME = 'rullino';
const DB_VERSION = 1;
const STORE_RULLINI = 'rullini';
const STORE_SCATTI = 'scatti';

let _db = null;

// ─── apertura ───────────────────────────────────────────────

function open() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains(STORE_RULLINI)) {
        const s = db.createObjectStore(STORE_RULLINI, { keyPath: 'id' });
        s.createIndex('stato', 'stato', { unique: false });
        s.createIndex('data_inizio', 'data_inizio', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_SCATTI)) {
        const s = db.createObjectStore(STORE_SCATTI, { keyPath: 'id' });
        s.createIndex('rullino_id', 'rullino_id', { unique: false });
      }
    };

    req.onsuccess = () => {
      _db = req.result;
      _db.onversionchange = () => { _db.close(); _db = null; };
      resolve(_db);
    };

    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    try { out = fn(s); } catch (err) { reject(err); return; }
    t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

function all(store, indexName, key) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readonly');
    const src = indexName
      ? t.objectStore(store).index(indexName)
      : t.objectStore(store);
    const req = key !== undefined
      ? src.getAll(IDBKeyRange.only(key))
      : src.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  }));
}

// ─── storage persistente ────────────────────────────────────

/**
 * Chiede al browser di non sfrattare i dati sotto pressione di storage.
 * Su Chrome Android viene concesso quasi sempre a PWA installate.
 * Va chiamato una volta all'avvio. Se nega, l'app funziona lo stesso:
 * il rischio e' che il sistema cancelli i dati in condizioni estreme,
 * ed e' per quello che esiste il backup JSON.
 */
export async function richiediPersistenza() {
  if (!navigator.storage || !navigator.storage.persist) {
    return { supportato: false, concesso: false };
  }
  const gia = await navigator.storage.persisted();
  if (gia) return { supportato: true, concesso: true };
  const concesso = await navigator.storage.persist();
  return { supportato: true, concesso };
}

export async function stimaSpazio() {
  if (!navigator.storage || !navigator.storage.estimate) return null;
  const { usage, quota } = await navigator.storage.estimate();
  return { usati: usage || 0, disponibili: quota || 0 };
}

// ─── rullini ────────────────────────────────────────────────

export function getRullini() {
  return all(STORE_RULLINI).then((r) =>
    r.sort((a, b) => (b.data_inizio || '').localeCompare(a.data_inizio || ''))
  );
}

export function getRullino(id) {
  return tx(STORE_RULLINI, 'readonly', (s) => s.get(id));
}

export function saveRullino(rullino) {
  const r = { ...rullino, updated_at: new Date().toISOString() };
  return tx(STORE_RULLINI, 'readwrite', (s) => s.put(r)).then(() => r);
}

export async function deleteRullino(id) {
  const scatti = await getScatti(id);
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction([STORE_RULLINI, STORE_SCATTI], 'readwrite');
    t.objectStore(STORE_RULLINI).delete(id);
    const ss = t.objectStore(STORE_SCATTI);
    scatti.forEach((sc) => ss.delete(sc.id));
    t.oncomplete = () => resolve(true);
    t.onerror = () => reject(t.error);
  });
}

/** Puo' esserci piu' di un rullino in corso: due corpi in borsa e' prassi. */
export function getRulliniInCorso() {
  return all(STORE_RULLINI, 'stato', 'in_corso');
}

// ─── scatti ─────────────────────────────────────────────────

export function getScatti(rullinoId) {
  return all(STORE_SCATTI, 'rullino_id', rullinoId).then((r) =>
    r.sort((a, b) => a.numero - b.numero)
  );
}

export function saveScatto(scatto) {
  const s = { ...scatto, updated_at: new Date().toISOString() };
  return tx(STORE_SCATTI, 'readwrite', (st) => st.put(s)).then(() => s);
}

export function deleteScatto(id) {
  return tx(STORE_SCATTI, 'readwrite', (s) => s.delete(id)).then(() => true);
}

// ─── backup ─────────────────────────────────────────────────

export async function esportaTutto() {
  const [rullini, scatti] = await Promise.all([
    all(STORE_RULLINI),
    all(STORE_SCATTI),
  ]);
  return {
    formato: 'rullino-backup',
    versione: 1,
    esportato_il: new Date().toISOString(),
    rullini,
    scatti,
  };
}

/**
 * modo 'sostituisci' azzera tutto e reimporta.
 * modo 'unisci' sovrascrive per id e conserva il resto.
 */
export async function importaTutto(dump, modo = 'unisci') {
  if (!dump || dump.formato !== 'rullino-backup') {
    throw new Error('File di backup non riconosciuto.');
  }
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction([STORE_RULLINI, STORE_SCATTI], 'readwrite');
    const sr = t.objectStore(STORE_RULLINI);
    const ss = t.objectStore(STORE_SCATTI);
    if (modo === 'sostituisci') { sr.clear(); ss.clear(); }
    (dump.rullini || []).forEach((r) => sr.put(r));
    (dump.scatti || []).forEach((s) => ss.put(s));
    t.oncomplete = () => resolve({
      rullini: (dump.rullini || []).length,
      scatti: (dump.scatti || []).length,
    });
    t.onerror = () => reject(t.error);
  });
}
