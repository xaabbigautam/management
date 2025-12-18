const CACHE_NAME = 'greenfield-landscaping-v8.0';
const urlsToCache = [
  './',
  './index.html',
  './team.html',
  './admin.html',
  './style.css',
  './script.js',
  './sw.js',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&display=swap'
];

// Install service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('Cache addAll error:', err))
  );
  self.skipWaiting();
});

// IMPORTANT: Don't intercept Firebase requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip caching for Firebase and dynamic data
  if (url.href.includes('firebase') || 
      url.href.includes('firebasestorage') ||
      url.href.includes('firebasedatabase') ||
      url.href.includes('googleapis.com') ||
      url.pathname.endsWith('.json') ||
      event.request.method !== 'GET') {
    // Network-only for Firebase
    return event.respondWith(fetch(event.request));
  }
  
  // Cache-first strategy for app files
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            // Don't cache non-GET or non-200 responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return null;
          });
      })
  );
});

// Update service worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Claim clients immediately
  self.clients.claim();
});

// Handle messages from main thread
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});