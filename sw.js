/* Sacchidanand Prakash - offline support.
 *
 * Upload this file ONCE, into the same folder as index.html. It carries no
 * version number, so it never needs uploading again. Only index.html changes
 * when the app is rebuilt.
 *
 * The document is served NETWORK FIRST: whatever is live on the server wins,
 * and the cached copy is used only when the network cannot be reached. That
 * is what lets a new index.html reach readers who already have the app
 * installed. Google Fonts are served CACHE FIRST because their URLs are
 * immutable.
 */
var CACHE = 'sacchidanand-v1';
var FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(['./', './index.html']); })
      .catch(function () { /* first visit may be offline; not fatal */ })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function keep(req, res) {
  var copy = res.clone();
  caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  // --- The app itself: network first, cache only as a fallback ---
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          if (res && res.ok) keep(req, res);
          return res;
        })
        .catch(function () {
          return caches.match(req).then(function (hit) {
            return hit || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // --- Fonts: cache first, their URLs never change ---
  if (FONT_HOSTS.indexOf(url.hostname) !== -1) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) {
          if (res && (res.ok || res.type === 'opaque')) keep(req, res);
          return res;
        });
      })
    );
    return;
  }

  // --- Everything else: straight to the network, untouched ---
});
