// 0.00–4.00 · The hook. «هنوز توی دایرکت می‌فروشی؟» on the series' glass plate, while customers'
// messages pile up on an accelerating grid (the score's pings land on the same times) until the
// screen floods. At 3.75 everything is sucked into one point; 4.0 is black.
import { el, S, tf, k, E, prog, lerp, spring, rng, fa, clamp } from '../kit.js';
import { S as STR } from '../strings.js';

const PINGS = [0, 0.5, 1, 1.5, 2, 2.25, 2.5, 2.75, 3, 3.125, 3.25, 3.375, 3.5, 3.5625, 3.625, 3.6875];
const VAC = 3.75, END = 4.0;
const CX = 540, CY = 980; // the point everything is sucked into (where the caret will blink)

const AV = [['م', '#ff7a59'], ['س', '#2fb6a3'], ['ر', '#7a4dff'], ['ن', '#f2b134'], ['ز', '#e2557c'], ['ک', '#3c8cf0'], ['ف', '#18a058'], ['آ', '#c76bf2']];

export default {
  id: 'hook', a: 0, b: END,
  build(root) {
    this.bubbles = [];
    const R = rng(7);
    // the sixteen readable messages, laid out like an inbox that overflows
    const slots = [
      [610, 1], [700, 0], [790, 1], [880, 0], [970, 1], [1060, 0], [1150, 1], [1240, 0],
      [1330, 1], [655, 0], [745, 1], [835, 0], [925, 1], [1015, 0], [1105, 1], [1195, 0],
    ];
    STR.dms.forEach((txt, i) => {
      const [y, side] = slots[i];
      const b = el('div', 'bub', root);
      const [ini, col] = AV[i % AV.length];
      b.innerHTML = `<span class="av" style="background:${col}">${ini}</span><span class="tx">${txt}</span>`;
      const x = side ? 940 : 140; // anchor: right edge for side 1, left edge for side 0
      this.bubbles.push({ e: b, t: PINGS[i], y, side, x, r: (R() - 0.5) * (i > 8 ? 9 : 4), big: true, w: 0 });
    });
    // the flood: small «قیمت؟» bubbles everywhere, 3.30 → 3.74
    for (let i = 0; i < 70; i++) {
      const b = el('div', 'bub small', root);
      const [ini, col] = AV[(i * 3) % AV.length];
      b.innerHTML = `<span class="av" style="background:${col}">${ini}</span><span class="tx">${STR.dmFlood}</span>`;
      const t = 3.3 + (i / 70) * 0.44;
      this.bubbles.push({ e: b, t, y: 520 + R() * 1150, side: 2, x: 60 + R() * 760, r: (R() - 0.5) * 24, big: false, s0: 0.75 + R() * 0.6 });
    }
    // the plate
    this.plate = el('div', 'plate', root);
    this.plate.innerHTML = `<div class="pl1">${STR.hook1}</div><div class="pl2">${STR.hook2}</div>`;
    this.badge = el('div', 'badge', root);

    const st = el('style', null, root);
    st.textContent = `
      .bub { position:absolute; left:0; top:0; display:flex; align-items:center; gap:16px; direction:rtl; padding:18px 30px 18px 22px;
             background:#fff; color:#0b0a24; border-radius:34px; font-size:42px; font-weight:800; white-space:nowrap;
             box-shadow:0 18px 40px -14px rgba(6,4,30,.65); }
      .bub .av { width:58px; height:58px; border-radius:50%; display:grid; place-items:center; color:#fff; font-size:30px; font-weight:900; flex-shrink:0; }
      .bub.small { font-size:30px; padding:10px 20px 10px 14px; gap:10px; border-radius:24px; }
      .bub.small .av { width:38px; height:38px; font-size:20px; }
      .plate { left:540px; top:236px; }
      .plate .pl1, .plate .pl2 { font-size:84px; font-weight:900; line-height:1.18; color:#fff; white-space:nowrap; }
      .badge { position:absolute; left:0; top:0; min-width:92px; height:92px; padding:0 22px; border-radius:46px; background:#ff3b5c;
               color:#fff; font-size:44px; font-weight:900; display:grid; place-items:center; box-shadow:0 10px 30px rgba(255,59,92,.55), 0 0 0 6px #0b0a24; direction:ltr; }
    `;
  },
  measure() {
    for (const b of this.bubbles) b.w = b.e.offsetWidth;
    this.pw = this.plate.offsetWidth;
  },
  update(t) {
    const vac = prog(t, VAC, END);
    const vu = E.inOutCubic(vac);
    // stress shake grows with the flood
    const stress = clamp((t - 2.6) / 1.15) * (1 - vac);
    const sx = Math.sin(t * 91) * 7 * stress, sy = Math.cos(t * 77) * 5 * stress;

    // plate: there at frame 0, breathes, is sucked in last
    const pv = E.inCubic(prog(t, VAC + 0.06, END));
    const px0 = 540 - this.pw / 2, py0 = 236;
    const pcx = lerp(px0, CX - this.pw / 2, pv), pcy = lerp(py0, CY - 150, pv);
    S(this.plate, {
      left: '0px', top: '0px',
      transform: tf({ x: pcx + sx, y: pcy + sy, s: (1 + Math.sin(t * 3) * 0.008) * (1 - pv * 0.97), r: pv * -40 }),
      opacity: (1 - prog(t, END - 0.06, END)).toFixed(3),
      filter: `blur(${(pv * 14).toFixed(2)}px)`,
    });

    // unread counter: climbs with every message, ends at 99+
    const n = this.bubbles.filter((b) => t >= b.t).length;
    const shown = n >= 40 ? '۹۹+' : fa(Math.max(1, n));
    if (this.badge.__n !== shown) { this.badge.textContent = shown; this.badge.__n = shown; }
    const lastPing = PINGS.filter((p) => p <= t).pop() ?? 0;
    const bump = 1 + 0.18 * Math.exp(-(t - lastPing) * 14);
    S(this.badge, {
      transform: tf({ x: lerp(px0 + this.pw - 62, CX, pv) + sx, y: lerp(py0 - 34, CY, pv) + sy, s: bump * (1 - pv) }),
      opacity: (t >= 0 ? 1 - pv : 0).toFixed(3),
    });

    for (const b of this.bubbles) {
      const dt = t - b.t;
      if (dt < 0) { S(b.e, { display: 'none' }); continue; }
      S(b.e, { display: 'flex' });
      const sp = spring(dt, 3.2, 0.42);
      let x = b.side === 1 ? b.x - b.w : b.side === 0 ? b.x : b.x;
      let y = b.y;
      // the inbox scrolls up as messages arrive (big ones only)
      if (b.big) y -= Math.max(0, n - 10) * 8;
      const s0 = b.big ? 1 : b.s0;
      let s = s0 * lerp(0.55, 1, sp);
      let r = b.r * sp;
      // vacuum: everything spirals into the point
      if (vac > 0) {
        const cx = x + b.w / 2, cy = y + 40;
        const ang = vu * 2.4;
        const dx = (cx - CX) * (1 - vu), dy = (cy - CY) * (1 - vu);
        const rx = dx * Math.cos(ang) - dy * Math.sin(ang), ry = dx * Math.sin(ang) + dy * Math.cos(ang);
        x = CX + rx - b.w / 2; y = CY + ry - 40;
        s *= 1 - vu * 0.96; r += vu * 220;
      }
      S(b.e, {
        transform: tf({ x: x + sx, y: y + sy, s, r }),
        opacity: (Math.min(1, dt / 0.06) * (1 - prog(t, END - 0.05, END))).toFixed(3),
        filter: vac > 0 ? `blur(${(vu * 10).toFixed(2)}px)` : 'none',
      });
    }
  },
};
