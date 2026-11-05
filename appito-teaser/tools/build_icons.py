"""Pack the Lucide SVGs in video/assets/ui/icon-*.svg into video/icons.js (name -> inner markup)."""
import glob, json, os, re
here = os.path.dirname(os.path.abspath(__file__))
out = {}
for f in sorted(glob.glob(os.path.join(here, '..', 'video', 'assets', 'ui', 'icon-*.svg'))):
    name = os.path.basename(f)[5:-4]
    s = open(f, encoding='utf-8').read()
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    inner = re.search(r'<svg[^>]*>(.*)</svg>', s, flags=re.S).group(1)
    out[name] = re.sub(r'\s+', ' ', inner).strip()
with open(os.path.join(here, '..', 'video', 'icons.js'), 'w', encoding='utf-8') as fh:
    fh.write('// Lucide icons (ISC licence, lucide-static), packed by tools/build_icons.py.\n')
    fh.write('export const ICONS = ' + json.dumps(out, ensure_ascii=False, indent=0) + ';\n')
print(len(out), 'icons')
