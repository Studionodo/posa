/**
 * sw.js — service worker.
 *
 * Strategia: cache-first su tutto. L'app deve funzionare in modalita'
 * aereo dal secondo avvio, e non fa mai chiamate di rete proprie.
 *
 * La cache e' VERSIONATA. Senza versione un'app che precacha tutto e non
 * tocca mai la rete non si aggiorna piu': si alza CACHE al deploy e le
 * vecchie vengono cancellate all'activate.
 */

const CACHE = 'posa-v43';

/* Cio' senza cui l'app non parte offline. Se una di queste manca c'e'
   un problema di build, non un asset decorativo assente. */
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/privacy.html',
  '/about.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

/* Risorse che migliorano l'esperienza ma non la reggono: se mancano si
   degrada la tipografia, non si perde il funzionamento offline. */
const PRECACHE_OPZIONALE = [
  '/fonts/playfair-display-500.woff2',
  '/fonts/playfair-display-700.woff2',
  '/fonts/fraunces-marchio.woff2',
  '/fonts/gelasio-400.woff2',
  '/fonts/gelasio-600.woff2',
];

/**
 * Precache resiliente.
 *
 * addAll() e' atomico: se una sola risorsa risponde 404 l'intera
 * promessa viene rigettata, l'evento install fallisce e il service
 * worker non si attiva mai. Il risultato non e' un'app offline con i
 * font sbagliati — e' un'app che non entra in cache e che senza rete
 * non si apre affatto.
 *
 * E' un difetto silenzioso in sviluppo: con la rete tutto sembra
 * funzionare e l'unico sintomo e' un ripiego tipografico che si scambia
 * per una scelta di stile. Qui si aggiunge una risorsa alla volta,
 * catturando i fallimenti singoli: un asset mancante degrada
 * l'aspetto, non azzera l'offline.
 */
function aggiungiUnoAUno(cache, risorse, obbligatorie) {
  return Promise.all(risorse.map((url) =>
    cache.add(url).catch((err) => {
      if (obbligatorie) {
        console.error('[sw] risorsa essenziale non memorizzata:', url, err);
      } else {
        console.warn('[sw] risorsa opzionale assente, si prosegue:', url);
      }
      return null;
    })
  ));
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => aggiungiUnoAUno(c, PRECACHE, true)
        .then(() => aggiungiUnoAUno(c, PRECACHE_OPZIONALE, false)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((chiavi) => Promise.all(
        chiavi.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigazione: sempre index.html dalla cache. Single page, nessuna rotta server.
  //
  // Eccezione: le pagine .html statiche servite direttamente — privacy.html e
  // simili — non devono essere dirottate su index.html, altrimenti aprendo
  // /privacy.html si vede l'applicazione invece del documento.
  if (req.mode === 'navigate') {
    const staticaHtml = url.pathname.endsWith('.html') && url.pathname !== '/index.html';

    if (staticaHtml) {
      e.respondWith(
        caches.match(req).then((cached) => cached || fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return res;
        }).catch(() => new Response('Pagina non disponibile offline.', {
          status: 503, statusText: 'Offline',
        })))
      );
      return;
    }

    e.respondWith(
      caches.match('/index.html').then((r) => r || fetch(req))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Gli asset con hash di Vite non sono nel precache: si aggiungono qui.
        if (res && res.status === 200 && res.type === 'basic') {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return res;
      }).catch(() => {
        // Qui 'cached' e' sempre undefined (altrimenti saremmo usciti
        // sopra): senza rete e senza copia in cache non c'e' nulla da
        // restituire. Un fetch fallito che ritorna undefined manda in
        // crash il service worker con 'Failed to convert value to
        // Response' — bisogna rispondere con un errore vero.
        return new Response('Offline e risorsa non in cache.', {
          status: 503,
          statusText: 'Offline',
        });
      });
    })
  );
});
