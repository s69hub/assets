// Renders video/index.html frame by frame with the pre-installed Chromium.
//
//   node render/render.mjs still 0 3.2 12.5 ...      → out/probe/t-<sec>.png (one browser)
//   node render/render.mjs frames [from] [to] [workers] → PNG frames piped into ffmpeg chunks, then joined
//                                                      → out/picture.mp4 (silent, near-lossless)
//
// The page exposes window.__ready and window.__seek(ms); every pixel is a pure function of
// the time, so frames can be rendered out of order in parallel browsers.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out');
const FPS = 60;
const DURATION = 56.0;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav' };

function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, resp) => {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { resp.writeHead(404); resp.end(); return; }
      resp.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(f).pipe(resp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/video/index.html`);
  await page.waitForFunction(() => window.__ready !== undefined);
  await page.evaluate(() => window.__ready);
  return page;
}

async function shot(page, t) {
  await page.evaluate((ms) => window.__seek(ms), t * 1000);
  return page.screenshot({ type: 'png', omitBackground: false });
}

const mode = process.argv[2] || 'still';
const srv = await serve();
const port = srv.address().port;

if (mode === 'still') {
  const times = process.argv.slice(3).map(Number);
  fs.mkdirSync(path.join(OUT, 'probe'), { recursive: true });
  const browser = await chromium.launch();
  const page = await openPage(browser, port);
  for (const t of times) {
    const buf = await shot(page, t);
    const f = path.join(OUT, 'probe', `t-${t.toFixed(3)}.png`);
    fs.writeFileSync(f, buf);
    console.log(f);
  }
  await browser.close();
} else if (mode === 'frames') {
  const total = Math.round(DURATION * FPS);
  const from = Number(process.argv[3] ?? 0), to = Number(process.argv[4] ?? total);
  const workers = Number(process.argv[5] ?? 4);
  const outName = process.argv[6] ?? 'picture.mp4'; // a partial range can go to its own file
  const chunkDir = path.join(OUT, outName === 'picture.mp4' ? 'chunks' : 'chunks-' + path.parse(outName).name);
  fs.mkdirSync(chunkDir, { recursive: true });
  const per = Math.ceil((to - from) / workers);
  const t0 = Date.now();
  const jobs = [];
  for (let w = 0; w < workers; w++) {
    const a = from + w * per, b = Math.min(to, a + per);
    if (a >= b) continue;
    jobs.push((async () => {
      const browser = await chromium.launch();
      const page = await openPage(browser, port);
      const file = path.join(chunkDir, `c${String(w).padStart(2, '0')}.mp4`);
      // near-lossless intermediate; the final encode happens in tools/master.sh
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '8', '-pix_fmt', 'yuv420p', '-g', String(FPS), file], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = a; f < b; f++) {
        const buf = await shot(page, f / FPS);
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
        if ((f - a) % 120 === 0) console.log(`worker ${w}: frame ${f} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
      }
      ff.stdin.end();
      await new Promise((r) => ff.on('close', r));
      await browser.close();
      return file;
    })());
  }
  const files = await Promise.all(jobs);
  const list = path.join(chunkDir, 'list.txt');
  fs.writeFileSync(list, files.sort().map((f) => `file '${f}'`).join('\n'));
  await new Promise((r) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(OUT, outName)], { stdio: 'inherit' }).on('close', r));
  console.log(`done: ${files.length} chunks, ${(to - from)} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s → out/${outName}`);
}
srv.close();
