// Markup moved into the app at ../beta/markup/ (2026-11-18). This replaces the old offline helper:
// it clears the old saved copy, removes itself, and lets every request go to the site as normal.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (/^markup-v\d+$/.test(k)) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: 'window' })) { try { c.navigate(c.url); } catch (err) {} }
  })());
});
