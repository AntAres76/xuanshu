/*
 * 生成 sw.js：列出离线要缓存的全部文件，并用内容哈希做版本号。
 * 每次改完代码后运行：node tools/build_sw.js
 * 版本号一变，已安装的手机下次联网打开时就会自动更新。
 */
'use strict';
var fs = require('fs'), path = require('path'), crypto = require('crypto');
var ROOT = path.join(__dirname, '..');

function walk(dir) {
  return fs.readdirSync(path.join(ROOT, dir)).reduce(function (a, f) {
    var p = dir + '/' + f;
    return a.concat(fs.statSync(path.join(ROOT, p)).isDirectory() ? walk(p) : [p]);
  }, []);
}
function fileList() {
  return ['index.html', 'manifest.webmanifest'].concat(walk('css'), walk('js'), walk('icons'))
    .filter(function (f) { return !/LICENSE/.test(f); }).sort();
}
function versionOf(files) {
  var h = crypto.createHash('sha1');
  files.forEach(function (f) { h.update(f); h.update(fs.readFileSync(path.join(ROOT, f))); });
  return h.digest('hex').slice(0, 10);
}
function source(files, ver) {
  return [
    '/* 由 tools/build_sw.js 生成，不要手改。离线缓存：所有文件在首次打开时存到本机，之后不需要网络。 */',
    "var VERSION = 'xuanshu-" + ver + "';",
    'var FILES = ' + JSON.stringify(files, null, 2) + ';',
    '',
    "self.addEventListener('install', function (e) {",
    '  e.waitUntil(caches.open(VERSION).then(function (c) {',
    "    return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); }));",
    '  }).then(function () { return self.skipWaiting(); }));',
    '});',
    '',
    "self.addEventListener('activate', function (e) {",
    '  e.waitUntil(caches.keys().then(function (keys) {',
    "    return Promise.all(keys.filter(function (k) { return k.indexOf('xuanshu-') === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));",
    '  }).then(function () { return self.clients.claim(); }));',
    '});',
    '',
    "self.addEventListener('fetch', function (e) {",
    '  var req = e.request;',
    "  if (req.method !== 'GET') return;",
    '  var url = new URL(req.url);',
    '  if (url.origin !== self.location.origin) return; // 外部链接（如古籍原文）照常走网络',
    "  if (req.mode === 'navigate') {",
    "    var home = new URL('index.html', self.registration.scope).href;",
    '    e.respondWith(caches.open(VERSION).then(function (c) { return c.match(home); }).then(function (r) { return r || fetch(req); }));',
    '    return;',
    '  }',
    '  e.respondWith(caches.open(VERSION).then(function (c) { return c.match(req, { ignoreSearch: true }); }).then(function (r) { return r || fetch(req); }));',
    '});',
    ''
  ].join('\n');
}

if (require.main === module) {
  var files = fileList(), ver = versionOf(files);
  fs.writeFileSync(path.join(ROOT, 'sw.js'), source(files, ver));
  console.log('sw.js 已生成：版本 ' + ver + '，' + files.length + ' 个文件');
}
module.exports = { fileList: fileList, versionOf: versionOf, source: source };
