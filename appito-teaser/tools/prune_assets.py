"""Delete copied assets the reel does not use (keeps the commit lean). Dry run unless --apply."""
import os, re, sys, glob
here = os.path.dirname(os.path.abspath(__file__))
video = os.path.join(here, '..', 'video')
code = ''.join(open(f, encoding='utf-8').read() for f in glob.glob(os.path.join(video, '*.js')) + glob.glob(os.path.join(video, 'scenes', '*.js')) + glob.glob(os.path.join(video, '*.html')) + glob.glob(os.path.join(video, '*.css')))
used = set(re.findall(r'assets/[A-Za-z0-9_./-]+\.(?:png|webp|svg|woff2|jpg)', code))
# dynamic references
from_items = re.findall(r"\['([a-z-]+)', '(p\d)'\]", open(os.path.join(video, 'scenes', 'photo.js'), encoding='utf-8').read())
for shop, p in from_items:
    used.add(f'assets/shops/{shop}/{p}.webp'); used.add(f'assets/cut/{shop}_{p}.png')
roll = re.search(r"const ROLL = \[(.*?)\];", open(os.path.join(video, 'scenes', 'design.js'), encoding='utf-8').read()).group(1)
for sid in re.findall(r"'([a-z-]+)'", roll):
    used.add(f'assets/stores/{sid}.png')
used |= {f'assets/ui/grain/g{i}.png' for i in range(8)}
keep_dirs = ('assets/ui/icon-',)  # icon sources for tools/build_icons.py
drop, size = [], 0
for f in glob.glob(os.path.join(video, 'assets', '**', '*'), recursive=True):
    if os.path.isdir(f):
        continue
    rel = os.path.relpath(f, video).replace(os.sep, '/')
    if rel in used or rel.startswith(keep_dirs) or rel.endswith('shops.json'):
        continue
    drop.append(rel); size += os.path.getsize(f)
print(f'{len(drop)} unused files, {size/1e6:.1f} MB')
for r in sorted(drop):
    print('  -', r)
if '--apply' in sys.argv:
    for r in drop:
        os.remove(os.path.join(video, r))
    for d in sorted(glob.glob(os.path.join(video, 'assets', '**'), recursive=True), reverse=True):
        if os.path.isdir(d) and not os.listdir(d):
            os.rmdir(d)
    print('removed')
