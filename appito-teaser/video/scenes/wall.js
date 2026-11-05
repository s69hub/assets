// 44.00–50.00 · The wall: nine more features land one per beat (44.0 … 48.0), the full wall
// holds 48.0–49.5 so every tile can be read, then collapses into the end card.
import { el, S, tf, k, E, prog, lerp, spring, clamp, icon, headline } from '../kit.js';
import { S as STR } from '../strings.js';

const A = 44.0, B = 50.0, T0 = 44.0, HOLD = 48.0, COLLAPSE = 49.5;
const TILE = 250, GAP = 25, X0 = 140, Y0 = 452;
const GRAD = [
  ['#f59e0b', '#c2410c'], ['#8e66ff', '#5a32d6'], ['#06b6d4', '#0e6f8f'],
  ['#3b82f6', '#1d4ed8'], ['#ec4899', '#a21caf'], ['#10b981', '#047857'],
  ['#1e1b4b', '#131443'], ['#f97316', '#b91c1c'], ['#6d28d9', '#312e81'],
];

export default {
  id: 'wall', a: A, b: B,
  build(root) {
    const st = el('style', null, root);
    st.textContent = `
      .tile { position:absolute; left:0; top:0; width:${TILE}px; height:${TILE}px; border-radius:40px; direction:rtl; color:#fff; padding:26px 24px 24px; overflow:hidden;
              box-shadow: 0 26px 50px -22px rgba(0,0,0,.8), inset 0 0 0 2px rgba(255,255,255,.18); backface-visibility:hidden; }
      .tile .ic { opacity:.95; }
      .tile .s { position:absolute; left:22px; top:30px; font-size:22px; font-weight:800; opacity:.85; white-space:nowrap; direction:rtl; }
      .tile .l { position:absolute; right:24px; left:20px; bottom:22px; font-size:34px; font-weight:900; line-height:1.25; }
      .tile .gl { position:absolute; inset:-40%; background:linear-gradient(115deg, rgba(255,255,255,0) 40%, rgba(255,255,255,.35) 50%, rgba(255,255,255,0) 60%); }
      .tile .big { position:absolute; left:20px; top:20px; font-size:44px; font-weight:900; direction:ltr; }
      .tile .disc { width:76px; height:76px; border-radius:50%; }
      .tile .q { position:absolute; left:20px; right:20px; top:96px; height:44px; border-radius:22px; background:rgba(255,255,255,.92); color:#0e6f8f; font-size:21px; font-weight:800;
                 display:flex; align-items:center; gap:8px; padding:0 14px; white-space:nowrap; }
    `;
    this.tiles = STR.tiles.map((d, i) => {
      const e = el('div', 'tile', root);
      e.style.background = `linear-gradient(150deg, ${GRAD[i][0]}, ${GRAD[i][1]})`;
      if (i === 6) e.style.boxShadow = '0 26px 50px -22px rgba(0,0,0,.8), inset 0 0 0 3px rgba(164,136,255,.75)';
      let top = icon(d.icon, 74, 2, '#fff');
      if (i === 1) top = `<img class="disc" src="assets/brand/agent-disc.svg">`;
      let extra = `<span class="s">${d.s}</span>`;
      if (i === 0) extra = `<span class="big">${d.s}</span>`;
      if (i === 2) extra = `<div class="q">${icon('search', 22, 2.6, '#0e6f8f')}${d.s}</div>`;
      e.innerHTML = `${top}${extra}<div class="l">${d.l}</div><div class="gl"></div>`;
      const row = Math.floor(i / 3), col = i % 3;
      return { e, gl: e.querySelector('.gl'), t: T0 + i * 0.5, x: X0 + (2 - col) * (TILE + GAP), y: Y0 + row * (TILE + GAP) };
    });
    this.hl = headline(root, { l1: '', l2: STR.wallTitle, a: A + 0.05, b: COLLAPSE, size2: 72 });
  },
  update(t) {
    this.tiles.forEach((d, i) => {
      if (t < d.t) { S(d.e, { display: 'none' }); return; }
      S(d.e, { display: 'block' });
      const u = clamp(spring(t - d.t, 2.6, 0.5), 0, 1.2);
      const land = E.outCubic(prog(t, d.t, d.t + 0.3));
      const c = E.inBack(prog(t, COLLAPSE + i * 0.015, COLLAPSE + 0.38 + i * 0.015));
      const x = lerp(d.x, 540 - TILE / 2, c), y = lerp(d.y, 960 - TILE / 2, c);
      S(d.e, {
        transform: `perspective(1400px) ` + tf({ x, y: y - (1 - land) * 120, s: (0.7 + 0.3 * u) * (1 - c * 0.85), r: c * (i % 2 ? 40 : -40) }) + ` rotateX(${((1 - land) * -75).toFixed(2)}deg)`,
        opacity: (clamp(land * 2) * (1 - prog(t, COLLAPSE + 0.25, COLLAPSE + 0.45))).toFixed(3),
      });
      // a sheen passes over the wall while it holds
      const sh = prog(t, HOLD + 0.1 + i * 0.05, HOLD + 0.9 + i * 0.05);
      S(d.gl, { transform: tf({ x: lerp(-520, 520, sh) }), opacity: sh > 0 && sh < 1 ? '1' : '0' });
    });
    this.hl.update(t);
  },
};
