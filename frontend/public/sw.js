// ============================================================
// AppForge AI — Service Worker
// Caches static assets with a cache-first strategy for
// offline capability and faster subsequent loads.
// ============================================================

const CACHE_NAME    = 'appforge-ai-v1';
const RUNTIME_CACHE = 'appforge-runtime-v1';

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── Install: pre-cache static assets ────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      // Activate immediately
      return self.skipWaiting();
    }).catch((err) => {
      console.warn('[SW] Pre-cache failed:', err);
    })
  );
});

// ── Activate: clean old caches ───────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache strategies ───────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests & chrome-extension / DevTools
  if (event.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Skip API calls — always go to network
  if (url.pathname.startsWith('/api/')) return;

  // Static assets (JS, CSS, fonts, images): Cache First
  if (isStaticAsset(event.request)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // HTML pages: Network First (fallback to cache)
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(event.request));
    return;
  }

  // Everything else: Network First
  event.respondWith(networkFirst(event.request));
});

// ── Helpers ──────────────────────────────────────────────────

function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    url.pathname.match(/\.(js|css|woff2?|ttf|png|jpg|jpeg|svg|ico|webp)$/) !== null
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('', { status: 503 });
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
      return response;
    }
    throw new Error('Network response not ok');
  } catch {
    // Fallback to cached shell or /index.html for SPA navigation
    const cached = await caches.match(request)
                || await caches.match('/index.html')
                || await caches.match('/');
    return cached || new Response('<h1>Offline</h1>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
