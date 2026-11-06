/* 由 tools/build_sw.js 生成，不要手改。离线缓存：所有文件在首次打开时存到本机，之后不需要网络。 */
var VERSION = 'xuanshu-cb37806e12';
var FILES = [
  "css/app.css",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "index.html",
  "js/app.js",
  "js/bazi.js",
  "js/explain-ziwei.js",
  "js/explain.js",
  "js/ganzhi.js",
  "js/lib/lunar.js",
  "js/qimen.js",
  "js/timeutil.js",
  "js/ziwei.js",
  "manifest.webmanifest"
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('xuanshu-') === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 外部链接（如古籍原文）照常走网络
  if (req.mode === 'navigate') {
    var home = new URL('index.html', self.registration.scope).href;
    e.respondWith(caches.open(VERSION).then(function (c) { return c.match(home); }).then(function (r) { return r || fetch(req); }));
    return;
  }
  e.respondWith(caches.open(VERSION).then(function (c) { return c.match(req, { ignoreSearch: true }); }).then(function (r) { return r || fetch(req); }));
});
