"""실제 사진 단어 카드 받기 — 위키미디어 공용 (PD·CC0·CC BY/BY-SA만), 천천히 조금씩.
사용: python3 tools/photos.py [한 번에 받을 개수=12]
429(요청 과다)를 받으면 바로 멈추고 다음에 이어서 받는다. 결과: images/words/<단어>.jpg + credits.json"""
import json, re, os, io, sys, time, urllib.parse, urllib.request, urllib.error, html
from PIL import Image
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'images', 'words'); os.makedirs(OUT, exist_ok=True)
UA = {'User-Agent': 'JennyEnglishKidsApp/1.0 (educational, non-commercial)'}
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
# 단어 → 검색어 (사진으로 보여줄 실제 물건·동물만)
Q = {
 'apple': 'red apple fruit', 'ant': 'ant macro', 'alligator': 'American alligator', 'ball': 'soccer ball', 'banana': 'bananas fruit', 'bear': 'brown bear',
 'cat': 'domestic cat kitten', 'car': 'red car', 'cake': 'birthday cake', 'dog': 'dog puppy', 'duck': 'mallard duck', 'donut': 'doughnut',
 'egg': 'chicken egg', 'elephant': 'african elephant', 'fish': 'goldfish', 'frog': 'green frog', 'flower': 'flower blossom', 'goat': 'goat',
 'grapes': 'grapes', 'gift': 'gift box ribbon', 'hat': 'sun hat', 'horse': 'horse', 'house': 'house', 'ice cream': 'ice cream cone',
 'island': 'tropical island', 'juice': 'orange juice glass', 'jellyfish': 'jellyfish', 'jacket': 'jacket', 'kite': 'kite flying', 'koala': 'koala',
 'key': 'key', 'lion': 'lion', 'lemon': 'lemon fruit', 'leaf': 'green leaf', 'monkey': 'monkey', 'moon': 'full moon', 'milk': 'glass of milk',
 'nest': 'bird nest eggs', 'nut': 'peanuts', 'octopus': 'octopus', 'orange': 'orange fruit', 'owl': 'owl', 'pig': 'pig', 'panda': 'giant panda',
 'pizza': 'pizza', 'rabbit': 'white rabbit', 'rainbow': 'rainbow', 'robot': 'toy robot', 'sun': 'sun sky', 'snake': 'snake', 'tiger': 'tiger',
 'tree': 'tree', 'train': 'train', 'umbrella': 'umbrella', 'van': 'van vehicle', 'violin': 'violin', 'volcano': 'volcano', 'whale': 'humpback whale',
 'watermelon': 'watermelon', 'worm': 'earthworm', 'fox': 'red fox', 'box': 'cardboard box', 'yo-yo': 'yo-yo toy', 'yarn': 'yarn balls', 'zebra': 'zebra',
 'cow': 'cow', 'sheep': 'sheep', 'chicken': 'chicken hen', 'strawberry': 'strawberry', 'peach': 'peach fruit', 'bus': 'school bus', 'airplane': 'airplane',
 'boat': 'sailboat', 'bike': 'bicycle', 'truck': 'truck', 'rice': 'bowl of rice', 'bread': 'bread loaf', 'water': 'glass of water', 'cookie': 'cookies',
 'cheese': 'cheese', 'shirt': 't-shirt', 'pants': 'trousers jeans', 'dress': 'dress clothing', 'shoes': 'sneakers shoes', 'socks': 'socks', 'cap': 'baseball cap',
 'teddy bear': 'teddy bear', 'book': 'books', 'blocks': 'toy blocks', 'bed': 'bed bedroom', 'chair': 'wooden chair', 'star': 'starry night sky',
 'cloud': 'cumulus cloud', 'shark': 'shark', 'crab': 'crab', 'turtle': 'sea turtle', 'snowy': 'snowy landscape', 'rainy': 'rain drops',
 'carrot': 'carrots', 'broccoli': 'broccoli', 'tomato': 'tomato', 'corn': 'corn cob', 'butterfly': 'butterfly', 'bee': 'honey bee', 'ladybug': 'ladybird',
 'penguin': 'penguin', 'giraffe': 'giraffe', 'snail': 'snail', 'owl ': 'owl',
}
OK_LIC = re.compile(r'^(public domain|pd|cc0|cc by(-sa)? ?[0-9.]*|cc-by(-sa)?-[0-9.]+)', re.I)
def pick(q):
    for extra in [' incategory:Quality_images', '']:
        api = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({
            'action': 'query', 'format': 'json', 'generator': 'search', 'gsrsearch': q + ' filetype:bitmap' + extra, 'gsrnamespace': 6, 'gsrlimit': 12,
            'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size|mime', 'iiurlwidth': 500})
        pages = json.loads(get(api)).get('query', {}).get('pages', {})
        for pg in sorted(pages.values(), key=lambda p: p.get('index', 99)):
            ii = (pg.get('imageinfo') or [{}])[0]; md = ii.get('extmetadata', {})
            lic = md.get('LicenseShortName', {}).get('value', '')
            w, h = ii.get('width', 0), ii.get('height', 0)
            if ii.get('mime') not in ('image/jpeg', 'image/png') or w < 500 or not (0.6 < w / max(h, 1) < 1.9): continue
            if not OK_LIC.match(lic.strip()): continue
            artist = html.unescape(re.sub('<[^>]+>', '', md.get('Artist', {}).get('value', ''))).strip()[:80]
            return {'file': pg['title'], 'thumb': ii['thumburl'], 'page': ii.get('descriptionurl'), 'license': lic, 'artist': artist}
    return None
LIMIT = int(sys.argv[1]) if len(sys.argv) > 1 else 12
credits = json.load(open(f'{OUT}/credits.json')) if os.path.exists(f'{OUT}/credits.json') else {}
done = 0
for word, q in Q.items():
    word = word.strip()
    if word in credits: continue
    if done >= LIMIT: break
    try:
        done += 1
        c = pick(q)
        if not c: print('NONE', word); continue
        im = Image.open(io.BytesIO(get(c['thumb']))).convert('RGB')
        im.thumbnail((420, 420)); slug = re.sub(r'[^a-z0-9]+', '-', word.lower()).strip('-')
        im.save(f'{OUT}/{slug}.jpg', quality=78, optimize=True)
        credits[word] = {**c, 'img': f'images/words/{slug}.jpg'}
        print('ok', word, c['license'], c['file'][:60], flush=True)
        json.dump(credits, open(f'{OUT}/credits.json', 'w'), ensure_ascii=False, indent=1)
    except Limited:
        print('429 — 위키미디어가 잠시 막음, 다음에 이어서'); break
    except Exception as e:
        print('ERR', word, e)
json.dump(credits, open(f'{OUT}/credits.json', 'w'), ensure_ascii=False, indent=1)
print('total', len(credits), 'of', len(set(k.strip() for k in Q)))
