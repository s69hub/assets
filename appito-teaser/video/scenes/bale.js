// 28.00–36.00 · The Bale bot (bale-moment.tsx, in the bot's own words). Neutral chat chrome in
// Appito's colours — no Bale logo or UI; «بله» appears as a word only.
//   28.0 notification lands · 28.75 tap opens the chat · 29.0 the order · 30.5 tap «تأیید واریز»
//   31.0 it asks again («پول با دو تأیید») · 33.75 tap «بله، تأیید» · 34.0 the music stops: «بله.»
//   35.0 the confirmation and the panel's log «از بله»
import { el, S, tf, k, E, prog, lerp, spring, clamp, icon, headline, pointer, shake } from '../kit.js';
import { S as STR } from '../strings.js';

const A = 28.0, B = 36.0;
const NOTIF = 28.0, OPEN = 28.75, M1 = 29.0, TAP1 = 30.5, M2 = 31.0, TAP2 = 33.75, SLAM = 34.0, BACK = 35.0;
const PX = 120, PY = 236, PW = 840, PH = 944;

export default {
  id: 'bale', a: A, b: B,
  build(root) {
    const st = el('style', null, root);
    st.textContent = `
      .notif { position:absolute; left:140px; top:236px; width:800px; border-radius:40px; padding:26px 30px; display:flex; gap:22px; align-items:flex-start; direction:rtl;
               background:rgba(255,255,255,.95); color:#0b0a24; box-shadow:0 30px 70px -20px rgba(0,0,0,.7), 0 0 0 2px rgba(255,255,255,.6) inset; }
      .notif .ico { width:96px; height:96px; border-radius:26px; background:#f2ecff; display:grid; place-items:center; flex-shrink:0; box-shadow: inset 0 0 0 2px #e2d9ff, 0 8px 20px rgba(122,77,255,.35); }
      .notif .ico img { width:56px; height:70px; object-fit:contain; }
      .notif .top { display:flex; align-items:baseline; gap:12px; }
      .notif b { font-size:36px; font-weight:900; }
      .notif .sub { font-size:26px; color:#6f6c80; font-weight:600; }
      .notif .l1 { font-size:33px; font-weight:800; margin-top:8px; }
      .notif .l2 { font-size:31px; font-weight:700; margin-top:4px; color:#3b3170; }
      .panel { position:absolute; left:${PX}px; top:${PY}px; width:${PW}px; height:${PH}px; border-radius:46px; overflow:hidden; direction:rtl; color:#0b0a24;
               background:#f3efff; box-shadow:0 40px 90px -30px rgba(0,0,0,.85), 0 0 0 3px rgba(205,191,255,.5); transform-origin:50% 0; }
      .panel .bar { height:118px; display:flex; align-items:center; gap:20px; padding:0 30px; background:#fff; border-bottom:2px solid #ebe6fb; }
      .panel .bar .av { width:78px; height:78px; border-radius:50%; background:#f2ecff; display:grid; place-items:center; box-shadow: inset 0 0 0 2px #e2d9ff; }
      .panel .bar .av img { width:44px; height:54px; object-fit:contain; }
      .panel .bar b { font-size:36px; font-weight:900; display:block; }
      .panel .bar span { font-size:25px; color:#6f6c80; font-weight:600; }
      .panel .bar .bot { margin-inline-start:auto; font-size:24px; font-weight:800; color:#7a4dff; background:#f2ecff; padding:8px 18px; border-radius:999px; }
      .panel .area { position:absolute; left:0; right:0; top:118px; bottom:0; overflow:hidden;
                     background-color:#f3efff; background-image: radial-gradient(circle at 1px 1px, rgba(46,46,116,.12) 1.6px, transparent 0); background-size:30px 30px; }
      .col { position:absolute; left:26px; right:26px; bottom:26px; display:flex; flex-direction:column; align-items:flex-start; gap:14px; }
      .bb { max-width:660px; background:#fff; border-radius:32px; border-start-start-radius:32px; border-end-start-radius:10px; padding:20px 26px 14px; box-shadow:0 2px 3px rgba(0,0,0,.06), 0 14px 30px -18px rgba(30,20,90,.35); }
      .bb .shop { font-size:27px; font-weight:900; color:#7a4dff; }
      .bb .t { font-size:33px; font-weight:800; margin-top:4px; }
      .bb .o { font-size:31px; font-weight:700; margin-top:2px; }
      .bb .n { font-size:24px; color:#6f6c80; margin-top:8px; line-height:1.55; }
      .bb .tm { display:flex; justify-content:flex-end; gap:6px; align-items:center; font-size:22px; color:#8a86a0; margin-top:6px; }
      .bb .q { border-inline-start:5px solid #a488ff; padding-inline-start:14px; margin-bottom:10px; font-size:24px; color:#6f6c80; line-height:1.5; }
      .bb .q b { color:#7a4dff; display:block; }
      .kb { width:660px; display:grid; grid-template-columns:1fr 1fr; gap:10px; overflow:hidden; }
      .kb div { height:76px; border-radius:22px; background:rgba(255,255,255,.9); color:#3b3170; font-size:30px; font-weight:800; display:flex; align-items:center; justify-content:center; gap:10px;
                box-shadow:0 2px 0 rgba(122,77,255,.12); }
      .kb .wide { grid-column: span 2; }
      .log { position:absolute; left:${PX + 30}px; width:${PW - 60}px; top:1206px; border-radius:30px; background:#fff; padding:22px 26px; direction:rtl; color:#0b0a24;
             box-shadow:0 26px 60px -20px rgba(8,4,40,.7), 0 0 0 2px rgba(122,77,255,.25); }
      .log .h { display:flex; align-items:center; gap:10px; font-size:24px; color:#6f6c80; font-weight:800; }
      .log .r { display:flex; gap:16px; align-items:flex-start; margin-top:12px; font-size:27px; line-height:1.6; }
      .log .m { width:56px; height:56px; border-radius:50%; background:#f2ecff; color:#7a4dff; font-weight:900; display:grid; place-items:center; flex-shrink:0; font-size:28px; }
      .log .tag { display:inline-flex; align-items:center; gap:8px; margin-top:6px; padding:4px 16px; border-radius:999px; background:#e9fbf1; color:#0f8a4a; font-size:22px; font-weight:800; }
      .twotap { position:absolute; left:140px; width:800px; top:1200px; text-align:center; direction:rtl; }
      .twotap span { display:inline-flex; align-items:center; gap:12px; padding:12px 26px; border-radius:999px; background:rgba(19,20,67,.85); color:#e6defe; font-size:30px; font-weight:800;
                     box-shadow: inset 0 0 0 2px rgba(164,136,255,.6); }
      .slam { position:absolute; inset:0; overflow:hidden; background: radial-gradient(90% 60% at 50% 45%, #22e07a 0%, #01b553 55%, #017a3a 100%); }
      .slam .w { position:absolute; left:0; top:600px; width:1080px; text-align:center; direction:rtl; font-size:560px; font-weight:900; line-height:1; color:#fff;
                 text-shadow: 0 30px 80px rgba(0,60,25,.45); }
      .slam .s { position:absolute; left:0; top:1290px; width:1080px; text-align:center; direction:rtl; font-size:66px; font-weight:900; color:#eafff1; }
      .slam .ring { position:absolute; left:540px; top:900px; width:400px; height:400px; margin:-200px 0 0 -200px; border-radius:50%; border:16px solid rgba(255,255,255,.75); }
    `;
    // notification
    this.notif = el('div', 'notif', root);
    this.notif.innerHTML = `<div class="ico"><img src="assets/brand/logo-mark.png"></div>
      <div style="flex:1"><div class="top"><b>${STR.botName}</b><span class="sub">${STR.inBale} · ${STR.now}</span></div>
      <div class="l1">${STR.cardToCard}</div><div class="l2">${STR.order}</div></div>`;
    // chat panel
    this.panel = el('div', 'panel', root);
    this.panel.innerHTML = `<div class="bar"><div class="av"><img src="assets/brand/logo-mark.png"></div><div><b>${STR.botName}</b><span>${STR.inBale}</span></div><span class="bot">ربات</span></div><div class="area"><div class="col"></div></div>`;
    const col = this.panel.querySelector('.col');
    this.col = col;
    this.b1 = el('div', 'bb', col, `<div class="shop">${STR.shopName}</div><div class="t">${STR.cardToCard}</div><div class="o">${STR.order}</div><div class="n">${STR.receiptNote}</div><div class="tm">${STR.t1120} ${icon('check-check', 26, 2.4, '#7a4dff')}</div>`);
    this.kb1 = el('div', 'kb', col, `<div class="k1">${STR.confirmPay}</div><div>${STR.reject}</div><div class="wide">${STR.seeReceipt} ${icon('arrow-left', 26, 2.4)}</div>`);
    this.b2 = el('div', 'bb', col, `<div class="t" style="margin:0">${STR.ask}</div><div class="tm">${STR.t1121} ${icon('check-check', 26, 2.4, '#7a4dff')}</div>`);
    this.kb2 = el('div', 'kb', col, `<div class="k2">${STR.yes}</div><div>${STR.cancel}</div>`);
    this.b3 = el('div', 'bb', col, `<div class="q"><b>اپیتو</b>${STR.cardToCard}</div><div class="t" style="font-size:30px">${STR.done}</div>`);
    this.items = [[this.b1, M1], [this.kb1, M1 + 0.12], [this.b2, M2], [this.kb2, M2 + 0.12], [this.b3, BACK]];
    this.k1 = this.kb1.querySelector('.k1');
    this.k2 = this.kb2.querySelector('.k2');
    this.log = el('div', 'log', root, `<div class="h">${icon('history', 28)}${STR.log}</div><div class="r"><span class="m">م</span><div>${STR.logLine}<br><span class="tag">${icon('check', 22, 3)}${STR.fromBale}</span></div></div>`);
    this.two = el('div', 'twotap', root, `<span>${icon('shield-check', 32, 2.4)}${STR.twoTaps}</span>`);
    this.hl = headline(root, { l1: '', l2: `${STR.baleTitle1}<br>${STR.baleTitle2}`, top: 1298, a: NOTIF + 0.15, b: SLAM, size2: 64 });
    // the slam
    this.slam = el('div', 'slam', root, `<div class="ring"></div><div class="w">${STR.bale}</div><div class="s">${STR.baleSub}</div>`);
    this.sw = this.slam.querySelector('.w');
    this.ss = this.slam.querySelector('.s');
    this.sr = this.slam.querySelector('.ring');
  },
  measure() {
    // heights of each chat item, and where the two buttons sit when they are pressed
    S(this.panel, { display: 'block', transform: 'none' });
    const show = (n) => this.items.forEach(([e], i) => { e.style.display = i < n ? '' : 'none'; e.style.height = ''; });
    show(5);
    this.h = this.items.map(([e]) => e.offsetHeight + 14);
    show(2);
    let r = this.k1.getBoundingClientRect();
    this.p1 = [r.left + r.width / 2, r.top + r.height / 2];
    show(4);
    r = this.k2.getBoundingClientRect();
    this.p2 = [r.left + r.width / 2, r.top + r.height / 2];
    this.ptr = pointer(this.panel.parentNode, [
      { t: 28.45, x: 1020, y: 600 }, { t: 28.7, x: 560, y: 360 }, { t: 29.2, x: 800, y: 1120 },
      { t: 30.2, x: this.p1[0] + 30, y: this.p1[1] + 20 }, { t: 31.1, x: this.p1[0] + 70, y: this.p1[1] + 160 },
      { t: 33.3, x: this.p2[0] + 30, y: this.p2[1] + 20 }, { t: 33.9, x: this.p2[0] + 40, y: this.p2[1] + 40 },
    ], [OPEN, TAP1, TAP2], { a: 28.4, b: SLAM });
    show(0);
  },
  update(t) {
    const out = k(t, B - 0.3, 0.3, E.inCubic);
    // ── notification ──
    const nIn = spring(t - NOTIF, 2.8, 0.55);
    const nOut = k(t, OPEN, 0.2, E.inCubic);
    S(this.notif, { display: t < OPEN + 0.22 ? 'flex' : 'none', transform: tf({ y: (1 - nIn) * -420, s: 1 + nOut * 0.06 }), opacity: (1 - nOut).toFixed(3) });
    // ── panel ──
    const pIn = E.outBack(prog(t, OPEN, OPEN + 0.4));
    const panelOn = t >= OPEN;
    S(this.panel, { display: panelOn ? 'block' : 'none', transform: tf({ sy: lerp(0.22, 1, clamp(pIn)), sx: lerp(0.95, 1, clamp(pIn)), y: out * -60 }), opacity: (clamp(prog(t, OPEN, OPEN + 0.15)) * (1 - out)).toFixed(3) });
    if (panelOn) {
      let offset = 0;
      this.items.forEach(([e, at], i) => {
        if (t < at) { S(e, { display: 'none' }); return; }
        const u = E.outCubic(prog(t, at, at + 0.32));
        offset += this.h[i] * (1 - u);
        let hgt = '';
        // keyboards are taken away once the decision is made
        if ((e === this.kb1 || e === this.kb2) && t >= SLAM + 0.1) {
          const c = E.inOutCubic(prog(t, SLAM + 0.1, SLAM + 0.5));
          hgt = ((this.h[i] - 14) * (1 - c)).toFixed(1) + 'px';
        }
        S(e, { display: e.classList.contains('kb') ? 'grid' : 'block', opacity: clamp(u * 1.6).toFixed(3), transform: tf({ s: 0.92 + 0.08 * u }), transformOrigin: '100% 100%', height: hgt });
      });
      S(this.col, { transform: tf({ y: offset }) });
      // button presses and the glow that pulses as the riser builds
      const pr = (tp) => (t >= tp - 0.06 && t < tp + 0.14 ? 1 - Math.abs(t - tp) / 0.14 : 0);
      S(this.k1, { transform: tf({ s: 1 - pr(TAP1) * 0.06 }), background: t >= TAP1 ? '#e7defe' : 'rgba(255,255,255,.9)' });
      let pulse = 0;
      for (const p of [33.0, 33.25, 33.5, 33.625, 33.6875, 33.71875]) if (t >= p) pulse = Math.max(pulse, Math.exp(-(t - p) * 10));
      S(this.k2, { transform: tf({ s: 1 - pr(TAP2) * 0.06 + pulse * 0.04 }), background: t >= 33.0 ? '#7a4dff' : 'rgba(255,255,255,.9)', color: t >= 33.0 ? '#fff' : '#3b3170',
        boxShadow: `0 0 ${(10 + pulse * 40).toFixed(0)}px rgba(122,77,255,${(0.3 + pulse * 0.6).toFixed(2)})` });
    }
    // ── two-tap caption ──
    const tw = window01(t, M2 + 0.1, SLAM, 0.25, 0.1);
    S(this.two, { opacity: tw.toFixed(3), display: tw > 0 ? 'block' : 'none', transform: tf({ y: (1 - E.outCubic(prog(t, M2 + 0.1, M2 + 0.4))) * 30 }) });
    // ── log card ──
    const lg = spring(t - (BACK + 0.25), 3, 0.6);
    S(this.log, { display: t >= BACK + 0.25 ? 'block' : 'none', transform: tf({ y: (1 - lg) * 200 + out * -60 }), opacity: (clamp(lg * 2) * (1 - out)).toFixed(3) });
    // ── the slam ──
    const slamOn = t >= SLAM && t < BACK + 0.2;
    S(this.slam, { display: slamOn ? 'block' : 'none' });
    if (slamOn) {
      const d = t - SLAM;
      const [sx, sy] = shake(d, 30, 22, 7);
      const sc = lerp(2.6, 1, E.outExpo(clamp(d / 0.14)));
      S(this.sw, { transform: tf({ x: sx, y: sy, s: sc }), filter: `blur(${(Math.max(0, 1 - d / 0.1) * 14).toFixed(1)}px)` });
      const su = E.outCubic(prog(t, SLAM + 0.5, SLAM + 0.8));
      S(this.ss, { opacity: su.toFixed(3), transform: tf({ y: (1 - su) * 40 }) });
      const ru = prog(t, SLAM, SLAM + 0.6);
      S(this.sr, { opacity: (1 - ru).toFixed(3), transform: tf({ s: 0.4 + E.outCubic(ru) * 4.5 }) });
      // exits as a fast iris to the chat
      const ex = E.inCubic(prog(t, BACK - 0.02, BACK + 0.18));
      S(this.slam, { clipPath: ex > 0 ? `circle(${((1 - ex) * 1300).toFixed(0)}px at 540px 900px)` : 'none' });
    }
    this.hl.update(t);
    if (this.ptr) this.ptr.update(t);
  },
};

function window01(t, a, b, fin = 0.25, fout = 0.2) {
  if (t < a || t > b) return 0;
  return Math.min(prog(t, a, a + fin), 1 - prog(t, b - fout, b));
}
