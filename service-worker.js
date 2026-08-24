const CACHE_NAME = 'central-prestaya-v2';
const ARCHIVOS_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ---------- Instalación: guarda el "esqueleto" de la app ----------
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ARCHIVOS_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ---------- Activación: limpia versiones de caché anteriores y toma control ----------
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_NAME)
          .map((nombre) => caches.delete(nombre))
      ))
      .then(() => self.clients.claim())
  );
});

// ---------- Peticiones ----------
self.addEventListener('fetch', (evento) => {
  if(evento.request.method !== 'GET') return;

  const esDocumentoPrincipal = evento.request.mode === 'navigate' || evento.request.destination === 'document';

  if(esDocumentoPrincipal){
    // El HTML principal SIEMPRE se busca primero en la red, para que cada
    // actualización se vea de inmediato. Solo si no hay conexión se usa la
    // última copia guardada, como respaldo para trabajar sin internet.
    evento.respondWith(
      fetch(evento.request)
        .then((respuestaRed) => {
          const copia = respuestaRed.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(evento.request, copia));
          return respuestaRed;
        })
        .catch(() => caches.match(evento.request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // El resto de archivos (manifest, íconos) casi no cambian, así que estos
  // siguen sirviéndose desde caché primero para que la app cargue rápido.
  evento.respondWith(
    caches.match(evento.request).then((respuestaCache) => {
      if(respuestaCache) return respuestaCache;

      return fetch(evento.request)
        .then((respuestaRed) => {
          const copia = respuestaRed.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(evento.request, copia));
          return respuestaRed;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
