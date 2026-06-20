/* === Service Worker — 离线缓存 === */

const CACHE_NAME = 'xxl-game-v1';

// 需要缓存的文件列表
const FILES_TO_CACHE = [
    '.',
    'index.html',
    'css/style.css',
    'js/board.js',
    'js/game.js',
    'js/renderer.js',
    'manifest.json',
    'icon.svg',
];

// 安装：预缓存所有文件
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] 正在缓存文件...');
            return cache.addAll(FILES_TO_CACHE);
        })
    );
    // 立即激活
    self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// 请求拦截：缓存优先策略
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cached) => {
            // 命中缓存，直接返回
            if (cached) {
                return cached;
            }
            // 未命中，发起网络请求
            return fetch(event.request).then((response) => {
                // 只缓存成功的 GET 请求
                if (!response || response.status !== 200) {
                    return response;
                }
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            });
        })
    );
});
