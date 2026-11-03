// The simple form moved into /beta/. This removes its old offline copy and steps aside.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => /^simple-v\d+$/.test(k)).map((k) => caches.delete(k))))
    .then(() => self.registration.unregister()));
});
