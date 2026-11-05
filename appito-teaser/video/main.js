import { W, H, FPS, el, S, tf, lerp, prog, E, hash, clamp } from './kit.js';
import hook from './scenes/hook.js';
import assistant from './scenes/assistant.js';
import design from './scenes/design.js';
import photo from './scenes/photo.js';
import bale from './scenes/bale.js';
import product from './scenes/product.js';
import voice from './scenes/voice.js';
import wall from './scenes/wall.js';
import end from './scenes/end.js';

const SCENES = [hook, assistant, design, photo, bale, product, voice, wall, end];
const stage = document.getElementById('stage');

// ── the world: ad 1's violet night, its glows retinted per scene ────────────
// keyframes: t, glow A rgb, glow B rgb, glow C rgb, brightness
const WORLD = [
  [0.0, [122, 77, 255], [43, 26, 140], [1, 223, 251], 0.85],
  [3.7, [122, 77, 255], [43, 26, 140], [1, 223, 251], 1.0],
  [4.0, [60, 40, 160], [20, 14, 70], [20, 20, 60], 0.25],
  [5.6, [60, 40, 160], [20, 14, 70], [20, 20, 60], 0.35],
  [6.0, [122, 77, 255], [74, 47, 181], [164, 136, 255], 1.0],
  [9.6, [124, 58, 237], [74, 47, 181], [164, 136, 255], 1.0],
  [10.2, [122, 77, 255], [30, 20, 110], [1, 150, 200], 0.8],
  [19.6, [122, 77, 255], [30, 20, 110], [1, 150, 200], 0.8],
  [20.2, [219, 39, 119], [90, 30, 160], [122, 77, 255], 0.9],
  [27.6, [219, 39, 119], [90, 30, 160], [122, 77, 255], 0.9],
  [28.2, [1, 160, 120], [40, 30, 130], [122, 77, 255], 0.85],
  [35.8, [1, 160, 120], [40, 30, 130], [122, 77, 255], 0.85],
  [36.2, [37, 99, 235], [60, 30, 150], [122, 77, 255], 0.9],
  [39.8, [37, 99, 235], [60, 30, 150], [122, 77, 255], 0.9],
  [40.2, [219, 39, 119], [74, 47, 181], [253, 157, 15], 0.85],
  [43.8, [219, 39, 119], [74, 47, 181], [253, 157, 15], 0.85],
  [44.2, [122, 77, 255], [30, 20, 110], [1, 223, 251], 0.9],
  [49.8, [122, 77, 255], [30, 20, 110], [1, 223, 251], 1.0],
  [50.0, [140, 95, 255], [74, 47, 181], [164, 136, 255], 1.25],
  [56.0, [140, 95, 255], [74, 47, 181], [164, 136, 255], 1.1],
];
function worldAt(t) {
  let i = 0;
  while (i < WORLD.length - 2 && t > WORLD[i + 1][0]) i++;
  const p = WORLD[i], q = WORLD[i + 1];
  const u = E.inOutSine(prog(t, p[0], q[0]));
  const m = (a, b) => a.map((v, j) => Math.round(lerp(v, b[j], u)));
  return { a: m(p[1], q[1]), b: m(p[2], q[2]), c: m(p[3], q[3]), k: lerp(p[4], q[4], u) };
}

const world = el('div', 'world', stage);
const base = el('div', 'base', world);
const neb = el('img', 'neb', world); neb.src = 'assets/ui/nebula.webp';
const gA = el('div', 'glow', world), gB = el('div', 'glow', world), gC = el('div', 'glow', world);

const layer = el('div', 'abs', stage);
layer.style.width = W + 'px'; layer.style.height = H + 'px';
const vignette = el('div', 'vignette', stage);
const grain = el('div', 'grain', stage);
const grains = Array.from({ length: 8 }, (_, i) => `url(assets/ui/grain/g${i}.png)`);

function updateWorld(t) {
  const w = worldAt(t);
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
  S(base, { background: `radial-gradient(130% 90% at 50% 38%, ${rgba(w.b, 0.55 * w.k)} 0%, #0b0a24 70%)` });
  const d = t * 0.35;
  S(gA, { background: `radial-gradient(circle, ${rgba(w.a, 0.5 * w.k)} 0%, rgba(0,0,0,0) 62%)`, transform: tf({ x: -420 + Math.sin(d) * 80, y: -380 + Math.cos(d * 0.8) * 60 }) });
  S(gB, { background: `radial-gradient(circle, ${rgba(w.b, 0.65 * w.k)} 0%, rgba(0,0,0,0) 60%)`, transform: tf({ x: 120 + Math.cos(d * 0.7) * 90, y: 900 + Math.sin(d * 0.9) * 70 }) });
  S(gC, { background: `radial-gradient(circle, ${rgba(w.c, 0.22 * w.k)} 0%, rgba(0,0,0,0) 58%)`, transform: tf({ x: -200 + Math.sin(d * 1.3) * 70, y: 1300 + Math.cos(d) * 50 }) });
  S(neb, { opacity: (0.32 * w.k).toFixed(3), transform: tf({ x: Math.sin(t * 0.05) * 30, y: -t * 2, s: 1.05 + t * 0.002 }) });
}

// ── scenes ──────────────────────────────────────────────────────────────────
const ctx = { env: null, stage, layer };
for (const sc of SCENES) {
  sc.root = el('div', 'scene', layer);
  sc.root.dataset.id = sc.id;
  sc.build(sc.root, ctx);
}

function frameAt(t) {
  updateWorld(t);
  for (const sc of SCENES) {
    const on = t >= sc.a && t < sc.b;
    S(sc.root, { display: on ? 'block' : 'none' });
    if (on) sc.update(t, ctx);
  }
  const f = Math.round(t * FPS);
  S(grain, { backgroundImage: grains[f % 8], transform: tf({ x: -Math.floor(hash(f) * 60), y: -Math.floor(hash(f + 7) * 60) }) });
}

// ── readiness: fonts, every image decoded, Vazirmatn proven to be what renders ──
async function ready() {
  try {
    const r = await fetch('../music/envelope.json');
    if (r.ok) ctx.env = await r.json();
  } catch (e) { /* the picture does not need it */ }
  await document.fonts.load('900 80px Vazirmatn', 'فروشگاه');
  await document.fonts.load('900 80px Vazirmatn', 'myappito.com');
  await document.fonts.ready;
  const imgs = [...document.images];
  await Promise.all(imgs.map((i) => (i.complete ? i.decode().catch(() => {}) : new Promise((res) => { i.onload = i.onerror = () => res(); }).then(() => i.decode().catch(() => {})))));
  const c = document.createElement('canvas').getContext('2d');
  const w = (fam, s) => { c.font = `800 62px ${fam}`; return c.measureText(s).width; };
  const own = (s) => ['serif', 'sans-serif'].every((f) => w(f, s) !== w('Vazirmatn', s));
  if (!own('فروشگاه اینترنتی ۱۲۳') || !own('myappito.com')) throw new Error('Vazirmatn is not what renders');
  for (const sc of SCENES) if (sc.measure) sc.measure(ctx);
}

window.__ready = ready().then(() => { frameAt(0); return true; });
window.__seek = async (ms) => {
  await window.__ready;
  frameAt(ms / 1000);
  return true;
};
window.__duration = 56.0;

// preview helpers (not used by the renderer)
const q = new URLSearchParams(location.search);
if (q.has('t')) window.__ready.then(() => frameAt(parseFloat(q.get('t'))));
if (q.has('play')) {
  window.__ready.then(() => {
    const t0 = performance.now() - (parseFloat(q.get('play')) || 0) * 1000;
    const loop = () => { frameAt(((performance.now() - t0) / 1000) % 56); requestAnimationFrame(loop); };
    loop();
  });
}
