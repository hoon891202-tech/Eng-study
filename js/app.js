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
    settings: { timeLimit: 20, rate: 0.8, voiceURI: '', showKorean: true, oneLessonPerDay: true, useMic: true, schedule },
  };
}
function load() {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
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
function pickVoice(lang) {
  if (lang.startsWith('en')) {
    if (S.settings.voiceURI) { const v = voices.find(v => v.voiceURI === S.settings.voiceURI); if (v) return v; }
    const en = enVoices();
    for (const p of ['Samantha', 'Karen', 'Tessa', 'Moira', 'Google US English', 'Aria', 'Jenny']) {
      const v = en.find(v => v.name.includes(p)); if (v) return v;
    }
    return en.find(v => /en[-_]US/i.test(v.lang)) || en[0];
  }
  return voices.find(v => v.lang.toLowerCase().startsWith(lang.slice(0, 2)));
}
let speakTok = 0;
function stopSpeech() { speakTok++; if (hasTTS) speechSynthesis.cancel(); document.body.classList.remove('talking'); }
function say(text, opt = {}) {
  return new Promise(res => {
    if (!hasTTS || !text) return res();
    const lang = opt.lang || 'en-US';
    const tok = ++speakTok;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const v = pickVoice(lang); if (v) u.voice = v;
    u.rate = (opt.rate || 1) * (lang.startsWith('en') ? S.settings.rate : 1);
    u.pitch = opt.pitch || 1.15;
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
function topbar(ctx) {
  const dots = ctx && ctx.total ? `<div class="progress-dots">${Array.from({ length: ctx.total }, (_, i) => `<span class="${i < ctx.idx ? 'on' : ''}">${CARROT}</span>`).join('')}</div>` : '<div class="spacer"></div>';
  return `<div class="topbar"><button class="icon-btn" data-a="home" aria-label="홈">${icon('home', 38, '#FF6B8A', '#E04A6C')}</button>${dots}${starPill()}</div>`;
}
const CARROT = icon('carrot', 30, '#FF9A3C', '#4CC38A', '#FFD3A8');
const starPill = () => `<div class="pill">${icon('sticker', 28, '#FFC23D', '#E9A10F', '#fff')} <b class="en" id="starCount">${S.stars}</b></div>`;
const baseHandlers = () => ({ home: () => showHome(), jenny: () => { sfx.tap(); say('Hi! I am Jenny!'); } });

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
  const go = () => { if (i >= steps.length) return onDone(); const st = steps[i++]; st({ next: go, idx: i - 1, total: steps.length }); };
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
    steps.push(ctx => readBook(book, { auto: true, ctx, onEnd: ctx.next }));
    steps.push(ctx => stepWords(words, ctx, { listen: true }));
    steps.push(ctx => findGame({ targets: words, pool: pool(), rounds: Math.min(4, words.length), ctx }));
    steps.push(ctx => sayItStep({ w: book.say[0], ko: book.say[1], e: book.cover }, ctx));
  } else if (l.type === 'relisten') {
    l.stories.forEach(k => steps.push(ctx => readBook(bookById(k), { auto: true, ctx, onEnd: ctx.next })));
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
    const x = words[i];
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
        <button class="round-btn primary" data-a="next">${ui('arrowR')}</button>
      </div>`, {
      ...baseHandlers(),
      say: () => { sfx.tap(); talk(line(x)); },
      prev: () => { i--; show(); },
      next: () => { stat(x.w, true); i++; if (i >= words.length) ctx.next(); else show(); },
    });
    if (opt.sentence) talk(x.w, 700, [x.w, { rate: .85 }], 300, 'Your turn!');
    else talk(line(x), 600, x.w);
  };
  show();
}

/* ---------------- 따라쓰기 ---------------- */
function stepTrace(L, ctx, onDone) {
  let lower = false, color = '#ff7eb0', finished = false;
  const colors = ['#ff7eb0', '#5bb8ff', '#3fcfa6', '#ff9a3c', '#a07cf5'];
  render(topbar(ctx) + `
    ${jennySays(`Trace the letter ${L}!`, '손가락으로 글자를 따라 그려요', 120)}
    <div class="center">
      <div class="trace-wrap" id="tw"><canvas id="cg"></canvas><canvas id="cd"></canvas></div>
      <div class="trace-tools">${colors.map(c => `<button class="color-dot ${c === color ? 'on' : ''}" data-a="color" data-c="${c}" style="background:${c}"></button>`).join('')}
        <button class="round-btn" data-a="case" style="width:64px;height:64px;font-size:26px"><span class="en">Aa</span></button>
        <button class="round-btn" data-a="clear" style="width:64px;height:64px;font-size:30px">🧽</button>
        <button class="round-btn primary" data-a="next" id="traceNext" style="width:64px;height:64px;font-size:30px">${ui('arrowR', '#fff', 32)}</button></div>
    </div>`, {
    ...baseHandlers(),
    color: (b) => { color = b.dataset.c; document.querySelectorAll('.color-dot').forEach(d => d.classList.toggle('on', d === b)); },
    case: () => { lower = !lower; setup(); },
    clear: () => setup(),
    next: () => { markAct('trace'); (onDone || ctx.next)(); },
  });
  say(`Trace the letter ${L}!`);
  const tw = $('#tw'), cg = $('#cg'), cd = $('#cd');
  const dpr = window.devicePixelRatio || 1;
  let pts = [], covered = 0, drawing = false, last = null;
  const nav = navTok;
  async function setup() {
    finished = false;
    const w = tw.clientWidth, h = tw.clientHeight;
    [cg, cd].forEach(c => { c.width = w * dpr; c.height = h * dpr; });
    try { await document.fonts.load(`700 100px Fredoka`); } catch (e) { /* noop */ }
    if (nav !== navTok) return;
    const ch = lower ? L.toLowerCase() : L;
    const g = cg.getContext('2d');
    g.clearRect(0, 0, cg.width, cg.height);
    g.font = `700 ${h * .78 * dpr}px Fredoka, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const x = cg.width / 2, y = cg.height / 2 + h * .04 * dpr;
    g.fillStyle = '#f3ecfa'; g.fillText(ch, x, y);
    g.setLineDash([14 * dpr, 12 * dpr]); g.lineWidth = 4 * dpr; g.strokeStyle = '#cbb6e6'; g.strokeText(ch, x, y);
    // 글자 영역의 점 샘플링
    const img = g.getImageData(0, 0, cg.width, cg.height).data;
    pts = []; const step = Math.round(16 * dpr);
    for (let yy = 0; yy < cg.height; yy += step) for (let xx = 0; xx < cg.width; xx += step) {
      const p = (yy * cg.width + xx) * 4;
      if (img[p + 3] > 100) pts.push({ x: xx, y: yy, hit: false });
    }
    covered = 0;
    cd.getContext('2d').clearRect(0, 0, cd.width, cd.height);
  }
  const pos = (e) => { const r = cd.getBoundingClientRect(); return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr }; };
  function mark(p) {
    const rr = (30 * dpr) ** 2;
    for (const q of pts) if (!q.hit && (q.x - p.x) ** 2 + (q.y - p.y) ** 2 < rr) { q.hit = true; covered++; }
    if (!finished && pts.length && covered / pts.length > .7) {
      finished = true; sfx.ok(); confetti(25); addStars(1, tw);
      say(`Great job! ${lower ? L.toLowerCase() : L}!`);
      const n = $('#traceNext'); if (n) n.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 600, iterations: 3 });
    }
  }
  cd.addEventListener('pointerdown', (e) => { drawing = true; last = pos(e); cd.setPointerCapture(e.pointerId); mark(last); });
  cd.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pos(e), c = cd.getContext('2d');
    c.strokeStyle = color; c.lineWidth = 30 * dpr; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(last.x, last.y); c.lineTo(p.x, p.y); c.stroke();
    last = p; mark(p);
  });
  const end = () => { drawing = false; };
  cd.addEventListener('pointerup', end); cd.addEventListener('pointercancel', end);
  setup();
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
    <div class="nav-row"><button class="btn" data-a="song" style="font-size:22px;padding:16px 26px">🎵 ABC 노래 보기</button>
    <button class="btn" data-a="trace" style="font-size:22px;padding:16px 26px;background:var(--mint)">✏️ 따라쓰기</button></div>`, {
    ...baseHandlers(),
    trace: () => showTraceMenu(),
    letter: (b) => { sfx.tap(); letterDetail(b.dataset.l); },
    song: () => playVideo(vid('vD98OvvDNEs')),
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

/* ---------------- 우리 단어 / 복습 ---------------- */
function startMyWords() {
  const words = S.customWords;
  if (!words.length) {
    render(topbar() + `<div class="center">${jenny(200)}<h1 class="title"><span class="en">My Words</span>우리 아이 맞춤 단어</h1>
      <p class="hint" style="font-size:24px">아직 단어가 없어요.<br>부모님 메뉴(⚙️)에서 아이가 좋아하는 물건이나<br>사진으로 단어를 추가해 주세요!</p>
      <button class="btn" data-a="parent" style="font-size:22px;padding:16px 26px">⚙️ 단어 추가하러 가기</button></div>`, { ...baseHandlers(), parent: () => parentGate(showParent) });
    return;
  }
  const pick = pickWeighted(words.map(x => ({ ...x, custom: true })), Math.min(6, words.length));
  const steps = [ctx => stepWords(pick, ctx)];
  if (words.length >= 2) steps.push(ctx => findGame({ targets: pick, pool: learnedWords(), rounds: Math.min(4, pick.length + 1), ctx }));
  runSteps(steps, () => { markAct('mywords'); rewardScreen({ mini: true, stars: 2 }); });
}
function startReview() {
  const pool = learnedWords();
  const words = pickWeighted(pool.length >= 4 ? pool : allWords(), 5);
  runSteps([
    ctx => stepWords(words, ctx),
    ctx => findGame({ targets: words, pool, rounds: 4, ctx }),
    ctx => memoryGame(words.slice(0, 3), ctx),
  ], () => { markAct('review'); rewardScreen({ mini: true, stars: 3 }); });
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
function vid(id) { const v = VIDEO_LIB[id] || [id, '', 'song']; return { yt: id, t: v[0], ko: v[1], kind: v[2] }; }
function lessonVideos(l) {
  if (!l) return [];
  if (l.type === 'letter') return [LETTER_VIDEOS[l.key]];
  if (l.type === 'review') return l.letters.map(L => LETTER_VIDEOS[L]);
  if (l.type === 'relisten') return l.stories.flatMap(k => LESSON_VIDEOS[k] || []);
  if (l.type === 'sentence') return LESSON_VIDEOS['s:' + l.key] || [];
  return LESSON_VIDEOS[l.key] || [];
}
const favVideos = () => S.favVideos.map(f => ({ yt: f.yt, t: f.title, ko: '부모님 추천', kind: f.cat === 'song' ? 'song' : 'peppa', fav: true }));
// 수업 끝 추천: 오늘 수업 영상 → 부모님 추천 → 지금까지 배운 수업의 영상
function recommend(lesson) {
  const today = [...new Set(lessonVideos(lesson))];
  const learned = shuffle([...new Set(CURRICULUM.slice(0, S.dayIndex).flatMap(lessonVideos))].filter(i => !today.includes(i)));
  return [...today.map(vid), ...shuffle(favVideos()).slice(0, 2), ...learned.map(vid)].slice(0, 6);
}
function videoCard(v, i) {
  const badge = v.fav ? '<b class="vbadge">부모님 추천</b>' : v.kind === 'peppa' ? '<b class="vbadge peppa">페파피그</b>' : '';
  return `<button class="video-card" data-a="v" data-i="${i}"><span class="thumb"><img src="https://i.ytimg.com/vi/${encodeURIComponent(v.yt)}/mqdefault.jpg" alt="" loading="lazy">
    <i>${ui('play', '#fff', 30)}</i>${badge}</span><span class="vt"><span class="t">${esc(v.t)}</span><span class="k">${esc(v.ko)}</span></span></button>`;
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
async function playVideo(v) {
  markAct(v.kind === 'peppa' ? 'story' : 'song'); stopSpeech();
  const p = document.createElement('div');
  p.className = 'player';
  p.innerHTML = `<div class="topbar"><button class="icon-btn" aria-label="닫기">${ui('arrowL', '#6B5E85', 34)}</button><div class="pill ptitle">${esc(v.t)}</div></div><div class="frame"><div id="ytp"></div></div>`;
  const close = (ended) => { if (!p.isConnected) return; p.remove(); if (ended) { sfx.ok(); say(rand(['Did you like it?', 'That was fun!', 'Yay! Great song!'])); } };
  p.querySelector('button').onclick = () => close(false);
  document.body.appendChild(p);
  await loadYTApi();
  if (!p.isConnected) return;
  if (window.YT && window.YT.Player) {
    new window.YT.Player('ytp', { videoId: v.yt, host: 'https://www.youtube-nocookie.com',
      playerVars: { rel: 0, playsinline: 1, modestbranding: 1, autoplay: 1 },
      events: { onStateChange: (e) => { if (e.data === 0) setTimeout(() => close(true), 500); } } });
  } else {
    p.querySelector('#ytp').outerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.yt)}?rel=0&playsinline=1&autoplay=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
  }
}
// 영상 화면: 오늘 영상 → 노래(배운 순서) → 페파피그 → 부모님 추천
function showVideos(cat) {
  const cur = lessonAt(S.lastLessonIdx ?? S.dayIndex);
  const todays = [...new Set(lessonVideos(cur))];
  const order = [...new Set(CURRICULUM.flatMap(lessonVideos))];
  const learnedSet = new Set(CURRICULUM.slice(0, S.dayIndex + 1).flatMap(lessonVideos));
  const songs = order.filter(i => VIDEO_LIB[i] && VIDEO_LIB[i][2] === 'song' && !todays.includes(i)).sort((a, b) => learnedSet.has(b) - learnedSet.has(a));
  const peppa = Object.keys(VIDEO_LIB).filter(i => VIDEO_LIB[i][2] === 'peppa');
  const sections = [['⭐', '오늘의 영상', todays.map(vid)], ['🎵', '노래', songs.map(vid)], ['🐷', '페파피그', peppa.map(vid)], ['💝', '부모님 추천', favVideos()]];
  if (cat === 'stories') [sections[1], sections[2]] = [sections[2], sections[1]];
  const list = []; let html = '';
  for (const [ic, name, vs] of sections) {
    if (!vs.length) continue;
    html += `<h2 class="section-title">${ic} ${name}</h2><div class="video-grid">${vs.map(v => { list.push(v); return videoCard(v, list.length - 1); }).join('')}</div>`;
  }
  const t = cat === 'songs' ? ['Sing along!', '그림을 누르면 바로 나와요'] : ["It's video time!", '그림을 누르면 바로 나와요'];
  render(topbar() + jennySays(t[0], t[1], 120) + html, { ...baseHandlers(), v: (b) => playVideo(list[+b.dataset.i]) });
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
function showLibrary() {
  const rec = recommendedBook();
  render(topbar() + jennySays("Let's read a book!", '어떤 책을 읽을까요? 표지를 눌러요', 120) + `
    <div class="book-grid">${STORIES.map((b, i) => `<button class="book" data-a="open" data-i="${i}">
      ${b.id === rec.id ? '<span class="badge">추천!</span>' : ''}
      <span class="cover">${b.cover}</span><span class="bt en">${esc(b.title)}</span><span class="bk">${esc(b.ko)}</span>
      <span class="read">${S.booksRead[b.id] ? '⭐'.repeat(Math.min(3, S.booksRead[b.id])) : '새 책 ✨'}</span></button>`).join('')}</div>`, {
    ...baseHandlers(),
    open: (b) => { sfx.page(); readBook(STORIES[+b.dataset.i]); },
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
      else { const n = $('#pgNext'); if (n) n.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 700, iterations: 2 }); }
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
      render(topbar(opt.ctx) + `<div class="center">${jenny(200, 'jenny-hop')}<h1 class="title"><span class="en">The End!</span>끝!</h1></div>`, baseHandlers());
      sfx.ok(); talk('The end!').then(ok => { if (ok) opt.onEnd(); });
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
  const list = (heard.length ? shuffle(heard).slice(0, 4) : [recommendedBook()]);
  render(topbar() + jennySays("It's listening time!", '그림을 보면서 편하게 들어요. 밥 먹을 때, 놀 때 틀어둬도 좋아요', 130) + `
    <div class="center">
      <div style="font-size:min(20vh,170px)">🎧</div>
      <div class="word-row">${list.map(b => `<div class="card mini-word"><div class="pic">${b.cover}</div><div class="w" style="font-size:20px">${esc(b.title)}</div></div>`).join('')}</div>
      <p class="hint">들은 이야기를 반복해서 들려줘요 · 자동으로 넘어가요</p>
      <button class="btn" data-a="play" style="font-size:28px;padding:20px 40px">▶️ 듣기 시작</button>
    </div>`, {
    ...baseHandlers(),
    play: () => {
      let n = 0;
      const nextBook = () => {
        if (n >= list.length) return rewardScreen({ mini: true, stars: 2 });
        const b = list[n++];
        readBook(b, { auto: true, onEnd: nextBook, label: `🎧 ${n} / ${list.length}` });
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

/* ---------------- 제니와 대화하기 (말하기 마을) ---------------- */
function showTalkMenu() {
  const keys = Object.keys(TALKS);
  render(topbar() + jennySays("Let's talk!", '제니가 물어보면 그림을 눌러 대답해요', 130) + `
    <div class="book-grid">${keys.map(k => `<button class="book" data-a="t" data-k="${k}"><span class="cover" style="font-size:80px">${SENTENCES[k].icon}</span>
      <span class="bt en">${esc(SENTENCES[k].title)}</span><span class="bk">${esc(SENTENCES[k].ko)}</span></button>`).join('')}</div>`, {
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
    const items = SENTENCES[T.open].items.map(W);
    let round = 0;
    const ask = () => {
      if (round >= 2) { markAct('talk'); return done(); }
      const q = round === 0 ? T.q : 'And what else?';
      round++;
      render(top() + `${jennySays(q, T.ko, 140)}
        <div class="center"><div class="choices ${items.length === 4 ? 'four' : ''}">${items.map((c, i) => `<button class="card choice" data-a="pick" data-i="${i}" ${picStyle(c, 'min(14vh,120px)')}>${pic(c)}</button>`).join('')}</div>
        <div class="hint">무엇이든 골라도 정답이에요!</div></div>`, {
        ...baseHandlers(),
        jenny: () => talk(q),
        pick: async (b) => {
          const c = items[+b.dataset.i]; b.classList.add('right'); sfx.ok();
          if (await talk(c.w, 300, T.reply)) sayItStep(c, ctx, ask, 'Your turn!');
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
      </div>`, {
      ...baseHandlers(),
      jenny: () => talk(q),
      pick: async (b) => {
        if (solved) return;
        const i = +b.dataset.i, c = choices[i];
        if (T.hide) {
          await talk(c[1]);
          if (i === hideAt) {
            solved = true; b.textContent = show; b.classList.add('right'); sfx.ok(); addStars(1, b);
            if (await talk('Yes! ' + model)) sayItStep({ w: model, e: show, ko: '여기 있다!' }, ctx, round, 'Your turn!');
          } else { b.style.opacity = .45; sfx.soft(); talk('No! Not here.'); }
          return;
        }
        if (c[2]) {
          solved = true; b.classList.add('right'); sfx.ok(); if (!wrongs) addStars(1, b);
          if (await talk(c[1], 200, model)) sayItStep({ w: model, e: show }, ctx, round, 'Your turn!');
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

/* ---------------- 스티커북 ---------------- */
function showStickers() {
  render(topbar() + jennySays(`You have ${S.stickers.length} stickers!`, `스티커 ${S.stickers.length}개를 모았어요! 수업을 마치면 하나씩 받아요`, 120) +
    `<div class="sticker-grid">${STICKERS.map(s => `<div class="${S.stickers.includes(s) ? '' : 'locked'}" data-a="${S.stickers.includes(s) ? 'st' : ''}">${s}</div>`).join('')}</div>`, {
    ...baseHandlers(), st: () => { sfx.pop(); confetti(8); },
  });
  say(`You have ${S.stickers.length} stickers! Wow!`);
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
  const enV = enVoices();
  const sch = S.settings.schedule;

  render(`
    <div class="topbar"><button class="icon-btn" data-a="home">${icon('home', 34, '#5B4BDB', '#4434B8')}</button><h1 style="margin:0;font-size:32px;flex:1">부모님 메뉴</h1></div>
    <div class="panel"><h3>📊 학습 현황</h3>
      <div class="stats"><div><b>${lv.lv}</b>레벨</div><div><b>${S.stars}</b>모은 별</div><div><b>${streak()}</b>연속 학습일</div><div><b>${learnedCnt}</b>배운 단어</div><div><b>${Object.keys(S.booksRead).length}/${STORIES.length}</b>읽은 그림책</div></div>
      <p class="desc" style="margin-top:14px">오늘 학습 ${Math.round(t.sec / 60)}분 · 최근 7일 ${Math.round(minsWeek / 60)}분 · 현재 진도 <b>Day ${S.dayIndex}</b> ${esc(cl.ko)} (${esc(cl.en)})</p>
      <div class="cal">${cal}</div></div>

    <div class="panel"><h3>☁️ 기기 간 기록 공유</h3>
      <p class="desc">아이패드와 폴드8에 같은 <b>가족 코드</b>를 넣으면 진도·별·스티커가 함께 저장돼요. 두 기기에서 따로 공부해도 합쳐져요.</p>
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
        <div class="row">말하기 속도 <select id="rt">${[[.6, '아주 천천히'], [.7, '천천히'], [.8, '보통 (추천)'], [.9, '조금 빠르게'], [1, '원어민 속도']].map(([v, n]) => `<option value="${v}" ${v === S.settings.rate ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="row">목소리 <select id="vc" style="max-width:240px"><option value="">자동 선택</option>${enV.map(v => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === S.settings.voiceURI ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select> <button class="btn ghost" data-a="test">🔊 듣기</button></div>
        <div class="row"><label class="row" style="margin:0"><input type="checkbox" id="sk" ${S.settings.showKorean ? 'checked' : ''}> 한국어 뜻 함께 보여주기</label></div>
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
        <div class="row"><input id="cw" type="text" placeholder="영어 (예: Pororo)" style="flex:1"><input id="ck" type="text" placeholder="뜻 (예: 뽀로로)" style="flex:1"></div>
        <div class="row"><input id="ce" type="text" placeholder="이모지 (예: 🐧)" style="width:130px"><label class="btn ghost">📷 사진<input id="cp" type="file" accept="image/*" hidden></label><span id="cpn" class="desc" style="margin:0"></span>
        <button class="btn" data-a="addW">추가</button></div>
        ${S.customWords.map((w, i) => `<div class="list-item"><span class="pic">${pic(w)}</span><span class="grow"><b>${esc(w.w)}</b> · ${esc(w.ko)}</span><button class="btn ghost" data-a="sayW" data-i="${i}">🔊</button><button class="btn danger" data-a="delW" data-i="${i}">삭제</button></div>`).join('') || '<p class="desc">아직 추가한 단어가 없어요.</p>'}
        ${weak.length ? `<h3 style="margin-top:20px;font-size:20px">🔎 더 연습이 필요한 단어</h3><p class="desc">게임에서 자주 틀린 단어예요. 자동으로 더 자주 출제됩니다.</p>${weak.map(x => `<span class="chip" style="display:inline-flex;margin:4px;font-size:16px;box-shadow:none;background:#f8f3fd">${esc(x.w)} ${Math.round(x.r * 100)}%</span>`).join('')}` : ''}
      </div>

      <div class="panel"><h3>📺 즐겨찾기 영상</h3>
        <p class="desc">유튜브에서 '공유 → 링크 복사' 후 붙여넣으세요. 앱 안에서 바로 재생되고 수업 후 추천에 먼저 나와요.</p>
        <div class="row"><input id="vt" type="text" placeholder="제목 (예: 페파피그 - 진흙탕)" style="flex:1"></div>
        <div class="row"><input id="vu" type="url" placeholder="https://youtu.be/..." style="flex:1"><select id="vcat"><option value="story">동화·영상</option><option value="song">노래</option></select><button class="btn" data-a="addV">추가</button></div>
        ${S.favVideos.map((v, i) => `<div class="list-item"><span class="pic">${v.cat === 'song' ? '🎵' : '⭐'}</span><span class="grow">${esc(v.title)}</span><button class="btn ghost" data-a="playV" data-i="${i}">▶️</button><button class="btn danger" data-a="delV" data-i="${i}">삭제</button></div>`).join('') || '<p class="desc">아직 등록된 영상이 없어요.</p>'}
      </div>
    </div>

    <div class="panel"><h3>📺 영상 가이드</h3>
      <p class="desc">앱의 영상은 모두 <b>공식 채널</b>(Super Simple Songs, Super Simple ABCs, Peppa Pig Official, Pinkfong) 영상만 골라 <b>수업 주제에 맞춰</b> 연결했어요. 앱 안에서 재생되고, 끝나면 제니에게 돌아와요. (광고 노출 여부는 유튜브가 정해요.)</p>
      <div class="parent-grid">${['peppa', 'bluey'].map(k => { const g = WATCH_GUIDE[k]; return `<div><b>${k === 'peppa' ? '🐷 페파피그' : '🐶 블루이'}</b> — <span class="desc" style="margin:0">${g.when}</span><p class="desc" style="margin:6px 0">${g.why}</p>
        <div>${g.titles.map(t => `<span class="chip" style="display:inline-flex;margin:3px;font-size:14px;box-shadow:none;background:#F1EEFC;padding:6px 10px">${esc(t)}</span>`).join('')}</div></div>`; }).join('')}</div>
      <p class="desc" style="margin-top:14px"><b>보는 법</b>: 꼭 영어 원판으로 · 같은 편을 여러 번 · 하루 1~2편 · 처음엔 옆에서 같이 보며 "Look! Muddy puddles!"처럼 한마디씩.<br>
      <b>유튜브 키즈를 쓸 때</b>: 부모 설정(자물쇠) → 아이 프로필 → 콘텐츠 설정을 <b>"승인된 콘텐츠만"</b>으로 바꾸고 위 채널만 허용하면 다른 영상으로 빠지지 않아요. 좋은 에피소드를 찾으면 아래 '즐겨찾기 영상'에 링크를 넣어 주세요.</p></div>

    <div class="panel"><h3>💾 데이터</h3>
      <p class="desc">학습 기록은 이 아이패드에만 저장돼요. 가끔 백업해 두면 안전해요.</p>
      <div class="row"><button class="btn" data-a="export">백업 파일 저장</button><label class="btn ghost">백업 불러오기<input id="imp" type="file" accept="application/json,.json" hidden></label>
      <button class="btn danger" data-a="reset">전체 초기화</button></div></div>
    <div style="height:20px"></div>`, {
    home: () => showHome(),
    setDay: () => { S.dayIndex = +$('#daySel').value; S.lastLessonIdx = null; today().lesson = false; save(); toast('진도를 변경했어요'); showParent(); },
    test: () => { S.settings.voiceURI = $('#vc').value; S.settings.rate = +$('#rt').value; say(`Hi ${$('#pne').value || 'friend'}! I am Jenny. A, B, C. Apple!`); },
    saveSet: () => {
      Object.assign(S.settings, { timeLimit: +$('#tl').value, rate: +$('#rt').value, voiceURI: $('#vc').value, showKorean: $('#sk').checked, useMic: $('#mic').checked, oneLessonPerDay: $('#oneDay').checked });
      S.childName = $('#pn').value.trim() || S.childName; S.childNameEn = $('#pne').value.trim(); S.settingsAt = Date.now(); save(); toast('저장했어요');
    },
    addW: async () => {
      const w = $('#cw').value.trim(), ko = $('#ck').value.trim(), e = $('#ce').value.trim();
      if (!w) return toast('영어 단어를 입력해 주세요');
      const f = $('#cp').files[0];
      let img = null;
      if (f) { try { img = await readImage(f); } catch (err) { return toast('사진을 불러오지 못했어요'); } }
      S.customWords.push({ w, ko, e: e || '💝', img }); S.listsAt = Date.now(); save(); say(w); showParent();
    },
    sayW: (b) => say(S.customWords[+b.dataset.i].w),
    delW: (b) => { S.customWords.splice(+b.dataset.i, 1); S.listsAt = Date.now(); save(); showParent(); },
    addV: () => {
      const id = ytId($('#vu').value);
      if (!id) return toast('유튜브 링크를 확인해 주세요');
      S.favVideos.push({ title: $('#vt').value.trim() || '추천 영상', yt: id, cat: $('#vcat').value }); S.listsAt = Date.now(); save(); showParent();
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
  document.body.classList.add('parent-mode');
  app.querySelectorAll('[data-sch]').forEach(c => c.addEventListener('change', () => { S.settings.schedule[c.dataset.sch][+c.dataset.d] = c.checked ? 1 : 0; S.settingsAt = Date.now(); save(); }));
  $('#cp').addEventListener('change', (e) => { $('#cpn').textContent = e.target.files[0] ? '사진 선택됨 ✓' : ''; });
  $('#imp').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const d = JSON.parse(await f.text()); if (!d || typeof d !== 'object' || !('stars' in d)) throw 0; localStorage.setItem(KEY, JSON.stringify(d)); S = load(); toast('불러왔어요'); showParent(); }
    catch (err) { toast('백업 파일이 올바르지 않아요'); }
  });
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
function onSyncChanged() { if (onHome) showHome(); }
showHome();
if (S.sync && S.sync.code) syncNow().then(r => { if (r.changed) onSyncChanged(); });
