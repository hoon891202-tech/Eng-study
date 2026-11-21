/* =========================================================
   제니의 영어나라 - 학습 데이터
   새 단원/단어를 추가하려면 이 파일만 수정하면 됩니다.
   ========================================================= */

// 유튜브 검색 링크 (영상이 삭제돼도 항상 동작하도록 검색 결과로 연결)
const yt = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);

/* ---------- 1. 알파벳 A–Z ---------- */
// name: 글자 이름(한글), sound: TTS용 소리, ipa: 표기, soundKo: 한글 근사 발음
const ALPHABET = [
  { L: 'A', name: '에이', sound: 'ah', ipa: '/æ/', soundKo: '애', words: [['apple', '🍎', '사과'], ['ant', '🐜', '개미'], ['alligator', '🐊', '악어']] },
  { L: 'B', name: '비', sound: 'buh', ipa: '/b/', soundKo: '브', words: [['ball', '⚽', '공'], ['banana', '🍌', '바나나'], ['bear', '🐻', '곰']] },
  { L: 'C', name: '씨', sound: 'kuh', ipa: '/k/', soundKo: '크', words: [['cat', '🐱', '고양이'], ['car', '🚗', '자동차'], ['cake', '🎂', '케이크']] },
  { L: 'D', name: '디', sound: 'duh', ipa: '/d/', soundKo: '드', words: [['dog', '🐶', '강아지'], ['duck', '🦆', '오리'], ['donut', '🍩', '도넛']] },
  { L: 'E', name: '이', sound: 'eh', ipa: '/e/', soundKo: '에', words: [['egg', '🥚', '달걀'], ['elephant', '🐘', '코끼리'], ['envelope', '✉️', '편지봉투']] },
  { L: 'F', name: '에프', sound: 'fff', ipa: '/f/', soundKo: '프', words: [['fish', '🐟', '물고기'], ['frog', '🐸', '개구리'], ['flower', '🌸', '꽃']] },
  { L: 'G', name: '쥐', sound: 'guh', ipa: '/g/', soundKo: '그', words: [['goat', '🐐', '염소'], ['grapes', '🍇', '포도'], ['gift', '🎁', '선물']] },
  { L: 'H', name: '에이치', sound: 'huh', ipa: '/h/', soundKo: '흐', words: [['hat', '🎩', '모자'], ['horse', '🐴', '말'], ['house', '🏠', '집']] },
  { L: 'I', name: '아이', sound: 'ih', ipa: '/ɪ/', soundKo: '이', words: [['insect', '🐛', '곤충'], ['ice cream', '🍦', '아이스크림'], ['island', '🏝️', '섬']] },
  { L: 'J', name: '제이', sound: 'juh', ipa: '/dʒ/', soundKo: '쥬', words: [['juice', '🧃', '주스'], ['jellyfish', '🪼', '해파리'], ['jacket', '🧥', '재킷']] },
  { L: 'K', name: '케이', sound: 'kuh', ipa: '/k/', soundKo: '크', words: [['kite', '🪁', '연'], ['koala', '🐨', '코알라'], ['key', '🔑', '열쇠']] },
  { L: 'L', name: '엘', sound: 'lll', ipa: '/l/', soundKo: '르', words: [['lion', '🦁', '사자'], ['lemon', '🍋', '레몬'], ['leaf', '🍃', '나뭇잎']] },
  { L: 'M', name: '엠', sound: 'mmm', ipa: '/m/', soundKo: '음', words: [['monkey', '🐵', '원숭이'], ['moon', '🌙', '달'], ['milk', '🥛', '우유']] },
  { L: 'N', name: '엔', sound: 'nnn', ipa: '/n/', soundKo: '은', words: [['nose', '👃', '코'], ['nest', '🪺', '둥지'], ['nut', '🥜', '땅콩']] },
  { L: 'O', name: '오', sound: 'aw', ipa: '/ɑ/', soundKo: '아', words: [['octopus', '🐙', '문어'], ['orange', '🍊', '오렌지'], ['owl', '🦉', '부엉이']] },
  { L: 'P', name: '피', sound: 'puh', ipa: '/p/', soundKo: '프', words: [['pig', '🐷', '돼지'], ['panda', '🐼', '판다'], ['pizza', '🍕', '피자']] },
  { L: 'Q', name: '큐', sound: 'kwuh', ipa: '/kw/', soundKo: '쿠', words: [['queen', '👸', '여왕'], ['quiet', '🤫', '쉿, 조용히'], ['question', '❓', '질문']] },
  { L: 'R', name: '알', sound: 'rrr', ipa: '/r/', soundKo: '르', words: [['rabbit', '🐰', '토끼'], ['rainbow', '🌈', '무지개'], ['robot', '🤖', '로봇']] },
  { L: 'S', name: '에스', sound: 'sss', ipa: '/s/', soundKo: '스', words: [['sun', '☀️', '해'], ['star', '⭐', '별'], ['snake', '🐍', '뱀']] },
  { L: 'T', name: '티', sound: 'tuh', ipa: '/t/', soundKo: '트', words: [['tiger', '🐯', '호랑이'], ['tree', '🌳', '나무'], ['train', '🚂', '기차']] },
  { L: 'U', name: '유', sound: 'uh', ipa: '/ʌ/', soundKo: '어', words: [['umbrella', '☂️', '우산'], ['up', '⬆️', '위로'], ['unicorn', '🦄', '유니콘']] },
  { L: 'V', name: '브이', sound: 'vvv', ipa: '/v/', soundKo: '브', words: [['van', '🚐', '승합차'], ['violin', '🎻', '바이올린'], ['volcano', '🌋', '화산']] },
  { L: 'W', name: '더블유', sound: 'wuh', ipa: '/w/', soundKo: '워', words: [['whale', '🐳', '고래'], ['watermelon', '🍉', '수박'], ['worm', '🪱', '지렁이']] },
  { L: 'X', name: '엑스', sound: 'ks', ipa: '/ks/', soundKo: '크스', words: [['fox', '🦊', '여우'], ['box', '📦', '상자'], ['x-ray', '🩻', '엑스레이']] },
  { L: 'Y', name: '와이', sound: 'yuh', ipa: '/j/', soundKo: '이', words: [['yo-yo', '🪀', '요요'], ['yellow', '💛', '노란색'], ['yarn', '🧶', '털실']] },
  { L: 'Z', name: '지', sound: 'zzz', ipa: '/z/', soundKo: '즈', words: [['zebra', '🦓', '얼룩말'], ['zero', '0️⃣', '영, 숫자 0'], ['zoo', '🦒', '동물원']] },
];

/* ---------- 2. 주제별 단어 ---------- */
const THEMES = {
  hello:     { title: 'Hello!', ko: '인사하기', icon: '👋', song: 'Hello song for kids Super Simple Songs',
               words: [['hello', '👋', '안녕'], ['bye-bye', '🙋', '잘 가'], ['thank you', '🙏', '고마워'], ['good morning', '🌅', '좋은 아침'], ['good night', '🌙', '잘 자'], ['I love you', '❤️', '사랑해']] },
  colors:    { title: 'Colors', ko: '색깔', icon: '🎨', song: 'color song for kids Super Simple Songs',
               words: [['red', '🔴', '빨간색'], ['blue', '🔵', '파란색'], ['yellow', '🟡', '노란색'], ['green', '🟢', '초록색'], ['orange', '🟠', '주황색'], ['purple', '🟣', '보라색'], ['pink', '🩷', '분홍색'], ['white', '⚪', '하얀색']] },
  numbers:   { title: 'Numbers', ko: '숫자 1–10', icon: '🔢', song: 'counting 1 to 10 song for kids',
               words: [['one', '1️⃣', '하나'], ['two', '2️⃣', '둘'], ['three', '3️⃣', '셋'], ['four', '4️⃣', '넷'], ['five', '5️⃣', '다섯'], ['six', '6️⃣', '여섯'], ['seven', '7️⃣', '일곱'], ['eight', '8️⃣', '여덟'], ['nine', '9️⃣', '아홉'], ['ten', '🔟', '열']] },
  animals:   { title: 'Farm Animals', ko: '농장 동물', icon: '🐮', song: 'Old MacDonald had a farm song',
               words: [['cow', '🐮', '소'], ['pig', '🐷', '돼지'], ['sheep', '🐑', '양'], ['chicken', '🐔', '닭'], ['duck', '🦆', '오리'], ['horse', '🐴', '말']] },
  fruits:    { title: 'Fruits', ko: '과일', icon: '🍓', song: 'Apples and bananas song kids',
               words: [['apple', '🍎', '사과'], ['banana', '🍌', '바나나'], ['strawberry', '🍓', '딸기'], ['grapes', '🍇', '포도'], ['watermelon', '🍉', '수박'], ['peach', '🍑', '복숭아']] },
  body:      { title: 'My Body', ko: '몸', icon: '🙆', song: 'Head shoulders knees and toes song',
               words: [['eyes', '👀', '눈'], ['ears', '👂', '귀'], ['nose', '👃', '코'], ['mouth', '👄', '입'], ['hands', '🙌', '손'], ['feet', '🦶', '발']] },
  family:    { title: 'My Family', ko: '가족', icon: '👨‍👩‍👧', song: 'Finger family song',
               words: [['mommy', '👩', '엄마'], ['daddy', '👨', '아빠'], ['baby', '👶', '아기'], ['grandma', '👵', '할머니'], ['grandpa', '👴', '할아버지'], ['me', '👧', '나']] },
  feelings:  { title: 'Feelings', ko: '기분', icon: '😊', song: "If you're happy and you know it song",
               words: [['happy', '😊', '기뻐요'], ['sad', '😢', '슬퍼요'], ['angry', '😠', '화나요'], ['sleepy', '😴', '졸려요'], ['hungry', '😋', '배고파요'], ['scared', '😨', '무서워요']] },
  shapes:    { title: 'Shapes', ko: '모양', icon: '🔺', song: 'shapes song for kids',
               words: [['circle', '🔵', '동그라미'], ['square', '🟥', '네모'], ['triangle', '🔺', '세모'], ['star', '⭐', '별'], ['heart', '❤️', '하트'], ['diamond', '🔷', '마름모']] },
  vehicles:  { title: 'Things That Go', ko: '탈것', icon: '🚌', song: 'The wheels on the bus song',
               words: [['car', '🚗', '자동차'], ['bus', '🚌', '버스'], ['train', '🚂', '기차'], ['airplane', '✈️', '비행기'], ['boat', '⛵', '배'], ['bike', '🚲', '자전거'], ['truck', '🚚', '트럭']] },
  food:      { title: 'Yummy Food', ko: '음식', icon: '🍚', song: 'Do you like broccoli ice cream song',
               words: [['rice', '🍚', '밥'], ['bread', '🍞', '빵'], ['milk', '🥛', '우유'], ['water', '💧', '물'], ['cookie', '🍪', '쿠키'], ['cheese', '🧀', '치즈']] },
  clothes:   { title: 'Clothes', ko: '옷', icon: '👕', song: 'Put on your shoes song Super Simple',
               words: [['shirt', '👕', '셔츠'], ['pants', '👖', '바지'], ['dress', '👗', '원피스'], ['shoes', '👟', '신발'], ['socks', '🧦', '양말'], ['cap', '🧢', '모자']] },
  weather:   { title: 'Weather', ko: '날씨', icon: '🌦️', song: "How's the weather song for kids",
               words: [['sunny', '☀️', '맑아요'], ['rainy', '🌧️', '비가 와요'], ['snowy', '❄️', '눈이 와요'], ['cloudy', '☁️', '흐려요'], ['windy', '🌬️', '바람이 불어요'], ['hot', '🥵', '더워요'], ['cold', '🥶', '추워요']] },
  actions:   { title: 'Let\'s Move', ko: '움직여요', icon: '🏃', song: 'Walking walking song Super Simple',
               words: [['run', '🏃', '달려요'], ['jump', '🦘', '뛰어요'], ['eat', '🍽️', '먹어요'], ['sleep', '😴', '자요'], ['sing', '🎤', '노래해요'], ['dance', '💃', '춤춰요'], ['clap', '👏', '박수쳐요']] },
  toys:      { title: 'Toys & Home', ko: '장난감과 집', icon: '🧸', song: 'Clean up song for kids',
               words: [['teddy bear', '🧸', '곰인형'], ['ball', '⚽', '공'], ['book', '📚', '책'], ['blocks', '🧱', '블록'], ['bed', '🛏️', '침대'], ['chair', '🪑', '의자']] },
  nature:    { title: 'Nature', ko: '자연', icon: '🌳', song: 'Twinkle twinkle little star song',
               words: [['sun', '☀️', '해'], ['moon', '🌙', '달'], ['star', '⭐', '별'], ['tree', '🌳', '나무'], ['flower', '🌸', '꽃'], ['cloud', '☁️', '구름'], ['rainbow', '🌈', '무지개']] },
  sea:       { title: 'Under the Sea', ko: '바다 친구', icon: '🐠', song: 'Baby shark song English',
               words: [['fish', '🐟', '물고기'], ['shark', '🦈', '상어'], ['whale', '🐳', '고래'], ['octopus', '🐙', '문어'], ['crab', '🦀', '게'], ['turtle', '🐢', '거북이']] },
  opposites: { title: 'Opposites', ko: '반대말', icon: '↕️', song: 'opposites song for kids',
               words: [['big', '🐘', '커요'], ['small', '🐭', '작아요'], ['up', '⬆️', '위'], ['down', '⬇️', '아래'], ['hot', '🔥', '뜨거워요'], ['cold', '🧊', '차가워요']] },
};

/* ---------- 3. 간단한 문장 ---------- */
const SENTENCES = {
  like:  { title: 'I like ___', ko: '나는 ___ 좋아해', icon: '💖', song: 'Do you like broccoli ice cream song',
           items: [['I like apples.', '🍎', '나는 사과를 좋아해.', 'apple'], ['I like bananas.', '🍌', '나는 바나나를 좋아해.', 'banana'], ['I like cookies.', '🍪', '나는 쿠키를 좋아해.', 'cookie'], ['I like milk.', '🥛', '나는 우유를 좋아해.', 'milk']] },
  this:  { title: 'This is a ___', ko: '이건 ___야', icon: '👉', song: 'What is this song for kids',
           items: [['This is a cat.', '🐱', '이건 고양이야.', 'cat'], ['This is a dog.', '🐶', '이건 강아지야.', 'dog'], ['This is a ball.', '⚽', '이건 공이야.', 'ball'], ['This is a car.', '🚗', '이건 자동차야.', 'car']] },
  color: { title: 'What color is it?', ko: '무슨 색이야?', icon: '🎨', song: 'What color is it song kids',
           items: [['It is red.', '🍎', '빨간색이야.', 'red'], ['It is yellow.', '🍌', '노란색이야.', 'yellow'], ['It is green.', '🐸', '초록색이야.', 'green'], ['It is blue.', '🐳', '파란색이야.', 'blue']] },
  feel:  { title: 'How are you?', ko: '기분이 어때?', icon: '😊', song: 'How are you song for kids',
           items: [['I am happy.', '😊', '나는 기뻐.', 'happy'], ['I am sleepy.', '😴', '나는 졸려.', 'sleepy'], ['I am hungry.', '😋', '나는 배고파.', 'hungry'], ['I am sad.', '😢', '나는 슬퍼.', 'sad']] },
  want:  { title: 'I want ___, please', ko: '___ 주세요', icon: '🙏', song: 'please and thank you song kids',
           items: [['Water, please.', '💧', '물 주세요.', 'water'], ['Juice, please.', '🧃', '주스 주세요.', 'juice'], ['More, please.', '🙌', '더 주세요.', 'more'], ['Help, please.', '🤝', '도와주세요.', 'help']] },
  where: { title: 'Where is ___?', ko: '___ 어디 있어?', icon: '🔍', song: 'Where is Thumbkin song',
           items: [['Where is the bunny? Here it is!', '🐰', '토끼 어디 있어? 여기 있다!', 'bunny'], ['Where is the duck? Here it is!', '🦆', '오리 어디 있어? 여기 있다!', 'duck'], ['Where is the star? Here it is!', '⭐', '별 어디 있어? 여기 있다!', 'star'], ['Where is the car? Here it is!', '🚗', '자동차 어디 있어? 여기 있다!', 'car']] },
  many:  { title: 'How many?', ko: '몇 개야?', icon: '🖐️', song: 'How many fingers song kids',
           items: [['One apple.', '🍎', '사과 한 개.', 'one'], ['Two ducks.', '🦆🦆', '오리 두 마리.', 'two'], ['Three stars.', '⭐⭐⭐', '별 세 개.', 'three'], ['Four balls.', '⚽⚽⚽⚽', '공 네 개.', 'four']] },
  can:   { title: 'I can ___!', ko: '나는 ___ 할 수 있어!', icon: '💪', song: 'I can run song for kids',
           items: [['I can jump!', '🦘', '나는 점프할 수 있어!', 'jump'], ['I can run!', '🏃', '나는 달릴 수 있어!', 'run'], ['I can sing!', '🎤', '나는 노래할 수 있어!', 'sing'], ['I can dance!', '💃', '나는 춤출 수 있어!', 'dance']] },
};

/* ---------- 커리큘럼 (Day 0부터 계속 늘어남) ---------- */
function buildCurriculum() {
  const days = [];
  days.push({ type: 'theme', key: 'hello', stage: 0 });               // Day 0: 제니 만나기
  ALPHABET.forEach((a, i) => {                                          // Stage 1: 알파벳
    days.push({ type: 'letter', key: a.L, stage: 1 });
    if ((i + 1) % 5 === 0 || i === 25) {
      const from = i === 25 ? 21 : i - 4; // 마지막 복습은 V–Z
      days.push({ type: 'review', letters: ALPHABET.slice(from, i + 1).map(x => x.L), stage: 1 });
    }
  });
  Object.keys(THEMES).filter(k => k !== 'hello')                       // Stage 2: 주제 단어
    .forEach(k => days.push({ type: 'theme', key: k, stage: 2 }));
  Object.keys(SENTENCES).forEach(k => days.push({ type: 'sentence', key: k, stage: 3 })); // Stage 3: 문장
  return days;
}
const CURRICULUM = buildCurriculum();
const STAGES = [
  { n: 0, title: 'Hello, Jenny!', ko: '제니 만나기' },
  { n: 1, title: 'ABC Land', ko: '알파벳 나라' },
  { n: 2, title: 'Word Forest', ko: '단어 숲' },
  { n: 3, title: 'Talking Town', ko: '말하기 마을' },
  { n: 4, title: 'Rainbow Review', ko: '무지개 복습 (계속)' },
];

/* ---------- 영상 추천 ---------- */
const VIDEOS = {
  songs: [
    { t: 'ABC Song', ko: '알파벳 노래', e: '🔤', q: 'ABC song for kids Super Simple Songs' },
    { t: 'Phonics Song', ko: '파닉스 노래', e: '🅰️', q: 'phonics song for toddlers' },
    { t: 'Alphablocks', ko: '알파블럭스', e: '🧱', q: 'Alphablocks official' },
    { t: 'Super Simple Songs', ko: '슈퍼 심플 송', e: '🎵', q: 'Super Simple Songs' },
    { t: 'Pinkfong English', ko: '핑크퐁 영어동요', e: '🦈', q: 'Pinkfong English songs for kids' },
    { t: 'Numberblocks', ko: '넘버블럭스', e: '🔢', q: 'Numberblocks official' },
  ],
  stories: [
    { t: 'Peppa Pig', ko: '페파피그', e: '🐷', q: 'Peppa Pig Official Channel full episodes' },
    { t: 'Bluey', ko: '블루이', e: '🐶', q: 'Bluey Official Channel full episodes' },
    { t: 'Hey Duggee', ko: '헤이 더기', e: '🐻', q: 'Hey Duggee official' },
    { t: 'Maisy Mouse', ko: '메이지', e: '🐭', q: 'Maisy Mouse official full episodes' },
    { t: 'Brown Bear, Brown Bear', ko: '그림책 읽기', e: '🐻', q: 'Brown Bear Brown Bear What Do You See read aloud' },
    { t: 'The Very Hungry Caterpillar', ko: '배고픈 애벌레', e: '🐛', q: 'The Very Hungry Caterpillar read aloud' },
    { t: 'Dear Zoo', ko: '디어 주', e: '🦁', q: 'Dear Zoo read aloud' },
    { t: "Where's Spot?", ko: '스팟 어디 있니', e: '🐕', q: "Where's Spot read aloud" },
    { t: 'Goodnight Moon', ko: '잘 자요 달님', e: '🌙', q: 'Goodnight Moon read aloud' },
    { t: 'Pete the Cat', ko: '피트 더 캣', e: '🐱', q: 'Pete the Cat I love my white shoes read aloud' },
  ],
};

/* ---------- 스티커 (보상) ---------- */
const STICKERS = ['🐰', '🥕', '🌈', '⭐', '🦄', '🍓', '🎈', '🌸', '🐣', '🍭', '🦋', '🐳', '🍩', '🌻', '🐼',
  '🚀', '🎀', '🐞', '🍉', '🦁', '🐧', '🌟', '🧁', '🐬', '🍒', '🦊', '🎂', '🐨', '🌙', '👑',
  '🐙', '🍦', '🦒', '🐠', '🎠', '🪅', '🌷', '🐝', '🦖', '🏰'];

/* ---------- 요일별 활동 ---------- */
// days: [일,월,화,수,목,금,토]
const ACTIVITIES = {
  lesson:  { ko: '오늘의 수업', en: "Today's Lesson", icon: '📖', days: [1, 1, 1, 1, 1, 1, 1] },
  abc:     { ko: '알파벳', en: 'ABC', icon: '🔤', days: [0, 1, 0, 1, 0, 1, 0] },
  trace:   { ko: '따라쓰기', en: 'Tracing', icon: '✏️', days: [0, 1, 0, 1, 0, 1, 0] },
  game:    { ko: '게임 놀이', en: 'Games', icon: '🎮', days: [0, 0, 1, 0, 1, 0, 1] },
  mywords: { ko: '우리 단어', en: 'My Words', icon: '💝', days: [0, 0, 1, 0, 1, 0, 0] },
  review:  { ko: '복습', en: 'Review', icon: '🔁', days: [0, 0, 0, 0, 0, 0, 1] },
  song:    { ko: '노래 시간', en: 'Songs', icon: '🎵', days: [1, 1, 0, 1, 0, 1, 0] },
  story:   { ko: '동화·영상', en: 'Stories', icon: '📺', days: [1, 1, 1, 1, 1, 1, 1] },
};
