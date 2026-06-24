/* 농생대 대여 관리 — 서비스 워커
   전략: 같은 출처(앱 셸)는 네트워크 우선 + 오프라인 캐시 폴백.
   Firebase/CDN/폰트 등 외부 출처는 캐시하지 않고 브라우저 기본 동작에 위임.
   → 온라인일 때는 항상 최신 파일을 받고, 오프라인일 때만 캐시로 대체하므로
     "오래된 앱이 캐시되어 멈추는" 문제를 방지한다. */
const CACHE = 'cals-rental-v1';
const ASSETS = ['./', './index.html', './icon-192.png', './icon-512.png', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // 쓰기 요청은 건드리지 않음
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // 외부(Firebase·CDN·폰트)는 그대로 통과

  // 같은 출처: 네트워크 우선, 실패 시 캐시
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
  );
});
