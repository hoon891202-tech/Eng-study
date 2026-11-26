"""실제 사진 단어 카드 받기 — 위키미디어 공용 (PD·CC0·CC BY/BY-SA만), 천천히 조금씩.

사용 (맥·리눅스는 python3):
  1) 후보 받기 (추천): 앱에 아직 사진이 없는 단어마다 후보 여러 장을 받아 고를 수 있게 함
     python tools/photos.py candidates --exclude tools/photo-exclude.json
       --per 3        단어당 후보 수 (기본 3)
       --words a,b    이 단어만 (이미 앱에 사진이 있는 단어도 후보만 받음 — 앱 사진은 안 바뀜)
       --limit N      이번에 받을 단어 수 (기본: 전부)
     결과: photo-candidates/<단어>/1.jpg … + candidates.json + 한눈에 보기 index.html
     (앱 images/words·credits.json은 건드리지 않음. 중간에 멈춰도 같은 명령으로 이어 받음)
  2) 고르기 (검수 뒤): python tools/photos.py pick <단어> <번호>   예) pick apple 2
     → photo-candidates/<단어>/<번호>.jpg 를 images/words/ 로 복사하고 credits.json에 출처 추가
  3) (예전 방식) python tools/photos.py [개수=12] [--exclude 파일]
     → 사진이 없는 단어를 1장씩 바로 images/words/에 받음

제외 목록(--exclude, 여러 번 가능): 이미 검수에서 뺀 사진은 다시 받지 않음.
  JSON 형식: {"files": {"File:이름.jpg": "이유", ...}} 또는 ["File:이름.jpg", ...]
  또는 credits.json 형식 {단어: {"file": ...}}. 이미 앱에 쓰인 사진도 자동으로 빼고 고름.
필요: Pillow (pip install Pillow). 사진은 새로 저장하므로 EXIF(위치 정보 등)는 남지 않음.
429(요청 과다)를 받으면 바로 멈춤 → 나중에 같은 명령을 다시 실행하면 이어서 받음."""
import json, re, os, io, sys, time, shutil, argparse, urllib.parse, urllib.request, urllib.error, html
for _s in (sys.stdout, sys.stderr):  # 윈도우(cp949)에서 화면에 못 쓰는 글자가 있어도 멈추지 않게
    try: _s.reconfigure(errors='replace')
    except Exception: pass

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'images', 'words')
CAND = os.path.join(ROOT, 'photo-candidates')  # .gitignore에 있음 (커밋 안 됨)
UA = {'User-Agent': 'JennyEnglishKidsApp/1.0 (educational, non-commercial)'}

# 단어 → 검색어 (아이가 바로 알아보는 대표 모습, 사람·사냥·확대·가공 장면은 '-낱말'로 피함)
Q = {
 'apple': 'red apple fruit -tree -tomato -logo -computer', 'ant': 'ant insect walking on leaf', 'alligator': 'American alligator swimming -skull -skeleton',
 'ball': 'soccer ball on grass -player -match -stadium', 'banana': 'bananas fruit', 'bear': 'brown bear',
 'cat': 'domestic cat kitten', 'car': 'red car', 'cake': 'birthday cake', 'dog': 'dog puppy', 'duck': 'mallard duck', 'donut': 'doughnut',
 'egg': 'brown chicken eggs in carton -peeled -fried', 'elephant': 'african elephant', 'fish': 'goldfish aquarium -fountain', 'frog': 'green frog', 'flower': 'flower blossom', 'goat': 'goat',
 'grapes': 'grapes', 'gift': 'gift box ribbon', 'hat': 'straw sun hat -people -person -tourist', 'horse': 'horse', 'house': 'house', 'ice cream': 'ice cream cone scoop -balloon',
 'island': 'tropical island', 'juice': 'orange juice glass', 'jellyfish': 'jellyfish', 'jacket': 'jacket on hanger clothing -singer -concert', 'koala': 'koala',
 'kite': 'colorful kite flying in sky -bird -Milvus', 'key': 'key', 'lion': 'lion', 'lemon': 'lemon fruit', 'leaf': 'single green leaf -insect -fly',
 'monkey': 'monkey', 'moon': 'full moon', 'milk': 'glass of milk drink -bowl -ceramic',
 'nest': 'bird nest eggs', 'nut': 'peanuts', 'octopus': 'octopus underwater -market -food -dish', 'orange': 'orange fruit', 'owl': 'owl', 'pig': 'pig', 'panda': 'giant panda',
 'pizza': 'pizza', 'rabbit': 'domestic rabbit on grass -illustration -drawing -book', 'rainbow': 'rainbow over field sky', 'robot': 'toy robot',
 'sun': 'sun in blue sky -glacier', 'snake': 'green snake on branch -eagle -prey -bird', 'tiger': 'tiger',
 'tree': 'single tree in green field -leopard -animal', 'train': 'train', 'umbrella': 'open umbrella rain -factory -workshop', 'van': 'white passenger van minibus -concept',
 'violin': 'violin musical instrument -rock -cliff', 'volcano': 'volcano cone mountain erupting', 'whale': 'humpback whale',
 'watermelon': 'watermelon fruit slice -flower', 'worm': 'earthworm on soil -microscope -SEM', 'fox': 'red fox', 'box': 'cardboard box empty -people -skateboard',
 'yo-yo': 'yo-yo toy -church -cathedral', 'yarn': 'yarn balls', 'zebra': 'zebra',
 'cow': 'cow', 'sheep': 'sheep', 'chicken': 'domestic chicken hen farm', 'strawberry': 'strawberry', 'peach': 'peach fruit -mold -rotten -tree',
 'bus': 'yellow school bus', 'airplane': 'passenger airplane in flight blue sky -silhouette',
 'boat': 'sailboat', 'bike': 'bicycle', 'truck': 'truck', 'rice': 'bowl of cooked white rice -dessert', 'bread': 'bread loaf', 'water': 'glass of water',
 'cookie': 'chocolate chip cookies -shop -store', 'cheese': 'cheese',
 'shirt': 't-shirt clothing on hanger -singer -concert -person', 'pants': 'blue jeans trousers folded -person -singer', 'dress': 'girl dress on hanger clothing -statue -sculpture',
 'shoes': 'sneakers shoes', 'socks': 'pair of socks -laundry -building', 'cap': 'baseball cap -mannequin -VR',
 'teddy bear': 'teddy bear', 'book': 'books', 'blocks': 'toy blocks', 'bed': 'bed bedroom', 'chair': 'wooden chair', 'star': 'starry night sky stars',
 'cloud': 'cumulus cloud', 'shark': 'shark', 'crab': 'crab', 'turtle': 'sea turtle', 'snowy': 'snowy landscape', 'rainy': 'heavy rain falling street -dew -drop',
 'carrot': 'carrots vegetable -refrigerator', 'broccoli': 'broccoli vegetable -romanesco', 'tomato': 'tomato', 'corn': 'corn cob', 'butterfly': 'butterfly',
 'bee': 'honey bee on flower -spider -prey', 'ladybug': 'ladybird', 'penguin': 'penguin', 'giraffe': 'giraffe', 'snail': 'garden snail shell -eggs',
}
OK_LIC = re.compile(r'^(public domain|pd|cc0|cc by(-sa)? ?[0-9.]*( [a-z]{2})?|cc-by(-sa)?-[0-9.]+)$', re.I)
# 제목·설명·분류에 이런 낱말이 있으면 고르지 않음 (사람 얼굴·무서운 장면·그림 대신 실제 사진)
BAD = re.compile(r'\b(portraits?|people|persons?|man|men|woman|women|girls?|boys?|child|children|kids?|singers?|actors?|actress|'
                 r'politicians?|crowds?|festival|concert|skulls?|skeletons?|dead|carcass|prey|hunting|rotten|mou?ld|microscop\w*|'
                 r'drawings?|illustrations?|paintings?|cartoons?|logos?|clip ?art)\b', re.I)

class Limited(Exception): pass
def get(u):
    for i in range(3):
        try:
            time.sleep(4)  # 천천히
            return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read()
        except urllib.error.HTTPError as e:
            if e.code == 429: raise Limited()
            raise
        except urllib.error.URLError:
            time.sleep(5 * (i + 1))
    raise RuntimeError('gave up ' + u[:80])

def norm(title):  # 'File:A_b.jpg' / 'A b.jpg' / 원본 주소 → 'a b.jpg'
    t = urllib.parse.unquote(str(title or '')).replace('_', ' ').strip()
    t = re.sub(r'^https?://commons\.wikimedia\.org/wiki/', '', t)
    return re.sub(r'^file:', '', t, flags=re.I).strip().lower()

def load_exclude(paths):
    out = set()
    for p in paths or []:
        d = jload(p, [])
        if isinstance(d, dict) and 'files' in d: d = d['files']
        if isinstance(d, dict):
            for k, v in d.items():
                out.add(norm(v.get('file') or v.get('page')) if isinstance(v, dict) else norm(k))
        else:
            out.update(norm(x) for x in d)
    out.discard('')
    return out

def clean(s):  # html 태그 빼고 공백 정리 — 작가 요청 문구가 있을 수 있으므로 자르지 않음
    return re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]+>', ' ', s or ''))).strip()

def search(q, skip, want):
    """검색어 q로 조건에 맞는 사진 정보를 want장까지 돌려줌 (skip: 제외할 파일 이름 집합)."""
    found = []
    for extra in [' incategory:Quality_images', '']:
        api = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({
            'action': 'query', 'format': 'json', 'generator': 'search', 'gsrsearch': q + ' filetype:bitmap' + extra, 'gsrnamespace': 6, 'gsrlimit': 20,
            'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size|mime', 'iiurlwidth': 500})
        pages = json.loads(get(api)).get('query', {}).get('pages', {})
        for pg in sorted(pages.values(), key=lambda p: p.get('index', 99)):
            if len(found) >= want: return found
            ii = (pg.get('imageinfo') or [{}])[0]; md = ii.get('extmetadata', {})
            lic = md.get('LicenseShortName', {}).get('value', '').strip()
            w, h = ii.get('width', 0), ii.get('height', 0)
            if norm(pg['title']) in skip: continue
            if ii.get('mime') not in ('image/jpeg', 'image/png') or w < 500 or not (0.6 < w / max(h, 1) < 1.9): continue
            if not OK_LIC.match(lic): continue
            about = ' '.join([pg['title'], clean(md.get('ImageDescription', {}).get('value', '')), md.get('Categories', {}).get('value', '')])
            if BAD.search(about): continue
            lurl = md.get('LicenseUrl', {}).get('value', '').strip().replace('http://', 'https://')
            c = {'file': pg['title'], 'thumb': ii['thumburl'], 'page': ii.get('descriptionurl'), 'license': lic,
                 'artist': clean(md.get('Artist', {}).get('value', '')) or '작자 미상'}
            if re.match(r'^https://creativecommons\.org/[\w./-]*$', lurl): c['licenseUrl'] = lurl
            skip.add(norm(pg['title'])); found.append(c)
    return found

def slug(word): return re.sub(r'[^a-z0-9]+', '-', word.lower()).strip('-')
def save_jpg(data, path):
    from PIL import Image
    with Image.open(io.BytesIO(data)) as src: im = src.convert('RGB')  # 새로 저장 → EXIF·GPS 없음
    im.thumbnail((420, 420)); im.save(path, quality=78, optimize=True)
def jload(p, default):
    if not os.path.exists(p): return default
    with open(p, encoding='utf-8') as f: return json.load(f)
def jsave(obj, p):
    with open(p, 'w', encoding='utf-8') as f: json.dump(obj, f, ensure_ascii=False, indent=1)

def write_index(cands):
    e = lambda s: html.escape(str(s or ''), quote=True)
    rows = []
    for w, lst in cands.items():
        cells = ''.join(f'<figure><img src="{e(slug(w))}/{c["n"]}.jpg"><figcaption><b>{c["n"]}</b> · {e(c["license"])}<br>{e(c["artist"])[:120]}'
                        f'<br><a href="{e(c["page"])}">원본</a></figcaption></figure>' for c in lst)
        rows.append(f'<h2>{e(w)} <small>— 고르기: python tools/photos.py pick "{e(w)}" 번호</small></h2><div class="row">{cells or "(후보 없음)"}</div>')
    with open(os.path.join(CAND, 'index.html'), 'w', encoding='utf-8') as f: f.write(
        '<!doctype html><meta charset="utf-8"><title>사진 후보</title><style>body{font-family:sans-serif;margin:20px}'
        '.row{display:flex;gap:12px;flex-wrap:wrap}figure{margin:0;width:260px}img{width:260px;height:200px;object-fit:contain;background:#eee}'
        'figcaption{font-size:12px}</style><h1>단어 사진 후보 — 단어마다 가장 알아보기 쉬운 1장의 번호를 적어 주세요 (없으면 "없음")</h1>' + ''.join(rows))

def cmd_candidates(a):
    os.makedirs(CAND, exist_ok=True)
    credits = jload(os.path.join(OUT, 'credits.json'), {})
    skip = load_exclude(a.exclude) | {norm(c.get('file')) for c in credits.values()}
    print(f'제외 목록 {len(skip)}장 (검수에서 뺀 사진 + 이미 앱에 있는 사진)')
    words = [w.strip() for w in a.words.split(',')] if a.words else [w for w in Q if w not in credits]
    unknown = [w for w in words if w not in Q]
    if unknown: sys.exit('검색어가 없는 단어: ' + ', '.join(unknown))
    cpath = os.path.join(CAND, 'candidates.json'); cands = jload(cpath, {})
    for lst in cands.values(): skip.update(norm(c['file']) for c in lst)
    todo = [w for w in words if len(cands.get(w, [])) < a.per][:a.limit or None]
    print(f'후보 받을 단어 {len(todo)}개 (단어당 {a.per}장): ' + ', '.join(todo), flush=True)
    try:
        for i, w in enumerate(todo, 1):
            have = cands.setdefault(w, [])
            try:
                for c in search(Q[w], skip, a.per - len(have)):
                    n = max([x['n'] for x in have], default=0) + 1
                    os.makedirs(os.path.join(CAND, slug(w)), exist_ok=True)
                    save_jpg(get(c['thumb']), os.path.join(CAND, slug(w), f'{n}.jpg'))
                    have.append({'n': n, **c}); jsave(cands, cpath)
                print(f'[{i}/{len(todo)}] {w}: 후보 {len(have)}장' + ('' if have else ' (못 찾음 — 그림으로 둠)'), flush=True)
            except Limited: raise
            except Exception as ex: print('ERR', w, ex, flush=True)
    except Limited:
        print('429 — 위키미디어가 잠시 막음. 몇 시간 뒤 같은 명령을 다시 실행하면 이어서 받아요.')
    jsave(cands, cpath); write_index(cands)
    print('끝. 결과 폴더:', os.path.abspath(CAND), '— index.html을 열어 보세요')

def cmd_pick(word, n):
    cands = jload(os.path.join(CAND, 'candidates.json'), {})
    c = next((x for x in cands.get(word, []) if x['n'] == n), None)
    if not c: sys.exit(f'{word} {n}번 후보가 없어요')
    src = os.path.join(CAND, slug(word), f'{n}.jpg'); os.makedirs(OUT, exist_ok=True)
    shutil.copyfile(src, os.path.join(OUT, slug(word) + '.jpg'))
    p = os.path.join(OUT, 'credits.json'); credits = jload(p, {})
    credits[word] = {k: v for k, v in c.items() if k != 'n'} | {'img': f'images/words/{slug(word)}.jpg'}
    jsave(credits, p); print('ok', word, n, c['license'], c['file'][:60])

def cmd_legacy(limit, exclude):
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, 'credits.json'); credits = jload(p, {})
    skip = load_exclude(exclude) | {norm(c.get('file')) for c in credits.values()}
    done = 0
    for word, q in Q.items():
        if word in credits: continue
        if done >= limit: break
        try:
            done += 1
            got = search(q, skip, 1)
            if not got: print('NONE', word); continue
            c = got[0]; save_jpg(get(c['thumb']), os.path.join(OUT, slug(word) + '.jpg'))
            credits[word] = {**c, 'img': f'images/words/{slug(word)}.jpg'}
            print('ok', word, c['license'], c['file'][:60], flush=True); jsave(credits, p)
        except Limited:
            print('429 — 위키미디어가 잠시 막음, 다음에 이어서'); break
        except Exception as e:
            print('ERR', word, e)
    jsave(credits, p); print('total', len(credits), 'of', len(Q))

def main(argv):
    if argv and argv[0] in ('-h', '--help', '/?'): print(__doc__); return
    try:
        import PIL  # noqa: F401
    except ImportError:
        sys.exit('Pillow가 없어요. 먼저 실행: python -m pip install Pillow')
    if argv and argv[0] == 'pick':
        if len(argv) != 3 or not argv[2].isdigit(): sys.exit('사용법: python tools/photos.py pick <단어> <번호>')
        return cmd_pick(argv[1], int(argv[2]))
    if argv and argv[0] == 'candidates':
        ap = argparse.ArgumentParser(prog='photos.py candidates')
        ap.add_argument('--exclude', action='append', default=[]); ap.add_argument('--per', type=int, default=3)
        ap.add_argument('--words', default=''); ap.add_argument('--limit', type=int, default=0)
        return cmd_candidates(ap.parse_args(argv[1:]))
    ap = argparse.ArgumentParser(prog='photos.py', usage='python tools/photos.py [개수=12] [--exclude 파일]  (자세히: --help)')
    ap.add_argument('limit', nargs='?', type=int, default=12); ap.add_argument('--exclude', action='append', default=[])
    a = ap.parse_args(argv); cmd_legacy(a.limit, a.exclude)

if __name__ == '__main__':
    main(sys.argv[1:])
