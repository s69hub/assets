"""Key product photos shot on plain light backgrounds into transparent PNG cutouts.

Background colour = median of the border pixels; alpha from colour distance with a soft
ramp; largest connected blobs kept; edges feathered. Used for the Photo Studio scene,
where the «before» shot needs the product without its studio backdrop.
  python3 tools/cutout.py <in> <out.png> [lo hi]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

def cutout(src, dst, lo=10.0, hi=34.0):
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(np.float32)
    h, w, _ = a.shape
    b = max(2, min(h, w) // 40)
    border = np.concatenate([a[:b].reshape(-1, 3), a[-b:].reshape(-1, 3), a[:, :b].reshape(-1, 3), a[:, -b:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    # Backdrops are often vignetted or graded, so model the background as a smooth
    # quadratic surface per channel, fitted on the border band, and key against that.
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    yn, xn = yy / h - 0.5, xx / w - 0.5
    band = np.zeros((h, w), bool); band[:b] = band[-b:] = True; band[:, :b] = band[:, -b:] = True
    basis = np.stack([np.ones_like(xn), xn, yn, xn * xn, yn * yn, xn * yn], -1)
    A = basis[band]
    surf = np.empty_like(a)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A, a[..., c][band], rcond=None)
        surf[..., c] = basis @ coef
    # perceptual-ish distance (weight green, de-weight blue)
    d = np.sqrt(((a - surf) ** 2 * np.array([0.30, 0.59, 0.11]) * 3).sum(-1))
    # also local gradient helps with low-contrast edges: use max of distance and edge strength
    alpha = np.clip((d - lo) / (hi - lo), 0, 1)
    mask = alpha > 0.5
    mask = ndi.binary_closing(mask, iterations=3)
    mask = ndi.binary_fill_holes(mask)
    lab, n = ndi.label(mask)
    if n:
        sizes = ndi.sum(mask, lab, range(1, n + 1))
        keep = np.zeros(n + 1, bool)
        big = sizes.max()
        for i, s in enumerate(sizes, 1):
            if s > big * 0.06:
                keep[i] = True
        mask = keep[lab]
    # soft edge: blur the hard mask a little and combine with the ramp inside the mask's dilation
    hard = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    soft = np.asarray(hard).astype(np.float32) / 255
    near = ndi.binary_dilation(mask, iterations=2)
    out_a = np.where(near, np.maximum(soft, alpha * soft), 0)
    rgba = np.dstack([a, out_a * 255]).astype(np.uint8)
    # trim to content + margin
    ys, xs = np.where(out_a > 0.05)
    m = 12
    y0, y1, x0, x1 = max(0, ys.min() - m), min(h, ys.max() + m), max(0, xs.min() - m), min(w, xs.max() + m)
    Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA').save(dst)
    return bg, (x1 - x0, y1 - y0), out_a.mean()

if __name__ == '__main__':
    lo = float(sys.argv[3]) if len(sys.argv) > 3 else 10.0
    hi = float(sys.argv[4]) if len(sys.argv) > 4 else 34.0
    print(cutout(sys.argv[1], sys.argv[2], lo, hi))
