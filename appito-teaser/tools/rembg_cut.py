"""High-quality product cutouts with rembg (isnet-general-use, local model in ~/.u2net).
  python3 tools/rembg_cut.py <out_dir> <img>...   → <out_dir>/<shop-or-cat>_<name>.png
Trimmed to content with a small margin."""
import os, sys
import numpy as np
from PIL import Image
from rembg import new_session, remove

out_dir = sys.argv[1]
os.makedirs(out_dir, exist_ok=True)
sess = new_session('isnet-general-use')
for p in sys.argv[2:]:
    im = Image.open(p).convert('RGB')
    cut = remove(im, session=sess, post_process_mask=True)
    a = np.asarray(cut)
    ys, xs = np.where(a[..., 3] > 8)
    m = 10
    y0, y1 = max(0, ys.min() - m), min(a.shape[0], ys.max() + m)
    x0, x1 = max(0, xs.min() - m), min(a.shape[1], xs.max() + m)
    name = os.path.basename(os.path.dirname(p)) + '_' + os.path.splitext(os.path.basename(p))[0] + '.png'
    Image.fromarray(a[y0:y1, x0:x1]).save(os.path.join(out_dir, name))
    print(name, (x1 - x0, y1 - y0))
