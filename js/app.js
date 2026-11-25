/* =========================================================
   제니의 영어나라 - 메인 앱
   ========================================================= */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');
const overlay = $('#overlay');
const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

/* ---------------- 저장소 ---------------- */
const KEY = 'jenny-english-v1';
function defaultState() {
  const schedule = {};
  for (const [k, v] of Object.entries(ACTIVITIES)) schedule[k] = [...v.days];
  return {
    childName: '', childNameEn: '', stars: 0, dayIndex: 0, lastLessonIdx: null, curVer: CURRICULUM_VERSION,
    history: {}, stickers: [], customWords: [], favVideos: [], wordStats: {}, booksRead: {}, settingsAt: 0, listsAt: 0, sync: null,
    photosLocalOnly: false, photosLocalOnlyAt: 0, // "사진은 이 기기에만" — 설정 묶음과 따로 자체 시각으로 동기화 (sync.js)
    settings: { timeLimit: 20, rate: 0.9, voiceURI: '', showKorean: true, oneLessonPerDay: true, useMic: true, autoNext: false, ytPremium: false, jennyVoice: 'heart', photosLocalOnly: false, schedule },
  };
}
function load() {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      // 옛 기록(settings.photosLocalOnly만 있음)은 최상위 photosLocalOnly(+시각)로 옮겨 옴 (sync.js liftPhotoOpt)
      const d = typeof liftPhotoOpt === 'function' ? liftPhotoOpt(JSON.parse(raw)) : JSON.parse(raw);
      const st = d.settings || {};
      // 커리큘럼 순서가 바뀌면(듣기→말하기→읽기) 진도·요일표만 새로 시작, 별·스티커·기록은 유지
      if (d.curVer !== CURRICULUM_VERSION) { d.dayIndex = 0; d.lastLessonIdx = null; d.curVer = CURRICULUM_VERSION; st.schedule = {}; }
      return { ...base, ...d, settings: { ...base.settings, ...st, schedule: { ...base.settings.schedule, ...(st.schedule || {}) } } };
    }
  } catch (e) { console.warn(e); }
  return base;
}
let S = load();
function saveLocalOnly() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { console.warn(e); toast('저장 공간이 부족해요. 사진 단어를 일부 지워주세요.'); }
}
// 저장 + (가족 코드가 있으면) 잠시 뒤 다른 기기와 동기화
function save() { saveLocalOnly(); if (typeof schedulePush === 'function') schedulePush(); }

/* ---------------- 유틸 ---------------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rand = (a) => a[Math.floor(Math.random() * a.length)];
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const dkey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const todayKey = () => dkey(new Date());
function today() {
  const k = todayKey();
  if (!S.history[k]) S.history[k] = { lesson: false, acts: {}, sec: 0, stars: 0, extra: 0 };
  return S.history[k];
}
const W = (a) => ({ w: a[0], e: a[1], ko: a[2], key: a[3] });
const pic = (x) => x.img ? `<img src="${x.img}" alt="">` : esc(x.e || '⭐');
const picStyle = (x, base) => { const n = x.img ? 1 : [...(x.e || '')].filter(c => /\p{Extended_Pictographic}/u.test(c)).length || 1; return n > 1 ? `style="font-size:calc(${base} / ${Math.min(n, 4) * 0.62})"` : ''; };
const childName = () => S.childName || '친구';
const childNameEn = () => S.childNameEn || 'friend';

/* ---------------- 소리 (효과음) ---------------- */
let actx;
function ac() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, dur = .15, type = 'sine', when = 0, vol = .18) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + when;
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .02);
}
const sfx = {
  ok() { tone(660, .12, 'sine', 0); tone(880, .12, 'sine', .1); tone(1320, .22, 'sine', .2); },
  no() { tone(320, .16, 'triangle', 0, .12); tone(250, .22, 'triangle', .14, .12); },
  pop() { tone(900, .07, 'square', 0, .06); tone(450, .08, 'sine', .03, .12); },
  tap() { tone(560, .06, 'sine', 0, .08); },
  soft() { tone(440, .12, 'sine', 0, .08); tone(392, .16, 'sine', .1, .07); },
  page() { tone(880, .05, 'sine', 0, .05); tone(1175, .07, 'sine', .05, .05); },
  flip() { tone(700, .05, 'triangle', 0, .08); },
  fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, .26, 'triangle', i * .13, .16)); },
};

/* ---------------- 음성 (TTS) ---------------- */
const hasTTS = 'speechSynthesis' in window;
let voices = [];
function loadVoices() { voices = hasTTS ? speechSynthesis.getVoices() : []; }
if (hasTTS) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function enVoices() { return voices.filter(v => /^en[-_]/i.test(v.lang)); }
// 자연스러운 음성 점수: 프리미엄·향상된(내려받은 고품질) > 신경망(Natural/Neural/Online) > 이름 있는 기본 음성
function voiceScore(v) {
  const n = v.name; let sc = 0;
  if (/premium|프리미엄/i.test(n)) sc += 100;
  if (/enhanced|향상된|고품질/i.test(n)) sc += 80;
  if (/natural|neural|online/i.test(n)) sc += 70;
  if (/\b(Ava|Zoe|Allison|Evan|Nathan|Noelle|Susan|Samantha|Joelle|Nicky|Aria|Jenny|Michelle|Emma)\b/.test(n)) sc += 30;
  if (/Google US English/.test(n)) sc += 40;
  if (v.localService === false) sc += 10;   // 크롬·안드로이드의 온라인 음성이 대체로 더 자연스러움
  if (/en[-_]US/i.test(v.lang)) sc += 15; else if (/en[-_](GB|AU)/i.test(v.lang)) sc += 8;
  if (/Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Ralph|Kathy|Grandpa|Grandma|Rocko|Shelley|Flo|Eddy|Reed|Sandy/.test(n)) sc -= 200; // 장난감 같은 효과 음성 제외
  return sc;
}
function rankedEnVoices() { return enVoices().slice().sort((a, b) => voiceScore(b) - voiceScore(a)); }
function pickVoice(lang) {
  if (lang.startsWith('en')) {
    if (S.settings.voiceURI) { const v = voices.find(v => v.voiceURI === S.settings.voiceURI); if (v) return v; }
    return rankedEnVoices()[0];
  }
  return voices.find(v => v.lang.toLowerCase().startsWith(lang.slice(0, 2)));
}
let speakTok = 0;
function stopSpeech() { speakTok++; if (hasTTS) speechSynthesis.cancel(); try { voiceAudio.pause(); } catch (e) { /* noop */ } document.body.classList.remove('talking'); }
/* ---- 제니 녹음 음성 (Kokoro 오픈소스 AI 음성으로 미리 녹음한 mp3) ----
   audio/manifest.json: { 소문자 문장: 파일 이름 }, audio/<heart|bella>/<이름>.mp3 — 녹음이 없는 문장(이름·우리 단어)은 기기 음성 */
let VOICE_MAP = null;
const voiceAudio = new Audio();
voiceAudio.preload = 'auto';
fetch('audio/manifest.json').then(r => r.ok ? r.json() : null).then(m => { VOICE_MAP = m; }).catch(() => { /* 기기 음성만 사용 */ });
/* ---- 실제 사진 (위키미디어 공용 PD·CC0·CC BY — images/words/credits.json, 천천히 늘려 가는 중) ---- */
let PHOTOS = {};
fetch('images/words/credits.json').then(r => r.ok ? r.json() : {}).then(m => { PHOTOS = m || {}; }).catch(() => {});
const photoOf = (w) => (w && PHOTOS[String(w).toLowerCase()]) || null;
function voiceClip(text) {
  const v = S.settings.jennyVoice || 'heart';
  if (v === 'device') return null;
  const n = String(text).trim().replace(/\s+/g, ' ').toLowerCase();
  const h = VOICE_MAP && VOICE_MAP[n];
  if (h) return `audio/${v}/${h}.mp3`;
  return localClip(v, n);
}
/* ---- 이름·우리 단어도 제니 목소리로: 기기 안에서 Kokoro로 만들어 저장 (부모님 메뉴에서 켜기) ----
   만든 말은 Cache Storage 'jenny-local-voice-v1'에 lv/<voice>/<hash>.wav 로 저장 → sw.js가 꺼내 줌 */
const LV_CACHE = 'jenny-local-voice-v1';
const LV = { worker: null, state: 'off', pct: 0, have: new Set(), queue: [], busy: false, made: 0, err: '' };
const lvHash = (n) => { let h = 2166136261; for (let i = 0; i < n.length; i++) { h ^= n.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16) + n.length.toString(16); };
const lvPath = (voice, n) => `lv/${voice}/${lvHash(n)}.wav`;
function localClip(voice, n) {
  if (!S.settings.localVoice) return null;
  if (LV.have.has(voice + '|' + n)) return lvPath(voice, n);
  lvEnqueue(n); return null;
}
function lvEnqueue(n) {
  if (!n || n.length > 220 || /[가-힣]/.test(n)) return;
  for (const voice of ['heart', 'bella']) {
    const k = voice + '|' + n;
    if (!LV.have.has(k) && !LV.queue.includes(k)) LV.queue.push(k);
  }
  try { localStorage.setItem('jenny-lv-queue', JSON.stringify(LV.queue.slice(-400))); } catch (e) { /* noop */ }
  lvPump();
}
// 아이 이름이 들어간 말·우리 단어는 미리 만들어 두기
function lvSeed() {
  const n = childNameEn();
  [`Hi, ${n}!`, `You did it today, ${n}!`, `Great job, ${n}! You did it!`, `Great listening, ${n}!`, `Welcome to English Land, ${n}!`,
    `Great job today, ${n}! Time to rest. See you tomorrow! Bye-bye!`, `Hi, ${n}! I am Jenny, the white rabbit. Let's learn English together!`]
    .forEach(t => lvEnqueue(t.toLowerCase()));
  for (const w of S.customWords) [w.w, `Can you find ${w.w}?`, `That's ${w.w}.`].forEach(t => lvEnqueue(t.trim().replace(/\s+/g, ' ').toLowerCase()));
}
async function lvStart() {
  if (!S.settings.localVoice || LV.worker || !('caches' in window) || typeof Worker === 'undefined') return;
  try {
    const c = await caches.open(LV_CACHE);
    const keys = await c.keys();
    const idx = JSON.parse(localStorage.getItem('jenny-lv-index') || '{}');
    const paths = new Set(keys.map(r => new URL(r.url).pathname.split('/lv/')[1]));
    for (const [k, path] of Object.entries(idx)) if (paths.has(path)) LV.have.add(k);
    LV.queue = (JSON.parse(localStorage.getItem('jenny-lv-queue') || '[]')).filter(k => !LV.have.has(k));
  } catch (e) { /* noop */ }
  LV.state = 'loading'; LV.pct = 0; lvUpdateUI();
  try { LV.worker = new Worker('js/tts-worker.js', { type: 'module' }); } catch (e) { LV.state = 'error'; LV.err = '이 기기에서는 지원되지 않아요'; return lvUpdateUI(); }
  const files = {};
  LV.worker.onmessage = async (e) => {
    const m = e.data;
    if (m.type === 'progress') {
      files[m.file] = [m.loaded || 0, m.total || 0];
      const sum = Object.values(files).reduce((a, [l, t]) => [a[0] + l, a[1] + t], [0, 0]);
      LV.pct = sum[1] ? Math.round(sum[0] / sum[1] * 100) : 0; lvUpdateUI();
    } else if (m.type === 'ready') { LV.state = 'ready'; lvSeed(); lvUpdateUI(); lvPump(); }
    else if (m.type === 'done') {
      const [voice, n] = m.id.split(/\|(.*)/s);
      try {
        const c = await caches.open(LV_CACHE);
        await c.put(new Request(lvPath(voice, n)), new Response(m.blob, { headers: { 'Content-Type': 'audio/wav' } }));
        LV.have.add(m.id); LV.made++;
        const idx = JSON.parse(localStorage.getItem('jenny-lv-index') || '{}'); idx[m.id] = lvPath(voice, n).slice(3);
        localStorage.setItem('jenny-lv-index', JSON.stringify(idx));
        localStorage.setItem('jenny-lv-queue', JSON.stringify(LV.queue));
      } catch (err) { LV.err = '저장 공간이 부족해요'; }
      LV.busy = false; lvUpdateUI(); setTimeout(lvPump, 300);
    } else if (m.type === 'error') {
      if (LV.state === 'loading') { LV.state = 'error'; LV.err = '모델을 받지 못했어요 (인터넷 확인)'; }
      LV.busy = false; lvUpdateUI(); setTimeout(lvPump, 2000);
    }
  };
  LV.worker.postMessage({ type: 'load' });
}
// 아이가 듣는 중엔 쉬고, 조용할 때 하나씩 만들기
function lvPump() {
  if (LV.state !== 'ready' || LV.busy || !LV.queue.length || document.visibilityState !== 'visible') return;
  if (document.body.classList.contains('talking')) { setTimeout(lvPump, 1500); return; }
  const k = LV.queue.shift(); if (LV.have.has(k)) return lvPump();
  const [voice, n] = k.split(/\|(.*)/s);
  LV.busy = true; LV.worker.postMessage({ type: 'gen', id: k, voice: 'af_' + voice, text: n });
}
function lvUpdateUI() {
  const el = document.getElementById('lvStatus'); if (!el) return;
  el.textContent = LV.state === 'loading' ? `제니 목소리 모델 받는 중… ${LV.pct}%` : LV.state === 'ready' ? `✅ 준비 완료 · 만든 말 ${LV.have.size}개 · 만들 말 ${LV.queue.length}개` : LV.state === 'error' ? '⚠️ ' + LV.err : '';
}
function say(text, opt = {}) {
  const lang0 = opt.lang || 'en-US';
  const clip = text && lang0.startsWith('en') ? voiceClip(text) : null;
  if (clip) return sayClip(text, clip, opt);
  return sayTTS(text, opt);
}
// 녹음 재생: 속도 설정은 재생 속도로(음 높이 유지), 단어 하이라이트는 재생 위치로 대략 맞춤
function sayClip(text, url, opt) {
  return new Promise(res => {
    const tok = ++speakTok;
    if (hasTTS) speechSynthesis.cancel();
    let finished = false;
    const done = () => { if (finished) return; finished = true; voiceAudio.ontimeupdate = null; if (tok === speakTok) document.body.classList.remove('talking'); res(); };
    const fallback = () => { if (finished || tok !== speakTok) return; finished = true; sayTTS(text, opt).then(res); };
    voiceAudio.onended = done;
    voiceAudio.onerror = fallback;
    voiceAudio.ontimeupdate = opt.onBoundary ? () => { if (tok === speakTok && voiceAudio.duration) opt.onBoundary(Math.floor(voiceAudio.currentTime / voiceAudio.duration * text.length)); } : null;
    voiceAudio.src = url;
    voiceAudio.playbackRate = Math.max(.5, Math.min(1.6, (opt.rate || 1) * S.settings.rate)); // 보통(0.9) = 녹음보다 10% 천천히
    document.body.classList.add('talking');
    voiceAudio.play().catch(fallback);
    setTimeout(() => { if (!finished && voiceAudio.paused && voiceAudio.currentTime === 0) fallback(); }, 4000); // 못 불러오면 기기 음성으로
    setTimeout(done, 20000);
  });
}
function sayTTS(text, opt = {}) {
  return new Promise(res => {
    if (!hasTTS || !text) return res();
    const lang = opt.lang || 'en-US';
    const tok = ++speakTok;
    try { voiceAudio.pause(); } catch (e) { /* noop */ }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const v = pickVoice(lang); if (v) u.voice = v;
    u.rate = (opt.rate || 1) * (lang.startsWith('en') ? S.settings.rate : 1);
    u.pitch = opt.pitch || 1.03;
    let finished = false;
    const done = () => { if (finished) return; finished = true; if (tok === speakTok) document.body.classList.remove('talking'); res(); };
    u.onend = done; u.onerror = done;
    if (opt.onBoundary) u.onboundary = (e) => { if (tok === speakTok) opt.onBoundary(e.charIndex); };
    setTimeout(done, 1500 + text.length * 160 / u.rate);
    document.body.classList.add('talking');
    speechSynthesis.speak(u);
  });
}
const sayKo = (t) => say(t, { lang: 'ko-KR', rate: 1, pitch: 1.1 });
// 여러 문장을 순서대로 말하고, 화면이 바뀌면 중단
async function talk(...lines) {
  const nav = navTok;
  for (const l of lines) {
    if (nav !== navTok) return false;
    if (typeof l === 'number') { await wait(l); continue; }
    if (Array.isArray(l)) await say(l[0], l[1]); else await say(l);
  }
  return nav === navTok;
}

// iOS: 첫 터치 때 오디오/음성 잠금 해제
document.addEventListener('pointerdown', function unlockVoice() {
  try { voiceAudio.src = 'data:audio/mpeg;base64,//OExAAAAAAAAAAAAFhpbmcAAAAPAAAABwAAAWgAJCQkJCQkJCQkJCQkJCRJSUlJSUlJSUlJSUlJSW1tbW1tbW1tbW1tbW1tkpKSkpKSkpKSkpKSkpKStra2tra2tra2tra2trbb29vb29vb29vb29vb2///////////////////AAAACkxBTUUzLjEwMAQ4AAAAAAAAAAAVCCQEICEAAZoAAAFo3WCc1wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUxAAAAANIAAAAAExBTUUzLjEwMFVV//MUxAsAAANIAAAAAFVVVVVVVVVVVVVV//MUxBYAAANIAAAAAFVVVVVVVVVVVVVV//MUxCEAAANIAAAAAFVVVVVVVVVVVVVV//MUxCwAAANIAAAAAFVVVVVVVVVVVVVV//MUxDcAAANIAAAAAFVVVVVVVVVVVVVV//MUxEIAAANIAAAAAFVVVVVVVVVVVVVV'; voiceAudio.play().then(() => voiceAudio.pause()).catch(() => { /* noop */ }); } catch (e) { /* noop */ }
  document.removeEventListener('pointerdown', unlockVoice, true);
}, true);
document.addEventListener('pointerdown', function unlock() {
  ac();
  if (hasTTS) { try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) { /* noop */ } }
  document.removeEventListener('pointerdown', unlock, true);
}, true);

/* ---------------- 제니 캐릭터 ---------------- */
function jenny(size = 180, extra = '') {
  return `<svg class="jenny ${extra}" width="${size}" height="${size * 1.15}" viewBox="0 -12 200 232" role="img" aria-label="토끼 제니">
  <g class="ear-l"><ellipse cx="72" cy="44" rx="21" ry="54" fill="#fff" stroke="#e6dcef" stroke-width="3"/><ellipse cx="72" cy="50" rx="10" ry="38" fill="#ffc6da"/></g>
  <g class="ear-r"><ellipse cx="128" cy="44" rx="21" ry="54" fill="#fff" stroke="#e6dcef" stroke-width="3"/><ellipse cx="128" cy="50" rx="10" ry="38" fill="#ffc6da"/></g>
  <ellipse cx="100" cy="198" rx="48" ry="26" fill="#fff" stroke="#e6dcef" stroke-width="3"/>
  <ellipse cx="100" cy="134" rx="64" ry="57" fill="#fff" stroke="#e6dcef" stroke-width="3"/>
  <g transform="translate(132 88) rotate(12)"><path d="M0 0 L-22 -13 Q-26 0 -22 13 Z" fill="#ff7eb0"/><path d="M0 0 L22 -13 Q26 0 22 13 Z" fill="#ff7eb0"/><circle r="7" fill="#ff5a98"/></g>
  <g class="eyes"><ellipse cx="78" cy="126" rx="8.5" ry="11" fill="#3b2b4d"/><ellipse cx="122" cy="126" rx="8.5" ry="11" fill="#3b2b4d"/><circle cx="81.5" cy="121" r="3.4" fill="#fff"/><circle cx="125.5" cy="121" r="3.4" fill="#fff"/></g>
  <ellipse cx="62" cy="150" rx="12" ry="7.5" fill="#ffbfd5" opacity=".85"/><ellipse cx="138" cy="150" rx="12" ry="7.5" fill="#ffbfd5" opacity=".85"/>
  <path d="M93 141 Q100 136 107 141 Q100 149 93 141 Z" fill="#ff86ad"/>
  <path class="mouth-closed" d="M89 153 Q94.5 160 100 153 Q105.5 160 111 153" fill="none" stroke="#3b2b4d" stroke-width="3.2" stroke-linecap="round"/>
  <ellipse class="mouth-open" cx="100" cy="158" rx="9" ry="8.5" fill="#c9466a"/>
  <ellipse cx="76" cy="203" rx="13" ry="9" fill="#fff" stroke="#e6dcef" stroke-width="3"/><ellipse cx="124" cy="203" rx="13" ry="9" fill="#fff" stroke="#e6dcef" stroke-width="3"/>
</svg>`;
}
function jennySays(en, ko, size = 150) {
  return `<div class="jenny-wrap"><button data-a="jenny" class="jenny-hop">${jenny(size)}</button>
    <div class="bubble"><span class="en">${esc(en)}</span>${ko && S.settings.showKorean ? `<small>${esc(ko)}</small>` : ''}</div></div>`;
}

/* ---------------- 화면 전환 ---------------- */
let navTok = 0, onHome = false;
let handlers = {};
function render(html, h = {}) {
  navTok++; stopSpeech(); onHome = false;
  lastTopCtx = pendingTopCtx; pendingTopCtx = null; // 이 화면이 수업 단계인지 (뒤로가기용)
  document.body.classList.remove('parent-mode');
  app.innerHTML = `<div class="screen">${html}</div>`;
  app.scrollTop = 0;
  handlers = h;
}
app.addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]');
  if (!b || !app.contains(b)) return;
  const fn = handlers[b.dataset.a];
  if (fn) fn(b, e);
});
let lastTopCtx = null, pendingTopCtx = null;
function topbar(ctx) {
  pendingTopCtx = ctx || null;
  const dots = ctx && ctx.total ? `<div class="progress-dots">${Array.from({ length: ctx.total }, (_, i) => `<span class="${i < ctx.idx ? 'on' : ''}">${CARROT}</span>`).join('')}</div>` : '<div class="spacer"></div>';
  return `<div class="topbar"><button class="icon-btn" data-a="back" aria-label="뒤로">${ui('arrowL', '#6B5E85', 34)}</button><button class="icon-btn" data-a="home" aria-label="홈">${icon('home', 38, '#FF6B8A', '#E04A6C')}</button>${dots}${starPill()}</div>`;
}
const CARROT = icon('carrot', 30, '#FF9A3C', '#4CC38A', '#FFD3A8');
const starPill = () => `<div class="pill">${icon('sticker', 28, '#FFC23D', '#E9A10F', '#fff')} <b class="en" id="starCount">${S.stars}</b></div>`;
/* ---------------- 뒤로가기 ----------------
   - 수업 중: 바로 전 단계 (runSteps의 ctx.prev)
   - 메뉴에서 시작한 활동(게임·대화·따라쓰기·보상 화면): 그 메뉴 화면으로
   - 그 외: 직전 화면 (화면 기록 navStack) */
const navStack = [];
let curScreen = null, navBack = false;
function trackScreen(fn, skip) {
  const w = function (...args) {
    if (skip && skip(args)) return fn.apply(this, args);
    if (!navBack && curScreen && curScreen.fn !== w) { navStack.push(curScreen); if (navStack.length > 30) navStack.shift(); }
    navBack = false;
    const sc = { fn: w, args, tok: 0 };
    curScreen = sc;
    const r = fn.apply(this, args);
    sc.tok = navTok;
    return r;
  };
  return w;
}
function goBack() {
  sfx.tap();
  if (lastTopCtx && lastTopCtx.prev) return lastTopCtx.prev();
  if (curScreen && navTok !== curScreen.tok) { navBack = true; return curScreen.fn(...curScreen.args); }
  const prev = navStack.pop();
  if (!prev) return showHome();
  navBack = true; prev.fn(...prev.args);
}
const baseHandlers = () => ({ back: goBack, home: () => showHome(), jenny: () => { sfx.tap(); say('Hi! I am Jenny!'); } });

/* ---------------- 별 / 레벨 ---------------- */
function levelInfo(stars) {
  let lv = 0, base = 0, need = 10;
  while (stars >= base + need) { base += need; lv++; need = 10 + lv * 5; }
  return { lv, cur: stars - base, need };
}
function addStars(n, fromEl) {
  const before = levelInfo(S.stars).lv;
  S.stars += n; today().stars += n; save();
  const sc = $('#starCount'); if (sc) sc.textContent = S.stars;
  if (fromEl) floatStar(fromEl);
  const after = levelInfo(S.stars).lv;
  if (after > before) setTimeout(() => levelUp(after), 900);
}
function floatStar(el) {
  const r = el.getBoundingClientRect();
  const s = document.createElement('div');
  s.className = 'float-star'; s.textContent = '⭐';
  s.style.left = (r.left + r.width / 2 - 30) + 'px'; s.style.top = (r.top + r.height / 3) + 'px';
  document.body.appendChild(s); setTimeout(() => s.remove(), 1100);
}
function confetti(n = 40) {
  const items = ['⭐', '🥕', '🌸', '💖', '🎉', '🌈', '✨'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'confetti'; c.textContent = rand(items);
    c.style.left = Math.random() * 100 + 'vw';
    c.style.animationDuration = (2 + Math.random() * 2) + 's';
    c.style.animationDelay = Math.random() * .6 + 's';
    document.body.appendChild(c); setTimeout(() => c.remove(), 5000);
  }
}
function levelUp(lv) {
  sfx.fanfare(); confetti(60);
  overlay.innerHTML = `<div class="modal-bg"><div class="modal">${jenny(160)}<h2 class="en" style="font-size:52px;color:var(--purple)">Level ${lv}!</h2><p style="font-size:26px">레벨 업! 정말 잘했어요 🎉</p></div></div>`;
  say(`Wow! Level ${lv}! Great job, ${childNameEn()}!`);
  const close = () => { overlay.innerHTML = ''; };
  setTimeout(close, 3500); overlay.onclick = close;
}
function streak() {
  let n = 0; const d = new Date();
  if (!(S.history[dkey(d)] || {}).lesson) d.setDate(d.getDate() - 1);
  while ((S.history[dkey(d)] || {}).lesson) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function markAct(k) { today().acts[k] = true; save(); }

/* ---------------- 커리큘럼 ---------------- */
function lessonAt(i) { return CURRICULUM[i] || { type: 'mix', stage: 4, n: i - CURRICULUM.length + 1 }; }
function lessonLabel(l) {
  switch (l.type) {
    case 'letter': { const a = ALPHABET.find(x => x.L === l.key); return { en: `Letter ${a.L}${a.L.toLowerCase()}`, ko: `알파벳 ${a.L} (${a.name})`, icon: a.words[0][1] }; }
    case 'review': return { en: `Review ${l.letters[0]}–${l.letters[l.letters.length - 1]}`, ko: '알파벳 복습', icon: '🔁' };
    case 'theme': { const t = THEMES[l.key]; return { en: t.title, ko: t.ko, icon: t.icon }; }
    case 'sentence': { const t = SENTENCES[l.key]; return { en: t.title, ko: t.ko, icon: t.icon }; }
    case 'story': { const b = bookById(l.key); return { en: b.title, ko: `이야기 듣기 · ${b.ko}`, icon: b.cover }; }
    case 'relisten': return { en: 'Listen Again', ko: '다시 듣기 · ' + l.stories.map(k => bookById(k).ko).join(', '), icon: '🎧' };
    default: return { en: `Rainbow Review ${l.n}`, ko: '무지개 복습', icon: '🌈' };
  }
}
function lessonWords(l) {
  switch (l.type) {
    case 'letter': return ALPHABET.find(x => x.L === l.key).words.map(W);
    case 'review': return l.letters.flatMap(L => ALPHABET.find(x => x.L === L).words.map(W));
    case 'theme': return THEMES[l.key].words.map(W);
    case 'sentence': return SENTENCES[l.key].items.map(W);
    case 'story': return storyWords(bookById(l.key));
    case 'relisten': return l.stories.flatMap(k => storyWords(bookById(k)));
    default: return [];
  }
}
function learnedWords() {
  const m = new Map();
  const upto = Math.min(S.dayIndex, CURRICULUM.length - 1);
  for (let i = 0; i <= upto; i++) { const l = CURRICULUM[i]; if (l.type !== 'sentence') lessonWords(l).forEach(x => m.set(x.w, x)); }
  S.customWords.forEach(x => m.set(x.w, { ...x, custom: true }));
  return [...m.values()];
}
const bookById = (id) => STORIES.find(b => b.id === id) || STORIES[0];
let _dict = null;
function koOf(w) {
  if (!_dict) { _dict = {}; ALPHABET.forEach(a => a.words.forEach(x => { _dict[x[0]] = x[2]; })); Object.values(THEMES).forEach(t => t.words.forEach(x => { _dict[x[0]] = x[2]; })); }
  return _dict[w] || _dict[w.replace(/s$/, '')] || '';
}
// 이야기 속 그림에서 핵심 단어 뽑기 (제니 제외, 그림 중복 제거)
function storyWords(book) {
  const out = [];
  for (const pg of book.p) for (const [e, w] of pg[2]) {
    if (w === 'Jenny' || out.some(o => o.e === e || o.w === w)) continue;
    out.push({ w, e, ko: koOf(w) });
  }
  return out.slice(0, 5);
}
function allWords() {
  const m = new Map();
  ALPHABET.forEach(a => a.words.forEach(x => m.set(x[0], W(x))));
  Object.values(THEMES).forEach(t => t.words.forEach(x => m.set(x[0], W(x))));
  return [...m.values()];
}
// 맞춤 학습: 자주 틀리거나 덜 본 단어, 우리 단어를 더 자주 출제
function pickWeighted(pool, n) {
  return pool.map(x => {
    const st = S.wordStats[x.w] || { s: 0, c: 0 };
    const wgt = 1 + (st.s < 2 ? 2 : 0) + (st.s ? 3 * (1 - st.c / st.s) : 0) + (x.custom ? 2 : 0);
    return { x, k: Math.pow(Math.random(), 1 / wgt) };
  }).sort((a, b) => b.k - a.k).slice(0, n).map(a => a.x);
}
function stat(w, ok) { const st = S.wordStats[w] || (S.wordStats[w] = { s: 0, c: 0 }); st.s++; if (ok) st.c++; save(); }
function highlight(word, L) {
  if (!L) return esc(word);
  const i = word.toLowerCase().indexOf(L.toLowerCase());
  if (i < 0) return esc(word);
  return esc(word.slice(0, i)) + '<b>' + esc(word[i]) + '</b>' + esc(word.slice(i + 1));
}

/* ---------------- 시간 관리 ---------------- */
setInterval(() => {
  if (document.visibilityState !== 'visible' || !S.childName) return;
  const t = today(); t.sec += 15; save();
  const lim = S.settings.timeLimit;
  if (lim > 0 && t.sec >= (lim + (t.extra || 0)) * 60 && !overlay.innerHTML) restTime();
}, 15000);
function restTime() {
  stopSpeech(); navTok++;
  overlay.innerHTML = `<div class="modal-bg"><div class="modal">${jenny(170)}
    <h2 class="en">Time to rest! 💤</h2><p style="font-size:24px">오늘 공부 시간이 끝났어요.<br>눈을 쉬고 내일 또 만나요!</p>
    <button class="btn ghost" id="extendBtn" style="margin-top:12px">부모님: 10분 더 하기</button></div></div>`;
  say(`Great job today, ${childNameEn()}! Time to rest. See you tomorrow! Bye-bye!`);
  overlay.onclick = null;
  $('#extendBtn').onclick = () => parentGate(() => { today().extra = (today().extra || 0) + 10; save(); overlay.innerHTML = ''; showHome(); });
}

/* ---------------- 부모 확인 (잠금) ---------------- */
function parentGate(ok) {
  const a = 2 + Math.floor(Math.random() * 8), b = 3 + Math.floor(Math.random() * 7);
  let input = '';
  const prev = overlay.innerHTML;
  overlay.innerHTML = `<div class="modal-bg" id="gateBg"><div class="modal">
    <h2>부모님 확인</h2><p style="font-size:22px">아래 계산의 답을 눌러주세요</p>
    <div class="en" style="font-size:54px;margin:8px 0">${a} + ${b} = <span id="gateIn" style="color:var(--pink)">?</span></div>
    <div class="numpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `<button data-n="${n}">${n}</button>`).join('')}</div>
    <div class="row" style="justify-content:center;margin-top:16px"><button class="btn ghost" data-n="x">취소</button></div></div></div>`;
  overlay.onclick = (e) => {
    const n = e.target.closest('[data-n]');
    if (!n) return;
    if (n.dataset.n === 'x') { overlay.innerHTML = prev; overlay.onclick = null; if (prev) restTime(); return; }
    input += n.dataset.n; $('#gateIn').textContent = input;
    if (+input === a + b) { overlay.innerHTML = ''; overlay.onclick = null; ok(); }
    else if (input.length >= String(a + b).length) { input = ''; setTimeout(() => { const g = $('#gateIn'); if (g) g.textContent = '?'; }, 400); }
  };
}

/* =========================================================
   홈
   ========================================================= */
function showHome() {
  if (!S.childName) return showOnboarding();
  const t = today();
  const lv = levelInfo(S.stars);
  const doneToday = t.lesson && S.settings.oneLessonPerDay;
  const idx = doneToday && S.lastLessonIdx != null ? S.lastLessonIdx : S.dayIndex;
  const l = lessonAt(idx), lab = lessonLabel(l);
  const stage = STAGES[Math.min(l.stage, 4)];
  const dow = new Date().getDay();
  // 활동마다 마을의 집 한 채
  const houses = ['listen', 'book', 'talk', 'game', 'mywords', 'review', 'song', 'story', 'abc', 'stickers'].map(k => {
    const [ic, wall, roof] = HOUSE[k];
    const isSt = k === 'stickers';
    const label = isSt ? '스티커북' : ACTIVITIES[k].ko;
    const flag = !isSt && t.acts[k] ? `<div class="flag ok"><i></i><b>${ui('check', '#fff', 18)}</b></div>`
      : !isSt && S.settings.schedule[k]?.[dow] ? '<div class="flag"><i></i><b>오늘!</b></div>' : '';
    return `<button class="house" data-a="${isSt ? 'stickers' : 'act'}" data-k="${k}">${flag}<div class="roof" style="border-bottom-color:${roof}"></div>
      <div class="hbody" style="background:${wall}"><div class="win">${icon(ic, 54, wall, roof, '#fff')}</div></div><div class="label">${label}</div></button>`;
  }).join('');
  const sun = new Date(); sun.setDate(sun.getDate() - dow);
  const week = DAYS_KO.map((d, i) => {
    const day = new Date(sun); day.setDate(sun.getDate() + i);
    const h = S.history[dkey(day)];
    const mark = h && h.lesson ? icon('carrot', 26, '#FF9A3C', '#4CC38A', '#FFD3A8') : (h && Object.keys(h.acts || {}).length ? '<i class="sprout"></i>' : '');
    return `<span class="${i === dow ? 'now' : ''}"><div class="stone">${mark}</div>${d}</span>`;
  }).join('');
  const hello = doneToday ? [`You did it today, ${childNameEn()}!`, `${childName()}, 오늘 수업 완료! 최고야!`] : [`Hi, ${childNameEn()}!`, `안녕 ${childName()}! 오늘은 어디 갈까?`];
  const ribbon = doneToday ? '오늘 완료!' : l.type === 'story' || l.type === 'relisten' ? '오늘의 이야기' : '오늘의 수업';

  render(`
    <div class="topbar"><div class="pill lv"><b class="en">Level ${lv.lv}</b><div class="bar"><i style="width:${lv.cur / lv.need * 100}%"></i></div></div>
      <div class="pill streak">${icon('sun', 26, '#FFC23D', '#FF9F1C', '#FFF2CF')} ${streak()}일 연속</div><div class="spacer"></div>
      ${starPill()}<button class="icon-btn" data-a="parent" aria-label="부모님 메뉴">${icon('gear', 30, '#B9AECB')}</button></div>
    <div class="week-stones">${week}</div>
    <div class="village-mid">
      ${jennySays(hello[0], hello[1], 210)}
      <button class="signpost ${doneToday ? 'done' : ''}" data-a="lesson"><i class="post l"></i><i class="post r"></i>
        <div class="board"><span class="ribbon">${ribbon}</span><span class="sign-ic">${lab.icon}</span>
          <div><div class="t1">Day ${idx} · ${esc(stage.title)}</div><div class="t2">${doneToday ? '한 번 더 볼까?' : esc(lab.ko.replace('이야기 듣기 · ', ''))}</div><div class="t1">${esc(lab.en)}</div></div>
          <span class="play">${ui(doneToday ? 'replay' : 'play', '#fff', 42)}</span></div></button>
    </div>
    <div class="village">${houses}</div>`, {
    ...baseHandlers(),
    jenny: () => { sfx.tap(); talk(hello[0], [hello[1], { lang: 'ko-KR', rate: 1 }]); },
    parent: () => parentGate(showParent),
    lesson: () => startLesson(doneToday),
    stickers: showStickers,
    act: (b) => openActivity(b.dataset.k),
  });
  onHome = true;
}
function openActivity(k) {
  ({ listen: showListening, talk: showTalkMenu, book: showLibrary, abc: showABC, trace: () => showTraceMenu(), game: showGames, mywords: startMyWords, review: startReview, song: () => showVideos('songs'), story: () => showVideos('stories') })[k]();
}

/* ---------------- 처음 설정 ---------------- */
function showOnboarding() {
  render(`<div class="center">
    ${jenny(220, 'jenny-hop')}
    <h1 class="title"><span class="en">Welcome to Jenny's English Land!</span>제니의 영어나라에 온 걸 환영해요</h1>
    <div class="panel" style="width:min(90vw,560px);text-align:left">
      <h3>부모님, 아이 이름을 알려주세요</h3>
      <div class="row"><input id="nm" type="text" placeholder="이름 (예: 나현)" style="flex:1"></div>
      <div class="row"><input id="nmEn" type="text" placeholder="영어로 부를 이름 (예: Nahyun) - 선택" style="flex:1"></div>
      <p class="desc">제니가 영어로 이름을 불러줄 때 사용해요. 아이패드 Safari에서 공유 버튼 → "홈 화면에 추가"를 누르면 앱처럼 쓸 수 있어요.</p>
      <button class="btn" data-a="start" style="width:100%;font-size:22px;padding:16px">시작하기 🐰</button>
    </div></div>`, {
    ...baseHandlers(),
    start: () => {
      const n = $('#nm').value.trim();
      if (!n) { $('#nm').focus(); return; }
      S.childName = n; S.childNameEn = $('#nmEn').value.trim(); S.settingsAt = Date.now(); save();
      showHome();
      say(`Hi, ${childNameEn()}! I am Jenny, the white rabbit. Let's learn English together!`);
    },
  });
}

/* =========================================================
   수업 진행
   ========================================================= */
function runSteps(steps, onDone) {
  let i = 0;
  const go = () => {
    if (i >= steps.length) return onDone();
    const st = steps[i++];
    st({ next: go, prev: i > 1 ? () => { i -= 2; go(); } : null, idx: i - 1, total: steps.length });
  };
  go();
}

function startLesson(replay) {
  const idx = replay && S.lastLessonIdx != null ? S.lastLessonIdx : S.dayIndex;
  const l = lessonAt(idx);
  let words = lessonWords(l);
  if (l.type === 'mix') words = pickWeighted(learnedWords(), 6);
  const pool = () => learnedWords().filter(x => !words.some(w => w.e === x.e));
  const steps = [ctx => stepIntro(l, ctx)];

  if (l.type === 'letter') {
    steps.push(ctx => stepWords(words, ctx, { letter: l.key }));
    steps.push(ctx => stepTrace(l.key, ctx));
    steps.push(ctx => findGame({ targets: words, pool: pool(), rounds: 3, ctx }));
  } else if (l.type === 'review') {
    const firsts = l.letters.map(L => W(ALPHABET.find(x => x.L === L).words[0]));
    steps.push(ctx => stepWords(firsts, ctx, { review: true }));
    steps.push(ctx => balloonGame(l.letters, ctx));
    steps.push(ctx => memoryGame(pickWeighted(words, 3), ctx));
  } else if (l.type === 'sentence') {
    steps.push(ctx => stepWords(words, ctx, { sentence: true }));
    steps.push(ctx => talkGame(l.key, ctx));
  } else if (l.type === 'story') {
    // 듣기 나라: 이야기를 통째로 듣고 → 단어 → 알아듣기 게임 → 핵심 한마디 (말하기는 권유만)
    const book = bookById(l.key);
    steps.push(ctx => readBook(book, { auto: S.settings.autoNext, ctx, onEnd: ctx.next }));
    steps.push(ctx => stepWords(words, ctx, { listen: true }));
    steps.push(ctx => findGame({ targets: words, pool: pool(), rounds: Math.min(4, words.length), ctx }));
    steps.push(ctx => sayItStep({ w: book.say[0], ko: book.say[1], e: book.cover }, ctx));
  } else if (l.type === 'relisten') {
    l.stories.forEach(k => steps.push(ctx => readBook(bookById(k), { auto: S.settings.autoNext, ctx, onEnd: ctx.next })));
    steps.push(ctx => findGame({ targets: pickWeighted(words, 5), pool: pool(), rounds: 4, ctx }));
  } else {
    steps.push(ctx => stepWords(words, ctx, { listen: l.stage <= 1 }));
    steps.push(ctx => findGame({ targets: words, pool: pool(), rounds: 4, ctx }));
    steps.push(ctx => memoryGame(pickWeighted(words, 3), ctx));
  }
  runSteps(steps, () => {
    let fresh = false;
    if (!replay && !(today().lesson && S.settings.oneLessonPerDay && S.lastLessonIdx === idx)) {
      fresh = true;
      S.lastLessonIdx = idx; S.dayIndex = idx + 1;
    }
    today().lesson = true; markAct('lesson');
    rewardScreen({ lesson: l, sticker: fresh, stars: fresh ? 5 : 2 });
  });
}

function stepIntro(l, ctx) {
  const h = { ...baseHandlers(), next: ctx.next };
  let body = '', lines = [];
  if (l.type === 'letter') {
    const a = ALPHABET.find(x => x.L === l.key);
    body = jennySays(`This is the letter ${a.L}!`, `오늘은 알파벳 ${a.L} (${a.name})를 배워요`) + `<div class="center">
      <button data-a="letter"><div class="big-letter" id="bl">${a.L}${a.L.toLowerCase()}</div></button>
      <div class="letter-info"><div class="chip"><span class="k">이름</span> ${a.name}</div>
      <div class="chip"><span class="k">소리</span> <span class="en">${a.ipa}</span> "${a.soundKo}"</div>
      <div class="chip"><span class="k">예</span> ${a.words[0][1]} <span class="en">${a.words[0][0]}</span></div></div></div>`;
    lines = [`This is the letter ${a.L}!`, 400, `${a.L}.`, 300, `${a.L} says, ${a.sound}. ${a.sound}.`, 300, `${a.L}, ${a.sound}, ${a.words[0][0]}!`];
    h.letter = () => { const e = $('#bl'); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); talk(`${a.L}.`, 200, `${a.sound}. ${a.sound}.`); };
  } else if (l.type === 'review') {
    body = jennySays("Let's review!", '배운 알파벳을 다시 만나요') + `<div class="center"><div class="big-letter" style="font-size:min(20vh,170px)">${l.letters.join(' ')}</div></div>`;
    lines = ["Let's review!", 300, l.letters.join('. ') + '.'];
  } else if (l.type === 'story') {
    const b = bookById(l.key);
    body = jennySays("Let's listen to a story!", '이야기를 들어봐요. 몰라도 괜찮아요, 그림을 보면서 들어요!') + `<div class="center"><div style="font-size:min(28vh,230px)">${b.cover}</div><h1 class="title"><span class="en">${esc(b.title)}</span>${esc(b.ko)}</h1></div>`;
    lines = ["Let's listen to a story!", 300, b.title + '.'];
  } else if (l.type === 'relisten') {
    body = jennySays("Let's listen again!", '들었던 이야기를 다시 들어요. 들을수록 귀가 열려요!') + `<div class="center"><div style="font-size:min(22vh,180px)">${l.stories.map(k => bookById(k).cover).join(' ')}</div></div>`;
    lines = ["Let's listen again!"];
  } else if (l.type === 'mix') {
    body = jennySays("Rainbow review time!", '지금까지 배운 단어를 섞어서 복습해요') + `<div class="center"><div style="font-size:200px">🌈</div></div>`;
    lines = ['Rainbow review time! Let\'s go!'];
  } else {
    const t = l.type === 'theme' ? THEMES[l.key] : SENTENCES[l.key];
    const isHello = l.key === 'hello' && l.type === 'theme';
    const en = isHello ? "Hi! I'm Jenny, the white rabbit!" : `Today, let's learn: ${t.title}`;
    const ko = isHello ? '안녕! 나는 하얀 토끼 제니야. 영어나라에 온 걸 환영해!' : `오늘은 "${t.ko}"를 배워요`;
    body = jennySays(en, ko) + `<div class="center"><div style="font-size:min(26vh,220px)">${t.icon}</div><h1 class="title"><span class="en">${esc(t.title)}</span>${esc(t.ko)}</h1></div>`;
    lines = isHello ? [en, 300, `Welcome to English Land, ${childNameEn()}!`, 300, "Let's say hello!"] : [en.replace(':', '.')];
  }
  render(topbar(ctx) + body + `<div class="nav-row"><button class="round-btn speak" data-a="replay">${ui('speaker')}</button><button class="round-btn primary" data-a="next">${ui('arrowR')}</button></div>`,
    { ...h, replay: () => talk(...lines) });
  talk(...lines);
}

function stepWords(words, ctx, opt = {}) {
  let i = 0;
  const line = (x) => opt.sentence ? x.w : opt.review ? `${x.w[0].toUpperCase()} is for ${x.w}.` : opt.letter ? `${opt.letter} is for ${x.w}!` : x.w;
  const show = () => {
    const x = words[i], ph = !opt.sentence && !x.img ? photoOf(x.w) : null; let real = false;
    render(topbar(ctx) + `
      ${jennySays(opt.sentence ? 'Listen and say it!' : opt.listen ? 'Listen and look!' : 'Say it with me!', opt.listen ? '잘 듣고 그림을 봐요 (따라 하고 싶으면 해도 돼요)' : '잘 듣고 따라 말해요', 120)}
      <div class="center">
        <button class="card word-card ${opt.sentence ? 'sentence-card' : ''}" data-a="say">
          <div class="pic" ${picStyle(x, 'min(24vh,210px)')}>${pic(x)}</div>
          <div class="w">${opt.letter ? highlight(x.w, opt.letter) : esc(x.w)}</div>
          ${S.settings.showKorean && x.ko ? `<div class="ko">${esc(x.ko)}</div>` : ''}
        </button>
        <div class="hint">${i + 1} / ${words.length} · 카드를 누르면 다시 들려줘요</div>
      </div>
      <div class="nav-row">
        <button class="round-btn" data-a="prev" ${i === 0 ? 'style="visibility:hidden"' : ''}>${ui('arrowL', '#6B5E85')}</button>
        <button class="round-btn speak" data-a="say">${ui('speaker')}</button>
        ${ph ? `<button class="round-btn photo-btn" data-a="photo" aria-label="진짜 사진 보기">📷</button>` : ''}
        <button class="round-btn primary" data-a="next">${ui('arrowR')}</button>
      </div>`, {
      ...baseHandlers(),
      say: () => { sfx.tap(); talk(line(x)); },
      photo: (b) => { sfx.tap(); real = !real; const el = $('.word-card .pic'); el.classList.toggle('is-photo', real); el.innerHTML = real ? `<img class="real-photo" src="${ph.img}" alt="">` : pic(x); b.textContent = real ? '🎨' : '📷'; if (real) talk("Look!", 200, x.w); },
      prev: () => { i--; show(); },
      next: () => { stat(x.w, true); i++; if (i >= words.length) ctx.next(); else show(); },
    });
    if (opt.sentence) talk(x.w, 700, [x.w, { rate: .85 }], 300, 'Your turn!');
    else talk(line(x), 600, x.w);
  };
  show();
}

/* ---------------- 따라쓰기 ---------------- */
// 따라쓰기: 대문자는 ① 제니가 쓰는 순서를 보여주고 ② 순서대로 한 획씩 따라 그리기, 소문자는 모양 따라 그리기
function stepTrace(L, ctx, onDone) {
  let lower = false, color = '#ff7eb0', finished = false, mode = 'free', demoTok = 0;
  const colors = ['#ff7eb0', '#5bb8ff', '#3fcfa6', '#ff9a3c', '#a07cf5'];
  const NUM = ['One', 'Two', 'Three', 'Four'];
  render(topbar(ctx) + `
    ${jennySays(`Let's write ${L}!`, '제니가 쓰는 순서를 먼저 보여줄게요. 그다음 초록 점부터 따라 그려요', 110)}
    <div class="center">
      <div class="trace-wrap" id="tw"><canvas id="cg"></canvas><canvas id="cd"></canvas></div>
      <div class="trace-tools">${colors.map(c => `<button class="color-dot ${c === color ? 'on' : ''}" data-a="color" data-c="${c}" style="background:${c}"></button>`).join('')}
        <button class="round-btn" data-a="demo" style="width:64px;height:64px;font-size:30px" aria-label="쓰는 순서 다시 보기">👀</button>
        <button class="round-btn" data-a="case" style="width:64px;height:64px;font-size:26px"><span class="en">Aa</span></button>
        <button class="round-btn" data-a="clear" style="width:64px;height:64px;font-size:30px">🧽</button>
        <button class="round-btn primary" data-a="next" id="traceNext" style="width:64px;height:64px;font-size:30px">${ui('arrowR', '#fff', 32)}</button></div>
    </div>`, {
    ...baseHandlers(),
    color: (b) => { color = b.dataset.c; document.querySelectorAll('.color-dot').forEach(d => d.classList.toggle('on', d === b)); },
    demo: () => setup(true),
    case: () => { lower = !lower; setup(!lower); },
    clear: () => setup(false),
    next: () => { markAct('trace'); (onDone || ctx.next)(); },
  });
  const tw = $('#tw'), cg = $('#cg'), cd = $('#cd');
  const dpr = window.devicePixelRatio || 1;
  const nav = navTok;
  let pts = [], covered = 0, drawing = false, last = null;
  let strokes = null, active = 0, size = 0, rad = 0;
  const strokesFor = () => (!lower && LETTER_STROKES[L]) || null;

  // ---- 공통: 성공
  function success() {
    finished = true; sfx.ok(); confetti(25); addStars(1, tw);
    say(`Great job! ${lower ? L.toLowerCase() : L}!`);
    const n = $('#traceNext'); if (n) n.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 600, iterations: 3 });
  }
  // ---- 획 모드: 좌표 변환·점 고르게 나누기
  function layout() {
    const w = cg.width, h = cg.height;
    size = Math.min(w, h) * .8; rad = size * .085;
    const ox = (w - size) / 2, oy = (h - size) / 2;
    const map = ([x, y]) => ({ x: ox + x / 100 * size, y: oy + y / 100 * size });
    strokes = strokesFor().map(st => {
      const raw = st.map(map), out = [raw[0]];
      for (let i = 1; i < raw.length; i++) {
        const a = raw[i - 1], b = raw[i], d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / (size * .025)));
        for (let k = 1; k <= n; k++) out.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n });
      }
      return out.map(p => ({ ...p, hit: false }));
    });
  }
  function pathOf(g, st, upto = st.length) { g.beginPath(); g.moveTo(st[0].x, st[0].y); for (let i = 1; i < upto; i++) g.lineTo(st[i].x, st[i].y); }
  function drawGuide() {
    const g = cg.getContext('2d');
    g.clearRect(0, 0, cg.width, cg.height); g.lineCap = 'round'; g.lineJoin = 'round';
    strokes.forEach((st, k) => {
      g.setLineDash([]); g.lineWidth = size * .13;
      g.strokeStyle = k < active ? '#FFD1DF' : k === active && mode === 'trace' ? '#FFE79A' : '#EFE7F7';
      pathOf(g, st); g.stroke();
      g.setLineDash([size * .03, size * .03]); g.lineWidth = size * .012; g.strokeStyle = '#C9B6E4'; pathOf(g, st); g.stroke();
    });
    g.setLineDash([]);
    for (let k = strokes.length - 1; k >= active; k--) {   // 출발점 번호(지금 그릴 획이 맨 위) + 방향 화살표
      const st = strokes[k];
      const now = k === active && mode === 'trace', p = st[0], q = st[Math.min(3, st.length - 1)];
      if (now) {
        const ang = Math.atan2(q.y - p.y, q.x - p.x), ar = size * .1, ax = p.x + Math.cos(ang) * size * .12, ay = p.y + Math.sin(ang) * size * .12;
        g.fillStyle = '#3FC495'; g.beginPath();
        g.moveTo(ax + Math.cos(ang) * ar * .6, ay + Math.sin(ang) * ar * .6);
        g.lineTo(ax + Math.cos(ang + 2.4) * ar * .5, ay + Math.sin(ang + 2.4) * ar * .5);
        g.lineTo(ax + Math.cos(ang - 2.4) * ar * .5, ay + Math.sin(ang - 2.4) * ar * .5); g.fill();
      }
      g.fillStyle = now ? '#3FC495' : '#CDBFE0'; g.beginPath(); g.arc(p.x, p.y, size * (now ? .055 : .04), 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = `700 ${size * (now ? .06 : .045)}px Fredoka, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(k + 1), p.x, p.y + size * .004);
    }
  }
  // ---- 시범: 연필이 순서대로 그리고 번호를 말해줌
  async function demo() {
    const tok = ++demoTok; mode = 'demo'; active = 0; drawGuide();
    const c = cd.getContext('2d'); c.clearRect(0, 0, cd.width, cd.height);
    await talk(`Watch Jenny write ${L}!`);
    for (let k = 0; k < strokes.length; k++) {
      if (tok !== demoTok || nav !== navTok) return;
      say(NUM[k] || String(k + 1));
      const st = strokes[k];
      for (let i = 2; i <= st.length; i++) {
        if (tok !== demoTok || nav !== navTok) return;
        c.clearRect(0, 0, cd.width, cd.height);
        c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = size * .07; c.strokeStyle = '#FF6B8A';
        for (let j = 0; j < k; j++) { pathOf(c, strokes[j]); c.stroke(); }
        pathOf(c, st, i); c.stroke();
        const p = st[i - 1]; c.fillStyle = '#4B3A5E'; c.beginPath(); c.arc(p.x, p.y, size * .03, 0, Math.PI * 2); c.fill(); // 연필 끝
        await wait(28);
      }
      await wait(350);
    }
    if (tok !== demoTok || nav !== navTok) return;
    await wait(500); startTrace(); talk('Now you try! Start at the green dot.');
  }
  function startTrace() {
    demoTok++; mode = 'trace'; active = 0; finished = false;
    strokes.forEach(st => st.forEach(p => { p.hit = false; }));
    cd.getContext('2d').clearRect(0, 0, cd.width, cd.height); drawGuide();
  }
  // ---- 소문자: 글자 모양 따라 그리기 (예전 방식)
  async function setupFont() {
    const w = tw.clientWidth, h = tw.clientHeight;
    try { await document.fonts.load(`700 100px Fredoka`); } catch (e) { /* noop */ }
    if (nav !== navTok) return;
    const ch = lower ? L.toLowerCase() : L;
    const g = cg.getContext('2d');
    g.clearRect(0, 0, cg.width, cg.height);
    g.font = `700 ${h * .78 * dpr}px Fredoka, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const x = cg.width / 2, y = cg.height / 2 + h * .04 * dpr;
    g.fillStyle = '#f3ecfa'; g.fillText(ch, x, y);
    g.setLineDash([14 * dpr, 12 * dpr]); g.lineWidth = 4 * dpr; g.strokeStyle = '#cbb6e6'; g.strokeText(ch, x, y); g.setLineDash([]);
    const img = g.getImageData(0, 0, cg.width, cg.height).data;
    pts = []; const step = Math.round(16 * dpr);
    for (let yy = 0; yy < cg.height; yy += step) for (let xx = 0; xx < cg.width; xx += step) {
      const p = (yy * cg.width + xx) * 4;
      if (img[p + 3] > 100) pts.push({ x: xx, y: yy, hit: false });
    }
    covered = 0;
  }
  function setup(withDemo) {
    demoTok++; finished = false;
    const w = tw.clientWidth, h = tw.clientHeight;
    [cg, cd].forEach(c => { c.width = w * dpr; c.height = h * dpr; });
    cd.getContext('2d').clearRect(0, 0, cd.width, cd.height);
    if (strokesFor()) { layout(); if (withDemo) demo(); else { startTrace(); say(`Start at the green dot!`); } }
    else { mode = 'free'; strokes = null; setupFont(); say(`Trace the letter ${L.toLowerCase()}!`); }
  }
  const pos = (e) => { const r = cd.getBoundingClientRect(); return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr }; };
  function mark(p) {
    if (finished) return;
    if (mode === 'trace') {
      const st = strokes[active], rr = rad * rad;
      for (const q of st) if (!q.hit && (q.x - p.x) ** 2 + (q.y - p.y) ** 2 < rr) q.hit = true;
      if (st.filter(q => q.hit).length / st.length >= .75) {
        active++;
        if (active >= strokes.length) { drawGuide(); return success(); }
        tone(660 + active * 120, .12, 'sine', 0, .12); drawGuide(); say(NUM[active] || String(active + 1));
      }
      return;
    }
    if (mode !== 'free') return;
    const rr = (30 * dpr) ** 2;
    for (const q of pts) if (!q.hit && (q.x - p.x) ** 2 + (q.y - p.y) ** 2 < rr) { q.hit = true; covered++; }
    if (pts.length && covered / pts.length > .7) success();
  }
  cd.addEventListener('pointerdown', (e) => {
    if (mode === 'demo') startTrace();   // 시범 중에 손대면 바로 따라쓰기 시작
    drawing = true; last = pos(e); cd.setPointerCapture(e.pointerId); mark(last);
  });
  cd.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pos(e), c = cd.getContext('2d');
    c.strokeStyle = color; c.lineWidth = 30 * dpr; c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash([]);
    c.beginPath(); c.moveTo(last.x, last.y); c.lineTo(p.x, p.y); c.stroke();
    last = p; mark(p);
  });
  const end = () => { drawing = false; };
  cd.addEventListener('pointerup', end); cd.addEventListener('pointercancel', end);
  setup(true);
}
function showTraceMenu() {
  const learned = new Set(CURRICULUM.slice(0, S.dayIndex).filter(l => l.type === 'letter').map(l => l.key));
  render(topbar() + jennySays('Pick a letter to trace!', '따라 쓸 글자를 골라요', 120) +
    `<div class="abc-grid">${ALPHABET.map(a => `<button class="${learned.has(a.L) ? 'learned' : ''}" data-a="pick" data-l="${a.L}">${a.L}</button>`).join('')}</div>`, {
    ...baseHandlers(),
    pick: (b) => stepTrace(b.dataset.l, null, showTraceMenu),
  });
  say('Pick a letter to trace!');
}

/* ---------------- 게임 1: 그림 찾기 ---------------- */
function findGame({ targets, pool, rounds, ctx, sentence, onDone }) {
  let r = 0;
  const order = shuffle(pickWeighted(targets, Math.min(rounds, targets.length)));
  while (order.length < rounds) order.push(rand(targets));
  const extras = pool.length >= 2 ? pool : allWords().filter(x => !targets.some(t => t.e === x.e));
  const round = () => {
    if (r >= rounds) { markAct('game'); return (onDone || ctx.next)(); }
    const target = order[r++];
    const others = shuffle([...targets.filter(x => x.e !== target.e && x.w !== target.w), ...shuffle(extras).slice(0, 4)]);
    const uniq = []; for (const o of others) if (!uniq.some(u => u.e === o.e) && o.e !== target.e) uniq.push(o);
    const choices = shuffle([target, ...uniq.slice(0, 2)]);
    let firstTry = true, solved = false, wrongs = 0;
    const prompt = sentence ? target.w : `Can you find ${target.w}?`;
    render((ctx ? topbar(ctx) : topbar()) + `
      ${jennySays(prompt, sentence ? target.ko : `"${target.ko}" 그림을 찾아봐요!`, 120)}
      <div class="center"><div class="choices">${choices.map((c, i) => `<button class="card choice" data-a="pick" data-i="${i}" ${picStyle(c, 'min(15vh,130px)')}>${pic(c)}</button>`).join('')}</div>
      <div class="hint">${r} / ${rounds}</div></div>
      <div class="nav-row"><button class="round-btn speak" data-a="again">${ui('speaker')}</button></div>`, {
      ...baseHandlers(),
      again: () => talk(prompt),
      pick: async (b) => {
        if (solved) return;
        const c = choices[+b.dataset.i];
        if (c === target) {
          solved = true; b.classList.add('right'); sfx.ok(); stat(target.w, firstTry);
          if (firstTry) addStars(1, b);
          if (await talk(rand(['Yes!', 'Great!', 'You got it!', 'Super!']), sentence ? '' : target.w)) { await wait(400); if (b.isConnected) round(); }
        } else {
          firstTry = false; wrongs++; b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); sfx.soft();
          talk(sentence ? 'Hmm.' : `That's ${c.w}.`, rand(["Let's look again!", 'Where is it?', 'Almost!']));
          if (wrongs >= 2) app.querySelectorAll('.choice')[choices.indexOf(target)]?.classList.add('hint');
        }
      },
    });
    talk(prompt);
  };
  round();
}

/* ---------------- 게임 2: 짝 맞추기 ---------------- */
function memoryGame(words, ctx, onDone) {
  const uniq = []; for (const w of words) if (!uniq.some(u => u.e === w.e && !w.img)) uniq.push(w);
  while (uniq.length < 3) { const x = rand(allWords()); if (!uniq.some(u => u.e === x.e)) uniq.push(x); }
  const cards = shuffle([...uniq, ...uniq].map((x, i) => ({ x, id: i % uniq.length })));
  let open = [], matched = 0, busy = false;
  render((ctx ? topbar(ctx) : topbar()) + `
    ${jennySays('Find the same pictures!', '같은 그림 두 장을 찾아요', 120)}
    <div class="center"><div class="memory ${cards.length === 6 ? 'six' : ''}">${cards.map((c, i) => `<button class="mcard" data-a="flip" data-i="${i}"><div class="inner"><div class="face back">🐰</div><div class="face front" ${picStyle(c.x, 'min(10vh,92px)')}>${pic(c.x)}</div></div></button>`).join('')}</div></div>`, {
    ...baseHandlers(),
    flip: async (b) => {
      const i = +b.dataset.i;
      if (busy || b.classList.contains('flip')) return;
      b.classList.add('flip'); sfx.flip(); say(cards[i].x.w);
      open.push(i);
      if (open.length < 2) return;
      busy = true;
      const [a, c] = open; open = [];
      const btns = app.querySelectorAll('.mcard');
      if (cards[a].id === cards[c].id) {
        await wait(500); sfx.ok(); matched++;
        btns[a].classList.add('matched'); btns[c].classList.add('matched'); addStars(1, b);
        busy = false;
        if (matched === uniq.length) {
          const nav = navTok; confetti(30); await talk('You found them all!');
          if (nav === navTok) { markAct('game'); (onDone || ctx.next)(); }
        }
      } else {
        await wait(1100); btns[a].classList.remove('flip'); btns[c].classList.remove('flip'); busy = false;
      }
    },
  });
  say('Find the same pictures!');
}

/* ---------------- 게임 3: 풍선 터뜨리기 ---------------- */
function balloonGame(letters, ctx, onDone) {
  const target = rand(letters);
  const goal = 5; let got = 0;
  const colors = ['#ff7eb0', '#5bb8ff', '#3fcfa6', '#ff9a3c', '#a07cf5', '#ffcc33'];
  render((ctx ? topbar(ctx) : topbar()) + `
    ${jennySays(`Pop the letter ${target}!`, `${target} 풍선만 터뜨려요!`, 110)}
    <div class="hint" style="text-align:center;font-size:28px" id="bcount">${'🎈'.repeat(goal)}</div>
    <div class="balloon-field" id="field"></div>`, { ...baseHandlers() });
  say(`Pop the letter ${target}!`);
  const field = $('#field'); const nav = navTok; const bs = [];
  let lastSpawn = 0, prev = performance.now();
  const spawn = () => {
    const isT = Math.random() < .45;
    const L = isT ? target : rand(ALPHABET.filter(a => a.L !== target)).L;
    const el = document.createElement('button');
    el.className = 'balloon en'; el.textContent = Math.random() < .5 ? L : L.toLowerCase();
    el.style.background = rand(colors);
    const x = 10 + Math.random() * (field.clientWidth - 160);
    el.style.left = x + 'px';
    const b = { el, L, y: field.clientHeight + 10, v: 70 + Math.random() * 50, dead: false };
    el.style.transform = `translateY(${b.y}px)`; el.style.top = '0';
    el.onpointerdown = () => {
      if (b.dead) return; b.dead = true; el.classList.add('popped'); sfx.pop();
      setTimeout(() => el.remove(), 300);
      if (L === target) {
        got++; addStars(1, el); say(L + '!');
        $('#bcount').textContent = '⭐'.repeat(got) + '🎈'.repeat(goal - got);
        if (got >= goal) finish();
      } else say(`That's ${L}.`);
    };
    field.appendChild(el); bs.push(b);
  };
  const finish = async () => {
    confetti(30); sfx.fanfare();
    if (await talk('Hooray! You did it!')) { markAct('game'); (onDone || ctx.next)(); }
  };
  const loop = (t) => {
    if (nav !== navTok || got >= goal) return;
    const dt = Math.min(.05, (t - prev) / 1000); prev = t;
    if (t - lastSpawn > 1100) { lastSpawn = t; spawn(); }
    for (const b of bs) if (!b.dead) { b.y -= b.v * dt; b.el.style.transform = `translateY(${b.y}px)`; if (b.y < -200) { b.dead = true; b.el.remove(); } }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/* ---------------- 게임 메뉴 ---------------- */
function showGames() {
  const pool = learnedWords();
  const words = pool.length >= 3 ? pool : allWords().slice(0, 9);
  const learnedL = CURRICULUM.slice(0, S.dayIndex).filter(l => l.type === 'letter').map(l => l.key);
  const letters = learnedL.length >= 2 ? learnedL.slice(-6) : ['A', 'B', 'C'];
  const done = () => rewardScreen({ mini: true, stars: 1 });
  render(topbar() + jennySays("Let's play a game!", '어떤 게임을 할까요?', 130) + `
    <div class="center"><div class="game-tiles">
      <button class="tile" data-a="g1"><span class="emoji">🔍</span>그림 찾기<span class="en">Find It!</span></button>
      <button class="tile" data-a="g2"><span class="emoji">🃏</span>짝 맞추기<span class="en">Memory</span></button>
      <button class="tile" data-a="g3"><span class="emoji">🎈</span>풍선 터뜨리기<span class="en">Balloon Pop</span></button>
      <button class="tile" data-a="g4"><span class="emoji">🥕</span>제니 밥 주기<span class="en">Feed Jenny</span></button>
    </div></div>`, {
    ...baseHandlers(),
    g1: () => findGame({ targets: pickWeighted(words, 5), pool: words, rounds: 5, onDone: done }),
    g2: () => memoryGame(pickWeighted(words, words.length >= 8 && S.dayIndex > 20 ? 4 : 3), null, done),
    g3: () => balloonGame(letters, null, done),
    g4: () => feedJenny(words, done),
  });
  say("Let's play a game!");
}

/* ---------------- 게임 4: 제니 밥 주기 ---------------- */
function feedJenny(words, onDone) {
  const foods = [['carrot', '🥕', '당근'], ['apple', '🍎', '사과'], ['banana', '🍌', '바나나'], ['strawberry', '🍓', '딸기'], ['cookie', '🍪', '쿠키'], ['grapes', '🍇', '포도'], ['milk', '🥛', '우유'], ['cheese', '🧀', '치즈'], ['bread', '🍞', '빵'], ['watermelon', '🍉', '수박']].map(W);
  let r = 0; const rounds = 4;
  const round = () => {
    if (r >= rounds) { markAct('game'); return onDone(); }
    r++;
    const target = rand(foods);
    const choices = shuffle([target, ...shuffle(foods.filter(f => f !== target)).slice(0, 2)]);
    let solved = false, first = true;
    const prompt = `I'm hungry! ${target.w[0].toUpperCase() + target.w.slice(1)}, please!`;
    render(topbar() + `<div class="center">
      <div class="jenny-wrap"><button data-a="jenny" id="jj">${jenny(220)}</button>
        <div class="bubble"><span class="en">${esc(prompt)}</span>${S.settings.showKorean ? `<small>배고파! ${target.ko} 주세요!</small>` : ''}</div></div>
      <div class="choices">${choices.map((c, i) => `<button class="card choice" data-a="feed" data-i="${i}">${c.e}</button>`).join('')}</div></div>`, {
      ...baseHandlers(),
      jenny: () => talk(prompt),
      feed: async (b) => {
        if (solved) return;
        const c = choices[+b.dataset.i];
        if (c === target) {
          solved = true; stat(target.w, first);
          const jr = $('#jj').getBoundingClientRect(), br = b.getBoundingClientRect();
          b.animate([{ transform: 'none' }, { transform: `translate(${jr.left + jr.width / 2 - br.left - br.width / 2}px, ${jr.top + jr.height * .65 - br.top - br.height / 2}px) scale(.2)`, opacity: 0 }], { duration: 700, fill: 'forwards', easing: 'ease-in' });
          await wait(650); tone(400, .08); tone(500, .08, 'sine', .12); tone(600, .08, 'sine', .24);
          addStars(1, $('#jj'));
          if (await talk(`Yummy! ${target.w}! Thank you!`)) round();
        } else {
          first = false; b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); sfx.soft();
          talk(`No, that's ${c.w}. ${target.w}, please!`);
        }
      },
    });
    talk(prompt);
  };
  round();
}

/* ---------------- 알파벳 보드 ---------------- */
function showABC() {
  const learned = new Set(CURRICULUM.slice(0, S.dayIndex).filter(l => l.type === 'letter').map(l => l.key));
  render(topbar() + jennySays('A, B, C! Tap a letter!', '글자를 누르면 읽는 법과 단어를 알려줘요', 120) + `
    <div class="abc-grid">${ALPHABET.map(a => `<button class="${learned.has(a.L) ? 'learned' : ''}" data-a="letter" data-l="${a.L}">${a.L}${a.L.toLowerCase()}<small>${a.name}</small></button>`).join('')}</div>
    <div class="nav-row"><button class="btn" data-a="sing" style="font-size:22px;padding:16px 26px">🎵 제니랑 ABC 노래</button>
    <button class="btn" data-a="song" style="font-size:22px;padding:16px 26px;background:var(--sky)">📺 ABC 영상</button>
    <button class="btn" data-a="trace" style="font-size:22px;padding:16px 26px;background:var(--mint)">✏️ 따라쓰기</button></div>`, {
    ...baseHandlers(),
    trace: () => showTraceMenu(),
    letter: (b) => { sfx.tap(); letterDetail(b.dataset.l); },
    song: () => playVideo(vid('vD98OvvDNEs')),
    sing: () => singABC(),
  });
  say('A, B, C! Tap a letter!');
}
function letterDetail(L) {
  markAct('abc');
  const i = ALPHABET.findIndex(a => a.L === L), a = ALPHABET[i];
  const words = a.words.map(W);
  const intro = () => talk(`${a.L}.`, 300, `${a.L} says ${a.sound}, ${a.sound}.`, 300, ...words.map(w => `${a.L} is for ${w.w}.`));
  render(topbar() + `
    <div class="center">
      <button data-a="hear"><div class="big-letter" id="bl" style="font-size:min(26vh,230px)">${a.L}${a.L.toLowerCase()}</div></button>
      <div class="letter-info"><div class="chip"><span class="k">이름</span> ${a.name}</div><div class="chip"><span class="k">소리</span><span class="en">${a.ipa}</span> "${a.soundKo}"</div></div>
      <div class="word-row">${words.map((w, j) => `<button class="card mini-word" data-a="word" data-i="${j}"><div class="pic">${w.e}</div><div class="w">${highlight(w.w, a.L)}</div>${S.settings.showKorean ? `<div class="ko">${esc(w.ko)}</div>` : ''}</button>`).join('')}</div>
      <div class="nav-row">
        <button class="round-btn" data-a="prev" ${i === 0 ? 'style="visibility:hidden"' : ''}>${ui('arrowL', '#6B5E85')}</button>
        <button class="btn" data-a="trace" style="font-size:20px">✏️ 따라쓰기</button>
        <button class="btn" data-a="video" style="font-size:20px;background:var(--sky)">📺 ${a.L} 영상</button>
        <button class="btn" data-a="game" style="font-size:20px;background:var(--mint)">🎮 게임</button>
        <button class="round-btn" data-a="nextL" ${i === 25 ? 'style="visibility:hidden"' : ''}>${ui('arrowR', '#6B5E85')}</button>
      </div></div>`, {
    ...baseHandlers(),
    hear: () => { const e = $('#bl'); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); intro(); },
    word: (b) => { sfx.tap(); say(`${a.L} is for ${words[+b.dataset.i].w}.`); },
    prev: () => letterDetail(ALPHABET[i - 1].L),
    nextL: () => letterDetail(ALPHABET[i + 1].L),
    trace: () => stepTrace(L, null, () => letterDetail(L)),
    video: () => showLetterVideos(a),
    game: () => findGame({ targets: words, pool: learnedWords(), rounds: 3, onDone: () => letterDetail(L) }),
  });
  intro();
}
function showLetterVideos(a) {
  const list = [LETTER_VIDEOS[a.L], 'vD98OvvDNEs', 'kDdg2M1_EuE'].filter(Boolean).map(vid);
  render(topbar() + jennySays(`Let's watch the letter ${a.L}!`, `${a.L} 영상을 골라요 (앱 안에서 재생돼요)`, 120) +
    `<div class="video-grid">${list.map((v, i) => videoCard(v, i)).join('')}</div>
    <div class="nav-row"><button class="btn ghost" data-a="back" style="font-size:22px">⬅️ 돌아가기</button></div>`, {
    ...baseHandlers(),
    v: (b) => playVideo(list[+b.dataset.i]),
    back: () => letterDetail(a.L),
  });
}

/* ---------------- 제니랑 ABC 노래 (앱 안 연주 · 광고 없음) ----------------
   전래 동요 곡조(공공 저작물). 글자마다 음 하나 + 제니가 글자 이름 + 글자판이 통통 */
const ABC_TUNE = [['A', 'C', 1], ['B', 'C', 1], ['C', 'G', 1], ['D', 'G', 1], ['E', 'A', 1], ['F', 'A', 1], ['G', 'G', 2],
  ['H', 'F', 1], ['I', 'F', 1], ['J', 'E', 1], ['K', 'E', 1], ['L', 'D', .5], ['M', 'D', .5], ['N', 'D', .5], ['O', 'D', .5], ['P', 'C', 2],
  ['Q', 'G', 1], ['R', 'G', 1], ['S', 'F', 2], ['T', 'E', 1], ['U', 'E', 1], ['V', 'D', 2],
  ['W', 'G', 1.5], ['X', 'F', .5], ['Y', 'E', 1], ['Z', 'D', 2]];
const NOTE_HZ = { C: 261.6, D: 293.7, E: 329.6, F: 349.2, G: 392, A: 440 };
function singABC() {
  let playing = false, slow = false;
  render(topbar() + jennySays("Let's sing the ABC song!", '▶️를 누르면 제니가 불러요 · 글자를 누르면 읽어줘요', 110) + `
    <div class="abc-sing">${ABC_TUNE.map(([L], k) => `<button class="sing-l" data-a="tap" data-k="${k}" id="sl${k}">${L}<small>${L.toLowerCase()}</small></button>`).join('')}</div>
    <div class="nav-row"><button class="round-btn primary" data-a="play" id="playBtn" aria-label="부르기">${ui('play')}</button>
      <button class="round-btn" data-a="slow" id="slowBtn" aria-label="천천히">🐢</button></div>`, {
    ...baseHandlers(),
    play: () => sing(),
    slow: (b) => { slow = !slow; b.classList.toggle('primary', slow); },
    tap: (b) => { const [L, n] = ABC_TUNE[+b.dataset.k]; tone(NOTE_HZ[n], .3, 'triangle', 0, .14); say(L + '.'); bounce(+b.dataset.k); },
  });
  const bounce = (k) => { const el = $('#sl' + k); if (el) el.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-14px) scale(1.18)' }, { transform: 'translateY(0) scale(1)' }], { duration: 380 }); };
  const mark = (k) => app.querySelectorAll('.sing-l').forEach((el, i) => el.classList.toggle('on', i === k));
  async function sing() {
    if (playing) return; playing = true;
    const nav = navTok, beat = slow ? .85 : .6;
    $('#playBtn').classList.add('busy');
    if (!(await talk("Let's sing!"))) return;
    for (let k = 0; k < ABC_TUNE.length; k++) {
      if (nav !== navTok) return;
      const [L, n, d] = ABC_TUNE[k];
      mark(k); bounce(k);
      tone(NOTE_HZ[n], d * beat * .95, 'triangle', 0, .13); tone(NOTE_HZ[n] / 2, d * beat * .9, 'sine', 0, .05);
      say(L + '.', { rate: slow ? 1 : 1.25 });
      await wait(d * beat * 1000);
    }
    mark(-1);
    if (!(await talk(300, 'Now I know my A B C!', 'Next time, sing with me!'))) return;
    sfx.fanfare(); confetti(30); markAct('song'); markAct('abc'); addStars(1, $('#playBtn'));
    playing = false; const pb = $('#playBtn'); if (pb) pb.classList.remove('busy');
  }
  say("Let's sing the ABC song!");
}

/* ---------------- 우리 단어 / 복습 ---------------- */
/* ---------------- 단어 공부: 단어 묶음 고르기 → 카드 / 그림 찾기 / 짝 맞추기 ---------------- */
function wordPacks() {
  const packs = [];
  if (S.customWords.length) packs.push({ id: 'my', icon: '💝', en: 'My Words', ko: '우리 단어', words: S.customWords.map(x => ({ ...x, custom: true })) });
  const weak = Object.entries(S.wordStats).filter(([, v]) => v.s >= 2 && v.c / v.s < .7).map(([w]) => w);
  const weakWords = allWords().concat(S.customWords).filter(x => weak.includes(x.w));
  if (weakWords.length >= 3) packs.push({ id: 'weak', icon: '💪', en: 'Practice', ko: '연습이 필요한 단어', words: weakWords });
  const storyW = []; heardStories().forEach(b => storyWords(b).forEach(x => { if (!storyW.some(y => y.e === x.e)) storyW.push(x); }));
  if (storyW.length >= 3) packs.push({ id: 'story', icon: '📚', en: 'Story Words', ko: '들은 이야기 단어', words: storyW });
  for (const [k, t] of Object.entries(THEMES)) packs.push({ id: 't:' + k, icon: t.icon, en: t.title, ko: t.ko, words: t.words.map(W) });
  return packs;
}
function startMyWords() {
  const packs = wordPacks();
  render(topbar() + jennySays("Let's learn words!", '공부하고 싶은 단어 묶음을 골라요', 120) + `
    <div class="book-grid">${packs.map((p, i) => `<button class="book pack" data-a="pack" data-i="${i}">
      <span class="cover" style="font-size:64px">${p.icon}</span><span class="bt en">${esc(p.en)}</span><span class="bk">${esc(p.ko)}</span>
      <span class="read">${p.words.slice(0, 4).map(w => w.img ? '🖼️' : w.e).join(' ')} · ${p.words.length}개</span></button>`).join('')}
      <button class="book pack" data-a="add"><span class="cover" style="font-size:64px">➕</span><span class="bt en">Add Words</span><span class="bk">부모님: 우리 단어 넣기</span></button></div>`, {
    ...baseHandlers(),
    pack: (b) => { sfx.tap(); showPack(packs[+b.dataset.i]); },
    add: () => parentGate(showParent),
  });
  say("Let's learn words!");
}
function showPack(p) {
  const words = p.words;
  const back = () => showPack(p);
  const done = () => { markAct('mywords'); rewardScreen({ mini: true, stars: 2 }); };
  render(topbar() + jennySays(p.en, `${p.ko} · ${words.length}개`, 110) + `
    <div class="word-row" style="justify-content:center">${words.slice(0, 12).map((w, i) => `<button class="card mini-word" data-a="say" data-i="${i}"><div class="pic">${pic(w)}</div><div class="w">${esc(w.w)}</div>${S.settings.showKorean && w.ko ? `<div class="ko">${esc(w.ko)}</div>` : ''}</button>`).join('')}</div>
    <div class="nav-row" style="flex-wrap:wrap">
      <button class="btn" data-a="cards" style="font-size:22px;padding:16px 24px">📇 카드 보기</button>
      <button class="btn" data-a="find" style="font-size:22px;padding:16px 24px;background:var(--sky)" ${words.length < 2 ? 'disabled' : ''}>🔍 그림 찾기</button>
      <button class="btn" data-a="memory" style="font-size:22px;padding:16px 24px;background:var(--mint)">🃏 짝 맞추기</button>
      <button class="btn ghost" data-a="list" style="font-size:22px;padding:16px 24px">⬅️ 단어 묶음</button>
    </div>`, {
    ...baseHandlers(),
    say: (b) => { const w = words[+b.dataset.i]; sfx.tap(); say(w.w); b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 300 }); },
    cards: () => runSteps([ctx => stepWords(pickWeighted(words, Math.min(8, words.length)), ctx)], done),
    find: () => findGame({ targets: pickWeighted(words, Math.min(5, words.length)), pool: learnedWords().concat(allWords()), rounds: Math.min(5, Math.max(3, words.length)), onDone: done }),
    memory: () => memoryGame(pickWeighted(words, Math.min(words.length >= 8 ? 4 : 3, words.length)), null, done),
    list: startMyWords,
  });
}
// 복습: 무엇을 복습하는지 먼저 보여주고 고르기
let reviewMode = 'mix', reviewSeed = 0;
function everyWord() {   // 주제 단어 + 알파벳 단어 + 그림책 속 단어 (그림 중복 제거)
  const m = new Map();
  for (const w of allWords()) m.set(w.w, w);
  for (const b of STORIES) for (const w of storyWords(b)) if (!m.has(w.w) && w.w.length > 2) m.set(w.w, w);
  return [...m.values()];
}
function reviewWords(mode) {
  const learned = learnedWords();
  const recentDays = CURRICULUM.slice(Math.max(0, S.dayIndex - 3), S.dayIndex).filter(l => l.type !== 'sentence');
  const recent = [...new Map(recentDays.flatMap(lessonWords).map(w => [w.w, w])).values()];
  const weak = [...new Map(learned.concat(everyWord()).map(w => [w.w, w])).values()].filter(x => { const st = S.wordStats[x.w]; return st && st.s >= 2 && st.c / st.s < .7; });
  const fresh = everyWord().filter(x => !learned.some(l => l.w === x.w));
  const pools = { recent, weak, mix: learned.length >= 12 ? learned : learned.concat(pickWeighted(fresh, 12 - learned.length + 4)), fresh };
  let pool = pools[mode];
  if (!pool || pool.length < 4) pool = pools.mix.length >= 4 ? pools.mix : everyWord();
  const uniq = []; for (const w of shuffle(pool)) if (!uniq.some(u => u.e === w.e && !w.img)) uniq.push(w);
  return { words: pickWeighted(uniq, Math.min(8, uniq.length)), counts: { recent: recent.length, weak: weak.length, learned: learned.length, fresh: fresh.length } };
}
function startReview() {
  const { words, counts } = reviewWords(reviewMode);
  const MODES = [['recent', '🕘', '최근 배운 단어', counts.recent], ['weak', '💪', '어려웠던 단어', counts.weak], ['mix', '🌈', '골고루 섞기', counts.learned], ['fresh', '🆕', '새 단어 미리 만나기', counts.fresh]];
  render(topbar() + jennySays("Let's review!", `오늘 복습할 단어 ${words.length}개예요 · 배운 단어 ${counts.learned}개`, 100) + `
    <div class="cat-tabs">${MODES.map(([id, ic, ko, n]) => `<button class="cat-tab ${reviewMode === id ? 'on' : ''}" data-a="mode" data-m="${id}" ${n || id === 'mix' ? '' : 'disabled'}>${ic} ${ko}<small>${n}</small></button>`).join('')}</div>
    <div class="word-row review-preview">${words.map((w, i) => `<button class="card mini-word" data-a="say" data-i="${i}"><div class="pic">${pic(w)}</div><div class="w">${esc(w.w)}</div>${S.settings.showKorean && w.ko ? `<div class="ko">${esc(w.ko)}</div>` : ''}</button>`).join('')}</div>
    <div class="nav-row"><button class="btn ghost" data-a="shuffle" style="font-size:20px;padding:14px 22px">🔀 다른 단어</button>
      <button class="btn" data-a="go" style="font-size:24px;padding:16px 34px">▶️ 복습 시작</button></div>`, {
    ...baseHandlers(),
    mode: (b) => { reviewMode = b.dataset.m; sfx.tap(); startReview(); },
    shuffle: () => { sfx.flip(); startReview(); },
    say: (b) => { const w = words[+b.dataset.i]; sfx.tap(); say(w.w); },
    go: () => runSteps([
      ctx => stepWords(words, ctx),
      ctx => findGame({ targets: words, pool: everyWord(), rounds: Math.min(5, words.length), ctx }),
      ctx => memoryGame(words.slice(0, words.length >= 8 ? 4 : 3), ctx),
    ], () => { markAct('review'); rewardScreen({ mini: true, stars: 3 }); }),
  });
  say("Let's review!");
}

/* ---------------- 보상 + 동화/영상 추천 ---------------- */
function rewardScreen({ lesson, sticker, stars, mini }) {
  let st = null;
  if (sticker) {
    const locked = STICKERS.filter(s => !S.stickers.includes(s));
    st = locked.length ? rand(locked) : rand(STICKERS);
    if (!S.stickers.includes(st)) S.stickers.push(st);
  }
  save();
  const recs = recommend(lesson);
  const book = recommendedBook();
  render(topbar() + `<div class="center">
      ${st ? `<div class="sticker-big">${st}</div><div class="hint" style="font-size:26px">새 스티커를 받았어요!</div>` : jenny(180, 'jenny-hop')}
      <div class="reward-stars">${'⭐'.repeat(Math.min(stars, 5))}</div>
      <h1 class="title"><span class="en">Great job, ${esc(childNameEn())}!</span>${esc(childName())}, 정말 잘했어요!</h1>
      ${mini ? '' : `<button class="big-btn" data-a="book" style="max-width:760px"><span class="emoji">${book.cover}</span><span><div class="t1">Story time · 제니 그림책</div><div class="t2">${esc(book.ko)}</div><div class="t1">${esc(book.title)}</div></span><span class="go">📖</span></button>`}
      ${mini ? '' : `<h2 class="section-title">📺 오늘 배운 것과 어울리는 영상</h2>
      <div class="video-grid" style="width:100%">${recs.map((v, i) => videoCard(v, i)).join('')}</div>`}
      <div class="nav-row"><button class="btn" data-a="home" style="font-size:24px;padding:18px 30px">🏠 홈으로</button>
      ${mini ? '' : '<button class="btn" data-a="more" style="font-size:24px;padding:18px 30px;background:var(--sky)">📺 영상 더 보기</button>'}</div>
    </div>`, {
    ...baseHandlers(),
    v: (b) => playVideo(recs[+b.dataset.i]),
    more: () => showVideos('stories'),
    book: () => readBook(book),
  });
  addStars(stars);
  sfx.fanfare(); confetti(50);
  talk(`Great job, ${childNameEn()}! You did it!`, ...(st ? [400, 'Here is a sticker for you!'] : []), ...(mini ? [] : [400, "Now, it's story time!"]));
}
// 영상 한 편 정보 (공식 채널 영상 라이브러리 VIDEO_LIB)
function vid(id) { const v = VIDEO_LIB[id] || [id, '', 'song']; return { yt: id, t: v[0], ko: v[1], kind: v[2], len: v[3] || '' }; }
function lessonVideos(l) {
  if (!l) return [];
  if (l.type === 'letter') return [LETTER_VIDEOS[l.key]];
  if (l.type === 'review') return l.letters.map(L => LETTER_VIDEOS[L]);
  if (l.type === 'relisten') return l.stories.flatMap(k => LESSON_VIDEOS[k] || []);
  if (l.type === 'sentence') return LESSON_VIDEOS['s:' + l.key] || [];
  return LESSON_VIDEOS[l.key] || [];
}
const favVideos = () => S.favVideos.map(f => ({ yt: f.yt, t: f.title, ko: f.author ? '부모님 추천 · ' + f.author : '부모님 추천', kind: f.cat === 'song' ? 'song' : 'peppa', fav: true }));
// 수업 끝 추천: 오늘 수업 영상 → 부모님 추천 → 지금까지 배운 수업의 영상
function recommend(lesson) {
  const today = [...new Set(lessonVideos(lesson))];
  const learned = shuffle([...new Set(CURRICULUM.slice(0, S.dayIndex).flatMap(lessonVideos))].filter(i => !today.includes(i)));
  return [...today.map(vid), ...shuffle(favVideos()).slice(0, 2), ...learned.map(vid)].slice(0, 6);
}
function videoCard(v, i) {
  const KB = { peppa: '페파피그', bluey: '블루이', duggee: '헤이 더기', numberblocks: '넘버블럭스', alphablocks: '알파블럭스', cocomelon: '코코멜론', pinkfong: '핑크퐁', storytime: '그림책' };
  const badge = v.fav ? '<b class="vbadge">부모님 추천</b>' : KB[v.kind] ? `<b class="vbadge k-${v.kind}">${KB[v.kind]}</b>` : '';
  const len = v.len ? `<b class="vlen">${esc(v.len)}</b>` : '';
  return `<button class="video-card" data-a="v" data-i="${i}"><span class="thumb"><img src="https://i.ytimg.com/vi/${encodeURIComponent(v.yt)}/mqdefault.jpg" alt="" loading="lazy">
    <i>${ui('play', '#fff', 30)}</i>${badge}${len}</span><span class="vt"><span class="t">${esc(v.t)}</span><span class="k">${esc(v.ko)}</span></span></button>`;
}
function ytId(u) { const m = String(u).match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : null; }
// 앱 안 플레이어: 끝나면 자동으로 닫히고 제니에게 돌아옴
let ytApi = null;
function loadYTApi() {
  if (ytApi) return ytApi;
  ytApi = new Promise(res => {
    if (window.YT && window.YT.Player) return res();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(); };
    const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; sc.onerror = () => res();
    document.head.appendChild(sc); setTimeout(res, 5000);
  });
  return ytApi;
}
const ytHost = () => S.settings.ytPremium ? 'https://www.youtube.com' : 'https://www.youtube-nocookie.com';
async function playVideo(v) {
  markAct(v.kind === 'peppa' ? 'story' : 'song'); stopSpeech();
  const p = document.createElement('div');
  p.className = 'player';
  p.innerHTML = `<div class="topbar"><button class="icon-btn" aria-label="닫기">${ui('arrowL', '#6B5E85', 34)}</button><div class="pill ptitle">${esc(v.t)}</div>${S.settings.ytPremium ? `<a class="btn yt-app" href="https://www.youtube.com/watch?v=${encodeURIComponent(v.yt)}" target="_blank" rel="noopener">▶ 유튜브 앱에서 보기</a>` : ''}</div>
    <div class="ad-hint">${S.settings.ytPremium ? "프리미엄 광고 없음은 유튜브에 로그인된 곳에서만 돼요. 광고가 나오면 '유튜브 앱에서 보기'를 누르세요." : "광고가 나오면 몇 초 뒤 '건너뛰기'를 누르세요. 안 넘어가면 ⬅️로 나와요."}</div><div class="frame"><div id="ytp"></div></div>`;
  let player = null, watch = null, stuckFor = 0;
  const close = (ended) => { if (!p.isConnected) return; clearInterval(watch); p.remove(); if (ended) { sfx.ok(); say(rand(['Did you like it?', 'That was fun!', 'Yay! Great song!'])); } };
  p.querySelector('button').onclick = () => close(false);
  document.body.appendChild(p);
  await loadYTApi();
  if (!p.isConnected) return;
  if (window.YT && window.YT.Player) {
    // "▶ 다시 재생": 광고 뒤나 자동재생 제한으로 멈춰 있으면 크게 띄워서 아이가 눌러 이어 보기
    const resume = document.createElement('button');
    resume.className = 'resume-btn'; resume.hidden = true; resume.innerHTML = `${ui('play', '#fff', 56)}<span>다시 재생</span>`;
    resume.onclick = () => { resume.hidden = true; stuckFor = -3; try { player.playVideo(); } catch (e) { /* noop */ } };
    p.querySelector('.frame').appendChild(resume);
    // 진짜 끝났을 때만 닫기: 광고가 끝날 때도 '끝남' 신호가 올 수 있어서 본 영상 재생 위치로 확인
    const reallyEnded = () => {
      try { const d = player.getDuration(), t = player.getCurrentTime(); return d > 5 && t >= d - 2; } catch (e) { return false; }
    };
    player = new window.YT.Player('ytp', { videoId: v.yt, host: ytHost(),
      playerVars: { rel: 0, playsinline: 1, modestbranding: 1, autoplay: 1 },
      events: { onStateChange: (e) => {
        if (e.data === 1) { resume.hidden = true; stuckFor = 0; }
        if (e.data === 0) setTimeout(() => { if (reallyEnded()) close(true); else { resume.hidden = false; } }, 600);
      } } });
    // 멈춤 감시: 상태와 상관없이 재생 위치가 5초 넘게 그대로면(광고 뒤 멈춤·버퍼링·일시정지) 다시 재생 버튼
    let lastT = -1;
    watch = setInterval(() => {
      if (!p.isConnected) return clearInterval(watch);
      let st = null, t = 0; try { st = player.getPlayerState(); t = player.getCurrentTime() || 0; } catch (e) { return; }
      if (st === 0) return;
      stuckFor = (t === lastT) ? stuckFor + 1 : 0; lastT = t;
      if (stuckFor >= 5) resume.hidden = false;
    }, 1000);
  } else {
    p.querySelector('#ytp').outerHTML = `<iframe src="${ytHost()}/embed/${encodeURIComponent(v.yt)}?rel=0&playsinline=1&autoplay=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
  }
}
// 영상 화면: 채널 탭 (전체 = 부모님 추천 → 오늘의 영상 → 채널별)
let videoTab = 'all';
function showVideos(cat) {
  const cur = lessonAt(S.lastLessonIdx ?? S.dayIndex);
  const todays = [...new Set(lessonVideos(cur))].map(vid);
  const all = Object.keys(VIDEO_LIB).map(vid);
  const favs = favVideos();
  const inTab = (t) => t[0] === 'fav' ? favs : all.filter(v => t[3].includes(v.kind));
  const tabs = VIDEO_TABS.filter(t => t[0] === 'all' || inTab(t).length);
  if (!tabs.some(t => t[0] === videoTab)) videoTab = 'all';
  const list = []; let html = '';
  const section = (title, vs) => { if (!vs.length) return; html += `${title ? `<h2 class="section-title">${title}</h2>` : ''}<div class="video-grid">${vs.map(v => { list.push(v); return videoCard(v, list.length - 1); }).join('')}</div>`; };
  if (videoTab === 'all') {
    section('💝 부모님 추천', favs);
    section('⭐ 오늘의 영상', todays);
    for (const t of VIDEO_TABS.slice(2)) section(`${t[1]} ${t[2]}`, inTab(t).slice(0, 6));
  } else section('', inTab(tabs.find(t => t[0] === videoTab)));
  const tabHtml = `<div class="cat-tabs">${tabs.map(t => `<button class="cat-tab ${videoTab === t[0] ? 'on' : ''}" data-a="tab" data-t="${t[0]}">${t[1]} ${t[2]}${t[0] === 'all' ? '' : `<small>${inTab(t).length}</small>`}</button>`).join('')}</div>`;
  const own = `<div class="nav-row"><button class="btn" data-a="sing" style="font-size:20px;padding:14px 24px">🐰 제니랑 ABC 노래 (광고 없음)</button></div>`;
  const t = cat === 'songs' ? ['Sing along!', '그림을 누르면 바로 나와요'] : ["It's video time!", '그림을 누르면 바로 나와요'];
  render(topbar() + jennySays(t[0], `${t[1]} · 영상 ${all.length + favs.length}편`, 100) + tabHtml + own + html, {
    ...baseHandlers(),
    tab: (b) => { videoTab = b.dataset.t; sfx.tap(); showVideos(cat); },
    v: (b) => playVideo(list[+b.dataset.i]),
    sing: () => singABC(),
  });
  say(t[0]);
}

/* ---------------- 제니 그림책 (듣기 중심, 부담 없이) ---------------- */
function heardStories() {
  return CURRICULUM.slice(0, S.dayIndex).filter(l => l.type === 'story').map(l => bookById(l.key));
}
function recommendedBook() {
  const heard = heardStories();
  const next = CURRICULUM.slice(S.dayIndex).find(l => l.type === 'story');
  const pool = heard.length ? heard : [next ? bookById(next.key) : STORIES[0]];
  return pool.find(b => !S.booksRead[b.id]) || [...pool].sort((a, b) => (S.booksRead[a.id] || 0) - (S.booksRead[b.id] || 0))[0];
}
// 그림책·듣기 시간 공통: 주제 탭 (마지막으로 고른 탭 기억)
let storyCat = 'all';
const storiesIn = (cat) => cat === 'all' ? STORIES : STORIES.filter(b => STORY_CAT_OF[b.id] === cat);
function catTabs() {
  return `<div class="cat-tabs">${STORY_CATS.map(([id, ic, ko]) => `<button class="cat-tab ${storyCat === id ? 'on' : ''}" data-a="cat" data-c="${id}">${ic} ${ko}<small>${storiesIn(id).length}</small></button>`).join('')}</div>`;
}
function showLibrary() {
  const rec = recommendedBook();
  const list = storiesIn(storyCat);
  render(topbar() + jennySays("Let's read a book!", `그림책 ${STORIES.length}권! 표지를 눌러요`, 110) + catTabs() + `
    <div class="book-grid">${list.map((b, i) => `<button class="book" data-a="open" data-i="${i}">
      ${b.id === rec.id ? '<span class="badge">추천!</span>' : ''}
      <span class="cover">${b.cover}</span><span class="bt en">${esc(b.title)}</span><span class="bk">${esc(b.ko)}</span>
      <span class="read">${S.booksRead[b.id] ? '⭐'.repeat(Math.min(3, S.booksRead[b.id])) : '새 책 ✨'}</span></button>`).join('')}</div>`, {
    ...baseHandlers(),
    cat: (b) => { storyCat = b.dataset.c; sfx.tap(); showLibrary(); },
    open: (b) => { sfx.page(); readBook(list[+b.dataset.i]); },
  });
  say("Let's read a book!");
}
function readBook(book, opt = {}) {
  let i = opt.onEnd ? 0 : -1, auto = !!opt.auto, slow = false;
  const pages = book.p;
  const show = () => {
    if (i < 0) return cover();
    if (i >= pages.length) return theEnd();
    const [text, ko, items] = pages[i];
    const words = text.split(/\s+/);
    const starts = []; let pos = 0;
    words.forEach(w => { const k = text.indexOf(w, pos); starts.push(k); pos = k + w.length; });
    const size = ['', 'min(30vh,240px)', 'min(24vh,190px)', 'min(19vh,150px)', 'min(14vh,118px)', 'min(12vh,100px)'][Math.min(items.length, 5)];
    render(topbar(opt.ctx || { idx: i + 1, total: pages.length }) + `
      ${opt.label ? `<div class="hint" style="text-align:center;font-size:22px">${opt.label}</div>` : ''}
      <div class="center">
        <div class="story-card">
          <div class="scene">${items.map((it, j) => `<button class="scene-item" data-a="item" data-j="${j}" style="font-size:${size};animation-delay:${j * .15}s">${it[0]}</button>`).join('')}</div>
          <div class="story-text en" id="st">${words.map((w, k) => `<button class="sw" data-a="word" data-k="${k}">${esc(w)}</button>`).join(' ')}</div>
          ${S.settings.showKorean ? `<div class="story-ko">${esc(ko)}</div>` : ''}
        </div>
        <div class="hint">그림과 단어를 누르면 읽어줘요</div>
      </div>
      <div class="nav-row">
        <button class="round-btn" data-a="prev" ${i === 0 ? 'style="visibility:hidden"' : ''}>${ui('arrowL', '#6B5E85')}</button>
        <button class="round-btn speak" data-a="read">${ui('speaker')}</button>
        <button class="round-btn ${slow ? 'primary' : ''}" data-a="slow" aria-label="천천히">🐢</button>
        <button class="round-btn ${auto ? 'primary' : ''}" data-a="auto" aria-label="자동 넘김">🎧</button>
        <button class="round-btn primary" data-a="next" id="pgNext">${ui('arrowR')}</button>
      </div>`, {
      ...baseHandlers(),
      item: (b) => { const it = items[+b.dataset.j]; b.classList.remove('boing'); void b.offsetWidth; b.classList.add('boing'); sfx.tap(); say(it[1]); },
      word: (b) => { const w = words[+b.dataset.k].replace(/[^A-Za-z'-]/g, ''); mark(+b.dataset.k); say(w).then(() => mark(-1)); },
      read: () => readPage(),
      slow: () => { slow = !slow; show(); },
      auto: () => { auto = !auto; show(); },
      prev: () => { i--; sfx.page(); show(); },
      next: () => { i++; sfx.page(); show(); },
    });
    const mark = (k) => app.querySelectorAll('.sw').forEach((el, n) => el.classList.toggle('on', n === k));
    async function readPage() {
      const st = $('#st'); let got = false;
      st.classList.add('reading');
      const nav = navTok;
      await say(text, { rate: slow ? .75 : 1, onBoundary: (ci) => { got = true; st.classList.remove('reading'); let k = 0; while (k + 1 < starts.length && starts[k + 1] <= ci) k++; mark(k); } });
      if (nav !== navTok) return;
      st.classList.remove('reading'); mark(-1);
      if (auto) { await wait(1300); if (nav === navTok) { i++; sfx.page(); show(); } }
      else pulse('#pgNext');
    }
    setTimeout(() => { if (app.contains($('#st'))) readPage(); }, 350);
  };
  const cover = () => {
    render(topbar() + `<div class="center">
      <div class="book big"><span class="cover" style="font-size:min(30vh,260px)">${book.cover}</span>
        <span class="bt en" style="font-size:52px">${esc(book.title)}</span><span class="bk" style="font-size:28px">${esc(book.ko)}</span></div>
      <div class="hint">반복 표현: <span class="en">${esc(book.pattern)}</span></div>
      <div class="nav-row">
        <button class="btn" data-a="together" style="font-size:24px;padding:18px 28px">📖 같이 읽기</button>
        <button class="btn" data-a="listen" style="font-size:24px;padding:18px 28px;background:var(--sky)">🎧 들려주기 (자동)</button>
      </div></div>`, {
      ...baseHandlers(),
      together: () => { auto = false; i = 0; sfx.page(); show(); },
      listen: () => { auto = true; i = 0; sfx.page(); show(); },
    });
    talk(book.title + '.');
  };
  const theEnd = () => {
    if (opt.onEnd) {  // 수업·듣기 시간: 끝 화면 없이 다음으로
      S.booksRead[book.id] = (S.booksRead[book.id] || 0) + 1; markAct('listen'); save();
      render(topbar(opt.ctx) + `<div class="center">${jenny(200, 'jenny-hop')}<h1 class="title"><span class="en">The End!</span>끝! 재미있었지?</h1></div>
        <div class="nav-row"><button class="round-btn" data-a="again" aria-label="다시 듣기">${ui('replay', '#6B5E85')}</button><button class="round-btn primary" data-a="go" id="goNext">${ui('arrowR')}</button></div>`,
        { ...baseHandlers(), go: () => opt.onEnd(), again: () => { i = 0; show(); } });
      sfx.ok(); talk('The end!').then(ok => { if (ok && auto) opt.onEnd(); else pulse('#goNext'); });
      return;
    }
    const first = !S.booksRead[book.id];
    S.booksRead[book.id] = (S.booksRead[book.id] || 0) + 1;
    let st = null;
    if (first) { const locked = STICKERS.filter(x => !S.stickers.includes(x)); if (locked.length) { st = rand(locked); S.stickers.push(st); } }
    markAct('book'); save();
    render(topbar() + `<div class="center">
      ${st ? `<div class="sticker-big">${st}</div>` : jenny(200, 'jenny-hop')}
      <h1 class="title"><span class="en">The End!</span>끝! 재미있었지?</h1>
      <div class="reward-stars">⭐⭐</div>
      <div class="nav-row">
        <button class="btn" data-a="again" style="font-size:22px;padding:16px 24px">🔁 다시 읽기</button>
        <button class="btn" data-a="lib" style="font-size:22px;padding:16px 24px;background:var(--mint)">📚 다른 책</button>
        <button class="btn" data-a="home" style="font-size:22px;padding:16px 24px;background:var(--sky)">🏠 홈으로</button>
      </div></div>`, {
      ...baseHandlers(),
      again: () => { i = 0; show(); },
      lib: showLibrary,
    });
    addStars(2); sfx.fanfare(); confetti(40);
    talk('The end!', 300, `Great listening, ${childNameEn()}!`, ...(st ? [300, 'Here is a sticker for you!'] : []));
  };
  show();
}

/* ---------------- 듣기 시간 (흘려듣기 플레이리스트) ---------------- */
function showListening() {
  const heard = heardStories();
  const heardIds = new Set(heard.map(b => b.id));
  // 커리큘럼 순서대로 모든 이야기 (아직 안 들은 이야기도 골라서 들을 수 있어요 — 듣기는 많을수록 좋아요)
  const all = [...new Set([...CURRICULUM.filter(l => l.type === 'story').map(l => bookById(l.key)), ...STORIES])].filter(b => storyCat === 'all' || STORY_CAT_OF[b.id] === storyCat);
  const list = [...shuffle(heard.filter(b => all.includes(b))), ...all.filter(b => !heardIds.has(b.id))].slice(0, 5);
  const playOne = (b, onEnd, label) => readBook(b, { auto: S.settings.autoNext, onEnd, label });
  render(topbar() + jennySays("It's listening time!", `이야기 ${STORIES.length}개! 그림을 누르면 들려줘요`, 110) + catTabs() + `
    <div class="nav-row"><button class="btn" data-a="play" style="font-size:24px;padding:16px 30px">🎧 이어서 듣기 (${list.length}개)</button></div>
    <div class="book-grid">${all.map((b, i) => `<button class="book" data-a="one" data-i="${i}">${heardIds.has(b.id) ? '<span class="badge ok">들었어요</span>' : ''}
      <span class="cover">${b.cover}</span><span class="bt en">${esc(b.title)}</span><span class="bk">${esc(b.ko)}</span>
      <span class="read">${S.booksRead[b.id] ? '⭐'.repeat(Math.min(3, S.booksRead[b.id])) : ''}</span></button>`).join('')}</div>`, {
    ...baseHandlers(),
    cat: (b) => { storyCat = b.dataset.c; sfx.tap(); showListening(); },
    one: (b) => { sfx.page(); markAct('listen'); playOne(all[+b.dataset.i], showListening, '🎧'); },
    play: () => {
      let n = 0;
      const nextBook = () => {
        if (n >= list.length) return rewardScreen({ mini: true, stars: 2 });
        const b = list[n++];
        playOne(b, nextBook, `🎧 ${n} / ${list.length}`);
      };
      markAct('listen'); nextBook();
    },
  });
  say("It's listening time!");
}

/* ---------------- 따라 말하기 (녹음은 선택, 채점 없음) ---------------- */
const canRecord = () => S.settings.useMic && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
async function recordClip(ms) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream); const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise(r => { rec.onstop = r; });
  rec.start(); await wait(ms); rec.stop(); await stopped;
  stream.getTracks().forEach(t => t.stop());   // 마이크를 바로 꺼서 스피커 음량 복원
  return URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/mp4' }));
}
function sayItStep(x, ctx, onDone, title = 'Say it with Jenny!') {
  const done = onDone || ctx.next;
  let busy = false;
  render((ctx ? topbar(ctx) : topbar()) + `
    ${jennySays(title, '제니를 따라 말해볼까? 안 해도 괜찮아요', 120)}
    <div class="center">
      <button class="card word-card sentence-card" data-a="hear"><div class="pic" ${picStyle(x, 'min(22vh,190px)')}>${pic(x)}</div>
        <div class="w">${esc(x.w)}</div>${S.settings.showKorean && x.ko ? `<div class="ko">${esc(x.ko)}</div>` : ''}</button>
      <div class="hint" id="micHint">${canRecord() ? '🎤를 누르고 말하면 내 목소리를 들려줘요' : ''}</div>
    </div>
    <div class="nav-row">
      <button class="round-btn speak" data-a="hear">${ui('speaker')}</button>
      ${canRecord() ? `<button class="round-btn mic" data-a="mic" id="micBtn">${ui('mic')}</button>` : ''}
      <button class="round-btn primary" data-a="next">${ui('arrowR')}</button>
    </div>`, {
    ...baseHandlers(),
    hear: () => talk([x.w, { rate: .85 }]),
    next: () => done(),
    mic: async () => {
      if (busy) return; busy = true;
      const btn = $('#micBtn'), hint = $('#micHint'); const nav = navTok;
      stopSpeech();
      try {
        btn.classList.add('recording'); hint.textContent = '듣고 있어요… 말해보세요!';
        const url = await recordClip(3200);
        if (nav !== navTok) return;
        btn.classList.remove('recording'); hint.textContent = '내 목소리 듣는 중 👂';
        const a = new Audio(url); await a.play().catch(() => {});
        await new Promise(r => { a.onended = r; setTimeout(r, 4500); });
        if (nav !== navTok) return;
        sfx.ok(); addStars(1, btn); confetti(15);
        hint.textContent = '멋지게 말했어요! ⭐';
        await talk(rand(['Wonderful!', 'Great talking!', 'I love your voice!', 'Wow, you said it!']));
      } catch (e) {
        hint.textContent = '마이크를 쓸 수 없어요. 그냥 소리 내어 따라 해도 좋아요!';
        btn.classList.remove('recording');
      }
      busy = false;
    },
  });
  talk([x.w, { rate: .85 }], 500, [x.w, { rate: .85 }], 300, 'Your turn!');
}

// 다음 버튼을 살짝 반짝여서 "눌러서 넘어가요"를 알려줌
function pulse(sel) { const n = $(sel); if (n) n.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 750, iterations: 3 }); }
// 제니가 대답한 뒤: 자동 넘김이 꺼져 있으면 ➡️ 버튼이 나타나고 아이가 눌러야 다음으로
function waitThen(cont) {
  if (S.settings.autoNext) return cont();
  const g = $('#goNext'); if (!g) return cont();
  g.style.visibility = 'visible'; g.onclick = () => { sfx.tap(); cont(); }; pulse('#goNext');
}
/* ---------------- 제니와 대화하기 (말하기 마을) ---------------- */
function showTalkMenu() {
  const keys = Object.keys(TALKS);
  const meta = (k) => SENTENCES[k] || TALKS[k];
  render(topbar() + jennySays("Let's talk!", `대화 ${keys.length}가지! 제니가 물어보면 그림을 눌러 대답해요`, 120) + `
    <div class="book-grid">${keys.map(k => `<button class="book" data-a="t" data-k="${k}">${SENTENCES[k] ? '' : '<span class="badge ok">NEW</span>'}<span class="cover" style="font-size:72px">${meta(k).icon}</span>
      <span class="bt en">${esc(meta(k).title)}</span><span class="bk">${esc(meta(k).ko)}</span></button>`).join('')}</div>`, {
    ...baseHandlers(),
    t: (b) => talkGame(b.dataset.k, null, () => { markAct('talk'); rewardScreen({ mini: true, stars: 2 }); }),
  });
  say("Let's talk!");
}
function talkGame(key, ctx, onDone) {
  const T = TALKS[key]; const done = onDone || ctx.next;
  const top = () => (ctx ? topbar(ctx) : topbar());
  // 열린 질문: 정답 없음 — 아이가 고른 것을 제니가 문장으로 말해줌
  if (T.open) {
    const items = (T.items || SENTENCES[T.open].items).map(x => ({ ...W(x), reply: x[4] }));
    let round = 0;
    const ask = () => {
      if (round >= 2) { markAct('talk'); return done(); }
      const q = round === 0 ? T.q : 'And what else?';
      round++; let picked = false;
      render(top() + `${jennySays(q, T.ko, 140)}
        <div class="center"><div class="choices ${items.length === 4 ? 'four' : ''}">${items.map((c, i) => `<button class="card choice" data-a="pick" data-i="${i}" ${picStyle(c, 'min(14vh,120px)')}>${pic(c)}</button>`).join('')}</div>
        <div class="hint">무엇이든 골라도 정답이에요!</div></div><div class="nav-row"><button class="round-btn primary" id="goNext" style="visibility:hidden" aria-label="다음">${ui('arrowR')}</button></div>`, {
        ...baseHandlers(),
        jenny: () => talk(q),
        pick: async (b) => {
          if (picked) return; picked = true;
          const c = items[+b.dataset.i]; b.classList.add('right'); sfx.ok();
          if (await talk(c.w, 300, c.reply || T.reply)) waitThen(() => sayItStep(c, ctx, ask, 'Your turn!'));
        },
      });
      talk(q);
    };
    return ask();
  }
  // 문답: 그림을 보고 대답 / 숨바꼭질
  let r = 0;
  const round = () => {
    if (r >= T.rounds.length) { markAct('talk'); return done(); }
    const [show, q, qko, choices, model] = T.rounds[r++];
    const hideAt = T.hide ? Math.floor(Math.random() * choices.length) : -1;
    let solved = false, wrongs = 0;
    render(top() + `${jennySays(q, qko, 130)}
      <div class="center">
        ${T.hide ? '' : `<div class="card" style="font-size:min(18vh,150px);padding:10px 40px">${show}</div>`}
        <div class="choices">${choices.map((c, i) => `<button class="card choice" data-a="pick" data-i="${i}">${c[0]}</button>`).join('')}</div>
      </div><div class="nav-row"><button class="round-btn primary" id="goNext" style="visibility:hidden" aria-label="다음">${ui('arrowR')}</button></div>`, {
      ...baseHandlers(),
      jenny: () => talk(q),
      pick: async (b) => {
        if (solved) return;
        const i = +b.dataset.i, c = choices[i];
        if (T.hide) {
          await talk(c[1]);
          if (i === hideAt) {
            solved = true; b.textContent = show; b.classList.add('right'); sfx.ok(); addStars(1, b);
            if (await talk('Yes! ' + model)) waitThen(() => sayItStep({ w: model, e: show, ko: '여기 있다!' }, ctx, round, 'Your turn!'));
          } else { b.style.opacity = .45; sfx.soft(); talk('No! Not here.'); }
          return;
        }
        if (c[2]) {
          solved = true; b.classList.add('right'); sfx.ok(); if (!wrongs) addStars(1, b);
          if (await talk(c[1], 200, model)) waitThen(() => sayItStep({ w: model, e: show }, ctx, round, 'Your turn!'));
        } else {
          wrongs++; b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); sfx.soft();
          talk('Hmm, look again!');
          if (wrongs >= 2) app.querySelectorAll('.choice')[choices.findIndex(x => x[2])]?.classList.add('hint');
        }
      },
    });
    talk(q);
  };
  round();
}

/* ---------------- 스티커북 + 스티커 놀이판 ---------------- */
const stickerWord = (st) => STICKER_WORDS[st] || 'sticker';
function showStickers() {
  render(topbar() + jennySays(`You have ${S.stickers.length} stickers!`, `스티커 ${S.stickers.length}개! 누르면 영어 이름을 알려줘요`, 110) + `
    <div class="nav-row"><button class="btn" data-a="board" style="font-size:24px;padding:16px 30px">🎨 스티커 놀이판</button></div>
    <div class="sticker-grid">${STICKERS.map(st => `<div class="${S.stickers.includes(st) ? '' : 'locked'}" data-a="${S.stickers.includes(st) ? 'st' : 'lock'}" data-s="${st}">${st}</div>`).join('')}</div>`, {
    ...baseHandlers(),
    st: (b) => { sfx.pop(); b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3) rotate(-8deg)' }, { transform: 'scale(1)' }], { duration: 400 }); say(stickerWord(b.dataset.s)); },
    lock: () => { sfx.soft(); say('Finish a lesson to get it!'); },
    board: showBoard,
  });
  say(`You have ${S.stickers.length} stickers! Wow!`);
}
function showBoard() {
  if (!S.board) S.board = { bg: 'meadow', items: [] };
  const B = S.board;
  const avail = [...new Set([...BOARD_BASICS, ...S.stickers])];
  render(topbar() + `
    <div class="board-wrap">
      <div class="st-board bg-${B.bg}" id="board">${B.items.map((it, k) => `<div class="placed" data-k="${k}" style="left:${it.x}%;top:${it.y}%">${it.s}</div>`).join('')}
        <div class="trash" id="trash">🗑️</div></div>
      <div class="board-tools">${BOARD_BGS.map(([id, ic, en]) => `<button class="bg-btn ${B.bg === id ? 'on' : ''}" data-a="bg" data-bg="${id}" aria-label="${en}">${ic}</button>`).join('')}
        <button class="bg-btn" data-a="clear" aria-label="모두 지우기">🧽</button></div>
      <div class="tray">${avail.map(st => `<button class="tray-st" data-a="add" data-s="${st}">${st}</button>`).join('')}</div>
      <div class="hint" style="text-align:center">아래 스티커를 누르면 붙어요 · 끌어서 옮기고 🗑️로 끌면 지워져요</div>
    </div>`, {
    ...baseHandlers(),
    add: (b) => {
      if (B.items.length >= 40) { say('The board is full!'); return; }
      B.items.push({ s: b.dataset.s, x: 25 + Math.random() * 50, y: 20 + Math.random() * 45 }); save(); sfx.pop();
      say(stickerWord(b.dataset.s)); showBoard();
      const el = app.querySelector(`.placed[data-k="${B.items.length - 1}"]`); if (el) el.animate([{ transform: 'translate(-50%,-50%) scale(0)' }, { transform: 'translate(-50%,-50%) scale(1.3)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 450 });
    },
    bg: (b) => { B.bg = b.dataset.bg; save(); sfx.tap(); const n = BOARD_BGS.find(x => x[0] === B.bg); say(n ? n[2] : ''); showBoard(); },
    clear: () => { if (!B.items.length) return; B.items = []; save(); sfx.flip(); say('All clean!'); showBoard(); },
  });
  // 끌어서 옮기기 · 누르면 이름 · 휴지통에 놓으면 지우기
  const board = $('#board'), trash = $('#trash');
  let drag = null;
  board.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.placed'); if (!el) return;
    e.preventDefault(); el.setPointerCapture(e.pointerId);
    drag = { el, k: +el.dataset.k, x0: e.clientX, y0: e.clientY, moved: false };
    el.classList.add('dragging'); trash.classList.add('show');
  });
  board.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) > 6) drag.moved = true;
    const r = board.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)), y = Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100));
    drag.el.style.left = x + '%'; drag.el.style.top = y + '%'; drag.x = x; drag.y = y;
    const t = trash.getBoundingClientRect(); trash.classList.toggle('hot', e.clientX > t.left && e.clientX < t.right && e.clientY > t.top && e.clientY < t.bottom);
  });
  const end = () => {
    if (!drag) return;
    const d = drag; drag = null; d.el.classList.remove('dragging'); trash.classList.remove('show');
    if (trash.classList.contains('hot')) { trash.classList.remove('hot'); B.items.splice(d.k, 1); save(); sfx.flip(); say('Bye-bye!'); showBoard(); return; }
    if (!d.moved) { sfx.tap(); say(stickerWord(B.items[d.k].s)); d.el.animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-50%) scale(1.25)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 350 }); return; }
    B.items[d.k].x = d.x; B.items[d.k].y = d.y; save();
  };
  board.addEventListener('pointerup', end); board.addEventListener('pointercancel', end);
  say("Let's make a picture!");
}

/* =========================================================
   부모님 메뉴
   ========================================================= */
function showParent() {
  const t = today();
  const lv = levelInfo(S.stars);
  const learnedCnt = learnedWords().length;
  const weak = Object.entries(S.wordStats).filter(([, v]) => v.s >= 2).map(([w, v]) => ({ w, r: v.c / v.s, s: v.s })).sort((a, b) => a.r - b.r).slice(0, 8);
  const cal = Array.from({ length: 28 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 27 + i); const h = S.history[dkey(d)]; return `<div class="${h && h.lesson ? 'on' : ''}" title="${dkey(d)}">${h && h.lesson ? '🥕' : d.getDate()}</div>`; }).join('');
  const minsWeek = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return (S.history[dkey(d)] || {}).sec || 0; }).reduce((a, b) => a + b, 0);
  const cur = lessonAt(S.dayIndex), cl = lessonLabel(cur);
  const enV = rankedEnVoices();
  const sch = S.settings.schedule;

  render(`
    <div class="topbar"><button class="icon-btn" data-a="back" aria-label="뒤로">${ui('arrowL', '#5B4BDB', 32)}</button><button class="icon-btn" data-a="home">${icon('home', 34, '#5B4BDB', '#4434B8')}</button><h1 style="margin:0;font-size:32px;flex:1">부모님 메뉴</h1></div>
    <div class="panel"><h3>📊 학습 현황</h3>
      <div class="stats"><div><b>${lv.lv}</b>레벨</div><div><b>${S.stars}</b>모은 별</div><div><b>${streak()}</b>연속 학습일</div><div><b>${learnedCnt}</b>배운 단어</div><div><b>${Object.keys(S.booksRead).length}/${STORIES.length}</b>읽은 그림책</div></div>
      <p class="desc" style="margin-top:14px">오늘 학습 ${Math.round(t.sec / 60)}분 · 최근 7일 ${Math.round(minsWeek / 60)}분 · 현재 진도 <b>Day ${S.dayIndex}</b> ${esc(cl.ko)} (${esc(cl.en)})</p>
      <div class="cal">${cal}</div></div>

    <div class="panel"><h3>☁️ 기기 간 기록 공유</h3>
      <p class="desc">아이패드와 폴드8에 같은 <b>가족 코드</b>를 넣으면 진도·별·스티커가 함께 저장돼요. 두 기기에서 따로 공부해도 합쳐져요.</p>
      <p class="desc">🔒 기록 공유를 켜면 <b>아이 이름과 우리 단어(사진 포함)</b>, 학습 기록이 가족 기록 저장소(Google Firebase)에 저장돼요. 가족 코드를 아는 기기만 볼 수 있으니 코드는 가족끼리만 나눠 주세요.</p>
      <div class="row"><label class="row" style="margin:0"><input type="checkbox" id="photoLocal" ${S.photosLocalOnly ? 'checked' : ''}> 📷 사진은 이 기기에만 저장 (동기화 안 함)</label></div>
      <p class="desc" style="margin:-4px 0 10px">켜면 우리 단어 사진은 저장소에 올리지 않아요. 단어 글자·학습 기록은 계속 공유되고, 다른 기기에는 사진 대신 기본 그림이 보여요. (연결된 기기 모두 같은 설정이 돼요)</p>
      ${S.sync && S.sync.code ? `<div class="row"><span class="famcode">${esc(S.sync.code)}</span><button class="btn ghost" data-a="syncCopy">코드 복사</button></div>
        <p class="desc" style="margin:4px 0 10px">${S.sync.err ? '⚠️ ' + esc(S.sync.err) : S.sync.lastAt ? '✅ 마지막 동기화: ' + new Date(S.sync.lastAt).toLocaleString('ko-KR') : '아직 동기화 전'}</p>
        <div class="row"><button class="btn" data-a="syncGo">지금 동기화</button><button class="btn ghost" data-a="syncOff">이 기기 연결 끊기</button></div>`
      : `<div class="row"><button class="btn" data-a="syncNew">새 가족 코드 만들기</button><span class="desc" style="margin:0">처음 한 기기에서만 눌러요</span></div>
        <div class="row"><input id="famIn" type="text" placeholder="다른 기기의 가족 코드 (예: ABCD-EFGH-JK)" style="flex:1;text-transform:uppercase" autocomplete="off"><button class="btn" data-a="syncJoin">연결하기</button></div>`}
      <p class="desc" id="syncMsg" style="margin:8px 0 0"></p></div>

    <div class="parent-grid">
      <div class="panel"><h3>📚 진도 관리</h3>
        <p class="desc">모국어처럼 배워요: <b>듣기 나라</b>(일상 이야기·단어, 6주) → <b>말하기 마을</b>(제니와 대화) → <b>읽기 나라</b>(알파벳·파닉스) → 맞춤 복습이 계속 이어져요.</p>
        <div class="row"><select id="daySel" style="flex:1">${CURRICULUM.map((l, i) => `<option value="${i}" ${i === S.dayIndex ? 'selected' : ''}>Day ${i} · ${esc(lessonLabel(l).ko)} (${esc(lessonLabel(l).en)})</option>`).join('')}${S.dayIndex >= CURRICULUM.length ? `<option selected value="${S.dayIndex}">Day ${S.dayIndex} · 무지개 복습</option>` : ''}</select></div>
        <div class="row"><button class="btn" data-a="setDay">이 수업으로 이동</button>
        <label class="row" style="margin:0"><input type="checkbox" id="oneDay" ${S.settings.oneLessonPerDay ? 'checked' : ''}> 하루에 새 수업 1개만</label></div></div>

      <div class="panel"><h3>⚙️ 학습 설정</h3>
        <div class="row">이름 <input id="pn" type="text" value="${esc(S.childName)}" style="width:110px"> 영어 <input id="pne" type="text" value="${esc(S.childNameEn)}" style="width:120px"></div>
        <div class="row">하루 학습 시간 <select id="tl">${[0, 10, 15, 20, 30, 40, 60].map(m => `<option value="${m}" ${m === S.settings.timeLimit ? 'selected' : ''}>${m ? m + '분' : '제한 없음'}</option>`).join('')}</select></div>
        <div class="row">말하기 속도 <select id="rt">${[[.6, '아주 천천히'], [.7, '천천히'], [.8, '조금 천천히'], [.9, '보통 (추천)'], [1, '원어민 속도']].map(([v, n]) => `<option value="${v}" ${v === S.settings.rate ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="row">제니 목소리 <select id="jv">${[['heart', '🐰 Heart (녹음 · 따뜻한 목소리)'], ['bella', '🐰 Bella (녹음 · 밝은 목소리)'], ['device', '📱 기기 음성']].map(([v, n]) => `<option value="${v}" ${v === (S.settings.jennyVoice || 'heart') ? 'selected' : ''}>${n}</option>`).join('')}</select> <button class="btn ghost" data-a="testJ">🔊 듣기</button></div>
        <p class="desc" style="margin:-4px 0 10px">녹음 목소리는 그림책·단어·대화처럼 정해진 말에 쓰이고, 아이 이름·우리 단어처럼 바뀌는 말은 아래 기기 음성으로 읽어요.</p>
        <div class="row"><label class="row" style="margin:0"><input type="checkbox" id="lv" ${S.settings.localVoice ? 'checked' : ''}> 이름·우리 단어도 제니 목소리로 (기기 안에서 만들기 · 처음 한 번 약 90MB, 와이파이 권장)</label></div>
        <p class="desc" id="lvStatus" style="margin:-4px 0 10px"></p>
        <div class="row">기기 음성 <select id="vc" style="max-width:240px"><option value="">자동 선택 (가장 자연스러운 음성)</option>${enV.map(v => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === S.settings.voiceURI ? 'selected' : ''}>${voiceScore(v) >= 80 ? '⭐ ' : ''}${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select> <button class="btn ghost" data-a="test">🔊 듣기</button></div>
        <details class="desc" style="margin:-2px 0 10px"><summary style="cursor:pointer">🎙️ 제니 목소리를 더 자연스럽게 하려면</summary>
          <p style="margin:6px 0"><b>아이패드</b>: 설정 → 손쉬운 사용 → 읽기 및 말하기 → 음성 → 영어 → <b>Ava, Zoe 또는 Samantha</b>를 눌러 <b>"프리미엄"이나 "향상된" 음성</b>을 내려받은 뒤, 여기서 ⭐ 표시 음성을 고르세요.<br>
          <b>갤럭시</b>: 설정 → 일반 → 텍스트 음성 변환 → Google 음성 엔진 → 음성 데이터 설치 → 영어(미국)에서 마음에 드는 음성을 받으세요.</p></details>
        <div class="row"><label class="row" style="margin:0"><input type="checkbox" id="sk" ${S.settings.showKorean ? 'checked' : ''}> 한국어 뜻 함께 보여주기</label></div>
        <div class="row"><label class="row" style="margin:0"><input type="checkbox" id="ytPremium" ${S.settings.ytPremium ? 'checked' : ''}> 유튜브 프리미엄 사용 중 (영상에 "유튜브 앱에서 보기" 버튼 · 로그인 정보로 재생)</label></div>
        <div class="row"><label class="row" style="margin:0"><input type="checkbox" id="autoNext" ${S.settings.autoNext ? 'checked' : ''}> 이야기·대화 자동으로 넘기기 (끄면 아이가 ➡️를 눌러야 넘어가요)</label></div>
        <div class="row"><label class="row" style="margin:0"><input type="checkbox" id="mic" ${S.settings.useMic ? 'checked' : ''}> 따라 말하기 녹음 🎤 (녹음은 저장되지 않아요)</label></div>
        <button class="btn" data-a="saveSet">설정 저장</button></div>
    </div>

    <div class="panel"><h3>🗓️ 요일별 활동 계획</h3>
      <p class="desc">체크한 요일에는 홈 화면에 "오늘!" 표시가 떠요. 완료하면 ✓로 바뀝니다.</p>
      <table><tr><th>활동</th>${DAYS_KO.map(d => `<th>${d}</th>`).join('')}<th>주</th></tr>
      ${Object.entries(ACTIVITIES).map(([k, a]) => `<tr><td>${a.icon} ${a.ko}</td>${DAYS_KO.map((_, i) => `<td><input type="checkbox" data-sch="${k}" data-d="${i}" ${sch[k][i] ? 'checked' : ''}></td>`).join('')}<td>${sch[k].filter(Boolean).length}회</td></tr>`).join('')}</table></div>

    <div class="parent-grid">
      <div class="panel"><h3>💝 맞춤 단어 (우리 단어)</h3>
        <p class="desc">아이가 좋아하는 물건, 가족, 장난감을 단어로 추가하세요. 사진도 넣을 수 있어요. 게임과 복습에 더 자주 나와요.</p>
        <details style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:600">📋 여러 단어 한 번에 넣기</summary>
          <p class="desc" style="margin:8px 0">한 줄에 하나씩 <b>영어, 뜻, 이모지</b> (뜻·이모지는 없어도 돼요)<br>예) <code>strawberry, 딸기, 🍓</code> &nbsp; <code>Pororo 뽀로로 🐧</code></p>
          <textarea id="bulk" rows="5" style="width:100%;border:2px solid #eadff3;border-radius:14px;padding:10px;font-size:16px" placeholder="strawberry, 딸기, 🍓&#10;spoon, 숟가락, 🥄&#10;Pororo 뽀로로 🐧"></textarea>
          <button class="btn" data-a="bulkAdd" style="margin-top:8px">모두 추가</button></details>
        <div class="row"><input id="cw" type="text" placeholder="영어 (예: Pororo)" style="flex:1"><input id="ck" type="text" placeholder="뜻 (예: 뽀로로)" style="flex:1"></div>
        <div class="row"><input id="ce" type="text" placeholder="이모지 (예: 🐧)" style="width:130px"><label class="btn ghost">📷 사진<input id="cp" type="file" accept="image/*" hidden></label><span id="cpn" class="desc" style="margin:0"></span>
        <button class="btn" data-a="addW">추가</button></div>
        ${S.customWords.map((w, i) => `<div class="list-item"><span class="pic">${pic(w)}</span><span class="grow"><b>${esc(w.w)}</b> · ${esc(w.ko)}${w.imgElsewhere && !w.img ? ' <small class="desc">(사진은 다른 기기에만 있어요)</small>' : ''}</span><button class="btn ghost" data-a="sayW" data-i="${i}">🔊</button><button class="btn danger" data-a="delW" data-i="${i}">삭제</button></div>`).join('') || '<p class="desc">아직 추가한 단어가 없어요.</p>'}
        ${weak.length ? `<h3 style="margin-top:20px;font-size:20px">🔎 더 연습이 필요한 단어</h3><p class="desc">게임에서 자주 틀린 단어예요. 자동으로 더 자주 출제됩니다.</p>${weak.map(x => `<span class="chip" style="display:inline-flex;margin:4px;font-size:16px;box-shadow:none;background:#f8f3fd">${esc(x.w)} ${Math.round(x.r * 100)}%</span>`).join('')}` : ''}
      </div>

      <div class="panel"><h3>📺 즐겨찾기 영상</h3>
        <p class="desc">유튜브에서 '공유 → 링크 복사' 후 붙여넣으세요. 앱 안에서 바로 재생되고 수업 후 추천에 먼저 나와요.</p>
        <details style="margin-bottom:12px" open><summary style="cursor:pointer;font-weight:600">📋 링크 여러 개 한 번에 넣기 (제목은 자동)</summary>
          <p class="desc" style="margin:8px 0">유튜브에서 <b>공유 → 링크 복사</b>한 주소를 한 줄에 하나씩 붙여넣으세요. 제목과 채널은 자동으로 가져와요.</p>
          <textarea id="vbulk" rows="4" style="width:100%;border:2px solid #eadff3;border-radius:14px;padding:10px;font-size:15px" placeholder="https://youtu.be/...&#10;https://www.youtube.com/watch?v=..."></textarea>
          <div class="row" style="margin-top:8px"><select id="vbcat"><option value="story">동화·영상</option><option value="song">노래</option></select><button class="btn" data-a="addVBulk">모두 추가</button><span class="desc" id="vbMsg" style="margin:0"></span></div></details>
        <div class="row"><input id="vt" type="text" placeholder="제목 (예: 페파피그 - 진흙탕)" style="flex:1"></div>
        <div class="row"><input id="vu" type="url" placeholder="https://youtu.be/..." style="flex:1"><select id="vcat"><option value="story">동화·영상</option><option value="song">노래</option></select><button class="btn" data-a="addV">추가</button></div>
        ${S.favVideos.map((v, i) => `<div class="list-item"><span class="pic">${v.cat === 'song' ? '🎵' : '⭐'}</span><span class="grow">${esc(v.title)}${v.author ? `<br><small class="desc">${esc(v.author)}</small>` : ''}</span><button class="btn ghost" data-a="playV" data-i="${i}">▶️</button><button class="btn danger" data-a="delV" data-i="${i}">삭제</button></div>`).join('') || '<p class="desc">아직 등록된 영상이 없어요.</p>'}
      </div>
    </div>

    <div class="panel"><h3>📺 영상 가이드</h3>
      <p class="desc">앱의 영상은 모두 <b>공식 채널</b>(Super Simple Songs, Super Simple ABCs, Peppa Pig Official, Pinkfong) 영상만 골라 <b>수업 주제에 맞춰</b> 연결했어요. 앱 안에서 재생되고, 끝나면 제니에게 돌아와요. (광고 노출 여부는 유튜브가 정해요.)</p>
      <div class="parent-grid">${['peppa', 'bluey'].map(k => { const g = WATCH_GUIDE[k]; return `<div><b>${k === 'peppa' ? '🐷 페파피그' : '🐶 블루이'}</b> — <span class="desc" style="margin:0">${g.when}</span><p class="desc" style="margin:6px 0">${g.why}</p>
        <div>${g.titles.map(t => `<span class="chip" style="display:inline-flex;margin:3px;font-size:14px;box-shadow:none;background:#F1EEFC;padding:6px 10px">${esc(t)}</span>`).join('')}</div></div>`; }).join('')}</div>
      <p class="desc" style="margin-top:14px"><b>보는 법</b>: 꼭 영어 원판으로 · 같은 편을 여러 번 · 하루 1~2편 · 처음엔 옆에서 같이 보며 "Look! Muddy puddles!"처럼 한마디씩.<br>
      <b>유튜브 키즈를 쓸 때</b>: 부모 설정(자물쇠) → 아이 프로필 → 콘텐츠 설정을 <b>"승인된 콘텐츠만"</b>으로 바꾸고 위 채널만 허용하면 다른 영상으로 빠지지 않아요. 좋은 에피소드를 찾으면 아래 '즐겨찾기 영상'에 링크를 넣어 주세요.</p></div>

    ${Object.keys(PHOTOS).length ? `<div class="panel"><h3>📷 실제 사진 출처</h3>
      <p class="desc">단어 카드의 📷 버튼을 누르면 실제 사진이 나와요. 사진은 위키미디어 공용의 자유 이용 사진(퍼블릭 도메인·CC0·CC BY)이고, 저작자 표시는 아래와 같아요.</p>
      <details><summary class="desc" style="cursor:pointer">사진 ${Object.keys(PHOTOS).length}장 출처 보기</summary><ul class="desc credits">${Object.entries(PHOTOS).map(([w, c]) => `<li><b>${esc(w)}</b> — ${esc(c.artist || '작자 미상')} · ${esc(c.license)} · <a href="${esc(c.page || '#')}" target="_blank" rel="noopener">원본</a></li>`).join('')}</ul></details></div>` : ''}

    <div class="panel"><h3>💾 데이터</h3>
      <p class="desc">학습 기록은 이 아이패드에만 저장돼요. 가끔 백업해 두면 안전해요.</p>
      <div class="row"><button class="btn" data-a="export">백업 파일 저장</button><label class="btn ghost">백업 불러오기<input id="imp" type="file" accept="application/json,.json" hidden></label>
      <button class="btn danger" data-a="reset">전체 초기화</button></div></div>
    <div style="height:20px"></div>`, {
    back: goBack,
    home: () => showHome(),
    setDay: () => { S.dayIndex = +$('#daySel').value; S.lastLessonIdx = null; today().lesson = false; save(); toast('진도를 변경했어요'); showParent(); },
    testJ: () => { const old = S.settings.jennyVoice; S.settings.jennyVoice = $('#jv').value; say("Hi! I'm Jenny, the white rabbit!").then(() => { S.settings.jennyVoice = old; }); },
    test: () => { S.settings.voiceURI = $('#vc').value; S.settings.rate = +$('#rt').value; say(`Hi ${$('#pne').value || 'friend'}! I am Jenny. A, B, C. Apple!`); },
    saveSet: () => {
      Object.assign(S.settings, { localVoice: $('#lv').checked, jennyVoice: $('#jv').value, timeLimit: +$('#tl').value, rate: +$('#rt').value, voiceURI: $('#vc').value, showKorean: $('#sk').checked, useMic: $('#mic').checked, autoNext: $('#autoNext').checked, ytPremium: $('#ytPremium').checked, oneLessonPerDay: $('#oneDay').checked });
      S.childName = $('#pn').value.trim() || S.childName; S.childNameEn = $('#pne').value.trim(); S.settingsAt = Date.now(); save();
      if (S.settings.localVoice) { lvStart(); if (LV.state === 'ready') lvSeed(); } toast('저장했어요');
    },
    addW: async () => {
      const w = $('#cw').value.trim(), ko = $('#ck').value.trim(), e = $('#ce').value.trim();
      if (!w) return toast('영어 단어를 입력해 주세요');
      const f = $('#cp').files[0];
      let img = null;
      if (f) { try { img = await readImage(f); } catch (err) { return toast('사진을 불러오지 못했어요'); } }
      S.customWords.push({ w, ko, e: e || '💝', img }); S.listsAt = Date.now(); save(); if (LV.state === 'ready') lvSeed(); say(w); showParent();
    },
    bulkAdd: () => {
      const added = parseWordLines($('#bulk').value).filter(x => !S.customWords.some(y => y.w.toLowerCase() === x.w.toLowerCase()));
      if (!added.length) return toast('추가할 단어가 없어요 (형식을 확인해 주세요)');
      S.customWords.push(...added); S.listsAt = Date.now(); save(); toast(`${added.length}개 단어를 추가했어요`); showParent();
    },
    sayW: (b) => say(S.customWords[+b.dataset.i].w),
    delW: (b) => { S.customWords.splice(+b.dataset.i, 1); S.listsAt = Date.now(); save(); showParent(); },
    addV: () => {
      const id = ytId($('#vu').value);
      if (!id) return toast('유튜브 링크를 확인해 주세요');
      S.favVideos.push({ title: $('#vt').value.trim() || '추천 영상', yt: id, cat: $('#vcat').value }); S.listsAt = Date.now(); save(); showParent();
    },
    addVBulk: async () => {
      const ids = [...new Set(($('#vbulk').value.match(/\S+/g) || []).map(ytId).filter(Boolean))].filter(id => !S.favVideos.some(v => v.yt === id));
      if (!ids.length) return toast('추가할 유튜브 링크가 없어요');
      $('#vbMsg').textContent = '제목 가져오는 중…';
      const added = [];
      for (const id of ids) {
        const info = await ytInfo(id);
        added.push({ title: info ? info.title.split('|')[0].trim().slice(0, 60) : '추천 영상', author: info ? info.author : '', yt: id, cat: $('#vbcat').value });
      }
      S.favVideos.push(...added); S.listsAt = Date.now(); save();
      toast(`${added.length}개 영상을 추가했어요`); videoTab = 'fav'; showParent();
    },
    playV: (b) => { const v = S.favVideos[+b.dataset.i]; playVideo({ t: v.title, yt: v.yt, kind: v.cat === 'song' ? 'song' : 'peppa' }); },
    delV: (b) => { S.favVideos.splice(+b.dataset.i, 1); S.listsAt = Date.now(); save(); showParent(); },
    export: () => {
      const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `jenny-english-backup-${todayKey()}.json`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },
    syncNew: async () => { $('#syncMsg').textContent = '만드는 중…'; const r = await createFamily(); if (r.ok) { toast('가족 코드를 만들었어요'); showParent(); } else $('#syncMsg').textContent = '⚠️ ' + r.err; },
    syncJoin: async () => { $('#syncMsg').textContent = '연결하는 중…'; const r = await joinFamily($('#famIn').value); if (r.ok) { toast('연결했어요! 두 기기 기록을 합쳤어요'); showParent(); } else $('#syncMsg').textContent = '⚠️ ' + r.err; },
    syncGo: async () => { $('#syncMsg').textContent = '동기화 중…'; const r = await syncNow(); showParent(); toast(r.ok ? '동기화했어요' : r.err); },
    syncOff: () => { leaveFamily(); toast('이 기기는 연결을 끊었어요 (기록은 그대로)'); showParent(); },
    syncCopy: () => { const c = S.sync.code; try { navigator.clipboard.writeText(c).then(() => toast('복사했어요: ' + c), () => toast(c)); } catch (e) { toast(c); } },
    reset: () => { if (confirm('모든 학습 기록을 지울까요? 되돌릴 수 없어요.')) { S = defaultState(); save(); showHome(); } },
  });
  lvUpdateUI();
  document.body.classList.add('parent-mode');
  app.querySelectorAll('[data-sch]').forEach(c => c.addEventListener('change', () => { S.settings.schedule[c.dataset.sch][+c.dataset.d] = c.checked ? 1 : 0; S.settingsAt = Date.now(); save(); }));
  $('#photoLocal').addEventListener('change', (e) => {
    // 옵션만의 시각으로 기록(settingsAt은 건드리지 않음) → 다른 기기의 설정 저장과 섞여도 마지막에 고친 값 유지
    S.photosLocalOnly = e.target.checked; S.photosLocalOnlyAt = Date.now(); S.settings.photosLocalOnly = e.target.checked; save();
    toast(e.target.checked ? '사진은 이 기기에만 저장해요' : '사진도 다른 기기와 함께 공유해요');
    if (S.sync && S.sync.code) syncNow(); // 바로 반영 (켜면 저장소에 올라가 있던 사진도 빠짐)
  });
  $('#cp').addEventListener('change', (e) => { $('#cpn').textContent = e.target.files[0] ? '사진 선택됨 ✓' : ''; });
  $('#imp').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const d = JSON.parse(await f.text()); if (!d || typeof d !== 'object' || !('stars' in d)) throw 0; localStorage.setItem(KEY, JSON.stringify(d)); S = load(); toast('불러왔어요'); showParent(); }
    catch (err) { toast('백업 파일이 올바르지 않아요'); }
  });
}
// "apple, 사과, 🍎" 또는 "apple 사과 🍎" 한 줄씩 → 단어 목록
function parseWordLines(text) {
  return String(text || '').split(/\n/).map(l => l.trim()).filter(Boolean).map(l => {
    let w, ko = '', e = '';
    if (/[,\t]/.test(l)) { [w, ko = '', e = ''] = l.split(/\s*[,\t]\s*/); }
    else {
      w = (l.match(/^[A-Za-z][A-Za-z' .-]*/) || [''])[0].trim();
      ko = (l.match(/[가-힣][가-힣 ]*/) || [''])[0].trim();
      e = (l.match(/\p{Extended_Pictographic}[\u{FE0F}\u{200D}\p{Extended_Pictographic}]*/u) || [''])[0];
    }
    return { w: (w || '').trim(), ko: (ko || '').trim(), e: (e || '').trim() || '💝', img: null };
  }).filter(x => /^[A-Za-z]/.test(x.w));
}
// 유튜브 링크 → 제목·채널 (oEmbed, 실패하면 null)
async function ytInfo(id) {
  try {
    const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id));
    if (!r.ok) return null;
    const j = await r.json(); return { title: j.title || '', author: j.author_name || '' };
  } catch (e) { return null; }
}
function readImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const m = Math.min(img.width, img.height), s = Math.min(320, m);
      const c = document.createElement('canvas'); c.width = c.height = s;
      c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', .8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(); };
    img.src = url;
  });
}
function toast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;left:50%;bottom:40px;transform:translateX(-50%);background:#4b3a5e;color:#fff;padding:14px 24px;border-radius:99px;font-size:20px;z-index:99;box-shadow:0 8px 24px rgba(0,0,0,.2)';
  document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
}

/* ---------------- 시작 ---------------- */
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
// 뒤로가기용 화면 등록 (홈에 오면 기록 초기화)
showLibrary = trackScreen(showLibrary); showListening = trackScreen(showListening); showTalkMenu = trackScreen(showTalkMenu);
showGames = trackScreen(showGames); startMyWords = trackScreen(startMyWords); showPack = trackScreen(showPack);
showABC = trackScreen(showABC); letterDetail = trackScreen(letterDetail); showTraceMenu = trackScreen(showTraceMenu);
showLetterVideos = trackScreen(showLetterVideos); startReview = trackScreen(startReview); singABC = trackScreen(singABC); showVideos = trackScreen(showVideos); showStickers = trackScreen(showStickers);
showBoard = trackScreen(showBoard); showParent = trackScreen(showParent);
readBook = trackScreen(readBook, (a) => !!(a[1] && a[1].onEnd)); // 수업·듣기 시간 속 이야기는 단계로 취급
{ const home0 = showHome; showHome = function (...a) { navStack.length = 0; navBack = false; curScreen = { fn: showHome, args: [], tok: 0 }; const r = home0.apply(this, a); curScreen.tok = navTok; return r; }; }
function onSyncChanged() { if (onHome) showHome(); }
if (S.settings.localVoice) setTimeout(lvStart, 3000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') lvPump(); });
showHome();
if (S.sync && S.sync.code) syncNow().then(r => { if (r.changed) onSyncChanged(); });
