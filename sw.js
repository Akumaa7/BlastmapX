// Service worker do Mapeador de Croqui: guarda o app no aparelho para abrir sem sinal.
const CACHE = 'croqui-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest'];
// Recursos externos (3D e fonte). Se falhar o download aqui, são guardados na primeira vez em que o app os usar online.
const EXTRA = [
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    await Promise.all(EXTRA.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('croqui-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const keep = res => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
  if (req.mode === 'navigate') {
    // Abre na hora com a cópia guardada e atualiza em segundo plano (versão nova na próxima abertura).
    e.respondWith((async () => {
      const hit = await caches.match('./index.html');
      const net = fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); } return res; }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
    return;
  }
  e.respondWith((async () => {
    const hit = await caches.match(req);
    const net = fetch(req).then(keep).catch(() => null);
    return hit || (await net) || Response.error();
  })());
});
