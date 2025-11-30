const CACHE_NAME = 'nexus-blog-v3';
const RUNTIME_CACHE = 'nexus-runtime-v3';

// Detect if we're in development mode
const isDevelopment = 
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  (self.location.port !== '' && self.location.port !== '443' && self.location.port !== '80');

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/logo.svg',
  '/nexus-logo.svg',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => caches.delete(cacheName))
      );
    })
    .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // In development mode, completely skip all fetch interception
  if (isDevelopment) {
    return; // Let browser handle all requests natively
  }

  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!url.origin.startsWith(self.location.origin)) {
    return;
  }

  // Additional safety check for Vite dev server patterns
  const isDevServer = 
    url.searchParams.has('t') || // Vite cache busting query param
    url.pathname.startsWith('/src/') || // Source files
    url.pathname.includes('/node_modules/') || // Node modules
    url.pathname.includes('@vite') || // Vite internal modules
    url.pathname.includes('@react') || // React dev modules
    url.pathname.includes('@id'); // Vite virtual modules

  if (isDevServer) {
    return; // Completely skip - don't call event.respondWith
  }

  // Skip WebSocket and API requests
  if (url.protocol === 'ws:' || url.protocol === 'wss:' || url.pathname.startsWith('/v1/') || url.pathname.startsWith('/api/')) {
    return;
  }

  // Skip requests with special headers (Vite HMR)
  const acceptHeader = request.headers.get('accept') || '';
  if (acceptHeader.includes('text/html') && url.searchParams.has('t')) {
    return;
  }

  // Network-first strategy for JS files to avoid stale React chunks
  const isJSFile = url.pathname.endsWith('.js') || 
                   url.pathname.includes('/assets/js/') ||
                   (request.headers.get('accept') || '').includes('application/javascript');
  
  if (isJSFile) {
    // Network-first for JS files - always try network first
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache if successful and valid
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache).catch(() => {});
              });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache only if network fails
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            throw new Error('Network and cache both failed');
          });
        })
    );
    return;
  }

  // Cache-first for other assets (images, fonts, CSS)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Only cache non-JS static assets
            const contentType = response.headers.get('content-type') || '';
            const isStaticAsset = 
              contentType.startsWith('image/') ||
              contentType.startsWith('font/') ||
              contentType.includes('text/css') ||
              url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|woff|woff2|ttf|eot|css)$/i);

            if (isStaticAsset) {
              const responseToCache = response.clone();
              caches.open(RUNTIME_CACHE)
                .then((cache) => {
                  cache.put(request, responseToCache).catch(() => {});
                });
            }

            return response;
          })
          .catch((error) => {
            // Only return offline page for document requests
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
            // For other requests, let the error propagate
            throw error;
          });
      })
      .catch(() => {
        // If cache match fails and it's a document request, try offline page
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
        // Otherwise, let the browser handle it
        return fetch(request);
      })
  );
});

