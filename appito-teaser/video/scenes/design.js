// 10.00–20.00 · Design Studio.
//   10.1–11.5  the studio's real starter is typed into the composer over a plain default store
//   12.0       SEND (drop 2): the sentence's letters fly into the phone…
//   12.5–14.0  …and each band of the store becomes the designed one, one per beat (ad 9's saffron storefront)
//   15.7–17.5  «برای هر کسب‌وکاری» — a slot-machine roll lands on other shops on the shuffle cues, back home at 17.5
//   18.0       tap «انتشار» → «منتشر شد», the address bar draws
import { el, S, tf, k, E, prog, lerp, spring, clamp, icon, splitFa, headline, pointer, hash, rng } from '../kit.js';
import { S as STR } from '../strings.js';

const A = 10.0, B = 20.0;
const SEND = 12.0;
const BANDS = [ // screen-space (390×844 pt) bands, and the beat each one transforms on
  { y0: 0, y1: 110, t: 12.5 },
  { y0: 110, y1: 520, t: 13.0 },
  { y0: 520, y1: 780, t: 13.5 },
  { y0: 780, y1: 844, t: 14.0 },
];
const WORD_BAND = [0, 0, 1, 1, 2, 3]; // یک طرح | تازه برای | فروشگاهم | بساز
const SC = 1.7, PX = 194, PY = 470, BZ = 14, SX = PX + BZ, SY = PY + BZ, SW = 390 * SC, SH = 844 * SC;
const TYPE0 = 10.1, TYPE1 = 11.5;
const ROLL = ['saffron-crimson', 'attar-oud', 'yazd-termeh', 'mountain-honey', 'lalejin-turquoise-pottery', 'gaz-sohan-sweets', 'tehran-sneakers', 'tea-copper-samovar', 'neyshabur-turquoise-silver', 'saffron-crimson'];
const LAND = [[16.0, 2], [16.5, 4], [17.0, 6], [17.5, 9]];
const NAMES = { 'yazd-termeh': 'ترمه یزد', 'lalejin-turquoise-pottery': 'لالجین آبی', 'tehran-sneakers': 'اسنیکر نو', 'saffron-crimson': 'زعفران سرخ' };
const PUB = 18.0;

const PLAIN_PRODUCTS = [
  ['assets/shops/saffron-crimson/p1.webp', 'زعفران رشته‌ای', '۱٬۸۵۰٬۰۰۰ تومان'],
  ['assets/shops/saffron-crimson/p2.webp', 'زعفران سرگل نیم مثقالی', '۹۸۰٬۰۰۰ تومان'],
  ['assets/shops/saffron-crimson/p3.webp', 'پیمانهٔ برنجی زعفران', '۲٬۴۰۰٬۰۰۰ تومان'],
  ['assets/shops/saffron-crimson/p1.webp', 'زعفران رشته‌ای', '۱٬۸۵۰٬۰۰۰ تومان'],
];

export default {
  id: 'design', a: A, b: B,
  build(root) {
    const st = el('style', null, root);
    st.textContent = `
      .pst { position:absolute; left:0; top:0; width:390px; height:844px; background:#fff; color:#111827; direction:rtl; font-family:Vazirmatn; transform-origin:0 0; }
      .pst .hdr { height:56px; display:flex; align-items:center; gap:10px; padding:0 16px; }
      .pst .hdr b { font-size:18px; font-weight:900; }
      .pst .hdr .sp { flex:1; }
      .pst .hdr .tl { display:flex; gap:16px; color:#6b7280; }
      .pst .search { margin:6px 14px 0; height:42px; border-radius:12px; background:#f3f4f6; display:flex; align-items:center; gap:8px; padding:0 12px; color:#9ca3af; font-size:13px; }
      .pst .banner { margin:14px 14px 0; height:170px; border-radius:14px; border:2px dashed #d1d5db; background:#f9fafb; display:grid; place-items:center; color:#9ca3af; font-size:13px; text-align:center; }
      .pst .banner div { display:grid; justify-items:center; gap:8px; }
      .pst .chips { display:flex; gap:8px; padding:14px 14px 0; }
      .pst .chips span { border:1px solid #e5e7eb; border-radius:10px; padding:6px 12px; font-size:12px; color:#374151; }
      .pst h4 { margin:16px 16px 10px; font-size:15px; font-weight:900; }
      .pst .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:0 14px; }
      .pst .pc { border:1px solid #e5e7eb; border-radius:12px; padding:8px; }
      .pst .pc .im { height:112px; border-radius:8px; background:#f3f4f6; display:grid; place-items:center; overflow:hidden; }
      .pst .pc .im img { width:84px; height:84px; object-fit:cover; border-radius:4px; }
      .pst .pc b { display:block; margin-top:8px; font-size:12px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .pst .pc span { display:block; margin-top:3px; font-size:11px; color:#6b7280; }
      .pst .pc .add { margin-top:8px; height:30px; border-radius:7px; background:#2563eb; color:#fff; font-size:11px; font-weight:700; display:grid; place-items:center; }
      .pst nav { position:absolute; left:0; right:0; bottom:0; height:64px; display:flex; justify-content:space-around; align-items:center; border-top:1px solid #e5e7eb; background:#fff; color:#6b7280; font-size:10.5px; }
      .pst nav div { display:grid; justify-items:center; gap:3px; }
      .pst nav .on { color:#2563eb; }
      .aft { position:absolute; left:0; top:0; width:${SW}px; height:${SH}px; }
      .edge { position:absolute; top:0; width:6px; border-radius:3px; background:#fff; box-shadow:0 0 18px 6px rgba(164,136,255,.95), 0 0 50px 12px rgba(122,77,255,.7); }
      .bandflash { position:absolute; left:0; width:${SW}px; background:linear-gradient(to bottom, rgba(205,191,255,.0), rgba(205,191,255,.55), rgba(205,191,255,.0)); mix-blend-mode:screen; }
      .reel { position:absolute; left:0; top:0; width:${SW}px; }
      .reel img { width:${SW}px; height:${SH}px; }
      .addr { position:absolute; left:0; top:0; width:${SW}px; height:${54 * SC}px; display:flex; align-items:center; justify-content:center; gap:12px;
              background:rgba(255,255,255,.96); color:#111; font-size:30px; font-weight:700; direction:ltr; box-shadow:0 6px 20px rgba(0,0,0,.18); }
      .addr .lock { color:#01a64a; }
      .comp { position:absolute; left:150px; top:1300px; width:780px; height:118px; border-radius:59px; background:#fff; direction:rtl;
              display:flex; align-items:center; padding:0 34px 0 18px; gap:16px; color:#0b0a24;
              box-shadow:0 0 0 3px rgba(122,77,255,.55), 0 26px 60px -18px rgba(8,4,40,.8), 0 0 50px rgba(122,77,255,.35); }
      .comp .tx { flex:1; font-size:40px; font-weight:700; white-space:nowrap; overflow:hidden; }
      .comp .ph { color:#9a96b0; font-weight:600; }
      .comp .caret { display:inline-block; width:4px; height:46px; margin-inline-start:4px; vertical-align:-8px; background:#7a4dff; border-radius:2px; }
      .comp .send { width:84px; height:84px; border-radius:50%; background:#7a4dff; display:grid; place-items:center; color:#fff; box-shadow:0 8px 24px rgba(122,77,255,.6); }
      .comp .send svg { transform: scaleX(-1); }
      .lt { position:absolute; left:0; top:0; font-size:40px; font-weight:800; color:#fff; white-space:pre; direction:rtl;
            text-shadow:0 0 18px rgba(164,136,255,.95), 0 0 40px rgba(122,77,255,.8); }
      .measure { position:absolute; left:0; top:0; visibility:hidden; font-size:40px; font-weight:700; white-space:nowrap; direction:rtl; }
      .measure span { display:inline-block; white-space:pre; }
      .rec { position:absolute; left:150px; top:1272px; width:780px; border-radius:36px; background:#fff; direction:rtl; color:#0b0a24; padding:26px 30px 28px;
             box-shadow:0 0 0 3px rgba(122,77,255,.45), 0 26px 60px -18px rgba(8,4,40,.8); }
      .rec .row1 { display:flex; align-items:center; gap:14px; font-size:36px; font-weight:800; }
      .rec .row2 { display:flex; gap:16px; margin-top:20px; }
      .rec .b1, .rec .b2 { flex:1; height:86px; border-radius:22px; display:flex; align-items:center; justify-content:center; gap:12px; font-size:34px; font-weight:800; }
      .rec .b1 { border:2.5px solid #d9d2f5; color:#3b3170; }
      .rec .b2 { background:#7a4dff; color:#fff; box-shadow:0 10px 26px rgba(122,77,255,.5); }
      .storechip { position:absolute; left:0; top:0; padding:10px 22px; border-radius:999px; background:rgba(11,10,36,.78); color:#fff; font-size:30px; font-weight:800; direction:rtl;
                   box-shadow: inset 0 0 0 2px rgba(205,191,255,.55); }
      .conf { position:absolute; left:0; top:0; width:16px; height:26px; border-radius:4px; }
      .scrim { position:absolute; inset:0; background:#7c3aed; }
    `;

    // ── phone ──
    this.phone = el('div', 'phone', root);
    Object.assign(this.phone.style, { left: PX + 'px', top: PY + 'px', width: SW + 2 * BZ + 'px', height: SH + 2 * BZ + 'px' });
    this.screen = el('div', 'screen', this.phone);
    Object.assign(this.screen.style, { left: BZ + 'px', top: BZ + 'px', width: SW + 'px', height: SH + 'px' });
    el('div', 'island', this.phone);

    // plain «before» store, built the way a fresh default store looks
    this.plain = el('div', 'pst', this.screen);
    this.plain.style.transform = `scale(${SC})`;
    this.plain.innerHTML = `
      <div style="height:30px"></div>
      <div class="hdr">${icon('menu', 22)}<b>زعفران سرخ</b><span class="sp"></span><span class="tl">${icon('user', 21)}${icon('shopping-cart', 21)}</span></div>
      <div class="search">${icon('search', 18)}<span>جستجوی کالا…</span></div>
      <div class="banner"><div>${icon('image-plus', 34, 1.6)}<span>تصویر بنر</span></div></div>
      <div class="chips"><span>زعفران</span><span>ادویه</span><span>هدیه</span><span>اکسسوری</span></div>
      <h4>محصولات</h4>
      <div class="grid">${PLAIN_PRODUCTS.map(([src, n, p]) => `<div class="pc"><div class="im"><img src="${src}"></div><b>${n}</b><span>${p}</span><div class="add">افزودن به سبد</div></div>`).join('')}</div>
      <nav>${[['house', 'خانه', 1], ['store', 'فروشگاه'], ['user', 'پروفایل'], ['phone', 'تماس'], ['shopping-cart', 'سبد']].map(([i, l, on]) => `<div class="${on ? 'on' : ''}">${icon(i, 20)}<span>${l}</span></div>`).join('')}</nav>`;

    // the designed store, revealed band by band (one clipped copy per band)
    this.after = BANDS.map((b) => {
      const im = el('img', 'aft', this.screen);
      im.src = 'assets/stores/saffron-crimson.png';
      return im;
    });
    this.edges = BANDS.map((b) => { const e = el('div', 'edge', this.screen); e.style.top = b.y0 * SC + 'px'; e.style.height = (b.y1 - b.y0) * SC + 'px'; return e; });
    this.flashes = BANDS.map((b) => { const e = el('div', 'bandflash', this.screen); e.style.top = b.y0 * SC + 'px'; e.style.height = (b.y1 - b.y0) * SC + 'px'; return e; });

    // the roll of other shops
    this.reelWrap = el('div', 'abs', this.screen);
    Object.assign(this.reelWrap.style, { width: SW + 'px', height: SH + 'px', overflow: 'hidden' });
    this.reel = el('div', 'reel', this.reelWrap);
    ROLL.forEach((id) => { const im = el('img', null, this.reel); im.src = `assets/stores/${id}.png`; });
    const svg = el('div', null, root);
    svg.innerHTML = `<svg width="0" height="0" style="position:absolute"><filter id="vblur" x="0" y="-10%" width="100%" height="120%"><feGaussianBlur id="vblurdev" stdDeviation="0 0"/></filter></svg>`;
    this.blurDev = svg.querySelector('#vblurdev');
    this.storechip = el('div', 'storechip', root);

    this.addr = el('div', 'addr', this.screen, `<span class="lock">${icon('shield-check', 30, 2.4)}</span><span>zafaran.appito.app</span>`);

    // ── composer ──
    this.comp = el('div', 'comp', root);
    this.comp.innerHTML = `<div class="tx"></div><div class="send">${icon('send', 40, 2.4, '#fff')}</div>`;
    this.tx = this.comp.querySelector('.tx');
    this.sendBtn = this.comp.querySelector('.send');
    this.chars = Array.from(STR.prompt);

    // flying letters
    this.units = splitFa(STR.prompt);
    this.meas = el('div', 'measure', root, this.units.map((u) => `<span>${u.html}</span>`).join(''));
    this.letters = this.units.map((u) => el('div', 'lt', root, u.html));

    // receipt + publish
    this.rec = el('div', 'rec', root);
    this.rec.innerHTML = `<div class="row1"><span style="color:#7a4dff">${icon('circle-check', 44, 2.4)}</span><span class="rt">${STR.receipt}</span></div>
      <div class="row2"><div class="b1">${icon('eye', 34)}${STR.preview}</div><div class="b2"><span class="bl">${STR.publish}</span></div></div>`;
    this.b2 = this.rec.querySelector('.b2');
    this.bl = this.rec.querySelector('.bl');
    this.rt = this.rec.querySelector('.rt');
    const R = rng(21);
    this.conf = Array.from({ length: 26 }, (_, i) => {
      const c = el('div', 'conf', root);
      c.style.background = ['#7a4dff', '#01c457', '#fd9d0f', '#a488ff', '#01dffb', '#ff5c8a'][i % 6];
      return { e: c, vx: (R() - 0.5) * 1300, vy: -700 - R() * 900, r: (R() - 0.5) * 900 };
    });

    // headlines
    this.h1 = headline(root, { l1: STR.studio, l2: STR.studioLine, a: A + 0.05, b: 15.62, size2: 66 });
    this.h2 = headline(root, { l1: STR.rangeL1, l2: STR.rangeL2, a: 15.7, b: 17.92, size1: 44, size2: 70, color1: '#ffffff' });
    this.h3 = headline(root, { l1: STR.draftL1, l2: STR.draftL2, a: 18.0, b: 19.6, size1: 44, size2: 66, color1: '#cdbfff' });

    // two separate hands-free pointers: the send tap, then the publish tap
    this.ptrA = pointer(root, [{ t: 11.55, x: 1010, y: 1500 }, { t: 11.9, x: 228, y: 1362 }, { t: 12.3, x: 260, y: 1500 }], [SEND], { a: 11.5, b: 12.45 });
    this.ptrB = pointer(root, [{ t: 17.45, x: 1010, y: 1640 }, { t: 17.9, x: 330, y: 1435 }, { t: 18.6, x: 360, y: 1560 }], [PUB], { a: 17.4, b: 18.8 });

    this.scrim = el('div', 'scrim', root);
  },
  measure() {
    // where each letter of the typed prompt sits in the composer, in stage coordinates
    const host = this.tx.getBoundingClientRect();
    this.meas.style.left = '0px';
    this.meas.style.top = '0px';
    const spans = [...this.meas.children];
    const mw = this.meas.getBoundingClientRect().width;
    // the composer's text is right-aligned (RTL): its right edge sits at the text box's right edge
    const right = host.right;
    this.pos = spans.map((s) => {
      const r = s.getBoundingClientRect();
      return { x: right - (mw - r.left) , y: host.top + host.height / 2 - 30, w: r.width };
    });
    this.meas.style.display = 'none';
    // targets inside each band
    const R = rng(5);
    let word = 0;
    this.flight = this.units.map((u, i) => {
      if (u.space) { word++; return null; }
      const band = BANDS[WORD_BAND[Math.min(word, WORD_BAND.length - 1)]];
      const tx = SX + 60 + R() * (SW - 120);
      const ty = SY + (band.y0 + (band.y1 - band.y0) * (0.25 + R() * 0.5)) * SC;
      return {
        band, tx, ty,
        cx: lerp(this.pos[i].x, tx, 0.3) + (R() - 0.5) * 500, cy: 900 + (R() - 0.5) * 500,
        rot: (R() - 0.5) * 540, delay: (i / this.units.length) * 0.12,
      };
    });
  },
  update(t) {
    // entry: the violet of the wipe dissolves, the phone rises
    S(this.scrim, { opacity: (1 - k(t, A, 0.28, E.outCubic)).toFixed(3), display: t < A + 0.3 ? 'block' : 'none' });
    const rise = spring(t - A + 0.02, 2.2, 0.62);
    const exit = k(t, 19.5, 0.45, E.inCubic);
    S(this.phone, { transform: tf({ y: (1 - rise) * 900 - exit * 260, s: 1 - exit * 0.25 }), opacity: (1 - exit).toFixed(3) });

    // ── composer: typing, hold, send ──
    const showComp = t < 12.5;
    S(this.comp, { display: showComp ? 'flex' : 'none' });
    if (showComp) {
      const cIn = k(t, A + 0.1, 0.4, E.outBack);
      const cOut = k(t, SEND + 0.12, 0.34, E.inCubic);
      S(this.comp, { transform: tf({ y: (1 - cIn) * 260 + cOut * 420, s: 1 + Math.exp(-Math.max(0, t - SEND) * 10) * (t >= SEND ? 0.03 : 0) }), opacity: (clamp(cIn * 1.5) * (1 - cOut)).toFixed(3) });
      const n = t < SEND ? Math.min(this.chars.length, Math.floor(clamp((t - TYPE0) / (TYPE1 - TYPE0) * (this.chars.length - 1) + 1, 0, this.chars.length))) : 0;
      let html;
      if (t >= SEND) html = `<span class="ph">${STR.placeholder}</span>`;
      else if (n === 0) html = `<span class="ph">${STR.placeholder}</span>`;
      else html = this.chars.slice(0, n).join('') + `<span class="caret" style="opacity:${((t * 2.5) % 1) < 0.6 || t < TYPE1 ? 1 : 0}"></span>`;
      if (this.tx.__h !== html) { this.tx.innerHTML = html; this.tx.__h = html; }
      const press = t >= SEND - 0.06 && t < SEND + 0.12 ? 1 - Math.abs(t - SEND) / 0.12 : 0;
      S(this.sendBtn, { transform: tf({ s: 1 - press * 0.15 }) });
    }

    // ── letters ──
    this.letters.forEach((e, i) => {
      const f = this.flight && this.flight[i];
      if (!f || t < SEND || t > f.band.t + 0.2) { S(e, { display: 'none' }); return; }
      S(e, { display: 'block' });
      const t0 = SEND + f.delay, t1 = f.band.t;
      const u = E.inOutCubic(prog(t, t0, t1));
      const p0 = this.pos[i];
      const bx = (1 - u) * (1 - u) * p0.x + 2 * (1 - u) * u * f.cx + u * u * f.tx;
      const by = (1 - u) * (1 - u) * p0.y + 2 * (1 - u) * u * f.cy + u * u * f.ty;
      const burst = prog(t, t1 - 0.04, t1 + 0.18);
      const s = (1 + Math.sin(u * Math.PI) * 0.9) * (1 + burst * 1.8);
      S(e, {
        transform: tf({ x: bx - p0.w / 2, y: by, s, r: f.rot * u }),
        opacity: (1 - burst).toFixed(3),
        filter: `blur(${(burst * 8).toFixed(2)}px)`,
      });
    });

    // ── the store transforms, band by band ──
    BANDS.forEach((b, i) => {
      const u = E.outCubic(prog(t, b.t - 0.04, b.t + 0.26));
      const left = (1 - u) * SW;
      S(this.after[i], { clipPath: `inset(${(b.y0 * SC).toFixed(1)}px 0px ${((844 - b.y1) * SC).toFixed(1)}px ${left.toFixed(1)}px)`, display: u > 0 ? 'block' : 'none' });
      const edgeOn = u > 0 && u < 1;
      S(this.edges[i], { display: edgeOn ? 'block' : 'none', left: (left - 3).toFixed(1) + 'px' });
      const fl = Math.exp(-Math.max(0, t - (b.t + 0.2)) * 7) * (t >= b.t + 0.05 ? 1 : 0);
      S(this.flashes[i], { opacity: (fl * 0.9).toFixed(3), display: fl > 0.01 ? 'block' : 'none' });
    });

    // ── the roll of other shops ──
    const rollOn = t >= 15.62 && t < 17.62;
    S(this.reelWrap, { display: rollOn ? 'block' : 'none' });
    if (rollOn) {
      const pos = (tt) => {
        let p = 0;
        let prev = 0;
        for (const [T, I] of LAND) {
          if (tt < T - 0.28) break;
          const u = E.inOutCubic(prog(tt, T - 0.28, T));
          p = lerp(prev, I, u);
          if (tt >= T) { const d = tt - T; p = I - Math.sin(d * 18) * Math.exp(-d * 9) * 0.03; }
          prev = I;
        }
        return p;
      };
      const p = pos(t);
      const v = Math.abs(pos(t + 1 / 120) - pos(t - 1 / 120)) * 60; // screens per second
      const blur = Math.min(60, Math.max(0, v - 1.2) * 12); // the small landing bounce stays sharp
      this.blurDev.setAttribute('stdDeviation', `0 ${blur.toFixed(1)}`);
      S(this.reel, { transform: tf({ y: -p * SH }), filter: blur > 0.1 ? 'url(#vblur)' : 'none' });
    }
    // the shop's name, on each landing
    let chip = '';
    let landT = -1;
    for (const [T, I] of LAND) if (t >= T) { chip = NAMES[ROLL[I]]; landT = T; }
    const chipOn = t >= 16.0 && t < 17.92 && chip;
    S(this.storechip, { display: chipOn ? 'block' : 'none' });
    if (chipOn) {
      if (this.storechip.__t !== chip) { this.storechip.textContent = chip; this.storechip.__t = chip; }
      const cu = spring(t - landT, 4, 0.5);
      S(this.storechip, { transform: tf({ x: 900 - this.storechip.offsetWidth, y: 512, s: 0.7 + 0.3 * cu }), opacity: clamp(cu * 2).toFixed(3) });
    }

    // ── receipt → publish ──
    const recOn = t >= 17.5 && t < 19.9;
    S(this.rec, { display: recOn ? 'block' : 'none' });
    if (recOn) {
      const ri = spring(t - 17.5, 2.8, 0.6);
      const ro = k(t, 19.5, 0.35, E.inCubic);
      S(this.rec, { transform: tf({ y: (1 - ri) * 300 + ro * 120 }), opacity: (clamp(ri * 2) * (1 - ro)).toFixed(3) });
      const press = t >= PUB - 0.06 && t < PUB + 0.12 ? 1 - Math.abs(t - PUB) / 0.12 : 0;
      const done = t >= PUB + 0.28;
      const label = done ? `${icon('check', 36, 3, '#fff')}<span>${STR.published}</span>` : t >= PUB ? `${icon('loader-circle', 36, 3, '#fff')}` : `<span>${STR.publish}</span>`;
      if (this.bl.__h !== label) { this.bl.innerHTML = label; this.bl.__h = label; this.bl.style.display = 'flex'; this.bl.style.alignItems = 'center'; this.bl.style.gap = '10px'; }
      const spin = this.bl.querySelector('svg');
      if (spin && t >= PUB && !done) spin.style.transform = `rotate(${((t - PUB) * 900) % 360}deg)`;
      S(this.b2, { transform: tf({ s: 1 - press * 0.08 + (done ? Math.exp(-(t - PUB - 0.28) * 8) * 0.08 : 0) }), background: done ? '#01b350' : '#7a4dff' });
    }
    // confetti from the button
    const ct = t - (PUB + 0.28);
    this.conf.forEach((c) => {
      if (ct < 0 || ct > 1.3) { S(c.e, { display: 'none' }); return; }
      S(c.e, { display: 'block', transform: tf({ x: 690 + c.vx * ct, y: 1400 + c.vy * ct + 1400 * ct * ct, r: c.r * ct }), opacity: (1 - prog(ct, 0.8, 1.3)).toFixed(3) });
    });
    // the address bar draws once it is live
    const ad = k(t, PUB + 0.35, 0.4, E.outBack);
    S(this.addr, { display: t >= PUB + 0.35 ? 'flex' : 'none', transform: tf({ y: (ad - 1) * 100 }) });

    this.h1.update(t); this.h2.update(t); this.h3.update(t);
    this.ptrA.update(t); this.ptrB.update(t);
  },
};
