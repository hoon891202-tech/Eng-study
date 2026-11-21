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

/* ---------- 제니 그림책 (자체 창작, 반복 패턴) ---------- */
// p: 페이지 [영어 문장, 한국어, [[그림, 단어], ...]] — 그림을 누르면 단어를 읽어줘요
const STORIES = [
  /* ---- 패턴 그림책 ---- */
  { id: 'carrot', title: 'Where Is My Carrot?', ko: '내 당근 어디 있지?', cover: '🥕', stage: 0, pattern: 'Is it ___? No! / Yes!',
    p: [['This is Jenny.', '이건 제니예요.', [['🐰', 'Jenny']]],
        ['Jenny is hungry. Where is my carrot?', '제니는 배가 고파요. 내 당근 어디 있지?', [['🐰', 'Jenny'], ['❓', 'where']]],
        ['Is it under the bed? No!', '침대 밑에 있나? 아니!', [['🛏️', 'bed']]],
        ['Is it in the box? No!', '상자 안에 있나? 아니!', [['📦', 'box']]],
        ['Is it on the chair? No!', '의자 위에 있나? 아니!', [['🪑', 'chair']]],
        ['Is it in the bag? Yes! Here it is!', '가방 안에 있나? 응! 여기 있다!', [['🎒', 'bag'], ['🥕', 'carrot']]],
        ['Crunch, crunch! Yummy!', '아삭아삭! 맛있다!', [['🐰', 'Jenny'], ['🥕', 'carrot'], ['😋', 'yummy']]]] },
  { id: 'farm', title: 'Hello, Farm!', ko: '안녕, 농장 친구들!', cover: '🐮', stage: 0, pattern: 'Hello, ___!',
    p: [['Jenny goes to the farm.', '제니가 농장에 가요.', [['🐰', 'Jenny'], ['🚜', 'tractor']]],
        ['Hello, Cow! Moo, moo!', '안녕, 소야! 음메 음메!', [['🐮', 'cow']]],
        ['Hello, Duck! Quack, quack!', '안녕, 오리야! 꽥꽥!', [['🦆', 'duck']]],
        ['Hello, Pig! Oink, oink!', '안녕, 돼지야! 꿀꿀!', [['🐷', 'pig']]],
        ['Hello, Sheep! Baa, baa!', '안녕, 양아! 매에 매에!', [['🐑', 'sheep']]],
        ['Hello, Dog! Woof, woof!', '안녕, 강아지야! 멍멍!', [['🐶', 'dog']]],
        ['Bye-bye, friends! See you!', '잘 있어, 친구들! 또 만나!', [['🐮', 'cow'], ['🦆', 'duck'], ['🐷', 'pig'], ['🐑', 'sheep'], ['🐶', 'dog']]]] },
  { id: 'morning', title: "Jenny's Morning", ko: '제니의 아침', cover: '☀️', stage: 1, pattern: '___, ___, ___ my ___.',
    p: [['Good morning, Jenny!', '좋은 아침, 제니!', [['☀️', 'sun'], ['🐰', 'Jenny']]],
        ['Wash, wash, wash my face.', '쓱쓱쓱 얼굴을 씻어요.', [['🧼', 'soap'], ['💧', 'water']]],
        ['Eat, eat, eat my breakfast.', '냠냠냠 아침을 먹어요.', [['🥣', 'cereal'], ['🥛', 'milk']]],
        ['Brush, brush, brush my teeth.', '치카치카 이를 닦아요.', [['🪥', 'toothbrush'], ['🦷', 'tooth']]],
        ['Put on, put on, put on my shoes.', '신발을 신어요.', [['👟', 'shoes']]],
        ["Let's go! Bye-bye, Mommy!", '가자! 엄마 다녀오겠습니다!', [['🎒', 'bag'], ['👩', 'mommy']]]] },
  { id: 'jump', title: 'I Can Jump!', ko: '나는 뛸 수 있어!', cover: '🐸', stage: 1, pattern: '___ can ___.',
    p: [['Frog can jump. Jump, jump, jump!', '개구리는 뛸 수 있어요. 폴짝폴짝!', [['🐸', 'frog']]],
        ['Fish can swim. Swim, swim, swim!', '물고기는 헤엄칠 수 있어요. 첨벙첨벙!', [['🐟', 'fish']]],
        ['Bird can fly. Fly, fly, fly!', '새는 날 수 있어요. 훨훨!', [['🐦', 'bird']]],
        ['Turtle can walk. Walk, walk, walk!', '거북이는 걸을 수 있어요. 엉금엉금!', [['🐢', 'turtle']]],
        ['And Jenny can hop! Hop, hop, hop!', '그리고 제니는 깡충 뛸 수 있어요!', [['🐰', 'Jenny']]],
        ['What can you do?', '너는 무엇을 할 수 있니?', [['👧', 'you'], ['🤸', 'jump']]]] },
  { id: 'color', title: 'What Color Is It?', ko: '무슨 색이야?', cover: '🎨', stage: 2, pattern: '___, ___. A ___ ___!',
    p: [['Jenny has a paint box.', '제니는 물감 상자가 있어요.', [['🎨', 'paint'], ['🐰', 'Jenny']]],
        ['Red, red. A red apple!', '빨강, 빨강. 빨간 사과!', [['🍎', 'apple'], ['🔴', 'red']]],
        ['Yellow, yellow. A yellow banana!', '노랑, 노랑. 노란 바나나!', [['🍌', 'banana'], ['🟡', 'yellow']]],
        ['Green, green. A green frog!', '초록, 초록. 초록 개구리!', [['🐸', 'frog'], ['🟢', 'green']]],
        ['Blue, blue. A blue whale!', '파랑, 파랑. 파란 고래!', [['🐳', 'whale'], ['🔵', 'blue']]],
        ['Look! A rainbow!', '봐! 무지개다!', [['🌈', 'rainbow']]]] },
  { id: 'yummy', title: 'One, Two, Yummy!', ko: '하나, 둘, 맛있다!', cover: '🍓', stage: 2, pattern: 'One ___. Two ___s.',
    p: [['Jenny goes shopping.', '제니가 장을 보러 가요.', [['🐰', 'Jenny'], ['🛒', 'cart']]],
        ['One carrot. Yummy!', '당근 한 개. 맛있다!', [['🥕', 'carrot']]],
        ['Two apples. Yummy!', '사과 두 개. 맛있다!', [['🍎', 'apple'], ['🍎', 'apple']]],
        ['Three bananas. Yummy!', '바나나 세 개. 맛있다!', [['🍌', 'banana'], ['🍌', 'banana'], ['🍌', 'banana']]],
        ['Four strawberries. Yummy!', '딸기 네 개. 맛있다!', [['🍓', 'strawberry'], ['🍓', 'strawberry'], ['🍓', 'strawberry'], ['🍓', 'strawberry']]],
        ['Five cookies. Yummy, yummy!', '쿠키 다섯 개. 냠냠!', [['🍪', 'cookie'], ['🍪', 'cookie'], ['🍪', 'cookie'], ['🍪', 'cookie'], ['🍪', 'cookie']]],
        ['My tummy is full!', '배가 불러요!', [['🐰', 'Jenny'], ['😋', 'full']]]] },
  { id: 'feel', title: 'How Do You Feel?', ko: '기분이 어때?', cover: '🎈', stage: 2, pattern: 'She is ___.',
    p: [['Jenny has a balloon. She is happy!', '제니는 풍선이 있어요. 기뻐요!', [['🎈', 'balloon'], ['😊', 'happy']]],
        ['Oh no! The balloon flies away.', '앗! 풍선이 날아가요.', [['🎈', 'balloon'], ['☁️', 'sky']]],
        ['Jenny is sad.', '제니는 슬퍼요.', [['😢', 'sad']]],
        ['Mommy gives Jenny a big hug.', '엄마가 제니를 꼭 안아줘요.', [['🤗', 'hug'], ['👩', 'mommy']]],
        ['Jenny is happy again!', '제니는 다시 기뻐요!', [['😊', 'happy'], ['💖', 'love']]],
        ['How do you feel today?', '너는 오늘 기분이 어때?', [['😊', 'happy'], ['😢', 'sad'], ['😴', 'sleepy']]]] },
  { id: 'night', title: 'Good Night, Jenny', ko: '잘 자, 제니', cover: '🌙', stage: 3, pattern: 'Good night, ___.',
    p: [['It is night. The moon is up.', '밤이에요. 달이 떴어요.', [['🌙', 'moon']]],
        ['Good night, stars.', '잘 자, 별들아.', [['⭐', 'star'], ['✨', 'stars']]],
        ['Good night, teddy bear.', '잘 자, 곰인형아.', [['🧸', 'teddy bear']]],
        ['Good night, Mommy. Good night, Daddy.', '안녕히 주무세요, 엄마. 아빠.', [['👩', 'mommy'], ['👨', 'daddy']]],
        ['Jenny is sleepy. Yawn!', '제니는 졸려요. 하아암!', [['😴', 'sleepy'], ['🛏️', 'bed']]],
        ['Sweet dreams, Jenny.', '좋은 꿈 꿔, 제니.', [['💤', 'sleep'], ['🐰', 'Jenny']]]] },
  /* ---- 일상 이야기 (듣기 나라) ---- */
  { id: 'breakfast', title: 'Breakfast Time', ko: '아침 먹자', cover: '🍳', stage: 1, pattern: 'Here is some ___.', say: ['Thank you!', '고맙습니다!'],
    p: [["I'm hungry, Mommy!", '엄마, 배고파요!', [['🐰', 'Jenny'], ['😋', 'hungry']]],
        ['Here is some bread.', '여기 빵이 있어.', [['🍞', 'bread']]],
        ['Here is some milk.', '여기 우유가 있어.', [['🥛', 'milk']]],
        ['Here is an egg.', '여기 달걀이 있어.', [['🍳', 'egg']]],
        ['Spoon, please!', '숟가락 주세요!', [['🥄', 'spoon']]],
        ['All done! Thank you, Mommy!', '다 먹었어요! 고맙습니다, 엄마!', [['🍽️', 'plate'], ['👩', 'mommy'], ['💖', 'thank you']]]] },
  { id: 'dress', title: 'Getting Dressed', ko: '옷 입자', cover: '👕', stage: 1, pattern: '___ on!', say: ['Ready!', '준비 완료!'],
    p: [["Jenny, let's get dressed!", '제니, 옷 입자!', [['🐰', 'Jenny'], ['👚', 'clothes']]],
        ['Shirt on!', '셔츠 입어요!', [['👕', 'shirt']]],
        ['Pants on!', '바지 입어요!', [['👖', 'pants']]],
        ['Socks on! One, two.', '양말 신어요! 하나, 둘.', [['🧦', 'socks'], ['🧦', 'socks']]],
        ['Shoes on!', '신발 신어요!', [['👟', 'shoes']]],
        ['Hat on! Are you ready? Ready!', '모자 써요! 준비됐니? 준비 완료!', [['🧢', 'hat'], ['🐰', 'Jenny']]]] },
  { id: 'park', title: 'At the Park', ko: '공원에서', cover: '🛝', stage: 1, pattern: "Let's ___!", say: ["Let's go!", '가자!'],
    p: [["Let's go to the park!", '공원에 가자!', [['🌳', 'park'], ['🐰', 'Jenny']]],
        ['Up, up, up the stairs.', '계단을 올라가요, 영차 영차.', [['🪜', 'stairs'], ['⬆️', 'up']]],
        ['Whee! Down the slide!', '와! 미끄럼틀 슝!', [['🛝', 'slide'], ['⬇️', 'down']]],
        ['Swing, swing, high and low.', '그네를 타요, 높이 낮게.', [['🌳', 'tree'], ['🎢', 'swing']]],
        ['Kick the ball! Kick!', '공을 차요! 뻥!', [['⚽', 'ball'], ['🦶', 'kick']]],
        ['Time to go home. Bye-bye, park!', '집에 갈 시간이야. 안녕, 공원!', [['🏠', 'home'], ['👋', 'bye-bye']]]] },
  { id: 'bath', title: 'Bath Time', ko: '목욕 시간', cover: '🛁', stage: 1, pattern: '___, ___!', say: ['All clean!', '깨끗해!'],
    p: [["It's bath time!", '목욕할 시간이야!', [['🛁', 'bath']]],
        ['Turn on the water. Splash!', '물을 틀어요. 첨벙!', [['🚿', 'shower'], ['💧', 'water']]],
        ['Bubbles, bubbles! Pop, pop!', '거품, 거품! 퐁, 퐁!', [['🫧', 'bubbles'], ['🫧', 'bubbles'], ['🫧', 'bubbles']]],
        ['Wash, wash, wash my ears.', '쓱쓱 귀를 씻어요.', [['🧼', 'soap'], ['👂', 'ears']]],
        ['Hello, Ducky! Quack, quack!', '안녕, 오리야! 꽥꽥!', [['🦆', 'duck']]],
        ['Dry, dry with a towel. All clean!', '수건으로 닦아요. 깨끗해!', [['🧺', 'towel'], ['✨', 'clean']]]] },
  { id: 'rain', title: 'Rainy Day', ko: '비 오는 날', cover: '☔', stage: 1, pattern: 'Put on my ___.', say: ["It's raining!", '비가 와요!'],
    p: [["Look! It's raining.", '봐! 비가 와요.', [['🌧️', 'rain']]],
        ['Put on my raincoat.', '우비를 입어요.', [['🧥', 'raincoat']]],
        ['Put on my boots.', '장화를 신어요.', [['👢', 'boots']]],
        ['Open my umbrella.', '우산을 펴요.', [['☂️', 'umbrella']]],
        ['Jump in the puddle! Splash!', '물웅덩이에 점프! 첨벙!', [['💦', 'splash'], ['🐸', 'frog']]],
        ['The sun is out again. Hello, sun!', '해가 다시 나왔어요. 안녕, 해님!', [['☀️', 'sun'], ['🌈', 'rainbow']]]] },
  { id: 'shop', title: 'At the Store', ko: '가게에서', cover: '🛒', stage: 1, pattern: 'I need ___.', say: ['Just one!', '딱 하나만!'],
    p: [["Let's go shopping!", '장 보러 가자!', [['🛒', 'cart'], ['🐰', 'Jenny']]],
        ['I need milk.', '우유가 필요해요.', [['🥛', 'milk']]],
        ['I need apples.', '사과가 필요해요.', [['🍎', 'apple'], ['🍎', 'apple']]],
        ['Can I have a cookie? Okay, just one!', '쿠키 사도 돼요? 그래, 딱 하나만!', [['🍪', 'cookie']]],
        ['Beep! Thank you!', '삑! 감사합니다!', [['💳', 'card'], ['🧾', 'receipt']]],
        ["Let's go home.", '집에 가자.', [['🏠', 'home']]]] },
  { id: 'cleanup', title: 'Clean Up!', ko: '정리하자!', cover: '🧸', stage: 1, pattern: '___ in the ___.', say: ['All done!', '다 했다!'],
    p: [['Oh no! What a mess!', '이런! 엉망이야!', [['🧸', 'teddy bear'], ['🧱', 'blocks'], ['📚', 'books']]],
        ['Blocks in the box.', '블록은 상자에.', [['🧱', 'blocks'], ['📦', 'box']]],
        ['Books on the shelf.', '책은 책장에.', [['📚', 'books']]],
        ['Teddy on the bed.', '곰인형은 침대에.', [['🧸', 'teddy bear'], ['🛏️', 'bed']]],
        ['Clean up, clean up! All done!', '정리, 정리! 다 했다!', [['✨', 'clean'], ['🐰', 'Jenny']]],
        ['Good job, Jenny!', '잘했어, 제니!', [['👏', 'good job'], ['⭐', 'star']]]] },
  { id: 'bus', title: "Let's Go by Bus", ko: '버스 타고 가요', cover: '🚌', stage: 1, pattern: 'Stop! / Go!', say: ['Here we are!', '도착!'],
    p: [['We go by bus. Beep, beep!', '버스 타고 가요. 빵빵!', [['🚌', 'bus']]],
        ['The wheels go round and round.', '바퀴가 빙글빙글 돌아요.', [['🛞', 'wheel'], ['🛞', 'wheel']]],
        ['Stop! Red light.', '멈춰! 빨간 불.', [['🔴', 'red'], ['🛑', 'stop']]],
        ['Go! Green light.', '출발! 초록 불.', [['🟢', 'green'], ['🚌', 'bus']]],
        ['Here we are! Hello, Grandma!', '도착! 안녕하세요, 할머니!', [['🏡', 'house'], ['👵', 'grandma']]]] },
  { id: 'friend', title: 'Hello, Friend!', ko: '친구야, 안녕!', cover: '🐻', stage: 1, pattern: "Let's ___!", say: ["Let's play!", '같이 놀자!'],
    p: [['Ding-dong! Who is it?', '딩동! 누구세요?', [['🚪', 'door'], ['🔔', 'bell']]],
        ["It's Bear! Hello, Bear!", '곰이야! 안녕, 곰아!', [['🐻', 'bear']]],
        ["Let's play!", '같이 놀자!', [['🐰', 'Jenny'], ['🐻', 'bear'], ['🧩', 'puzzle']]],
        ['My turn. Your turn.', '내 차례. 네 차례.', [['🎲', 'dice'], ['🙋', 'turn']]],
        ["Let's share the cookies!", '쿠키를 나눠 먹자!', [['🍪', 'cookie'], ['🍪', 'cookie']]],
        ['Bye, Bear! See you tomorrow!', '안녕, 곰아! 내일 또 만나!', [['👋', 'bye'], ['🐻', 'bear']]]] },
  { id: 'birthday', title: 'Happy Birthday, Jenny!', ko: '생일 축하해, 제니!', cover: '🎂', stage: 1, pattern: 'Happy birthday!', say: ['Happy birthday!', '생일 축하해!'],
    p: [["Today is Jenny's birthday!", '오늘은 제니의 생일이에요!', [['🐰', 'Jenny'], ['🎉', 'party']]],
        ['Here is a cake.', '여기 케이크가 있어요.', [['🎂', 'cake']]],
        ['Three candles. One, two, three!', '초가 세 개. 하나, 둘, 셋!', [['🕯️', 'candle'], ['🕯️', 'candle'], ['🕯️', 'candle']]],
        ['Happy birthday to you!', '생일 축하합니다!', [['🎵', 'song'], ['🎈', 'balloon']]],
        ['Make a wish. Blow! Whoo!', '소원을 빌어요. 후~!', [['🌬️', 'blow'], ['⭐', 'wish']]],
        ['Open the present. Wow! A teddy bear!', '선물을 열어요. 와! 곰인형이다!', [['🎁', 'present'], ['🧸', 'teddy bear']]]] },
];

/* ---------- 스티커 (보상) ---------- */
const STICKERS = ['🐰', '🥕', '🌈', '⭐', '🦄', '🍓', '🎈', '🌸', '🐣', '🍭', '🦋', '🐳', '🍩', '🌻', '🐼',
  '🚀', '🎀', '🐞', '🍉', '🦁', '🐧', '🌟', '🧁', '🐬', '🍒', '🦊', '🎂', '🐨', '🌙', '👑',
  '🐙', '🍦', '🦒', '🐠', '🎠', '🪅', '🌷', '🐝', '🦖', '🏰'];

/* ---------- 요일별 활동 ---------- */
// days: [일,월,화,수,목,금,토] — 알파벳·따라쓰기는 '읽기 나라' 전까지 기본 꺼둠 (언제든 홈에서 할 수 있음)
const ACTIVITIES = {
  lesson:  { ko: '오늘의 수업', en: "Today's Lesson", icon: '📖', days: [1, 1, 1, 1, 1, 1, 1] },
  listen:  { ko: '듣기 시간', en: 'Listening', icon: '🎧', days: [1, 1, 1, 1, 1, 1, 1] },
  book:    { ko: '제니 그림책', en: 'Storybook', icon: '📚', days: [1, 0, 1, 0, 1, 0, 1] },
  talk:    { ko: '제니와 대화', en: 'Talk', icon: '💬', days: [0, 1, 0, 1, 0, 1, 0] },
  game:    { ko: '게임 놀이', en: 'Games', icon: '🎮', days: [0, 1, 0, 1, 0, 1, 0] },
  mywords: { ko: '우리 단어', en: 'My Words', icon: '💝', days: [0, 0, 1, 0, 0, 0, 0] },
  review:  { ko: '복습', en: 'Review', icon: '🔁', days: [0, 0, 0, 0, 0, 0, 1] },
  song:    { ko: '노래 시간', en: 'Songs', icon: '🎵', days: [1, 0, 1, 0, 1, 0, 0] },
  story:   { ko: '동화·영상', en: 'Videos', icon: '📺', days: [1, 1, 1, 1, 1, 1, 1] },
  abc:     { ko: '알파벳', en: 'ABC', icon: '🔤', days: [0, 0, 0, 0, 0, 0, 0] },
  trace:   { ko: '따라쓰기', en: 'Tracing', icon: '✏️', days: [0, 0, 0, 0, 0, 0, 0] },
};

// 기존 그림책의 핵심 한마디 (따라 말하기)
const KEY_PHRASES = {
  carrot: ['Here it is!', '여기 있다!'], farm: ['Hello!', '안녕!'], morning: ['Good morning!', '좋은 아침!'],
  jump: ['I can jump!', '나는 뛸 수 있어!'], color: ['Look! A rainbow!', '봐! 무지개다!'], yummy: ['Yummy!', '맛있다!'],
  feel: ['I am happy!', '나는 기뻐!'], night: ['Good night!', '잘 자!'],
};
STORIES.forEach(b => { if (!b.say) b.say = KEY_PHRASES[b.id] || ['Hello!', '안녕!']; });

/* ---------- 제니와 대화하기 (말하기 마을 롤플레이) ---------- */
// open: 정답 없이 아이가 고른 것을 문장으로 말해줌 / rounds: [보여줄 그림, 질문, 한국어, [[그림, 대답, 정답여부]], 모범 문장]
// hide: 숨바꼭질 — 숨은 곳을 찾으면 "Here it is!"
const TALKS = {
  like:  { q: 'What do you like?', ko: '너는 뭘 좋아해?', open: 'like', reply: 'Me too!' },
  this:  { rounds: [['🐱', 'Is this a dog?', '이건 강아지야?', [['👍', 'Yes!', 0], ['👎', 'No!', 1]], 'No! This is a cat.'],
                    ['🚗', 'Is this a car?', '이건 자동차야?', [['👍', 'Yes!', 1], ['👎', 'No!', 0]], 'Yes! This is a car.'],
                    ['⚽', 'Is this a banana?', '이건 바나나야?', [['👍', 'Yes!', 0], ['👎', 'No!', 1]], 'No! This is a ball.']] },
  color: { rounds: [['🍎', 'What color is it?', '무슨 색이야?', [['🔴', 'Red!', 1], ['🔵', 'Blue!', 0], ['🟡', 'Yellow!', 0]], 'It is red.'],
                    ['🍌', 'What color is it?', '무슨 색이야?', [['🟢', 'Green!', 0], ['🟡', 'Yellow!', 1], ['🔴', 'Red!', 0]], 'It is yellow.'],
                    ['🐸', 'What color is it?', '무슨 색이야?', [['🔵', 'Blue!', 0], ['🔴', 'Red!', 0], ['🟢', 'Green!', 1]], 'It is green.']] },
  feel:  { q: 'How are you today?', ko: '오늘 기분이 어때?', open: 'feel', reply: 'I see! Thank you for telling me.' },
  want:  { q: 'What do you want?', ko: '뭐가 필요해?', open: 'want', reply: 'Here you are!' },
  where: { hide: true, rounds: [['🐰', 'Where is the bunny?', '토끼 어디 있지?', [['🛏️', 'Under the bed?'], ['📦', 'In the box?'], ['🌳', 'Behind the tree?']], 'Here it is!'],
                                ['🦆', 'Where is the duck?', '오리 어디 있지?', [['🪑', 'Under the chair?'], ['🎒', 'In the bag?'], ['🚗', 'In the car?']], 'Here it is!']] },
  many:  { rounds: [['🦆🦆', 'How many ducks?', '오리가 몇 마리야?', [['1️⃣', 'One!', 0], ['2️⃣', 'Two!', 1], ['3️⃣', 'Three!', 0]], 'Two ducks!'],
                    ['⭐⭐⭐', 'How many stars?', '별이 몇 개야?', [['2️⃣', 'Two!', 0], ['3️⃣', 'Three!', 1], ['4️⃣', 'Four!', 0]], 'Three stars!'],
                    ['🍎', 'How many apples?', '사과가 몇 개야?', [['1️⃣', 'One!', 1], ['2️⃣', 'Two!', 0], ['5️⃣', 'Five!', 0]], 'One apple!']] },
  can:   { q: 'What can you do?', ko: '너는 뭘 할 수 있어?', open: 'can', reply: 'Wow! Show me!' },
};

/* ---------- 커리큘럼: 듣기 → 말하기 → 읽기 (Day 0부터 계속 늘어남) ---------- */
// 아이가 모국어를 배우듯: 일상 이야기를 충분히 듣고(귀) → 짧은 대화로 말하고(입) → 마지막에 글자(눈)
function buildCurriculum() {
  const d = [{ type: 'theme', key: 'hello', stage: 0 }];                // Day 0: 제니 만나기
  const listen = [                                                       // Stage 1: 듣기 나라
    ['story', 'morning'], ['theme', 'family'], ['story', 'breakfast'], ['theme', 'food'], ['story', 'carrot'], ['story', 'dress'],
    ['theme', 'clothes'], ['story', 'farm'], ['theme', 'animals'], ['story', 'park'], ['theme', 'actions'], ['story', 'jump'],
    ['story', 'bath'], ['theme', 'body'], ['story', 'rain'], ['theme', 'weather'], ['story', 'color'], ['theme', 'colors'],
    ['story', 'yummy'], ['theme', 'numbers'], ['story', 'shop'], ['theme', 'fruits'], ['story', 'feel'], ['theme', 'feelings'],
    ['story', 'cleanup'], ['theme', 'toys'], ['story', 'bus'], ['theme', 'vehicles'], ['story', 'friend'], ['theme', 'shapes'],
    ['story', 'birthday'], ['theme', 'sea'], ['story', 'night'], ['theme', 'nature'], ['theme', 'opposites'],
  ];
  const heard = [];
  listen.forEach(([type, key], i) => {
    d.push({ type, key, stage: 1 });
    if (type === 'story') heard.push(key);
    if ((i + 1) % 6 === 0) d.push({ type: 'relisten', stories: heard.slice(-2), stage: 1 }); // 다시 듣기 (반복 노출)
  });
  Object.keys(SENTENCES).forEach(k => d.push({ type: 'sentence', key: k, stage: 2 })); // Stage 2: 말하기 마을
  ALPHABET.forEach((a, i) => {                                                          // Stage 3: 읽기 나라 (ABC)
    d.push({ type: 'letter', key: a.L, stage: 3 });
    if ((i + 1) % 5 === 0 || i === 25) {
      const from = i === 25 ? 21 : i - 4; // 마지막 복습은 V–Z
      d.push({ type: 'review', letters: ALPHABET.slice(from, i + 1).map(x => x.L), stage: 3 });
    }
  });
  return d;
}
const CURRICULUM_VERSION = 2;
const CURRICULUM = buildCurriculum();
const STAGES = [
  { n: 0, title: 'Hello, Jenny!', ko: '제니 만나기' },
  { n: 1, title: 'Listening Land', ko: '듣기 나라 · 귀가 열려요' },
  { n: 2, title: 'Talking Town', ko: '말하기 마을 · 입이 열려요' },
  { n: 3, title: 'ABC Land', ko: '읽기 나라 · 글자를 만나요' },
  { n: 4, title: 'Rainbow Review', ko: '무지개 복습 (계속)' },
];
