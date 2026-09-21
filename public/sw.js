const CACHE = 'bme-public-shell-v1';
const PRECACHE = ['/', '/offline', '/manifest.webmanifest'];
const NEVER_CACHE = [
  '/member',
  '/admin',
  '/profile',
  '/api/',
  '/give/receipt',
  '/give/now',
  '/give/success',
  '/login',
  '/register',
  '/messages',
];

function shouldNeverCache(pathname) {
  return NEVER_CACHE.some(function (prefix) {
    return pathname === prefix || pathname.indexOf(prefix + '/') === 0 || (prefix.slice(-1) === '/' && pathname.indexOf(prefix) === 0);
  });
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key !== CACHE;
          })
          .map(function (key) {
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (shouldNeverCache(url.pathname)) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(function () {
        return caches.match('/offline');
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(function (response) {
        if (response.ok && url.pathname.indexOf('/_next/static/') === 0) {
          const copy = response.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      })
      .catch(function () {
        return caches.match(request);
      })
  );
});

self.addEventListener('push', function () {
  // Push is architecture-only until a provider is configured. Do not display private payloads.
});
