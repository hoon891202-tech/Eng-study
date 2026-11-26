// 오프라인 지원: 앱 파일을 캐시하고, 온라인이면 백그라운드에서 최신 버전으로 갱신
// (업데이트 때 지우는 건 앱 자기 캐시뿐 — 제니 목소리 모델(transformers-cache)·만든 목소리(jenny-local-voice-v1)·녹음 목소리(jenny-audio-v1)는 유지)
const CACHE = 'jenny-english-v22';
// 녹음 목소리 mp3(audio/heart|bella/*.mp3, 약 36MB)는 미리 받지 않고, 한 번 재생한 것만 AUDIO 캐시에 남긴다.
// 파일 이름이 문장 내용의 해시라 내용이 바뀌면 이름도 바뀜 → 앱 버전을 올려도 지우지 않는다.
const AUDIO = 'jenny-audio-v1';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/data.js', 'js/icons.js', 'js/sync.js', 'js/app.js', 'js/tts-worker.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'audio/manifest.json', 'images/words/credits.json'];

// 미리 저장은 브라우저 HTTP 캐시를 건너뛰고(cache: 'reload') 서버에서 새로 받음 → 배포 직후 옛 파일이 새 캐시에 섞이지 않게
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('jenny-english-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // 기기 안에서 만든 제니 목소리 (앱이 Cache Storage에 저장)
  if (url.origin === location.origin && url.pathname.includes('/lv/')) {
    e.respondWith(caches.open('jenny-local-voice-v1').then(c => c.match(e.request)).then(r => r || new Response('', { status: 404 })));
    return;
  }
  // 녹음 목소리: 캐시에 있으면 바로, 없으면 통째로 받아 저장 (오프라인에서도 한 번 들은 문장은 제니 목소리로)
  // Safari 오디오는 일부분(Range) 요청을 보내므로, 캐시한 파일에서 잘라 206으로 돌려준다.
  if (url.origin === location.origin && /\/audio\/(heart|bella)\/[0-9a-f]+\.mp3$/.test(url.pathname)) {
    e.respondWith(audioResponse(e.request, url.href));
    return;
  }
  const cacheable = url.origin === location.origin || url.host.endsWith('fonts.googleapis.com') || url.host.endsWith('fonts.gstatic.com');
  if (!cacheable) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});

async function audioResponse(req, key) {
  const c = await caches.open(AUDIO);
  let res = await c.match(key);
  if (!res) {
    res = await fetch(key); // Range 없이 전체 파일
    if (!res.ok) return res;
    await c.put(key, res.clone()).catch(() => {});
  }
  const range = req.headers.get('range');
  const m = range && /bytes=(\d*)-(\d*)/.exec(range);
  if (!m) return res;
  const buf = await res.arrayBuffer(), size = buf.byteLength;
  let a = m[1] === '' ? Math.max(0, size - (+m[2] || 0)) : +m[1];
  let b = m[1] !== '' && m[2] !== '' ? Math.min(+m[2], size - 1) : size - 1;
  if (a >= size || a > b) return new Response('', { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(buf.slice(a, b + 1), { status: 206, headers: {
    'Content-Type': 'audio/mpeg', 'Content-Range': `bytes ${a}-${b}/${size}`, 'Content-Length': String(b - a + 1), 'Accept-Ranges': 'bytes' } });
}
