/* 디자인 시안 공용: 제니 + 자체 제작 SVG 아이콘 (이모지 대체용) */
function jenny(size = 180) {
  return `<svg width="${size}" height="${size * 1.15}" viewBox="0 -12 200 232" aria-label="제니">
  <g><ellipse cx="72" cy="44" rx="21" ry="54" fill="#fff" stroke="#e6dcef" stroke-width="3"/><ellipse cx="72" cy="50" rx="10" ry="38" fill="#ffc6da"/></g>
  <g><ellipse cx="128" cy="44" rx="21" ry="54" fill="#fff" stroke="#e6dcef" stroke-width="3"/><ellipse cx="128" cy="50" rx="10" ry="38" fill="#ffc6da"/></g>
  <ellipse cx="100" cy="198" rx="48" ry="26" fill="#fff" stroke="#e6dcef" stroke-width="3"/>
  <ellipse cx="100" cy="134" rx="64" ry="57" fill="#fff" stroke="#e6dcef" stroke-width="3"/>
  <g transform="translate(132 88) rotate(12)"><path d="M0 0 L-22 -13 Q-26 0 -22 13 Z" fill="#ff7eb0"/><path d="M0 0 L22 -13 Q26 0 22 13 Z" fill="#ff7eb0"/><circle r="7" fill="#ff5a98"/></g>
  <ellipse cx="78" cy="126" rx="8.5" ry="11" fill="#3b2b4d"/><ellipse cx="122" cy="126" rx="8.5" ry="11" fill="#3b2b4d"/><circle cx="81.5" cy="121" r="3.4" fill="#fff"/><circle cx="125.5" cy="121" r="3.4" fill="#fff"/>
  <ellipse cx="62" cy="150" rx="12" ry="7.5" fill="#ffbfd5" opacity=".85"/><ellipse cx="138" cy="150" rx="12" ry="7.5" fill="#ffbfd5" opacity=".85"/>
  <path d="M93 141 Q100 136 107 141 Q100 149 93 141 Z" fill="#ff86ad"/>
  <path d="M89 153 Q94.5 160 100 153 Q105.5 160 111 153" fill="none" stroke="#3b2b4d" stroke-width="3.2" stroke-linecap="round"/>
  <ellipse cx="76" cy="203" rx="13" ry="9" fill="#fff" stroke="#e6dcef" stroke-width="3"/><ellipse cx="124" cy="203" rx="13" ry="9" fill="#fff" stroke="#e6dcef" stroke-width="3"/>
</svg>`;
}

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

// 시안 공통 데이터
const MOCK = {
  name: 'Nahyun', day: 1, stage: 'Listening Land', lessonKo: '제니의 아침', lessonEn: "Jenny's Morning", level: 1, stars: 20, toNext: 5, streak: 3,
  tiles: [
    ['listen', '듣기 시간', 'Listening', true], ['book', '그림책', 'Storybook', true], ['talk', '제니와 대화', 'Talk', false],
    ['game', '게임', 'Games', false], ['heart', '우리 단어', 'My Words', false], ['review', '복습', 'Review', false],
    ['song', '노래', 'Songs', false], ['video', '영상', 'Videos', true], ['abc', '알파벳', 'ABC', false], ['sticker', '스티커북', 'Stickers', false],
  ],
  week: ['일', '월', '화', '수', '목', '금', '토'], done: [1, 1, 1, 0, 0, 0, 0], todayIdx: 3,
};
