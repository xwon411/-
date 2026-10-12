/* 농생대 대여 관리 — 서비스 워커
   전략: 같은 출처(앱 셸)는 네트워크 우선 + 오프라인 캐시 폴백.
   Firebase/CDN/폰트 등 외부 출처는 캐시하지 않고 브라우저 기본 동작에 위임.
   → 온라인일 때는 항상 최신 파일을 받고, 오프라인일 때만 캐시로 대체하므로
     "오래된 앱이 캐시되어 멈추는" 문제를 방지한다. */
const CACHE = 'cals-rental-v2';
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
      .catch(() => caches.match(req).then(m => {
        if (m) return m;
        // 저장된 사본이 없는 페이지: 다른 페이지(관리자 화면 등)로 대신 열지 않고 오프라인 안내만 표시
        if (req.mode === 'navigate') return new Response(
          '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<title>오프라인</title><div style="font-family:sans-serif;text-align:center;padding:60px 20px;color:#444">' +
          '<div style="font-size:40px">📡</div><h2>인터넷에 연결되어 있지 않아요</h2><p>연결을 확인한 뒤 다시 열어주세요.</p></div>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        return Response.error();
      }))
  );
});
