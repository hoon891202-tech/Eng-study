/* =========================================================
   기기 간 기록 공유 (Firebase Firestore + 익명 로그인 + 가족 코드)
   - 같은 가족 코드를 넣은 기기(아이패드·폴드8)가 같은 기록을 씀
   - 두 기기에서 따로 공부해도 합쳐짐: 진도·별은 큰 쪽, 스티커·기록은 합집합,
     설정·우리 단어·즐겨찾기는 마지막에 고친 기기 기준,
     "사진은 이 기기에만" 옵션은 설정 묶음과 따로 자체 시각(photosLocalOnlyAt)으로 마지막에 고친 기기 기준
   - Firestore 규칙은 PROGRESS.md / 부모님 메뉴 안내 참고 (목록 조회 불가, 코드를 알아야 읽기·쓰기)
   ========================================================= */
'use strict';

// 웹 앱 설정값 — 원래 웹페이지에 공개되는 값(비밀번호 아님). 보안은 Firestore 규칙이 담당.
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBzCimLnHzZapltOf2hm-piSJcgG00WXDI',
  authDomain: 'jenny-english-b0da6.firebaseapp.com',
  projectId: 'jenny-english-b0da6',
  storageBucket: 'jenny-english-b0da6.firebasestorage.app',
  messagingSenderId: '354423498366',
  appId: '1:354423498366:web:6c87f453bec9a5b9855a2f',
};
const FB_VER = '10.14.1';
const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 헷갈리는 0·O·1·I·L 제외

/* ---------- 기록 합치기 (순수 함수) ---------- */
function syncStrip(st) { const c = { ...st }; delete c.sync; return c; }
function maxMap(a = {}, b = {}) { const m = { ...a }; for (const [k, v] of Object.entries(b)) m[k] = Math.max(m[k] || 0, v || 0); return m; }
function mergeState(a, b) {
  if (!b) return a;
  if (!a) return b;
  const newer = (k) => ((a[k] || 0) >= (b[k] || 0) ? a : b);
  const st = newer('settingsAt'), ls = newer('listsAt');
  const po = mergePhotoOpt(photoOpt(a), photoOpt(b));
  const prog = (a.dayIndex || 0) >= (b.dayIndex || 0) ? a : b;
  const words = {};
  for (const src of [a.wordStats || {}, b.wordStats || {}]) for (const [w, v] of Object.entries(src)) {
    const o = words[w] || { s: 0, c: 0 }; words[w] = { s: Math.max(o.s, v.s || 0), c: Math.max(o.c, v.c || 0) };
  }
  const hist = {};
  for (const src of [a.history || {}, b.history || {}]) for (const [d, h] of Object.entries(src)) {
    const o = hist[d] || { lesson: false, acts: {}, sec: 0, stars: 0, extra: 0 };
    hist[d] = { lesson: o.lesson || !!h.lesson, acts: { ...o.acts, ...(h.acts || {}) }, sec: Math.max(o.sec, h.sec || 0),
      stars: Math.max(o.stars, h.stars || 0), extra: Math.max(o.extra || 0, h.extra || 0) };
  }
  return {
    ...b, ...a,
    stars: Math.max(a.stars || 0, b.stars || 0),
    dayIndex: prog.dayIndex || 0, lastLessonIdx: prog.lastLessonIdx ?? null,
    curVer: Math.max(a.curVer || 0, b.curVer || 0),
    stickers: [...new Set([...(a.stickers || []), ...(b.stickers || [])])],
    booksRead: maxMap(a.booksRead, b.booksRead),
    wordStats: words, history: hist,
    childName: st.childName, childNameEn: st.childNameEn, settingsAt: st.settingsAt || 0,
    // 옵션은 settings 묶음과 따로 합친다(M1). settings 안 값도 같은 값으로 맞춰 둠 → 옛 v0.19 기기가 읽는 자리
    settings: st.settings ? { ...st.settings, photosLocalOnly: po.v } : st.settings,
    photosLocalOnly: po.v, photosLocalOnlyAt: po.at,
    customWords: ls.customWords || [], favVideos: ls.favVideos || [], listsAt: ls.listsAt || 0,
  };
}
/* ---------- "사진은 이 기기에만" (부모님 메뉴 옵션, 기본 꺼짐) ----------
   켜면 우리 단어 사진(img)은 Firebase로 올리지 않는다. 단어 글자·뜻·이모지와 다른 기록은 그대로 동기화.
   - 올릴 때: img를 비우고 imgElsewhere 표시 → 다른 기기에선 이모지(기본 그림)가 보임
   - 합칠 때: 사진이 빠진 단어는 이 기기(또는 받아온 기록)에 있는 같은 단어 사진을 다시 붙임
     → 켜고 꺼도 이 기기 사진은 사라지지 않고, 끄면 다음 동기화부터 다른 기기에도 사진이 다시 보임
   - 옵션 값은 최상위 photosLocalOnly + photosLocalOnlyAt(켜고 끈 시각). 다른 설정 저장(settingsAt)과 무관하게
     옵션을 마지막으로 고친 기기 기준 → 다른 기기에서 학습 설정을 저장해도 옵션이 꺼지지 않음
   - 옛 기록(v0.19: settings.photosLocalOnly만 있음)은 읽을 때 옮겨 옴: 켜짐이면 그때의 settingsAt을 시각으로,
     꺼짐이면 시각 0(아직 고른 적 없음으로 봄 → 다른 기기의 '켜짐'을 덮지 않음, 사진을 덜 올리는 쪽) */
function photoOpt(st) {
  if (!st) return { v: false, at: 0 };
  if (typeof st.photosLocalOnly === 'boolean') return { v: st.photosLocalOnly, at: +st.photosLocalOnlyAt || 0 };
  const v = !!(st.settings && st.settings.photosLocalOnly);
  return { v, at: v ? (+st.settingsAt || 0) : 0 };
}
// 시각이 큰 쪽, 같으면 켜짐 우선(사진을 덜 올리는 쪽)
function mergePhotoOpt(p, q) { return p.at > q.at ? p : q.at > p.at ? q : { v: p.v || q.v, at: p.at }; }
// 저장된 기록(localStorage·백업)을 새 형식으로: 최상위 옵션이 없으면 settings 안 값을 옮겨 옴
function liftPhotoOpt(d) {
  if (!d || typeof d !== 'object' || typeof d.photosLocalOnly === 'boolean') return d;
  const p = photoOpt(d);
  return { ...d, photosLocalOnly: p.v, photosLocalOnlyAt: p.at };
}
const photosLocalOnly = (st) => photoOpt(st).v;
function stripPhotos(st) {
  if (!st || !Array.isArray(st.customWords)) return st;
  return { ...st, customWords: st.customWords.map(w => (w && w.img ? { ...w, img: null, imgElsewhere: true } : w)) };
}
function keepLocalPhotos(st, ...sources) {
  if (!st || !Array.isArray(st.customWords)) return st;
  const mine = new Map();
  for (const src of sources) for (const w of (src && Array.isArray(src.customWords) ? src.customWords : []))
    if (w && w.img && w.w) { const k = String(w.w).trim().toLowerCase(); if (!mine.has(k)) mine.set(k, w.img); }
  if (!mine.size) return st;
  return { ...st, customWords: st.customWords.map(w => {
    const img = w && !w.img && w.w ? mine.get(String(w.w).trim().toLowerCase()) : null;
    if (!img) return w;
    const c = { ...w, img }; delete c.imgElsewhere; return c;
  }) };
}
function newFamilyCode() {
  const r = new Uint32Array(10); crypto.getRandomValues(r);
  const s = [...r].map(x => CODE_CHARS[x % CODE_CHARS.length]).join('');
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}
function normalizeCode(input) {
  const s = String(input || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  return s.length === 10 ? `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}` : null;
}

/* ---------- Firebase 연결 (필요할 때만 불러옴) ---------- */
let _fb = null;
function fbInit() {
  if (window.__fbMock) return Promise.resolve(window.__fbMock); // 테스트용
  if (_fb) return _fb;
  _fb = (async () => {
    const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
    const [appM, authM, fs] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
    const app = appM.initializeApp(FIREBASE_CONFIG);
    const auth = authM.getAuth(app);
    if (!auth.currentUser) await authM.signInAnonymously(auth);
    return { db: fs.getFirestore(app), fs };
  })();
  _fb.catch(() => { _fb = null; });
  return _fb;
}
function syncErrorText(e) {
  const c = (e && (e.code || e.message)) || String(e);
  if (/permission-denied|insufficient permissions/i.test(c)) return 'Firebase 콘솔에서 Firestore 규칙을 설정해 주세요';
  if (/admin-restricted|operation-not-allowed/i.test(c)) return 'Firebase에서 익명 로그인을 켜 주세요';
  if (/not-found/i.test(c)) return '이 가족 코드를 찾을 수 없어요';
  if (/too-big/i.test(c)) return '기록이 너무 커요. 우리 단어 사진을 몇 개 지우거나 "사진은 이 기기에만"을 켜 주세요';
  if (/unavailable|network|offline|Failed to fetch|import/i.test(c)) return '인터넷 연결을 확인해 주세요';
  return '동기화 오류: ' + c;
}

/* ---------- 동기화 ---------- */
let syncBusy = null, pushTimer = null;
// 원격 기록을 읽어 → 합치고 → 달라졌으면 저장. 화면에 바뀐 게 있으면 changed=true
function syncNow() {
  if (!S.sync || !S.sync.code) return Promise.resolve({ ok: false, err: 'no-code' });
  if (syncBusy) return syncBusy;
  syncBusy = (async () => {
    const code = S.sync.code;
    try {
      const { db, fs } = await fbInit();
      const ref = fs.doc(db, 'families', code);
      let merged = null;
      await fs.runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        const remote = snap.exists() ? JSON.parse(snap.data().state) : null;
        merged = keepLocalPhotos(mergeState(syncStrip(S), remote), S, remote);
        // 합친 설정(가장 최근에 고친 기기 기준)에서 "사진은 이 기기에만"이 켜져 있으면 사진을 빼고 올림
        const upload = photosLocalOnly(merged) ? stripPhotos(merged) : merged;
        const str = JSON.stringify(upload);
        if (str.length > 900000) throw new Error('too-big');
        if (!remote || str !== JSON.stringify(remote)) tx.set(ref, { state: str, v: 1, updatedAt: fs.serverTimestamp() });
      });
      if (!S.sync || S.sync.code !== code) return { ok: false, err: 'cancelled' };
      const before = JSON.stringify([S.dayIndex, S.stars, S.stickers.length, S.lastLessonIdx]);
      S = { ...keepLocalPhotos(mergeState(syncStrip(S), merged), S, merged), sync: { code, lastAt: Date.now(), err: null } };
      saveLocalOnly();
      return { ok: true, changed: before !== JSON.stringify([S.dayIndex, S.stars, S.stickers.length, S.lastLessonIdx]) };
    } catch (e) {
      if (S.sync && S.sync.code === code) { S.sync.err = syncErrorText(e); saveLocalOnly(); }
      return { ok: false, err: syncErrorText(e) };
    } finally { syncBusy = null; }
  })();
  return syncBusy;
}
// 저장할 때마다 바로 올리지 않고 30초 모아서 한 번 (앱을 내리면 즉시)
function schedulePush() {
  if (!S.sync || !S.sync.code) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => syncNow(), 30000);
}
async function createFamily() {
  S.sync = { code: newFamilyCode(), lastAt: 0, err: null };
  const r = await syncNow();
  if (!r.ok) S.sync = null;
  saveLocalOnly();
  return r;
}
async function joinFamily(input) {
  const code = normalizeCode(input);
  if (!code) return { ok: false, err: '가족 코드는 10글자예요 (예: ABCD-EFGH-JK)' };
  try {
    const { db, fs } = await fbInit();
    const snap = await fs.getDoc(fs.doc(db, 'families', code));
    if (!snap.exists()) return { ok: false, err: '이 가족 코드를 찾을 수 없어요' };
  } catch (e) { return { ok: false, err: syncErrorText(e) }; }
  S.sync = { code, lastAt: 0, err: null };
  const r = await syncNow();
  if (!r.ok) { S.sync = null; saveLocalOnly(); }
  return r;
}
function leaveFamily() { S.sync = null; clearTimeout(pushTimer); saveLocalOnly(); }

document.addEventListener('visibilitychange', () => {
  if (!S || !S.sync || !S.sync.code) return;
  if (document.visibilityState === 'hidden') { clearTimeout(pushTimer); syncNow(); }        // 앱을 내릴 때 올리기
  else syncNow().then(r => { if (r.changed && typeof onSyncChanged === 'function') onSyncChanged(); }); // 다시 열면 받아오기
});
