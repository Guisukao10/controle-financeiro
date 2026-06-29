/* ── Suks & Giu System — Service Worker ── */
var CACHE = 'sgs-v1';

var SHELL = [
  '/controle-financeiro/',
  '/controle-financeiro/index.html',
  '/controle-financeiro/manifest.json',
  '/controle-financeiro/assets/shared.css',
  '/controle-financeiro/assets/supabase.js',
  '/controle-financeiro/assets/goals-widget.js',
  '/controle-financeiro/assets/icons/icon.svg',
  '/controle-financeiro/metas/',
  '/controle-financeiro/metas/index.html',
  '/controle-financeiro/metas/app.js',
  '/controle-financeiro/metas/style.css',
  '/controle-financeiro/saude/',
  '/controle-financeiro/saude/index.html',
  '/controle-financeiro/saude/app.js',
  '/controle-financeiro/saude/style.css',
  '/controle-financeiro/habitos/',
  '/controle-financeiro/habitos/index.html',
  '/controle-financeiro/habitos/app.js',
  '/controle-financeiro/habitos/style.css',
  '/controle-financeiro/nutricao/',
  '/controle-financeiro/nutricao/index.html',
  '/controle-financeiro/nutricao/app.js',
  '/controle-financeiro/nutricao/style.css',
  '/controle-financeiro/financeiro/',
  '/controle-financeiro/financeiro/index.html',
  '/controle-financeiro/financeiro/app.js',
  '/controle-financeiro/financeiro/style.css'
];

/* ── Install: cache app shell ── */
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(SHELL);
    }).then(function() {
      return self.skipWaiting(); // activate immediately
    })
  );
});

/* ── Activate: clear old caches ── */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim(); // take control immediately
    })
  );
});

/* ── Fetch: stale-while-revalidate for shell, network-only for API ── */
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Supabase API: always network (real-time data)
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('googleapis.com') && !url.hostname.includes('fonts')) {
    return;
  }

  // Google Fonts & CDN: cache then network update
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('cdnjs.cloudflare.com')) {
    e.respondWith(
      caches.open(CACHE + '-cdn').then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          var net = fetch(e.request).then(function(res) {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          });
          return cached || net;
        });
      })
    );
    return;
  }

  // App shell: stale-while-revalidate (serve cached instantly, update in background)
  e.respondWith(
    caches.open(CACHE).then(function(cache) {
      return cache.match(e.request).then(function(cached) {
        var net = fetch(e.request).then(function(res) {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(function() { return cached; });
        return cached || net;
      });
    })
  );
});
