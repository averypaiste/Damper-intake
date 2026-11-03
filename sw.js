// The old app that lived here moved to /beta/. This removes the old offline copy and steps aside.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => /^intake-v\d+$/.test(k)).map((k) => caches.delete(k))))
    .then(() => self.registration.unregister()));
});
