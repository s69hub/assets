// 20.00–28.00 · Photo Studio.
//   20.0  the mascot with its camera; 21.0 shutter + flash
//   21.1  a teapot set shot on the living-room rug, crooked and warm («قبل»)
//   22.0  a scan line wipes the backdrop to transparency, then to a clean studio card; the product straightens («بعد»)
//   23.75 eight more messy shots fly in; 24.0/24.5/25.0 each row snaps into identical cards (shutters)
//   25.5/26.0 every card's background changes together; 27.5 the phone buzzes → Bale
import { el, S, tf, k, E, prog, lerp, spring, clamp, headline, rng, sparkleSVG } from '../kit.js';
import { S as STR } from '../strings.js';

const A = 20.0, B = 28.0;
const SHUT = 21.0, SCAN0 = 22.0, SCAN1 = 22.6, AFTER = 22.75, GRID = 23.75;
const ROWS = [24.0, 24.5, 25.0];
const BG = [[25.5, '#ece6ff'], [26.0, '#dff5ea']];
const BG0 = '#f6efe4';
const CARD = 240, GAP = 20, GX = 160, GY = 600;
const ITEMS = [
  ['lalejin-turquoise-pottery', 'p3'], ['lalejin-turquoise-pottery', 'p1'], ['tehran-sneakers', 'p2'],
  ['attar-oud', 'p1'], ['mountain-honey', 'p1'], ['neyshabur-turquoise-silver', 'p1'],
  ['gaz-sohan-sweets', 'p1'], ['persian-greenhouse', 'p1'], ['yazd-termeh', 'p1'],
];
const HC = { x: 240, y: 560, s: 600 }; // the hero card

export default {
  id: 'photo', a: A, b: B,
  build(root) {
    const st = el('style', null, root);
    st.textContent = `
      .pmasc { position:absolute; left:0; top:0; width:640px; height:640px; }
      .flash { position:absolute; inset:0; background:#fff; }
      .burst { position:absolute; left:0; top:0; width:900px; height:900px; border-radius:50%; background:radial-gradient(closest-side, rgba(255,255,255,1), rgba(255,255,255,0)); }
      .hcard { position:absolute; left:${HC.x}px; top:${HC.y}px; width:${HC.s}px; height:${HC.s}px; border-radius:40px; overflow:hidden;
               box-shadow: 0 40px 90px -30px rgba(0,0,0,.8), 0 0 0 3px rgba(255,255,255,.12); }
      .hcard .lay { position:absolute; inset:0; }
      .hcard .rug { position:absolute; left:-15%; top:-15%; width:130%; height:130%; object-fit:cover; filter: sepia(.35) saturate(1.25) brightness(.8) contrast(1.05); }
      .hcard .checker { background-color:#fff; background-image: linear-gradient(45deg,#d9d9de 25%,transparent 25%),linear-gradient(-45deg,#d9d9de 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d9d9de 75%),linear-gradient(-45deg,transparent 75%,#d9d9de 75%);
               background-size:44px 44px; background-position:0 0,0 22px,22px -22px,-22px 0; }
      .hcard .clean { background: radial-gradient(120% 100% at 50% 30%, #fffaf2 0%, ${BG0} 60%, #eadfcd 100%); }
      .hcard .shadow { position:absolute; left:110px; top:430px; width:380px; height:60px; border-radius:50%; background:radial-gradient(closest-side, rgba(60,40,20,.45), rgba(60,40,20,0)); }
      .hcard .prod { position:absolute; left:60px; top:110px; width:480px; height:auto; }
      .scanline { position:absolute; left:${HC.x - 30}px; width:${HC.s + 60}px; height:8px; border-radius:4px; background:#fff;
                  box-shadow: 0 0 22px 8px rgba(122,77,255,.95), 0 0 60px 20px rgba(219,39,119,.6); }
      .lbl { position:absolute; left:0; top:0; padding:10px 28px; border-radius:999px; font-size:36px; font-weight:900; direction:rtl; box-shadow:0 10px 26px rgba(0,0,0,.35); }
      .spk { position:absolute; left:0; top:0; width:56px; height:56px; }
      .gcard { position:absolute; left:0; top:0; border-radius:28px; overflow:hidden; box-shadow:0 22px 40px -18px rgba(0,0,0,.7); }
      .gcard .orig { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
      .gcard .cln { position:absolute; inset:0; display:grid; place-items:center; }
      .gcard .cln img { max-width:78%; max-height:78%; filter: drop-shadow(0 16px 14px rgba(40,25,10,.28)); }
      .sw { position:absolute; top:1392px; width:78px; height:78px; border-radius:50%; box-shadow: inset 0 0 0 3px rgba(255,255,255,.7); }
      .swring { position:absolute; top:1380px; width:102px; height:102px; border-radius:50%; box-shadow: 0 0 0 5px #fff, 0 0 26px rgba(164,136,255,.9); }
    `;
    this.masc = el('img', 'pmasc', root); this.masc.src = 'assets/mascot/m-photo-camera.png';

    // hero card
    this.hc = el('div', 'hcard', root);
    this.rugL = el('div', 'lay', this.hc); const rug = el('img', 'rug', this.rugL); rug.src = 'assets/products/handicraft/handwoven-rug.webp';
    this.chk = el('div', 'lay checker', this.hc);
    this.cln = el('div', 'lay clean', this.hc);
    this.shadow = el('div', 'shadow', this.hc);
    this.prod = el('img', 'prod', this.hc); this.prod.src = 'assets/cut/lalejin-turquoise-pottery_p3.png';
    this.scan = el('div', 'scanline', root);
    this.lblB = el('div', 'lbl', root, STR.before); Object.assign(this.lblB.style, { background: '#fff', color: '#0b0a24' });
    this.lblA = el('div', 'lbl', root, STR.after); Object.assign(this.lblA.style, { background: '#01c457', color: '#fff' });
    const R = rng(33);
    this.spk = Array.from({ length: 7 }, (_, i) => { const e = el('div', 'spk', root, sparkleSVG(i % 2 ? '#fff' : '#cdbfff')); return { e, x: HC.x + 40 + R() * 520, y: HC.y + 30 + R() * 520, d: R() * 0.25, s: 0.5 + R() * 0.9 }; });

    // grid
    this.cards = ITEMS.map(([shop, p], i) => {
      const c = el('div', 'gcard', root);
      const o = el('img', 'orig', c); o.src = `assets/shops/${shop}/${p}.webp`;
      const cl = el('div', 'cln', c); const ci = el('img', null, cl); ci.src = `assets/cut/${shop}_${p}.png`;
      const row = Math.floor(i / 3), col = i % 3;
      const tx = GX + (2 - col) * (CARD + GAP), ty = GY + row * (CARD + GAP); // RTL: first item on the right
      const w = 190 + R() * 140, h = w * (0.7 + R() * 0.75);
      return { c, o, cl, row, tx, ty, mx: tx + (R() - 0.5) * 200 - (w - CARD) / 2, my: ty + (R() - 0.5) * 220 - (h - CARD) / 2, mw: w, mh: h, mr: (R() - 0.5) * 26, delay: R() * 0.12, from: [(R() - 0.5) * 1600, 1300 + R() * 600] };
    });
    this.sws = [BG0, BG[0][1], BG[1][1]].map((col, i) => { const e = el('div', 'sw', root); e.style.background = col; e.style.left = 540 + (1 - i) * 120 - 39 + 'px'; return e; });
    this.swr = el('div', 'swring', root);

    this.flash = el('div', 'flash', root);
    this.burst = el('div', 'burst', root);

    this.h1 = headline(root, { l1: STR.photo, l2: STR.photoLine, a: A + 0.05, b: GRID - 0.05, size2: 72, color1: '#ffb3d6' });
    this.h2 = headline(root, { l1: STR.photo, l2: `${STR.gridL1}،<br>${STR.gridL2}`, a: GRID + 0.2, b: 27.45, size2: 64, color1: '#ffb3d6' });
  },
  update(t) {
    // ── mascot: center stage, then steps aside to watch ──
    const mIn = spring(t - A, 2.2, 0.55);
    const side = k(t, SHUT + 0.05, 0.4, E.inOutCubic);
    const mOut = k(t, GRID - 0.15, 0.35, E.inCubic);
    const msz = lerp(640, 400, side);
    const shutterKick = t >= SHUT && t < SHUT + 0.25 ? Math.sin(((t - SHUT) / 0.25) * Math.PI) * 0.04 : 0;
    S(this.masc, {
      transform: tf({ x: lerp(220, 40, side) - mOut * 500, y: lerp(620, 1150, side) + (1 - mIn) * 900, s: (msz / 640) * (1 - shutterKick) }),
      opacity: (1 - mOut).toFixed(3), display: t < GRID + 0.25 ? 'block' : 'none', transformOrigin: '0 0',
    });

    // ── flash ──
    const fl = t >= SHUT ? Math.exp(-(t - SHUT) * 9) : 0;
    S(this.flash, { opacity: (fl * 0.95).toFixed(3), display: fl > 0.01 ? 'block' : 'none' });
    S(this.burst, { opacity: (fl).toFixed(3), display: fl > 0.01 ? 'block' : 'none', transform: tf({ x: 540 - 450, y: 880 - 450, s: 0.3 + (1 - fl) * 1.6 }) });

    // ── hero card ──
    const hcOn = t >= SHUT && t < GRID + 0.3;
    S(this.hc, { display: hcOn ? 'block' : 'none' });
    const scanU = E.inOutQuad(prog(t, SCAN0, SCAN1));
    const lineY = HC.y + scanU * HC.s;
    if (hcOn) {
      const dev = k(t, SHUT, 0.35, E.outCubic);
      const toGrid = k(t, GRID, 0.3, E.inOutCubic);
      const g = this.cards[0];
      const gx = lerp(HC.x, g.tx, toGrid), gy = lerp(HC.y, g.ty, toGrid), gs = lerp(1, CARD / HC.s, toGrid);
      S(this.hc, { transform: tf({ x: gx - HC.x, y: gy - HC.y, s: gs * (0.92 + 0.08 * dev) }), transformOrigin: '0 0', opacity: dev.toFixed(3), borderRadius: lerp(40, 28 / gs, toGrid).toFixed(1) + 'px' });
      const cut = scanU * HC.s;
      S(this.rugL, { clipPath: `inset(${cut.toFixed(1)}px 0 0 0)` });
      S(this.chk, { clipPath: `inset(0 0 ${(HC.s - cut).toFixed(1)}px 0)`, opacity: (1 - prog(t, SCAN1 - 0.1, AFTER)).toFixed(3) });
      S(this.cln, { clipPath: `inset(0 0 ${(HC.s - cut).toFixed(1)}px 0)`, opacity: prog(t, SCAN0 + 0.25, AFTER).toFixed(3) });
      const st = E.outBack(prog(t, SCAN0 + 0.1, SCAN1 + 0.12));
      S(this.prod, { transform: tf({ x: lerp(46, 0, st), y: lerp(40, 0, st), r: lerp(-10, 0, st), s: lerp(0.84, 1, st) }), filter: `sepia(${(0.3 * (1 - st)).toFixed(2)}) brightness(${lerp(0.82, 1, st).toFixed(2)})` });
      S(this.shadow, { opacity: prog(t, SCAN1 - 0.1, AFTER).toFixed(3) });
    }
    S(this.scan, { display: t >= SCAN0 - 0.02 && t <= SCAN1 + 0.05 ? 'block' : 'none', transform: tf({ y: lineY - 4 }) });
    // labels
    const lb = window01(t, SHUT + 0.3, SCAN0 + 0.15, 0.15, 0.12);
    S(this.lblB, { opacity: lb.toFixed(3), display: lb > 0 ? 'block' : 'none', transform: tf({ x: HC.x + HC.s - 120, y: HC.y - 26, s: 0.8 + 0.2 * lb }) });
    const la = window01(t, AFTER, GRID, 0.12, 0.12);
    const lap = spring(t - AFTER, 3.5, 0.45);
    S(this.lblA, { opacity: la.toFixed(3), display: la > 0 ? 'block' : 'none', transform: tf({ x: HC.x + HC.s - 120, y: HC.y - 26, s: 0.6 + 0.4 * lap }) });
    this.spk.forEach((p) => {
      const d = t - AFTER - p.d;
      const on = d > 0 && d < 0.7;
      S(p.e, { display: on ? 'block' : 'none' });
      if (on) S(p.e, { transform: tf({ x: p.x, y: p.y, s: Math.sin((d / 0.7) * Math.PI) * p.s, r: d * 120 }) });
    });

    // ── grid ──
    let bg = BG0;
    for (const [T, col] of BG) if (t >= T) bg = col;
    this.cards.forEach((g, i) => {
      if (i === 0 && t < GRID + 0.3) { S(g.c, { display: 'none' }); return; }
      if (t < GRID) { S(g.c, { display: 'none' }); return; }
      S(g.c, { display: 'block' });
      const fin = E.outCubic(prog(t, GRID + g.delay, GRID + g.delay + 0.3));
      const snapT = ROWS[g.row];
      const sn = E.outBackSoft(prog(t, snapT - 0.06, snapT + 0.22));
      const x = lerp(lerp(g.mx + g.from[0], g.mx, fin), g.tx, sn);
      const y = lerp(lerp(g.my + g.from[1], g.my, fin), g.ty, sn);
      const w = lerp(g.mw, CARD, sn), h = lerp(g.mh, CARD, sn);
      const out = k(t, 27.5, 0.5, E.inCubic);
      const buzz = t >= 27.5 ? Math.sin(t * 190) * 9 * (1 - out) : 0;
      S(g.c, {
        transform: tf({ x: x + buzz, y: y + out * 1100, r: lerp(g.mr, 0, sn) }),
        width: w.toFixed(1) + 'px', height: h.toFixed(1) + 'px',
      });
      S(g.cl, { opacity: clamp(sn * 1.4).toFixed(3), background: bg });
      S(g.o, { opacity: (1 - clamp(sn * 1.6)).toFixed(3) });
    });
    // swatches
    const swOn = t >= 25.2 && t < 27.6;
    this.sws.forEach((e, i) => { S(e, { display: swOn ? 'block' : 'none', opacity: (window01(t, 25.2 + i * 0.05, 27.6, 0.2, 0.2)).toFixed(3) }); });
    let si = 0; for (const [T] of BG) if (t >= T) si++;
    const sx = 540 + (1 - si) * 120 - 51;
    let prevX = 540 + (1 - Math.max(0, si - 1)) * 120 - 51;
    const lastT = si > 0 ? BG[si - 1][0] : 25.2;
    const mv = E.outBack(prog(t, lastT, lastT + 0.22));
    S(this.swr, { display: swOn ? 'block' : 'none', left: lerp(prevX, sx, mv).toFixed(1) + 'px', opacity: window01(t, 25.2, 27.6, 0.2, 0.2).toFixed(3) });

    this.h1.update(t); this.h2.update(t);
  },
};

function window01(t, a, b, fin = 0.25, fout = 0.2) {
  if (t < a || t > b) return 0;
  return Math.min(prog(t, a, a + fin), 1 - prog(t, b - fout, b));
}
