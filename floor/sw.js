// The floor checklist moved to /beta/. This removes the old offline copy so the redirect page always loads.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => /^floor-/.test(k)).map((k) => caches.delete(k))))
    .then(() => self.registration.unregister()).then(() => self.clients.matchAll()).then((cs) => cs.forEach((c) => c.navigate('../beta/'))));
});
