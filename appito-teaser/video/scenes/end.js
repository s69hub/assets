// 50.00–56.00 · End card. The hero's promise slams in word by word, then ad 1's glowing disc with the
// mascot, the white «appito» wordmark, «ساخت فروشگاه» and myappito.com. Holds to the loop cut.
import { el, S, tf, k, E, prog, lerp, spring, clamp, icon, shake, rng, sparkleSVG } from '../kit.js';
import { S as STR } from '../strings.js';

const A = 50.0, B = 56.0;
const W1 = [50.0, 50.25, 50.5], W2 = 51.0, DISC = 52.0, CTA = 53.0;

export default {
  id: 'end', a: A, b: B,
  build(root) {
    const st = el('style', null, root);
    st.textContent = `
      .rays { position:absolute; left:540px; top:900px; width:2400px; height:2400px; margin:-1200px 0 0 -1200px; border-radius:50%;
              background: repeating-conic-gradient(from 0deg, rgba(205,191,255,.16) 0deg 6deg, rgba(205,191,255,0) 6deg 22.5deg);
              -webkit-mask-image: radial-gradient(closest-side, #000 18%, rgba(0,0,0,0) 72%); mask-image: radial-gradient(closest-side, #000 18%, rgba(0,0,0,0) 72%); }
      .edisc { position:absolute; left:540px; top:900px; width:820px; height:820px; margin:-410px 0 0 -410px; border-radius:50%;
               background: radial-gradient(closest-side, rgba(205,191,255,.75) 0%, rgba(122,77,255,.5) 42%, rgba(122,77,255,0) 100%); }
      .ering { position:absolute; left:540px; top:900px; width:600px; height:600px; margin:-300px 0 0 -300px; border-radius:50%;
               box-shadow: 0 0 0 4px rgba(230,222,255,.75), 0 0 60px 10px rgba(164,136,255,.7), inset 0 0 60px rgba(164,136,255,.55); }
      .emasc { position:absolute; left:250px; top:610px; width:580px; height:580px; }
      .ew { position:absolute; left:0; top:0; display:inline-block; font-size:112px; font-weight:900; color:#fff; white-space:nowrap; direction:rtl; text-shadow:0 10px 40px rgba(10,6,40,.6); }
      .ew2 { position:absolute; left:0; top:378px; width:1080px; text-align:center; direction:rtl; font-size:134px; font-weight:900; line-height:1.15; white-space:nowrap; }
      .ew2 span { background: linear-gradient(to left, #ffffff 0%, #e4dbff 40%, #a488ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent;
                  filter: drop-shadow(0 10px 30px rgba(122,77,255,.6)); }
      .wm { position:absolute; left:345px; top:1178px; width:390px; }
      .cta { position:absolute; left:290px; top:1316px; width:500px; height:104px; border-radius:52px; display:flex; align-items:center; justify-content:center; gap:16px; direction:rtl;
             font-size:42px; font-weight:900; color:#fff; background:linear-gradient(150deg,#9a74ff,#6a3ff0);
             box-shadow: 0 0 0 3px rgba(255,255,255,.35) inset, 0 18px 50px rgba(122,77,255,.7), 0 0 80px rgba(164,136,255,.5); }
      .url { position:absolute; left:0; top:1434px; width:1080px; text-align:center; font-size:42px; font-weight:800; color:#cdbfff; direction:ltr; letter-spacing:.5px; }
      .esp { position:absolute; left:0; top:0; width:60px; height:60px; }
      .flashw { position:absolute; inset:0; background:radial-gradient(circle at 50% 45%, rgba(255,255,255,.95), rgba(205,191,255,.4) 40%, rgba(122,77,255,0) 75%); }
    `;
    this.rays = el('div', 'rays', root);
    this.disc = el('div', 'edisc', root);
    this.ring = el('div', 'ering', root);
    this.masc = el('img', 'emasc', root); this.masc.src = 'assets/mascot/m-waving-hello.png';
    // line 1, word by word (RTL: the first word sits on the right)
    this.w1 = STR.end1.map((w) => el('div', 'ew', root, w));
    this.w2 = el('div', 'ew2', root, `<span>${STR.end2}</span>`);
    this.wm = el('img', 'wm', root); this.wm.src = 'assets/brand/appito-white.svg';
    this.cta = el('div', 'cta', root, `${STR.cta}${icon('arrow-left', 40, 2.8, '#fff')}`);
    this.url = el('div', 'url', root, STR.url);
    const R = rng(77);
    this.sp = Array.from({ length: 16 }, (_, i) => {
      const e = el('div', 'esp', root, sparkleSVG(i % 3 === 0 ? '#ffe9a8' : '#ffffff'));
      const a = R() * Math.PI * 2, r = 320 + R() * 300;
      return { e, x: 540 + Math.cos(a) * r - 30, y: 900 + Math.sin(a) * r * 0.9 - 30, s: 0.35 + R() * 0.8, ph: R() * 6.28, sp: 1.5 + R() * 2.5 };
    });
    this.flash = el('div', 'flashw', root);
  },
  measure() {
    // lay line 1 out right-to-left, centred
    const ws = this.w1.map((e) => e.offsetWidth);
    const gap = 30, total = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
    let x = 540 + total / 2;
    this.w1x = ws.map((w) => { x -= w; const at = x; x -= gap; return at; });
  },
  update(t) {
    const fl = t >= A ? Math.exp(-(t - A) * 6) : 0;
    S(this.flash, { opacity: fl.toFixed(3), display: fl > 0.01 ? 'block' : 'none' });
    const [sx, sy] = shake(t - A, 16, 20, 8);
    // rays + disc + ring
    const dIn = spring(t - DISC, 1.8, 0.6);
    S(this.rays, { transform: tf({ s: 0.6 + 0.4 * clamp(dIn), r: (t - A) * 6 }), opacity: (0.4 + 0.6 * clamp(dIn)).toFixed(3) });
    S(this.disc, { transform: tf({ s: 0.5 + 0.5 * dIn + Math.sin(t * 2) * 0.01 }), opacity: clamp(0.35 + dIn).toFixed(3) });
    S(this.ring, { transform: tf({ s: 0.3 + 0.7 * dIn }), opacity: clamp(dIn).toFixed(3) });
    const mIn = spring(t - DISC - 0.08, 2.0, 0.55);
    const bob = t > DISC + 1 ? Math.sin((t - DISC - 1) * 2.2) * 9 : 0;
    S(this.masc, { display: t >= DISC ? 'block' : 'none', transform: tf({ y: (1 - mIn) * 700 + bob }), opacity: clamp(mIn * 2).toFixed(3) });
    // words
    this.w1.forEach((e, i) => {
      const d = t - W1[i];
      if (d < 0) { S(e, { display: 'none' }); return; }
      const u = E.outExpo(clamp(d / 0.16));
      S(e, { display: 'block', transform: tf({ x: this.w1x[i] + sx, y: 236 + sy, s: lerp(2.2, 1, u) }), opacity: clamp(d / 0.06).toFixed(3), filter: `blur(${((1 - u) * 10).toFixed(1)}px)` });
    });
    const d2 = t - W2;
    const u2 = E.outExpo(clamp(d2 / 0.2));
    const [x2, y2] = shake(d2, 14, 18, 8, 3);
    S(this.w2, { display: d2 >= 0 ? 'block' : 'none', transform: tf({ x: x2, y: y2, s: lerp(1.9, 1, u2) }), opacity: clamp(d2 / 0.07).toFixed(3), filter: `blur(${((1 - u2) * 12).toFixed(1)}px)` });
    // wordmark, CTA, url
    const wm = k(t, DISC + 0.45, 0.45, E.outCubic);
    S(this.wm, { opacity: wm.toFixed(3), transform: tf({ y: (1 - wm) * 30 }) });
    const c = spring(t - CTA, 2.6, 0.5);
    S(this.cta, { display: t >= CTA ? 'flex' : 'none', transform: tf({ s: (0.6 + 0.4 * c) * (1 + Math.sin((t - CTA) * 4) * 0.012) }), opacity: clamp(c * 2).toFixed(3) });
    const ul = k(t, CTA + 0.3, 0.4, E.outCubic);
    S(this.url, { opacity: ul.toFixed(3), transform: tf({ y: (1 - ul) * 20 }) });
    // sparkles twinkle once the disc is up
    this.sp.forEach((p) => {
      const on = t >= DISC + 0.2;
      const a = on ? Math.max(0, Math.sin((t - DISC) * p.sp + p.ph)) : 0;
      S(p.e, { display: a > 0.02 ? 'block' : 'none', transform: tf({ x: p.x, y: p.y, s: p.s * a, r: t * 40 }), opacity: a.toFixed(3) });
    });
  },
};
