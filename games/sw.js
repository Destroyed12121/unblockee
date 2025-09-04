self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('v1').then((cache) => {
            return cache.addAll(['1v1.lol.html']).catch(err => console.error('Cache addAll failed:', err));
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).catch(err => console.error('Fetch failed:', err));
        })
    );
});