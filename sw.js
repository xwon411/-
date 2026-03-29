const CACHE = 'cals-rental-v1';
const ASSETS = [
  './index.html',
  './public.html',
  './manifest.json',
  './manifest-public.json',
  './icon-192.png',
  './icon-512.png'
];

// 설치: 핵심 파일 캐시
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// 활성화: 이전 캐시 삭제
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 요청 처리: Network First (Firebase 실시간 데이터 우선) + 캐시 폴백
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Firebase / Google Fonts / CDN 요청은 항상 네트워크 우선
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('cloudflare.com')
  ) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // HTML/JS/CSS 등 앱 파일: 네트워크 먼저, 실패 시 캐시
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // 성공하면 캐시 업데이트
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
