/* 제니의 마을 아이콘 세트 (자체 제작 SVG) — design/shared.js 시안에서 가져옴 */
// 64×64 아이콘. c = 메인 색, d = 진한 색, l = 밝은 색
const ICON_PATHS = {
  listen: (c, d, l) => `<path d="M12 36 V30 a20 20 0 0 1 40 0 V36" fill="none" stroke="${d}" stroke-width="6" stroke-linecap="round"/>
    <rect x="8" y="32" width="14" height="22" rx="7" fill="${c}"/><rect x="42" y="32" width="14" height="22" rx="7" fill="${c}"/>
    <rect x="12" y="36" width="5" height="14" rx="2.5" fill="${l}"/><rect x="47" y="36" width="5" height="14" rx="2.5" fill="${l}"/>`,
  book: (c, d, l) => `<path d="M32 18 C24 12 14 12 6 14 V50 C14 48 24 48 32 54 Z" fill="${c}"/><path d="M32 18 C40 12 50 12 58 14 V50 C50 48 40 48 32 54 Z" fill="${d}"/>
    <path d="M12 22 C18 21 23 22 27 24 M12 30 C18 29 23 30 27 32 M12 38 C18 37 23 38 27 40" stroke="${l}" stroke-width="3" stroke-linecap="round" fill="none"/>`,
  talk: (c, d, l) => `<path d="M10 16 h44 a6 6 0 0 1 6 6 v20 a6 6 0 0 1 -6 6 H30 l-12 10 v-10 h-8 a6 6 0 0 1 -6 -6 V22 a6 6 0 0 1 6 -6Z" fill="${c}"/>
    <circle cx="20" cy="32" r="4.5" fill="${l}"/><circle cx="32" cy="32" r="4.5" fill="${l}"/><circle cx="44" cy="32" r="4.5" fill="${l}"/>`,
  game: (c, d, l) => `<path d="M16 20 h32 a12 12 0 0 1 12 12 v6 a10 10 0 0 1 -18 6 l-3 -4 h-14 l-3 4 a10 10 0 0 1 -18 -6 v-6 a12 12 0 0 1 12 -12Z" fill="${c}"/>
    <rect x="15" y="29" width="14" height="5" rx="2.5" fill="${l}"/><rect x="19.5" y="24.5" width="5" height="14" rx="2.5" fill="${l}"/>
    <circle cx="44" cy="28" r="3.6" fill="${d}"/><circle cx="50" cy="35" r="3.6" fill="${l}"/>`,
  heart: (c, d, l) => `<path d="M32 54 C10 40 6 28 8 21 C11 11 25 9 32 20 C39 9 53 11 56 21 C58 28 54 40 32 54Z" fill="${c}"/>
    <path d="M16 22 C18 17 23 16 26 18" stroke="${l}" stroke-width="4" stroke-linecap="round" fill="none"/>`,
  review: (c, d, l) => `<path d="M50 26 A20 20 0 0 0 14 24" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/><path d="M42 24 L52 28 L54 17" fill="${c}"/>
    <path d="M14 38 A20 20 0 0 0 50 40" fill="none" stroke="${d}" stroke-width="7" stroke-linecap="round"/><path d="M22 40 L12 36 L10 47" fill="${d}"/>`,
  song: (c, d, l) => `<path d="M24 46 V16 L50 10 V40" fill="none" stroke="${d}" stroke-width="6" stroke-linejoin="round"/>
    <ellipse cx="18" cy="47" rx="9" ry="7" fill="${c}"/><ellipse cx="44" cy="41" rx="9" ry="7" fill="${c}"/>`,
  video: (c, d, l) => `<rect x="6" y="14" width="52" height="36" rx="9" fill="${c}"/><path d="M27 23 L41 32 L27 41Z" fill="${l}"/><rect x="22" y="53" width="20" height="5" rx="2.5" fill="${d}"/>`,
  abc: (c, d, l) => `<rect x="4" y="30" width="20" height="20" rx="5" fill="${c}"/><rect x="22" y="12" width="20" height="20" rx="5" fill="${d}"/><rect x="40" y="30" width="20" height="20" rx="5" fill="${c}"/>
    <text x="14" y="46" font-family="Fredoka,sans-serif" font-weight="700" font-size="15" text-anchor="middle" fill="${l}">A</text>
    <text x="32" y="28" font-family="Fredoka,sans-serif" font-weight="700" font-size="15" text-anchor="middle" fill="${l}">B</text>
    <text x="50" y="46" font-family="Fredoka,sans-serif" font-weight="700" font-size="15" text-anchor="middle" fill="${l}">C</text>`,
  sticker: (c, d, l) => `<path d="M32 6 L39.5 22 L57 24 L44 36 L47.5 53 L32 44.5 L16.5 53 L20 36 L7 24 L24.5 22Z" fill="${c}" stroke="${d}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M24 28 L28 27" stroke="${l}" stroke-width="3" stroke-linecap="round"/>`,
  sun: (c, d, l) => `${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<rect x="30" y="2" width="4" height="10" rx="2" fill="${d}" transform="rotate(${a} 32 32)"/>`).join('')}
    <circle cx="32" cy="32" r="16" fill="${c}"/><circle cx="26" cy="27" r="4" fill="${l}"/>`,
  carrot: (c, d, l) => `<path d="M40 22 L14 56 Q10 58 12 52 L34 18Z" fill="${c}"/><path d="M36 20 Q38 6 46 6 Q44 14 40 18 Q50 12 56 16 Q48 22 42 24Z" fill="${d}"/>
    <path d="M22 44 L26 46 M28 36 L32 38" stroke="${l}" stroke-width="2.5" stroke-linecap="round"/>`,
  play: (c, d, l) => `<path d="M22 14 L50 32 L22 50Z" fill="${c}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/>`,
  gear: (c, d, l) => `<circle cx="32" cy="32" r="14" fill="none" stroke="${c}" stroke-width="8"/>${[0, 60, 120, 180, 240, 300].map(a => `<rect x="28" y="6" width="8" height="10" rx="2" fill="${c}" transform="rotate(${a} 32 32)"/>`).join('')}`,
};
function icon(name, size = 56, c = '#FF6B8A', d = '#E0466A', l = '#FFFFFF') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${ICON_PATHS[name](c, d, l)}</svg>`;
}


// 화면 조작용 아이콘 (단색: c)
Object.assign(ICON_PATHS, {
  home: (c, d) => `<path d="M10 30 L32 11 L54 30" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 30 V52 a4 4 0 0 0 4 4 H44 a4 4 0 0 0 4 -4 V30" fill="${c}"/><rect x="27" y="40" width="10" height="16" rx="3" fill="${d}"/>`,
  arrowR: (c) => `<path d="M12 32 H50 M34 16 L50 32 L34 48" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`,
  arrowL: (c) => `<path d="M52 32 H14 M30 16 L14 32 L30 48" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`,
  speaker: (c) => `<path d="M10 24 H20 L34 12 V52 L20 40 H10Z" fill="${c}" stroke="${c}" stroke-width="3" stroke-linejoin="round"/><path d="M42 22 Q48 32 42 42 M48 15 Q58 32 48 49" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`,
  mic: (c) => `<rect x="22" y="6" width="20" height="34" rx="10" fill="${c}"/><path d="M14 30 a18 18 0 0 0 36 0 M32 48 V58 M22 58 H42" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`,
  check: (c) => `<path d="M14 33 L27 46 L50 20" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
  replay: (c) => `<path d="M50 32 A18 18 0 1 1 44 18" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/><path d="M38 8 L50 16 L40 26Z" fill="${c}"/>`,
});
// 버튼 안 아이콘 (흰 버튼은 진한 색, 색 버튼은 흰색)
const ui = (name, color = '#fff', size = 46) => icon(name, size, color, 'rgba(0,0,0,.18)', '#fff');
// 활동 → 아이콘 이름 + 집 색 [벽, 지붕]
const HOUSE = {
  listen: ['listen', '#FF6B8A', '#E04A6C'], book: ['book', '#4DA8FF', '#2E86E0'], talk: ['talk', '#FFC23D', '#E9A10F'],
  game: ['game', '#3FC495', '#26A275'], mywords: ['heart', '#A07CF5', '#7C58DA'], review: ['review', '#FF6B8A', '#E04A6C'],
  song: ['song', '#4DA8FF', '#2E86E0'], story: ['video', '#FFC23D', '#E9A10F'], abc: ['abc', '#3FC495', '#26A275'], stickers: ['sticker', '#A07CF5', '#7C58DA'],
};
