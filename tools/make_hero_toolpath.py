"""Generate assets/data/hero-toolpath.json from a line drawing (white lines on a light background).
Usage: python tools/make_hero_toolpath.py drawing.jpg
Walls = centre lines of the drawing's strokes; infill = ±45° hatch inside closed regions
(the region with the thickest interior, i.e. the big window, is left empty)."""
import sys, json
import numpy as np, cv2
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import skeletonize

src = sys.argv[1] if len(sys.argv) > 1 else 'drawing.jpg'
out = sys.argv[2] if len(sys.argv) > 2 else 'assets/data/hero-toolpath.json'
im = np.array(Image.open(src).convert('L'))
m = ndi.binary_closing(ndi.binary_opening(im >= 251, iterations=1), iterations=2)
H, W = m.shape
sk = skeletonize(m)
sw = 2 * ndi.distance_transform_edt(m)[sk].mean()
pts = set(zip(*np.where(sk)))
def nb(p):
    y, x = p
    return [(y + dy, x + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and (y + dy, x + dx) in pts]
deg = {p: len(nb(p)) for p in pts}
nodes = {p for p in pts if deg[p] != 2}
seen = set(); paths = []
def walk(a, b):
    path = [a, b]; prev, cur = a, b
    while cur not in nodes:
        nx = [q for q in nb(cur) if q != prev and (min(cur, q), max(cur, q)) not in seen]
        if not nx: break
        q = nx[0]; seen.add((min(cur, q), max(cur, q))); prev, cur = cur, q; path.append(cur)
    return path
for a in nodes:
    for b in nb(a):
        e = (min(a, b), max(a, b))
        if e in seen: continue
        seen.add(e); paths.append(walk(a, b))
rest = pts - {p for pth in paths for p in pth}
while rest:
    s = rest.pop(); n0 = [q for q in nb(s) if q in rest]
    if not n0: continue
    seen.add((min(s, n0[0]), max(s, n0[0]))); fwd = walk(s, n0[0])
    back = [s]
    n1 = [q for q in nb(s) if q in rest and q not in fwd]
    if n1:
        seen.add((min(s, n1[0]), max(s, n1[0]))); back = walk(s, n1[0])
    pth = back[::-1] + fwd[1:]
    paths.append(pth); rest -= set(pth)
walls = []
for p in paths:
    spur = deg.get(p[0], 2) == 1 or deg.get(p[-1], 2) == 1
    if len(p) < 3 or (spur and len(p) < sw * 0.8): continue
    a = np.array([[x, y] for y, x in p], np.float32).reshape(-1, 1, 2)
    closed = p[0] == p[-1]
    a = cv2.approxPolyDP(a[:-1] if closed else a, 1.0, closed)[:, 0, :]
    if closed: a = np.vstack([a, a[:1]])
    walls.append([[round(float(x), 1), round(float(y), 1)] for x, y in a])
def order(ps, start):
    rem = list(ps); res = []; cur = np.array(start, float)
    while rem:
        bi, rev, bd = 0, False, 1e18
        for i, p in enumerate(rem):
            d0 = np.hypot(*(np.array(p[0]) - cur)); d1 = np.hypot(*(np.array(p[-1]) - cur))
            if d0 < bd: bi, rev, bd = i, False, d0
            if d1 < bd: bi, rev, bd = i, True, d1
        p = rem.pop(bi); p = p[::-1] if rev else p; res.append(p); cur = np.array(p[-1])
    return res
walls = order(walls, (0, H))
lab, n = ndi.label(~m)
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
areas = ndi.sum(np.ones_like(lab), lab, range(n + 1))
cand = [i for i in range(1, n + 1) if i not in border and areas[i] > 200]
win = max(cand, key=lambda i: ndi.distance_transform_edt(lab == i).max())
fill = ndi.binary_erosion(np.isin(lab, [i for i in cand if i != win]), iterations=6)
def hatch(mask, sign, sp=10):
    segs = []
    for idx, c in enumerate(np.arange(-H, W + H, sp)):
        y = np.arange(H); x = c + sign * y; ok = (x >= 0) & (x < W); y = y[ok]; x = x[ok].astype(int)
        if not len(y): continue
        v = mask[y, x]; d = np.diff(np.concatenate([[0], v.astype(int), [0]]))
        for a, b in zip(np.where(d == 1)[0], np.where(d == -1)[0] - 1):
            if b - a < 3: continue
            s = [[round(float(x[a]), 1), round(float(y[a]), 1)], [round(float(x[b]), 1), round(float(y[b]), 1)]]
            segs.append(s[::-1] if idx % 2 else s)
    return segs
data = {'w': W, 'h': H, 'wall': round(float(sw), 1), 'mm_per_px': 0.1,
        'layers': [{'walls': walls, 'infill': hatch(fill, s)} for s in (1, -1)]}
open(out, 'w').write(json.dumps(data, separators=(',', ':')))
print(len(walls), 'walls;', [len(l['infill']) for l in data['layers']], 'infill segments')

# ---- 3D solid for the orbit view: walls (strokes) and faces (filled regions) as polygons with holes, in mm, y up
def shapes(mask, eps=1.2):
    cs, hier = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    res = []
    if hier is None: return res
    hier = hier[0]
    mm = data['mm_per_px']
    def conv(c):
        a = cv2.approxPolyDP(c, eps, True)[:, 0, :]
        return [[round(float(x) * mm, 2), round(float(H - y) * mm, 2)] for x, y in a]
    for i, c in enumerate(cs):
        if hier[i][3] != -1 or cv2.contourArea(c) < 30: continue
        holes = []; j = hier[i][2]
        while j != -1:
            if cv2.contourArea(cs[j]) > 30: holes.append(conv(cs[j]))
            j = hier[j][0]
        res.append({'outer': conv(c), 'holes': holes})
    return res
faces = ndi.binary_dilation(np.isin(lab, [i for i in cand if i != win]), iterations=3) & ~m
data['solid'] = {'walls': shapes(m), 'faces': shapes(faces), 'wall_h': 6.0, 'face_h': 2.4}
open(out, 'w').write(json.dumps(data, separators=(',', ':')))
print(len(data['solid']['walls']), 'wall shapes;', len(data['solid']['faces']), 'face shapes')
