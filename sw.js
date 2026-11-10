/* 60分カウントアップタイマー用 Service Worker
   方針: 保存済みのファイルを先に返し（通信なしでも起動）、通信できるときは裏で最新版に更新する。
   更新後の内容は、次に開いたときから反映される。 */
var CACHE = 'timer-v1';
var FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function fetchAndCache(req) {
  return fetch(req).then(function (res) {
    if (res && res.ok) {
      var copy = res.clone();
      caches.open(CACHE).then(function (cache) { return cache.put(req, copy); });
    }
    return res;
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (cached) {
      if (cached) return cached;
      return fetchAndCache(req).catch(function () {
        return req.mode === 'navigate' ? caches.match('./index.html') : Response.error();
      });
    })
  );

  // 保存済みのファイルがあるときは、裏で最新版を取り直す
  event.waitUntil(
    caches.match(req, { ignoreSearch: true }).then(function (cached) {
      return cached ? fetchAndCache(req).catch(function () {}) : null;
    })
  );
});
