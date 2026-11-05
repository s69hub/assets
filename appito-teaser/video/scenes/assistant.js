// 4.00–10.00 · «تو فقط بگو…» typed into the silence, one key per 16th; at 6.0 (drop 1) it lifts into the
// headline and the mascot rises on ad 1's glowing disc while the six jobs land in orbit, one per beat.
// 9.5: the design job's violet orb swallows the frame → Design Studio.
import { el, S, tf, k, E, prog, lerp, spring, clamp, icon, JOB } from '../kit.js';
import { S as STR } from '../strings.js';

const KEYS = [4.25, 4.375, 4.5, 4.625, 4.75, 4.875, 5.0, 5.125, 5.25, 5.375, 5.5];
const DROP = 6.0;
const ORB_T = [6.5, 7.0, 7.5, 8.0, 8.5, 9.0];
const ORBS = [
  ['products', 'package-plus'], ['design', 'palette'], ['images', 'image-plus'],
  ['blog', 'notebook-pen'], ['sales', 'trending-up'], ['support', 'message-circle-reply'],
];
const WIPE = 9.5;

export default {
  id: 'assistant', a: 4.0, b: 10.0,
  build(root) {
    const st = el('style', null, root);
    st.textContent = `
      .say { position:absolute; left:0; top:0; width:1080px; text-align:center; direction:rtl; font-size:132px; font-weight:900; color:#fff; white-space:nowrap; line-height:1.2; }
      .say .caret { display:inline-block; width:9px; height:124px; margin-inline-start:10px; vertical-align:-14px; border-radius:5px; background:#a488ff; box-shadow:0 0 24px #7a4dff; }
      .sayglow { position:absolute; left:140px; top:640px; width:800px; height:640px; border-radius:50%;
                 background: radial-gradient(closest-side, rgba(122,77,255,.75), rgba(122,77,255,0)); }
      .disc { position:absolute; left:160px; top:520px; width:760px; height:760px; border-radius:50%;
              background: radial-gradient(closest-side, rgba(164,136,255,.55) 0%, rgba(122,77,255,.32) 45%, rgba(122,77,255,0) 100%); }
      .ring { position:absolute; left:250px; top:610px; width:580px; height:580px; border-radius:50%;
              box-shadow: 0 0 0 3px rgba(205,191,255,.55), 0 0 40px 6px rgba(164,136,255,.55), inset 0 0 50px rgba(164,136,255,.45); }
      .masc { position:absolute; left:220px; top:540px; width:640px; height:640px; }
      .orb { position:absolute; left:0; top:0; width:116px; height:116px; border-radius:50%; display:grid; place-items:center; color:#fff;
             box-shadow: 0 14px 30px -8px rgba(0,0,0,.55), inset 0 0 0 3px rgba(255,255,255,.35); }
      .namepill { position:absolute; left:0; top:1318px; width:1080px; display:flex; justify-content:center; direction:rtl; }
      .namepill span { display:inline-flex; align-items:center; gap:14px; padding:12px 30px 12px 26px; border-radius:999px; font-size:36px; font-weight:800;
                       background:rgba(19,20,67,.82); box-shadow: inset 0 0 0 2px rgba(164,136,255,.7), 0 10px 30px rgba(10,6,40,.5); }
      .namepill i { width:14px; height:14px; border-radius:50%; background:#01c457; box-shadow:0 0 12px #01c457; }
      .job { position:absolute; left:0; top:1396px; width:1080px; text-align:center; direction:rtl; font-size:64px; font-weight:900; white-space:nowrap; }
      .wipe { position:absolute; left:0; top:0; width:200px; height:200px; border-radius:50%; background:#7c3aed; }
    `;
    this.glow = el('div', 'sayglow', root);
    this.disc = el('div', 'disc', root);
    this.ring = el('div', 'ring', root);
    this.orbs = ORBS.map(([job, ic], i) => {
      const o = el('div', 'orb', root, icon(ic, 58, 2.2, '#fff'));
      o.style.background = `radial-gradient(circle at 35% 30%, ${JOB[job]}ee, ${JOB[job]})`;
      return { e: o, t: ORB_T[i], job };
    });
    this.masc = el('img', 'masc', root);
    this.masc.src = 'assets/mascot/m-waving-hello.png';
    this.say = el('div', 'say', root);
    this.chars = Array.from(STR.say);
    this.l2 = el('div', 'hl2', root, STR.oneConv);
    Object.assign(this.l2.style, { position: 'absolute', left: '140px', width: '800px', top: '330px', textAlign: 'center', fontSize: '74px', direction: 'rtl' });
    this.name = el('div', 'namepill', root, `<span><i></i>${STR.aiName}</span>`);
    this.jobs = STR.jobs.map((j, i) => {
      const e = el('div', 'job', root, j);
      e.style.color = Object.values(JOB)[i] === JOB.products ? '#7fa8ff' : ['#7fa8ff', '#b99bff', '#ff8cc0', '#5fd0ea', '#4fd6a6', '#ffb24d'][i];
      return e;
    });
    this.wipe = el('div', 'wipe', root);
  },
  update(t) {
    // ── the typed line ──
    const n = KEYS.filter((x) => t >= x).length;
    const txt = this.chars.slice(0, n).join('');
    const blinkOn = n === 0 || n === this.chars.length ? ((t * 2) % 1) < 0.55 : true;
    const html = `${txt}<span class="caret" style="opacity:${blinkOn && t < DROP ? 1 : 0}"></span>`;
    if (this.say.__h !== html) { this.say.innerHTML = html; this.say.__h = html; }
    // lifts into the headline at the drop
    const up = k(t, DROP, 0.42, E.outQuint);
    const fade = 1 - prog(t, WIPE + 0.1, WIPE + 0.35);
    S(this.say, {
      transform: tf({ y: lerp(900, 176, up), s: lerp(1, 0.42, up) }),
      color: up > 0 ? `rgb(${Math.round(lerp(255, 205, up))},${Math.round(lerp(255, 191, up))},255)` : '#fff',
      opacity: fade.toFixed(3),
    });
    // the swell before the drop
    const g = prog(t, 5.0, DROP) * (1 - k(t, DROP, 0.5));
    S(this.glow, { opacity: (g * 0.9).toFixed(3), transform: tf({ s: 0.6 + g * 0.6 }) });

    // ── line 2 ──
    const l2 = k(t, DROP + 0.25, 0.45, E.outQuint);
    S(this.l2, { opacity: (Math.min(1, prog(t, DROP + 0.25, DROP + 0.45)) * fade).toFixed(3), transform: tf({ y: (1 - l2) * 40 }), filter: `blur(${((1 - l2) * 8).toFixed(2)}px)` });

    // ── disc + mascot ──
    const sp = spring(t - DROP, 2.0, 0.5);
    const out = k(t, WIPE, 0.4, E.inCubic);
    S(this.disc, { opacity: (clamp(sp * 1.2) * (1 - out)).toFixed(3), transform: tf({ s: 0.4 + 0.6 * sp + Math.sin(t * 2.2) * 0.015 }) });
    S(this.ring, { opacity: (clamp(sp) * (1 - out) * 0.9).toFixed(3), transform: tf({ s: (0.6 + 0.4 * sp) * (1 + Math.sin(t * 3.1) * 0.01) }) });
    const bob = t > DROP + 1 ? Math.sin((t - DROP - 1) * 2.4) * 10 : 0;
    const squash = 1 + Math.sin(clamp((t - DROP - 0.25) / 0.35) * Math.PI) * 0.05;
    S(this.masc, {
      opacity: (t >= DROP ? 1 - out : 0).toFixed(3),
      transform: tf({ y: (1 - sp) * 760 + bob - out * 40, sx: 1 / squash, sy: squash, s: 1 - out * 0.15 }),
    });

    // ── orbit: six jobs, one per beat; back half behind the mascot, front half below its feet ──
    const cx = 540, cy = 1128, rx = 418, ry = 112;
    this.orbs.forEach((o, i) => {
      const dt = t - o.t;
      if (dt < 0) { S(o.e, { display: 'none' }); return; }
      S(o.e, { display: 'grid' });
      const th = -Math.PI / 2 + (i / 6) * Math.PI * 2 + (t - 6.5) * 0.9;
      const z = Math.sin(th); // >0: front
      let x = cx + Math.cos(th) * rx, y = cy + z * ry;
      const pop = spring(dt, 3.0, 0.45);
      let s = (0.82 + 0.26 * (z + 1) / 2) * pop;
      let op = 1;
      if (t >= WIPE) {
        const u = k(t, WIPE, 0.3, E.inCubic);
        if (o.job === 'design') { x = lerp(x, 540, u); y = lerp(y, 960, u); }
        else { op = 1 - u; s *= 1 - u * 0.5; }
      }
      S(o.e, { transform: tf({ x: x - 58, y: y - 58, s }), zIndex: z > 0 ? '5' : '1', opacity: op.toFixed(3) });
    });
    S(this.masc, { zIndex: '3' });

    // ── name pill + the job cycler ──
    const np = k(t, 6.35, 0.4, E.outBack);
    S(this.name, { opacity: (Math.min(1, prog(t, 6.35, 6.5)) * fade).toFixed(3), transform: tf({ y: (1 - np) * 30 }) });
    this.jobs.forEach((e, i) => {
      const a = ORB_T[i], b = i < 5 ? ORB_T[i + 1] : WIPE;
      const on = t >= a && t < b;
      if (!on) { S(e, { display: 'none' }); return; }
      const u = k(t, a, 0.16, E.outCubic);
      const v = i < 5 ? k(t, b - 0.08, 0.08, E.inCubic) : k(t, b - 0.12, 0.12, E.inCubic);
      S(e, { display: 'block', opacity: (u * (1 - v)).toFixed(3), transform: tf({ y: (1 - u) * 26 - v * 18, s: 0.94 + 0.06 * u }) });
    });

    // ── the wipe: the design orb swallows the frame ──
    const w = k(t, WIPE + 0.12, 0.38, E.inQuart);
    S(this.wipe, { display: t >= WIPE + 0.12 ? 'block' : 'none', transform: tf({ x: 440, y: 860, s: 0.58 + w * 22 }), zIndex: '9' });
  },
};
